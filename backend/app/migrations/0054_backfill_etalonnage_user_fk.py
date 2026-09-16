"""Data migration : backfill EtalonnageEntity.operateur_user_id depuis operateur (texte)."""

from django.db import migrations

from app.migrations._user_lookup_helper import match_user_profile


def forwards(apps, schema_editor):
    Etalonnage = apps.get_model("app", "EtalonnageEntity")
    rows = Etalonnage.objects.exclude(operateur="").filter(operateur_user__isnull=True)
    for row in rows.iterator(chunk_size=500):
        matched_uuid = match_user_profile(apps, row.operateur)
        if matched_uuid:
            row.operateur_user_id = matched_uuid
            row.save(update_fields=["operateur_user"])


def reverse(apps, schema_editor):
    Etalonnage = apps.get_model("app", "EtalonnageEntity")
    Etalonnage.objects.exclude(operateur_user__isnull=True).update(operateur_user=None)


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0053_etalonnage_add_user_fk"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
