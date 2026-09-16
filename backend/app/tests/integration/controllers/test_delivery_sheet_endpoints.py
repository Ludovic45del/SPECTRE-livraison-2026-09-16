"""Tests d'intégration pour les endpoints fiche de livraison (workflow 2 phases)."""

import io
import json
import shutil
import tempfile
import uuid

import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from PIL import Image

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity
from app.repository.steps.models.sealing_step_entity import SealingStepEntity

# Force-resolve la FK lazy `"app.UserProfileEntity"` référencée par BaseStepEntity.
# Sans ça, l'instanciation directe de MetrologyStepEntity dans les fixtures
# lève `isinstance() arg 2 must be a type` au moment où Django tente d'évaluer
# `field_default` contre `self.remote_field.model` encore non résolu.
from app.repository.user.models.user_profile_entity import UserProfileEntity


@pytest.fixture
def media_root(monkeypatch):
    """Isole MEDIA_ROOT dans un tmpdir (les signatures écrivent sur disque)."""
    tmp = tempfile.mkdtemp(prefix="spectre-delivery-endpoint-")
    monkeypatch.setattr("django.conf.settings.MEDIA_ROOT", tmp)
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (120, 60), (0, 0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def signed_validator(db, media_root):
    """Donne au `testuser` (api_client) un profil avec une signature.

    Requis depuis que la phase 2 impose la signature du validateur. Dépend de
    `media_root` pour écrire le fichier dans le tmpdir isolé.
    """
    user, _ = User.objects.get_or_create(username="testuser")
    profile, _ = UserProfileEntity.objects.get_or_create(
        user=user, defaults={"roles": ["iec"], "force_password_change": False}
    )
    if not profile.signature:
        profile.signature.save("sig.png", ContentFile(_png_bytes()), save=True)
    return profile


@pytest.fixture
def campaign(db):
    return CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"FCIAI Test {uuid.uuid4().hex[:6]}",
        year=2026,
        semester="S1",
    )


@pytest.fixture
def fsec(db, campaign):
    return FsecEntity.objects.create(
        version_uuid=str(uuid.uuid4()),
        fsec_uuid=str(uuid.uuid4()),
        name="2026-LMJ_FCIAI_1",
        campaign_id_id=campaign.uuid,
        status_id_id=0,
        category_id_id=0,
        is_active=True,
    )


@pytest.fixture
def sealing_step(db, fsec):
    """Étape de scellement liée au FSEC via une métrologie créée à la volée."""
    metro = MetrologyStepEntity(
        uuid=uuid.uuid4(),
        fsec_version_id=fsec,
    )
    metro.save()
    sealing = SealingStepEntity(
        uuid=uuid.uuid4(),
        metrology_step_id=metro,
        interface_io=None,
    )
    sealing.save()
    return sealing


