"""
Tests unitaires pour le service Steps generique.

Verifie les fonctions CRUD generiques utilisees par tous les steps.
Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
from dataclasses import dataclass
from unittest.mock import MagicMock

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.steps.services import steps_service as svc
from app.domain.steps.services.steps_service import (
    create_step,
    delete_step,
    get_all_gas_steps_by_fsec,
    get_photo_views_by_pictures_step,
    get_sealing_by_metrology,
    get_step_by_uuid,
    get_steps_by_fsec_version_id,
    update_step,
)

# ============================================================================
# Module-level attributes
# ============================================================================


@pytest.mark.unit
class TestModuleLevelAttributes:

    def test_logger_exists(self):
        assert svc.logger is not None
        assert isinstance(svc.logger, logging.Logger)


# ============================================================================
# Helpers: lightweight bean stubs
# ============================================================================


@dataclass
class _FakeStepBean:
    """Lightweight stub for testing without needing real beans."""

    uuid: str = "fake-uuid"
    fsec_version_id: str = "fake-fsec-version"
    comments: str = ""


@dataclass
class _FakeSealingBean:
    """Stub for sealing step (metrology_step_id, no fsec_version_id)."""

    uuid: str = "sealing-uuid"
    metrology_step_id: str = "metro-step-id"
    comments: str = ""


@dataclass
class _FakeBareBean:
    """Bean without fsec_version_id or metrology_step_id."""

    uuid: str = "bare-uuid"
    comments: str = ""


# ============================================================================
# CREATE TESTS
# ============================================================================


@pytest.mark.unit
class TestStepsServiceCreate:
    """Tests creation de step."""

    def test_create_step_success(self, sample_assembly_step_bean):
        """Test creation reussie d'un step."""
        mock_repo = MagicMock()
        mock_repo.create.return_value = sample_assembly_step_bean

        result = create_step(mock_repo, sample_assembly_step_bean)

        assert result.uuid == sample_assembly_step_bean.uuid
        assert result is sample_assembly_step_bean
        mock_repo.create.assert_called_once_with(sample_assembly_step_bean)

    def test_create_multiple_steps_types(
        self,
        sample_assembly_step_bean,
        sample_metrology_step_bean,
        sample_pictures_step_bean,
    ):
        """Test creation de differents types de steps (avec fsec_version_id)."""
        for step_bean in [
            sample_assembly_step_bean,
            sample_metrology_step_bean,
            sample_pictures_step_bean,
        ]:
            mock_repo = MagicMock()
            mock_repo.create.return_value = step_bean

            result = create_step(mock_repo, step_bean)

            assert result.uuid == step_bean.uuid
            mock_repo.create.assert_called_once()

    def test_create_step_with_metrology_step_id(self):
        """Test creation d'un step avec metrology_step_id (SealingStep)."""
        mock_repo = MagicMock()
        bean = _FakeSealingBean()
        mock_repo.create.return_value = bean

        result = create_step(mock_repo, bean)

        assert result is bean
        mock_repo.create.assert_called_once_with(bean)

    def test_create_step_without_fsec_or_metrology_raises(self):
        """Test ValidationException quand ni fsec_version_id ni metrology_step_id."""
        mock_repo = MagicMock()
        bean = _FakeBareBean()

        with pytest.raises(ValidationException) as exc_info:
            create_step(mock_repo, bean)

        assert exc_info.value.field == "fsec_version_id"
        mock_repo.create.assert_not_called()

    def test_create_step_fsec_version_id_empty_string_raises(self):
        """Test that empty fsec_version_id is treated as falsy."""
        mock_repo = MagicMock()
        bean = _FakeStepBean(fsec_version_id="")

        with pytest.raises(ValidationException) as exc_info:
            create_step(mock_repo, bean)

        assert exc_info.value.field == "fsec_version_id"

    def test_create_step_fsec_version_id_none_and_metrology_none_raises(self):
        """Both None raises."""
        mock_repo = MagicMock()
        bean = _FakeStepBean(fsec_version_id=None)

        with pytest.raises(ValidationException):
            create_step(mock_repo, bean)

    def test_create_step_fsec_version_id_none_but_metrology_id_set(self):
        """metrology_step_id set should pass even if fsec_version_id is missing."""
        mock_repo = MagicMock()
        bean = _FakeSealingBean(metrology_step_id="some-id")
        mock_repo.create.return_value = bean

        result = create_step(mock_repo, bean)
        assert result is bean


