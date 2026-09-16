"""Integration tests for management commands (Axe 4 fixes).

Cover regressions introduced by:
- generate_fsecs: must refuse to wipe the FSEC table outside DEBUG unless --force.
- database_util.get_conn: must build a PostgreSQL URL that escapes password specials.
- database_util.insert_csv_into_table: must re-raise DB errors instead of swallowing them.
"""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

# =============================================================================
# generate_fsecs: DEBUG guard
# =============================================================================


@pytest.mark.integration
class TestGenerateFsecsGuard:
    """generate_fsecs must not wipe data in production without --force."""

    @override_settings(DEBUG=False)
    def test_refuses_without_debug_and_without_force(self, db):
        with pytest.raises(CommandError) as exc_info:
            call_command("generate_fsecs")
        assert "DEBUG" in str(exc_info.value)
        assert "--force" in str(exc_info.value)

    @override_settings(DEBUG=False)
    def test_accepts_with_force_even_outside_debug(self, db):
        from app.repository.fsec.models.fsec_category_entity import FsecCategoryEntity
        from app.repository.fsec.models.fsec_status_entity import FsecStatusEntity

        # Seed referential data (factories provided by integration conftest ensure
        # the minimum FSEC status/category records exist).
        assert FsecStatusEntity.objects.exists()
        assert FsecCategoryEntity.objects.exists()

        out = StringIO()
        call_command("generate_fsecs", "--force", stdout=out)
        assert "Successfully created" in out.getvalue()

    @override_settings(DEBUG=True)
    def test_runs_in_debug_without_force(self, db):
        out = StringIO()
        call_command("generate_fsecs", stdout=out)
        assert "Successfully created" in out.getvalue()


# =============================================================================
# database_util.get_conn: URL construction
# =============================================================================


@pytest.mark.unit
class TestGetConnPostgresUrl:
    """Password specials must not corrupt the URL."""

    def test_password_with_at_sign_is_escaped(self):
        from app.management.commands import database_util

        pg_settings = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "USER": "spectre",
                "PASSWORD": "p@ss:word/with#special%",
                "HOST": "db.internal",
                "PORT": "5433",
                "NAME": "spectre_prod",
            }
        }

        with patch.object(database_util.settings, "DATABASES", pg_settings):
            with patch.object(database_util, "create_engine") as mock_engine:
                mock_engine.return_value.connect.return_value = object()
                database_util.get_conn()

        built_url = mock_engine.call_args[0][0]
        rendered = built_url.render_as_string(hide_password=False)
        assert rendered.startswith("postgresql://spectre:")
        assert "@db.internal:5433/spectre_prod" in rendered
        # The password's special chars must be percent-encoded, not injected raw
        # into the authority section.
        assert "p@ss:word/with#special%" not in rendered

    def test_empty_password_falls_back_cleanly(self):
        from app.management.commands import database_util

        pg_settings = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "USER": "readonly",
                "PASSWORD": "",
                "HOST": "localhost",
                "PORT": "",
                "NAME": "spectre",
            }
        }

        with patch.object(database_util.settings, "DATABASES", pg_settings):
            with patch.object(database_util, "create_engine") as mock_engine:
                mock_engine.return_value.connect.return_value = object()
                database_util.get_conn()

        built_url = mock_engine.call_args[0][0]
        rendered = built_url.render_as_string(hide_password=False)
        assert rendered.startswith("postgresql://readonly@localhost:5432/spectre")


# =============================================================================
# database_util.insert_csv_into_table: no silent failure
# =============================================================================


@pytest.mark.integration
class TestInsertCsvIntoTableRaises:
    """A DB-level error must bubble up, not be logged-and-swallowed.

    Le chemin testé (pd.read_csv + get_conn + to_sql) est celui du moteur
    PostgreSQL : on force donc DATABASES sur un ENGINE postgresql et on
    court-circuite _table_has_rows, pour que le test soit déterministe quel que
    soit le moteur ambiant (sqlite en job unit, postgresql en job integration).
    """

    def test_reraises_on_db_error(self, tmp_path):
        from app.management.commands import database_util

        csv_path = tmp_path / "sample.csv"
        csv_path.write_text("id,name\n1,foo\n", encoding="utf-8")

        class DummyCmd:
            def __init__(self):
                self.stdout = StringIO()
                self.stderr = StringIO()
                self.style = type(
                    "S",
                    (),
                    {
                        "SUCCESS": staticmethod(lambda s: s),
                        "ERROR": staticmethod(lambda s: s),
                        "WARNING": staticmethod(lambda s: s),
                        "NOTICE": staticmethod(lambda s: s),
                    },
                )

        cmd = DummyCmd()
        boom = RuntimeError("duplicate key value violates unique constraint")

        class FakeConn:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        pg_settings = {"default": {"ENGINE": "django.db.backends.postgresql"}}
        with patch.object(database_util.settings, "DATABASES", pg_settings):
            with patch.object(database_util, "_table_has_rows", return_value=False):
                with patch.object(database_util, "get_conn", return_value=FakeConn()):
                    with patch(
                        "app.management.commands.database_util.pd.read_csv"
                    ) as mock_read:
                        mock_df = mock_read.return_value
                        mock_df.to_sql.side_effect = boom
                        with pytest.raises(RuntimeError, match="duplicate key"):
                            database_util.insert_csv_into_table(
                                cmd, "SOME_TABLE", csv_path
                            )

        assert "Unexpected error" in cmd.stderr.getvalue()
