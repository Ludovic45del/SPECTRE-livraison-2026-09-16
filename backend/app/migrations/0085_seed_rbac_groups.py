"""Seed idempotent des groupes de permission RBAC (admin, operateur, lecteur).

Ces groupes étaient jusqu'ici créés uniquement par la commande `initdb`. Sur une
base neuve (déploiement air-gap), `createadmin` (ou toute création d'utilisateur)
échouait avec « Group matching query does not exist » car le groupe cible
n'existait pas encore.

Les créer via une data migration garantit qu'ils existent dès la fin de
`migrate`, sans intervention manuelle. get_or_create → totalement idempotent :
la migration peut rejouer, et `initdb` reste compatible (mêmes noms).

Les noms sont figés en dur (bonne pratique migrations : indépendantes du code
applicatif). Ils doivent rester alignés avec app.core.permissions.ALL_ROLES.
"""

from django.db import migrations

RBAC_GROUPS = ["admin", "operateur", "lecteur"]


def seed_rbac_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for name in RBAC_GROUPS:
        Group.objects.get_or_create(name=name)


def unseed_rbac_groups(apps, schema_editor):
    # Reverse volontairement no-op : des utilisateurs peuvent déjà être
    # rattachés à ces groupes, on ne les supprime pas lors d'un rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0084_add_decision_moe_status"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(seed_rbac_groups, unseed_rbac_groups),
    ]
