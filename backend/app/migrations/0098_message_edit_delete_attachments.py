"""Messagerie interne (vague M4) : édition, suppression logique et pièces jointes.

Modifications :
- MESSAGE            : `edited_at` (dernière édition du corps), `deleted_at`
                       (suppression logique : la ligne subsiste, corps vidé) et
                       index (conversation, updated_at) pour le polling
                       `updated_since`.
- MESSAGE_ATTACHMENT : pièce jointe d'un message — fichier sous MEDIA_ROOT à un
                       chemin non devinable (messaging/attachments/<hex>/<nom>),
                       nom d'origine, type MIME, taille, position d'insertion.
                       Cascade depuis le message.
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models

import app.repository.messaging.models.message_attachment_entity


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0097_message_entity_refs"),
    ]

    operations = [
        migrations.AddField(
            model_name="messageentity",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="messageentity",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="messageentity",
            index=models.Index(
                fields=["conversation", "updated_at"], name="message_conv_updated_idx"
            ),
        ),
        migrations.CreateModel(
            name="MessageAttachmentEntity",
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
                    "file",
                    models.FileField(
                        max_length=500,
                        upload_to=app.repository.messaging.models.message_attachment_entity.message_attachment_upload_to,
                    ),
                ),
                ("original_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(max_length=150)),
                ("size", models.PositiveIntegerField()),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "message",
                    models.ForeignKey(
                        db_column="message_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="attachments",
                        to="app.messageentity",
                    ),
                ),
            ],
            options={
                "db_table": "MESSAGE_ATTACHMENT",
                "ordering": ["position", "created_at"],
            },
        ),
    ]
