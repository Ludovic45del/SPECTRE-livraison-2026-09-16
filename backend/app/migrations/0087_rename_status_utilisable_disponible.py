"""Data migration : renommage du statut FSEC id 5 « Utilisable » → « Disponible ».

Seul le LIBELLÉ change : l'id 5 (valeur stockée sur les FSEC via la FK
status_id) et la clé technique `usable` côté frontend sont conservés.

Hygiène embarquée : correction de la couleur invalide '#FF00009' (7 hexdigits,
présente sur les ids 8 et 9 du seed historique) vers '#FF0000'.

Articulation avec le seed `initdb` (cf. database_util.insert_csv_into_table,
seed idempotent au niveau table) :
- Base FRAÎCHE : au moment des migrations la table FSEC_STATUS est vide, les
  `filter(...)` ne matchent rien et `initdb` posera ensuite le référentiel
  depuis le CSV déjà corrigé. On ne touche à rien.
- Base EXISTANTE : le libellé de l'id 5 et les couleurs invalides sont mis à
  jour en place, de façon idempotente.

Réversible : le reverse restaure « Utilisable » et la couleur historique
'#FF00009' sur les seuls ids 8 et 9 (les ids 10-14 portent légitimement
'#FF0000' et ne sont pas touchés).
"""

from django.db import migrations

STATUS_DISPONIBLE_ID = 5
OLD_LABEL = "Utilisable"
NEW_LABEL = "Disponible"

INVALID_COLOR = "#FF00009"
FIXED_COLOR = "#FF0000"
# Seuls les ids 8 (HS) et 9 (Remplissage HP) portaient la couleur invalide.
INVALID_COLOR_IDS = [8, 9]


def forwards(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    FsecStatus.objects.filter(id=STATUS_DISPONIBLE_ID, label=OLD_LABEL).update(
        label=NEW_LABEL
    )
    FsecStatus.objects.filter(color=INVALID_COLOR).update(color=FIXED_COLOR)


def reverse(apps, schema_editor):
    FsecStatus = apps.get_model("app", "FsecStatusEntity")
    FsecStatus.objects.filter(id=STATUS_DISPONIBLE_ID, label=NEW_LABEL).update(
        label=OLD_LABEL
    )
    FsecStatus.objects.filter(id__in=INVALID_COLOR_IDS, color=FIXED_COLOR).update(
        color=INVALID_COLOR
    )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0086_tasklist_module"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
