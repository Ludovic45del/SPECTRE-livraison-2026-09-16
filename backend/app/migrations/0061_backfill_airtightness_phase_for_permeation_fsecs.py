"""Backfill : reclasse en phase='HP' les AirtightnessTestLp rattachés à une FSEC
de catégorie 4 (Perméation + HP).

Pour les FSEC cat 4, le test d'étanchéité concerne uniquement la phase HP
(la perméation est une mise sous haute pression). Cette migration corrige
les records existants créés avant la séparation BP/HP.
"""

from django.db import migrations


def reclasse_phase_hp_pour_cat_4(apps, schema_editor):
    AirtightnessTestLpStepEntity = apps.get_model("app", "AirtightnessTestLpStepEntity")
    FsecEntity = apps.get_model("app", "FsecEntity")

    fsec_version_uuids_cat_4 = list(
        FsecEntity.objects.filter(category_id_id=4).values_list(
            "version_uuid", flat=True
        )
    )
    if not fsec_version_uuids_cat_4:
        return

    AirtightnessTestLpStepEntity.objects.filter(
        fsec_version_id_id__in=fsec_version_uuids_cat_4
    ).update(phase="HP")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0060_backfill_airtightness_phase_for_hp_fsecs"),
    ]

    operations = [
        migrations.RunPython(reclasse_phase_hp_pour_cat_4, reverse_code=noop_reverse),
    ]
