"""Tests d'intégration des références d'entités et de la route `mentions/` (vague M3).

Les scénarios créent une campagne, une FSEC (version active) et une FA comme
`app/tests/integration/controllers/test_fa_controller.py`, attachent ces
références à des messages via l'API réelle, puis vérifient : la résolution des
libellés et slugs (identiques à ceux des fiches), la survie à la suppression
de la cible (`exists=false`), la visibilité des mentions (membres seulement)
et le budget de requêtes (anti N+1).

Les tests tournent avec `DEBUG=False` : seul le statut HTTP est asserté,
jamais le suffixe enrichi du code d'erreur.
"""

import uuid
from datetime import date

import pytest
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from app.mapper.campaign.campaign_mapper import (
    campaign_mapper_bean_to_api,
    campaign_mapper_entity_to_bean,
)
from app.mapper.fa.fa_mapper import fa_mapper_entity_to_bean
from app.mapper.fsec.fsec_mapper import fsec_mapper_entity_to_bean
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)
from app.tests.integration.messaging.test_messaging_api import (
    BASE,
    _create_group,
    _make_user,
    _messages,
    _post,
)

MENTIONS_URL = f"{BASE}mentions/"
UNKNOWN_UUID = "99999999-9999-4999-8999-999999999999"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _send_with_refs(client: Client, conversation_uuid: str, body: str, refs: list):
    """Publie un message avec des références `[{"entity_type", "entity_uuid"}]`."""
    return _post(
        client,
        f"{BASE}{conversation_uuid}/messages/",
        {"body": body, "entity_refs": refs},
    )


def _ref(entity_type: str, entity_uuid) -> dict:
    return {"entity_type": entity_type, "entity_uuid": str(entity_uuid)}


