"""Déplace les liens fichiers (métro .txt, Visrad) de SEALING_STEP vers METROLOGY_STEP (R15).

Ces liens sont des livrables de la métrologie ; ils avaient été rattachés à tort
au scellement (migration 0081). La copie s'appuie sur le OneToOne
`sealing.metrology_step_id` (pas de collision possible : 0..1 scellement par
métrologie).

Réversible SANS PERTE : le reverse recopie les valeurs vers les colonnes
SEALING_STEP (recréées par le reverse des RemoveField) avant la suppression des
colonnes METROLOGY_STEP. Une métrologie qui porte des liens mais n'a pas encore
de scellement (saisie via le modal Métrologie, cas nominal depuis R15) reçoit
une ligne SEALING_STEP minimale ne contenant que ces liens : avant 0090, c'était
le seul endroit où ils pouvaient vivre. Les liens vides ("") sont traités comme
absents (aucune ligne créée pour rien).
"""

from django.db import migrations, models


def copy_links_to_metrology(apps, schema_editor):
    """Copie les liens non nuls de chaque scellement vers sa métrologie (1:1)."""
    SealingStep = apps.get_model("app", "SealingStepEntity")
    MetrologyStep = apps.get_model("app", "MetrologyStepEntity")
    # exclude(les deux liens null) = au moins un des deux liens renseigné.
    sealings = SealingStep.objects.exclude(
        metro_file_link__isnull=True, visrad_link__isnull=True
    )
    for sealing in sealings.iterator():
        MetrologyStep.objects.filter(pk=sealing.metrology_step_id_id).update(
            metro_file_link=sealing.metro_file_link,
            visrad_link=sealing.visrad_link,
        )


def copy_links_back_to_sealing(apps, schema_editor):
    """Reverse : recopie les liens de chaque métrologie vers son scellement.

    Sans perte de données : si la métrologie n'a pas de scellement, une ligne
    SEALING_STEP minimale (uniquement les liens) est créée pour les conserver.
    """
    SealingStep = apps.get_model("app", "SealingStepEntity")
    MetrologyStep = apps.get_model("app", "MetrologyStepEntity")
    # exclude(les deux liens null) = au moins un des deux liens renseigné.
    metrologies = MetrologyStep.objects.exclude(
        metro_file_link__isnull=True, visrad_link__isnull=True
    )
    for metrology in metrologies.iterator():
        if not (metrology.metro_file_link or metrology.visrad_link):
            # Liens vides ("") : rien à conserver, on ne crée pas de scellement.
            continue
        # OneToOne sealing → metrology : 0..1 scellement par métrologie, donc
        # update_or_create ne peut ni doublonner ni écraser un autre scellement.
        SealingStep.objects.update_or_create(
            metrology_step_id=metrology,
            defaults={
                "metro_file_link": metrology.metro_file_link,
                "visrad_link": metrology.visrad_link,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0089_sealing_verification_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="metrologystepentity",
            name="metro_file_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name="metrologystepentity",
            name="visrad_link",
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.RunPython(copy_links_to_metrology, copy_links_back_to_sealing),
        migrations.RemoveField(
            model_name="sealingstepentity",
            name="metro_file_link",
        ),
        migrations.RemoveField(
            model_name="sealingstepentity",
            name="visrad_link",
        ),
    ]
