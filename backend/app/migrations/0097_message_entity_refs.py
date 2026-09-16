"""Messagerie interne (vague M3) : références d'entités attachées aux messages.

Table créée :
- MESSAGE_ENTITY_REF : référence structurée (FSEC par fsec_uuid, campagne ou FA
                       par uuid) d'un message, avec instantané du libellé et
                       position d'insertion. Sans clé étrangère vers la cible
                       (trois tables possibles, entité supprimable) ; unicité
                       (message, type, uuid) et index sur la cible pour la
                       route `mentions/`.
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0096_messaging_module"),
    ]

    operations = [
        migrations.CreateModel(
            name="MessageEntityRefEntity",
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
                    "entity_type",
                    models.CharField(
                        choices=[
                            ("fsec", "FSEC"),
                            ("campaign", "Campagne"),
                            ("fa", "FA"),
                        ],
                        max_length=20,
                    ),
                ),
                ("entity_uuid", models.UUIDField()),
                ("label", models.CharField(max_length=150)),
                ("position", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "message",
                    models.ForeignKey(
                        db_column="message_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="entity_refs",
                        to="app.messageentity",
                    ),
                ),
            ],
            options={
                "db_table": "MESSAGE_ENTITY_REF",
                "ordering": ["position", "created_at"],
                "indexes": [
                    models.Index(
                        fields=["entity_type", "entity_uuid"],
                        name="message_entity_ref_target_idx",
                    )
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=("message", "entity_type", "entity_uuid"),
                        name="message_entity_ref_unique",
                    )
                ],
            },
        ),
    ]
