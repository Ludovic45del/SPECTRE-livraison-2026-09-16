"""Migration pour créer les tables FA (Fiche d'Anomalie)."""

import uuid

import django.db.models.deletion
from django.db import migrations, models


def seed_fa_status(apps, schema_editor):
    """Seed des statuts FA."""
    FaStatusEntity = apps.get_model("app", "FaStatusEntity")
    statuses = [
        {"id": 0, "label": "Ouvert", "color": "#FFA726"},
        {"id": 1, "label": "En cours", "color": "#42A5F5"},
        {"id": 2, "label": "Clos", "color": "#66BB6A"},
    ]
    for status in statuses:
        FaStatusEntity.objects.create(**status)


def seed_fa_type(apps, schema_editor):
    """Seed des types 5M."""
    FaTypeEntity = apps.get_model("app", "FaTypeEntity")
    types = [
        {"id": 0, "label": "Moyen", "color": "#9C27B0"},
        {"id": 1, "label": "Main d'œuvre", "color": "#3F51B5"},
        {"id": 2, "label": "Matière", "color": "#00BCD4"},
        {"id": 3, "label": "Milieu", "color": "#009688"},
        {"id": 4, "label": "Méthode", "color": "#795548"},
    ]
    for t in types:
        FaTypeEntity.objects.create(**t)


def seed_fa_criticality(apps, schema_editor):
    """Seed des niveaux de criticité."""
    FaCriticalityEntity = apps.get_model("app", "FaCriticalityEntity")
    criticalities = [
        {"id": 0, "label": "Niveau 0", "color": "#4CAF50"},
        {"id": 1, "label": "Niveau 1", "color": "#8BC34A"},
        {"id": 2, "label": "Niveau 2", "color": "#FF9800"},
        {"id": 3, "label": "Niveau 3", "color": "#F44336"},
    ]
    for c in criticalities:
        FaCriticalityEntity.objects.create(**c)


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0012_pictures_step_photo_view"),
    ]

    operations = [
        # Création des tables de référence
        migrations.CreateModel(
            name="FaStatusEntity",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=40)),
                ("color", models.CharField(max_length=40)),
            ],
            options={
                "db_table": "FA_STATUS",
            },
        ),
        migrations.CreateModel(
            name="FaTypeEntity",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=40)),
                ("color", models.CharField(max_length=40)),
            ],
            options={
                "db_table": "FA_TYPE",
            },
        ),
        migrations.CreateModel(
            name="FaCriticalityEntity",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=40)),
                ("color", models.CharField(max_length=40)),
            ],
            options={
                "db_table": "FA_CRITICALITY",
            },
        ),
        # Création de la table principale FA
        migrations.CreateModel(
            name="FaEntity",
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
                ("identifier", models.CharField(max_length=100, unique=True)),
                # Phase Ouvert
                ("discoverer", models.CharField(max_length=100)),
                ("event_date", models.DateField()),
                ("observation", models.TextField()),
                (
                    "location_equipment",
                    models.CharField(blank=True, max_length=255, null=True),
                ),
                ("quick_analysis", models.TextField()),
                ("immediate_measures", models.TextField(blank=True, null=True)),
                ("iec_validation_open", models.BooleanField(default=False)),
                ("iec_validation_open_date", models.DateField(blank=True, null=True)),
                (
                    "iec_validation_open_name",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                # Phase En cours
                ("cause", models.TextField(blank=True, null=True)),
                ("experience_impact", models.TextField(blank=True, null=True)),
                ("iec_validation_progress", models.BooleanField(default=False)),
                (
                    "iec_validation_progress_date",
                    models.DateField(blank=True, null=True),
                ),
                (
                    "iec_validation_progress_name",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                # Phase Clos
                ("closure_validation", models.TextField(blank=True, null=True)),
                ("closure_date", models.DateField(blank=True, null=True)),
                (
                    "closure_validator_name",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                # Metadata
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_updated", models.DateTimeField(auto_now=True)),
                # Foreign Keys
                (
                    "fsec_version_id",
                    models.OneToOneField(
                        db_column="fsec_version_id",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fa",
                        to="app.fsecentity",
                        to_field="version_uuid",
                    ),
                ),
                (
                    "status_id",
                    models.ForeignKey(
                        db_column="status_id",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fas",
                        to="app.fastatusentity",
                    ),
                ),
                (
                    "type_id",
                    models.ForeignKey(
                        blank=True,
                        db_column="type_id",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fas",
                        to="app.fatypeentity",
                    ),
                ),
                (
                    "criticality_id",
                    models.ForeignKey(
                        blank=True,
                        db_column="criticality_id",
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fas",
                        to="app.facriticalityentity",
                    ),
                ),
            ],
            options={
                "db_table": "FA",
            },
        ),
        # Index pour optimiser les requêtes par FSEC
        migrations.AddIndex(
            model_name="faentity",
            index=models.Index(fields=["fsec_version_id"], name="fa_fsec_idx"),
        ),
        # Seed des données de référence
        migrations.RunPython(seed_fa_status, migrations.RunPython.noop),
        migrations.RunPython(seed_fa_type, migrations.RunPython.noop),
        migrations.RunPython(seed_fa_criticality, migrations.RunPython.noop),
    ]
