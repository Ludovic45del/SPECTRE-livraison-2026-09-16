"""Data migration : ajout du statut FSEC « Décision MOE » (id 15).

Nouveau statut de mise en pause de l'avancement (au même titre que « HS »,
id 8) : il fige la progression du workflow le temps d'une décision de la
maîtrise d'œuvre.

Articulation avec le seed `initdb` (cf. database_util.insert_csv_into_table,
seed idempotent au niveau table) :
- Base FRAÎCHE : au moment des migrations la table FSEC_STATUS est vide. Le
  garde `exists()` ci-dessous laisse alors `initdb` poser les 16 lignes depuis
  le CSV (qui contient désormais l'id 15). On ne touche à rien.
- Base EXISTANTE : `initdb` a déjà sauté FSEC_STATUS (table peuplée 0..14). On
  ajoute ici la seule ligne manquante, de façon idempotente.

Réversible : le reverse supprime uniquement l'id 15.
"""

from django.db import migrations

DECISION_MOE_ID = 15
DECISION_MOE_LABEL = "Décision MOE"
DECISION_MOE_COLOR = "#64748b"


def forwards(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    # Base fraîche : laisser initdb seeder l'intégralité du référentiel via CSV.
    if not FsecStatus.objects.exists():
        return
    FsecStatus.objects.get_or_create(
        id=DECISION_MOE_ID,
        defaults={"label": DECISION_MOE_LABEL, "color": DECISION_MOE_COLOR},
    )


def reverse(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    FsecStatus.objects.filter(id=DECISION_MOE_ID).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0083_stock_element_fsec_name"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
