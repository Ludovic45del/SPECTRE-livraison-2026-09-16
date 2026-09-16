"""Passe la FA en suppression définitive (hard delete) : retrait de is_active.

ATTENTION — MIGRATION DESTRUCTIVE :
- La FA n'utilise plus le soft-delete (champ is_active). La suppression devient
  une vraie suppression ORM (cf. FaRepository.delete).
- Les lectures FA ne filtrent donc plus is_active. Pour éviter que les FA
  historiquement soft-deletées (is_active=False) ne redeviennent visibles, on
  les PURGE définitivement AVANT de retirer la colonne.
- Cette purge est IRRÉVERSIBLE (reverse_code=noop) : faire un `pg_dump` de la
  base avant d'appliquer cette migration en production.

is_active reste une convention de soft-delete sur les autres modèles (FSEC,
Stock, User) : ce changement ne concerne QUE la FA.
"""

from django.db import migrations, models


def purge_inactive_fas(apps, schema_editor):
    """Supprime définitivement les FA soft-deletées (is_active=False).

    Doit s'exécuter AVANT le RemoveField is_active, sinon ces lignes
    redeviendraient visibles une fois les filtres is_active retirés des lectures.
    """
    FaEntity = apps.get_model("app", "FaEntity")
    FaEntity.objects.filter(is_active=False).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0072_fa_many_per_fsec"),
    ]

    operations = [
        # 1) Purge irréversible des FA soft-deletées (utilise is_active, donc
        #    avant le RemoveField).
        migrations.RunPython(
            purge_inactive_fas,
            reverse_code=migrations.RunPython.noop,
        ),
        # 2) L'index composite référence is_active : le retirer avant le champ.
        migrations.RemoveIndex(
            model_name="faentity",
            name="fa_active_created_idx",
        ),
        # 3) Nouvel index sur la requête list() (order_by -created_at).
        migrations.AddIndex(
            model_name="faentity",
            index=models.Index(fields=["-created_at"], name="fa_created_idx"),
        ),
        # 4) Suppression du champ soft-delete.
        migrations.RemoveField(
            model_name="faentity",
            name="is_active",
        ),
    ]
