"""
Test Service : Scénario complet du workflow CIBLE.

Ce test simule le parcours complet :
1. Création d'une Campagne
2. Création d'un FSEC lié à la Campagne
3. Passage par toutes les étapes (Steps)
   - Assembly Step
   - Metrology Step
   - Sealing Step
   - Pictures Step
4. (Optionnel) Steps Gaz

Utilise des mocks pour éviter la dépendance à la BD.
"""

import logging
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

logger = logging.getLogger(__name__)

# ============================================================================
# FIXTURES SPÉCIFIQUES SERVICE
# ============================================================================


@pytest.fixture
def workflow_campaign_uuid() -> str:
    """UUID campagne pour le workflow service."""
    return str(uuid.uuid4())


@pytest.fixture
def workflow_fsec_uuid() -> str:
    """UUID FSEC pour le workflow service."""
    return str(uuid.uuid4())


# ============================================================================
# TEST SCÉNARIO COMPLET
# ============================================================================


class TestCompleteWorkflow:
    """
    Tests du scénario complet : Campagne → FSEC → Steps.

    Ce test vérifie que :
    - Le flux de données est cohérent entre les domaines
    - Les services respectent les règles métier
    - Les mappers convertissent correctement les données
    """

    @pytest.mark.service
    def test_complete_workflow_campaign_to_steps(self):
        """
        Scénario service complet : Créer Campagne → Créer FSEC → Passer les étapes.
        """
        # ================================================================
        # STEP 1: CRÉATION CAMPAGNE
        # ================================================================
        from app.domain.campaign.models.campaign_bean import CampaignBean
        from app.domain.campaign.services.campaign_service import create_campaign

        campaign_uuid = str(uuid.uuid4())
        campaign_bean = CampaignBean(
            uuid=campaign_uuid,
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Campagne Workflow",
            year=2025,
            semester="S1",
            start_date=date(2025, 1, 15),
            end_date=date(2025, 6, 30),
            dtri_number=99999,
            description="Test scénario complet",
        )

        # Mock repository
        mock_campaign_repo = MagicMock()
        mock_campaign_repo.exists_by_name_year_semester.return_value = False
        mock_campaign_repo.create.return_value = campaign_bean

        # Exécution
        created_campaign = create_campaign(mock_campaign_repo, campaign_bean)

        # Vérifications
        assert created_campaign.uuid == campaign_uuid
        assert created_campaign.name == "Campagne Workflow"
        mock_campaign_repo.create.assert_called_once()

        logger.info(f"✅ STEP 1: Campagne créée - {created_campaign.name}")

        # ================================================================
        # STEP 2: CRÉATION FSEC LIÉ À LA CAMPAGNE
        # ================================================================
        from app.domain.fsec.models.fsec_bean import FsecBean
        from app.domain.fsec.services.fsec_service import create_fsec

        fsec_version_uuid = str(uuid.uuid4())
        fsec_uuid = str(uuid.uuid4())
        fsec_bean = FsecBean(
            version_uuid=fsec_version_uuid,
            fsec_uuid=fsec_uuid,
            campaign_id=campaign_uuid,  # Lié à la campagne créée
            status_id=0,
            category_id=0,  # Sans Gaz
            rack_id=0,
            name="FSEC Workflow",
            comments="FSEC pour test complet",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )

        # Mock repository
        mock_fsec_repo = MagicMock()
        mock_fsec_repo.exists_by_campaign_and_name.return_value = False
        mock_fsec_repo.create.return_value = fsec_bean

        # Exécution
        created_fsec = create_fsec(mock_fsec_repo, fsec_bean)

        # Vérifications
        assert created_fsec.version_uuid == fsec_version_uuid
        assert created_fsec.campaign_id == campaign_uuid
        assert created_fsec.is_active is True
        mock_fsec_repo.create.assert_called_once()

        logger.info(f"✅ STEP 2: FSEC créé - {created_fsec.name} (lié à campagne)")

        # ================================================================
        # STEP 3: ASSEMBLY STEP
        # ================================================================
        from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
        from app.domain.steps.services.steps_service import create_step

        assembly_uuid = str(uuid.uuid4())
        assembly_bean = AssemblyStepBean(
            uuid=assembly_uuid,
            fsec_version_id=fsec_version_uuid,
            operator="Assembleur Dupont",
            operator_user_uuid=None,
            start_date=date(2025, 2, 1),
            end_date=date(2025, 2, 10),
            comments="Assemblage terminé avec succès",
            machine_uuids=[],
        )

        mock_assembly_repo = MagicMock()
        mock_assembly_repo.create.return_value = assembly_bean

        created_assembly = create_step(mock_assembly_repo, assembly_bean)

        assert created_assembly.uuid == assembly_uuid
        assert created_assembly.fsec_version_id == fsec_version_uuid
        mock_assembly_repo.create.assert_called_once()

        logger.info(
            f"✅ STEP 3: AssemblyStep créé - Assembleur: {created_assembly.operator}"
        )

        # ================================================================
        # STEP 4: METROLOGY STEP
        # ================================================================
        from app.domain.steps.models.metrology_step_bean import MetrologyStepBean

        metrology_uuid = str(uuid.uuid4())
        metrology_bean = MetrologyStepBean(
            uuid=metrology_uuid,
            fsec_version_id=fsec_version_uuid,
            date=date(2025, 2, 15),
            comments="Métrologie validée",
            machine_uuids=[],
        )

        mock_metrology_repo = MagicMock()
        mock_metrology_repo.create.return_value = metrology_bean

        created_metrology = create_step(mock_metrology_repo, metrology_bean)

        assert created_metrology.uuid == metrology_uuid
        assert created_metrology.machine_uuids == []
        mock_metrology_repo.create.assert_called_once()

        logger.info(f"✅ STEP 4: MetrologyStep créé - Date: {created_metrology.date}")

        # ================================================================
        # STEP 5: SEALING STEP
        # ================================================================
        from app.domain.steps.models.sealing_step_bean import SealingStepBean

        sealing_uuid = str(uuid.uuid4())
        sealing_bean = SealingStepBean(
            uuid=sealing_uuid,
            metrology_step_id=metrology_uuid,
            date=date(2025, 2, 18),
            metrologist_name="Jean Dupont",
            interface_io="INTERFACE_01",
            comments="Scellement effectué",
        )

        mock_sealing_repo = MagicMock()
        mock_sealing_repo.create.return_value = sealing_bean

        created_sealing = create_step(mock_sealing_repo, sealing_bean)

        assert created_sealing.uuid == sealing_uuid
        assert created_sealing.interface_io == "INTERFACE_01"
        mock_sealing_repo.create.assert_called_once()

        logger.info(
            f"✅ STEP 5: SealingStep créé - Interface: {created_sealing.interface_io}"
        )

        # ================================================================
        # STEP 6: PICTURES STEP
        # ================================================================
        from app.domain.steps.models.pictures_step_bean import PicturesStepBean

        pictures_uuid = str(uuid.uuid4())
        pictures_bean = PicturesStepBean(
            uuid=pictures_uuid,
            fsec_version_id=fsec_version_uuid,
            operator="Jean Dupont",
            date=date(2025, 2, 20),
            comments="Photos documentées",
        )

        mock_pictures_repo = MagicMock()
        mock_pictures_repo.create.return_value = pictures_bean

        created_pictures = create_step(mock_pictures_repo, pictures_bean)

        assert created_pictures.uuid == pictures_uuid
        assert created_pictures.date == date(2025, 2, 20)
        mock_pictures_repo.create.assert_called_once()

        logger.info(f"✅ STEP 6: PicturesStep créé - Date: {created_pictures.date}")

        # ================================================================
        # RÉSUMÉ WORKFLOW
        # ================================================================
        logger.info("\n" + "=" * 60)
        logger.info("🎉 WORKFLOW COMPLET RÉUSSI")
        logger.info("=" * 60)
        logger.info(f"📋 Campagne: {created_campaign.name}")
        logger.info(f"🏗️  FSEC: {created_fsec.name}")
        logger.info("🔧 Steps complétés: Assembly → Metrology → Sealing → Pictures")
        logger.info("=" * 60)

    @pytest.mark.service
    def test_workflow_with_gas_steps(self):
        """
        Scénario service avec catégorie Gaz (Airtightness + Gas Filling).
        """
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )
        from app.domain.steps.models.gas_filling_bp_step_bean import (
            GasFillingBpStepBean,
        )
        from app.domain.steps.services.steps_service import create_step

        fsec_version_uuid = str(uuid.uuid4())

        # Test Airtightness
        airtightness_uuid = str(uuid.uuid4())
        airtightness_bean = AirtightnessTestLpStepBean(
            uuid=airtightness_uuid,
            fsec_version_id=fsec_version_uuid,
            leak_rate_dtri="0.001 Pa.m3/s",
            gas_type="Helium",
            experiment_pressure=1.5,
            airtightness_test_duration=120.0,
            operator="Jean Dupont",
            date_of_fulfilment=date(2025, 3, 1),
        )

        mock_airtightness_repo = MagicMock()
        mock_airtightness_repo.create.return_value = airtightness_bean

        created_airtightness = create_step(mock_airtightness_repo, airtightness_bean)

        assert created_airtightness.gas_type == "Helium"
        assert created_airtightness.experiment_pressure == 1.5
        logger.info(
            f"✅ GAS STEP 1: Airtightness Test - Leak Rate: {created_airtightness.leak_rate_dtri}"
        )

        # Gas Filling BP
        gas_filling_uuid = str(uuid.uuid4())
        gas_filling_bean = GasFillingBpStepBean(
            uuid=gas_filling_uuid,
            fsec_version_id=fsec_version_uuid,
            leak_rate_dtri="0.0005 Pa.m3/s",
            gas_type="Nitrogen",
            experiment_pressure=2.0,
            leak_test_duration=60.0,
            operator="Marie Martin",
            date_of_fulfilment=date(2025, 3, 5),
            gas_base=1,
            gas_container=2,
            observations="Remplissage nominal",
        )

        mock_gas_filling_repo = MagicMock()
        mock_gas_filling_repo.create.return_value = gas_filling_bean

        created_gas_filling = create_step(mock_gas_filling_repo, gas_filling_bean)

        assert created_gas_filling.gas_type == "Nitrogen"
        assert created_gas_filling.gas_base == 1
        logger.info(
            f"✅ GAS STEP 2: Gas Filling BP - Pressure: {created_gas_filling.experiment_pressure} bar"
        )

        logger.info("\n🎉 WORKFLOW GAZ COMPLET RÉUSSI")


