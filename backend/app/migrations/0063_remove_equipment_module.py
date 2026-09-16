"""Suppression du module Équipements (référentiel + table de jointure).

Le module Matériel conserve uniquement Machines + Liens documentaires + Maintenance.
Les tables MACHINE_EQUIPMENT (jointure N-N) et EQUIPMENT (référentiel) sont
supprimées dans cet ordre (la table de jointure d'abord car elle référence
EQUIPMENT en FK).
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0062_material_module"),
    ]

    operations = [
        migrations.DeleteModel(name="MachineEquipmentEntity"),
        migrations.DeleteModel(name="EquipmentEntity"),
    ]
