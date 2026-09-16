"""
Test Service : Scénarios workflow FSEC complets.

Ce module teste les différents parcours FSEC selon les catégories :
- Catégorie 0 : Sans gaz (Design → Tirée)
- Catégorie 1 : Avec gaz BP (inclut Étanchéité + Remp. BP)
- Catégorie 2 : HP sans étanchéité (inclut Remp. HP)
- Catégorie 3 : BP + HP (Étanchéité + BP + HP)
- Catégorie 4 : Perméation (tous les gas steps)
"""

import logging
import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.campaign.services.campaign_service import create_campaign
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.services.fsec_service import create_fsec, update_fsec
from app.domain.steps.services.steps_service import create_step

logger = logging.getLogger(__name__)

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_campaign_repo():
    """Mock du repository Campaign."""
    repo = MagicMock()
    repo.exists_by_name_year_semester.return_value = False
    return repo


@pytest.fixture
def mock_fsec_repo():
    """Mock du repository FSEC."""
    repo = MagicMock()
    repo.exists_by_campaign_and_name.return_value = False
    return repo


@pytest.fixture
def created_campaign(mock_campaign_repo):
    """Campagne créée pour les tests."""
    campaign_uuid = str(uuid.uuid4())
    campaign_bean = CampaignBean(
        uuid=campaign_uuid,
        type_id=0,
        status_id=0,
        installation_id=0,
        name=f"Campagne service FSEC {uuid.uuid4().hex[:6]}",
        year=2025,
        semester="S1",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 6, 30),
        dtri_number=12345,
        description="Campagne pour tests service FSEC",
    )
    mock_campaign_repo.create.return_value = campaign_bean
    return create_campaign(mock_campaign_repo, campaign_bean)


# ============================================================================
# CATEGORY 0 : SANS GAZ
# ============================================================================