def _mentions(client: Client, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return client.get(f"{MENTIONS_URL}?{query}" if query else MENTIONS_URL)


class Targets:
    """Campagne + FSEC active + FA de test, avec leurs slugs attendus.

    Les slugs attendus sont calculés par les mappers des fiches : une chip de
    la messagerie doit mener exactement à la même URL que la fiche.
    """

    def __init__(self):
        suffix = uuid.uuid4().hex[:8]
        self.campaign = CampaignEntity.objects.create(
            uuid=str(uuid.uuid4()),
            type_id_id=0,
            status_id_id=0,
            installation_id_id=0,
            name=f"Campagne M3 {suffix}",
            year=2026,
            semester="S1",
        )
        self.fsec = FsecEntity.objects.create(
            campaign_id=self.campaign,
            name=f"FSEC M3 {suffix}",
            status_id_id=0,
            category_id_id=0,
        )
        self.fa = FaEntity.objects.create(
            fsec_version_id=self.fsec,
            status_id_id=0,
            identifier=f"FA-M3-{suffix}",
            discoverer="Testeur",
            event_date=date(2026, 3, 1),
            observation="obs",
            quick_analysis="qa",
        )

    @property
    def fsec_uuid(self) -> str:
        return str(self.fsec.fsec_uuid)

    @property
    def expected_fsec_slug(self) -> str:
        entity = FsecEntity.objects.select_related(
            "campaign_id", "campaign_id__installation_id"
        ).get(pk=self.fsec.pk)
        return fsec_mapper_entity_to_bean(entity).slug

    @property
    def expected_fsec_display_name(self) -> str:
        """Nom complet ``{année}-{installation}_{campagne}_{fsec}`` : le libellé
        d'une chip FSEC est celui affiché partout ailleurs dans l'application."""
        entity = FsecEntity.objects.select_related(
            "campaign_id", "campaign_id__installation_id"
        ).get(pk=self.fsec.pk)
        return fsec_mapper_entity_to_bean(entity).display_name

    @property
    def expected_campaign_slug(self) -> str:
        entity = CampaignEntity.objects.select_related("installation_id").get(
            pk=self.campaign.pk
        )
        return campaign_mapper_bean_to_api(campaign_mapper_entity_to_bean(entity))[
            "slug"
        ]

    @property
    def expected_fa_slug(self) -> str:
        entity = FaEntity.objects.select_related(
            "fsec_version_id",
            "fsec_version_id__campaign_id",
            "fsec_version_id__campaign_id__installation_id",
        ).get(pk=self.fa.pk)
        return fa_mapper_entity_to_bean(entity).slug

    def all_refs(self) -> list:
        return [
            _ref("fsec", self.fsec_uuid),
            _ref("campaign", self.campaign.uuid),
            _ref("fa", self.fa.uuid),
        ]


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------


@pytest.fixture
def alice():
    return _make_user("m3_alice")


@pytest.fixture
def bob():
    return _make_user("m3_bob")


@pytest.fixture
def carol():
    return _make_user("m3_carol")


@pytest.fixture
def targets(db) -> Targets:
    return Targets()


@pytest.fixture
def group_conversation(alice, bob):
    """Groupe créé par `alice` avec `bob` membre."""
    alice_client, _ = alice
    _, bob_uuid = bob
    return _create_group(alice_client, "Campagne M3", [bob_uuid])


# ----------------------------------------------------------------------
# Références sur les messages
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestEntityRefsOnMessages:
    def test_post_with_three_refs_resolves_labels_and_slugs(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice

        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir ces éléments",
            targets.all_refs(),
        )

        assert response.status_code == 201, response.content
        refs = response.json()["entity_refs"]
        # Ordre demandé conservé, cibles résolues.
        assert [ref["entity_type"] for ref in refs] == ["fsec", "campaign", "fa"]
        assert all(ref["exists"] is True for ref in refs)
        assert refs[0] == {
            "entity_type": "fsec",
            "entity_uuid": targets.fsec_uuid,
            "label": targets.expected_fsec_display_name,
            "slug": targets.expected_fsec_slug,
            "exists": True,
        }
        assert refs[1]["entity_uuid"] == str(targets.campaign.uuid)
        assert refs[1]["label"] == targets.campaign.name
        assert refs[1]["slug"] == targets.expected_campaign_slug
        assert refs[2]["entity_uuid"] == str(targets.fa.uuid)
        assert refs[2]["label"] == targets.fa.identifier
        assert refs[2]["slug"] == targets.expected_fa_slug

    def test_slugs_resolve_on_the_by_slug_routes(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        refs = _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", targets.all_refs()
        ).json()["entity_refs"]

        fsec = alice_client.get(f"/api/v1/fsecs/by-slug/{refs[0]['slug']}/")
        campaign = alice_client.get(f"/api/v1/campaigns/by-slug/{refs[1]['slug']}/")
        fa = alice_client.get(f"/api/v1/fas/by-slug/{refs[2]['slug']}/")

        assert fsec.status_code == 200, fsec.content
        assert fsec.json()["fsec_uuid"] == targets.fsec_uuid
        assert campaign.status_code == 200, campaign.content
        assert campaign.json()["uuid"] == str(targets.campaign.uuid)
        assert fa.status_code == 200, fa.content
        assert fa.json()["uuid"] == str(targets.fa.uuid)

    def test_refs_are_persisted_with_snapshot_and_position(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        message_uuid = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fa", targets.fa.uuid), _ref("fsec", targets.fsec_uuid)],
        ).json()["uuid"]

        rows = list(MessageEntityRefEntity.objects.filter(message_id=message_uuid))

        assert [(row.entity_type, row.position) for row in rows] == [
            ("fa", 0),
            ("fsec", 1),
        ]
        assert rows[0].label == targets.fa.identifier
        assert rows[1].label == targets.expected_fsec_display_name

    def test_message_without_refs_has_empty_list(self, alice, group_conversation):
        alice_client, _ = alice
        response = _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/messages/",
            {"body": "Sans référence"},
        )
        assert response.status_code == 201
        assert response.json()["entity_refs"] == []

    def test_unknown_target_is_rejected(self, alice, group_conversation, targets):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fsec", targets.fsec_uuid), _ref("fa", UNKNOWN_UUID)],
        )
        assert response.status_code == 400
        # Rien n'est publié.
        assert _messages(alice_client, group_conversation["uuid"])["results"] == []

    def test_unknown_type_is_rejected(self, alice, group_conversation, targets):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("embase", targets.fa.uuid)],
        )
        assert response.status_code == 400

    def test_malformed_uuid_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", [_ref("fa", "nope")]
        )
        assert response.status_code == 400

    def test_malformed_ref_shape_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/messages/",
            {"body": "Voir", "entity_refs": ["fsec"]},
        )
        assert response.status_code == 400

    def test_eleven_refs_are_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        refs = [_ref("fa", uuid.uuid4()) for _ in range(11)]
        response = _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", refs
        )
        assert response.status_code == 400

    def test_duplicates_are_collapsed(self, alice, group_conversation, targets):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [
                _ref("fa", targets.fa.uuid),
                _ref("fa", str(targets.fa.uuid).upper()),
                _ref("fsec", targets.fsec_uuid),
                _ref("fa", targets.fa.uuid),
            ],
        )
        assert response.status_code == 201
        refs = response.json()["entity_refs"]
        assert [(ref["entity_type"], ref["entity_uuid"]) for ref in refs] == [
            ("fa", str(targets.fa.uuid)),
            ("fsec", targets.fsec_uuid),
        ]

    def test_body_stays_required_with_refs(self, alice, group_conversation, targets):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client, group_conversation["uuid"], "   ", targets.all_refs()
        )
        assert response.status_code == 400

    def test_get_messages_carries_refs(self, alice, bob, group_conversation, targets):
        alice_client, _ = alice
        bob_client, _ = bob
        _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", targets.all_refs()
        )
        _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/messages/",
            {"body": "Suite"},
        )

        page = _messages(bob_client, group_conversation["uuid"])

        assert [len(item["entity_refs"]) for item in page["results"]] == [3, 0]
        assert page["results"][0]["entity_refs"][0]["slug"] == (
            targets.expected_fsec_slug
        )

    def test_deleted_target_gives_exists_false_with_snapshot(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", targets.all_refs()
        )
        identifier = targets.fa.identifier
        targets.fa.delete()

        refs = _messages(alice_client, group_conversation["uuid"])["results"][0][
            "entity_refs"
        ]

        fa_ref = refs[2]
        assert fa_ref["entity_type"] == "fa"
        assert fa_ref["exists"] is False
        assert fa_ref["slug"] is None
        assert fa_ref["label"] == identifier
        # Les autres références restent résolues.
        assert refs[0]["exists"] is True
        assert refs[1]["exists"] is True

    def test_fsec_label_and_slug_follow_the_active_version(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fsec", targets.fsec_uuid)],
        )
        # Nouvelle version active (même fsec_uuid), ancienne désactivée.
        FsecEntity.objects.filter(pk=targets.fsec.pk).update(is_active=False)
        new_version = FsecEntity.objects.create(
            fsec_uuid=targets.fsec.fsec_uuid,
            campaign_id=targets.campaign,
            name=f"{targets.fsec.name} v2",
            status_id_id=0,
            category_id_id=0,
            is_active=True,
        )

        ref = _messages(alice_client, group_conversation["uuid"])["results"][0][
            "entity_refs"
        ][0]

        assert ref["exists"] is True
        assert ref["label"].endswith(f"_{new_version.name}")
        assert ref["label"].startswith("2026-LMJ_")
        assert ref["slug"].endswith("-v2")

    def test_fsec_without_active_version_is_treated_as_deleted(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        snapshot_label = targets.expected_fsec_display_name
        _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fsec", targets.fsec_uuid)],
        )
        FsecEntity.objects.filter(pk=targets.fsec.pk).update(is_active=False)

        ref = _messages(alice_client, group_conversation["uuid"])["results"][0][
            "entity_refs"
        ][0]

        assert ref["exists"] is False
        assert ref["slug"] is None
        # Instantané du libellé pris à l'envoi (nom complet), conservé après suppression.
        assert ref["label"] == snapshot_label

    def test_inactive_fsec_version_cannot_be_referenced(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        FsecEntity.objects.filter(pk=targets.fsec.pk).update(is_active=False)
        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fsec", targets.fsec_uuid)],
        )
        assert response.status_code == 400

    def test_last_message_preview_carries_entity_ref_count(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", targets.all_refs()
        )

        listed = alice_client.get(BASE).json()
        detail = alice_client.get(f"{BASE}{group_conversation['uuid']}/").json()

        assert listed[0]["last_message"]["entity_ref_count"] == 3
        assert "entity_refs" not in listed[0]["last_message"]
        assert detail["last_message"]["entity_ref_count"] == 3

        _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/messages/",
            {"body": "Sans référence"},
        )
        assert alice_client.get(BASE).json()[0]["last_message"]["entity_ref_count"] == 0

    def test_uppercase_uuid_is_canonicalised(self, alice, group_conversation, targets):
        alice_client, _ = alice
        response = _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("campaign", str(targets.campaign.uuid).upper())],
        )
        assert response.status_code == 201
        assert response.json()["entity_refs"][0]["entity_uuid"] == str(
            targets.campaign.uuid
        )


