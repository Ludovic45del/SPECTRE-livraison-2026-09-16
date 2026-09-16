"""Ajoute deux liens fichier (fichier métro .txt, Visrad réalisé) à SealingStepEntity.

CharField plutôt qu'URLField : on accepte aussi les chemins UNC (réseau fermé,
les ressources peuvent être servies en \\\\serveur\\share\\... ou via http interne).
Même pattern que 0069 (liens alignement/FDIE sur FsecEntity).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0080_fsec_assembly_plan"),
    ]

    operations = [
        migrations.AddField(
            model_name="sealingstepentity",
            name="metro_file_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="sealingstepentity",
            name="visrad_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
    ]
