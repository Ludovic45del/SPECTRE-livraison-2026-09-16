"""Annuaire des laboratoires (retour R07).

Table créée :
- LAB_CONTACT : numéros utiles partagés (nom, téléphone libre, commentaire),
  éditables par toute l'équipe depuis « Équipe et Carte › Annuaire des labos ».

Aucun seed : la liste part vide, les contacts sont saisis par les utilisateurs.
"""

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0093_dedupe_fa_identifiers"),
    ]

    operations = [
        migrations.CreateModel(
            name="LabContactEntity",
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
                ("name", models.CharField(max_length=150)),
                ("phone", models.CharField(blank=True, default="", max_length=30)),
                ("comment", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "LAB_CONTACT",
                "ordering": ["name"],
            },
        ),
    ]
