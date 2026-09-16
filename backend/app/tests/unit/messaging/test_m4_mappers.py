"""Tests unitaires des mappers de la vague M4 (pièces jointes, édition,
suppression logique, page avec `updated`).

Les entités sont construites EN MÉMOIRE (aucun `save()`, aucune base) ; le
fichier d'une pièce jointe n'est jamais ouvert (l'URL dérive du nom stocké).
"""

from datetime import datetime, timezone

import pytest

from app.domain.messaging.models.attachment_bean import (
    AttachmentBean,
    AttachmentUploadBean,
)
from app.domain.messaging.models.constants import MESSAGE_KIND_TEXT
from app.domain.messaging.models.message_bean import MessageBean
from app.mapper.messaging.messaging_api_mapper import (
    attachment_bean_to_api,
    message_bean_to_api,
    message_page_to_api,
    message_preview_bean_to_api,
)
from app.mapper.messaging.messaging_mapper import (
    attachment_entity_to_bean,
    attachment_upload_to_entity,
    is_image_attachment_name,
    message_entity_to_bean,
)
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.message_attachment_entity import (
    ATTACHMENTS_UPLOAD_PREFIX,
    STORED_FILENAME_MAX_LENGTH,
    MessageAttachmentEntity,
    message_attachment_upload_to,
    safe_attachment_filename,
)
from app.repository.messaging.models.message_entity import MessageEntity

CONV_UUID = "66666666-6666-4666-8666-666666666666"
MSG_UUID = "88888888-8888-4888-8888-888888888888"
ATT_UUID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
NOW = datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc)
LATER = datetime(2026, 8, 30, 11, 0, tzinfo=timezone.utc)


def _message_entity(body: str = "Bonjour", **kwargs) -> MessageEntity:
    entity = MessageEntity(
        uuid=MSG_UUID,
        conversation=ConversationEntity(uuid=CONV_UUID, kind="group", name="G"),
        kind=MESSAGE_KIND_TEXT,
        body=body,
        **kwargs,
    )
    entity.created_at = NOW
    entity.updated_at = NOW
    return entity


def _attachment_entity(
    name: str = "photo.png", stored: str = "messaging/attachments/abc/photo.png"
) -> MessageAttachmentEntity:
    entity = MessageAttachmentEntity(
        uuid=ATT_UUID,
        message=_message_entity(),
        original_name=name,
        content_type="image/png",
        size=1234,
        position=1,
    )
    entity.file = stored
    return entity


# ----------------------------------------------------------------------
# Chemin de stockage
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestUploadPath:
    def test_path_is_under_prefix_with_random_segment(self):
        path = message_attachment_upload_to(None, "Rapport final.PDF")
        prefix, random_segment, filename = path.rsplit("/", 2)
        assert prefix == ATTACHMENTS_UPLOAD_PREFIX
        assert len(random_segment) == 32 and int(random_segment, 16) >= 0
        assert filename == "Rapport_final.pdf"

    def test_two_uploads_of_same_name_get_different_paths(self):
        assert message_attachment_upload_to(None, "a.png") != (
            message_attachment_upload_to(None, "a.png")
        )

    def test_directory_components_are_stripped(self):
        assert safe_attachment_filename("../../etc/passwd.txt") == "passwd.txt"

    def test_extension_is_lowercased_and_name_cleaned(self):
        assert (
            safe_attachment_filename("mes données (v2).XLSX") == "mes_données_v2.xlsx"
        )

    def test_long_name_is_truncated_keeping_extension(self):
        name = safe_attachment_filename("x" * 300 + ".docx")
        assert len(name) == STORED_FILENAME_MAX_LENGTH
        assert name.endswith(".docx")

    @pytest.mark.parametrize("raw", ["", "...", "___", "..", "/"])
    def test_empty_stem_falls_back(self, raw):
        assert safe_attachment_filename(raw).startswith("fichier")

    def test_leading_dot_is_stripped(self):
        assert safe_attachment_filename(".hidden.txt") == "hidden.txt"


