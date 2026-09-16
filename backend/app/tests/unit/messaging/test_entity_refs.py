"""Tests unitaires des références d'entités (vague M3) : service et mappers.

Service : `post_message` avec `entity_refs` (validation, dédoublonnage,
plafond, résolution des cibles, ordre et libellés) et `get_mentions`
(validations, délégation). Mappers : conversions EntityRef / Mention, sans base.
"""

from datetime import datetime, timezone
from unittest.mock import create_autospec

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.messaging.interface.entity_ref_resolver import IEntityRefResolver
from app.domain.messaging.models.constants import (
    ENTITY_REF_CAMPAIGN,
    ENTITY_REF_FA,
    ENTITY_REF_FSEC,
    ENTITY_REF_LABEL_MAX_LENGTH,
    KIND_GROUP,
    MAX_ENTITY_REFS_PER_MESSAGE,
    MENTIONS_DEFAULT_LIMIT,
    MENTIONS_MAX_LIMIT,
)
from app.domain.messaging.models.entity_ref_bean import (
    EntityRefBean,
    EntityRefTargetBean,
)
from app.domain.messaging.models.mention_bean import MentionBean
from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean
from app.domain.messaging.services import message_service
from app.mapper.messaging.messaging_api_mapper import (
    entity_ref_bean_to_api,
    entity_refs_api_to_tuples,
    mention_bean_to_api,
    mention_beans_to_api,
    message_bean_to_api,
    message_preview_bean_to_api,
)
from app.mapper.messaging.messaging_mapper import (
    entity_ref_bean_to_entity,
    entity_ref_entity_to_bean,
    message_entity_to_bean,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)
from app.tests.unit.messaging.conftest import (
    CAMPAIGN_UUID,
    CONV_UUID,
    FA_UUID,
    FSEC_UUID,
    KNOWN_TARGETS,
    MSG_UUID,
    OUTSIDER_UUID,
    OWNER_UUID,
    UNKNOWN_TARGET_UUID,
)

NOW = datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc)


