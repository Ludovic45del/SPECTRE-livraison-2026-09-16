"""Tests unitaires de `app.management.commands.database_util.get_conn`.

Couvre la régression audit : un mot de passe avec caractères spéciaux (@, /,
%, #, :) ne doit plus corrompre l'URL de connexion PostgreSQL.
"""

from unittest.mock import patch

import pytest
from sqlalchemy.engine import URL

from app.management.commands.database_util import get_conn


@pytest.mark.unit
class TestGetConnPostgres:
    def _fake_settings(self, password: str):
        return {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": "spectre_test",
                "USER": "spectre",
                "PASSWORD": password,
                "HOST": "localhost",
                "PORT": "5432",
            }
        }

    def _captured_url(self, password: str):
        captured = {}

        def _fake_create_engine(url, **kwargs):  # noqa: ARG001
            captured["url"] = url

            class _Engine:
                def connect(self):
                    return "conn"

            return _Engine()

        with patch(
            "app.management.commands.database_util.settings.DATABASES",
            self._fake_settings(password),
        ):
            with patch(
                "app.management.commands.database_util.create_engine",
                side_effect=_fake_create_engine,
            ):
                get_conn()
        return captured["url"]

    def test_special_char_password_at_sign(self):
        url = self._captured_url("p@ss@word")
        assert isinstance(url, URL)
        # URL.render_as_string(hide_password=False) remet le password escaped
        rendered = url.render_as_string(hide_password=False)
        assert "p%40ss%40word" in rendered
        # L'host n'est pas pollué par le @ du password
        assert url.host == "localhost"

    def test_special_char_password_slash(self):
        url = self._captured_url("pa/ss/word")
        rendered = url.render_as_string(hide_password=False)
        assert "pa%2Fss%2Fword" in rendered
        assert url.database == "spectre_test"

    def test_special_char_password_percent(self):
        url = self._captured_url("pass%word")
        rendered = url.render_as_string(hide_password=False)
        assert "pass%25word" in rendered

    def test_empty_password(self):
        url = self._captured_url("")
        assert url.password is None
        assert url.username == "spectre"


@pytest.mark.unit
class TestGetConnNonPostgres:
    def test_non_postgres_engine_raises(self):
        with patch(
            "app.management.commands.database_util.settings.DATABASES",
            {
                "default": {
                    "ENGINE": "django.db.backends.mysql",
                    "NAME": "whatever",
                }
            },
        ):
            with pytest.raises(RuntimeError, match="Only PostgreSQL is supported"):
                get_conn()
