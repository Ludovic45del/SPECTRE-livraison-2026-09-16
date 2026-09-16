"""
Tests unitaires pour le service Campaign.

Ces tests vérifient la logique métier pure sans dépendance à la BD.
Utilise des mocks pour isoler le service des repositories.
"""

import uuid
from datetime import date
from unittest.mock import MagicMock, create_autospec, patch

import pytest

from app.domain.campaign.interface.campaign_repository import ICampaignRepository
from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.campaign.services import campaign_service
from app.domain.campaign.services.campaign_service import (
    ALLOWED_PATCH_FIELDS,
    DEFAULT_CAMPAIGN_STATUS_ID,
    FIELD_TYPES,
    _merge_partial_data,
    _validate_date_range,
    count_all_campaigns,
    create_campaign,
    delete_campaign,
    get_all_campaigns,
    get_campaign_by_uuid,
    patch_campaign,
    update_campaign,
)
from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.fa.services import fa_service
from app.domain.fsec.interface.fsec_repository import IFsecRepository


class TestCampaignServiceCreate:
    """Tests pour la création de campagne."""

    @pytest.mark.unit
    def test_create_campaign_success(
        self, sample_campaign_bean, mock_campaign_repository
    ):
        """Test création réussie d'une campagne."""
        mock_campaign_repository.create.return_value = sample_campaign_bean

        result = create_campaign(mock_campaign_repository, sample_campaign_bean)

        assert result.uuid == sample_campaign_bean.uuid
        assert result.name == sample_campaign_bean.name
        mock_campaign_repository.exists_by_name_year_semester.assert_called_once_with(
            sample_campaign_bean.name,
            sample_campaign_bean.year,
            sample_campaign_bean.semester,
        )
        mock_campaign_repository.create.assert_called_once_with(sample_campaign_bean)

    @pytest.mark.unit
    def test_create_campaign_duplicate_raises_conflict(self, sample_campaign_bean):
        """Test qu'un doublon lève ConflictException."""
        mock_repo = MagicMock()
        mock_repo.exists_by_name_year_semester.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_campaign(mock_repo, sample_campaign_bean)

        assert "name/year/semester" in str(exc_info.value)
        mock_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_campaign_invalid_date_range(self):
        """Test qu'une date de début > date de fin lève ValidationException."""
        mock_repo = MagicMock()
        mock_repo.exists_by_name_year_semester.return_value = False
        bean = CampaignBean(
            uuid=str(uuid.uuid4()),
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Campagne Dates Invalides",
            year=2025,
            semester="S1",
            start_date=date(2025, 6, 30),
            end_date=date(2025, 1, 15),
            dtri_number=None,
            description=None,
        )

        with pytest.raises(ValidationException):
            create_campaign(mock_repo, bean)

        mock_repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_campaign_defaults_status_id_when_missing(self):
        """Si status_id est None, le service applique le statut par défaut (Brouillon).

        Régression : le formulaire de création côté frontend n'expose pas le
        champ status_id, ce qui provoquait un IntegrityError NOT NULL en base.
        """
        mock_repo = MagicMock()
        mock_repo.exists_by_name_year_semester.return_value = False
        bean = CampaignBean(
            uuid=str(uuid.uuid4()),
            type_id=0,
            status_id=None,
            installation_id=0,
            name="Campagne Sans Statut",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )
        mock_repo.create.return_value = bean

        create_campaign(mock_repo, bean)

        assert bean.status_id == DEFAULT_CAMPAIGN_STATUS_ID
        created_bean = mock_repo.create.call_args.args[0]
        assert created_bean.status_id == DEFAULT_CAMPAIGN_STATUS_ID

    @pytest.mark.unit
    def test_create_campaign_preserves_explicit_status_id(self):
        """Si status_id est fourni explicitement, il n'est pas écrasé."""
        mock_repo = MagicMock()
        mock_repo.exists_by_name_year_semester.return_value = False
        bean = CampaignBean(
            uuid=str(uuid.uuid4()),
            type_id=0,
            status_id=2,
            installation_id=0,
            name="Campagne En Réalisation",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )
        mock_repo.create.return_value = bean

        create_campaign(mock_repo, bean)

        assert bean.status_id == 2
        created_bean = mock_repo.create.call_args.args[0]
        assert created_bean.status_id == 2


class TestCampaignServiceGet:
    """Tests pour la récupération de campagne."""

    @pytest.mark.unit
    def test_get_campaign_by_uuid_success(self, sample_campaign_bean):
        """Test récupération réussie par UUID."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean

        result = get_campaign_by_uuid(mock_repo, sample_campaign_bean.uuid)

        assert result.uuid == sample_campaign_bean.uuid
        mock_repo.get_by_uuid.assert_called_once_with(sample_campaign_bean.uuid)

    @pytest.mark.unit
    def test_get_campaign_by_uuid_not_found(self):
        """Test qu'un UUID inexistant lève NotFoundException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_by_uuid(mock_repo, fake_uuid)

        assert fake_uuid in str(exc_info.value)
        assert "Campaign" in str(exc_info.value)

    @pytest.mark.unit
    def test_get_all_campaigns(self, sample_campaign_bean):
        """Test récupération de toutes les campagnes."""
        mock_repo = MagicMock()
        mock_repo.get_all.return_value = [sample_campaign_bean, sample_campaign_bean]

        result = get_all_campaigns(mock_repo)

        assert len(result) == 2
        mock_repo.get_all.assert_called_once()


