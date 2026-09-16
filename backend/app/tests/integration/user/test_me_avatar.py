"""Tests d'intégration de la photo de profil — POST/DELETE /api/v1/auth/me/avatar/.

Calqué sur test_fsec_overview_image.py (isolation MEDIA_ROOT). Vérifie l'upload
(re-compression serveur), le remplacement (nettoyage de l'ancien fichier), la
suppression, et la remontée de `avatar_url` dans GET /auth/me/.
"""

import io
import os
import shutil
import tempfile

import pytest
from django.contrib.auth.models import Group, User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings
from PIL import Image

from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.fixture
def media_root(monkeypatch):
    """Isole MEDIA_ROOT dans un tmpdir nettoyé en fin de test."""
    tmp = tempfile.mkdtemp(prefix="spectre-avatar-test-")
    monkeypatch.setattr("django.conf.settings.MEDIA_ROOT", tmp)
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture
def me_user(db):
    """Utilisateur opérateur avec profil (pour request.user.profile)."""
    Group.objects.get_or_create(name="operateur")
    user = User.objects.create_user(
        username="avatar_user",
        password="AvatarPass123!",
        first_name="Avery",
        last_name="Tarr",
    )
    UserProfileEntity.objects.create(
        user=user, roles=["iec"], force_password_change=False
    )
    return user


@pytest.fixture
def me_client(me_user):
    client = Client()
    client.force_login(me_user)
    return client


def _png(width=400, height=300, color=(255, 0, 0), mode="RGB", name="src.png"):
    buf = io.BytesIO()
    Image.new(mode, (width, height), color=color).save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@pytest.mark.integration
@pytest.mark.django_db
class TestMeAvatar:
    URL = "/api/v1/auth/me/avatar/"

    def test_me_avatar_url_null_by_default(self, me_client):
        resp = me_client.get("/api/v1/auth/me/")
        assert resp.status_code == 200
        assert resp.json()["avatar_url"] is None

    def test_upload_sets_avatar_url_as_jpeg(self, me_client, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = me_client.post(self.URL, {"image": _png()})

        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert data["avatar_url"] is not None
        assert "/media/users/avatars/" in data["avatar_url"]
        # Le serveur re-encode systématiquement en JPEG, même pour un PNG source.
        assert data["avatar_url"].endswith(".jpg")

    def test_me_reflects_uploaded_avatar(self, me_client, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            me_client.post(self.URL, {"image": _png()})
            me_resp = me_client.get("/api/v1/auth/me/")

        assert me_resp.json()["avatar_url"] is not None

    def test_replace_removes_previous_file(self, me_client, me_user, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            me_client.post(self.URL, {"image": _png(color=(255, 0, 0))})
            first_path = UserProfileEntity.objects.get(user=me_user).avatar.path
            assert os.path.exists(first_path)

            me_client.post(self.URL, {"image": _png(color=(0, 0, 255))})
            second_path = UserProfileEntity.objects.get(user=me_user).avatar.path

        assert first_path != second_path
        assert not os.path.exists(first_path)
        assert os.path.exists(second_path)

    def test_delete_clears_avatar_and_file(self, me_client, me_user, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            me_client.post(self.URL, {"image": _png()})
            path = UserProfileEntity.objects.get(user=me_user).avatar.path
            assert os.path.exists(path)

            resp = me_client.delete(self.URL)

        assert resp.status_code == 200
        assert resp.json()["avatar_url"] is None
        assert not os.path.exists(path)
        assert not UserProfileEntity.objects.get(user=me_user).avatar

    def test_upload_rejects_non_image(self, me_client, media_root):
        bad = SimpleUploadedFile("note.txt", b"not an image", content_type="text/plain")
        with override_settings(MEDIA_ROOT=media_root):
            resp = me_client.post(self.URL, {"image": bad})
        assert resp.status_code == 400

    def test_upload_rejects_oversized_dimensions(
        self, me_client, media_root, monkeypatch
    ):
        # Garde-fou anti decompression-bomb : un seuil minuscule => même une petite
        # image dépasse, sans avoir à allouer une vraie bombe en mémoire.
        monkeypatch.setattr("app.api.user.serializers.AVATAR_MAX_PIXELS", 1000)
        with override_settings(MEDIA_ROOT=media_root):
            resp = me_client.post(self.URL, {"image": _png(400, 300)})  # 120000 px
        assert resp.status_code == 400

    def test_requires_authentication(self, db):
        resp = Client().post(self.URL, {"image": _png()})
        assert resp.status_code in (401, 403)
