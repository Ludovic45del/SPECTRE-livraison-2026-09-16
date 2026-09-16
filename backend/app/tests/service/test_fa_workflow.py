"""
Test Service : Workflow FA (Fiche d'Anomalie) complet.

Ce module teste le cycle de vie d'une FA :
- Phase 1 : Ouvert (déclaration anomalie)
- Phase 2 : En cours (analyse et traitement)
- Phase 3 : Clos (résolution)
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.fa.models.fa_bean import FaBean
from app.domain.fa.services.fa_service import create_fa, update_fa


@pytest.fixture
def mock_fa_repo():
    """Mock du repository FA."""
    repo = MagicMock()
    repo.max_sequence_by_fsec_version_id.return_value = 0
    repo.exists_by_identifier.return_value = False
    return repo


@pytest.fixture
def fsec_version_uuid():
    """UUID de version FSEC pour les FA."""
    return str(uuid.uuid4())


@pytest.mark.service
class TestFaWorkflowComplete:
    """Tests du workflow FA complet : Ouvert → En cours → Clos."""

    def test_complete_fa_lifecycle(self, mock_fa_repo, fsec_version_uuid):
        """
        Scénario service complet :
        1. Création FA (Phase Ouvert)
        2. Remplissage Phase 1 (déclaration)
        3. Passage En cours (Phase 2)
        4. Analyse et traitement
        5. Clôture FA
        """
        # Phase 1 : Ouvert - Déclaration de l'anomalie
        fa_uuid = str(uuid.uuid4())
        fa_bean = FaBean(
            uuid=fa_uuid,
            fsec_version_id=fsec_version_uuid,
            identifier="FA-2025-001",
            status_id=0,  # Ouvert
            # Phase 1 - Déclaration
            fsec_step_id=2,  # Métrologie
            fsec_step_other=None,
            event_date=date(2025, 2, 15),
            discoverer="Jean Dupont",
            observation="Anomalie détectée lors de la métrologie",
            location_equipment="Salle métrologie - Machine M01",
            quick_analysis="Écart de mesure détecté",
            immediate_measures="Arrêt de la procédure",
            # Phase 2 - Vide pour l'instant
            cause=None,
            type_id=None,
            criticality_id=None,
            experience_impact=None,
            # Autres
        )

        mock_fa_repo.create.return_value = fa_bean
        created_fa = create_fa(
            mock_fa_repo, fa_bean, campaign_name="Test", fsec_name="FSEC-01", year=2025
        )

        assert created_fa.uuid == fa_uuid
        assert created_fa.status_id == 0  # Ouvert
        assert created_fa.discoverer == "Jean Dupont"
        assert created_fa.observation == "Anomalie détectée lors de la métrologie"
        mock_fa_repo.create.assert_called_once()

        # Phase 2 : En cours - Analyse et traitement
        fa_bean.status_id = 1  # En cours
        fa_bean.cause = "Défaut de calibration de la machine M01"
        fa_bean.type_id = 1  # Matériel (5M)
        fa_bean.criticality_id = 2  # Moyenne
        fa_bean.experience_impact = "Retard de 2 jours sur la campagne"

        mock_fa_repo.update.return_value = fa_bean
        mock_fa_repo.get_by_uuid.return_value = fa_bean

        updated_fa = update_fa(mock_fa_repo, fa_bean)

        assert updated_fa.status_id == 1  # En cours
        assert updated_fa.cause is not None
        assert updated_fa.type_id == 1
        assert updated_fa.criticality_id == 2
        mock_fa_repo.update.assert_called_once()

        # Phase 3 : Clos - Résolution
        fa_bean.status_id = 2  # Clos

        mock_fa_repo.update.return_value = fa_bean

        final_fa = update_fa(mock_fa_repo, fa_bean)

        assert final_fa.status_id == 2  # Clos


@pytest.mark.service
class TestFaPhase1:
    """Tests spécifiques à la Phase 1 (Ouvert)."""

    def test_create_fa_with_minimal_data(self, mock_fa_repo, fsec_version_uuid):
        """Test création FA avec données minimales obligatoires."""
        fa_bean = FaBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            identifier="FA-2025-002",
            status_id=0,
            fsec_step_id=None,
            fsec_step_other=None,
            event_date=date(2025, 2, 20),
            discoverer="Marie Martin",
            observation="Anomalie mineure observée",
            location_equipment=None,
            quick_analysis="À investiguer",
            immediate_measures=None,
            cause=None,
            type_id=None,
            criticality_id=None,
            experience_impact=None,
        )

        mock_fa_repo.create.return_value = fa_bean
        created_fa = create_fa(
            mock_fa_repo, fa_bean, campaign_name="Test", fsec_name="FSEC-01", year=2025
        )

        assert created_fa.discoverer == "Marie Martin"
        assert created_fa.observation == "Anomalie mineure observée"
        assert created_fa.location_equipment is None  # Optionnel

    def test_create_fa_with_custom_fsec_step(self, mock_fa_repo, fsec_version_uuid):
        """Test création FA avec étape FSEC personnalisée (Autre)."""
        fa_bean = FaBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            identifier="FA-2025-003",
            status_id=0,
            fsec_step_id=7,  # Autre
            fsec_step_other="Étape transport",  # Personnalisé
            event_date=date(2025, 2, 25),
            discoverer="Pierre Durand",
            observation="Dommage pendant transport",
            location_equipment="Zone de rangement",
            quick_analysis="Choc détecté",
            immediate_measures="Mise en quarantaine",
            cause=None,
            type_id=None,
            criticality_id=None,
            experience_impact=None,
        )

        mock_fa_repo.create.return_value = fa_bean
        created_fa = create_fa(
            mock_fa_repo, fa_bean, campaign_name="Test", fsec_name="FSEC-01", year=2025
        )

        assert created_fa.fsec_step_id == 7
        assert created_fa.fsec_step_other == "Étape transport"


@pytest.mark.service
class TestFaPhase2:
    """Tests spécifiques à la Phase 2 (En cours)."""

    def test_update_fa_with_analysis(self, mock_fa_repo, fsec_version_uuid):
        """Test mise à jour FA avec analyse complète."""
        fa_uuid = str(uuid.uuid4())
        fa_bean = FaBean(
            uuid=fa_uuid,
            fsec_version_id=fsec_version_uuid,
            identifier="FA-2025-004",
            status_id=1,  # En cours
            fsec_step_id=3,  # Scellement
            fsec_step_other=None,
            event_date=date(2025, 3, 1),
            discoverer="Test User",
            observation="Défaut scellement",
            location_equipment="Salle scellement",
            quick_analysis="Analyse initiale",
            immediate_measures=None,
            # Analyse Phase 2
            cause="Joint défectueux - lot 2025-A1",
            type_id=1,  # Matériel
            criticality_id=3,  # Haute
            experience_impact="Risque de fuite - FSEC inutilisable",
        )

        mock_fa_repo.update.return_value = fa_bean
        mock_fa_repo.get_by_uuid.return_value = fa_bean

        updated_fa = update_fa(mock_fa_repo, fa_bean)

        assert updated_fa.cause == "Joint défectueux - lot 2025-A1"
        assert updated_fa.type_id == 1
        assert updated_fa.criticality_id == 3

    @pytest.mark.parametrize(
        "type_id,type_name",
        [
            (0, "Main d'oeuvre"),
            (1, "Matériel"),
            (2, "Méthode"),
            (3, "Milieu"),
            (4, "Matière"),
        ],
    )
    def test_fa_types_5m(self, mock_fa_repo, fsec_version_uuid, type_id, type_name):
        """Test tous les types 5M disponibles."""
        fa_bean = FaBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            identifier=f"FA-Type-{type_id}",
            status_id=1,
            fsec_step_id=None,
            fsec_step_other=None,
            event_date=date(2025, 3, 5),
            discoverer="Test",
            observation="Test type",
            location_equipment=None,
            quick_analysis="Test",
            immediate_measures=None,
            cause=f"Test cause {type_name}",
            type_id=type_id,
            criticality_id=1,
            experience_impact=None,
        )

        mock_fa_repo.update.return_value = fa_bean
        mock_fa_repo.get_by_uuid.return_value = fa_bean

        updated_fa = update_fa(mock_fa_repo, fa_bean)

        assert updated_fa.type_id == type_id

    @pytest.mark.parametrize(
        "criticality_id,criticality_name",
        [
            (0, "Faible"),
            (1, "Moyenne"),
            (2, "Haute"),
            (3, "Critique"),
        ],
    )
    def test_fa_criticality_levels(
        self, mock_fa_repo, fsec_version_uuid, criticality_id, criticality_name
    ):
        """Test tous les niveaux de criticité disponibles."""
        fa_bean = FaBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            identifier=f"FA-Criticality-{criticality_id}",
            status_id=1,
            fsec_step_id=None,
            fsec_step_other=None,
            event_date=date(2025, 3, 10),
            discoverer="Test",
            observation="Test criticality",
            location_equipment=None,
            quick_analysis="Test",
            immediate_measures=None,
            cause="Test cause",
            type_id=0,
            criticality_id=criticality_id,
            experience_impact=None,
        )

        mock_fa_repo.update.return_value = fa_bean
        mock_fa_repo.get_by_uuid.return_value = fa_bean

        updated_fa = update_fa(mock_fa_repo, fa_bean)

        assert updated_fa.criticality_id == criticality_id


@pytest.mark.service
class TestFaPhase3:
    """Tests spécifiques à la Phase 3 (Clos)."""

    def test_close_fa(self, mock_fa_repo, fsec_version_uuid):
        """Test clôture d'une FA."""
        fa_bean = FaBean(
            uuid=str(uuid.uuid4()),
            fsec_version_id=fsec_version_uuid,
            identifier="FA-2025-Close",
            status_id=2,  # Clos
            fsec_step_id=1,
            fsec_step_other=None,
            event_date=date(2025, 3, 15),
            discoverer="Closer",
            observation="Anomalie résolue",
            location_equipment=None,
            quick_analysis="Analyse terminée",
            immediate_measures="Mesures appliquées",
            cause="Cause identifiée et corrigée",
            type_id=2,  # Méthode
            criticality_id=1,  # Moyenne
            experience_impact="Aucun impact final",
        )

        mock_fa_repo.update.return_value = fa_bean
        mock_fa_repo.get_by_uuid.return_value = fa_bean

        closed_fa = update_fa(mock_fa_repo, fa_bean)

        assert closed_fa.status_id == 2  # Clos
        assert closed_fa.cause is not None


@pytest.mark.service
class TestFaStatusProtection:
    """Tests que update_fa ne peut pas modifier le statut."""

    def test_update_fa_cannot_change_status(self, mock_fa_repo, fsec_version_uuid):
        """Test que update_fa préserve le statut existant (transitions via workflow uniquement)."""
        fa_uuid = str(uuid.uuid4())

        # FA existante au statut Ouvert (0)
        existing = FaBean(
            uuid=fa_uuid,
            fsec_version_id=fsec_version_uuid,
            identifier="FA-Protected",
            status_id=0,  # Ouvert
            event_date=date(2025, 3, 20),
            discoverer="Test",
            observation="Test",
            quick_analysis="Test",
        )

        # Tentative de changement de statut via update
        updated = FaBean(
            uuid=fa_uuid,
            status_id=2,  # Tente de passer à Clos
        )

        mock_fa_repo.get_by_uuid.return_value = existing

        def capture_update(bean):
            return bean

        mock_fa_repo.update.side_effect = capture_update

        result = update_fa(mock_fa_repo, updated)

        assert result.status_id == 0  # Le statut reste Ouvert
