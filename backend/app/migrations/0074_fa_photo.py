"""Crée la table FA_PHOTO : galerie de photos rattachées à une FA (phase Ouvert).

FK CASCADE vers FA : supprimer une FA supprime ses photos (les fichiers disque
sont purgés par FaRepository.delete avant la suppression).
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0073_fa_hard_delete"),
    ]

    operations = [
        migrations.CreateModel(
            name="FaPhotoEntity",
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
                    "image",
                    models.ImageField(max_length=500, upload_to="fa/photos/"),
                ),
                (
                    "caption",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "fa",
                    models.ForeignKey(
                        db_column="fa_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="app.faentity",
                    ),
                ),
            ],
            options={
                "db_table": "FA_PHOTO",
                "ordering": ["order", "created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="faphotoentity",
            index=models.Index(fields=["fa", "order"], name="fa_photo_fa_idx"),
        ),
    ]