# ============================================================================
# TESTS MAPPERS SERVICE
# ============================================================================


class TestMappersService:
    """Tests des conversions Entity ↔ Bean ↔ API."""

    @pytest.mark.service
    def test_campaign_mapper_roundtrip(self, sample_campaign_bean):
        """Test conversion aller-retour Campaign."""
        from app.mapper.campaign.campaign_mapper import (
            campaign_mapper_api_to_bean,
            campaign_mapper_bean_to_api,
        )

        # Bean → API
        api_data = campaign_mapper_bean_to_api(sample_campaign_bean)

        assert api_data["uuid"] == sample_campaign_bean.uuid
        assert api_data["name"] == sample_campaign_bean.name
        assert api_data["year"] == sample_campaign_bean.year

        # API → Bean
        restored_bean = campaign_mapper_api_to_bean(api_data)

        assert restored_bean.uuid == sample_campaign_bean.uuid
        assert restored_bean.name == sample_campaign_bean.name

        logger.info("✅ Campaign Mapper roundtrip OK")

    @pytest.mark.service
    def test_fsec_mapper_roundtrip(self, sample_fsec_bean):
        """Test conversion aller-retour FSEC."""
        from app.mapper.fsec.fsec_mapper import (
            fsec_mapper_api_to_bean,
            fsec_mapper_bean_to_api,
        )

        # Bean → API
        api_data = fsec_mapper_bean_to_api(sample_fsec_bean)

        assert api_data["version_uuid"] == sample_fsec_bean.version_uuid
        assert api_data["is_active"] == sample_fsec_bean.is_active

        # API → Bean
        restored_bean = fsec_mapper_api_to_bean(api_data)

        assert restored_bean.version_uuid == sample_fsec_bean.version_uuid

        logger.info("✅ FSEC Mapper roundtrip OK")


