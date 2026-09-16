"""Ajoute le champ overview_image (photo de la vue d'ensemble) à FsecEntity."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0066_planning_step_referential"),
    ]

    operations = [
        migrations.AddField(
            model_name="fsecentity",
            name="overview_image",
            field=models.ImageField(
                blank=True,
                max_length=500,
                null=True,
                upload_to="fsec/overview/",
            ),
        ),
    ]