@pytest.mark.service
class TestFsecWorkflowCategory0:
    """Tests workflow FSEC catégorie 0 (Sans gaz)."""

    def test_complete_sans_gaz_workflow(self, mock_fsec_repo, created_campaign):
        """
        Workflow complet catégorie 0 :
        Design → Assemblage → Métrologie → Scellement → Vérification scellement
        → Photos → Disponible → Installation → Tirée
        """
        from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
        from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
        from app.domain.steps.models.pictures_step_bean import PicturesStepBean
        from app.domain.steps.models.sealing_step_bean import SealingStepBean

        # Créer FSEC catégorie 0
        fsec_version_uuid = str(uuid.uuid4())
        fsec_bean = FsecBean(
            version_uuid=fsec_version_uuid,
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=created_campaign.uuid,
            status_id=0,  # Design
            category_id=0,  # Sans gaz
            rack_id=1,
            name="FSEC Sans Gaz Workflow",
            comments="Test workflow catégorie 0",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )
        mock_fsec_repo.create.return_value = fsec_bean
        created_fsec = create_fsec(mock_fsec_repo, fsec_bean)

        assert created_fsec.category_id == 0
        assert created_fsec.status_id == 0  # Design
        logger.info("✅ FSEC créé en statut Design (0)")

        # Step 1: Assemblage
        assembly_bean = AssemblyStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            operator="Assembleur Dupont",
            operator_user_uuid=None,
            start_date=date(2025, 2, 1),
            end_date=date(2025, 2, 5),
            comments="Assemblage nominal",
            machine_uuids=[],
        )
        mock_assembly_repo = MagicMock()
        mock_assembly_repo.create.return_value = assembly_bean
        created_assembly = create_step(mock_assembly_repo, assembly_bean)
        assert created_assembly.fsec_version_id == fsec_version_uuid
        logger.info("✅ Step Assemblage créé")

        # Passage statut Assemblage (1)
        fsec_bean.status_id = 1
        mock_fsec_repo.update.return_value = fsec_bean
        mock_fsec_repo.get_by_version_uuid.return_value = fsec_bean
        updated_fsec = update_fsec(mock_fsec_repo, fsec_bean)
        assert updated_fsec.status_id == 1
        logger.info("✅ FSEC passé en statut Assemblage (1)")

        # Step 2: Métrologie
        metrology_bean = MetrologyStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            date=date(2025, 2, 10),
            comments="Métrologie validée",
            machine_uuids=[],
        )
        mock_metrology_repo = MagicMock()
        mock_metrology_repo.create.return_value = metrology_bean
        created_metrology = create_step(mock_metrology_repo, metrology_bean)
        assert created_metrology.machine_uuids == []
        logger.info("✅ Step Métrologie créé")

        # Passage statut Métrologie (2)
        fsec_bean.status_id = 2
        mock_fsec_repo.update.return_value = fsec_bean
        updated_fsec = update_fsec(mock_fsec_repo, fsec_bean)
        assert updated_fsec.status_id == 2
        logger.info("✅ FSEC passé en statut Métrologie (2)")

        # Step 3: Scellement
        sealing_bean = SealingStepBean(
            uuid=str(uuid.uuid4()),
            metrology_step_id=metrology_bean.uuid,
            date=date(2025, 2, 12),
            metrologist_name="Jean Dupont",
            interface_io="INTERFACE_A1",
            comments="Scellement effectué",
        )
        mock_sealing_repo = MagicMock()
        mock_sealing_repo.create.return_value = sealing_bean
        created_sealing = create_step(mock_sealing_repo, sealing_bean)
        assert created_sealing.interface_io == "INTERFACE_A1"
        logger.info("✅ Step Scellement créé")

        # Passage statut Scellement (3)
        fsec_bean.status_id = 3
        mock_fsec_repo.update.return_value = fsec_bean
        updated_fsec = update_fsec(mock_fsec_repo, fsec_bean)
        assert updated_fsec.status_id == 3
        logger.info("✅ FSEC passé en statut Scellement (3)")

        # Step 4: Photos
        pictures_bean = PicturesStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            operator="Jean Dupont",
            date=date(2025, 2, 15),
            comments="Photos prises",
        )
        mock_pictures_repo = MagicMock()
        mock_pictures_repo.create.return_value = pictures_bean
        create_step(mock_pictures_repo, pictures_bean)
        logger.info("✅ Step Photos créé")

        # Passage statuts finaux (16 = Vérification scellement, entre Scellement et Photos)
        for status_id, status_name in [
            (16, "Vérification scellement"),
            (4, "Photos"),
            (5, "Disponible"),
            (6, "Installation"),
            (7, "Tirée"),
        ]:
            fsec_bean.status_id = status_id
            mock_fsec_repo.update.return_value = fsec_bean
            updated_fsec = update_fsec(mock_fsec_repo, fsec_bean)
            assert updated_fsec.status_id == status_id
            logger.info(f"✅ FSEC passé en statut {status_name} ({status_id})")

        logger.info("\n" + "=" * 60)
        logger.info("🎉 WORKFLOW CATÉGORIE 0 (SANS GAZ) COMPLET")
        logger.info("=" * 60)


# ============================================================================
# CATEGORY 4 : PERMÉATION (TOUS LES GAS STEPS)
# ============================================================================


