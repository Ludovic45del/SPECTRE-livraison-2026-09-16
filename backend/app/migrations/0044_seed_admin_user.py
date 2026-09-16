"""Seed du compte admin dev — ne s'exécute que sur demande explicite.

Contrôlé par SPECTRE_SEED_DEV_ADMIN=1 (plus robuste que DEBUG seul : une fuite
DEBUG=true en prod ne suffit plus à recréer un compte admin).

Le mot de passe doit être fourni via SPECTRE_SEED_DEV_ADMIN_PASSWORD ; sinon un
mot de passe aléatoire fort est généré et loggé une seule fois.

L'utilisateur créé a force_password_change=True : comportement cohérent avec
user_service.create_user — obligation de changer le mot de passe à la première
connexion.
"""

import logging
import os
import secrets
import string

from django.contrib.auth.hashers import make_password
from django.db import migrations

SEED_USERNAME = "admin"
SEED_ROLE = "chef_labo"
SEED_PERMISSION_GROUP = "admin"
SEED_ENV_FLAG = "SPECTRE_SEED_DEV_ADMIN"
SEED_ENV_PASSWORD = "SPECTRE_SEED_DEV_ADMIN_PASSWORD"

logger = logging.getLogger(__name__)


def _generate_strong_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%&*" for c in password)
        ):
            return password


def seed_admin_user(apps, schema_editor):
    if os.environ.get(SEED_ENV_FLAG) != "1":
        return

    User = apps.get_model("auth", "User")
    Group = apps.get_model("auth", "Group")
    UserProfileEntity = apps.get_model("app", "UserProfileEntity")

    if User.objects.filter(username=SEED_USERNAME).exists():
        return

    password = os.environ.get(SEED_ENV_PASSWORD)
    password_was_generated = False
    if not password:
        password = _generate_strong_password()
        password_was_generated = True

    user = User.objects.create(
        username=SEED_USERNAME,
        password=make_password(password),
        first_name="Admin",
        last_name="Laboratoire",
        is_active=True,
        is_staff=False,
        is_superuser=False,
    )

    UserProfileEntity.objects.create(
        user=user,
        role=SEED_ROLE,
        force_password_change=True,
    )

    group, _ = Group.objects.get_or_create(name=SEED_PERMISSION_GROUP)
    user.groups.add(group)

    if password_was_generated:
        logger.warning(
            "Seed admin créé avec un mot de passe généré aléatoirement. "
            "Pour %s : %s — communiquez-le via un canal sûr, "
            "il devra être changé à la première connexion.",
            SEED_USERNAME,
            password,
        )


def unseed_admin_user(apps, schema_editor):
    User = apps.get_model("auth", "User")
    UserProfileEntity = apps.get_model("app", "UserProfileEntity")

    try:
        user = User.objects.get(username=SEED_USERNAME)
    except User.DoesNotExist:
        return

    profile = UserProfileEntity.objects.filter(user=user, role=SEED_ROLE).first()
    if profile is None:
        return

    profile.delete()
    user.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0043_userprofileentity_dashboard_preferences"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(seed_admin_user, unseed_admin_user),
    ]
