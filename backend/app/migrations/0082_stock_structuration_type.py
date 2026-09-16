# Fusion des rubriques structuration_speciale / structuration_ec dans la rubrique
# unique "structuration", désormais sous-classée par le champ `structuration_type`
# (standard / speciale / ec).

from django.db import migrations, models


def merge_structuration_categories(apps, schema_editor):
    StockCatalogItem = apps.get_model("app", "StockCatalogItemEntity")

    StockCatalogItem.objects.filter(category="structuration").update(
        structuration_type="standard"
    )
    StockCatalogItem.objects.filter(category="structuration_speciale").update(
        category="structuration", structuration_type="speciale"
    )
    StockCatalogItem.objects.filter(category="structuration_ec").update(
        category="structuration", structuration_type="ec"
    )


def split_structuration_categories(apps, schema_editor):
    StockCatalogItem = apps.get_model("app", "StockCatalogItemEntity")

    StockCatalogItem.objects.filter(
        category="structuration", structuration_type="speciale"
    ).update(category="structuration_speciale")
    StockCatalogItem.objects.filter(
        category="structuration", structuration_type="ec"
    ).update(category="structuration_ec")


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0081_sealing_step_metro_visrad_links"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockcatalogitementity",
            name="structuration_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("standard", "Standard"),
                    ("speciale", "Spéciale"),
                    ("ec", "EC"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="stockcatalogitementity",
            name="category",
            field=models.CharField(
                choices=[
                    ("pieces_elementaires", "Pièces élémentaires"),
                    ("structuration", "Structuration"),
                    ("colles", "Colles"),
                    ("autres", "Autres"),
                ],
                max_length=50,
            ),
        ),
        migrations.RunPython(
            merge_structuration_categories,
            split_structuration_categories,
        ),
    ]