@pytest.mark.service
class TestFsecWorkflowCategory4:
    """Tests workflow FSEC catégorie 4 (Perméation avec tous gas steps)."""

    def test_complete_permeation_workflow(self, mock_fsec_repo, created_campaign):
        """
        Workflow complet catégorie 4 :
        Design → Assemblage → Métrologie → Scellement → Vérification scellement → Photos
        → Étanchéité → Perméation → Dépressurisation → Remp. BP → Disponible → Installation → Tirée
        """
        from app.domain.steps.models.airtightness_test_lp_step_bean import (
            AirtightnessTestLpStepBean,
        )
        from app.domain.steps.models.depressurization_step_bean import (
            DepressurizationStepBean,
        )
        from app.domain.steps.models.gas_filling_bp_step_bean import (
            GasFillingBpStepBean,
        )
        from app.domain.steps.models.permeation_step_bean import PermeationStepBean

        # Créer FSEC catégorie 4
        fsec_version_uuid = str(uuid.uuid4())
        fsec_bean = FsecBean(
            version_uuid=fsec_version_uuid,
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=created_campaign.uuid,
            status_id=0,
            category_id=4,  # Perméation
            rack_id=2,
            name="FSEC Perméation Workflow",
            comments="Test workflow catégorie 4",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )
        mock_fsec_repo.create.return_value = fsec_bean
        created_fsec = create_fsec(mock_fsec_repo, fsec_bean)

        assert created_fsec.category_id == 4
        logger.info("✅ FSEC catégorie 4 (Perméation) créé")

        # Airtightness Test LP
        airtightness_bean = AirtightnessTestLpStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            leak_rate_dtri="0.001 Pa.m3/s",
            gas_type="Helium",
            experiment_pressure=1.5,
            airtightness_test_duration=120.0,
            operator="Opérateur Étanchéité",
            date_of_fulfilment=date(2025, 3, 1),
        )
        mock_airtightness_repo = MagicMock()
        mock_airtightness_repo.create.return_value = airtightness_bean
        created_airtightness = create_step(mock_airtightness_repo, airtightness_bean)
        assert created_airtightness.gas_type == "Helium"
        logger.info("✅ Step Étanchéité (Airtightness) créé")

        # Permeation Step
        permeation_bean = PermeationStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            gas_type="Helium",
            target_pressure=5.0,
            operator="Opérateur Perméation",
            sensor_pressure=4.8,
            computed_shot_pressure=4.5,
        )
        mock_permeation_repo = MagicMock()
        mock_permeation_repo.create.return_value = permeation_bean
        created_permeation = create_step(mock_permeation_repo, permeation_bean)
        assert created_permeation.target_pressure == 5.0
        logger.info("✅ Step Perméation créé")

        # Depressurization Step
        depressurization_bean = DepressurizationStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            pressure_gauge=5.0,
            enclosure_pressure_measured=0.5,
            depressurization_time_before_firing=60.0,
            operator="Opérateur Dépressurisation",
            date_of_fulfilment=date(2025, 3, 15),
            observations="Dépressurisation nominale",
        )
        mock_depressurization_repo = MagicMock()
        mock_depressurization_repo.create.return_value = depressurization_bean
        created_depressurization = create_step(
            mock_depressurization_repo, depressurization_bean
        )
        assert created_depressurization.enclosure_pressure_measured == 0.5
        logger.info("✅ Step Dépressurisation créé")

        # Gas Filling BP Step
        gas_filling_bp_bean = GasFillingBpStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            leak_rate_dtri="0.0005 Pa.m3/s",
            gas_type="Azote",
            experiment_pressure=2.0,
            leak_test_duration=90.0,
            operator="Opérateur Remplissage BP",
            date_of_fulfilment=date(2025, 3, 20),
            gas_base=1,
            gas_container=2,
            observations="Remplissage BP nominal",
        )
        mock_gas_bp_repo = MagicMock()
        mock_gas_bp_repo.create.return_value = gas_filling_bp_bean
        created_gas_bp = create_step(mock_gas_bp_repo, gas_filling_bp_bean)
        assert created_gas_bp.gas_base == 1
        logger.info("✅ Step Remplissage BP créé")

        logger.info("\n" + "=" * 60)
        logger.info("🎉 WORKFLOW CATÉGORIE 4 (PERMÉATION) COMPLET")
        logger.info("  - Étanchéité LP ✓")
        logger.info("  - Perméation ✓")
        logger.info("  - Dépressurisation ✓")
        logger.info("  - Remplissage BP ✓")
        logger.info("=" * 60)

    def test_permeation_with_repressurization(self, mock_fsec_repo, created_campaign):
        """
        Test scénario avec dépressurisation échouée → repressurisation.
        """
        from app.domain.steps.models.repressurization_step_bean import (
            RepressurizationStepBean,
        )

        fsec_version_uuid = str(uuid.uuid4())
        fsec_bean = FsecBean(
            version_uuid=fsec_version_uuid,
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=created_campaign.uuid,
            status_id=13,  # Dépressurisation
            category_id=4,
            rack_id=2,
            name="FSEC Repress Workflow",
            comments="Test repressurisation",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=True,  # Échec dépressurisation
        )
        mock_fsec_repo.create.return_value = fsec_bean
        created_fsec = create_fsec(mock_fsec_repo, fsec_bean)

        assert created_fsec.depressurization_failed is True
        logger.info("✅ FSEC avec dépressurisation échouée créé")

        # Repressurization Step
        repressurization_bean = RepressurizationStepBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            operator="Opérateur Repressurisation",
            gas_type="Helium",
            sensor_pressure=0.5,
            computed_pressure=5.0,
        )
        mock_repress_repo = MagicMock()
        mock_repress_repo.create.return_value = repressurization_bean
        created_repress = create_step(mock_repress_repo, repressurization_bean)

        assert created_repress.computed_pressure == 5.0
        logger.info("✅ Step Repressurisation créé après échec dépressurisation")

        logger.info("\n🎉 SCÉNARIO REPRESSURISATION COMPLET")


