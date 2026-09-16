"""Migration initiale du module Matériel — 6 tables + seed des salles.

Tables créées :
- MACHINE_ROOM            : référentiel des salles (B1, B2, A13)
- EQUIPMENT               : référentiel d'équipements liables aux machines
- MACHINE                 : parc machines rattaché à une salle
- MACHINE_LINK            : liens documentaires (procédures, doc) — ordonnables
- MACHINE_EQUIPMENT       : table de jointure N-N machine ↔ équipement
- MACHINE_MAINTENANCE     : historique des interventions de maintenance

Le seed des 3 salles (B1, B2, A13) est appliqué via RunPython.
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models

ROOMS_SEED = [
    {"code": "B1", "label": "Salle B1", "color": "#1976D2", "sort_order": 10},
    {"code": "B2", "label": "Salle B2", "color": "#9C27B0", "sort_order": 20},
    {"code": "A13", "label": "Salle A13", "color": "#388E3C", "sort_order": 30},
]


def seed_rooms(apps, schema_editor):
    """Seed des 3 salles connues. Idempotent : on update si déjà présent."""
    Room = apps.get_model("app", "MachineRoomEntity")
    for data in ROOMS_SEED:
        Room.objects.update_or_create(
            code=data["code"],
            defaults={
                "label": data["label"],
                "color": data["color"],
                "sort_order": data["sort_order"],
            },
        )


def unseed_rooms(apps, schema_editor):
    """Reverse : on supprime uniquement les salles seedées (idempotent)."""
    Room = apps.get_model("app", "MachineRoomEntity")
    codes = [data["code"] for data in ROOMS_SEED]
    Room.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0061_backfill_airtightness_phase_for_permeation_fsecs"),
    ]

    operations = [
        # ------------------------------------------------------------------
        # 1. MACHINE_ROOM — référentiel des salles
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="MachineRoomEntity",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("code", models.CharField(max_length=10, unique=True)),
                ("label", models.CharField(max_length=100)),
                ("color", models.CharField(blank=True, default="", max_length=20)),
                ("sort_order", models.IntegerField(default=0)),
            ],
            options={
                "db_table": "MACHINE_ROOM",
                "ordering": ["sort_order", "code"],
            },
        ),
        # ------------------------------------------------------------------
        # 2. EQUIPMENT — référentiel d'équipements
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="EquipmentEntity",
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
                ("name", models.CharField(max_length=200, unique=True)),
                ("reference", models.CharField(blank=True, default="", max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "EQUIPMENT",
                "ordering": ["name"],
            },
        ),
        # ------------------------------------------------------------------
        # 3. MACHINE — parc machines
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="MachineEntity",
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
                ("name", models.CharField(max_length=200)),
                ("reference", models.CharField(blank=True, default="", max_length=200)),
                (
                    "manufacturer",
                    models.CharField(blank=True, default="", max_length=200),
                ),
                ("model", models.CharField(blank=True, default="", max_length=200)),
                ("commissioning_date", models.DateField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("in_service", "En service"),
                            ("out_of_service", "Hors service"),
                            ("under_maintenance", "En maintenance"),
                        ],
                        default="in_service",
                        max_length=30,
                    ),
                ),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        db_column="room_id",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="machines",
                        to="app.machineroomentity",
                    ),
                ),
                (
                    "responsible_user",
                    models.ForeignKey(
                        blank=True,
                        db_column="responsible_user_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "MACHINE",
                "ordering": ["room__sort_order", "name"],
                "indexes": [
                    models.Index(fields=["room"], name="machine_room_idx"),
                    models.Index(fields=["status"], name="machine_status_idx"),
                ],
            },
        ),
        # ------------------------------------------------------------------
        # 4. MACHINE_LINK — liens documentaires ordonnables
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="MachineLinkEntity",
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
                ("label", models.CharField(max_length=200)),
                ("url", models.TextField()),
                ("position", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "machine",
                    models.ForeignKey(
                        db_column="machine_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="links",
                        to="app.machineentity",
                    ),
                ),
            ],
            options={
                "db_table": "MACHINE_LINK",
                "ordering": ["position", "created_at"],
                "indexes": [
                    models.Index(
                        fields=["machine", "position"], name="machine_link_pos_idx"
                    ),
                ],
            },
        ),
        # ------------------------------------------------------------------
        # 5. MACHINE_EQUIPMENT — jointure N-N
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="MachineEquipmentEntity",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "machine",
                    models.ForeignKey(
                        db_column="machine_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="machine_equipments",
                        to="app.machineentity",
                    ),
                ),
                (
                    "equipment",
                    models.ForeignKey(
                        db_column="equipment_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="machine_equipments",
                        to="app.equipmententity",
                    ),
                ),
            ],
            options={
                "db_table": "MACHINE_EQUIPMENT",
                "indexes": [
                    models.Index(fields=["machine"], name="machine_eq_machine_idx"),
                    models.Index(fields=["equipment"], name="machine_eq_equipment_idx"),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=["machine", "equipment"],
                        name="uq_machine_equipment",
                    ),
                ],
            },
        ),
        # ------------------------------------------------------------------
        # 6. MACHINE_MAINTENANCE — historique des interventions
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="MachineMaintenanceEntity",
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
                ("date", models.DateField()),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("preventive", "Préventive"),
                            ("curative", "Curative"),
                        ],
                        default="preventive",
                        max_length=20,
                    ),
                ),
                (
                    "performed_by_name",
                    models.CharField(blank=True, default="", max_length=100),
                ),
                ("description", models.TextField(blank=True, default="")),
                ("next_maintenance_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "machine",
                    models.ForeignKey(
                        db_column="machine_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="maintenances",
                        to="app.machineentity",
                    ),
                ),
                (
                    "performed_by_user",
                    models.ForeignKey(
                        blank=True,
                        db_column="performed_by_user_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "MACHINE_MAINTENANCE",
                "ordering": ["-date", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["machine", "-date"], name="maint_machine_date_idx"
                    ),
                    models.Index(
                        fields=["next_maintenance_date"], name="maint_next_date_idx"
                    ),
                ],
            },
        ),
        # ------------------------------------------------------------------
        # 7. Seed des 3 salles (B1, B2, A13)
        # ------------------------------------------------------------------
        migrations.RunPython(seed_rooms, unseed_rooms),
    ]