# ============================================================================
# TESTS EXCEPTIONS
# ============================================================================


class TestWorkflowExceptions:
    """Tests des cas d'erreur du workflow."""

    @pytest.mark.service
    def test_create_duplicate_campaign_raises_conflict(self):
        """Test qu'une campagne dupliquée lève ConflictException."""
        from app.domain.campaign.models.campaign_bean import CampaignBean
        from app.domain.campaign.services.campaign_service import create_campaign
        from app.domain.exceptions import ConflictException

        campaign_bean = CampaignBean(
            uuid=str(uuid.uuid4()),
            type_id=0,
            status_id=0,
            installation_id=0,
            name="Campagne Dupliquée",
            year=2025,
            semester="S1",
            start_date=None,
            end_date=None,
            dtri_number=None,
            description=None,
        )

        mock_repo = MagicMock()
        mock_repo.exists_by_name_year_semester.return_value = True  # Existe déjà

        with pytest.raises(ConflictException) as exc_info:
            create_campaign(mock_repo, campaign_bean)

        assert "Campagne Dupliquée" in str(exc_info.value)
        logger.info("✅ ConflictException levée correctement pour doublon")

    @pytest.mark.service
    def test_get_nonexistent_step_raises_not_found(self):
        """Test qu'un step inexistant lève NotFoundException."""
        from app.domain.exceptions import NotFoundException
        from app.domain.steps.services.steps_service import get_step_by_uuid

        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None  # N'existe pas

        with pytest.raises(NotFoundException) as exc_info:
            get_step_by_uuid(mock_repo, "fake-uuid-12345", "AssemblyStep")

        assert "fake-uuid-12345" in str(exc_info.value)
        logger.info("✅ NotFoundException levée correctement")
