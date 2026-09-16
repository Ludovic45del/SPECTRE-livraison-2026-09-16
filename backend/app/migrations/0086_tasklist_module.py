"""Module Listes de tâches partagées (widget d'accueil).

Tables créées :
- TASK_LIST         : listes partagées (propriétaire, nom, description, couleur)
- TASK_LIST_MEMBER  : adhésions (unicité liste/membre)
- TASK_LIST_ITEM    : tâches (priorité, échéance, assignation, complétion)
- TASK_LIST_COMMENT : commentaires (annotations) sur les tâches
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0085_seed_rbac_groups"),
    ]

    operations = [
        migrations.CreateModel(
            name="TaskItemEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=300)),
                ("note", models.TextField(blank=True, default="")),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("low", "Basse"),
                            ("normal", "Normale"),
                            ("high", "Haute"),
                            ("critical", "Critique"),
                        ],
                        default="normal",
                        max_length=10,
                    ),
                ),
                ("done", models.BooleanField(default=False)),
                ("position", models.IntegerField(default=0)),
                ("due_date", models.DateField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assignee",
                    models.ForeignKey(
                        blank=True,
                        db_column="assignee_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
                (
                    "completed_by",
                    models.ForeignKey(
                        blank=True,
                        db_column="completed_by_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        db_column="created_by_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "TASK_LIST_ITEM",
                "ordering": ["position", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="TaskCommentEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        db_column="author_uuid",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
                (
                    "task",
                    models.ForeignKey(
                        db_column="task_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="app.taskitementity",
                    ),
                ),
            ],
            options={
                "db_table": "TASK_LIST_COMMENT",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="TaskListEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                (
                    "color",
                    models.CharField(
                        choices=[
                            ("default", "Par défaut"),
                            ("blue", "Bleu"),
                            ("green", "Vert"),
                            ("orange", "Orange"),
                            ("purple", "Violet"),
                            ("red", "Rouge"),
                        ],
                        default="default",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        db_column="owner_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
            ],
            options={
                "db_table": "TASK_LIST",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddField(
            model_name="taskitementity",
            name="task_list",
            field=models.ForeignKey(
                db_column="task_list_uuid",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="items",
                to="app.tasklistentity",
            ),
        ),
        migrations.CreateModel(
            name="TaskListMemberEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "member",
                    models.ForeignKey(
                        db_column="member_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="+",
                        to="app.userprofileentity",
                        to_field="uuid",
                    ),
                ),
                (
                    "task_list",
                    models.ForeignKey(
                        db_column="task_list_uuid",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="app.tasklistentity",
                    ),
                ),
            ],
            options={
                "db_table": "TASK_LIST_MEMBER",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="tasklistentity",
            index=models.Index(fields=["owner"], name="task_list_owner_idx"),
        ),
        migrations.AddIndex(
            model_name="taskitementity",
            index=models.Index(
                fields=["task_list", "done"], name="task_item_list_done_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="tasklistmemberentity",
            index=models.Index(fields=["member"], name="task_list_member_member_idx"),
        ),
        migrations.AddConstraint(
            model_name="tasklistmemberentity",
            constraint=models.UniqueConstraint(
                fields=("task_list", "member"), name="task_list_member_unique"
            ),
        ),
    ]
