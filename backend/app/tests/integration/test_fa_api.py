"""
Tests d'intégration API pour le FA Controller.

Ces tests vérifient que les endpoints REST fonctionnent correctement
avec les mappers et le service layer (repository mocké).
"""

import json
from datetime import date
from unittest.mock import patch

import pytest
from django.test import RequestFactory

from app.api.fa.fa_controller import FaController
from app.domain.exceptions import ConflictException, NotFoundException

SAMPLE_FA_UUID = "12345678-1234-1234-1234-123456789abc"
SAMPLE_FSEC_VERSION_UUID = "981b3cfb-2fba-4b30-ad2d-cbdd73f3334a"
SAMPLE_NONEXISTENT_UUID = "00000000-0000-0000-0000-000000000001"

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def request_factory():
    """Django RequestFactory for creating test requests."""
    return RequestFactory()


@pytest.fixture
def sample_fa_uuid() -> str:
    """UUID fixe pour FA."""
    return SAMPLE_FA_UUID


@pytest.fixture
def sample_fsec_version_id() -> str:
    """UUID version FSEC fixe pour tests."""
    return SAMPLE_FSEC_VERSION_UUID


@pytest.fixture
def sample_fa_bean(sample_fa_uuid, sample_fsec_version_id):
    """Bean FA de test."""
    from app.domain.fa.models.fa_bean import FaBean

    return FaBean(
        uuid=sample_fa_uuid,
        fsec_version_id=sample_fsec_version_id,
        status_id=0,
        type_id=1,
        criticality_id=2,
        identifier="FA_2025_Test_FSEC01",
        fsec_step_id=3,
        fsec_step_other=None,
        discoverer="Jean Dupont",
        event_date=date(2025, 3, 15),
        observation="Constat test",
        location_equipment="Banc A",
        quick_analysis="Analyse rapide test",
        immediate_measures="Mesures immédiates test",
        iec_validation_open=True,
        iec_validation_open_date=date(2025, 3, 16),
        iec_validation_open_name="Valideur IEC",
        cause="Cause identifiée",
        experience_impact="Impact test",
        iec_validation_progress=False,
        iec_validation_progress_name=None,
        closure_validation=None,
        closure_date=None,
        closure_validator_name=None,
    )


# ============================================================================
# HELPERS
# ============================================================================


def _make_get(factory, url):
    """Create GET request with .query_params for DRF compatibility."""
    request = factory.get(url)
    request.query_params = {}
    return request


