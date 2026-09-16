"""
Tests unitaires pour le PATCH Campaign.
"""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.campaign.services.campaign_service import patch_campaign
from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)


class TestCampaignServicePatch:
    """Tests patch_campaign."""

    @pytest.mark.unit
    def test_patch_campaign_success(self):
        """Test qu'un PATCH ne modifie QUE les champs fournis."""
        mock_repo = MagicMock()
        campaign_uuid = str(uuid.uuid4())

        # Bean existant complet
        existing_bean = CampaignBean(
            uuid=campaign_uuid,
            name="Old Name",
            year=2024,
            description="Important Description",  # Ne doit PAS être perdu
            semester="S1",
        )
        mock_repo.get_by_uuid.return_value = existing_bean
        mock_repo.exists_duplicate.return_value = False  # No conflict

        # On update juste le nom
        partial_data = {"name": "New Name"}

        # Le repo.update doit être appelé avec le bean fusionné
        patch_campaign(mock_repo, campaign_uuid, partial_data)

        # Vérification
        mock_repo.update.assert_called_once()
        updated_bean = mock_repo.update.call_args[0][0]

        assert updated_bean.name == "New Name"  # Modifié
        assert updated_bean.year == 2024  # Conservé
        assert (
            updated_bean.description == "Important Description"
        )  # CONSERVÉ ! (Bug fixé)

    @pytest.mark.unit
    def test_patch_campaign_not_found(self):
        """Test qu'un PATCH sur campagne inexistante lève NotFoundException."""
        mock_repo = MagicMock()
        mock_repo.get_by_uuid.return_value = None
        fake_uuid = str(uuid.uuid4())

        with pytest.raises(NotFoundException):
            patch_campaign(mock_repo, fake_uuid, {"name": "New"})

        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_campaign_conflict(self):
        """Test qu'un PATCH créant un doublon lève ConflictException."""
        mock_repo = MagicMock()
        campaign_uuid = str(uuid.uuid4())
        existing_bean = CampaignBean(
            uuid=campaign_uuid,
            name="Old Name",
            year=2024,
            semester="S1",
        )
        mock_repo.get_by_uuid.return_value = existing_bean
        mock_repo.exists_duplicate.return_value = True

        with pytest.raises(ConflictException):
            patch_campaign(mock_repo, campaign_uuid, {"name": "Duplicate Name"})

        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_campaign_invalid_date_range(self):
        """Test qu'un PATCH avec dates incohérentes lève ValidationException."""
        mock_repo = MagicMock()
        campaign_uuid = str(uuid.uuid4())
        existing_bean = CampaignBean(
            uuid=campaign_uuid,
            name="Test",
            year=2024,
            semester="S1",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )
        mock_repo.get_by_uuid.return_value = existing_bean

        with pytest.raises(ValidationException):
            patch_campaign(mock_repo, campaign_uuid, {"start_date": date(2025, 1, 1)})

        mock_repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_campaign_invalid_type(self):
        """Test qu'un PATCH avec type invalide lève ValidationException."""
        mock_repo = MagicMock()
        campaign_uuid = str(uuid.uuid4())
        existing_bean = CampaignBean(
            uuid=campaign_uuid,
            name="Test",
            year=2024,
            semester="S1",
        )
        mock_repo.get_by_uuid.return_value = existing_bean

        with pytest.raises(ValidationException):
            patch_campaign(mock_repo, campaign_uuid, {"year": "not_an_int"})

        mock_repo.update.assert_not_called()
