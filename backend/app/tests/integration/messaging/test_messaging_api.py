"""Tests d'intégration de l'API /api/v1/conversations/ (messagerie interne).

Les scénarios exercent l'API réelle via le client Django : conversations
privées et de groupe, visibilité restreinte aux membres, gestion des membres,
pagination des messages par curseur et compteurs de non-lus.

Les tests tournent avec `DEBUG=False` : le middleware d'erreurs ne renvoie que
les codes génériques. On n'asserte donc que le statut HTTP, jamais le suffixe
enrichi du code d'erreur.
"""

import json
from datetime import datetime, timedelta, timezone

import pytest
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory
from rest_framework.throttling import ScopedRateThrottle, UserRateThrottle

from app.api.messaging.conversation_controller import ConversationController
from app.domain.messaging.models.constants import MESSAGE_KIND_TEXT
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.user.models.user_profile_entity import UserProfileEntity

BASE = "/api/v1/conversations/"
UNREAD_URL = f"{BASE}unread-count/"
UNKNOWN_UUID = "99999999-9999-4999-8999-999999999999"
MALFORMED_UUID = "not-a-uuid"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _make_user(
    username: str,
    role: str = "iec",
    group: str = "operateur",
    is_active: bool = True,
) -> tuple[Client, str]:
    """Crée un utilisateur avec profil + client connecté. Renvoie (client, uuid)."""
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password("pass")
    user.is_active = is_active
    user.save()
    permission_group, _ = Group.objects.get_or_create(name=group)
    user.groups.add(permission_group)
    profile, _ = UserProfileEntity.objects.get_or_create(
        user=user, defaults={"roles": [role], "force_password_change": False}
    )
    client = Client()
    if is_active:
        client.force_login(user)
    return client, str(profile.uuid)


def _post(client: Client, url: str, payload: dict):
    return client.post(url, data=json.dumps(payload), content_type="application/json")


def _patch(client: Client, url: str, payload: dict):
    return client.patch(url, data=json.dumps(payload), content_type="application/json")


def _put(client: Client, url: str, payload: dict):
    return client.put(url, data=json.dumps(payload), content_type="application/json")


def _create_direct(client: Client, other_uuid: str) -> dict:
    """Crée (ou retrouve) une conversation privée et renvoie le dict API."""
    response = _post(client, BASE, {"kind": "direct", "member_uuids": [other_uuid]})
    assert response.status_code in (200, 201), response.content
    return response.json()


def _create_group(client: Client, name: str, member_uuids: list) -> dict:
    """Crée un groupe et renvoie le dict API."""
    response = _post(
        client, BASE, {"kind": "group", "name": name, "member_uuids": member_uuids}
    )
    assert response.status_code == 201, response.content
    return response.json()


def _member_uuids(conversation: dict) -> list:
    return [member["uuid"] for member in conversation["members"]]


def _send(client: Client, conversation_uuid: str, body: str):
    return _post(client, f"{BASE}{conversation_uuid}/messages/", {"body": body})


def _messages(client: Client, conversation_uuid: str, **params) -> dict:
    query = "&".join(f"{key}={value}" for key, value in params.items())
    url = f"{BASE}{conversation_uuid}/messages/"
    if query:
        url = f"{url}?{query}"
    response = client.get(url)
    assert response.status_code == 200, response.content
    return response.json()


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------


@pytest.fixture
def alice():
    return _make_user("msg_alice")


@pytest.fixture
def bob():
    return _make_user("msg_bob")


@pytest.fixture
def carol():
    return _make_user("msg_carol")


@pytest.fixture
def outsider():
    return _make_user("msg_outsider")


@pytest.fixture
def reader():
    return _make_user("msg_reader", role="stagiaire", group="lecteur")


@pytest.fixture
def inactive_uuid():
    _, uuid_value = _make_user("msg_inactive", is_active=False)
    return uuid_value


@pytest.fixture
def group_conversation(alice, bob):
    """Groupe créé par `alice` avec `bob` membre."""
    alice_client, _ = alice
    _, bob_uuid = bob
    return _create_group(alice_client, "Campagne S2", [bob_uuid])


