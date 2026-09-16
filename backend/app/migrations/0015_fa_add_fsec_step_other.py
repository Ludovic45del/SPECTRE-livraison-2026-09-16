"""Add fsec_step_other field to FA model."""

from django.db import migrations, models


class Migration(migrations.Migration):
    """Ajoute le champ fsec_step_other à la table FA."""

    dependencies = [
        ("app", "0014_fa_add_fsec_step_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="faentity",
            name="fsec_step_other",
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
    ]
