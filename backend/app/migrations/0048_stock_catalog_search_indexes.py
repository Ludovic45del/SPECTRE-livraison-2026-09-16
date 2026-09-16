"""PERF: Activate pg_trgm extension + GIN trigram indexes on STOCK_CATALOG_ITEM.

Couvre la requête principale du catalogue Stock :
    StockCatalogItemEntity.objects.filter(
        Q(name__icontains=search) | Q(reference__icontains=search)
    )

Sans index trigram, chaque `icontains` provoque un sequential scan + LOWER() sur
toute la table. Avec `pg_trgm` + un index GIN sur les chaînes lower-cased, la
recherche reste sub-linéaire jusqu'à plusieurs dizaines de milliers de lignes.

Pré-requis :
- L'utilisateur Postgres doit avoir le droit CREATE EXTENSION (super-user ou
  rôle propriétaire de la base). Si ce n'est pas le cas, exécuter une fois,
  hors migration, en tant que super-user :

      CREATE EXTENSION IF NOT EXISTS pg_trgm;

  puis remplacer la première opération par `migrations.RunSQL.noop`.
- Postgres uniquement. Si une autre base est utilisée (SQLite en test), cette
  migration sera ignorée par le router DEFAULT_AUTO_FIELD-uniquement, mais
  l'opération RunSQL plantera : prévoir un guard côté CI.
"""

from django.db import migrations

CREATE_INDEX_NAME_SQL = (
    "CREATE INDEX IF NOT EXISTS stock_item_name_trgm_idx "
    'ON "STOCK_CATALOG_ITEM" USING gin (LOWER(name) gin_trgm_ops);'
)
DROP_INDEX_NAME_SQL = "DROP INDEX IF EXISTS stock_item_name_trgm_idx;"

CREATE_INDEX_REF_SQL = (
    "CREATE INDEX IF NOT EXISTS stock_item_reference_trgm_idx "
    'ON "STOCK_CATALOG_ITEM" USING gin (LOWER(reference) gin_trgm_ops) '
    "WHERE reference IS NOT NULL;"
)
DROP_INDEX_REF_SQL = "DROP INDEX IF EXISTS stock_item_reference_trgm_idx;"


def create_trgm_indexes(apps, schema_editor):
    """Active pg_trgm + index GIN. No-op hors PostgreSQL (SQLite de dev)."""
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    schema_editor.execute(CREATE_INDEX_NAME_SQL)
    schema_editor.execute(CREATE_INDEX_REF_SQL)


def drop_trgm_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(DROP_INDEX_NAME_SQL)
    schema_editor.execute(DROP_INDEX_REF_SQL)


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0047_fa_active_created_idx"),
    ]

    operations = [
        migrations.RunPython(create_trgm_indexes, drop_trgm_indexes),
    ]
