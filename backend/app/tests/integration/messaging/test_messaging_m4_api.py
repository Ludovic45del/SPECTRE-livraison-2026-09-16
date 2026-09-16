"""Tests d'intégration de la vague M4 de la messagerie : pièces jointes,
édition et suppression logique des messages, polling `updated_since`,
recherche `search/`.

Les fichiers sont écrits sous un MEDIA_ROOT temporaire (`override_settings` +
`tmp_path`) : aucun fichier ne touche le dépôt. Les tests tournent avec
`DEBUG=False` : seul le statut HTTP est asserté, jamais le suffixe enrichi du
code d'erreur.
"""

import json
import os
from datetime import datetime, timedelta, timezone

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext, override_settings

from app.domain.messaging.models.constants import MAX_ATTACHMENT_SIZE_BYTES
from app.repository.messaging.models.message_attachment_entity import (
    MessageAttachmentEntity,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)
from app.tests.integration.messaging.test_messaging_api import (
    BASE,
    _create_direct,
    _create_group,
    _make_user,
    _messages,
    _patch,
    _send,
)
from app.tests.integration.messaging.test_messaging_mentions_api import Targets, _ref

SEARCH_URL = f"{BASE}search/"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
PDF_BYTES = b"%PDF-1.4\n%fake\n"


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------


def _png(name: str = "photo.png") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, PNG_BYTES, content_type="image/png")


def _pdf(name: str = "rapport.pdf") -> SimpleUploadedFile:
    return SimpleUploadedFile(name, PDF_BYTES, content_type="application/pdf")


def _send_multipart(
    client: Client, conversation_uuid: str, body: str, files: list, entity_refs=None
):
    """Publie un message en multipart (`attachments` répété, `entity_refs` JSON)."""
    data = {"body": body, "attachments": files}
    if entity_refs is not None:
        data["entity_refs"] = entity_refs
    return client.post(f"{BASE}{conversation_uuid}/messages/", data=data)


def _message_url(conversation_uuid: str, message_uuid: str) -> str:
    return f"{BASE}{conversation_uuid}/messages/{message_uuid}/"


def _edit(client: Client, conversation_uuid: str, message_uuid: str, body: str):
    return _patch(client, _message_url(conversation_uuid, message_uuid), {"body": body})


def _delete(client: Client, conversation_uuid: str, message_uuid: str):
    return client.delete(_message_url(conversation_uuid, message_uuid))


def _search(client: Client, **params):
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return client.get(f"{SEARCH_URL}?{query}" if query else SEARCH_URL)


def _iso(value: str) -> str:
    """Date ISO d'une réponse API, encodée pour une query string (`Z` plutôt que `+00:00`)."""
    return value.replace("+00:00", "Z")


def _stored_path(url: str) -> str:
    """Chemin disque d'un fichier à partir de son URL sous MEDIA_URL."""
    assert url.startswith(settings.MEDIA_URL)
    return os.path.join(settings.MEDIA_ROOT, url[len(settings.MEDIA_URL) :])


def _conversation_in_list(client: Client, conversation_uuid: str) -> dict:
    response = client.get(BASE)
    assert response.status_code == 200
    return next(c for c in response.json() if c["uuid"] == conversation_uuid)


# ----------------------------------------------------------------------
# Fixtures
# ----------------------------------------------------------------------


@pytest.fixture(autouse=True)
def media_root(tmp_path):
    """MEDIA_ROOT temporaire : aucun fichier n'est écrit dans le dépôt."""
    with override_settings(MEDIA_ROOT=str(tmp_path)):
        yield tmp_path


@pytest.fixture
def alice():
    return _make_user("m4_alice")


@pytest.fixture
def bob():
    return _make_user("m4_bob")


@pytest.fixture
def carol():
    return _make_user("m4_carol")


@pytest.fixture
def group_conversation(alice, bob):
    """Groupe créé par `alice` (propriétaire) avec `bob` membre."""
    alice_client, _ = alice
    _, bob_uuid = bob
    return _create_group(alice_client, "Campagne M4", [bob_uuid])


@pytest.fixture
def targets(db) -> Targets:
    return Targets()


