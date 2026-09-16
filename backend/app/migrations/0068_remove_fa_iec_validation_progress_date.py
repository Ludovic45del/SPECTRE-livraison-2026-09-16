"""Supprime la colonne iec_validation_progress_date de la table FA.

Le suivi temporel des FA se limite désormais à la date d'ouverture et la date
de clôture. Les indicateurs DCP qui dépendaient de cette date intermédiaire
(avg_open_to_progress_days, avg_progress_to_closure_days) sont remplacés par
un unique avg_open_to_closure_days.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0067_fsec_overview_image"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="faentity",
            name="iec_validation_progress_date",
        ),
    ]
