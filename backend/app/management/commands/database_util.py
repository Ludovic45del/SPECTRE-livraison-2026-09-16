"""Utilitaires de seed de la base (initdb / demo).

pandas et SQLAlchemy ne sont utilisés que pour le **chemin rapide PostgreSQL**
(`df.to_sql`). Ils sont importés de façon protégée : en déploiement air-gap
SQLite ils ne sont pas installés, et le seed passe par la connexion Django
(stdlib `csv` uniquement). Les noms `pd` / `create_engine` / `URL` restent des
attributs de module (réels en dev/CI où les deux paquets sont présents) pour
que les tests puissent les patcher.
"""

import csv
from pathlib import Path

from django.conf import settings
from django.db import connection

try:  # pragma: no cover - présents en dev/CI, absents en prod air-gap SQLite
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None

try:  # pragma: no cover
    from sqlalchemy import create_engine
    from sqlalchemy.engine import URL
except ImportError:  # pragma: no cover
    create_engine = None
    URL = None


def get_conn():
    """Connexion SQLAlchemy PostgreSQL (chemin rapide pour le seed en prod PG)."""
    db_settings = settings.DATABASES["default"]
    engine = db_settings.get("ENGINE", "")

    if "postgresql" not in engine:
        raise RuntimeError(
            f"Only PostgreSQL is supported, got ENGINE={engine!r}. "
            "Configure DB_ENGINE=django.db.backends.postgresql in backend/.env."
        )

    if create_engine is None or URL is None:
        raise RuntimeError(
            "SQLAlchemy est requis pour le seed via le chemin rapide PostgreSQL. "
            "Installez `sqlalchemy` (cf. requirements-dev.txt) ou utilisez "
            "USE_SQLITE=True."
        )

    port = db_settings.get("PORT") or "5432"
    url = URL.create(
        drivername="postgresql",
        username=db_settings.get("USER") or None,
        password=db_settings.get("PASSWORD") or None,
        host=db_settings.get("HOST") or "localhost",
        port=int(port),
        database=db_settings.get("NAME") or None,
    )

    return create_engine(url).connect()


def _table_has_rows(table_name):
    """True si la table existe déjà et contient au moins une ligne.

    Permet de rendre le seed idempotent : les référentiels campagne sont
    déjà insérés par les migrations de seed, inutile (et conflictuel) de
    les réinsérer via le CSV.
    """
    if table_name not in connection.introspection.table_names():
        return False
    with connection.cursor() as cursor:
        cursor.execute(f"SELECT COUNT(*) FROM {connection.ops.quote_name(table_name)}")
        return cursor.fetchone()[0] > 0


def _insert_csv_via_django(table_name, csv_path):
    """Insère un CSV via la connexion Django, sans pandas.

    Indépendant du moteur : fonctionne avec SQLite (déploiement air-gap) comme
    avec tout backend supporté par Django. Les colonnes du CSV correspondent aux
    colonnes réelles de la table. Une cellule vide devient NULL (parité avec
    l'ancien comportement pandas NaN → None).
    """
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        try:
            columns = next(reader)
        except StopIteration:
            return  # CSV vide (pas même d'en-tête)
        rows = [
            tuple(value if value != "" else None for value in record)
            for record in reader
            # Ignore les lignes vides (parité avec pandas skip_blank_lines) :
            # certains CSV se terminent par une ligne blanche.
            if record
        ]

    if not rows:
        return

    quote = connection.ops.quote_name
    cols_sql = ", ".join(quote(col) for col in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f"INSERT INTO {quote(table_name)} ({cols_sql}) VALUES ({placeholders})"

    with connection.cursor() as cursor:
        cursor.executemany(sql, rows)


def insert_csv_into_table(self, table_name, csv_path):
    try:
        # Seed idempotent : ne pas réinsérer si la table est déjà peuplée
        # (ex. référentiels campagne seedés par les migrations).
        if _table_has_rows(table_name):
            self.stdout.write(
                self.style.WARNING(
                    f"Table '{table_name}' déjà peuplée, insertion ignorée."
                )
            )
            return

        csv_path = Path(csv_path)
        engine = settings.DATABASES["default"].get("ENGINE", "")
        if "postgresql" in engine:
            # Chemin rapide PostgreSQL (pandas + SQLAlchemy bulk COPY).
            if pd is None:
                raise RuntimeError(
                    "pandas est requis pour le seed via le chemin rapide "
                    "PostgreSQL. Installez `pandas` (cf. requirements-dev.txt) "
                    "ou utilisez USE_SQLITE=True."
                )
            df = pd.read_csv(csv_path, dtype="string")
            with get_conn() as conn:
                df.to_sql(table_name, if_exists="append", index=False, con=conn)
        else:
            # SQLite ou autre : passe par la connexion Django (get_conn ne
            # supporte que PostgreSQL), sans dépendre de pandas.
            _insert_csv_via_django(table_name, csv_path)
    except Exception as e:
        # Re-raise so the caller can decide whether to abort or tolerate the
        # failure. Previously this was swallowed, hiding duplicate-PK errors on
        # demo re-runs and leaving subsequent dependent inserts to cascade fail.
        self.stderr.write(
            self.style.ERROR(
                f"Unexpected error during insertion into table '{table_name}' => {e}"
            )
        )
        raise

    self.stdout.write(
        self.style.SUCCESS(f"Successfully inserted {csv_path} in {table_name} table")
    )