class TestCampaignServiceUpdate:
    """Tests pour la mise à jour de campagne."""

    @pytest.mark.unit
    def test_update_campaign_success(self, sample_campaign_bean):
        """Test mise à jour réussie."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean
        updated_bean = CampaignBean(
            uuid=sample_campaign_bean.uuid,
            type_id=1,  # Changé
            status_id=1,  # Changé
            installation_id=sample_campaign_bean.installation_id,
            name="Campagne Modifiée",  # Changé
            year=sample_campaign_bean.year,
            semester=sample_campaign_bean.semester,
            start_date=sample_campaign_bean.start_date,
            end_date=sample_campaign_bean.end_date,
            dtri_number=sample_campaign_bean.dtri_number,
            description="Description modifiée",
        )
        mock_repo.update.return_value = updated_bean
        mock_repo.exists_duplicate.return_value = False

        result = update_campaign(mock_repo, updated_bean)

        assert result.name == "Campagne Modifiée"
        assert result.type_id == 1
        mock_repo.update.assert_called_once()

    @pytest.mark.unit
    def test_update_campaign_conflict(self, sample_campaign_bean):
        """Test qu'une mise à jour créant un doublon lève ConflictException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean

        updated_bean = CampaignBean(
            uuid=sample_campaign_bean.uuid,
            type_id=1,
            status_id=1,
            installation_id=0,
            name="Nom Doublon",  # Changé
            year=sample_campaign_bean.year,
            semester=sample_campaign_bean.semester,
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )

        # Simule qu'un autre enregistrement avec ce nom existe déjà
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException):
            update_campaign(mock_repo, updated_bean)

        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_update_campaign_not_found(self):
        """Test que la mise à jour d'une campagne inexistante lève NotFoundException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        fake_bean = CampaignBean(
            uuid=str(uuid.uuid4()),
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Inexistante",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )

        with pytest.raises(NotFoundException):
            update_campaign(mock_repo, fake_bean)

        mock_repo.update.assert_not_called()


class TestCampaignFaIdentifierRegeneration:
    """Réalignement des identifiants FA quand le nom/année de la campagne change.

    Le « nom » d'une FA encode (année, campagne, nom FSEC, séquence) : un
    renommage de campagne (ou un changement d'année) doit propager aux FA de
    toutes ses FSEC. Le semestre n'entre pas dans l'identifiant FA : un simple
    changement de semestre ne doit donc rien régénérer.
    """

    def _existing(self) -> CampaignBean:
        return CampaignBean(
            uuid="cccccccc-cccc-cccc-cccc-cccccccccccc",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Ancienne",
            year=2025,
            semester="S1",
        )

    def _repo_for(self, existing: CampaignBean):
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.side_effect = lambda b: b
        return mock_repo

    @pytest.mark.unit
    def test_update_name_change_triggers_regeneration(self):
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        fa_repo, fsec_repo = MagicMock(), MagicMock()
        updated = CampaignBean(
            uuid=existing.uuid, name="Nouvelle", year=2025, semester="S1"
        )

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            update_campaign(mock_repo, updated, fa_repo, fsec_repo)

        regen.assert_called_once_with(
            fa_repo, fsec_repo, existing.uuid, "Nouvelle", 2025
        )

    @pytest.mark.unit
    def test_update_year_change_triggers_regeneration(self):
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        fa_repo, fsec_repo = MagicMock(), MagicMock()
        updated = CampaignBean(
            uuid=existing.uuid, name="Ancienne", year=2026, semester="S1"
        )

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            update_campaign(mock_repo, updated, fa_repo, fsec_repo)

        regen.assert_called_once_with(
            fa_repo, fsec_repo, existing.uuid, "Ancienne", 2026
        )

    @pytest.mark.unit
    def test_update_semester_only_change_skips_regeneration(self):
        """Le semestre n'est pas dans l'identifiant FA : aucune régénération."""
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        fa_repo, fsec_repo = MagicMock(), MagicMock()
        updated = CampaignBean(
            uuid=existing.uuid, name="Ancienne", year=2025, semester="S2"
        )

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            update_campaign(mock_repo, updated, fa_repo, fsec_repo)

        regen.assert_not_called()

    @pytest.mark.unit
    def test_update_without_repos_skips_regeneration(self):
        """Sans repos FA/FSEC (appel legacy), aucune régénération n'est tentée."""
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        updated = CampaignBean(
            uuid=existing.uuid, name="Nouvelle", year=2025, semester="S1"
        )

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            update_campaign(mock_repo, updated)

        regen.assert_not_called()

    @pytest.mark.unit
    def test_patch_name_change_triggers_regeneration(self):
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        fa_repo, fsec_repo = MagicMock(), MagicMock()

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            patch_campaign(
                mock_repo,
                existing.uuid,
                {"name": "Nouvelle"},
                fa_repository=fa_repo,
                fsec_repository=fsec_repo,
            )

        regen.assert_called_once_with(
            fa_repo, fsec_repo, existing.uuid, "Nouvelle", 2025
        )

    @pytest.mark.unit
    def test_patch_non_identifying_field_skips_regeneration(self):
        """Un PATCH qui ne touche ni nom ni année ne régénère rien."""
        existing = self._existing()
        mock_repo = self._repo_for(existing)
        fa_repo, fsec_repo = MagicMock(), MagicMock()

        with patch.object(
            fa_service, "regenerate_fa_identifiers_for_campaign"
        ) as regen:
            patch_campaign(
                mock_repo,
                existing.uuid,
                {"status_id": 1},
                fa_repository=fa_repo,
                fsec_repository=fsec_repo,
            )

        regen.assert_not_called()


class TestCampaignServiceDelete:
    """Tests pour la suppression de campagne."""

    @pytest.mark.unit
    def test_delete_campaign_success(self, sample_campaign_bean):
        """Test suppression réussie."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean
        mock_repo.delete.return_value = True
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_campaign_id.return_value = []

        result = delete_campaign(mock_repo, sample_campaign_bean.uuid, mock_fsec_repo)

        assert result is True
        mock_repo.get_by_uuid.assert_called_once_with(sample_campaign_bean.uuid)
        mock_repo.delete.assert_called_once_with(sample_campaign_bean.uuid)

    @pytest.mark.unit
    def test_delete_campaign_not_found(self):
        """Test que la suppression d'une campagne inexistante lève NotFoundException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        mock_fsec_repo = MagicMock()
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            delete_campaign(mock_repo, fake_uuid, mock_fsec_repo)

        mock_repo.delete.assert_not_called()

    @pytest.mark.unit
    def test_delete_campaign_with_linked_fsecs(self, sample_campaign_bean):
        """Test que la suppression avec FSECs rattachés lève ValidationException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_campaign_id.return_value = [MagicMock()]

        with pytest.raises(ValidationException):
            delete_campaign(
                mock_repo,
                sample_campaign_bean.uuid,
                fsec_repository=mock_fsec_repo,
            )

        mock_repo.delete.assert_not_called()

    @pytest.mark.unit
    def test_delete_campaign_cascades_teams_and_documents(self, sample_campaign_bean):
        """Les membres d'équipe et documents (FK PROTECT) sont supprimés avant la
        campagne — sinon Django lève ProtectedError -> 500 (régression couloirs)."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean
        mock_repo.delete.return_value = True
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_campaign_id.return_value = []
        mock_teams_repo = MagicMock()
        mock_teams_repo.get_by_campaign_uuid.return_value = [
            MagicMock(uuid="team-1"),
            MagicMock(uuid="team-2"),
        ]
        mock_docs_repo = MagicMock()
        mock_docs_repo.get_by_campaign_uuid.return_value = [MagicMock(uuid="doc-1")]

        result = delete_campaign(
            mock_repo,
            sample_campaign_bean.uuid,
            fsec_repository=mock_fsec_repo,
            teams_repository=mock_teams_repo,
            documents_repository=mock_docs_repo,
        )

        assert result is True
        assert mock_teams_repo.delete.call_count == 2
        mock_teams_repo.delete.assert_any_call("team-1")
        mock_teams_repo.delete.assert_any_call("team-2")
        mock_docs_repo.delete.assert_called_once_with("doc-1")
        mock_repo.delete.assert_called_once_with(sample_campaign_bean.uuid)

    @pytest.mark.unit
    def test_delete_campaign_with_fsecs_does_not_touch_children(
        self, sample_campaign_bean
    ):
        """Le blocage FSEC intervient AVANT toute suppression d'enfant."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_campaign_bean
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.get_by_campaign_id.return_value = [MagicMock()]
        mock_teams_repo = MagicMock()
        mock_docs_repo = MagicMock()

        with pytest.raises(ValidationException):
            delete_campaign(
                mock_repo,
                sample_campaign_bean.uuid,
                fsec_repository=mock_fsec_repo,
                teams_repository=mock_teams_repo,
                documents_repository=mock_docs_repo,
            )

        mock_teams_repo.delete.assert_not_called()
        mock_docs_repo.delete.assert_not_called()
        mock_repo.delete.assert_not_called()


class TestCampaignServiceCount:
    """Tests pour le comptage de campagnes."""

    @pytest.mark.unit
    def test_count_all_campaigns(self):
        """Test comptage total."""
        mock_repo = MagicMock()
        mock_repo.count_all.return_value = 42

        result = count_all_campaigns(mock_repo)

        assert result == 42
        mock_repo.count_all.assert_called_once()


# ============================================================================
# MUTATION-KILLING TESTS
# ============================================================================


class TestModuleLogger:
    """Tests pour le logger du module."""

    @pytest.mark.unit
    def test_logger_exists(self):
        """Vérifie que le logger du module est défini."""
        assert campaign_service.logger is not None

    @pytest.mark.unit
    def test_logger_name(self):
        """Vérifie que le logger porte le bon nom de module."""
        assert (
            campaign_service.logger.name
            == "app.domain.campaign.services.campaign_service"
        )


class TestAllowedPatchFields:
    """Tests vérifiant le contenu exact de ALLOWED_PATCH_FIELDS pour tuer les mutants
    qui renomment les noms de champs (ex: 'semester' -> 'XXsemesterXX')."""

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_name(self):
        assert "name" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_year(self):
        assert "year" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_semester(self):
        assert "semester" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_type_id(self):
        assert "type_id" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_status_id(self):
        assert "status_id" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_installation_id(self):
        assert "installation_id" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_start_date(self):
        assert "start_date" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_end_date(self):
        assert "end_date" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_dtri_number(self):
        assert "dtri_number" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_contains_description(self):
        assert "description" in ALLOWED_PATCH_FIELDS

    @pytest.mark.unit
    def test_allowed_patch_fields_count(self):
        """Vérifie qu'il n'y a que 10 champs autorisés (détecte ajout/suppression)."""
        assert len(ALLOWED_PATCH_FIELDS) == 10

    @pytest.mark.unit
    def test_allowed_patch_fields_rejects_unknown_field(self):
        """Vérifie qu'un champ non autorisé n'est pas dans l'ensemble."""
        assert "uuid" not in ALLOWED_PATCH_FIELDS
        assert "created_at" not in ALLOWED_PATCH_FIELDS
        assert "last_updated" not in ALLOWED_PATCH_FIELDS


class TestFieldTypes:
    """Tests vérifiant le contenu exact de FIELD_TYPES pour tuer les mutants
    qui renomment les clés du dictionnaire."""

    @pytest.mark.unit
    def test_field_types_name_is_str(self):
        assert FIELD_TYPES["name"] is str

    @pytest.mark.unit
    def test_field_types_year_is_int(self):
        assert FIELD_TYPES["year"] is int

    @pytest.mark.unit
    def test_field_types_semester_is_str(self):
        assert FIELD_TYPES["semester"] is str

    @pytest.mark.unit
    def test_field_types_type_id_allows_int_or_none(self):
        assert FIELD_TYPES["type_id"] == (int, type(None))

    @pytest.mark.unit
    def test_field_types_status_id_allows_int_or_none(self):
        assert FIELD_TYPES["status_id"] == (int, type(None))

    @pytest.mark.unit
    def test_field_types_installation_id_allows_int_or_none(self):
        assert FIELD_TYPES["installation_id"] == (int, type(None))

    @pytest.mark.unit
    def test_field_types_start_date_allows_date_or_none(self):
        assert FIELD_TYPES["start_date"] == (date, type(None))

    @pytest.mark.unit
    def test_field_types_end_date_allows_date_or_none(self):
        assert FIELD_TYPES["end_date"] == (date, type(None))

    @pytest.mark.unit
    def test_field_types_dtri_number_allows_int_or_none(self):
        assert FIELD_TYPES["dtri_number"] == (int, type(None))

    @pytest.mark.unit
    def test_field_types_description_allows_str_or_none(self):
        assert FIELD_TYPES["description"] == (str, type(None))

    @pytest.mark.unit
    def test_field_types_count(self):
        """Vérifie qu'il y a exactement 10 entrées de types."""
        assert len(FIELD_TYPES) == 10


class TestPatchCampaignEachField:
    """Tests pour le patch de chaque champ individuel dans ALLOWED_PATCH_FIELDS.
    Tue les mutants qui renomment un champ dans l'ensemble."""

    def _make_existing_bean(self) -> CampaignBean:
        """Crée un bean existant avec des valeurs de base pour les tests de patch."""
        return CampaignBean(
            uuid="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Original",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            dtri_number=100,
            description="Description originale",
        )

    def _make_mock_repo(self, existing_bean: CampaignBean):
        """Crée un mock repo configuré pour un patch réussi."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing_bean
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.side_effect = lambda b: b
        return mock_repo

    @pytest.mark.unit
    def test_patch_field_name(self):
        """Test que le champ 'name' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"name": "Nouveau Nom"})

        assert result.name == "Nouveau Nom"
        mock_repo.update.assert_called_once()

    @pytest.mark.unit
    def test_patch_field_year(self):
        """Test que le champ 'year' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"year": 2026})

        assert result.year == 2026

    @pytest.mark.unit
    def test_patch_field_semester(self):
        """Test que le champ 'semester' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"semester": "S2"})

        assert result.semester == "S2"

    @pytest.mark.unit
    def test_patch_field_type_id(self):
        """Test que le champ 'type_id' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"type_id": 5})

        assert result.type_id == 5

    @pytest.mark.unit
    def test_patch_field_type_id_to_none(self):
        """Test que le champ 'type_id' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"type_id": None})

        assert result.type_id is None

    @pytest.mark.unit
    def test_patch_field_status_id(self):
        """Test que le champ 'status_id' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"status_id": 3})

        assert result.status_id == 3

    @pytest.mark.unit
    def test_patch_field_status_id_to_none(self):
        """Test que le champ 'status_id' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"status_id": None})

        assert result.status_id is None

    @pytest.mark.unit
    def test_patch_field_installation_id(self):
        """Test que le champ 'installation_id' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"installation_id": 7})

        assert result.installation_id == 7

    @pytest.mark.unit
    def test_patch_field_installation_id_to_none(self):
        """Test que le champ 'installation_id' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"installation_id": None})

        assert result.installation_id is None

    @pytest.mark.unit
    def test_patch_field_start_date(self):
        """Test que le champ 'start_date' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        new_date = date(2025, 3, 15)
        result = patch_campaign(mock_repo, bean.uuid, {"start_date": new_date})

        assert result.start_date == new_date

    @pytest.mark.unit
    def test_patch_field_start_date_to_none(self):
        """Test que le champ 'start_date' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"start_date": None})

        assert result.start_date is None

    @pytest.mark.unit
    def test_patch_field_end_date(self):
        """Test que le champ 'end_date' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        new_date = date(2025, 11, 30)
        result = patch_campaign(mock_repo, bean.uuid, {"end_date": new_date})

        assert result.end_date == new_date

    @pytest.mark.unit
    def test_patch_field_end_date_to_none(self):
        """Test que le champ 'end_date' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"end_date": None})

        assert result.end_date is None

    @pytest.mark.unit
    def test_patch_field_dtri_number(self):
        """Test que le champ 'dtri_number' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"dtri_number": 99999})

        assert result.dtri_number == 99999

    @pytest.mark.unit
    def test_patch_field_dtri_number_to_none(self):
        """Test que le champ 'dtri_number' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"dtri_number": None})

        assert result.dtri_number is None

    @pytest.mark.unit
    def test_patch_field_description(self):
        """Test que le champ 'description' peut être patché."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"description": "Nouvelle desc"})

        assert result.description == "Nouvelle desc"

    @pytest.mark.unit
    def test_patch_field_description_to_none(self):
        """Test que le champ 'description' peut être patché à None."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(mock_repo, bean.uuid, {"description": None})

        assert result.description is None

    @pytest.mark.unit
    def test_patch_ignores_unknown_field(self):
        """Test que les champs non autorisés sont ignorés silencieusement."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(
            mock_repo, bean.uuid, {"unknown_field": "value", "name": "OK"}
        )

        assert result.name == "OK"
        assert (
            not hasattr(result, "unknown_field")
            or getattr(result, "unknown_field", None) is None
        )

    @pytest.mark.unit
    def test_patch_multiple_fields_at_once(self):
        """Test patch de plusieurs champs simultanément."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        result = patch_campaign(
            mock_repo,
            bean.uuid,
            {
                "name": "Multi",
                "year": 2030,
                "semester": "S2",
                "description": "Multi patch",
            },
        )

        assert result.name == "Multi"
        assert result.year == 2030
        assert result.semester == "S2"
        assert result.description == "Multi patch"


