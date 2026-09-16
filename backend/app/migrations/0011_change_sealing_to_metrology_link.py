"""Migration to change SealingStep from FSEC link to Metrology link."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """Change SealingStep to link to MetrologyStep instead of FSEC."""

    dependencies = [
        ("app", "0010_sealingstepentity_date_and_more"),
    ]

    operations = [
        # Remove old foreign key to FSEC
        migrations.RemoveField(
            model_name="sealingstepentity",
            name="fsec_version_id",
        ),
        # Add new OneToOne field to MetrologyStep
        migrations.AddField(
            model_name="sealingstepentity",
            name="metrology_step_id",
            field=models.OneToOneField(
                db_column="metrology_step_id",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sealing_step",
                to="app.metrologystepentity",
            ),
            preserve_default=False,
        ),
    ]