@pytest.mark.integration
@pytest.mark.django_db
class TestDeliveryInfoEndpoint:
    """GET / PATCH /api/v1/fsecs/{uuid}/delivery-info/"""

    def test_get_initial_state(self, api_client, fsec, sealing_step):
        response = api_client.get(f"/api/v1/fsecs/{fsec.version_uuid}/delivery-info/")
        assert response.status_code == 200
        body = response.json()
        assert body["has_sealing_step"] is True
        assert body["num_interface_io"] is None
        assert body["delivery_date"] is None

    def test_patch_phase1_persists_date_and_interface_io(
        self, api_client, fsec, sealing_step
    ):
        response = api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-info/",
            data=json.dumps({"num_interface_io": "785", "delivery_date": "2026-05-14"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        sealing_step.refresh_from_db()
        fsec.refresh_from_db()
        assert sealing_step.interface_io == "785"
        assert str(fsec.delivery_date) == "2026-05-14"

    def test_patch_without_sealing_step_keeps_date(self, api_client, fsec):
        response = api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-info/",
            data=json.dumps({"num_interface_io": "785", "delivery_date": "2026-05-14"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        fsec.refresh_from_db()
        assert str(fsec.delivery_date) == "2026-05-14"
        assert response.json()["has_sealing_step"] is False


@pytest.mark.integration
@pytest.mark.django_db
class TestDeliveryValidationEndpoint:
    """PATCH /api/v1/fsecs/{uuid}/delivery-validation/"""

    def test_patch_phase2_stamps_signer(self, api_client, signed_validator, fsec):
        response = api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-validation/",
            data=json.dumps({"delivery_validation": "OK", "delivery_remarques": "RAS"}),
            content_type="application/json",
        )
        assert response.status_code == 200
        body = response.json()
        assert body["delivery_validation"] == "OK"
        assert body["delivery_remarques"] == "RAS"
        assert body["delivery_validated_by_username"] == "testuser"
        assert body["delivery_validated_at"] is not None

    def test_patch_phase2_without_signature_is_rejected(self, api_client, fsec):
        """Sans signature de profil, le validateur ne peut pas signer (400)."""
        response = api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-validation/",
            data=json.dumps({"delivery_validation": "OK"}),
            content_type="application/json",
        )
        assert response.status_code == 400
        fsec.refresh_from_db()
        assert fsec.delivery_validation is None


@pytest.mark.integration
@pytest.mark.django_db
class TestFsecDeliverySheetPDF:
    """POST /api/v1/fsecs/{uuid}/delivery-sheet/ (lecture depuis la base)"""

    def test_returns_pdf_using_persisted_data(
        self, api_client, signed_validator, fsec, sealing_step
    ):
        # Pré-renseigne phase 1 + 2 via les endpoints PATCH.
        api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-info/",
            data=json.dumps({"num_interface_io": "785", "delivery_date": "2026-05-14"}),
            content_type="application/json",
        )
        api_client.patch(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-validation/",
            data=json.dumps({"delivery_validation": "OK", "delivery_remarques": "GO3"}),
            content_type="application/json",
        )
        response = api_client.post(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-sheet/",
            data="{}",
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert response.content[:4] == b"%PDF"

    def test_returns_pdf_with_empty_data(self, api_client, fsec):
        response = api_client.post(
            f"/api/v1/fsecs/{fsec.version_uuid}/delivery-sheet/",
            data="{}",
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.content[:4] == b"%PDF"


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignDeliveryRecap:
    """GET / PATCH /api/v1/campaigns/{uuid}/delivery-recap/"""

    def test_get_recap_lists_all_fsecs(self, api_client, campaign, fsec):
        response = api_client.get(f"/api/v1/campaigns/{campaign.uuid}/delivery-recap/")
        assert response.status_code == 200
        body = response.json()
        assert len(body["targets"]) == 1
        assert body["targets"][0]["name"] == "2026-LMJ_FCIAI_1"

    def test_patch_recap_persists_batch(self, api_client, campaign, fsec, sealing_step):
        response = api_client.patch(
            f"/api/v1/campaigns/{campaign.uuid}/delivery-recap/",
            data=json.dumps(
                {
                    "targets": [
                        {
                            "version_uuid": fsec.version_uuid,
                            "num_interface_io": "785",
                            "delivery_date": "2026-05-14",
                            "delivery_validation": "OK",
                            "delivery_remarques": "GO3",
                        }
                    ]
                }
            ),
            content_type="application/json",
        )
        assert response.status_code == 200
        fsec.refresh_from_db()
        sealing_step.refresh_from_db()
        assert str(fsec.delivery_date) == "2026-05-14"
        assert sealing_step.interface_io == "785"
        assert fsec.delivery_validation == "OK"
        assert fsec.delivery_remarques == "GO3"

    def test_post_recap_pdf_uses_persisted_data(
        self, api_client, campaign, fsec, sealing_step
    ):
        api_client.patch(
            f"/api/v1/campaigns/{campaign.uuid}/delivery-recap/",
            data=json.dumps(
                {
                    "targets": [
                        {
                            "version_uuid": fsec.version_uuid,
                            "num_interface_io": "785",
                            "delivery_date": "2026-05-14",
                        }
                    ]
                }
            ),
            content_type="application/json",
        )
        response = api_client.post(
            f"/api/v1/campaigns/{campaign.uuid}/delivery-sheet/",
            data="",
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.content[:4] == b"%PDF"
