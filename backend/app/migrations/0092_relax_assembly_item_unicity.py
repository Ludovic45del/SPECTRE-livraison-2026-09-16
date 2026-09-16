"""Levée de l'unicité (fsec_uuid, catalog_item) du tableau récap FSEC (R20).

Un consommable peut désormais apparaître sur plusieurs lignes du même tableau
récap (remarques distinctes par occurrence). L'unicité des ÉLÉMENTS sérialisés
reste garantie applicativement :
- anti-doublon conditionné à kind=element dans
  fsec_assembly_service.add_assembly_item ;
- unicité inter-FSEC via element_lifecycle_service.reserve_element
  (ELEMENT_ALREADY_USED).

Une contrainte partielle DB n'est pas possible ici : `kind` vit dans une autre
table (STOCK_CATALOG_ITEM), cohérent avec la docstring de l'entité
(« L'intégrité applicative est gérée côté service »).
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0091_stock_element_matiere_masse"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="fsecassemblyitementity",
            name="uq_fsec_assembly_item_fsec_item",
        ),
    ]
