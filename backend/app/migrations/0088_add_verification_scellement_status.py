"""Data migration : ajout du statut FSEC « Vérification scellement » (id 16).

Nouvelle étape de la ligne de suivi, insérée dans l'ordre d'AFFICHAGE juste
après « En attente de scellement » (id 3) pour toutes les catégories — l'ordre
vit uniquement côté frontend (WORKFLOW_SEQUENCES) : aucun id existant n'est
renuméroté, on AJOUTE simplement une ligne au référentiel (même mécanisme que
« Décision MOE », id 15, migration 0084).

Articulation avec le seed `initdb` (cf. database_util.insert_csv_into_table,
seed idempotent au niveau table) :
- Base FRAÎCHE : au moment des migrations la table FSEC_STATUS est vide. Le
  garde `exists()` ci-dessous laisse alors `initdb` poser les 17 lignes depuis
  le CSV (qui contient désormais l'id 16). On ne touche à rien.
- Base EXISTANTE : `initdb` a déjà sauté FSEC_STATUS (table peuplée). On
  ajoute ici la seule ligne manquante, de façon idempotente.

Réversible : le reverse supprime uniquement l'id 16 (la FK PROTECT sur
FsecEntity.status fera échouer le reverse si des FSEC l'utilisent — voulu).
"""

from django.db import migrations

VERIFICATION_SCELLEMENT_ID = 16
VERIFICATION_SCELLEMENT_LABEL = "Vérification scellement"
VERIFICATION_SCELLEMENT_COLOR = "#7cb342"


def forwards(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    # Base fraîche : laisser initdb seeder l'intégralité du référentiel via CSV.
    if not FsecStatus.objects.exists():
        return
    FsecStatus.objects.get_or_create(
        id=VERIFICATION_SCELLEMENT_ID,
        defaults={
            "label": VERIFICATION_SCELLEMENT_LABEL,
            "color": VERIFICATION_SCELLEMENT_COLOR,
        },
    )


def reverse(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    FsecStatus.objects.filter(id=VERIFICATION_SCELLEMENT_ID).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0087_rename_status_utilisable_disponible"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
