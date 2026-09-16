"""Backfill : reclasse en phase='HP' les AirtightnessTestLp rattachés à une FSEC
de catégorie 2 (Gaz HP uniquement).

Pour les FSEC cat 2, le test d'étanchéité concerne le remplissage HP.
Migration de données pour préserver l'affichage des données existantes
créées avant l'introduction du discriminant `phase`.

Pour les FSEC cat 3 (BP+HP), on ne peut pas deviner la phase à partir
des données existantes ; on laisse en 'BP' par défaut. Idem pour cat 1
et cat 4 (déjà BP).
"""

from django.db import migrations


def reclasse_phase_hp_pour_cat_2(apps, schema_editor):
    AirtightnessTestLpStepEntity = apps.get_model("app", "AirtightnessTestLpStepEntity")
    FsecEntity = apps.get_model("app", "FsecEntity")

    fsec_version_uuids_cat_2 = list(
        FsecEntity.objects.filter(category_id_id=2).values_list(
            "version_uuid", flat=True
        )
    )
    if not fsec_version_uuids_cat_2:
        return

    AirtightnessTestLpStepEntity.objects.filter(
        fsec_version_id_id__in=fsec_version_uuids_cat_2
    ).update(phase="HP")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0059_add_phase_to_airtightness_test_lp"),
    ]

    operations = [
        migrations.RunPython(reclasse_phase_hp_pour_cat_2, reverse_code=noop_reverse),
    ]