class TestPatchFieldTypeValidation:
    """Tests pour la validation de type de chaque champ dans FIELD_TYPES.
    Tue les mutants qui modifient les clés du dict FIELD_TYPES."""

    def _make_existing_bean(self) -> CampaignBean:
        return CampaignBean(
            uuid="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Original",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            dtri_number=100,
            description="Description originale",
        )

    def _make_mock_repo(self, existing_bean: CampaignBean):
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing_bean
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.side_effect = lambda b: b
        return mock_repo

    @pytest.mark.unit
    def test_patch_name_invalid_type_raises_validation(self):
        """Test que 'name' avec un type non-str lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"name": 123})

        assert exc_info.value.field == "name"
        assert "name" in str(exc_info.value)
        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_year_invalid_type_raises_validation(self):
        """Test que 'year' avec un type non-int lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"year": "2025"})

        assert exc_info.value.field == "year"
        assert "year" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_semester_invalid_type_raises_validation(self):
        """Test que 'semester' avec un type non-str lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"semester": 1})

        assert exc_info.value.field == "semester"
        assert "semester" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_type_id_invalid_type_raises_validation(self):
        """Test que 'type_id' avec un type non-int/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"type_id": "string"})

        assert exc_info.value.field == "type_id"
        assert "type_id" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_status_id_invalid_type_raises_validation(self):
        """Test que 'status_id' avec un type non-int/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"status_id": "string"})

        assert exc_info.value.field == "status_id"
        assert "status_id" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_installation_id_invalid_type_raises_validation(self):
        """Test que 'installation_id' avec un type non-int/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"installation_id": "string"})

        assert exc_info.value.field == "installation_id"
        assert "installation_id" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_start_date_invalid_type_raises_validation(self):
        """Test que 'start_date' avec un type non-date/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"start_date": "2025-01-01"})

        assert exc_info.value.field == "start_date"
        assert "start_date" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_end_date_invalid_type_raises_validation(self):
        """Test que 'end_date' avec un type non-date/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"end_date": "2025-12-31"})

        assert exc_info.value.field == "end_date"
        assert "end_date" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_dtri_number_invalid_type_raises_validation(self):
        """Test que 'dtri_number' avec un type non-int/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"dtri_number": "abc"})

        assert exc_info.value.field == "dtri_number"
        assert "dtri_number" in str(exc_info.value)

    @pytest.mark.unit
    def test_patch_description_invalid_type_raises_validation(self):
        """Test que 'description' avec un type non-str/None lève ValidationException."""
        bean = self._make_existing_bean()
        mock_repo = self._make_mock_repo(bean)

        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"description": 12345})

        assert exc_info.value.field == "description"
        assert "description" in str(exc_info.value)


class TestMergePartialData:
    """Tests directs pour la fonction _merge_partial_data.
    Tue les mutants sur les conditions internes."""

    def _make_bean(self) -> CampaignBean:
        return CampaignBean(
            uuid="test-uuid",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Base",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )

    @pytest.mark.unit
    def test_merge_skips_field_not_in_allowed(self):
        """Test que _merge_partial_data ignore les champs hors ALLOWED_PATCH_FIELDS."""
        bean = self._make_bean()
        original_uuid = bean.uuid
        _merge_partial_data(bean, {"uuid": "hacked-uuid"})
        # uuid n'est pas dans ALLOWED_PATCH_FIELDS => il ne doit pas changer
        assert bean.uuid == original_uuid

    @pytest.mark.unit
    def test_merge_sets_allowed_field(self):
        """Test que _merge_partial_data modifie un champ autorisé."""
        bean = self._make_bean()
        _merge_partial_data(bean, {"name": "Modifié"})
        assert bean.name == "Modifié"

    @pytest.mark.unit
    def test_merge_allows_none_for_nullable_field(self):
        """Test que None est accepté pour les champs nullable."""
        bean = self._make_bean()
        bean.type_id = 5
        _merge_partial_data(bean, {"type_id": None})
        assert bean.type_id is None

    @pytest.mark.unit
    def test_merge_raises_on_invalid_type(self):
        """Test que _merge_partial_data lève ValidationException sur type invalide."""
        bean = self._make_bean()
        with pytest.raises(ValidationException):
            _merge_partial_data(bean, {"year": "not_an_int"})

    @pytest.mark.unit
    def test_merge_does_not_raise_when_value_is_none_and_field_nullable(self):
        """Test que None ne déclenche pas la validation de type pour les champs nullable."""
        bean = self._make_bean()
        # description accepte (str, type(None)) -> None est valide
        _merge_partial_data(bean, {"description": None})
        assert bean.description is None

    @pytest.mark.unit
    def test_merge_validation_message_contains_field_name(self):
        """Test que le message d'erreur de validation contient le nom du champ."""
        bean = self._make_bean()
        with pytest.raises(ValidationException) as exc_info:
            _merge_partial_data(bean, {"name": 42})
        assert "name" in exc_info.value.message
        assert "name" == exc_info.value.field

    @pytest.mark.unit
    def test_merge_validation_message_contains_expected_type(self):
        """Test que le message d'erreur contient le type attendu."""
        bean = self._make_bean()
        with pytest.raises(ValidationException) as exc_info:
            _merge_partial_data(bean, {"year": "bad"})
        assert "int" in exc_info.value.message

    @pytest.mark.unit
    def test_merge_validation_message_contains_received_type(self):
        """Test que le message d'erreur contient le type reçu."""
        bean = self._make_bean()
        with pytest.raises(ValidationException) as exc_info:
            _merge_partial_data(bean, {"year": 3.14})
        assert "float" in exc_info.value.message


