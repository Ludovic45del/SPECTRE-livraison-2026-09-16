"""Tests d'intégration des endpoints galerie photos FA.

Endpoints :
- GET    /api/v1/fas/{uuid}/photos/                liste ordonnée
- POST   /api/v1/fas/{uuid}/photos/                upload multipart (champ `image`)
- DELETE /api/v1/fas/{uuid}/photos/{photo_uuid}/   suppression

Calqué sur test_fsec_overview_image.py (isolation MEDIA_ROOT, helper multipart).
"""

import io
import json
import shutil
import tempfile
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings
from PIL import Image

from app.repository.campaign.models.campaign_entity import CampaignEntity


def _image_bytes(fmt="JPEG", color=(255, 0, 0)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color=color).save(buf, format=fmt)
    return buf.getvalue()


def _uploaded(name="a.jpg", content=None, content_type="image/jpeg"):
    return SimpleUploadedFile(
        name, content if content is not None else _image_bytes(), content_type
    )


def _post_photo(api_client, fa_uuid, *, fields):
    # data=dict contenant un fichier → le client de test encode en multipart auto.
    return api_client.post(f"/api/v1/fas/{fa_uuid}/photos/", data=fields)


@pytest.fixture
def media_root():
    tmp = tempfile.mkdtemp(prefix="spectre-fa-photos-test-")
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture
def sample_campaign(db):
    return CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Campaign FA Photo {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )


@pytest.fixture
def created_fa(api_client, sample_campaign):
    """Crée Campaign -> FSEC -> FA via l'API et retourne l'uuid de la FA."""
    fsec_resp = api_client.post(
        "/api/v1/fsecs/",
        data=json.dumps(
            {
                "name": f"FSEC FA Photo {uuid.uuid4().hex[:8]}",
                "campaign_id": sample_campaign.uuid,
                "status_id": 0,
                "category_id": 0,
                "rack_id": None,
            }
        ),
        content_type="application/json",
    )
    assert fsec_resp.status_code == 201, fsec_resp.content
    fsec_version_uuid = fsec_resp.json()["version_uuid"]

    fa_resp = api_client.post(
        "/api/v1/fas/",
        data=json.dumps(
            {
                "fsec_version_id": fsec_version_uuid,
                "status_id": 0,
                "event_date": "2025-03-01",
                "discoverer": "Testeur",
                "observation": "Observation",
                "quick_analysis": "Analyse",
            }
        ),
        content_type="application/json",
    )
    assert fa_resp.status_code == 201, fa_resp.content
    return fa_resp.json()["uuid"]


@pytest.mark.integration
@pytest.mark.django_db
class TestFaPhotosUpload:
    def test_post_jpeg_returns_201_with_url(self, api_client, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(api_client, created_fa, fields={"image": _uploaded()})

        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["order"] == 0
        assert data["image"] and "/media/fa/photos/" in data["image"]

    def test_post_with_caption(self, api_client, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(
                api_client, created_fa, fields={"image": _uploaded(), "caption": "Vue"}
            )

        assert resp.status_code == 201, resp.content
        assert resp.json()["caption"] == "Vue"

    def test_post_without_image_returns_400(self, api_client, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(api_client, created_fa, fields={"caption": "x"})
        assert resp.status_code == 400

    def test_post_non_image_returns_400(self, api_client, created_fa, media_root):
        bad = _uploaded("x.txt", b"not-an-image", "text/plain")
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(api_client, created_fa, fields={"image": bad})
        assert resp.status_code == 400

    def test_post_gif_returns_400(self, api_client, created_fa, media_root):
        gif = _uploaded("a.gif", _image_bytes(fmt="GIF"), "image/gif")
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(api_client, created_fa, fields={"image": gif})
        assert resp.status_code == 400

    def test_post_unknown_fa_returns_404(self, api_client, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = _post_photo(
                api_client, str(uuid.uuid4()), fields={"image": _uploaded()}
            )
        assert resp.status_code == 404

    def test_post_requires_authentication(self, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            resp = Client().post(
                f"/api/v1/fas/{created_fa}/photos/",
                data={"image": _uploaded()},
            )
        assert resp.status_code in (401, 403)


@pytest.mark.integration
@pytest.mark.django_db
class TestFaPhotosListAndDelete:
    def test_get_returns_ordered_list(self, api_client, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            _post_photo(api_client, created_fa, fields={"image": _uploaded("a.jpg")})
            _post_photo(api_client, created_fa, fields={"image": _uploaded("b.jpg")})
            resp = api_client.get(f"/api/v1/fas/{created_fa}/photos/")

        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert [p["order"] for p in data] == [0, 1]

    def test_delete_removes_photo(self, api_client, created_fa, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            created = _post_photo(api_client, created_fa, fields={"image": _uploaded()})
            photo_uuid = created.json()["uuid"]
            resp = api_client.delete(f"/api/v1/fas/{created_fa}/photos/{photo_uuid}/")
            after = api_client.get(f"/api/v1/fas/{created_fa}/photos/")

        assert resp.status_code == 204
        assert after.json() == []

    def test_delete_photo_of_other_fa_returns_404(
        self, api_client, created_fa, media_root
    ):
        """Le contrôle d'ownership empêche de supprimer la photo d'une autre FA."""
        with override_settings(MEDIA_ROOT=media_root):
            created = _post_photo(api_client, created_fa, fields={"image": _uploaded()})
            photo_uuid = created.json()["uuid"]
            resp = api_client.delete(f"/api/v1/fas/{uuid.uuid4()}/photos/{photo_uuid}/")

        assert resp.status_code == 404

    def test_delete_malformed_photo_uuid_returns_404(self, api_client, created_fa):
        """Un photo_uuid non-UUID renvoie 404 (et non 500)."""
        resp = api_client.delete(f"/api/v1/fas/{created_fa}/photos/not-a-uuid/")
        assert resp.status_code == 404
