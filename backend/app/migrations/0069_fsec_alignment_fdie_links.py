"""Ajoute deux liens fichier (alignement, FDIE) à FsecEntity.

CharField plutôt que URLField : on accepte aussi les chemins UNC (réseau fermé,
les ressources peuvent être servies en \\\\serveur\\share\\... ou via http interne).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0068_remove_fa_iec_validation_progress_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="fsecentity",
            name="alignment_file_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="fsecentity",
            name="fdie_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
