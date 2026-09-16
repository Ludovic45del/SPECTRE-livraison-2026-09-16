"""Ajout des champs Matière et Masse aux éléments du catalogue Stock (R03).

- `matiere`  : matière générique de l'élément (à ne pas confondre avec
  `materiaux_mat`, réservé aux structurations spéciales).
- `masse_mg` : masse en milligrammes (Float : masses < 1 mg possibles).

Champs propres aux éléments sérialisés (NULL pour kind=consumable — règle
appliquée côté service, cf. catalog_service._validate_kind_specific_fields).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0090_move_metro_visrad_links_to_metrology"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockcatalogitementity",
            name="matiere",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="stockcatalogitementity",
            name="masse_mg",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