class TestValidateDateRange:
    """Tests directs pour la fonction _validate_date_range.
    Tue les mutants qui inversent la condition start_date > end_date."""

    @pytest.mark.unit
    def test_valid_date_range_no_exception(self):
        """Test qu'un range valide ne lève pas d'exception."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
        )
        # Doit passer sans exception
        _validate_date_range(bean)

    @pytest.mark.unit
    def test_invalid_date_range_raises(self):
        """Test qu'un range inversé lève ValidationException."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=date(2025, 12, 31),
            end_date=date(2025, 1, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            _validate_date_range(bean)
        assert exc_info.value.field == "start_date/end_date"

    @pytest.mark.unit
    def test_equal_dates_no_exception(self):
        """Test que des dates égales ne lèvent pas d'exception (start == end est valide)."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=date(2025, 6, 15),
            end_date=date(2025, 6, 15),
        )
        _validate_date_range(bean)

    @pytest.mark.unit
    def test_none_start_date_no_exception(self):
        """Test que start_date=None ne lève pas d'exception."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=date(2025, 12, 31),
        )
        _validate_date_range(bean)

    @pytest.mark.unit
    def test_none_end_date_no_exception(self):
        """Test que end_date=None ne lève pas d'exception."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 1),
            end_date=None,
        )
        _validate_date_range(bean)

    @pytest.mark.unit
    def test_both_none_no_exception(self):
        """Test que les deux dates à None ne lèvent pas d'exception."""
        bean = CampaignBean(
            uuid="test",
            name="Test",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
        )
        _validate_date_range(bean)


