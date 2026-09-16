"""Vues / photos demandées sur la FSEC (retour R08).

Ajout de `requested_views` (texte libre, 4000 caractères max) sur FSEC : les
prises de vue à réaliser peuvent être notées dans l'onglet Vue/Photo sans avoir
à créer de session photo. Le champ est indépendant de PicturesStep.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0094_lab_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="fsecentity",
            name="requested_views",
            field=models.TextField(blank=True, max_length=4000, null=True),
        ),
    ]