# ============================================================================
# GET TESTS
# ============================================================================


@pytest.mark.unit
class TestStepsServiceGet:
    """Tests recuperation de step."""

    def test_get_step_by_uuid_success(self, sample_assembly_step_bean):
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_assembly_step_bean

        result = get_step_by_uuid(
            mock_repo, sample_assembly_step_bean.uuid, "AssemblyStep"
        )

        assert result is sample_assembly_step_bean
        mock_repo.get_by_uuid.assert_called_once_with(sample_assembly_step_bean.uuid)

    def test_get_step_by_uuid_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_step_by_uuid(mock_repo, "fake-uuid", "AssemblyStep")

        assert exc_info.value.resource == "AssemblyStep"
        assert exc_info.value.identifier == "fake-uuid"

    def test_get_step_by_uuid_different_step_names(self):
        """Verify that the step_name is correctly passed to the exception."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        for step_name in [
            "AssemblyStep",
            "MetrologyStep",
            "SealingStep",
            "PicturesStep",
        ]:
            with pytest.raises(NotFoundException) as exc_info:
                get_step_by_uuid(mock_repo, "uid", step_name)
            assert exc_info.value.resource == step_name

    def test_get_steps_by_fsec_version_id(self, sample_assembly_step_bean):
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_version_id.return_value = [sample_assembly_step_bean]

        result = get_steps_by_fsec_version_id(
            mock_repo, sample_assembly_step_bean.fsec_version_id
        )

        assert len(result) == 1
        assert result[0] is sample_assembly_step_bean
        mock_repo.get_by_fsec_version_id.assert_called_once_with(
            sample_assembly_step_bean.fsec_version_id
        )

    def test_get_steps_by_fsec_version_id_empty(self):
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_version_id.return_value = []

        result = get_steps_by_fsec_version_id(mock_repo, "some-id")

        assert result == []


# ============================================================================
# UPDATE TESTS
# ============================================================================


@pytest.mark.unit
class TestStepsServiceUpdate:
    """Tests mise a jour de step."""

    def test_update_step_success(self, sample_assembly_step_bean):
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = sample_assembly_step_bean
        updated_bean = _FakeStepBean(
            uuid=sample_assembly_step_bean.uuid, comments="Modifie"
        )
        mock_repo.update.return_value = updated_bean

        result = update_step(mock_repo, updated_bean, "AssemblyStep")

        assert result is updated_bean
        mock_repo.get_by_uuid.assert_called_once_with(updated_bean.uuid)
        mock_repo.update.assert_called_once_with(updated_bean)

    def test_update_step_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        bean = _FakeStepBean(uuid="nonexistent")

        with pytest.raises(NotFoundException) as exc_info:
            update_step(mock_repo, bean, "AssemblyStep")

        assert exc_info.value.resource == "AssemblyStep"
        assert "nonexistent" in exc_info.value.identifier
        mock_repo.update.assert_not_called()

    def test_update_step_different_step_names(self):
        """step_name should appear in the NotFoundException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None

        for step_name in ["MetrologyStep", "SealingStep", "PicturesStep"]:
            bean = _FakeStepBean(uuid="uid")
            with pytest.raises(NotFoundException) as exc_info:
                update_step(mock_repo, bean, step_name)
            assert exc_info.value.resource == step_name