def _make_post(factory, url, data):
    """Create POST request with .data for DRF compatibility."""
    request = factory.post(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


def _make_put(factory, url, data):
    """Create PUT request with .data for DRF compatibility."""
    request = factory.put(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


def _make_patch(factory, url, data):
    """Create PATCH request with .data for DRF compatibility."""
    request = factory.patch(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


# ============================================================================
# LIST TESTS
# ============================================================================


class TestFaControllerList:
    """Tests pour GET / (list)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_all_fas")
    def test_list_returns_empty_array(self, mock_get_all_fas, request_factory):
        """Test GET / retourne un tableau vide si pas de FA."""
        mock_get_all_fas.return_value = []

        request = _make_get(request_factory, "/api/fa/")
        controller = FaController()
        response = controller.list(request)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_all_fas")
    def test_list_returns_fas(self, mock_get_all_fas, request_factory, sample_fa_bean):
        """Test GET / retourne la liste des FA."""
        mock_get_all_fas.return_value = [sample_fa_bean]

        request = _make_get(request_factory, "/api/fa/")
        controller = FaController()
        response = controller.list(request)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["uuid"] == sample_fa_bean.uuid
        assert data[0]["identifier"] == sample_fa_bean.identifier


# ============================================================================
# RETRIEVE TESTS
# ============================================================================


class TestFaControllerRetrieve:
    """Tests pour GET /:uuid (retrieve)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_fa_by_uuid")
    def test_retrieve_returns_fa(
        self, mock_get_fa, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test GET /:uuid retourne la FA."""
        mock_get_fa.return_value = sample_fa_bean

        request = request_factory.get(f"/api/fa/{sample_fa_uuid}/")
        controller = FaController()
        response = controller.retrieve(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["uuid"] == sample_fa_uuid
        assert data["identifier"] == sample_fa_bean.identifier
        assert data["discoverer"] == sample_fa_bean.discoverer

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_fa_by_uuid")
    def test_retrieve_not_found_raises_exception(self, mock_get_fa, request_factory):
        """Test GET /:uuid lève NotFoundException si FA non trouvée."""
        mock_get_fa.side_effect = NotFoundException("FA", "fake-uuid")

        request = request_factory.get("/api/fa/fake-uuid/")
        controller = FaController()

        with pytest.raises(NotFoundException):
            controller.retrieve(request, uuid="fake-uuid")


# ============================================================================
# CREATE TESTS
# ============================================================================


class TestFaControllerCreate:
    """Tests pour POST / (create)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.create_fa")
    @patch("app.api.fa.fa_controller.resolve_fa_creation_context")
    def test_create_returns_201(
        self,
        mock_resolve_context,
        mock_create_fa,
        request_factory,
        sample_fa_bean,
        sample_fsec_version_id,
    ):
        """Test POST / crée une FA et retourne 201."""
        from app.domain.fa.models.fa_creation_context_bean import FaCreationContextBean

        mock_resolve_context.return_value = FaCreationContextBean(
            campaign_name="Campagne Test",
            fsec_name="FSEC Test",
            year=2025,
        )
        mock_create_fa.return_value = sample_fa_bean

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "discoverer": "Jean Dupont",
            "event_date": "2025-03-15",
            "observation": "Constat test",
            "quick_analysis": "Analyse rapide",
        }
        request = _make_post(request_factory, "/api/fa/", request_data)

        controller = FaController()

        response = controller.create(request)

        assert response.status_code == 201
        data = json.loads(response.content)
        assert data["uuid"] == sample_fa_bean.uuid

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.create_fa")
    @patch("app.api.fa.fa_controller.resolve_fa_creation_context")
    def test_create_conflict_raises_exception(
        self,
        mock_resolve_context,
        mock_create_fa,
        request_factory,
        sample_fsec_version_id,
    ):
        """Test POST / lève ConflictException si FA existe déjà pour la FSEC."""
        from app.domain.fa.models.fa_creation_context_bean import FaCreationContextBean

        mock_resolve_context.return_value = FaCreationContextBean(
            campaign_name="Test",
            fsec_name="FSEC Test",
            year=2025,
        )
        mock_create_fa.side_effect = ConflictException(
            "fsec_version_id", sample_fsec_version_id
        )

        request_data = {
            "fsec_version_id": sample_fsec_version_id,
            "discoverer": "Test",
            "event_date": "2025-03-15",
            "observation": "Test",
            "quick_analysis": "Test",
        }
        request = _make_post(request_factory, "/api/fa/", request_data)

        controller = FaController()

        with pytest.raises(ConflictException):
            controller.create(request)


# ============================================================================
# UPDATE TESTS
# ============================================================================


class TestFaControllerUpdate:
    """Tests pour PUT /:uuid (update)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.update_fa")
    def test_update_returns_200(
        self, mock_update_fa, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test PUT /:uuid met à jour et retourne 200."""
        updated_bean = sample_fa_bean
        updated_bean.discoverer = "Marie Martin (modifié)"
        mock_update_fa.return_value = updated_bean

        request_data = {
            "discoverer": "Marie Martin (modifié)",
            "observation": "Observation modifiée",
        }
        request = _make_put(request_factory, f"/api/fa/{sample_fa_uuid}/", request_data)

        controller = FaController()
        response = controller.update(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["discoverer"] == "Marie Martin (modifié)"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.update_fa")
    def test_update_not_found_raises_exception(self, mock_update_fa, request_factory):
        """Test PUT /:uuid lève NotFoundException si FA non trouvée."""
        fake_uuid = SAMPLE_NONEXISTENT_UUID
        mock_update_fa.side_effect = NotFoundException("FA", fake_uuid)

        request_data = {"discoverer": "Test"}
        request = _make_put(request_factory, f"/api/fa/{fake_uuid}/", request_data)

        controller = FaController()

        with pytest.raises(NotFoundException):
            controller.update(request, uuid=fake_uuid)


# ============================================================================
# PARTIAL UPDATE (PATCH) TESTS
# ============================================================================


class TestFaControllerPartialUpdate:
    """Tests pour PATCH /:uuid (partial_update)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.patch_fa")
    def test_partial_update_returns_200(
        self, mock_patch_fa, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test PATCH /:uuid met à jour partiellement et retourne 200."""
        updated_bean = sample_fa_bean
        updated_bean.cause = "Nouvelle cause"
        mock_patch_fa.return_value = updated_bean

        request_data = {"cause": "Nouvelle cause"}
        request = _make_patch(
            request_factory, f"/api/fa/{sample_fa_uuid}/", request_data
        )

        controller = FaController()
        response = controller.partial_update(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["cause"] == "Nouvelle cause"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.patch_fa")
    def test_partial_update_not_found_raises_exception(
        self, mock_patch_fa, request_factory
    ):
        """Test PATCH /:uuid lève NotFoundException si FA non trouvée."""
        mock_patch_fa.side_effect = NotFoundException("FA", "fake-uuid")

        request_data = {"cause": "Test"}
        request = _make_patch(request_factory, "/api/fa/fake-uuid/", request_data)

        controller = FaController()

        with pytest.raises(NotFoundException):
            controller.partial_update(request, uuid="fake-uuid")


# ============================================================================
# DELETE TESTS
# ============================================================================


class TestFaControllerDelete:
    """Tests pour DELETE /:uuid (destroy)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.delete_fa")
    def test_delete_returns_204(self, mock_delete_fa, request_factory, sample_fa_uuid):
        """Test DELETE /:uuid supprime et retourne 204."""
        mock_delete_fa.return_value = True

        request = request_factory.delete(f"/api/fa/{sample_fa_uuid}/")
        controller = FaController()
        response = controller.destroy(request, uuid=sample_fa_uuid)

        assert response.status_code == 204

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.delete_fa")
    def test_delete_not_found_raises_exception(self, mock_delete_fa, request_factory):
        """Test DELETE /:uuid lève NotFoundException si FA non trouvée."""
        mock_delete_fa.side_effect = NotFoundException("FA", "fake-uuid")

        request = request_factory.delete("/api/fa/fake-uuid/")
        controller = FaController()

        with pytest.raises(NotFoundException):
            controller.destroy(request, uuid="fake-uuid")


# ============================================================================
# CUSTOM ACTIONS TESTS
# ============================================================================


class TestFaControllerCustomActions:
    """Tests pour les actions custom du FA Controller."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_fas_by_fsec_version_id")
    def test_get_by_fsec_returns_fa(
        self, mock_get_fa, request_factory, sample_fsec_version_id, sample_fa_bean
    ):
        """Test GET /fsec/:fsec_version_id retourne la liste des FA de la FSEC."""
        mock_get_fa.return_value = [sample_fa_bean]

        request = request_factory.get(f"/api/fa/fsec/{sample_fsec_version_id}/")
        controller = FaController()
        response = controller.get_by_fsec(
            request, fsec_version_id=sample_fsec_version_id
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert isinstance(data, list)
        assert data[0]["fsec_version_id"] == sample_fsec_version_id

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.get_fas_by_fsec_version_id")
    def test_get_by_fsec_not_found_raises_exception(
        self, mock_get_fa, request_factory, sample_fsec_version_id
    ):
        """Test GET /fsec/:fsec_version_id lève NotFoundException si FA non trouvée."""
        mock_get_fa.side_effect = NotFoundException(
            "FA for FSEC", sample_fsec_version_id
        )

        request = request_factory.get(f"/api/fa/fsec/{sample_fsec_version_id}/")
        controller = FaController()

        with pytest.raises(NotFoundException):
            controller.get_by_fsec(request, fsec_version_id=sample_fsec_version_id)


# ============================================================================
# WORKFLOW ACTIONS TESTS
# ============================================================================


class TestFaControllerWorkflowActions:
    """Tests pour les actions de workflow (validate_open, validate_progress, close)."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_open_phase")
    def test_validate_open_returns_200(
        self, mock_validate, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test POST /:uuid/validate-open valide la phase Ouvert."""
        sample_fa_bean.status_id = 1  # En cours
        sample_fa_bean.iec_validation_open = True
        mock_validate.return_value = sample_fa_bean

        request_data = {
            "validator_name": "Valideur IEC",
            "validation_date": "2025-03-20",
        }
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/validate-open/", request_data
        )

        controller = FaController()
        response = controller.validate_open(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status_id"] == 1
        assert data["iec_validation_open"] is True

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_open_phase")
    def test_validate_open_wrong_status_raises_exception(
        self, mock_validate, request_factory, sample_fa_uuid
    ):
        """Test POST /:uuid/validate-open lève ConflictException si mauvais statut."""
        mock_validate.side_effect = ConflictException(
            "status", "FA must be 'Ouvert' to validate."
        )

        request_data = {"validator_name": "Test"}
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/validate-open/", request_data
        )

        controller = FaController()

        with pytest.raises(ConflictException):
            controller.validate_open(request, uuid=sample_fa_uuid)

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_progress_phase")
    def test_validate_progress_returns_200(
        self, mock_validate, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test POST /:uuid/validate-progress valide la phase En cours."""
        sample_fa_bean.status_id = 2  # Clos
        sample_fa_bean.iec_validation_progress = True
        mock_validate.return_value = sample_fa_bean

        request_data = {
            "validator_name": "Valideur Progress",
            "validation_date": "2025-04-01",
        }
        request = _make_post(
            request_factory,
            f"/api/fa/{sample_fa_uuid}/validate-progress/",
            request_data,
        )

        controller = FaController()
        response = controller.validate_progress(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status_id"] == 2
        assert data["iec_validation_progress"] is True

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.close_fa")
    def test_close_returns_200(
        self, mock_close, request_factory, sample_fa_uuid, sample_fa_bean
    ):
        """Test POST /:uuid/close ferme la FA."""
        sample_fa_bean.status_id = 2
        sample_fa_bean.closure_validation = "FA clôturée avec succès"
        sample_fa_bean.closure_date = date(2025, 4, 15)
        sample_fa_bean.closure_validator_name = "Chef Labo + IEC"
        mock_close.return_value = sample_fa_bean

        request_data = {
            "validator_name": "Chef Labo + IEC",
            "closure_validation": "FA clôturée avec succès",
            "closure_date": "2025-04-15",
        }
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/close/", request_data
        )

        controller = FaController()
        response = controller.close(request, uuid=sample_fa_uuid)

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["status_id"] == 2
        assert data["closure_validation"] == "FA clôturée avec succès"


# ============================================================================
# INVALID STATE TRANSITIONS TESTS
# ============================================================================


class TestFaControllerInvalidStateTransitions:
    """Tests pour les transitions d'état invalides du workflow FA."""

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_open_phase")
    def test_validate_open_on_closed_fa_raises(
        self, mock_validate, request_factory, sample_fa_uuid
    ):
        """Impossible de valider la phase Ouvert si la FA est déjà fermée."""
        mock_validate.side_effect = ConflictException(
            "status",
            "La FA doit être au statut 'Ouvert' pour être validée. Statut actuel : 2",
        )

        request_data = {"validator_name": "Test"}
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/validate-open/", request_data
        )

        controller = FaController()

        with pytest.raises(ConflictException) as exc_info:
            controller.validate_open(request, uuid=sample_fa_uuid)

        assert exc_info.value.field == "status"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_progress_phase")
    def test_validate_progress_on_open_fa_raises(
        self, mock_validate, request_factory, sample_fa_uuid
    ):
        """Impossible de valider la phase En cours si la FA est au statut Ouvert."""
        mock_validate.side_effect = ConflictException(
            "status",
            "La FA doit être au statut 'En cours' pour être validée. Statut actuel : 0",
        )

        request_data = {"validator_name": "Test"}
        request = _make_post(
            request_factory,
            f"/api/fa/{sample_fa_uuid}/validate-progress/",
            request_data,
        )

        controller = FaController()

        with pytest.raises(ConflictException) as exc_info:
            controller.validate_progress(request, uuid=sample_fa_uuid)

        assert exc_info.value.field == "status"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.close_fa")
    def test_close_on_open_fa_raises(self, mock_close, request_factory, sample_fa_uuid):
        """Impossible de fermer une FA au statut Ouvert (doit passer par En cours)."""
        mock_close.side_effect = ConflictException(
            "status",
            "La FA doit être au statut 'En cours' pour être fermée. Statut actuel : 0",
        )

        request_data = {
            "validator_name": "Chef",
            "closure_validation": "Text",
        }
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/close/", request_data
        )

        controller = FaController()

        with pytest.raises(ConflictException) as exc_info:
            controller.close(request, uuid=sample_fa_uuid)

        assert exc_info.value.field == "status"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.close_fa")
    def test_close_without_iec_validation_raises(
        self, mock_close, request_factory, sample_fa_uuid
    ):
        """Impossible de fermer une FA sans validation IEC de la phase En cours."""
        mock_close.side_effect = ConflictException(
            "iec_validation_progress",
            "La validation IEC de la phase 'En cours' est requise avant la fermeture",
        )

        request_data = {
            "validator_name": "Chef",
            "closure_validation": "Text",
        }
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/close/", request_data
        )

        controller = FaController()

        with pytest.raises(ConflictException) as exc_info:
            controller.close(request, uuid=sample_fa_uuid)

        assert exc_info.value.field == "iec_validation_progress"

    @pytest.mark.integration
    @patch("app.api.fa.fa_controller.validate_progress_phase")
    def test_validate_progress_on_closed_fa_raises(
        self, mock_validate, request_factory, sample_fa_uuid
    ):
        """Impossible de valider la phase En cours si la FA est déjà fermée."""
        mock_validate.side_effect = ConflictException(
            "status",
            "La FA doit être au statut 'En cours' pour être validée. Statut actuel : 2",
        )

        request_data = {"validator_name": "Test"}
        request = _make_post(
            request_factory,
            f"/api/fa/{sample_fa_uuid}/validate-progress/",
            request_data,
        )

        controller = FaController()

        with pytest.raises(ConflictException) as exc_info:
            controller.validate_progress(request, uuid=sample_fa_uuid)

        assert exc_info.value.field == "status"


# ============================================================================
# VALIDATION TESTS (input validation)
# ============================================================================


class TestFaControllerValidation:
    """Tests pour la validation des entrées du controller FA."""

    @pytest.mark.integration
    def test_create_missing_validator_name_for_validate_open(
        self, request_factory, sample_fa_uuid
    ):
        """validate-open requiert validator_name OU validator_user_uuid (verification service)."""
        from app.domain.exceptions import ValidationException

        request_data = {}  # Aucun des deux validator_*
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/validate-open/", request_data
        )

        controller = FaController()

        with pytest.raises(ValidationException):
            controller.validate_open(request, uuid=sample_fa_uuid)

    @pytest.mark.integration
    def test_create_missing_validator_name_for_close(
        self, request_factory, sample_fa_uuid
    ):
        """close requiert validator_name OU validator_user_uuid (verification service)."""
        from app.domain.exceptions import ValidationException

        request_data = {"closure_validation": "Text"}  # Aucun des deux validator_*
        request = _make_post(
            request_factory, f"/api/fa/{sample_fa_uuid}/close/", request_data
        )

        controller = FaController()

        with pytest.raises(ValidationException):
            controller.close(request, uuid=sample_fa_uuid)
