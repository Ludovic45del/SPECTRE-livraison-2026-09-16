"""Ajoute les M2M operator_users (assemblage) et metrologist_users (métrologie).

Une étape d'assemblage ou de métrologie peut être réalisée à plusieurs : on
introduit une relation many-to-many vers UserProfileEntity. La FK simple
existante (operator_user / metrologist_user) est conservée et synchronisée sur
le premier membre pour la rétro-compatibilité.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0074_fa_photo"),
    ]

    operations = [
        migrations.AddField(
            model_name="assemblystepentity",
            name="operator_users",
            field=models.ManyToManyField(
                blank=True,
                db_table="ASSEMBLY_STEP_OPERATOR",
                related_name="+",
                to="app.userprofileentity",
            ),
        ),
        migrations.AddField(
            model_name="metrologystepentity",
            name="metrologist_users",
            field=models.ManyToManyField(
                blank=True,
                db_table="METROLOGY_STEP_METROLOGIST",
                related_name="+",
                to="app.userprofileentity",
            ),
        ),
    ]