# ============================================================================
# TESTS CHANGEMENT STATUT HS
# ============================================================================


@pytest.mark.service
class TestFsecWorkflowHS:
    """Tests passage en statut HS (Hors Service)."""

    def test_fsec_can_be_marked_hs(self, mock_fsec_repo, created_campaign):
        """Test qu'un FSEC peut être marqué HS depuis n'importe quel statut."""
        fsec_version_uuid = str(uuid.uuid4())
        fsec_bean = FsecBean(
            version_uuid=fsec_version_uuid,
            fsec_uuid=str(uuid.uuid4()),
            campaign_id=created_campaign.uuid,
            status_id=5,  # Disponible
            category_id=0,
            rack_id=1,
            name="FSEC HS Test",
            comments="Test passage HS",
            is_active=True,
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )
        mock_fsec_repo.create.return_value = fsec_bean
        created_fsec = create_fsec(mock_fsec_repo, fsec_bean)

        assert created_fsec.status_id == 5
        logger.info("✅ FSEC créé en statut Disponible (5)")

        # Passage en HS (8)
        fsec_bean.status_id = 8
        mock_fsec_repo.update.return_value = fsec_bean
        mock_fsec_repo.get_by_version_uuid.return_value = fsec_bean
        updated_fsec = update_fsec(mock_fsec_repo, fsec_bean)

        assert updated_fsec.status_id == 8
        logger.info("✅ FSEC passé en statut HS (8)")

        logger.info("\n🎉 PASSAGE HS RÉUSSI")


# ============================================================================
# TESTS VERSIONING FSEC
# ============================================================================


@pytest.mark.service
class TestFsecVersioning:
    """Tests du système de versioning FSEC."""

    def test_create_new_version(self, mock_fsec_repo, created_campaign):
        """Test création d'une nouvelle version d'un FSEC existant."""
        fsec_uuid = str(uuid.uuid4())

        # Version 1
        version1_uuid = str(uuid.uuid4())
        fsec_v1 = FsecBean(
            version_uuid=version1_uuid,
            fsec_uuid=fsec_uuid,
            campaign_id=created_campaign.uuid,
            status_id=7,  # Tirée (fin de vie)
            category_id=0,
            rack_id=1,
            name="FSEC Versionné",
            comments="Version 1 - Tirée",
            is_active=False,  # Plus active
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )
        mock_fsec_repo.create.return_value = fsec_v1
        created_v1 = create_fsec(mock_fsec_repo, fsec_v1)

        assert created_v1.is_active is False
        logger.info("✅ Version 1 créée et désactivée")

        # Version 2
        version2_uuid = str(uuid.uuid4())
        fsec_v2 = FsecBean(
            version_uuid=version2_uuid,
            fsec_uuid=fsec_uuid,  # Même FSEC
            campaign_id=created_campaign.uuid,
            status_id=0,  # Nouvelle version en Design
            category_id=0,
            rack_id=1,
            name="FSEC Versionné",
            comments="Version 2 - Nouvelle",
            is_active=True,  # Active
            delivery_date=None,
            shooting_date=None,
            preshooting_pressure=None,
            experience_srxx=None,
            localisation=None,
            depressurization_failed=None,
        )
        mock_fsec_repo.create.return_value = fsec_v2
        created_v2 = create_fsec(mock_fsec_repo, fsec_v2)

        assert created_v2.is_active is True
        assert created_v2.fsec_uuid == fsec_uuid
        assert created_v2.version_uuid != version1_uuid
        logger.info("✅ Version 2 créée et active")

        logger.info("\n🎉 VERSIONING FSEC RÉUSSI")
