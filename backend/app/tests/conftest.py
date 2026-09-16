"""
Fixtures partagées pour tous les tests CIBLE.

Ce module fournit :
- Fixtures de données de test (Beans)
- Mocks des repositories
- Helpers pour le setup/teardown
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

# ============================================================================
# CAMPAIGN DOMAIN FIXTURES
# ============================================================================


@pytest.fixture
def sample_campaign_uuid() -> str:
    """UUID fixe pour les tests reproductibles."""
    return "981b3cfb-2fba-4a30-ad2d-cbdd73f3334a"


@pytest.fixture
def sample_campaign_bean():
    """Bean Campaign de test."""
    from app.domain.campaign.models.campaign_bean import CampaignBean

    return CampaignBean(
        uuid="981b3cfb-2fba-4a30-ad2d-cbdd73f3334a",
        type_id=0,
        status_id=0,
        installation_id=0,
        name="Campagne Test Workflow",
        year=2025,
        semester="S1",
        start_date=date(2025, 1, 15),
        end_date=date(2025, 6, 30),
        dtri_number=12345,
        description="Campagne créée pour test workflow",
    )


@pytest.fixture
def mock_campaign_repository():
    """Mock du repository Campaign."""
    mock = MagicMock()
    mock.exists_by_name_year_semester.return_value = False
    return mock


# ============================================================================
# FSEC DOMAIN FIXTURES
# ============================================================================


@pytest.fixture
def sample_fsec_version_uuid() -> str:
    """UUID version FSEC fixe pour tests."""
    return "981b3cfb-2fba-4b30-ad2d-cbdd73f3334a"


@pytest.fixture
def sample_fsec_bean(sample_campaign_uuid):
    """Bean FSEC de test lié à une campagne."""
    from app.domain.fsec.models.fsec_bean import FsecBean

    return FsecBean(
        version_uuid="981b3cfb-2fba-4b30-ad2d-cbdd73f3334a",
        fsec_uuid="981b3cfb-2fba-4b30-ad2d-cbdd73f3334a",
        campaign_id=sample_campaign_uuid,
        status_id=0,
        category_id=0,
        rack_id=0,
        name="FSEC Test Workflow",
        comments="FSEC créé pour test workflow",
        is_active=True,
        delivery_date=date(2025, 3, 1),
        shooting_date=None,
        preshooting_pressure=None,
        experience_srxx=None,
        localisation=None,
        depressurization_failed=None,
    )


@pytest.fixture
def mock_fsec_repository():
    """Mock du repository FSEC."""
    mock = MagicMock()
    mock.exists_by_campaign_and_name.return_value = False
    return mock


# ============================================================================
# STEPS DOMAIN FIXTURES
# ============================================================================


@pytest.fixture
def sample_assembly_step_bean(sample_fsec_version_uuid):
    """Bean AssemblyStep de test."""
    from app.domain.steps.models.assembly_step_bean import AssemblyStepBean

    return AssemblyStepBean(
        uuid=str(uuid.uuid4()),
        fsec_version_id=sample_fsec_version_uuid,
        operator="Assembleur Test",
        operator_user_uuid=None,
        start_date=date(2025, 2, 1),
        end_date=date(2025, 2, 15),
        comments="Assemblage terminé",
        machine_uuids=[],
    )


@pytest.fixture
def sample_metrology_step_bean(sample_fsec_version_uuid):
    """Bean MetrologyStep de test."""
    from app.domain.steps.models.metrology_step_bean import MetrologyStepBean

    return MetrologyStepBean(
        uuid=str(uuid.uuid4()),
        fsec_version_id=sample_fsec_version_uuid,
        date=date(2025, 2, 20),
        comments="Métrologie OK",
        machine_uuids=[],
        metro_file_link="\\\\serveur\\metro\\fsec.txt",
        visrad_link="https://intranet/visrad/fsec",
    )


@pytest.fixture
def sample_sealing_step_bean(sample_fsec_version_uuid):
    """Bean SealingStep de test."""
    from app.domain.steps.models.sealing_step_bean import SealingStepBean

    return SealingStepBean(
        uuid=str(uuid.uuid4()),
        metrology_step_id=sample_fsec_version_uuid,
        date=date(2025, 3, 1),
        metrologist_name="Jean Dupont",
        interface_io="INTERFACE_01",
        comments="Scellement validé",
        verification_status="OK",
        verification_remark="Vérification conforme",
    )


@pytest.fixture
def sample_pictures_step_bean(sample_fsec_version_uuid):
    """Bean PicturesStep de test."""
    from app.domain.steps.models.pictures_step_bean import PicturesStepBean

    return PicturesStepBean(
        uuid=str(uuid.uuid4()),
        fsec_version_id=sample_fsec_version_uuid,
        date=date(2025, 3, 1),
        comments="Photos prises",
    )


# ============================================================================
# GAS STEPS FIXTURES
# ============================================================================


@pytest.fixture
def sample_airtightness_step_bean(sample_fsec_version_uuid):
    """Bean AirtightnessTestLpStep de test."""
    from app.domain.steps.models.airtightness_test_lp_step_bean import (
        AirtightnessTestLpStepBean,
    )

    return AirtightnessTestLpStepBean(
        uuid=str(uuid.uuid4()),
        fsec_version_id=sample_fsec_version_uuid,
        leak_rate_dtri="0.001",
        gas_type="Helium",
        experiment_pressure=1.5,
        airtightness_test_duration=120.0,
        operator="Jean Dupont",
        date_of_fulfilment=date(2025, 3, 5),
    )


# ============================================================================
# EMBASE DOMAIN FIXTURES
# ============================================================================


@pytest.fixture
def sample_embase_uuid() -> str:
    """UUID fixe pour les tests Embase reproductibles."""
    return "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


@pytest.fixture
def sample_embase_bean(sample_embase_uuid):
    """Bean Embase de test."""
    from app.domain.embase.models.embase_bean import EmbaseBean

    return EmbaseBean(
        uuid=sample_embase_uuid,
        identifier="G01",
        type="jet_de_gaz",
        nombre_voies=1,
        soufflet_v1="Soufflet A",
        capteur_v1="Capteur X",
        offset_v1_mv=None,
        test_etancheite_he="OK",
        operationnelle_aimant=True,
        localisation_actuelle="Labo 1",
        chargement_mcc="OK",
    )


@pytest.fixture
def sample_etalonnage_bean(sample_embase_uuid):
    """Bean Etalonnage de test."""
    from app.domain.embase.models.etalonnage_bean import EtalonnageBean

    return EtalonnageBean(
        uuid=str(uuid.uuid4()),
        embase_uuid=sample_embase_uuid,
        voie=1,
        offset_0_bar_mv=None,
        mesurande_0_bar_lie=None,
        signal_etendue_mv=None,
        signal_pa_meteociel=None,
        date=date(2025, 3, 1),
        operateur="Jean Dupont",
    )


@pytest.fixture
def mock_embase_repository():
    """Mock du repository Embase."""
    mock = MagicMock()
    mock.exists_by_identifier.return_value = False
    mock.exists_duplicate.return_value = False
    return mock


@pytest.fixture
def mock_etalonnage_repository():
    """Mock du repository Etalonnage."""
    mock = MagicMock()
    mock.exists_by_embase_voie_date.return_value = False
    return mock
