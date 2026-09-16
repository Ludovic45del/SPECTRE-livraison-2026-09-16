"""PERF: Add composite index on FaEntity (is_active, -created_at).

Couvre la requête principale de FaRepository.get_all() :
    filter(is_active=True).order_by("-created_at")
Sans cet index, Postgres scanne toute la table FA et trie en mémoire.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0046_stock_module"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="faentity",
            index=models.Index(
                fields=["is_active", "-created_at"],
                name="fa_active_created_idx",
            ),
        ),
    ]
