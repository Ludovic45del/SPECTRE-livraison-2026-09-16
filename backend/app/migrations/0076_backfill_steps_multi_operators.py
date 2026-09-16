"""Data migration : backfill des M2M operator_users / metrologist_users.

Reprend la FK simple existante (operator_user / metrologist_user) comme premier
(et unique) membre de la nouvelle relation many-to-many. Idempotente (.add ne
duplique pas) et réversible (reverse = vide les M2M).

Réversibilité : le reverse vide uniquement les M2M ; la FK simple n'est PAS
touchée (elle reste synchronisée sur le premier opérateur à chaque écriture via
le repository). Après un reverse partiel (0076 sans 0075), l'application reste
fonctionnelle : les mappers retombent sur la FK quand le M2M est vide. Seuls les
opérateurs secondaires sont perdus — sémantique attendue d'un retour à l'unique.
"""

from django.db import migrations


def forwards(apps, schema_editor):
    AssemblyStep = apps.get_model("app", "AssemblyStepEntity")
    MetrologyStep = apps.get_model("app", "MetrologyStepEntity")

    for step in AssemblyStep.objects.filter(operator_user_id__isnull=False).iterator(
        chunk_size=500
    ):
        step.operator_users.add(step.operator_user)

    for step in MetrologyStep.objects.filter(
        metrologist_user_id__isnull=False
    ).iterator(chunk_size=500):
        step.metrologist_users.add(step.metrologist_user)


def reverse(apps, schema_editor):
    AssemblyStep = apps.get_model("app", "AssemblyStepEntity")
    MetrologyStep = apps.get_model("app", "MetrologyStepEntity")

    for step in AssemblyStep.objects.iterator(chunk_size=500):
        step.operator_users.clear()
    for step in MetrologyStep.objects.iterator(chunk_size=500):
        step.metrologist_users.clear()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0075_steps_multi_operators"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