# ----------------------------------------------------------------------
# Authentification et accès de base
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestMessagingAccess:
    def test_anonymous_is_rejected(self):
        response = Client().get(BASE)
        assert response.status_code in (401, 403)

    def test_user_without_profile_gets_404(self):
        user = User.objects.create_user(username="msg_no_profile", password="pass")
        client = Client()
        client.force_login(user)
        assert client.get(BASE).status_code == 404

    def test_list_is_empty_for_new_user(self, alice):
        alice_client, _ = alice
        response = alice_client.get(BASE)
        assert response.status_code == 200
        assert response.json() == []

    def test_reader_can_create_and_post(self, reader, bob):
        reader_client, _ = reader
        _, bob_uuid = bob
        conversation = _create_direct(reader_client, bob_uuid)
        assert _send(reader_client, conversation["uuid"], "Bonjour").status_code == 201

    def test_unread_count_route_is_not_captured_by_lookup(self, alice):
        alice_client, _ = alice
        response = alice_client.get(UNREAD_URL)
        assert response.status_code == 200
        assert response.json() == {"total_unread": 0}


# ----------------------------------------------------------------------
# Conversations privées
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestDirectConversations:
    def test_create_direct(self, alice, bob):
        alice_client, alice_uuid = alice
        _, bob_uuid = bob
        response = _post(
            alice_client, BASE, {"kind": "direct", "member_uuids": [bob_uuid]}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["kind"] == "direct"
        assert data["name"] == ""
        assert data["owner_uuid"] == alice_uuid
        assert sorted(_member_uuids(data)) == sorted([alice_uuid, bob_uuid])
        assert data["unread_count"] == 0
        assert data["last_message"] is None

    def test_recreate_direct_is_idempotent(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        _, alice_uuid = alice
        first = _create_direct(alice_client, bob_uuid)

        again = _post(
            alice_client, BASE, {"kind": "direct", "member_uuids": [bob_uuid]}
        )
        assert again.status_code == 200
        assert again.json()["uuid"] == first["uuid"]

        reversed_side = _post(
            bob_client, BASE, {"kind": "direct", "member_uuids": [alice_uuid]}
        )
        assert reversed_side.status_code == 200
        assert reversed_side.json()["uuid"] == first["uuid"]

    def test_existing_direct_carries_unread_count(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        assert _send(bob_client, conversation["uuid"], "Coucou").status_code == 201

        response = _post(
            alice_client, BASE, {"kind": "direct", "member_uuids": [bob_uuid]}
        )
        assert response.status_code == 200
        assert response.json()["unread_count"] == 1

    def test_direct_with_self_is_rejected(self, alice):
        alice_client, alice_uuid = alice
        response = _post(
            alice_client, BASE, {"kind": "direct", "member_uuids": [alice_uuid]}
        )
        assert response.status_code == 400

    def test_direct_with_two_others_is_rejected(self, alice, bob, carol):
        alice_client, _ = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        response = _post(
            alice_client,
            BASE,
            {"kind": "direct", "member_uuids": [bob_uuid, carol_uuid]},
        )
        assert response.status_code == 400

    def test_direct_with_inactive_user_is_rejected(self, alice, inactive_uuid):
        alice_client, _ = alice
        response = _post(
            alice_client, BASE, {"kind": "direct", "member_uuids": [inactive_uuid]}
        )
        assert response.status_code == 400

    def test_direct_cannot_be_deleted(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        response = alice_client.delete(f"{BASE}{conversation['uuid']}/")
        assert response.status_code == 400

    def test_direct_cannot_be_renamed(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        response = _patch(
            alice_client, f"{BASE}{conversation['uuid']}/", {"name": "Interdit"}
        )
        assert response.status_code == 400


# ----------------------------------------------------------------------
# Conversations de groupe
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestGroupConversations:
    def test_create_group(self, alice, bob, group_conversation):
        _, alice_uuid = alice
        _, bob_uuid = bob
        assert group_conversation["kind"] == "group"
        assert group_conversation["name"] == "Campagne S2"
        assert group_conversation["owner_uuid"] == alice_uuid
        assert sorted(_member_uuids(group_conversation)) == sorted(
            [alice_uuid, bob_uuid]
        )
        assert group_conversation["unread_count"] == 0
        members = group_conversation["members"]
        assert [member["joined_at"] for member in members] == sorted(
            member["joined_at"] for member in members
        )

    def test_create_group_requires_a_name(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        response = _post(
            alice_client, BASE, {"kind": "group", "member_uuids": [bob_uuid]}
        )
        assert response.status_code == 400

    def test_create_group_rejects_unknown_kind(self, alice):
        alice_client, _ = alice
        response = _post(alice_client, BASE, {"kind": "broadcast", "name": "X"})
        assert response.status_code == 400

    def test_retrieve_group(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.get(f"{BASE}{group_conversation['uuid']}/")
        assert response.status_code == 200
        assert response.json()["uuid"] == group_conversation["uuid"]

    def test_owner_renames_group_and_emits_system_message(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        response = _patch(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/",
            {"name": "Campagne S3"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Campagne S3"

        page = _messages(alice_client, group_conversation["uuid"])
        assert page["results"][-1]["kind"] == "system"
        assert "Campagne S3" in page["results"][-1]["body"]

    def test_member_cannot_rename_group(self, bob, group_conversation):
        bob_client, _ = bob
        response = _patch(
            bob_client, f"{BASE}{group_conversation['uuid']}/", {"name": "Piratée"}
        )
        assert response.status_code == 403

    def test_member_cannot_delete_group(self, bob, group_conversation):
        bob_client, _ = bob
        response = bob_client.delete(f"{BASE}{group_conversation['uuid']}/")
        assert response.status_code == 403

    def test_owner_deletes_group(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.delete(f"{BASE}{group_conversation['uuid']}/")
        assert response.status_code == 204
        assert (
            alice_client.get(f"{BASE}{group_conversation['uuid']}/").status_code == 404
        )

    def test_put_is_not_exposed(self, alice, group_conversation):
        alice_client, _ = alice
        response = _put(
            alice_client, f"{BASE}{group_conversation['uuid']}/", {"name": "Via PUT"}
        )
        assert response.status_code == 405


# ----------------------------------------------------------------------
# Visibilité : un tiers ne voit rien
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestOutsiderIsBlind:
    def test_outsider_gets_404_everywhere(
        self, bob, carol, outsider, group_conversation
    ):
        outsider_client, _ = outsider
        _, carol_uuid = carol
        _, bob_uuid = bob
        url = f"{BASE}{group_conversation['uuid']}/"

        assert outsider_client.get(url).status_code == 404
        assert _patch(outsider_client, url, {"name": "Volée"}).status_code == 404
        assert outsider_client.delete(url).status_code == 404
        assert outsider_client.get(f"{url}messages/").status_code == 404
        assert (
            _post(outsider_client, f"{url}messages/", {"body": "Hep"}).status_code
            == 404
        )
        assert _post(outsider_client, f"{url}read/", {}).status_code == 404
        assert (
            _post(
                outsider_client, f"{url}members/", {"member_uuids": [carol_uuid]}
            ).status_code
            == 404
        )
        assert outsider_client.delete(f"{url}members/{bob_uuid}/").status_code == 404

    def test_outsider_list_is_empty(self, outsider, group_conversation):
        outsider_client, _ = outsider
        assert outsider_client.get(BASE).json() == []


# ----------------------------------------------------------------------
# UUID malformés : jamais de 500
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestMalformedUuids:
    def test_detail_routes_return_404(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        url = f"{BASE}{MALFORMED_UUID}/"
        assert alice_client.get(url).status_code == 404
        assert _patch(alice_client, url, {"name": "Nom"}).status_code == 404
        assert alice_client.delete(url).status_code == 404
        assert _post(alice_client, f"{url}read/", {}).status_code == 404
        assert alice_client.get(f"{url}messages/").status_code == 404
        assert (
            _post(alice_client, f"{url}messages/", {"body": "Hep"}).status_code == 404
        )
        assert (
            _post(
                alice_client, f"{url}members/", {"member_uuids": [bob_uuid]}
            ).status_code
            == 404
        )

    def test_unknown_uuid_returns_404(self, alice):
        alice_client, _ = alice
        assert alice_client.get(f"{BASE}{UNKNOWN_UUID}/").status_code == 404

    def test_malformed_member_uuid_is_refused_without_500(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        response = alice_client.delete(
            f"{BASE}{group_conversation['uuid']}/members/{MALFORMED_UUID}/"
        )
        # Le service canonicalise l'uuid du membre avant toute lecture :
        # ValidationException ⇒ 400 (et surtout jamais 500).
        assert response.status_code == 400

    def test_malformed_cursor_returns_400(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?before={MALFORMED_UUID}"
        )
        assert response.status_code == 400


# ----------------------------------------------------------------------
# Membres
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestGroupMembers:
    def test_any_member_can_invite(self, bob, carol, group_conversation):
        bob_client, _ = bob
        _, carol_uuid = carol
        response = _post(
            bob_client,
            f"{BASE}{group_conversation['uuid']}/members/",
            {"member_uuids": [carol_uuid]},
        )
        assert response.status_code == 200
        assert carol_uuid in _member_uuids(response.json())

    def test_duplicate_member_conflicts(self, alice, bob, group_conversation):
        alice_client, _ = alice
        _, bob_uuid = bob
        response = _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/members/",
            {"member_uuids": [bob_uuid]},
        )
        assert response.status_code == 409

    def test_unknown_member_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/members/",
            {"member_uuids": [UNKNOWN_UUID]},
        )
        assert response.status_code == 400

    def test_inactive_member_is_rejected(
        self, alice, group_conversation, inactive_uuid
    ):
        alice_client, _ = alice
        response = _post(
            alice_client,
            f"{BASE}{group_conversation['uuid']}/members/",
            {"member_uuids": [inactive_uuid]},
        )
        assert response.status_code == 400

    def test_new_member_only_sees_the_system_message_as_unread(
        self, alice, carol, group_conversation
    ):
        alice_client, _ = alice
        carol_client, carol_uuid = carol
        for index in range(3):
            assert (
                _send(alice_client, group_conversation["uuid"], f"m{index}").status_code
                == 201
            )
        assert (
            _post(
                alice_client,
                f"{BASE}{group_conversation['uuid']}/members/",
                {"member_uuids": [carol_uuid]},
            ).status_code
            == 200
        )
        detail = carol_client.get(f"{BASE}{group_conversation['uuid']}/").json()
        assert detail["unread_count"] == 1

    def test_owner_removes_third_party(self, alice, bob, group_conversation):
        alice_client, _ = alice
        _, bob_uuid = bob
        response = alice_client.delete(
            f"{BASE}{group_conversation['uuid']}/members/{bob_uuid}/"
        )
        assert response.status_code == 200
        assert bob_uuid not in _member_uuids(response.json())

    def test_member_leaves(self, bob, group_conversation):
        bob_client, bob_uuid = bob
        response = bob_client.delete(
            f"{BASE}{group_conversation['uuid']}/members/{bob_uuid}/"
        )
        assert response.status_code == 204
        assert bob_client.get(f"{BASE}{group_conversation['uuid']}/").status_code == 404

    def test_non_owner_cannot_remove_someone_else(
        self, alice, bob, carol, group_conversation
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        carol_client, carol_uuid = carol
        assert (
            _post(
                alice_client,
                f"{BASE}{group_conversation['uuid']}/members/",
                {"member_uuids": [carol_uuid]},
            ).status_code
            == 200
        )
        response = carol_client.delete(
            f"{BASE}{group_conversation['uuid']}/members/{bob_uuid}/"
        )
        assert response.status_code == 403

    def test_owner_leaving_transfers_to_oldest_active_member(
        self, alice, bob, carol, group_conversation
    ):
        alice_client, alice_uuid = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        assert (
            _post(
                alice_client,
                f"{BASE}{group_conversation['uuid']}/members/",
                {"member_uuids": [carol_uuid]},
            ).status_code
            == 200
        )
        # bob est le plus ancien membre restant mais devient inactif : la
        # propriété doit revenir à carol.
        User.objects.filter(username="msg_bob").update(is_active=False)

        response = alice_client.delete(
            f"{BASE}{group_conversation['uuid']}/members/{alice_uuid}/"
        )
        assert response.status_code == 204
        entity = ConversationEntity.objects.get(uuid=group_conversation["uuid"])
        assert str(entity.owner_id) == carol_uuid
        assert bob_uuid != carol_uuid

    def test_last_member_leaving_deletes_the_conversation(self, alice):
        alice_client, alice_uuid = alice
        conversation = _create_group(alice_client, "Solo", [])
        response = alice_client.delete(
            f"{BASE}{conversation['uuid']}/members/{alice_uuid}/"
        )
        assert response.status_code == 204
        assert not ConversationEntity.objects.filter(uuid=conversation["uuid"]).exists()


# ----------------------------------------------------------------------
# Messages
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestMessages:
    def test_post_message(self, alice, group_conversation):
        alice_client, alice_uuid = alice
        response = _send(alice_client, group_conversation["uuid"], "  Bonjour  ")
        assert response.status_code == 201
        data = response.json()
        assert data["body"] == "Bonjour"
        assert data["kind"] == "text"
        assert data["conversation_uuid"] == group_conversation["uuid"]
        assert data["author_uuid"] == alice_uuid
        assert data["author"]["username"] == "msg_alice"
        assert data["updated_at"] is not None

    @pytest.mark.parametrize("body", ["", "   "])
    def test_empty_body_is_rejected(self, alice, group_conversation, body):
        alice_client, _ = alice
        assert _send(alice_client, group_conversation["uuid"], body).status_code == 400

    def test_too_long_body_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = _send(alice_client, group_conversation["uuid"], "x" * 4001)
        assert response.status_code == 400

    def test_messages_are_returned_in_chronological_order(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        for index in range(3):
            _send(alice_client, group_conversation["uuid"], f"message {index}")
        page = _messages(alice_client, group_conversation["uuid"])
        assert [item["body"] for item in page["results"]] == [
            "message 0",
            "message 1",
            "message 2",
        ]
        assert page["has_more"] is False

    def test_limit_is_applied(self, alice, group_conversation):
        alice_client, _ = alice
        for index in range(5):
            _send(alice_client, group_conversation["uuid"], f"message {index}")
        page = _messages(alice_client, group_conversation["uuid"], limit=2)
        assert len(page["results"]) == 2
        assert page["has_more"] is True
        assert [item["body"] for item in page["results"]] == ["message 3", "message 4"]

    @pytest.mark.parametrize("limit", [0, 101])
    def test_out_of_range_limit_is_rejected(self, alice, group_conversation, limit):
        alice_client, _ = alice
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?limit={limit}"
        )
        assert response.status_code == 400

    def test_before_and_after_are_exclusive(self, alice, group_conversation):
        alice_client, _ = alice
        first = _send(alice_client, group_conversation["uuid"], "un").json()
        second = _send(alice_client, group_conversation["uuid"], "deux").json()
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/"
            f"?before={second['uuid']}&after={first['uuid']}"
        )
        assert response.status_code == 400

    def test_cursor_from_another_conversation_returns_404(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        other = _create_direct(alice_client, bob_uuid)
        foreign = _send(alice_client, other["uuid"], "ailleurs").json()
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?before={foreign['uuid']}"
        )
        assert response.status_code == 404

    def test_unknown_cursor_returns_404(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?after={UNKNOWN_UUID}"
        )
        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestMessagePagination:
    """Pagination arrière par curseur sur 120 messages : 50 / 50 / 20."""

    @pytest.fixture
    def busy_conversation(self, alice, bob):
        alice_client, alice_uuid = alice
        _, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        entity = ConversationEntity.objects.get(uuid=conversation["uuid"])
        author = UserProfileEntity.objects.get(uuid=alice_uuid)
        created = MessageEntity.objects.bulk_create(
            [
                MessageEntity(
                    conversation=entity,
                    author=author,
                    kind=MESSAGE_KIND_TEXT,
                    body=f"message {index:03d}",
                )
                for index in range(120)
            ]
        )
        base = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
        for index, message in enumerate(created):
            MessageEntity.objects.filter(uuid=message.uuid).update(
                created_at=base + timedelta(seconds=index)
            )
        return conversation, [str(message.uuid) for message in created]

    def test_backward_pagination_walks_the_whole_history(
        self, alice, busy_conversation
    ):
        alice_client, _ = alice
        conversation, ordered_uuids = busy_conversation

        first = _messages(alice_client, conversation["uuid"])
        assert len(first["results"]) == 50
        assert first["has_more"] is True
        assert [item["uuid"] for item in first["results"]] == ordered_uuids[70:120]

        second = _messages(alice_client, conversation["uuid"], before=ordered_uuids[70])
        assert len(second["results"]) == 50
        assert second["has_more"] is True
        assert [item["uuid"] for item in second["results"]] == ordered_uuids[20:70]

        third = _messages(alice_client, conversation["uuid"], before=ordered_uuids[20])
        assert len(third["results"]) == 20
        assert third["has_more"] is False
        assert [item["uuid"] for item in third["results"]] == ordered_uuids[0:20]

    def test_after_cursor_returns_new_messages_only(
        self, alice, bob, busy_conversation
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        conversation, ordered_uuids = busy_conversation
        fresh = _send(bob_client, conversation["uuid"], "nouveau").json()

        page = _messages(alice_client, conversation["uuid"], after=ordered_uuids[-1])
        assert [item["uuid"] for item in page["results"]] == [fresh["uuid"]]
        assert page["has_more"] is False

    def test_after_cursor_reports_more_when_limited(
        self, alice, bob, busy_conversation
    ):
        bob_client, _ = bob
        alice_client, _ = alice
        conversation, ordered_uuids = busy_conversation
        for index in range(3):
            _send(bob_client, conversation["uuid"], f"nouveau {index}")

        page = _messages(
            alice_client, conversation["uuid"], after=ordered_uuids[-1], limit=2
        )
        assert len(page["results"]) == 2
        assert page["has_more"] is True


# ----------------------------------------------------------------------
# Non-lus et tri de la liste
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestUnreadCounters:
    def test_unread_counts_for_recipient_only(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        for index in range(3):
            _send(alice_client, conversation["uuid"], f"m{index}")

        listed = bob_client.get(BASE).json()
        assert listed[0]["unread_count"] == 3
        detail = bob_client.get(f"{BASE}{conversation['uuid']}/").json()
        assert detail["unread_count"] == 3
        assert bob_client.get(UNREAD_URL).json() == {"total_unread": 3}

        # L'auteur ne compte pas ses propres messages.
        assert alice_client.get(UNREAD_URL).json() == {"total_unread": 0}

    def test_mark_read_resets_then_new_message_increments(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        conversation = _create_direct(alice_client, bob_uuid)
        for index in range(3):
            _send(alice_client, conversation["uuid"], f"m{index}")

        response = _post(bob_client, f"{BASE}{conversation['uuid']}/read/", {})
        assert response.status_code == 200
        assert response.json()["unread_count"] == 0
        assert bob_client.get(UNREAD_URL).json() == {"total_unread": 0}

        _send(alice_client, conversation["uuid"], "encore un")
        assert bob_client.get(UNREAD_URL).json() == {"total_unread": 1}

    def test_total_unread_sums_all_conversations(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        direct = _create_direct(alice_client, bob_uuid)
        group = _create_group(alice_client, "Groupe", [bob_uuid])
        for index in range(3):
            _send(alice_client, direct["uuid"], f"d{index}")
        for index in range(2):
            _send(alice_client, group["uuid"], f"g{index}")

        assert bob_client.get(UNREAD_URL).json() == {"total_unread": 5}

    def test_list_is_sorted_by_last_message_then_creation(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        first = _create_group(alice_client, "G1", [bob_uuid])
        second = _create_group(alice_client, "G2", [bob_uuid])
        third = _create_group(alice_client, "G3", [bob_uuid])
        _send(alice_client, first["uuid"], "salut")

        listed = [item["uuid"] for item in alice_client.get(BASE).json()]
        assert listed == [first["uuid"], third["uuid"], second["uuid"]]


# ----------------------------------------------------------------------
# Anti N+1
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestListQueryBudget:
    def test_list_query_count_does_not_grow_with_conversations(self, alice, bob):
        alice_client, _ = alice
        _, bob_uuid = bob
        first = _create_group(alice_client, "Budget 1", [bob_uuid])
        _send(alice_client, first["uuid"], "message")

        with CaptureQueriesContext(connection) as one_conversation:
            assert alice_client.get(BASE).status_code == 200

        for index in range(2, 6):
            extra = _create_group(alice_client, f"Budget {index}", [bob_uuid])
            _send(alice_client, extra["uuid"], "message")

        with CaptureQueriesContext(connection) as five_conversations:
            response = alice_client.get(BASE)
            assert response.status_code == 200
            assert len(response.json()) == 5

        assert len(five_conversations.captured_queries) == len(
            one_conversation.captured_queries
        )


# ----------------------------------------------------------------------
# Débit (throttling) des endpoints pollés
# ----------------------------------------------------------------------


@pytest.mark.integration
class TestMessagingThrottling:
    @pytest.mark.parametrize("action_name", ["list", "unread_count", "messages"])
    def test_polling_actions_use_the_dedicated_scope(self, action_name):
        view = ConversationController()
        view.action = action_name
        view.request = APIRequestFactory().get("/")
        throttles = view.get_throttles()
        assert len(throttles) == 1
        assert isinstance(throttles[0], ScopedRateThrottle)
        assert view.throttle_scope == "messaging_poll"

    @pytest.mark.parametrize(
        "action_name,method", [("messages", "post"), ("create", "post")]
    )
    def test_write_actions_keep_the_default_throttles(self, action_name, method):
        view = ConversationController()
        view.action = action_name
        view.request = getattr(APIRequestFactory(), method)("/")
        assert any(
            isinstance(throttle, UserRateThrottle) for throttle in view.get_throttles()
        )

    def test_messaging_poll_rate_is_configured(self):
        rates = settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]
        assert rates["messaging_poll"] == "5000/hour"


# ----------------------------------------------------------------------
# Messages système et réadhésion
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestSystemMessagesAndRejoin:
    def test_adding_and_removing_members_posts_system_messages(
        self, alice, bob, carol, group_conversation
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        url = f"{BASE}{group_conversation['uuid']}/"

        assert (
            _post(
                alice_client, f"{url}members/", {"member_uuids": [carol_uuid]}
            ).status_code
            == 200
        )
        added = _messages(alice_client, group_conversation["uuid"])["results"][-1]
        assert added["kind"] == "system"
        assert "a ajouté" in added["body"]
        assert added["author_uuid"] == _member_uuids(group_conversation)[0]

        assert alice_client.delete(f"{url}members/{bob_uuid}/").status_code == 200
        removed = _messages(alice_client, group_conversation["uuid"])["results"][-1]
        assert removed["kind"] == "system"
        assert "a retiré" in removed["body"]

    def test_readded_member_starts_unread_from_new_membership(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        url = f"{BASE}{group_conversation['uuid']}/"
        for index in range(3):
            assert (
                _send(
                    alice_client, group_conversation["uuid"], f"avant {index}"
                ).status_code
                == 201
            )

        assert alice_client.delete(f"{url}members/{bob_uuid}/").status_code == 200
        for index in range(2):
            assert (
                _send(
                    alice_client, group_conversation["uuid"], f"absent {index}"
                ).status_code
                == 201
            )

        # Réadhésion : l'historique antérieur ne compte pas, seul le message
        # système « a ajouté » est non lu (COALESCE(last_read_at, joined_at)).
        response = _post(alice_client, f"{url}members/", {"member_uuids": [bob_uuid]})
        assert response.status_code == 200
        assert bob_client.get(url).json()["unread_count"] == 1
        assert bob_client.get(UNREAD_URL).json() == {"total_unread": 1}


# ----------------------------------------------------------------------
# Casse des uuid dans l'URL
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestUuidCaseInsensitivity:
    def test_uppercase_conversation_uuid_works_with_cursor(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        first = _send(alice_client, group_conversation["uuid"], "un").json()
        assert (
            _send(alice_client, group_conversation["uuid"], "deux").status_code == 201
        )

        upper = group_conversation["uuid"].upper()
        page = _messages(alice_client, upper, after=first["uuid"])
        assert [item["body"] for item in page["results"]] == ["deux"]


# ----------------------------------------------------------------------
# Débit (throttling) appliqué de bout en bout
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestMessagingThrottlingEndToEnd:
    def test_polling_scope_is_enforced_but_writes_keep_their_budget(
        self, alice, bob, group_conversation, monkeypatch
    ):
        # THROTTLE_RATES est le dict partagé des taux (attribut de classe DRF) :
        # on abaisse le scope de polling à 2 requêtes/minute le temps du test.
        monkeypatch.setitem(
            ScopedRateThrottle.THROTTLE_RATES, "messaging_poll", "2/min"
        )
        alice_client, _ = alice

        assert alice_client.get(UNREAD_URL).status_code == 200
        assert alice_client.get(UNREAD_URL).status_code == 200
        assert alice_client.get(UNREAD_URL).status_code == 429

        # Les écritures restent sous le budget `user` (1000/h), non épuisé.
        assert (
            _send(alice_client, group_conversation["uuid"], "toujours ok").status_code
            == 201
        )
