"""Passage du profil utilisateur a des roles metier CUMULABLES.

`UserProfileEntity.role` (CharField, un seul role) devient `roles` (JSONField,
liste ordonnee par hierarchie). Le backfill conserve le role existant comme
unique element de la liste ; la migration inverse reprend le role principal
(premier element) pour restaurer la colonne d'origine.

JSONField et non table de liaison : format identique sur PostgreSQL et SQLite
(cible du deploiement air-gap), et volumetrie bornee (~30 comptes).
"""

from django.db import migrations, models

# Ordre hierarchique — doit rester aligne sur ALL_SPECTRE_ROLES
# (app/domain/user/models/user_bean.py). Fige ici volontairement : une migration
# ne doit pas dependre du code applicatif courant.
ROLE_ORDER = [
    "chef_labo",
    "iec",
    "rce",
    "assembleur",
    "metrologue",
    "cryogenie",
    "stagiaire",
    "alternant",
]


def role_to_roles(apps, schema_editor):
    """Backfill : role -> [role]. Un profil sans role reste avec une liste vide."""
    UserProfileEntity = apps.get_model("app", "UserProfileEntity")
    for profile in UserProfileEntity.objects.all().iterator():
        profile.roles = [profile.role] if profile.role else []
        profile.save(update_fields=["roles"])


def roles_to_role(apps, schema_editor):
    """Rollback : conserve le role principal (le plus haut dans la hierarchie)."""
    UserProfileEntity = apps.get_model("app", "UserProfileEntity")
    rank = {role: index for index, role in enumerate(ROLE_ORDER)}
    for profile in UserProfileEntity.objects.all().iterator():
        roles = sorted(
            set(profile.roles or []),
            key=lambda role: (rank.get(role, len(rank)), role),
        )
        profile.role = roles[0] if roles else ""
        profile.save(update_fields=["role"])


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0098_message_edit_delete_attachments"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofileentity",
            name="roles",
            field=models.JSONField(default=list),
        ),
        # Passage en nullable AVANT le backfill : c'est ce qui rend la migration
        # reversible. Au rollback, Django recree la colonne `role` vide — elle
        # doit donc tolerer NULL le temps que `roles_to_role` la repeuple, avant
        # que cet AlterField ne soit lui-meme defait (retour en NOT NULL).
        migrations.AlterField(
            model_name="userprofileentity",
            name="role",
            field=models.CharField(
                max_length=20,
                choices=[(r, r) for r in ROLE_ORDER],
                null=True,
                blank=True,
            ),
        ),
        migrations.RunPython(role_to_roles, roles_to_role),
        migrations.RemoveIndex(
            model_name="userprofileentity",
            name="user_profile_role_idx",
        ),
        migrations.RemoveField(
            model_name="userprofileentity",
            name="role",
        ),
    ]
