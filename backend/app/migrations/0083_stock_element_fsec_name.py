# Ajout du champ `fsec_name` (FSEC de destination, lien déclaratif optionnel)
# sur les items du catalogue Stock. Jusqu'ici le nom d'un élément sérialisé
# ÉTAIT le nom d'une FSEC (convention imposée par le formulaire) : on recopie
# donc ce nom dans `fsec_name` pour préserver l'association existante,
# `name` devenant un nom libre.

from django.db import migrations, models


def backfill_fsec_name_from_element_names(apps, schema_editor):
    StockCatalogItem = apps.get_model("app", "StockCatalogItemEntity")

    StockCatalogItem.objects.filter(kind="element").update(fsec_name=models.F("name"))


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0082_stock_structuration_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockcatalogitementity",
            name="fsec_name",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.RunPython(
            backfill_fsec_name_from_element_names,
            migrations.RunPython.noop,
        ),
    ]
