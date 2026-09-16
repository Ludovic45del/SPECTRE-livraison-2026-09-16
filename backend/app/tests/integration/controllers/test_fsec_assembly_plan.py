"""Tests d'intégration pour le plan d'assemblage annotable d'une FSEC.

Endpoints :
- PATCH/DELETE /api/v1/fsecs/{version_uuid}/assembly-plan/        (image)
- PUT         /api/v1/fsecs/{version_uuid}/assembly-plan-annotations/  (calque JSON)
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


def _put_annotations(api_client, url: str, annotations):
    """Helper : PUT JSON du calque d'annotations."""
    return api_client.put(
        url,
        data=json.dumps({"annotations": annotations}),
        content_type="application/json",
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
        name=f"Campaign Plan Test {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )


@pytest.fixture
def created_fsec(api_client, sample_campaign):
    """Crée un FSEC vierge et retourne son version_uuid."""
    payload = {
        "name": f"FSEC Plan {uuid.uuid4().hex[:8]}",
        "campaign_id": sample_campaign.uuid,
        "status_id": 0,
        "category_id": 0,
        "rack_id": None,
        "comments": "Test plan",
    }
    response = api_client.post(
        "/api/v1/fsecs/", data=json.dumps(payload), content_type="application/json"
    )
    assert response.status_code == 201, response.content
    return response.json()["version_uuid"]


def _make_png(width: int = 400, height: int = 300, color=(200, 200, 200)) -> bytes:
    """Génère un PNG en mémoire (plan = dessin au trait → PNG)."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=color).save(buf, format="PNG")
    return buf.getvalue()


# ── fixtures de calque (format réel du front : id + type + géométrie x1/y1…) ──
ARROW = {
    "id": "a1",
    "type": "arrow",
    "x1": 10,
    "y1": 20,
    "x2": 60,
    "y2": 70,
    "color": "#e53935",
}
TEXT = {
    "id": "t1",
    "type": "text",
    "x1": 30,
    "y1": 40,
    "text": "Vanne",
    "color": "#e53935",
}


@pytest.mark.integration
@pytest.mark.django_db
class TestAssemblyPlanImageUpload:
    """PATCH /fsecs/{version_uuid}/assembly-plan/"""

    def test_default_annotations_is_empty_list(self, api_client, created_fsec):
        """Un FSEC fraîchement créé a un calque vide (et pas de plan)."""
        response = api_client.get(f"/api/v1/fsecs/{created_fsec}/")
        data = response.json()
        assert data["assembly_plan_image"] is None
        assert data["assembly_plan_annotations"] == []

    def test_upload_png_sets_assembly_plan_image_url(
        self, api_client, created_fsec, media_root
    ):
        upload = SimpleUploadedFile("plan.png", _make_png(), content_type="image/png")
        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=upload,
            )

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["assembly_plan_image"] is not None
        assert "/media/fsec/assembly-plan/" in data["assembly_plan_image"]
        assert data["assembly_plan_image"].endswith(".png")

    def test_upload_replaces_previous_image(self, api_client, created_fsec, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            first = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=SimpleUploadedFile(
                    "a.png", _make_png(color=(10, 10, 10)), content_type="image/png"
                ),
            )
            second = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=SimpleUploadedFile(
                    "b.png", _make_png(color=(250, 250, 250)), content_type="image/png"
                ),
            )

        assert first.status_code == 200 and second.status_code == 200
        assert (
            first.json()["assembly_plan_image"] != second.json()["assembly_plan_image"]
        )

    def test_upload_preserves_existing_annotations(
        self, api_client, created_fsec, media_root
    ):
        """Remplacer/poser le plan ne doit PAS effacer les annotations."""
        with override_settings(MEDIA_ROOT=media_root):
            _put_annotations(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
                [ARROW],
            )
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=SimpleUploadedFile(
                    "p.png", _make_png(), content_type="image/png"
                ),
            )
        assert response.status_code == 200
        assert len(response.json()["assembly_plan_annotations"]) == 1

    def test_upload_rejects_non_image(self, api_client, created_fsec, media_root):
        bad = SimpleUploadedFile(
            "not-an-image.txt", b"hello world", content_type="text/plain"
        )
        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=bad,
            )
        assert response.status_code == 400

    def test_upload_404_on_unknown_fsec(self, api_client, media_root):
        fake = str(uuid.uuid4())
        with override_settings(MEDIA_ROOT=media_root):
            response = _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{fake}/assembly-plan/",
                image=SimpleUploadedFile(
                    "p.png", _make_png(), content_type="image/png"
                ),
            )
        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.django_db
class TestAssemblyPlanImageDelete:
    """DELETE /fsecs/{version_uuid}/assembly-plan/"""

    def test_delete_clears_image_and_annotations(
        self, api_client, created_fsec, media_root
    ):
        """La suppression du plan vide aussi le calque d'annotations."""
        with override_settings(MEDIA_ROOT=media_root):
            _patch_multipart(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan/",
                image=SimpleUploadedFile(
                    "p.png", _make_png(), content_type="image/png"
                ),
            )
            _put_annotations(
                api_client,
                f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
                [ARROW, TEXT],
            )
            response = api_client.delete(f"/api/v1/fsecs/{created_fsec}/assembly-plan/")

        assert response.status_code == 200
        data = response.json()
        assert data["assembly_plan_image"] is None
        assert data["assembly_plan_annotations"] == []

    def test_delete_idempotent_when_no_plan(self, api_client, created_fsec, media_root):
        with override_settings(MEDIA_ROOT=media_root):
            response = api_client.delete(f"/api/v1/fsecs/{created_fsec}/assembly-plan/")
        assert response.status_code == 200
        assert response.json()["assembly_plan_image"] is None


@pytest.mark.integration
@pytest.mark.django_db
class TestAssemblyPlanAnnotations:
    """PUT /fsecs/{version_uuid}/assembly-plan-annotations/"""

    def test_put_sets_annotations(self, api_client, created_fsec):
        response = _put_annotations(
            api_client,
            f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
            [ARROW, TEXT],
        )
        assert response.status_code == 200, response.content
        data = response.json()
        assert len(data["assembly_plan_annotations"]) == 2
        assert data["assembly_plan_annotations"][0]["id"] == "a1"

    def test_put_replaces_whole_layer(self, api_client, created_fsec):
        """Sémantique PUT : le second envoi remplace intégralement le calque."""
        url = f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/"
        _put_annotations(api_client, url, [ARROW, TEXT])
        response = _put_annotations(api_client, url, [ARROW])
        assert response.status_code == 200
        assert len(response.json()["assembly_plan_annotations"]) == 1

    def test_put_empty_list_clears_layer(self, api_client, created_fsec):
        url = f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/"
        _put_annotations(api_client, url, [ARROW])
        response = _put_annotations(api_client, url, [])
        assert response.status_code == 200
        assert response.json()["assembly_plan_annotations"] == []

    def test_put_rejects_non_list(self, api_client, created_fsec):
        response = api_client.put(
            f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
            data=json.dumps({"annotations": {"not": "a list"}}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_put_rejects_annotation_without_id(self, api_client, created_fsec):
        response = _put_annotations(
            api_client,
            f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
            [{"type": "arrow", "x1": 0, "y1": 0, "x2": 1, "y2": 1}],
        )
        assert response.status_code == 400

    def test_put_rejects_annotation_without_type(self, api_client, created_fsec):
        response = _put_annotations(
            api_client,
            f"/api/v1/fsecs/{created_fsec}/assembly-plan-annotations/",
            [{"id": "x1"}],
        )
        assert response.status_code == 400

    def test_put_404_on_unknown_fsec(self, api_client):
        fake = str(uuid.uuid4())
        response = _put_annotations(
            api_client,
            f"/api/v1/fsecs/{fake}/assembly-plan-annotations/",
            [ARROW],
        )
        assert response.status_code == 404