class TestPatchCampaignEdgeCases:
    """Tests supplémentaires pour patch_campaign : conflits, not found, retour."""

    def _make_existing_bean(self) -> CampaignBean:
        return CampaignBean(
            uuid="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Original",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 12, 31),
            dtri_number=100,
            description="Description originale",
        )

    @pytest.mark.unit
    def test_patch_not_found_raises(self):
        """Test que patch_campaign lève NotFoundException si UUID inexistant."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            patch_campaign(mock_repo, "nonexistent-uuid", {"name": "X"})

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "nonexistent-uuid"

    @pytest.mark.unit
    def test_patch_conflict_on_key_change(self):
        """Test que patch_campaign lève ConflictException si la nouvelle clé existe déjà."""
        bean = self._make_existing_bean()
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"name": "Doublon"})

        assert exc_info.value.field == "name/year/semester"
        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_no_conflict_check_when_key_unchanged(self):
        """Test que exists_duplicate n'est pas appelé si la clé ne change pas."""
        bean = self._make_existing_bean()
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.update.side_effect = lambda b: b

        result = patch_campaign(mock_repo, bean.uuid, {"description": "New"})

        mock_repo.exists_duplicate.assert_not_called()
        assert result.description == "New"

    @pytest.mark.unit
    def test_patch_returns_updated_bean(self):
        """Test que patch_campaign retourne le bean mis à jour via repository.update."""
        bean = self._make_existing_bean()
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.exists_duplicate.return_value = False
        expected = CampaignBean(
            uuid=bean.uuid, name="Updated", year=2025, semester="S1"
        )
        mock_repo.update.return_value = expected

        result = patch_campaign(mock_repo, bean.uuid, {"name": "Updated"})

        assert result is expected
        assert result.name == "Updated"

    @pytest.mark.unit
    def test_patch_invalid_dates_after_merge_raises(self):
        """Test que patch_campaign valide les dates après la fusion."""
        bean = self._make_existing_bean()
        # start_date est 2025-01-01, end_date est 2025-12-31
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.exists_duplicate.return_value = False

        # Patch start_date à une date postérieure à end_date
        with pytest.raises(ValidationException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"start_date": date(2026, 1, 1)})

        assert exc_info.value.field == "start_date/end_date"
        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_conflict_exception_contains_new_values(self):
        """Test que le message de ConflictException contient les nouvelles valeurs."""
        bean = self._make_existing_bean()
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = bean
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_campaign(mock_repo, bean.uuid, {"name": "Conflicting"})

        assert "Conflicting" in str(exc_info.value)


