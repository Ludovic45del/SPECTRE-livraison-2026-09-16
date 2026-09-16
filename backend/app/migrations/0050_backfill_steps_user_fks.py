"""Data migration : backfill des FK *_user sur les steps a partir des CharField legacy.

Pour chaque step ayant un texte (operator/metrologist_name) sans FK, on tente
un matching via app.migrations._user_lookup_helper.match_user_profile :
- match exact sur username
- match "first_name last_name"
- match initiale + nom
- ambiguite -> NULL (a corriger ensuite via l'UI)

Idempotente : skip si la FK est deja renseignee.
"""

from django.db import migrations

from app.migrations._user_lookup_helper import match_user_profile

# (entity_label, text_field, fk_field) — un tuple par step a backfiller.
TARGETS = [
    ("PicturesStepEntity", "operator", "operator_user_id"),
    ("AirtightnessTestLpStepEntity", "operator", "operator_user_id"),
    ("GasFillingBpStepEntity", "operator", "operator_user_id"),
    ("GasFillingHpStepEntity", "operator", "operator_user_id"),
    ("PermeationStepEntity", "operator", "operator_user_id"),
    ("DepressurizationStepEntity", "operator", "operator_user_id"),
    ("RepressurizationStepEntity", "operator", "operator_user_id"),
    ("MetrologyStepEntity", "metrologist_name", "metrologist_user_id"),
    ("MetrologyStepEntity", "operator", "operator_user_id"),
    ("SealingStepEntity", "metrologist_name", "metrologist_user_id"),
    ("AssemblyStepEntity", "operator", "operator_user_id"),
]


def _backfill_one(apps, entity_label, text_field, fk_field):
    Model = apps.get_model("app", entity_label)
    rows = Model.objects.exclude(**{f"{text_field}__isnull": True}).exclude(
        **{text_field: ""}
    )
    rows = rows.filter(**{f"{fk_field}__isnull": True})
    for row in rows.iterator(chunk_size=500):
        raw = getattr(row, text_field)
        matched_uuid = match_user_profile(apps, raw)
        if matched_uuid:
            setattr(row, fk_field, matched_uuid)
            row.save(update_fields=[fk_field])


def forwards(apps, schema_editor):
    for entity_label, text_field, fk_field in TARGETS:
        _backfill_one(apps, entity_label, text_field, fk_field)


def reverse(apps, schema_editor):
    """Reverse : remet les FK a NULL (le CharField legacy reste).

    On ne supprime que ce que la forward a pose : safe, idempotent.
    """
    for entity_label, _text_field, fk_field in TARGETS:
        Model = apps.get_model("app", entity_label)
        Model.objects.exclude(**{f"{fk_field}__isnull": True}).update(
            **{fk_field: None}
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0049_steps_add_user_fks"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
