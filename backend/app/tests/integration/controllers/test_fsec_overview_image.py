"""Tests d'intégration pour l'upload/suppression de la photo de vue d'ensemble FSEC.

Endpoint : PATCH/DELETE /api/v1/fsecs/{version_uuid}/overview-image/
"""

import io
import json
import shutil
import tempfile
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from PIL import Image

from app.repository.campaign.models.campaign_entity import CampaignEntity


def _patch_multipart(api_client, url: str, *, image: SimpleUploadedFile):
    """Helper : PATCH multipart/form-data (Client.patch ne le fait pas auto)."""
    return api_client.generic(
        "PATCH",
        url,
        data=encode_multipart(BOUNDARY, {"image": image}),
        content_type=MULTIPART_CONTENT,
    )


@pytest.fixture
def media_root(monkeypatch):
    """Isole MEDIA_ROOT dans un tmpdir nettoyé en fin de test."""
    tmp = tempfile.mkdtemp(prefix="spectre-media-test-")
    monkeypatch.setattr("django.conf.settings.MEDIA_ROOT", tmp)
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture
def sample_campaign(db):
    """Campagne minimale pour rattacher la FSEC."""
    return CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Campaign Photo Test {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )


@pytest.fixture
def created_fsec(api_client, sample_campaign):
    """Crée un FSEC vierge et retourne son version_uuid."""
    payload = {
        "name": f"FSEC Photo {uuid.uuid4().hex[:8]}",
        "campaign_id": sample_campaign.uuid,
        "status_id": 0,
        "category_id": 0,
        "rack_id": None,
        "comments": "Test photo",
    }
    response = api_client.post(
        "/api/v1/fsecs/", data=json.dumps(payload), content_type="application/json"
    )
    assert response.status_code == 201, response.content
    return response.json()["version_uuid"]


def _make_jpeg(width: int = 400, height: int = 300, color=(255, 0, 0)) -> bytes:
    """Génère un JPEG en mémoire — évite d'avoir une image fixture sur disque."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=color).save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.integration
@pytest.mark.django_db
class TestFsecOverviewImageUpload:
    """Endpoint PATCH /fsecs/{version_uuid}/overview-image/"""

    def test_upload_jpeg_sets_overview_image_url(
        self, api_client, created_fsec, media_root
    ):
        """Un upload JPEG valide assigne overview_image (URL sous /media/)."""
        upload = SimpleUploadedFile(
            "photo.jpg", _make_jpeg(), content_type="image/jpeg"
        )

        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=upload,
            )

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["overview_image"] is not None
        assert "/media/fsec/overview/" in data["overview_image"]
        assert data["overview_image"].endswith((".jpg", ".jpeg"))

    def test_upload_replaces_previous_image(self, api_client, created_fsec, media_root):
        """Un second upload remplace la photo (l'URL change, ancien chemin libéré)."""
        with override_settings(MEDIA_ROOT=media_root):
            first = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=SimpleUploadedFile(
                    "a.jpg", _make_jpeg(color=(255, 0, 0)), content_type="image/jpeg"
                ),
            )
            second = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=SimpleUploadedFile(
                    "b.jpg", _make_jpeg(color=(0, 255, 0)), content_type="image/jpeg"
                ),
            )

        assert first.status_code == 200 and second.status_code == 200
        assert first.json()["overview_image"] != second.json()["overview_image"]

    def test_upload_rejects_non_image(self, api_client, created_fsec, media_root):
        """Un fichier non-image (PDF, txt…) est rejeté en 400."""
        bad = SimpleUploadedFile(
            "not-an-image.txt", b"hello world", content_type="text/plain"
        )

        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=bad,
            )

        # InvalidDataException → 400 via ErrorHandlerMiddleware
        assert response.status_code == 400

    def test_upload_rejects_unsupported_content_type(
        self, api_client, created_fsec, media_root
    ):
        """Un GIF (content-type non listé) est rejeté."""
        buf = io.BytesIO()
        Image.new("RGB", (10, 10)).save(buf, format="GIF")
        upload = SimpleUploadedFile(
            "anim.gif", buf.getvalue(), content_type="image/gif"
        )

        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=upload,
            )

        assert response.status_code == 400

    def test_upload_404_on_unknown_fsec(self, api_client, media_root):
        """Upload sur une version_uuid inconnue → 404."""
        fake = str(uuid.uuid4())
        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{fake}/overview-image/",
                image=SimpleUploadedFile(
                    "p.jpg", _make_jpeg(), content_type="image/jpeg"
                ),
            )
        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestFsecOverviewImageDelete:
    """Endpoint DELETE /fsecs/{version_uuid}/overview-image/"""

    def test_delete_clears_overview_image(self, api_client, created_fsec, media_root):
        """Après DELETE, overview_image est null."""
        with override_settings(MEDIA_ROOT=media_root):
            _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/overview-image/",
                image=SimpleUploadedFile(
                    "p.jpg", _make_jpeg(), content_type="image/jpeg"
                ),
            )
            response = api_client.delete(
                f"/api/v1/fsecs/{created_fsec}/overview-image/"
            )

        assert response.status_code == 200
        assert response.json()["overview_image"] is None

    def test_delete_idempotent_when_no_image(
        self, api_client, created_fsec, media_root
    ):
        """DELETE sur un FSEC sans photo reste 200 et garde overview_image=null."""
        with override_settings(MEDIA_ROOT=media_root):
            response = api_client.delete(
                f"/api/v1/fsecs/{created_fsec}/overview-image/"
            )
        assert response.status_code == 200
        assert response.json()["overview_image"] is None