# ============================================================================
# DELETE TESTS
# ============================================================================


@pytest.mark.unit
class TestStepsServiceDelete:
    """Tests suppression de step."""

    def test_delete_step_success(self):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = True

        result = delete_step(mock_repo, "some-uuid", "AssemblyStep")

        assert result is True
        mock_repo.delete.assert_called_once_with("some-uuid")

    def test_delete_step_not_found(self):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_step(mock_repo, "fake-uuid", "AssemblyStep")

        assert exc_info.value.resource == "AssemblyStep"
        assert exc_info.value.identifier == "fake-uuid"

    def test_delete_step_different_step_names(self):
        mock_repo = MagicMock()
        mock_repo.delete.return_value = False

        for step_name in ["MetrologyStep", "SealingStep", "PicturesStep"]:
            with pytest.raises(NotFoundException) as exc_info:
                delete_step(mock_repo, "uid", step_name)
            assert exc_info.value.resource == step_name


# ============================================================================
# SPECIALIZED OPERATIONS
# ============================================================================


@pytest.mark.unit
class TestGetSealingByMetrology:

    def test_returns_bean_from_repo(self):
        mock_repo = MagicMock()
        bean = _FakeSealingBean()
        mock_repo.get_by_metrology_step_id.return_value = bean

        result = get_sealing_by_metrology(mock_repo, "metro-id")

        assert result is bean
        mock_repo.get_by_metrology_step_id.assert_called_once_with("metro-id")

    def test_returns_none_when_not_found(self):
        mock_repo = MagicMock()
        mock_repo.get_by_metrology_step_id.return_value = None

        result = get_sealing_by_metrology(mock_repo, "metro-id")

        assert result is None


@pytest.mark.unit
class TestGetPhotoViewsByPicturesStep:

    def test_returns_views_from_repo(self):
        mock_repo = MagicMock()
        views = [{"id": "v1"}, {"id": "v2"}]
        mock_repo.get_by_pictures_step_id.return_value = views

        result = get_photo_views_by_pictures_step(mock_repo, "pics-step-id")

        assert result == views
        assert len(result) == 2
        mock_repo.get_by_pictures_step_id.assert_called_once_with("pics-step-id")

    def test_returns_empty_list(self):
        mock_repo = MagicMock()
        mock_repo.get_by_pictures_step_id.return_value = []

        result = get_photo_views_by_pictures_step(mock_repo, "pics-step-id")

        assert result == []


