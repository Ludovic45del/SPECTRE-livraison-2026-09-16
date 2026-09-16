"""Add fsec_step_id field to FA model."""

from django.db import migrations, models


class Migration(migrations.Migration):
    """Ajoute le champ fsec_step_id à la table FA."""

    dependencies = [
        ("app", "0013_fa_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="faentity",
            name="fsec_step_id",
            field=models.IntegerField(null=True, blank=True),
        ),
    ]