class TestCreateCampaignReturnValues:
    """Tests vérifiant les valeurs de retour de create_campaign (tue mutants return)."""

    @pytest.mark.unit
    def test_create_returns_repository_result(self):
        """Test que create_campaign retourne exactement le résultat du repository."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.exists_by_name_year_semester.return_value = False
        expected = CampaignBean(
            uuid="returned-uuid",
            name="Created",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
        )
        mock_repo.create.return_value = expected

        result = create_campaign(mock_repo, expected)

        assert result is expected
        assert result.uuid == "returned-uuid"


class TestGetCampaignReturnValues:
    """Tests vérifiant les valeurs de retour de get_campaign_by_uuid."""

    @pytest.mark.unit
    def test_get_returns_exact_bean(self):
        """Test que get_campaign_by_uuid retourne le bean exact du repository."""
        mock_repo = create_autospec(ICampaignRepository)
        expected = CampaignBean(
            uuid="test-uuid", name="Expected", year=2025, semester="S1"
        )
        mock_repo.get_by_uuid.return_value = expected

        result = get_campaign_by_uuid(mock_repo, "test-uuid")

        assert result is expected


class TestGetAllCampaignsReturnValues:
    """Tests vérifiant les valeurs de retour et les paramètres de get_all_campaigns."""

    @pytest.mark.unit
    def test_get_all_returns_repository_list(self):
        """Test que get_all_campaigns retourne exactement la liste du repository."""
        mock_repo = create_autospec(ICampaignRepository)
        expected = [CampaignBean(uuid="1"), CampaignBean(uuid="2")]
        mock_repo.get_all.return_value = expected

        result = get_all_campaigns(mock_repo)

        assert result is expected
        assert len(result) == 2

    @pytest.mark.unit
    def test_get_all_passes_limit_and_offset(self):
        """Test que limit et offset sont transmis au repository."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_all.return_value = []

        get_all_campaigns(mock_repo, limit=10, offset=20)

        mock_repo.get_all.assert_called_once_with(limit=10, offset=20)

    @pytest.mark.unit
    def test_get_all_default_offset_is_zero(self):
        """Test que l'offset par défaut est 0."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_all.return_value = []

        get_all_campaigns(mock_repo)

        mock_repo.get_all.assert_called_once_with(limit=None, offset=0)

    @pytest.mark.unit
    def test_get_all_empty_list(self):
        """Test que get_all retourne une liste vide quand il n'y a pas de campagnes."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_all.return_value = []

        result = get_all_campaigns(mock_repo)

        assert result == []


class TestCountAllCampaignsReturnValues:
    """Tests vérifiant les valeurs de retour de count_all_campaigns."""

    @pytest.mark.unit
    def test_count_returns_exact_value(self):
        """Test que count_all_campaigns retourne la valeur exacte du repository."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.count_all.return_value = 0

        assert count_all_campaigns(mock_repo) == 0

    @pytest.mark.unit
    def test_count_returns_nonzero(self):
        """Test avec une valeur non-zéro."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.count_all.return_value = 123

        result = count_all_campaigns(mock_repo)

        assert result == 123
        assert isinstance(result, int)