# ----------------------------------------------------------------------
# Entity ↔ Bean
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestAttachmentMapper:
    def test_entity_to_bean(self):
        bean = attachment_entity_to_bean(_attachment_entity())

        assert bean.uuid == ATT_UUID
        assert bean.original_name == "photo.png"
        assert bean.content_type == "image/png"
        assert bean.size == 1234
        assert bean.url.endswith("/messaging/attachments/abc/photo.png")
        assert bean.url.startswith("/api/media/")
        assert bean.is_image is True

    def test_entity_to_bean_without_file_gives_null_url(self):
        bean = attachment_entity_to_bean(_attachment_entity(stored=""))

        assert bean.url is None

    def test_is_image_uses_original_name_extension(self):
        entity = _attachment_entity(name="rapport.PDF", stored="x/rapport.pdf")
        assert attachment_entity_to_bean(entity).is_image is False

    @pytest.mark.parametrize(
        "name,expected",
        [
            ("a.jpg", True),
            ("a.JPEG", True),
            ("a.webp", True),
            ("a.gif", True),
            ("a.pdf", False),
            ("noext", False),
            ("", False),
            (None, False),
        ],
    )
    def test_is_image_attachment_name(self, name, expected):
        assert is_image_attachment_name(name) is expected

    def test_upload_to_entity(self):
        message = _message_entity()
        upload = AttachmentUploadBean(
            name="a.png", content_type="image/png", size=10, file="payload"
        )

        entity = attachment_upload_to_entity(upload, message, 3)

        assert entity.message is message
        assert entity.original_name == "a.png"
        assert entity.content_type == "image/png"
        assert entity.size == 10
        assert entity.position == 3
        assert entity.file == "payload"

    def test_upload_to_entity_defaults_content_type_and_truncates(self):
        upload = AttachmentUploadBean(name="n" * 300 + ".png", content_type="", size=1)

        entity = attachment_upload_to_entity(upload, _message_entity(), 0)

        assert entity.content_type == "application/octet-stream"
        assert len(entity.original_name) == 255


@pytest.mark.unit
class TestMessageMapperM4:
    def test_entity_to_bean_carries_edit_and_delete_dates(self):
        entity = _message_entity(edited_at=LATER, deleted_at=None)

        bean = message_entity_to_bean(entity)

        assert bean.edited_at == LATER
        assert bean.deleted_at is None
        assert bean.is_deleted is False
        assert bean.attachments == []

    def test_entity_to_bean_deleted(self):
        bean = message_entity_to_bean(_message_entity(deleted_at=LATER, body=""))

        assert bean.is_deleted is True
        assert bean.deleted_at == LATER

    def test_entity_to_bean_with_attachments(self):
        attachment = AttachmentBean(uuid=ATT_UUID, original_name="a.png")

        bean = message_entity_to_bean(_message_entity(), attachments=[attachment])

        assert bean.attachments == [attachment]


# ----------------------------------------------------------------------
# Bean → API
# ----------------------------------------------------------------------


@pytest.mark.unit
class TestMessageApiMapperM4:
    def test_attachment_bean_to_api(self):
        bean = AttachmentBean(
            uuid=ATT_UUID,
            original_name="a.png",
            content_type="image/png",
            size=12,
            url="/api/media/messaging/attachments/abc/a.png",
            is_image=True,
        )

        assert attachment_bean_to_api(bean) == {
            "uuid": ATT_UUID,
            "original_name": "a.png",
            "content_type": "image/png",
            "size": 12,
            "url": "/api/media/messaging/attachments/abc/a.png",
            "is_image": True,
        }

    def test_message_bean_to_api_new_fields(self):
        bean = MessageBean(
            uuid=MSG_UUID,
            body="v2",
            edited_at=LATER,
            attachments=[AttachmentBean(uuid=ATT_UUID, original_name="a.pdf")],
        )

        data = message_bean_to_api(bean)

        assert data["edited_at"] == LATER.isoformat()
        assert data["deleted_at"] is None
        assert data["is_deleted"] is False
        assert [a["uuid"] for a in data["attachments"]] == [ATT_UUID]

    def test_message_bean_to_api_deleted(self):
        data = message_bean_to_api(MessageBean(uuid=MSG_UUID, deleted_at=LATER))

        assert data["is_deleted"] is True
        assert data["deleted_at"] == LATER.isoformat()
        assert data["attachments"] == []
        assert data["entity_refs"] == []

    def test_preview_is_deleted_and_attachment_count_annotated(self):
        bean = MessageBean(uuid=MSG_UUID, deleted_at=LATER, attachment_count=3)

        data = message_preview_bean_to_api(bean)

        assert data["is_deleted"] is True
        assert data["attachment_count"] == 3
        assert "attachments" not in data

    def test_preview_attachment_count_falls_back_on_list(self):
        bean = MessageBean(
            uuid=MSG_UUID, attachments=[AttachmentBean(), AttachmentBean()]
        )

        data = message_preview_bean_to_api(bean)

        assert data["is_deleted"] is False
        assert data["attachment_count"] == 2

    def test_message_page_to_api(self):
        results = [MessageBean(uuid="r1", body="a")]
        updated = [MessageBean(uuid="u1", body="", deleted_at=LATER)]

        data = message_page_to_api(results, True, updated)

        assert [m["uuid"] for m in data["results"]] == ["r1"]
        assert data["has_more"] is True
        assert [m["uuid"] for m in data["updated"]] == ["u1"]
        assert data["updated"][0]["is_deleted"] is True

    def test_message_page_to_api_without_updates(self):
        data = message_page_to_api([], False, [])

        assert data == {"results": [], "has_more": False, "updated": []}
