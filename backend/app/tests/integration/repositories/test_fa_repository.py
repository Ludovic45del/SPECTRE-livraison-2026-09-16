"""
Tests d'intégration pour le repository FA.

Ces tests utilisent la base de données Django pour vérifier
les opérations CRUD réelles sur les FA.
"""

import io
import os
import uuid
from datetime import date

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.fa.models.fa_bean import FaBean
from app.domain.fsec.models.fsec_bean import FsecBean
from app.repository.campaign.repositories.campaign_repository import CampaignRepository
from app.repository.fa.models.fa_photo_entity import FaPhotoEntity
from app.repository.fa.repositories.fa_photo_repository import FaPhotoRepository
from app.repository.fa.repositories.fa_repository import FaRepository
from app.repository.fsec.repositories.fsec_repository import FsecRepository


def _png_upload(name="photo.png"):
    """Construit un vrai PNG en mémoire pour les tests d'upload ImageField."""
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), "red").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@pytest.fixture
def fa_repository():
    """Instance du repository FA."""
    return FaRepository()


@pytest.fixture
def test_fsec_version_id():
    """Crée l'arbre Campaign -> FSEC pour avoir un FSEC version id valide."""
    # 1. Créer une campagne
    campaign_repo = CampaignRepository()
    campaign_bean = CampaignBean(
        type_id=0,
        status_id=0,
        installation_id=0,
        name=f"Campagne Test FA {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )
    campaign = campaign_repo.create(campaign_bean)

    # 2. Créer une FSEC
    fsec_repo = FsecRepository()
    fsec_bean = FsecBean(
        campaign_id=campaign.uuid,
        fsec_uuid=str(uuid.uuid4()),
        status_id=0,
        category_id=0,
        rack_id=0,
        name=f"FSEC Test FA {uuid.uuid4().hex[:8]}",
        is_active=True,
    )
    fsec = fsec_repo.create(fsec_bean)

    return fsec.version_uuid


@pytest.fixture
def sample_fa_data(test_fsec_version_id):
    """Données de FA pour les tests."""
    return {
        "fsec_version_id": test_fsec_version_id,
        "status_id": 0,  # Open
        "type_id": 1,
        "criticality_id": 2,
        "identifier": f"FA_2025_Test_{uuid.uuid4().hex[:8]}",
        "fsec_step_id": 3,
        "discoverer": "Intégration Test",
        "event_date": date.today(),
        "observation": "Test d'intégration CRUD",
        "quick_analysis": "Tout semble correct",
    }


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryCreate:
    """Tests création de FA."""

    def test_create_fa_success(self, fa_repository, sample_fa_data):
        """Test création réussie d'une FA."""
        bean = FaBean(**sample_fa_data)
        result = fa_repository.create(bean)

        assert result.uuid is not None
        assert result.identifier == sample_fa_data["identifier"]
        assert result.status_id == 0

    def test_create_fa_generates_uuid_and_timestamps(
        self, fa_repository, sample_fa_data
    ):
        """Test que l'UUID et les dates sont générés automatiquement."""
        bean = FaBean(**sample_fa_data)
        result = fa_repository.create(bean)

        assert result.uuid is not None
        assert len(result.uuid) == 36
        assert result.created_at is not None
        assert result.last_updated is not None

    def test_create_duplicate_identifier_raises_conflict(
        self, fa_repository, sample_fa_data
    ):
        """Collision sur identifier (course de séquence) → ConflictException (409), pas 500."""
        from app.domain.exceptions import ConflictException

        fa_repository.create(FaBean(**sample_fa_data))
        duplicate = FaBean(**sample_fa_data)  # même identifier

        with pytest.raises(ConflictException):
            fa_repository.create(duplicate)


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryRead:
    """Tests lecture de FA."""

    def test_get_by_uuid_success(self, fa_repository, sample_fa_data):
        """Test récupération par UUID."""
        bean = FaBean(**sample_fa_data)
        created = fa_repository.create(bean)

        result = fa_repository.get_by_uuid(created.uuid)

        assert result is not None
        assert result.uuid == created.uuid
        assert result.identifier == created.identifier

    def test_get_by_uuid_not_found(self, fa_repository):
        """Test récupération UUID inexistant retourne None."""
        fake_uuid = str(uuid.uuid4())
        result = fa_repository.get_by_uuid(fake_uuid)
        assert result is None

    def test_get_all_paginated(self, fa_repository, sample_fa_data):
        """Test récupération paginée."""
        # Créer 3 FA
        for i in range(3):
            campaign = CampaignRepository().create(
                CampaignBean(
                    type_id=0,
                    status_id=0,
                    installation_id=0,
                    name=f"C {i} {uuid.uuid4().hex[:8]}",
                    year=2025,
                    semester="S1",
                )
            )
            fsec = FsecRepository().create(
                FsecBean(
                    campaign_id=campaign.uuid,
                    fsec_uuid=str(uuid.uuid4()),
                    status_id=0,
                    category_id=0,
                    rack_id=0,
                    name=f"F {i} {uuid.uuid4().hex[:8]}",
                    is_active=True,
                )
            )

            data = sample_fa_data.copy()
            data["fsec_version_id"] = fsec.version_uuid
            data["identifier"] = f"FA_2025_All_{i}_{uuid.uuid4().hex[:8]}"
            fa_repository.create(FaBean(**data))

        result = fa_repository.get_all(limit=2, offset=0)
        assert len(result) == 2

        count = fa_repository.count_all()
        assert count >= 3


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryUpdate:
    """Tests mise à jour de FA."""

    def test_update_fa_success(self, fa_repository, sample_fa_data):
        """Test mise à jour réussie."""
        bean = FaBean(**sample_fa_data)
        created = fa_repository.create(bean)

        created.observation = "Observation Modifiée"
        created.cause = "Cause Identifiée"

        result = fa_repository.update(created)

        assert result.observation == "Observation Modifiée"
        assert result.cause == "Cause Identifiée"

    def test_update_preserves_uuid_and_fsec(self, fa_repository, sample_fa_data):
        """Test update ne casse pas les FK clés."""
        bean = FaBean(**sample_fa_data)
        created = fa_repository.create(bean)

        created.discoverer = "Nouveau Discoverer"
        result = fa_repository.update(created)

        assert result.uuid == created.uuid
        assert result.fsec_version_id == created.fsec_version_id


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryDelete:
    """Tests suppression de FA."""

    def test_delete_fa_success(self, fa_repository, sample_fa_data):
        """Test suppression réussie — HARD delete : la ligne disparaît de la base."""
        from app.repository.fa.models.fa_entity import FaEntity

        bean = FaBean(**sample_fa_data)
        created = fa_repository.create(bean)

        result = fa_repository.delete(created.uuid)

        assert result is True
        assert fa_repository.get_by_uuid(created.uuid) is None
        # Hard delete (et non soft-delete) : aucune ligne résiduelle en base.
        assert not FaEntity.objects.filter(uuid=created.uuid).exists()

    def test_delete_fa_not_found(self, fa_repository):
        """Test suppression d'un UUID inexistant retourne False."""
        fake_uuid = str(uuid.uuid4())
        result = fa_repository.delete(fake_uuid)
        assert result is False


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryGetBySlug:
    """Tests résolution d'une FA par son slug d'URL (slugify de l'identifier)."""

    def test_get_by_slug_roundtrip(self, fa_repository, sample_fa_data):
        from app.domain.shared.slug import slugify_text

        created = fa_repository.create(FaBean(**sample_fa_data))
        slug = slugify_text(created.identifier)

        resolved = fa_repository.get_by_slug(slug)

        assert resolved is not None
        assert resolved.uuid == created.uuid

    def test_get_by_slug_unknown_returns_none(self, fa_repository):
        assert fa_repository.get_by_slug("fa-inexistante-9999") is None


@pytest.mark.integration
@pytest.mark.django_db
class TestFaRepositoryMaxSequence:
    """Génération de séquence d'identifiant (anti-collision après hard delete)."""

    def test_zero_when_no_fa(self, fa_repository, test_fsec_version_id):
        assert fa_repository.max_sequence_by_fsec_version_id(test_fsec_version_id) == 0

    def test_returns_max_suffix(self, fa_repository, sample_fa_data):
        fsec_vid = sample_fa_data["fsec_version_id"]
        for seq in (1, 2, 3):
            data = sample_fa_data.copy()
            data["identifier"] = f"FA_2025_Camp_FSEC_{seq:02d}"
            fa_repository.create(FaBean(**data))

        assert fa_repository.max_sequence_by_fsec_version_id(fsec_vid) == 3

    def test_uses_trailing_suffix_not_digits_in_name(
        self, fa_repository, sample_fa_data
    ):
        """La regex ne doit matcher que le suffixe _NN final, pas des chiffres du nom."""
        fsec_vid = sample_fa_data["fsec_version_id"]
        data = sample_fa_data.copy()
        data["identifier"] = "FA_2025_Camp_FSEC123_07"
        fa_repository.create(FaBean(**data))

        assert fa_repository.max_sequence_by_fsec_version_id(fsec_vid) == 7

    def test_after_delete_does_not_regress(self, fa_repository, sample_fa_data):
        """Après suppression de _02 sur _01/_02/_03, le max reste 3 (pas de réutilisation)."""
        fsec_vid = sample_fa_data["fsec_version_id"]
        created = []
        for seq in (1, 2, 3):
            data = sample_fa_data.copy()
            data["identifier"] = f"FA_2025_Camp_FSEC_{seq:02d}"
            created.append(fa_repository.create(FaBean(**data)))

        fa_repository.delete(created[1].uuid)  # supprime _02

        assert fa_repository.max_sequence_by_fsec_version_id(fsec_vid) == 3


@pytest.mark.integration
@pytest.mark.django_db
class TestFaPhotoRepository:
    """Galerie photos : ordre, suppression du fichier disque, CASCADE au hard delete."""

    @pytest.fixture
    def fa(self, fa_repository, sample_fa_data):
        return fa_repository.create(FaBean(**sample_fa_data))

    def test_add_increments_order(self, fa, tmp_path, settings):
        settings.MEDIA_ROOT = str(tmp_path)
        repo = FaPhotoRepository()

        p1 = repo.add(fa.uuid, _png_upload("a.png"), None)
        p2 = repo.add(fa.uuid, _png_upload("b.png"), "légende")

        assert p1.order == 0
        assert p2.order == 1
        assert p2.caption == "légende"
        assert p1.image_url  # URL servie via MEDIA_URL

    def test_list_by_fa_ordered(self, fa, tmp_path, settings):
        settings.MEDIA_ROOT = str(tmp_path)
        repo = FaPhotoRepository()
        repo.add(fa.uuid, _png_upload("a.png"), None)
        repo.add(fa.uuid, _png_upload("b.png"), None)

        photos = repo.list_by_fa(fa.uuid)

        assert [p.order for p in photos] == [0, 1]

    def test_delete_removes_row_and_file(self, fa, tmp_path, settings):
        settings.MEDIA_ROOT = str(tmp_path)
        repo = FaPhotoRepository()
        photo = repo.add(fa.uuid, _png_upload("a.png"), None)
        path = FaPhotoEntity.objects.get(uuid=photo.uuid).image.path
        assert os.path.exists(path)

        assert repo.delete(photo.uuid) is True

        assert not FaPhotoEntity.objects.filter(uuid=photo.uuid).exists()
        assert not os.path.exists(path)  # fichier nettoyé (pas d'orphelin)

    def test_delete_unknown_returns_false(self, tmp_path, settings):
        settings.MEDIA_ROOT = str(tmp_path)
        assert FaPhotoRepository().delete(str(uuid.uuid4())) is False

    def test_hard_delete_fa_cascades_photos_and_files(
        self, fa, fa_repository, tmp_path, settings
    ):
        """Supprimer la FA supprime ses photos (CASCADE) ET leurs fichiers disque."""
        settings.MEDIA_ROOT = str(tmp_path)
        repo = FaPhotoRepository()
        photo = repo.add(fa.uuid, _png_upload("a.png"), None)
        path = FaPhotoEntity.objects.get(uuid=photo.uuid).image.path
        assert os.path.exists(path)

        fa_repository.delete(fa.uuid)

        assert not FaPhotoEntity.objects.filter(uuid=photo.uuid).exists()
        assert not os.path.exists(path)
