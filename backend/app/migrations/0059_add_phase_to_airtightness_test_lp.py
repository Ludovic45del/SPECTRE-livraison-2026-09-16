"""Ajoute une colonne `phase` ('BP'/'HP', default 'BP') à AIRTIGHTNESS_TEST_LP_STEP.

Sert à discriminer les tests d'étanchéité rattachés à la phase BP ou HP
d'une FSEC (notamment pour les catégories 2 et 3). Les records existants
sont rétro-compatibles via la valeur par défaut 'BP'.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0058_add_embase_to_bp_steps"),
    ]

    operations = [
        migrations.AddField(
            model_name="airtightnesstestlpstepentity",
            name="phase",
            field=models.CharField(
                choices=[("BP", "BP"), ("HP", "HP")],
                default="BP",
                max_length=2,
            ),
        ),
    ]