class TestUpdateCampaignReturnValues:
    """Tests vérifiant les valeurs de retour de update_campaign."""

    @pytest.mark.unit
    def test_update_returns_repository_result(self):
        """Test que update_campaign retourne le résultat de repository.update."""
        existing = CampaignBean(uuid="test-uuid", name="Old", year=2025, semester="S1")
        updated = CampaignBean(
            uuid="test-uuid",
            name="Old",
            year=2025,
            semester="S1",
            description="Updated",
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = updated

        result = update_campaign(mock_repo, updated)

        assert result is updated

    @pytest.mark.unit
    def test_update_no_key_change_skips_duplicate_check(self):
        """Test que update_campaign ne vérifie pas les doublons si la clé ne change pas."""
        existing = CampaignBean(uuid="test-uuid", name="Same", year=2025, semester="S1")
        same_key_bean = CampaignBean(
            uuid="test-uuid",
            name="Same",
            year=2025,
            semester="S1",
            description="Changed desc only",
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = same_key_bean

        result = update_campaign(mock_repo, same_key_bean)

        mock_repo.exists_duplicate.assert_not_called()
        assert result.description == "Changed desc only"

    @pytest.mark.unit
    def test_update_key_change_triggers_duplicate_check(self):
        """Test que update_campaign vérifie les doublons quand la clé change."""
        existing = CampaignBean(uuid="test-uuid", name="Old", year=2025, semester="S1")
        changed_bean = CampaignBean(
            uuid="test-uuid", name="New", year=2025, semester="S1"
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.return_value = changed_bean

        update_campaign(mock_repo, changed_bean)

        mock_repo.exists_duplicate.assert_called_once_with(
            "test-uuid", "New", 2025, "S1"
        )

    @pytest.mark.unit
    def test_update_year_change_triggers_duplicate_check(self):
        """Test que le changement de year seul déclenche la vérification de doublon."""
        existing = CampaignBean(uuid="test-uuid", name="Same", year=2025, semester="S1")
        changed_bean = CampaignBean(
            uuid="test-uuid", name="Same", year=2026, semester="S1"
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.return_value = changed_bean

        update_campaign(mock_repo, changed_bean)

        mock_repo.exists_duplicate.assert_called_once()

    @pytest.mark.unit
    def test_update_semester_change_triggers_duplicate_check(self):
        """Test que le changement de semester seul déclenche la vérification de doublon."""
        existing = CampaignBean(uuid="test-uuid", name="Same", year=2025, semester="S1")
        changed_bean = CampaignBean(
            uuid="test-uuid", name="Same", year=2025, semester="S2"
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = False
        mock_repo.update.return_value = changed_bean

        update_campaign(mock_repo, changed_bean)

        mock_repo.exists_duplicate.assert_called_once()

    @pytest.mark.unit
    def test_update_invalid_dates_raises(self):
        """Test que update_campaign valide les dates."""
        existing = CampaignBean(uuid="test-uuid", name="Same", year=2025, semester="S1")
        bad_dates_bean = CampaignBean(
            uuid="test-uuid",
            name="Same",
            year=2025,
            semester="S1",
            start_date=date(2025, 12, 1),
            end_date=date(2025, 1, 1),
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing

        with pytest.raises(ValidationException) as exc_info:
            update_campaign(mock_repo, bad_dates_bean)

        assert exc_info.value.field == "start_date/end_date"
        mock_repo.update.assert_not_called()


class TestDeleteCampaignEdgeCases:
    """Tests supplémentaires pour delete_campaign."""

    @pytest.mark.unit
    def test_delete_returns_true(self):
        """Test que delete_campaign retourne True en cas de succès."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        existing = CampaignBean(
            uuid="del-uuid", name="ToDelete", year=2025, semester="S1"
        )
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.delete.return_value = True
        mock_fsec_repo.get_by_campaign_id.return_value = []

        result = delete_campaign(mock_repo, "del-uuid", mock_fsec_repo)

        assert result is True

    @pytest.mark.unit
    def test_delete_raises_not_found_when_repo_delete_fails(self):
        """Test que delete_campaign lève NotFoundException si repository.delete retourne False."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        existing = CampaignBean(
            uuid="del-uuid", name="ToDelete", year=2025, semester="S1"
        )
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.delete.return_value = False
        mock_fsec_repo.get_by_campaign_id.return_value = []

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign(mock_repo, "del-uuid", mock_fsec_repo)

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "del-uuid"

    @pytest.mark.unit
    def test_delete_not_found_exception_fields(self):
        """Test que NotFoundException contient les bons champs."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            delete_campaign(mock_repo, "missing-uuid", mock_fsec_repo)

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "missing-uuid"

    @pytest.mark.unit
    def test_delete_with_linked_fsecs_exception_field(self):
        """Test que ValidationException contient le bon champ."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        existing = CampaignBean(
            uuid="del-uuid", name="ToDelete", year=2025, semester="S1"
        )
        mock_repo.get_by_uuid.return_value = existing
        mock_fsec_repo.get_by_campaign_id.return_value = [MagicMock(), MagicMock()]

        with pytest.raises(ValidationException) as exc_info:
            delete_campaign(mock_repo, "del-uuid", mock_fsec_repo)

        assert exc_info.value.field == "campaign"
        assert "2" in exc_info.value.message  # 2 FSECs liés

    @pytest.mark.unit
    def test_delete_calls_get_by_campaign_id_with_uuid(self):
        """Test que fsec_repository.get_by_campaign_id est appelé avec le bon UUID."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        existing = CampaignBean(
            uuid="check-uuid", name="Check", year=2025, semester="S1"
        )
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.delete.return_value = True
        mock_fsec_repo.get_by_campaign_id.return_value = []

        delete_campaign(mock_repo, "check-uuid", mock_fsec_repo)

        mock_fsec_repo.get_by_campaign_id.assert_called_once_with("check-uuid")


class TestExceptionFieldNames:
    """Tests vérifiant que les exceptions contiennent exactement les bons noms de champs.
    Tue les mutants qui modifient les chaînes de champs dans les exceptions."""

    @pytest.mark.unit
    def test_create_conflict_field_name(self):
        """Test que ConflictException de create a le bon champ."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.exists_by_name_year_semester.return_value = True
        bean = CampaignBean(uuid="x", name="N", year=2025, semester="S1")

        with pytest.raises(ConflictException) as exc_info:
            create_campaign(mock_repo, bean)

        assert exc_info.value.field == "name/year/semester"
        assert exc_info.value.value == "N/2025/S1"

    @pytest.mark.unit
    def test_get_not_found_resource_name(self):
        """Test que NotFoundException de get a le bon resource name."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_campaign_by_uuid(mock_repo, "missing")

        assert exc_info.value.resource == "Campaign"

    @pytest.mark.unit
    def test_update_not_found_resource_name(self):
        """Test que NotFoundException de update a le bon resource name."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = None
        bean = CampaignBean(uuid="missing", name="X", year=2025, semester="S1")

        with pytest.raises(NotFoundException) as exc_info:
            update_campaign(mock_repo, bean)

        assert exc_info.value.resource == "Campaign"
        assert exc_info.value.identifier == "missing"

    @pytest.mark.unit
    def test_update_conflict_field_name(self):
        """Test que ConflictException de update a le bon champ."""
        existing = CampaignBean(uuid="x", name="Old", year=2025, semester="S1")
        changed = CampaignBean(uuid="x", name="New", year=2025, semester="S1")
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            update_campaign(mock_repo, changed)

        assert exc_info.value.field == "name/year/semester"
        assert exc_info.value.value == "New/2025/S1"

    @pytest.mark.unit
    def test_patch_not_found_resource_name(self):
        """Test que NotFoundException de patch a le bon resource name."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            patch_campaign(mock_repo, "missing", {"name": "X"})

        assert exc_info.value.resource == "Campaign"

    @pytest.mark.unit
    def test_delete_validation_field_is_campaign(self):
        """Test que ValidationException de delete a le champ 'campaign'."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_fsec_repo = create_autospec(IFsecRepository)
        existing = CampaignBean(uuid="x", name="X", year=2025, semester="S1")
        mock_repo.get_by_uuid.return_value = existing
        mock_fsec_repo.get_by_campaign_id.return_value = [MagicMock()]

        with pytest.raises(ValidationException) as exc_info:
            delete_campaign(mock_repo, "x", mock_fsec_repo)

        assert exc_info.value.field == "campaign"

    @pytest.mark.unit
    def test_validate_date_range_field_name(self):
        """Test que ValidationException de date range a le bon champ."""
        bean = CampaignBean(
            uuid="x",
            name="X",
            year=2025,
            semester="S1",
            start_date=date(2025, 12, 1),
            end_date=date(2025, 1, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            _validate_date_range(bean)

        assert exc_info.value.field == "start_date/end_date"


# ============================================================================
# LOGGER MESSAGE MUTATION-KILLING TESTS
# ============================================================================


class TestCampaignLoggerMessages:
    """Tests Pattern B: tuer les mutants qui modifient les messages de log."""

    @pytest.mark.unit
    def test_create_logs_creating_message(self):
        """Test que create_campaign log 'Creating campaign'."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.exists_by_name_year_semester.return_value = False
        bean = CampaignBean(uuid="x", name="Test", year=2025, semester="S1")
        mock_repo.create.return_value = bean

        with patch(
            "app.domain.campaign.services.campaign_service.logger"
        ) as mock_logger:
            create_campaign(mock_repo, bean)

            assert mock_logger.info.call_count == 2
            first_log = mock_logger.info.call_args_list[0][0][0]
            second_log = mock_logger.info.call_args_list[1][0][0]
            assert "Creating campaign" in first_log
            assert "name=Test" in first_log
            assert "Created campaign" in second_log

    @pytest.mark.unit
    def test_update_logs_updating_message(self):
        """Test que update_campaign log 'Updating campaign'."""
        existing = CampaignBean(uuid="u", name="Same", year=2025, semester="S1")
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.return_value = existing

        with patch(
            "app.domain.campaign.services.campaign_service.logger"
        ) as mock_logger:
            update_campaign(mock_repo, existing)

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Updating campaign" in log_msg
            assert "u" in log_msg

    @pytest.mark.unit
    def test_patch_logs_patching_message(self):
        """Test que patch_campaign log 'Patching campaign'."""
        existing = CampaignBean(
            uuid="p-uuid",
            name="P",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.update.side_effect = lambda b: b

        with patch(
            "app.domain.campaign.services.campaign_service.logger"
        ) as mock_logger:
            patch_campaign(mock_repo, "p-uuid", {"description": "New"})

            mock_logger.info.assert_called_once()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Patching campaign" in log_msg
            assert "p-uuid" in log_msg

    @pytest.mark.unit
    def test_delete_logs_deleting_and_deleted_messages(self):
        """Test que delete_campaign log 'Deleting' et 'Deleted'."""
        existing = CampaignBean(uuid="d-uuid", name="D", year=2025, semester="S1")
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.delete.return_value = True
        mock_fsec_repo = create_autospec(IFsecRepository)
        mock_fsec_repo.get_by_campaign_id.return_value = []

        with patch(
            "app.domain.campaign.services.campaign_service.logger"
        ) as mock_logger:
            delete_campaign(mock_repo, "d-uuid", mock_fsec_repo)

            assert mock_logger.info.call_count == 2
            first_log = mock_logger.info.call_args_list[0][0][0]
            second_log = mock_logger.info.call_args_list[1][0][0]
            assert "Deleting campaign" in first_log
            assert "d-uuid" in first_log
            assert "Deleted campaign" in second_log
            assert "d-uuid" in second_log


class TestCampaignExceptionValueStrings:
    """Tests Pattern C/D: tuer les mutants qui modifient les messages d'erreur format strings."""

    @pytest.mark.unit
    def test_create_conflict_value_contains_all_parts(self):
        """Test que ConflictException.value contient name/year/semester."""
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.exists_by_name_year_semester.return_value = True
        bean = CampaignBean(uuid="x", name="MyCamp", year=2025, semester="S2")

        with pytest.raises(ConflictException) as exc_info:
            create_campaign(mock_repo, bean)

        assert "MyCamp" in exc_info.value.value
        assert "2025" in exc_info.value.value
        assert "S2" in exc_info.value.value

    @pytest.mark.unit
    def test_validate_date_range_message_contains_dates(self):
        """Test que le message de ValidationException contient les dates."""
        bean = CampaignBean(
            uuid="x",
            name="X",
            year=2025,
            semester="S1",
            start_date=date(2025, 12, 1),
            end_date=date(2025, 1, 1),
        )
        with pytest.raises(ValidationException) as exc_info:
            _validate_date_range(bean)

        assert "2025-12-01" in exc_info.value.message
        assert "2025-01-01" in exc_info.value.message

    @pytest.mark.unit
    def test_merge_validation_message_contains_type_invalide(self):
        """Test que le message d'erreur de _merge_partial_data contient 'Type invalide'."""
        bean = CampaignBean(uuid="x", name="X", year=2025, semester="S1")
        with pytest.raises(ValidationException) as exc_info:
            _merge_partial_data(bean, {"name": 123})
        assert "Type invalide" in exc_info.value.message

    @pytest.mark.unit
    def test_delete_linked_fsecs_message_contains_count(self):
        """Test que le message de ValidationException contient le nombre de FSECs."""
        existing = CampaignBean(uuid="x", name="X", year=2025, semester="S1")
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_fsec_repo = create_autospec(IFsecRepository)
        mock_fsec_repo.get_by_campaign_id.return_value = [
            MagicMock(),
            MagicMock(),
            MagicMock(),
        ]

        with pytest.raises(ValidationException) as exc_info:
            delete_campaign(mock_repo, "x", mock_fsec_repo)

        assert "3" in exc_info.value.message
        assert "FSEC" in exc_info.value.message
        assert "Impossible" in exc_info.value.message

    @pytest.mark.unit
    def test_update_conflict_value_contains_all_parts(self):
        """Test que ConflictException.value de update contient les valeurs."""
        existing = CampaignBean(uuid="u", name="Old", year=2025, semester="S1")
        changed = CampaignBean(uuid="u", name="NewName", year=2026, semester="S2")
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            update_campaign(mock_repo, changed)

        assert "NewName" in exc_info.value.value
        assert "2026" in exc_info.value.value
        assert "S2" in exc_info.value.value

    @pytest.mark.unit
    def test_patch_conflict_value_contains_merged_values(self):
        """Test que ConflictException.value de patch contient les valeurs fusionnées."""
        existing = CampaignBean(
            uuid="u",
            name="Old",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
        )
        mock_repo = create_autospec(ICampaignRepository)
        mock_repo.get_by_uuid.return_value = existing
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            patch_campaign(mock_repo, "u", {"name": "Patched"})

        assert "Patched" in exc_info.value.value
        assert "2025" in exc_info.value.value
        assert "S1" in exc_info.value.value
