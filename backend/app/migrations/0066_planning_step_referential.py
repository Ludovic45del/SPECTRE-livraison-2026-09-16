"""Cree le referentiel PLANNING_STEP et seed les 6 etapes par defaut."""

from django.db import migrations, models

# Etapes par defaut - reprennent la constante ETAPES historiquement codee en dur.
PLANNING_STEPS = [
    {
        "label": "Réception cibles",
        "color": "#C47A9A",
        "display_order": 0,
        "min_status_for_done": 1,
        "use_shooting_date": False,
        "gas_only": False,
    },
    {
        "label": "Assemblage",
        "color": "#5B7FC7",
        "display_order": 1,
        "min_status_for_done": 2,
        "use_shooting_date": False,
        "gas_only": False,
    },
    {
        "label": "Métrologie",
        "color": "#4BAFB5",
        "display_order": 2,
        "min_status_for_done": 3,
        "use_shooting_date": False,
        "gas_only": False,
    },
    {
        "label": "Gaz",
        "color": "#8b5cf6",
        "display_order": 3,
        "min_status_for_done": 5,
        "use_shooting_date": False,
        "gas_only": True,
    },
    {
        "label": "Livraison",
        "color": "#C4A035",
        "display_order": 4,
        "min_status_for_done": 6,
        "use_shooting_date": False,
        "gas_only": False,
    },
    {
        "label": "Tir",
        "color": "#D4915C",
        "display_order": 5,
        "min_status_for_done": 7,
        "use_shooting_date": False,
        "gas_only": False,
    },
]


def seed_planning_steps(apps, schema_editor):
    """Seed les etapes par defaut (ids auto-assignes, sequence coherente)."""
    PlanningStepEntity = apps.get_model("app", "PlanningStepEntity")
    if PlanningStepEntity.objects.exists():
        return
    for step in PLANNING_STEPS:
        PlanningStepEntity.objects.create(**step)


def reverse_seed_planning_steps(apps, schema_editor):
    """Supprime les etapes seedees."""
    PlanningStepEntity = apps.get_model("app", "PlanningStepEntity")
    PlanningStepEntity.objects.filter(
        label__in=[s["label"] for s in PLANNING_STEPS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0065_planning_lab_uses_material_machines"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlanningStepEntity",
            fields=[
                ("id", models.AutoField(primary_key=True, serialize=False)),
                ("label", models.CharField(max_length=50, unique=True)),
                ("color", models.CharField(max_length=40)),
                ("display_order", models.IntegerField(default=0)),
                ("min_status_for_done", models.IntegerField(blank=True, null=True)),
                ("use_shooting_date", models.BooleanField(default=False)),
                ("gas_only", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "PLANNING_STEP",
                "ordering": ["display_order"],
            },
        ),
        migrations.RunPython(seed_planning_steps, reverse_seed_planning_steps),
    ]
