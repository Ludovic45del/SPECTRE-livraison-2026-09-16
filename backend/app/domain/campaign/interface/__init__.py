"""Interfaces Campaign - Exports."""

from app.domain.campaign.interface.campaign_repository import (
    ICampaignDocumentsRepository,
    ICampaignRepository,
    ICampaignTeamsRepository,
)

__all__ = [
    "ICampaignRepository",
    "ICampaignTeamsRepository",
    "ICampaignDocumentsRepository",
]
