import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0038_alter_campaignentity_semester"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserProfileEntity",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "uuid",
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("chef_labo", "chef_labo"),
                            ("iec", "iec"),
                            ("rce", "rce"),
                            ("assembleur", "assembleur"),
                            ("metrologue", "metrologue"),
                            ("cryogenie", "cryogenie"),
                            ("stagiaire", "stagiaire"),
                            ("alternant", "alternant"),
                        ],
                        max_length=20,
                    ),
                ),
                ("force_password_change", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "user_profile",
                "indexes": [
                    models.Index(fields=["uuid"], name="user_profile_uuid_idx"),
                    models.Index(fields=["role"], name="user_profile_role_idx"),
                ],
            },
        ),
    ]