def _post(conv_repo, msg_repo, resolver, refs, body="Voir cette FSEC"):
    return message_service.post_message(
        conv_repo,
        msg_repo,
        OWNER_UUID,
        CONV_UUID,
        body,
        entity_refs=refs,
        resolver=resolver,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Service : post_message avec références
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestPostMessageWithEntityRefs:
    def test_refs_are_resolved_in_requested_order(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            mock_entity_ref_resolver,
            [("fa", FA_UUID), ("fsec", FSEC_UUID), ("campaign", CAMPAIGN_UUID)],
        )

        assert [(ref.entity_type, ref.entity_uuid) for ref in result.entity_refs] == [
            ("fa", FA_UUID),
            ("fsec", FSEC_UUID),
            ("campaign", CAMPAIGN_UUID),
        ]
        assert [ref.label for ref in result.entity_refs] == [
            "FA-2026-001",
            "FSEC-12",
            "Campagne",
        ]
        assert result.entity_refs[1].slug == "2026-s1-lmj-campagne-fsec-12"
        assert all(ref.exists for ref in result.entity_refs)
        mock_entity_ref_resolver.resolve.assert_called_once_with(
            [("fa", FA_UUID), ("fsec", FSEC_UUID), ("campaign", CAMPAIGN_UUID)]
        )
        created = mock_message_repository.create.call_args.args[0]
        assert created.entity_refs == result.entity_refs

    def test_without_refs_the_resolver_is_not_called(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            mock_entity_ref_resolver,
            [],
        )

        assert result.entity_refs == []
        mock_entity_ref_resolver.resolve.assert_not_called()

    def test_default_arguments_keep_m1_behaviour(
        self, mock_conversation_repository, mock_message_repository
    ):
        result = message_service.post_message(
            mock_conversation_repository,
            mock_message_repository,
            OWNER_UUID,
            CONV_UUID,
            "Bonjour",
        )

        assert result.entity_refs == []

    def test_unknown_type_is_rejected(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                mock_entity_ref_resolver,
                [("embase", FSEC_UUID)],
            )

        assert exc.value.field == "entity_refs"
        mock_entity_ref_resolver.resolve.assert_not_called()
        mock_message_repository.create.assert_not_called()

    @pytest.mark.parametrize("bad_uuid", ["not-a-uuid", "", None, 12])
    def test_malformed_uuid_is_rejected(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
        bad_uuid,
    ):
        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                mock_entity_ref_resolver,
                [("fsec", bad_uuid)],
            )

        assert exc.value.field == "entity_refs"
        mock_message_repository.create.assert_not_called()

    def test_uuid_is_canonicalised(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            mock_entity_ref_resolver,
            [("fsec", FSEC_UUID.upper().replace("-", ""))],
        )

        assert result.entity_refs[0].entity_uuid == FSEC_UUID

    def test_duplicates_are_collapsed_keeping_first_position(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            mock_entity_ref_resolver,
            [
                ("fsec", FSEC_UUID),
                ("fa", FA_UUID),
                ("fsec", FSEC_UUID.upper()),
                ("fa", FA_UUID),
            ],
        )

        assert [(ref.entity_type, ref.entity_uuid) for ref in result.entity_refs] == [
            ("fsec", FSEC_UUID),
            ("fa", FA_UUID),
        ]
        mock_entity_ref_resolver.resolve.assert_called_once_with(
            [("fsec", FSEC_UUID), ("fa", FA_UUID)]
        )

    def test_same_uuid_with_two_types_is_two_refs(
        self,
        mock_conversation_repository,
        mock_message_repository,
    ):
        resolver = create_autospec(IEntityRefResolver, instance=True)
        resolver.resolve.side_effect = lambda refs: {
            key: EntityRefTargetBean(key[0], key[1], key[0].upper(), key[0])
            for key in refs
        }

        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            resolver,
            [("fsec", FSEC_UUID), ("campaign", FSEC_UUID)],
        )

        assert len(result.entity_refs) == 2

    def test_over_the_cap_is_rejected(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        refs = [
            ("fa", f"{index:08d}-0000-4000-8000-000000000000")
            for index in range(MAX_ENTITY_REFS_PER_MESSAGE + 1)
        ]

        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                mock_entity_ref_resolver,
                refs,
            )

        assert exc.value.field == "entity_refs"
        mock_entity_ref_resolver.resolve.assert_not_called()

    def test_cap_is_counted_after_deduplication(
        self,
        mock_conversation_repository,
        mock_message_repository,
    ):
        resolver = create_autospec(IEntityRefResolver, instance=True)
        resolver.resolve.side_effect = lambda refs: {
            key: EntityRefTargetBean(key[0], key[1], "FA", "fa") for key in refs
        }
        distinct = [
            ("fa", f"{index:08d}-0000-4000-8000-000000000000")
            for index in range(MAX_ENTITY_REFS_PER_MESSAGE)
        ]

        result = _post(
            mock_conversation_repository,
            mock_message_repository,
            resolver,
            distinct + [distinct[0], distinct[1]],
        )

        assert len(result.entity_refs) == MAX_ENTITY_REFS_PER_MESSAGE

    def test_unknown_target_is_rejected_with_its_key(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                mock_entity_ref_resolver,
                [("fsec", FSEC_UUID), ("fa", UNKNOWN_TARGET_UUID)],
            )

        assert exc.value.field == "entity_refs"
        assert f"fa:{UNKNOWN_TARGET_UUID}" in exc.value.message
        mock_message_repository.create.assert_not_called()

    def test_refs_without_resolver_are_unresolvable(
        self, mock_conversation_repository, mock_message_repository
    ):
        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                None,
                [("fsec", FSEC_UUID)],
            )

        assert exc.value.field == "entity_refs"

    def test_body_stays_required_with_refs(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        with pytest.raises(ValidationException) as exc:
            _post(
                mock_conversation_repository,
                mock_message_repository,
                mock_entity_ref_resolver,
                [("fsec", FSEC_UUID)],
                body="   ",
            )

        assert exc.value.field == "body"
        mock_entity_ref_resolver.resolve.assert_not_called()

    def test_non_member_is_checked_before_refs(
        self,
        mock_conversation_repository,
        mock_message_repository,
        mock_entity_ref_resolver,
    ):
        mock_conversation_repository.is_member.return_value = False

        with pytest.raises(NotFoundException):
            message_service.post_message(
                mock_conversation_repository,
                mock_message_repository,
                OUTSIDER_UUID,
                CONV_UUID,
                "Bonjour",
                entity_refs=[("embase", "x")],
                resolver=mock_entity_ref_resolver,
            )

        mock_entity_ref_resolver.resolve.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# Service : get_mentions
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestGetMentions:
    def test_delegates_with_canonical_arguments(self, mock_message_repository):
        mention = MentionBean(message=MessageBean(uuid=MSG_UUID))
        mock_message_repository.get_mentions.return_value = [mention]

        result = message_service.get_mentions(
            mock_message_repository, OWNER_UUID, "fsec", FSEC_UUID.upper()
        )

        assert result == [mention]
        mock_message_repository.get_mentions.assert_called_once_with(
            OWNER_UUID, "fsec", FSEC_UUID, MENTIONS_DEFAULT_LIMIT
        )

    def test_limit_is_forwarded(self, mock_message_repository):
        message_service.get_mentions(
            mock_message_repository, OWNER_UUID, "fa", FA_UUID, limit="7"
        )

        assert mock_message_repository.get_mentions.call_args.args[3] == 7

    def test_unknown_type_is_rejected(self, mock_message_repository):
        with pytest.raises(ValidationException) as exc:
            message_service.get_mentions(
                mock_message_repository, OWNER_UUID, "embase", FSEC_UUID
            )

        assert exc.value.field == "entity_type"
        mock_message_repository.get_mentions.assert_not_called()

    def test_malformed_uuid_is_rejected(self, mock_message_repository):
        with pytest.raises(ValidationException) as exc:
            message_service.get_mentions(
                mock_message_repository, OWNER_UUID, "fsec", "not-a-uuid"
            )

        assert exc.value.field == "entity_uuid"
        mock_message_repository.get_mentions.assert_not_called()

    @pytest.mark.parametrize("limit", [0, -1, MENTIONS_MAX_LIMIT + 1, "abc"])
    def test_out_of_range_limit_is_rejected(self, mock_message_repository, limit):
        with pytest.raises(ValidationException) as exc:
            message_service.get_mentions(
                mock_message_repository, OWNER_UUID, "campaign", CAMPAIGN_UUID, limit
            )

        assert exc.value.field == "limit"
        mock_message_repository.get_mentions.assert_not_called()

    def test_max_limit_is_accepted(self, mock_message_repository):
        message_service.get_mentions(
            mock_message_repository,
            OWNER_UUID,
            "campaign",
            CAMPAIGN_UUID,
            MENTIONS_MAX_LIMIT,
        )

        assert mock_message_repository.get_mentions.call_args.args[3] == (
            MENTIONS_MAX_LIMIT
        )


# ─────────────────────────────────────────────────────────────────────────────
# Mappers Entity ↔ Bean
# ─────────────────────────────────────────────────────────────────────────────


def _ref_entity(**kwargs) -> MessageEntityRefEntity:
    entity = MessageEntityRefEntity(
        message_id=MSG_UUID,
        entity_type=ENTITY_REF_FSEC,
        entity_uuid=FSEC_UUID,
        label="FSEC-12 (ancien nom)",
        position=2,
    )
    for key, value in kwargs.items():
        setattr(entity, key, value)
    return entity


@pytest.mark.unit
class TestEntityRefMapper:
    def test_entity_to_bean_with_target_uses_current_label_and_slug(self):
        target = KNOWN_TARGETS[("fsec", FSEC_UUID)]

        bean = entity_ref_entity_to_bean(_ref_entity(), target)

        assert bean.entity_type == ENTITY_REF_FSEC
        assert bean.entity_uuid == FSEC_UUID
        assert bean.label == "FSEC-12"
        assert bean.slug == "2026-s1-lmj-campagne-fsec-12"
        assert bean.exists is True

    def test_entity_to_bean_without_target_keeps_snapshot(self):
        bean = entity_ref_entity_to_bean(_ref_entity(), None)

        assert bean.label == "FSEC-12 (ancien nom)"
        assert bean.slug is None
        assert bean.exists is False

    def test_entity_uuid_is_rendered_canonical(self):
        import uuid as uuid_lib

        entity = _ref_entity(entity_uuid=uuid_lib.UUID(FA_UUID))

        assert entity_ref_entity_to_bean(entity, None).entity_uuid == FA_UUID

    def test_bean_to_entity(self):
        message = MessageEntity(uuid=MSG_UUID)
        bean = EntityRefBean(
            entity_type=ENTITY_REF_CAMPAIGN,
            entity_uuid=CAMPAIGN_UUID,
            label="Campagne",
            slug="2026-s1-lmj-campagne",
        )

        entity = entity_ref_bean_to_entity(bean, message, 3)

        assert entity.message is message
        assert entity.entity_type == ENTITY_REF_CAMPAIGN
        assert str(entity.entity_uuid) == CAMPAIGN_UUID
        assert entity.label == "Campagne"
        assert entity.position == 3

    def test_bean_to_entity_truncates_label(self):
        bean = EntityRefBean(
            entity_type=ENTITY_REF_FA,
            entity_uuid=FA_UUID,
            label="x" * (ENTITY_REF_LABEL_MAX_LENGTH + 20),
        )

        entity = entity_ref_bean_to_entity(bean, MessageEntity(uuid=MSG_UUID), 0)

        assert len(entity.label) == ENTITY_REF_LABEL_MAX_LENGTH

    def test_bean_to_entity_with_empty_label(self):
        entity = entity_ref_bean_to_entity(
            EntityRefBean(entity_type=ENTITY_REF_FA, entity_uuid=FA_UUID, label=None),
            MessageEntity(uuid=MSG_UUID),
            0,
        )

        assert entity.label == ""

    def test_message_entity_to_bean_receives_refs(self):
        entity = MessageEntity(uuid=MSG_UUID, conversation_id=CONV_UUID, body="x")
        entity.created_at = NOW
        entity.updated_at = NOW
        refs = [EntityRefBean(entity_type=ENTITY_REF_FA, entity_uuid=FA_UUID)]

        assert message_entity_to_bean(entity, entity_refs=refs).entity_refs == refs
        assert message_entity_to_bean(entity).entity_refs == []


# ─────────────────────────────────────────────────────────────────────────────
# Mappers API
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.unit
class TestEntityRefApiMapper:
    def test_entity_ref_bean_to_api(self):
        data = entity_ref_bean_to_api(
            EntityRefBean(
                entity_type=ENTITY_REF_FSEC,
                entity_uuid=FSEC_UUID,
                label="FSEC-12",
                slug="2026-s1-lmj-campagne-fsec-12",
                exists=True,
            )
        )

        assert data == {
            "entity_type": "fsec",
            "entity_uuid": FSEC_UUID,
            "label": "FSEC-12",
            "slug": "2026-s1-lmj-campagne-fsec-12",
            "exists": True,
        }

    def test_deleted_ref_to_api(self):
        data = entity_ref_bean_to_api(
            EntityRefBean(
                entity_type=ENTITY_REF_FA, entity_uuid=FA_UUID, label="FA", exists=False
            )
        )

        assert data["slug"] is None
        assert data["exists"] is False

    def test_message_bean_to_api_always_carries_entity_refs(self):
        assert message_bean_to_api(MessageBean(uuid=MSG_UUID))["entity_refs"] == []

        data = message_bean_to_api(
            MessageBean(
                uuid=MSG_UUID,
                entity_refs=[
                    EntityRefBean(entity_type="fa", entity_uuid=FA_UUID, label="FA"),
                    EntityRefBean(entity_type="fsec", entity_uuid=FSEC_UUID),
                ],
            )
        )

        assert [ref["entity_type"] for ref in data["entity_refs"]] == ["fa", "fsec"]
        assert data["entity_refs"][0]["label"] == "FA"

    def test_message_preview_carries_entity_ref_count_only(self):
        data = message_preview_bean_to_api(
            MessageBean(
                uuid=MSG_UUID,
                body="Voir",
                entity_refs=[
                    EntityRefBean(entity_type="fa", entity_uuid=FA_UUID),
                    EntityRefBean(entity_type="fsec", entity_uuid=FSEC_UUID),
                ],
            )
        )

        assert data["entity_ref_count"] == 2
        assert "entity_refs" not in data
        assert message_preview_bean_to_api(MessageBean())["entity_ref_count"] == 0

    def test_mention_bean_to_api(self):
        member = UserSummaryBean(uuid=OWNER_UUID, username="mdupont")
        bean = MentionBean(
            message=MessageBean(
                uuid=MSG_UUID,
                conversation_uuid=CONV_UUID,
                body="Voir cette FSEC",
                created_at=NOW,
                entity_refs=[
                    EntityRefBean(
                        entity_type="fsec", entity_uuid=FSEC_UUID, label="FSEC-12"
                    )
                ],
            ),
            conversation_uuid=CONV_UUID,
            conversation_kind=KIND_GROUP,
            conversation_name="Campagne S2",
            conversation_members=[member],
        )

        data = mention_bean_to_api(bean)

        assert data["message"]["uuid"] == MSG_UUID
        assert data["message"]["created_at"] == NOW.isoformat()
        assert data["message"]["entity_refs"][0]["label"] == "FSEC-12"
        assert data["conversation"] == {
            "uuid": CONV_UUID,
            "kind": KIND_GROUP,
            "name": "Campagne S2",
            "members": [
                {
                    "uuid": OWNER_UUID,
                    "username": "mdupont",
                    "first_name": "",
                    "last_name": "",
                    "avatar_url": None,
                    "is_active": True,
                }
            ],
        }

    def test_mention_beans_to_api(self):
        data = mention_beans_to_api(
            [
                MentionBean(message=MessageBean(uuid=MSG_UUID)),
                MentionBean(message=MessageBean(uuid=CONV_UUID)),
            ]
        )

        assert [item["message"]["uuid"] for item in data] == [MSG_UUID, CONV_UUID]

    def test_entity_refs_api_to_tuples(self):
        import uuid as uuid_lib

        payload = {
            "body": "x",
            "entity_refs": [
                {"entity_type": "fsec", "entity_uuid": uuid_lib.UUID(FSEC_UUID)},
                {"entity_type": "fa", "entity_uuid": FA_UUID},
            ],
        }

        assert entity_refs_api_to_tuples(payload) == [
            ("fsec", FSEC_UUID),
            ("fa", FA_UUID),
        ]

    @pytest.mark.parametrize(
        "payload", [{}, {"entity_refs": None}, {"entity_refs": []}]
    )
    def test_entity_refs_api_to_tuples_without_refs(self, payload):
        assert entity_refs_api_to_tuples(payload) == []

    def test_entity_refs_api_to_tuples_tolerates_missing_keys(self):
        assert entity_refs_api_to_tuples({"entity_refs": [{}]}) == [("", "")]