@pytest.mark.unit
class TestGetAllGasStepsByFsec:

    def test_aggregates_all_types(self):
        """Test that all gas step types are aggregated."""
        mock_repos = {
            "airtightness_test_lp": MagicMock(),
            "gas_filling_bp": MagicMock(),
            "gas_filling_hp": MagicMock(),
            "permeation": MagicMock(),
            "depressurization": MagicMock(),
            "repressurization": MagicMock(),
        }

        bean_a = _FakeStepBean(uuid="a1")
        bean_b = _FakeStepBean(uuid="b1")

        mock_repos["airtightness_test_lp"].get_by_fsec_version_id.return_value = [
            bean_a
        ]
        mock_repos["gas_filling_bp"].get_by_fsec_version_id.return_value = [bean_b]
        mock_repos["gas_filling_hp"].get_by_fsec_version_id.return_value = []
        mock_repos["permeation"].get_by_fsec_version_id.return_value = []
        mock_repos["depressurization"].get_by_fsec_version_id.return_value = []
        mock_repos["repressurization"].get_by_fsec_version_id.return_value = []

        mock_mappers = {
            key: MagicMock(side_effect=lambda b: {"uuid": b.uuid})
            for key in mock_repos.keys()
        }

        result = get_all_gas_steps_by_fsec(mock_repos, mock_mappers, "fsec-v1")

        assert len(result) == 6
        assert len(result["airtightness_test_lp"]) == 1
        assert result["airtightness_test_lp"][0]["uuid"] == "a1"
        assert len(result["gas_filling_bp"]) == 1
        assert result["gas_filling_bp"][0]["uuid"] == "b1"
        assert len(result["gas_filling_hp"]) == 0
        assert len(result["permeation"]) == 0
        assert len(result["depressurization"]) == 0
        assert len(result["repressurization"]) == 0

        for key, repo in mock_repos.items():
            repo.get_by_fsec_version_id.assert_called_once_with("fsec-v1")

    def test_empty_repos(self):
        mock_repos = {"type_a": MagicMock(), "type_b": MagicMock()}
        mock_repos["type_a"].get_by_fsec_version_id.return_value = []
        mock_repos["type_b"].get_by_fsec_version_id.return_value = []

        mock_mappers = {key: MagicMock() for key in mock_repos.keys()}

        result = get_all_gas_steps_by_fsec(mock_repos, mock_mappers, "fsec-v1")

        assert result == {"type_a": [], "type_b": []}

    def test_mapper_called_for_each_bean(self):
        bean1 = _FakeStepBean(uuid="s1")
        bean2 = _FakeStepBean(uuid="s2")
        mock_repo = MagicMock()
        mock_repo.get_by_fsec_version_id.return_value = [bean1, bean2]
        mock_mapper = MagicMock(side_effect=lambda b: {"uuid": b.uuid})

        result = get_all_gas_steps_by_fsec(
            {"step_type": mock_repo}, {"step_type": mock_mapper}, "fsec-v1"
        )

        assert mock_mapper.call_count == 2
        assert len(result["step_type"]) == 2


# ============================================================================
# GAS STEPS with real fixture beans
# ============================================================================


@pytest.mark.unit
class TestStepsServiceGasSteps:
    """Tests specifiques aux Gas Steps."""

    def test_create_airtightness_step(self, sample_airtightness_step_bean):
        mock_repo = MagicMock()
        mock_repo.create.return_value = sample_airtightness_step_bean

        result = create_step(mock_repo, sample_airtightness_step_bean)

        assert result.gas_type == "Helium"
        assert result.experiment_pressure == 1.5
        assert result.operator == "Jean Dupont"
        assert result is sample_airtightness_step_bean

    def test_create_sealing_step_with_metrology_id(self, sample_sealing_step_bean):
        """SealingStep has metrology_step_id instead of fsec_version_id."""
        mock_repo = MagicMock()
        mock_repo.create.return_value = sample_sealing_step_bean

        result = create_step(mock_repo, sample_sealing_step_bean)

        assert result is sample_sealing_step_bean
        mock_repo.create.assert_called_once()


# ============================================================================
# MUTATION-KILLING: TypeVar name and error messages
# ============================================================================


@pytest.mark.unit
class TestStepsServiceMutationKilling:
    """Kill mutants on TypeVar name and error messages."""

    def test_stepbean_typevar_name(self):
        """Kill TypeVar name mutation: StepBean = TypeVar('StepBean') -> TypeVar('XXStepBeanXX')."""
        from app.domain.steps.services.steps_service import StepBean

        assert StepBean.__name__ == "StepBean"

    def test_create_step_validation_error_message(self):
        """Verify ValidationException message content."""
        mock_repo = MagicMock()
        bean = _FakeBareBean()

        with pytest.raises(ValidationException) as exc_info:
            create_step(mock_repo, bean)

        msg = str(exc_info.value)
        assert "fsec_version_id" in msg
        assert "obligatoire" in msg

    def test_create_step_validation_error_mentions_metrology(self):
        """Verify the message mentions metrology_step_id as alternative."""
        mock_repo = MagicMock()
        bean = _FakeBareBean()

        with pytest.raises(ValidationException) as exc_info:
            create_step(mock_repo, bean)

        msg = str(exc_info.value)
        assert "metrology_step_id" in msg