# ----------------------------------------------------------------------
# Pièces jointes
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestAttachments:
    def test_multipart_with_two_files(self, alice, group_conversation, media_root):
        alice_client, _ = alice
        response = _send_multipart(
            alice_client, group_conversation["uuid"], "Voir PJ", [_png(), _pdf()]
        )
        assert response.status_code == 201, response.content
        message = response.json()
        assert message["body"] == "Voir PJ"
        assert message["is_deleted"] is False
        assert message["edited_at"] is None
        attachments = message["attachments"]
        assert [a["original_name"] for a in attachments] == ["photo.png", "rapport.pdf"]
        assert [a["is_image"] for a in attachments] == [True, False]
        assert [a["content_type"] for a in attachments] == [
            "image/png",
            "application/pdf",
        ]
        assert [a["size"] for a in attachments] == [len(PNG_BYTES), len(PDF_BYTES)]
        for attachment in attachments:
            assert attachment["url"].startswith("/api/media/messaging/attachments/")
            path = _stored_path(attachment["url"])
            assert os.path.isfile(path)
            assert str(media_root) in path
        assert (
            MessageAttachmentEntity.objects.filter(message_id=message["uuid"]).count()
            == 2
        )

    def test_attachments_are_listed_in_page(self, alice, bob, group_conversation):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send_multipart(
            alice_client, group_conversation["uuid"], "PJ", [_pdf()]
        ).json()
        page = _messages(bob_client, group_conversation["uuid"])
        listed = next(m for m in page["results"] if m["uuid"] == created["uuid"])
        assert [a["original_name"] for a in listed["attachments"]] == ["rapport.pdf"]
        assert listed["attachments"][0]["url"] == created["attachments"][0]["url"]

    def test_six_files_are_rejected(self, alice, group_conversation, media_root):
        alice_client, _ = alice
        files = [_png(f"p{i}.png") for i in range(6)]
        response = _send_multipart(alice_client, group_conversation["uuid"], "x", files)
        assert response.status_code == 400
        assert MessageAttachmentEntity.objects.count() == 0
        assert not os.path.exists(os.path.join(media_root, "messaging"))

    def test_oversized_file_is_rejected(self, alice, group_conversation, media_root):
        alice_client, _ = alice
        big = SimpleUploadedFile(
            "big.pdf",
            b"0" * (MAX_ATTACHMENT_SIZE_BYTES + 1),
            content_type="application/pdf",
        )
        response = _send_multipart(alice_client, group_conversation["uuid"], "x", [big])
        assert response.status_code == 400
        assert not os.path.exists(os.path.join(media_root, "messaging"))

    def test_forbidden_extension_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        exe = SimpleUploadedFile(
            "tool.exe", b"MZ", content_type="application/octet-stream"
        )
        response = _send_multipart(alice_client, group_conversation["uuid"], "x", [exe])
        assert response.status_code == 400
        assert (
            MessageEntity.objects.filter(
                conversation_id=group_conversation["uuid"], body="x"
            ).count()
            == 0
        )

    def test_empty_body_with_attachment_is_accepted(self, alice, group_conversation):
        alice_client, _ = alice
        response = _send_multipart(
            alice_client, group_conversation["uuid"], "", [_png()]
        )
        assert response.status_code == 201, response.content
        assert response.json()["body"] == ""
        assert len(response.json()["attachments"]) == 1

    def test_empty_body_without_attachment_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        assert (
            _send_multipart(
                alice_client, group_conversation["uuid"], "", []
            ).status_code
            == 400
        )
        assert _send(alice_client, group_conversation["uuid"], "").status_code == 400
        assert _send(alice_client, group_conversation["uuid"], "   ").status_code == 400

    def test_json_post_without_body_field_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.post(
            f"{BASE}{group_conversation['uuid']}/messages/",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_entity_refs_as_json_string_in_multipart(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        refs = [_ref("fa", targets.fa.uuid), _ref("campaign", targets.campaign.uuid)]
        response = _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "Avec refs",
            [_png()],
            entity_refs=json.dumps(refs),
        )
        assert response.status_code == 201, response.content
        listed = response.json()["entity_refs"]
        assert [(r["entity_type"], r["exists"]) for r in listed] == [
            ("fa", True),
            ("campaign", True),
        ]
        assert listed[0]["slug"] == targets.expected_fa_slug

    def test_invalid_entity_refs_string_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "x",
            [_png()],
            entity_refs="{not json",
        )
        assert response.status_code == 400
        response = _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "x",
            [_png()],
            entity_refs='{"a": 1}',
        )
        assert response.status_code == 400

    def test_non_member_cannot_post_attachments(
        self, carol, group_conversation, media_root
    ):
        carol_client, _ = carol
        response = _send_multipart(
            carol_client, group_conversation["uuid"], "x", [_png()]
        )
        assert response.status_code == 404
        assert not os.path.exists(os.path.join(media_root, "messaging"))

    def test_stored_path_is_not_guessable_and_name_is_cleaned(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        first = _send_multipart(
            alice_client, group_conversation["uuid"], "a", [_png("Mon Image.PNG")]
        ).json()["attachments"][0]
        second = _send_multipart(
            alice_client, group_conversation["uuid"], "b", [_png("Mon Image.PNG")]
        ).json()["attachments"][0]
        assert first["url"] != second["url"]
        assert first["url"].endswith("/Mon_Image.png")
        assert first["original_name"] == "Mon Image.PNG"

    def test_group_deletion_removes_files(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send_multipart(
            alice_client, group_conversation["uuid"], "x", [_png(), _pdf()]
        ).json()
        paths = [_stored_path(a["url"]) for a in created["attachments"]]
        assert all(os.path.isfile(p) for p in paths)
        assert (
            alice_client.delete(f"{BASE}{group_conversation['uuid']}/").status_code
            == 204
        )
        assert not any(os.path.exists(p) for p in paths)
        assert MessageAttachmentEntity.objects.count() == 0

    def test_attachment_row_delete_removes_file(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send_multipart(
            alice_client, group_conversation["uuid"], "x", [_png()]
        ).json()
        path = _stored_path(created["attachments"][0]["url"])
        MessageAttachmentEntity.objects.get(
            uuid=created["attachments"][0]["uuid"]
        ).delete()
        assert not os.path.exists(path)


# ----------------------------------------------------------------------
# Édition
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestEditMessage:
    def test_author_edits(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "Bonjuor").json()
        response = _edit(
            alice_client, group_conversation["uuid"], created["uuid"], "Bonjour"
        )
        assert response.status_code == 200, response.content
        edited = response.json()
        assert edited["uuid"] == created["uuid"]
        assert edited["body"] == "Bonjour"
        assert edited["edited_at"] is not None
        assert edited["is_deleted"] is False
        assert edited["updated_at"] > created["updated_at"]
        assert edited["updated_at"] == edited["edited_at"]
        assert edited["created_at"] == created["created_at"]

    def test_edit_keeps_refs_and_attachments(self, alice, group_conversation, targets):
        alice_client, _ = alice
        created = _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "v1",
            [_png()],
            entity_refs=json.dumps([_ref("fa", targets.fa.uuid)]),
        ).json()
        edited = _edit(
            alice_client, group_conversation["uuid"], created["uuid"], "v2"
        ).json()
        assert len(edited["attachments"]) == 1
        assert len(edited["entity_refs"]) == 1

    def test_identical_body_is_not_marked_edited(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "Idem").json()
        response = _edit(
            alice_client, group_conversation["uuid"], created["uuid"], " Idem "
        )
        assert response.status_code == 200
        assert response.json()["edited_at"] is None

    def test_other_member_is_forbidden(self, alice, bob, group_conversation):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(alice_client, group_conversation["uuid"], "Mien").json()
        assert (
            _edit(
                bob_client, group_conversation["uuid"], created["uuid"], "x"
            ).status_code
            == 403
        )

    def test_group_owner_cannot_edit_member_message(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(bob_client, group_conversation["uuid"], "De Bob").json()
        assert (
            _edit(
                alice_client, group_conversation["uuid"], created["uuid"], "x"
            ).status_code
            == 403
        )

    def test_non_member_gets_404(self, alice, carol, group_conversation):
        alice_client, _ = alice
        carol_client, _ = carol
        created = _send(alice_client, group_conversation["uuid"], "Privé").json()
        assert (
            _edit(
                carol_client, group_conversation["uuid"], created["uuid"], "x"
            ).status_code
            == 404
        )

    def test_system_message_is_rejected(self, alice, bob, carol, group_conversation):
        alice_client, _ = alice
        _, carol_uuid = carol
        add = alice_client.post(
            f"{BASE}{group_conversation['uuid']}/members/",
            data=json.dumps({"member_uuids": [carol_uuid]}),
            content_type="application/json",
        )
        assert add.status_code == 200
        system = next(
            m
            for m in _messages(alice_client, group_conversation["uuid"])["results"]
            if m["kind"] == "system"
        )
        assert (
            _edit(
                alice_client, group_conversation["uuid"], system["uuid"], "x"
            ).status_code
            == 400
        )

    def test_empty_body_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        assert (
            _edit(
                alice_client, group_conversation["uuid"], created["uuid"], "  "
            ).status_code
            == 400
        )

    def test_unknown_or_malformed_message_gets_404(self, alice, group_conversation):
        alice_client, _ = alice
        assert (
            _edit(
                alice_client,
                group_conversation["uuid"],
                "99999999-9999-4999-8999-999999999999",
                "x",
            ).status_code
            == 404
        )
        assert (
            _edit(
                alice_client, group_conversation["uuid"], "not-a-uuid", "x"
            ).status_code
            == 404
        )

    def test_message_of_another_conversation_gets_404(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        _, bob_uuid = bob
        direct = _create_direct(alice_client, bob_uuid)
        created = _send(alice_client, direct["uuid"], "Ailleurs").json()
        assert (
            _edit(
                alice_client, group_conversation["uuid"], created["uuid"], "x"
            ).status_code
            == 404
        )

    def test_put_is_not_allowed(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        response = alice_client.put(
            _message_url(group_conversation["uuid"], created["uuid"]),
            data=json.dumps({"body": "y"}),
            content_type="application/json",
        )
        assert response.status_code == 405

    def test_deleted_message_cannot_be_edited(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        assert (
            _delete(
                alice_client, group_conversation["uuid"], created["uuid"]
            ).status_code
            == 200
        )
        assert (
            _edit(
                alice_client, group_conversation["uuid"], created["uuid"], "y"
            ).status_code
            == 400
        )


# ----------------------------------------------------------------------
# Suppression logique
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestDeleteMessage:
    def test_author_deletes_with_attachments_and_refs(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        created = _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "À effacer",
            [_png(), _pdf()],
            entity_refs=json.dumps([_ref("fa", targets.fa.uuid)]),
        ).json()
        paths = [_stored_path(a["url"]) for a in created["attachments"]]
        assert all(os.path.isfile(p) for p in paths)

        response = _delete(alice_client, group_conversation["uuid"], created["uuid"])
        assert response.status_code == 200, response.content
        deleted = response.json()
        assert deleted["uuid"] == created["uuid"]
        assert deleted["is_deleted"] is True
        assert deleted["deleted_at"] is not None
        assert deleted["body"] == ""
        assert deleted["attachments"] == []
        assert deleted["entity_refs"] == []
        assert deleted["updated_at"] == deleted["deleted_at"]
        assert not any(os.path.exists(p) for p in paths)
        assert (
            MessageAttachmentEntity.objects.filter(message_id=created["uuid"]).count()
            == 0
        )
        assert (
            MessageEntityRefEntity.objects.filter(message_id=created["uuid"]).count()
            == 0
        )
        assert MessageEntity.objects.filter(uuid=created["uuid"]).exists()

    def test_deleted_message_stays_in_page(self, alice, bob, group_conversation):
        alice_client, _ = alice
        bob_client, _ = bob
        first = _send(alice_client, group_conversation["uuid"], "un").json()
        _send(alice_client, group_conversation["uuid"], "deux")
        _delete(alice_client, group_conversation["uuid"], first["uuid"])
        page = _messages(bob_client, group_conversation["uuid"])
        listed = [m for m in page["results"] if m["uuid"] == first["uuid"]]
        assert len(listed) == 1
        assert listed[0]["is_deleted"] is True
        assert listed[0]["body"] == ""
        # Le supprimé reste utilisable comme curseur.
        after = _messages(bob_client, group_conversation["uuid"], after=first["uuid"])
        assert [m["body"] for m in after["results"]] == ["deux"]

    def test_delete_is_idempotent(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        first = _delete(alice_client, group_conversation["uuid"], created["uuid"])
        second = _delete(alice_client, group_conversation["uuid"], created["uuid"])
        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["deleted_at"] == first.json()["deleted_at"]

    def test_group_owner_deletes_member_message(self, alice, bob, group_conversation):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(bob_client, group_conversation["uuid"], "De Bob").json()
        response = _delete(alice_client, group_conversation["uuid"], created["uuid"])
        assert response.status_code == 200
        assert response.json()["is_deleted"] is True

    def test_member_cannot_delete_other_member_message(
        self, alice, bob, carol, group_conversation
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        carol_client, carol_uuid = carol
        alice_client.post(
            f"{BASE}{group_conversation['uuid']}/members/",
            data=json.dumps({"member_uuids": [carol_uuid]}),
            content_type="application/json",
        )
        created = _send(bob_client, group_conversation["uuid"], "De Bob").json()
        assert (
            _delete(
                carol_client, group_conversation["uuid"], created["uuid"]
            ).status_code
            == 403
        )

    def test_member_cannot_delete_owner_message(self, alice, bob, group_conversation):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(alice_client, group_conversation["uuid"], "D'Alice").json()
        assert (
            _delete(bob_client, group_conversation["uuid"], created["uuid"]).status_code
            == 403
        )

    def test_direct_other_member_is_forbidden(self, alice, bob):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        direct = _create_direct(alice_client, bob_uuid)
        created = _send(bob_client, direct["uuid"], "De Bob").json()
        # Alice a créé la privée mais n'a aucun droit sur les messages de Bob.
        assert _delete(alice_client, direct["uuid"], created["uuid"]).status_code == 403
        assert _delete(bob_client, direct["uuid"], created["uuid"]).status_code == 200

    def test_non_member_gets_404(self, alice, carol, group_conversation):
        alice_client, _ = alice
        carol_client, _ = carol
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        assert (
            _delete(
                carol_client, group_conversation["uuid"], created["uuid"]
            ).status_code
            == 404
        )

    def test_system_message_is_rejected(self, alice, carol, group_conversation):
        alice_client, _ = alice
        _, carol_uuid = carol
        alice_client.post(
            f"{BASE}{group_conversation['uuid']}/members/",
            data=json.dumps({"member_uuids": [carol_uuid]}),
            content_type="application/json",
        )
        system = next(
            m
            for m in _messages(alice_client, group_conversation["uuid"])["results"]
            if m["kind"] == "system"
        )
        assert (
            _delete(
                alice_client, group_conversation["uuid"], system["uuid"]
            ).status_code
            == 400
        )

    def test_unknown_message_gets_404(self, alice, group_conversation):
        alice_client, _ = alice
        assert (
            _delete(alice_client, group_conversation["uuid"], "not-a-uuid").status_code
            == 404
        )

    def test_last_message_at_is_unchanged_after_delete(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        before = _conversation_in_list(alice_client, group_conversation["uuid"])[
            "last_message_at"
        ]
        _delete(alice_client, group_conversation["uuid"], created["uuid"])
        after = _conversation_in_list(alice_client, group_conversation["uuid"])[
            "last_message_at"
        ]
        assert before == after


# ----------------------------------------------------------------------
# Polling : updated_since
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestUpdatedSincePolling:
    def test_page_always_carries_updated(self, alice, group_conversation):
        alice_client, _ = alice
        page = _messages(alice_client, group_conversation["uuid"])
        assert page["updated"] == []
        assert page["has_more"] is False

    def test_after_with_updated_since_returns_edits_and_deletions(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        first = _send(alice_client, group_conversation["uuid"], "un").json()
        second = _send(alice_client, group_conversation["uuid"], "deux").json()
        third = _send(alice_client, group_conversation["uuid"], "trois").json()
        page = _messages(bob_client, group_conversation["uuid"])
        cursor = page["results"][-1]["uuid"]
        since = max(m["updated_at"] for m in page["results"])

        # Rien de nouveau, rien de modifié.
        idle = _messages(
            bob_client,
            group_conversation["uuid"],
            after=cursor,
            updated_since=_iso(since),
        )
        assert idle["results"] == []
        assert idle["updated"] == []

        _edit(alice_client, group_conversation["uuid"], first["uuid"], "un (corrigé)")
        _delete(alice_client, group_conversation["uuid"], second["uuid"])
        fourth = _send(alice_client, group_conversation["uuid"], "quatre").json()

        poll = _messages(
            bob_client,
            group_conversation["uuid"],
            after=cursor,
            updated_since=_iso(since),
        )
        assert [m["uuid"] for m in poll["results"]] == [fourth["uuid"]]
        updated = {m["uuid"]: m for m in poll["updated"]}
        assert set(updated) == {first["uuid"], second["uuid"]}
        assert updated[first["uuid"]]["body"] == "un (corrigé)"
        assert updated[first["uuid"]]["edited_at"] is not None
        assert updated[second["uuid"]]["is_deleted"] is True
        assert third["uuid"] not in updated

        # Le curseur avance ; la borne aussi : plus rien à signaler.
        newest = max(
            [m["updated_at"] for m in poll["results"]]
            + [m["updated_at"] for m in poll["updated"]]
        )
        again = _messages(
            bob_client,
            group_conversation["uuid"],
            after=fourth["uuid"],
            updated_since=_iso(newest),
        )
        assert again["results"] == []
        assert again["updated"] == []

    def test_updated_since_at_millisecond_precision_does_not_loop(
        self, alice, bob, group_conversation
    ):
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(alice_client, group_conversation["uuid"], "un").json()
        edited = _edit(
            alice_client, group_conversation["uuid"], created["uuid"], "deux"
        ).json()
        # Le client JS ne garde que la milliseconde.
        stamp = datetime.fromisoformat(edited["updated_at"])
        truncated = stamp.replace(microsecond=(stamp.microsecond // 1000) * 1000)
        poll = _messages(
            bob_client,
            group_conversation["uuid"],
            after=created["uuid"],
            updated_since=_iso(truncated.isoformat()),
        )
        assert poll["updated"] == []

    def test_updated_since_alone_excludes_page_results(self, alice, group_conversation):
        alice_client, _ = alice
        old = _send(alice_client, group_conversation["uuid"], "vieux").json()
        newest = None
        for index in range(3):
            newest = _send(alice_client, group_conversation["uuid"], f"m{index}").json()
        since = _iso(newest["updated_at"])
        _edit(alice_client, group_conversation["uuid"], old["uuid"], "vieux (édité)")

        # Page de 2 : le vieux message édité n'y figure pas → il sort dans `updated`.
        page = _messages(
            alice_client, group_conversation["uuid"], limit=2, updated_since=since
        )
        assert len(page["results"]) == 2
        assert page["has_more"] is True
        assert [m["uuid"] for m in page["updated"]] == [old["uuid"]]

        # Page complète : le message est dans `results`, donc pas dans `updated`.
        full = _messages(alice_client, group_conversation["uuid"], updated_since=since)
        assert old["uuid"] in [m["uuid"] for m in full["results"]]
        assert full["updated"] == []

    def test_after_overflow_does_not_leak_into_updated(self, alice, group_conversation):
        alice_client, _ = alice
        anchor = _send(alice_client, group_conversation["uuid"], "ancre").json()
        for index in range(3):
            _send(alice_client, group_conversation["uuid"], f"m{index}")
        poll = _messages(
            alice_client,
            group_conversation["uuid"],
            after=anchor["uuid"],
            limit=1,
            updated_since=_iso(anchor["updated_at"]),
        )
        assert len(poll["results"]) == 1
        assert poll["has_more"] is True
        # Les nouveaux messages au-delà de la page relèvent de has_more, pas de `updated`.
        assert poll["updated"] == []

    def test_before_with_updated_since_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?before={created['uuid']}"
            f"&updated_since={_iso(created['updated_at'])}"
        )
        assert response.status_code == 400

    def test_invalid_updated_since_is_rejected(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?updated_since=hier"
        )
        assert response.status_code == 400

    def test_naive_updated_since_is_accepted(self, alice, group_conversation):
        alice_client, _ = alice
        response = alice_client.get(
            f"{BASE}{group_conversation['uuid']}/messages/?updated_since=2026-01-01T00:00:00"
        )
        assert response.status_code == 200

    def test_future_updated_since_returns_nothing(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "x").json()
        _edit(alice_client, group_conversation["uuid"], created["uuid"], "y")
        future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        page = _messages(
            alice_client,
            group_conversation["uuid"],
            limit=1,
            updated_since=_iso(future),
        )
        assert page["updated"] == []


# ----------------------------------------------------------------------
# Aperçu de la liste des conversations
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestConversationPreview:
    def test_preview_reflects_edit(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send(alice_client, group_conversation["uuid"], "v1").json()
        _edit(alice_client, group_conversation["uuid"], created["uuid"], "v2")
        preview = _conversation_in_list(alice_client, group_conversation["uuid"])[
            "last_message"
        ]
        assert preview["uuid"] == created["uuid"]
        assert preview["body"] == "v2"
        assert preview["is_deleted"] is False

    def test_preview_reflects_deletion(self, alice, group_conversation):
        alice_client, _ = alice
        created = _send_multipart(
            alice_client, group_conversation["uuid"], "v1", [_png()]
        ).json()
        _delete(alice_client, group_conversation["uuid"], created["uuid"])
        preview = _conversation_in_list(alice_client, group_conversation["uuid"])[
            "last_message"
        ]
        assert preview["uuid"] == created["uuid"]
        assert preview["is_deleted"] is True
        assert preview["body"] == ""
        assert preview["attachment_count"] == 0

    def test_preview_attachment_count(self, alice, group_conversation, targets):
        alice_client, _ = alice
        _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "PJ",
            [_png(), _pdf(), _png("b.png")],
            entity_refs=json.dumps(
                [_ref("fa", targets.fa.uuid), _ref("campaign", targets.campaign.uuid)]
            ),
        )
        preview = _conversation_in_list(alice_client, group_conversation["uuid"])[
            "last_message"
        ]
        assert preview["attachment_count"] == 3
        # Deux relations multivaluées comptées ensemble : pas de produit cartésien.
        assert preview["entity_ref_count"] == 2
        assert "attachments" not in preview

    def test_detail_preview_attachment_count(self, alice, group_conversation):
        alice_client, _ = alice
        _send_multipart(alice_client, group_conversation["uuid"], "PJ", [_pdf()])
        response = alice_client.get(f"{BASE}{group_conversation['uuid']}/")
        assert response.status_code == 200
        assert response.json()["last_message"]["attachment_count"] == 1


# ----------------------------------------------------------------------
# Recherche
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestSearch:
    def test_search_only_my_conversations(self, alice, bob, carol):
        alice_client, _ = alice
        bob_client, bob_uuid = bob
        carol_client, carol_uuid = carol
        mine = _create_group(alice_client, "Alice et Bob", [bob_uuid])
        theirs = _create_group(bob_client, "Bob et Carol", [carol_uuid])
        _send(alice_client, mine["uuid"], "Cryogénie prévue lundi")
        _send(bob_client, theirs["uuid"], "Cryogénie prévue mardi")

        response = _search(alice_client, q="cryog")
        assert response.status_code == 200
        results = response.json()["results"]
        assert [r["message"]["body"] for r in results] == ["Cryogénie prévue lundi"]
        assert results[0]["conversation"]["uuid"] == mine["uuid"]
        assert results[0]["conversation"]["name"] == "Alice et Bob"
        assert {m["uuid"] for m in results[0]["conversation"]["members"]} == set(
            _member_uuids_of(mine)
        )

        assert len(_search(bob_client, q="cryog").json()["results"]) == 2
        assert (
            _search(carol_client, q="cryog").json()["results"][0]["conversation"][
                "uuid"
            ]
            == theirs["uuid"]
        )

    def test_search_is_case_insensitive_and_recent_first(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        first = _send(
            alice_client, group_conversation["uuid"], "Rapport FSEC-12"
        ).json()
        _send(alice_client, group_conversation["uuid"], "rien à voir")
        second = _send(
            alice_client, group_conversation["uuid"], "rapport envoyé"
        ).json()
        results = _search(alice_client, q="RAPPORT").json()["results"]
        assert [r["message"]["uuid"] for r in results] == [
            second["uuid"],
            first["uuid"],
        ]

    def test_search_excludes_deleted_and_system(self, alice, carol, group_conversation):
        alice_client, _ = alice
        _, carol_uuid = carol
        kept = _send(
            alice_client, group_conversation["uuid"], "mot-clé conservé"
        ).json()
        removed = _send(
            alice_client, group_conversation["uuid"], "mot-clé supprimé"
        ).json()
        _delete(alice_client, group_conversation["uuid"], removed["uuid"])
        alice_client.post(
            f"{BASE}{group_conversation['uuid']}/members/",
            data=json.dumps({"member_uuids": [carol_uuid]}),
            content_type="application/json",
        )
        results = _search(alice_client, q="mot-clé").json()["results"]
        assert [r["message"]["uuid"] for r in results] == [kept["uuid"]]
        # Le message système « a ajouté » n'est jamais renvoyé.
        assert _search(alice_client, q="a ajouté").json()["results"] == []

    def test_search_hydrates_attachments_and_refs(
        self, alice, group_conversation, targets
    ):
        alice_client, _ = alice
        _send_multipart(
            alice_client,
            group_conversation["uuid"],
            "pièce jointe utile",
            [_pdf()],
            entity_refs=json.dumps([_ref("fa", targets.fa.uuid)]),
        )
        hit = _search(alice_client, q="utile").json()["results"][0]["message"]
        assert [a["original_name"] for a in hit["attachments"]] == ["rapport.pdf"]
        assert hit["entity_refs"][0]["entity_type"] == "fa"

    def test_short_query_is_rejected(self, alice):
        alice_client, _ = alice
        assert _search(alice_client, q="a").status_code == 400
        assert _search(alice_client, q="").status_code == 400
        assert _search(alice_client).status_code == 400
        assert _search(alice_client, q="x" * 101).status_code == 400

    def test_limit(self, alice, group_conversation):
        alice_client, _ = alice
        for index in range(4):
            _send(alice_client, group_conversation["uuid"], f"limite {index}")
        assert len(_search(alice_client, q="limite", limit=2).json()["results"]) == 2
        assert len(_search(alice_client, q="limite").json()["results"]) == 4
        assert _search(alice_client, q="limite", limit=0).status_code == 400
        assert _search(alice_client, q="limite", limit=51).status_code == 400
        assert _search(alice_client, q="limite", limit="abc").status_code == 400

    def test_like_wildcards_are_literal(self, alice, group_conversation):
        alice_client, _ = alice
        _send(alice_client, group_conversation["uuid"], "taux 100% atteint")
        _send(alice_client, group_conversation["uuid"], "taux 100 atteint")
        results = _search(alice_client, q="100%").json()["results"]
        assert [r["message"]["body"] for r in results] == ["taux 100% atteint"]

    def test_search_route_is_not_captured_by_lookup(self, alice):
        alice_client, _ = alice
        assert _search(alice_client, q="rien").json() == {"results": []}

    def test_anonymous_is_rejected(self):
        assert Client().get(f"{SEARCH_URL}?q=abc").status_code in (401, 403)


def _member_uuids_of(conversation: dict) -> list:
    return [member["uuid"] for member in conversation["members"]]


# ----------------------------------------------------------------------
# Budget de requêtes (anti N+1)
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestAttachmentsQueryBudget:
    def test_messages_query_count_does_not_grow_with_attachments(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        url = f"{BASE}{group_conversation['uuid']}/messages/"
        _send_multipart(
            alice_client, group_conversation["uuid"], "m0", [_png(), _pdf()]
        )

        with CaptureQueriesContext(connection) as one_message:
            assert alice_client.get(url).status_code == 200

        for index in range(1, 5):
            _send_multipart(
                alice_client, group_conversation["uuid"], f"m{index}", [_png(), _pdf()]
            )

        with CaptureQueriesContext(connection) as five_messages:
            response = alice_client.get(url)
            assert response.status_code == 200
            assert len(response.json()["results"]) == 5
            assert all(len(m["attachments"]) == 2 for m in response.json()["results"])

        assert len(five_messages.captured_queries) == len(one_message.captured_queries)

    def test_polling_query_count_does_not_grow_with_updated(
        self, alice, group_conversation
    ):
        alice_client, _ = alice
        created = [
            _send_multipart(
                alice_client, group_conversation["uuid"], f"m{i}", [_png()]
            ).json()
            for i in range(5)
        ]
        cursor = created[-1]["uuid"]
        since = _iso(created[-1]["updated_at"])
        url = f"{BASE}{group_conversation['uuid']}/messages/?after={cursor}&updated_since={since}"

        _edit(alice_client, group_conversation["uuid"], created[0]["uuid"], "édité 0")
        with CaptureQueriesContext(connection) as one_update:
            response = alice_client.get(url)
            assert response.status_code == 200
            assert len(response.json()["updated"]) == 1

        for index in range(1, 4):
            _edit(
                alice_client,
                group_conversation["uuid"],
                created[index]["uuid"],
                f"édité {index}",
            )
        with CaptureQueriesContext(connection) as four_updates:
            response = alice_client.get(url)
            assert response.status_code == 200
            assert len(response.json()["updated"]) == 4
            assert all(len(m["attachments"]) == 1 for m in response.json()["updated"])

        assert len(four_updates.captured_queries) == len(one_update.captured_queries)

    def test_search_query_count_does_not_grow_with_results(self, alice, bob, carol):
        alice_client, _ = alice
        _, bob_uuid = bob
        _, carol_uuid = carol
        first = _create_group(alice_client, "Budget 1", [bob_uuid])
        second = _create_group(alice_client, "Budget 2", [carol_uuid])
        _send_multipart(alice_client, first["uuid"], "budget m0", [_png()])

        with CaptureQueriesContext(connection) as one_hit:
            assert len(_search(alice_client, q="budget").json()["results"]) == 1

        for index in range(1, 5):
            target = first if index % 2 else second
            _send_multipart(alice_client, target["uuid"], f"budget m{index}", [_png()])

        with CaptureQueriesContext(connection) as five_hits:
            assert len(_search(alice_client, q="budget").json()["results"]) == 5

        assert len(five_hits.captured_queries) == len(one_hit.captured_queries)


# ----------------------------------------------------------------------
# Correctifs de relecture M4
# ----------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.django_db
class TestM4ReviewFixes:
    def test_empty_file_is_rejected(self, alice, group_conversation):
        """Un fichier de 0 octet est refusé (400) : il ne serait ni affichable ni utile."""
        alice_client, _ = alice
        empty = SimpleUploadedFile("vide.txt", b"", content_type="text/plain")
        response = _send_multipart(
            alice_client, group_conversation["uuid"], "x", [empty]
        )
        assert response.status_code == 400
        assert not MessageAttachmentEntity.objects.exists()

    def test_oversized_request_is_rejected_before_parsing(
        self, alice, group_conversation
    ):
        """Un Content-Length au-delà du plafond (5 × 10 Mo + marge) est refusé sans lire le corps."""
        alice_client, _ = alice
        response = alice_client.post(
            f"{BASE}{group_conversation['uuid']}/messages/",
            data={"body": "x", "attachments": [_pdf()]},
            CONTENT_LENGTH=str(6 * MAX_ATTACHMENT_SIZE_BYTES),
        )
        assert response.status_code == 400
        assert not MessageEntity.objects.filter(
            conversation_id=group_conversation["uuid"], kind="text"
        ).exists()

    def test_deleted_message_no_longer_counts_as_unread(
        self, alice, bob, group_conversation
    ):
        """Un message supprimé avant lecture disparaît du compteur de non-lus."""
        alice_client, _ = alice
        bob_client, _ = bob
        created = _send(alice_client, group_conversation["uuid"], "à supprimer").json()
        kept = _send(alice_client, group_conversation["uuid"], "conservé").json()
        detail = bob_client.get(f"{BASE}{group_conversation['uuid']}/").json()
        assert detail["unread_count"] == 2

        assert (
            _delete(
                alice_client, group_conversation["uuid"], created["uuid"]
            ).status_code
            == 200
        )

        detail = bob_client.get(f"{BASE}{group_conversation['uuid']}/").json()
        assert detail["unread_count"] == 1
        assert detail["last_message"]["uuid"] == kept["uuid"]

    def test_updated_is_bounded_to_limit_oldest_updates_first(
        self, alice, group_conversation
    ):
        """`updated` est borné à `limit`, les plus anciennes mises à jour d'abord : rien n'est sauté."""
        alice_client, _ = alice
        created = [
            _send(alice_client, group_conversation["uuid"], f"m{index}").json()
            for index in range(4)
        ]
        anchor = _send(alice_client, group_conversation["uuid"], "ancre").json()
        since = anchor["updated_at"]
        # Quatre éditions successives, toutes postérieures à `since`.
        for index, message in enumerate(created):
            assert (
                _edit(
                    alice_client,
                    group_conversation["uuid"],
                    message["uuid"],
                    f"édité {index}",
                ).status_code
                == 200
            )

        first = _messages(
            alice_client,
            group_conversation["uuid"],
            limit=2,
            after=anchor["uuid"],
            updated_since=_iso(since),
        )
        assert [m["body"] for m in first["updated"]] == ["édité 0", "édité 1"]

        # Le client avance `updated_since` au dernier `updated_at` reçu et récupère la suite.
        next_since = max(m["updated_at"] for m in first["updated"])
        second = _messages(
            alice_client,
            group_conversation["uuid"],
            limit=2,
            after=anchor["uuid"],
            updated_since=_iso(next_since),
        )
        assert [m["body"] for m in second["updated"]] == ["édité 2", "édité 3"]
