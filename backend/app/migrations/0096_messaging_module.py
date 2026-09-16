"""Module Messagerie interne (vague M1).

Tables créées :
- CONVERSATION        : fils de discussion privés (direct) et de groupe
                        (propriétaire, nom, clé d'unicité direct_key,
                        date du dernier message dénormalisée)
- CONVERSATION_MEMBER : adhésions (unicité conversation/membre, curseur de
                        lecture last_read_at, date d'adhésion joined_at)
- MESSAGE             : messages texte et messages système d'une conversation
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0095_fsec_requested_views"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConversationEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[("direct", "Privée"), ("group", "Groupe")],
                        max_length=20,
                    ),
                ),
                ("name", models.CharField(blank=True, default="", max_length=120)),
                (
                    "direct_key",
                    models.CharField(blank=True, max_length=73, null=True, unique=True),
                ),
                ("last_message_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        db_column="owner_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "CONVERSATION",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ConversationMemberEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("last_read_at", models.DateTimeField(blank=True, null=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                (
                    "conversation",
                    models.ForeignKey(
                        db_column="conversation_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="app.conversationentity",
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        db_column="member_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "CONVERSATION_MEMBER",
                "ordering": ["joined_at", "member_id"],
            },
        ),
        migrations.CreateModel(
            name="MessageEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[("text", "Texte"), ("system", "Système")],
                        default="text",
                        max_length=20,
                    ),
                ),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        db_column="author_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
                (
                    "conversation",
                    models.ForeignKey(
                        db_column="conversation_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="app.conversationentity",
                    ),
                ),
            ],
            options={
                "db_table": "MESSAGE",
                "ordering": ["created_at", "uuid"],
            },
        ),
        migrations.AddIndex(
            model_name="conversationentity",
            index=models.Index(fields=["owner"], name="conversation_owner_idx"),
        ),
        migrations.AddIndex(
            model_name="conversationentity",
            index=models.Index(
                fields=["last_message_at"], name="conversation_last_msg_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="conversationmemberentity",
            index=models.Index(
                fields=["member"], name="conversation_member_member_idx"
            ),
        ),
        migrations.AddConstraint(
            model_name="conversationmemberentity",
            constraint=models.UniqueConstraint(
                fields=("conversation", "member"), name="conversation_member_unique"
            ),
        ),
        migrations.AddIndex(
            model_name="messageentity",
            index=models.Index(
                fields=["conversation", "created_at"], name="message_conv_created_idx"
            ),
        ),
    ]
