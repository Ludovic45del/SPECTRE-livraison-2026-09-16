"""Data migration : backfill des FK *_user sur FaEntity a partir des CharField legacy.

Idempotente : skip les lignes ou la FK est deja renseignee.
"""

from django.db import migrations

from app.migrations._user_lookup_helper import match_user_profile

# Format: (text_field_name, fk_field_name)
FA_TARGETS = [
    ("discoverer", "discoverer_user_id"),
    ("iec_validation_open_name", "iec_validation_open_user_id"),
    ("iec_validation_progress_name", "iec_validation_progress_user_id"),
    ("closure_validator_name", "closure_validator_user_id"),
]


def forwards(apps, schema_editor):
    FaEntity = apps.get_model("app", "FaEntity")
    for text_field, fk_field in FA_TARGETS:
        rows = (
            FaEntity.objects.exclude(**{f"{text_field}__isnull": True})
            .exclude(**{text_field: ""})
            .filter(**{f"{fk_field}__isnull": True})
        )
        for row in rows.iterator(chunk_size=500):
            raw = getattr(row, text_field)
            matched_uuid = match_user_profile(apps, raw)
            if matched_uuid:
                setattr(row, fk_field, matched_uuid)
                row.save(update_fields=[fk_field])


def reverse(apps, schema_editor):
    FaEntity = apps.get_model("app", "FaEntity")
    for _text_field, fk_field in FA_TARGETS:
        FaEntity.objects.exclude(**{f"{fk_field}__isnull": True}).update(
            **{fk_field: None}
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0051_fa_add_user_fks"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
