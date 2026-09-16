"""Permet plusieurs FA par FSEC (OneToOneField → ForeignKey).

- Modifie le champ fsec_version_id du modèle FA pour autoriser plusieurs FA
  par FSEC (suppression de la contrainte UNIQUE sur la colonne).
- Suffixe les identifiers existants avec _01 pour rester cohérent avec le
  nouveau format FA_<year>_<campaign>_<fsec>_<seq>.
"""

from django.db import migrations, models


def add_sequence_suffix_to_existing_identifiers(apps, schema_editor):
    """Suffixe les identifiers existants : FA_2026_X_1 → FA_2026_X_1_01."""
    FaEntity = apps.get_model("app", "FaEntity")
    for fa in FaEntity.objects.all():
        if fa.identifier and not _has_sequence_suffix(fa.identifier):
            fa.identifier = f"{fa.identifier}_01"
            fa.save(update_fields=["identifier"])


def remove_sequence_suffix_from_identifiers(apps, schema_editor):
    """Reverse : retire le suffixe _NN des identifiers."""
    import re

    FaEntity = apps.get_model("app", "FaEntity")
    for fa in FaEntity.objects.all():
        if fa.identifier:
            fa.identifier = re.sub(r"_\d{2}$", "", fa.identifier)
            fa.save(update_fields=["identifier"])


def _has_sequence_suffix(identifier: str) -> bool:
    """True si l'identifier finit par _NN (deux chiffres)."""
    import re

    return bool(re.search(r"_\d{2}$", identifier))


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0071_fsec_delivery_acceptor_receiver"),
    ]

    operations = [
        migrations.AlterField(
            model_name="faentity",
            name="fsec_version_id",
            field=models.ForeignKey(
                db_column="fsec_version_id",
                on_delete=models.deletion.PROTECT,
                related_name="fas",
                to="app.fsecentity",
                to_field="version_uuid",
            ),
        ),
        migrations.RunPython(
            add_sequence_suffix_to_existing_identifiers,
            reverse_code=remove_sequence_suffix_from_identifiers,
        ),
    ]
