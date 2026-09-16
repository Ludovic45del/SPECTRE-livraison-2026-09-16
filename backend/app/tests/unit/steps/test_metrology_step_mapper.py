"""
Tests unitaires pour le mapper MetrologyStep.

Vérifie les conversions Entity ↔ Bean ↔ API, en particulier les liens fichiers
(metro_file_link, visrad_link) déplacés du scellement vers la métrologie (R15).
"""

from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
from app.mapper.steps.metrology_step_mapper import (
    metrology_step_mapper_api_to_bean,
    metrology_step_mapper_bean_to_api,
    metrology_step_mapper_bean_to_entity,
    metrology_step_mapper_entity_to_bean,
)

METRO_LINK = "\\\\serveur\\metro\\fsec-001.txt"
VISRAD_LINK = "https://intranet/visrad/fsec-001"


@pytest.fixture
def sample_metrology_bean():
    """Bean MetrologyStep de test avec liens fichiers."""
    return MetrologyStepBean(
        uuid="metro-uuid-1",
        fsec_version_id="fsec-uuid-1",
        date=date(2025, 2, 20),
        comments="Métrologie OK",
        machine_uuids=[],
        metro_file_link=METRO_LINK,
        visrad_link=VISRAD_LINK,
    )


def _make_mock_metrology_entity(metro_file_link=METRO_LINK, visrad_link=VISRAD_LINK):
    """Mock MetrologyStepEntity (M2M machines/métrologues vides)."""
    mock = MagicMock()
    mock.uuid = "metro-uuid-1"
    mock.fsec_version_id_id = "fsec-uuid-1"
    mock.rack_id_id = None
    mock.metrologist_name = None
    mock.metrologist_user_id = None
    mock.metrologist_users.all.return_value = []
    mock.machines.all.return_value = []
    mock.date = date(2025, 2, 20)
    mock.comments = "Métrologie OK"
    mock.metro_file_link = metro_file_link
    mock.visrad_link = visrad_link
    return mock


class TestMetrologyStepMapperEntityToBean:
    @pytest.mark.unit
    def test_entity_to_bean_reads_file_links(self):
        result = metrology_step_mapper_entity_to_bean(_make_mock_metrology_entity())

        assert isinstance(result, MetrologyStepBean)
        assert result.metro_file_link == METRO_LINK
        assert result.visrad_link == VISRAD_LINK

    @pytest.mark.unit
    def test_entity_to_bean_links_default_none(self):
        mock = _make_mock_metrology_entity(metro_file_link=None, visrad_link=None)

        result = metrology_step_mapper_entity_to_bean(mock)

        assert result.metro_file_link is None
        assert result.visrad_link is None


class TestMetrologyStepMapperBeanToEntity:
    @pytest.mark.unit
    def test_bean_to_entity_writes_file_links(self, sample_metrology_bean):
        result = metrology_step_mapper_bean_to_entity(sample_metrology_bean)

        assert result.metro_file_link == METRO_LINK
        assert result.visrad_link == VISRAD_LINK


class TestMetrologyStepMapperApiToBean:
    @pytest.mark.unit
    def test_api_to_bean_reads_file_links(self):
        api_data = {
            "uuid": "u",
            "fsec_version_id": "f",
            "metro_file_link": METRO_LINK,
            "visrad_link": VISRAD_LINK,
        }

        result = metrology_step_mapper_api_to_bean(api_data)

        assert result.metro_file_link == METRO_LINK
        assert result.visrad_link == VISRAD_LINK

    @pytest.mark.unit
    def test_api_to_bean_missing_links_default_none(self):
        result = metrology_step_mapper_api_to_bean({"fsec_version_id": "f"})

        assert result.metro_file_link is None
        assert result.visrad_link is None


class TestMetrologyStepMapperBeanToApi:
    @pytest.mark.unit
    def test_bean_to_api_exposes_file_links(self, sample_metrology_bean):
        result = metrology_step_mapper_bean_to_api(sample_metrology_bean)

        assert result["metro_file_link"] == METRO_LINK
        assert result["visrad_link"] == VISRAD_LINK


class TestMetrologyStepMapperRoundtrip:
    @pytest.mark.unit
    def test_bean_to_api_to_bean_preserves_links(self, sample_metrology_bean):
        api_data = metrology_step_mapper_bean_to_api(sample_metrology_bean)
        restored = metrology_step_mapper_api_to_bean(api_data)

        assert restored.metro_file_link == sample_metrology_bean.metro_file_link
        assert restored.visrad_link == sample_metrology_bean.visrad_link