# ----------------------------------------------------------------------
# Route mentions/
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestMentions:
    def test_route_is_not_captured_by_the_uuid_lookup(self, alice, targets):
        alice_client, _ = alice
        response = _mentions(
            alice_client, entity_type="fa", entity_uuid=targets.fa.uuid
        )
        assert response.status_code == 200
        assert response.json() == {"results": []}

    def test_only_members_see_the_mentions(
        self, alice, bob, carol, group_conversation, targets
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        carol_client, _ = carol
        _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir cette FSEC",
            [_ref("fsec", targets.fsec_uuid)],
        )

        for client in (alice_client, bob_client):
            response = _mentions(
                client, entity_type="fsec", entity_uuid=targets.fsec_uuid
            )
            assert response.status_code == 200
            assert [m["message"]["body"] for m in response.json()["results"]] == [
                "Voir cette FSEC"
            ]

        outsider = _mentions(
            carol_client, entity_type="fsec", entity_uuid=targets.fsec_uuid
        )
        assert outsider.status_code == 200
        assert outsider.json()["results"] == []

    def test_mention_carries_message_and_conversation_context(
        self, alice, bob, group_conversation, targets
    ):
        alice_client, alice_uuid = alice
        _, bob_uuid = bob
        posted = _send_with_refs(
            alice_client, group_conversation["uuid"], "Voir", targets.all_refs()
        ).json()

        mention = _mentions(
            alice_client, entity_type="campaign", entity_uuid=targets.campaign.uuid
        ).json()["results"][0]

        assert mention["message"]["uuid"] == posted["uuid"]
        assert mention["message"]["author"]["username"] == "m3_alice"
        assert len(mention["message"]["entity_refs"]) == 3
        assert mention["conversation"]["uuid"] == group_conversation["uuid"]
        assert mention["conversation"]["kind"] == "group"
        assert mention["conversation"]["name"] == "Campagne M3"
        assert sorted(m["uuid"] for m in mention["conversation"]["members"]) == sorted(
            [alice_uuid, bob_uuid]
        )
        assert "joined_at" not in mention["conversation"]["members"][0]

    def test_results_are_newest_first_and_limited(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        for index in range(3):
            _send_with_refs(
                alice_client,
                group_conversation["uuid"],
                f"mention {index}",
                [_ref("fa", targets.fa.uuid)],
            )
        # Un message sans référence n'apparaît pas.
        _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/messages/",
            {"body": "sans référence"},
        )

        full = _mentions(alice_client, entity_type="fa", entity_uuid=targets.fa.uuid)
        limited = _mentions(
            alice_client, entity_type="fa", entity_uuid=targets.fa.uuid, limit=2
        )

        assert [m["message"]["body"] for m in full.json()["results"]] == [
            "mention 2",
            "mention 1",
            "mention 0",
        ]
        assert [m["message"]["body"] for m in limited.json()["results"]] == [
            "mention 2",
            "mention 1",
        ]

    def test_mentions_span_several_conversations(self, alice, bob, carol, targets):
        alice_client, _ = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        first = _create_group(alice_client, "Groupe 1", [bob_uuid])
        second = _create_group(alice_client, "Groupe 2", [carol_uuid])
        _send_with_refs(
            alice_client, first["uuid"], "un", [_ref("fa", targets.fa.uuid)]
        )
        _send_with_refs(
            alice_client, second["uuid"], "deux", [_ref("fa", targets.fa.uuid)]
        )

        results = _mentions(
            alice_client, entity_type="fa", entity_uuid=targets.fa.uuid
        ).json()["results"]

        assert [m["message"]["body"] for m in results] == ["deux", "un"]
        assert [m["conversation"]["name"] for m in results] == ["Groupe 2", "Groupe 1"]

    def test_unknown_uuid_gives_empty_list(self, alice):
        alice_client, _ = alice
        response = _mentions(alice_client, entity_type="fsec", entity_uuid=UNKNOWN_UUID)
        assert response.status_code == 200
        assert response.json() == {"results": []}

    def test_deleted_target_still_lists_its_mentions(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        _send_with_refs(
            alice_client,
            group_conversation["uuid"],
            "Voir",
            [_ref("fa", targets.fa.uuid)],
        )
        fa_uuid = str(targets.fa.uuid)
        targets.fa.delete()

        results = _mentions(alice_client, entity_type="fa", entity_uuid=fa_uuid).json()[
            "results"
        ]

        assert len(results) == 1
        assert results[0]["message"]["entity_refs"][0]["exists"] is False

    @pytest.mark.parametrize(
        "params",
        [
            {},
            {"entity_type": "fsec"},
            {"entity_uuid": UNKNOWN_UUID},
            {"entity_type": "embase", "entity_uuid": UNKNOWN_UUID},
            {"entity_type": "fsec", "entity_uuid": "not-a-uuid"},
            {"entity_type": "fsec", "entity_uuid": UNKNOWN_UUID, "limit": 0},
            {"entity_type": "fsec", "entity_uuid": UNKNOWN_UUID, "limit": 51},
            {"entity_type": "fsec", "entity_uuid": UNKNOWN_UUID, "limit": "abc"},
        ],
    )
    def test_invalid_params_give_400(self, alice, params):
        alice_client, _ = alice
        assert _mentions(alice_client, **params).status_code == 400

    def test_anonymous_is_rejected(self, targets):
        response = _mentions(Client(), entity_type="fa", entity_uuid=targets.fa.uuid)
        assert response.status_code in (401, 403)


# ----------------------------------------------------------------------
# Budget de requêtes (anti N+1)
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestEntityRefsQueryBudget:
    def test_messages_query_count_does_not_grow_with_referenced_messages(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        url = f"{BASE}{group_conversation['uuid']}/messages/"
        _send_with_refs(
            alice_client, group_conversation["uuid"], "m0", targets.all_refs()
        )

        with CaptureQueriesContext(connection) as one_message:
            assert alice_client.get(url).status_code == 200

        for index in range(1, 5):
            _send_with_refs(
                alice_client,
                group_conversation["uuid"],
                f"m{index}",
                targets.all_refs(),
            )

        with CaptureQueriesContext(connection) as five_messages:
            response = alice_client.get(url)
            assert response.status_code == 200
            assert len(response.json()["results"]) == 5
            assert all(len(m["entity_refs"]) == 3 for m in response.json()["results"])

        assert len(five_messages.captured_queries) == len(one_message.captured_queries)

    def test_mentions_query_count_does_not_grow_with_results(
        self, alice, bob, carol, targets
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        first = _create_group(alice_client, "Budget 1", [bob_uuid])
        _send_with_refs(alice_client, first["uuid"], "m0", targets.all_refs())

        with CaptureQueriesContext(connection) as one_mention:
            response = _mentions(
                alice_client, entity_type="fa", entity_uuid=targets.fa.uuid
            )
            assert response.status_code == 200
            assert len(response.json()["results"]) == 1

        second = _create_group(alice_client, "Budget 2", [carol_uuid])
        for index in range(1, 5):
            target = first if index % 2 else second
            _send_with_refs(
                alice_client, target["uuid"], f"m{index}", targets.all_refs()
            )

        with CaptureQueriesContext(connection) as five_mentions:
            response = _mentions(
                alice_client, entity_type="fa", entity_uuid=targets.fa.uuid
            )
            assert response.status_code == 200
            assert len(response.json()["results"]) == 5

        assert len(five_mentions.captured_queries) == len(one_mention.captured_queries)

    def test_conversation_list_query_count_does_not_grow_with_referenced_previews(
        self, alice, bob, targets
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        first = _create_group(alice_client, "Budget 1", [bob_uuid])
        _send_with_refs(alice_client, first["uuid"], "m0", targets.all_refs())

        with CaptureQueriesContext(connection) as one_conversation:
            assert alice_client.get(BASE).status_code == 200

        for index in range(2, 6):
            extra = _create_group(alice_client, f"Budget {index}", [bob_uuid])
            _send_with_refs(alice_client, extra["uuid"], "m", targets.all_refs())

        with CaptureQueriesContext(connection) as five_conversations:
            response = alice_client.get(BASE)
            assert response.status_code == 200
            assert len(response.json()) == 5
            assert all(
                c["last_message"]["entity_ref_count"] == 3 for c in response.json()
            )

        assert len(five_conversations.captured_queries) == len(
            one_conversation.captured_queries
        )
