"""API Package - Controllers REST."""

from app.api.campaign import (
    CampaignController,
    CampaignDocumentsController,
    CampaignTeamsController,
)
from app.api.fsec import FsecController, FsecDocumentsController, FsecTeamsController
from app.api.steps import (
    AirtightnessTestLpStepController,
    AssemblyStepController,
    DepressurizationStepController,
    GasFillingBpStepController,
    GasFillingHpStepController,
    MetrologyStepController,
    PermeationStepController,
    PicturesStepController,
    RepressurizationStepController,
    SealingStepController,
)

__all__ = [
    # Campaign
    "CampaignController",
    "CampaignTeamsController",
    "CampaignDocumentsController",
    # FSEC
    "FsecController",
    "FsecTeamsController",
    "FsecDocumentsController",
    # Steps
    "AssemblyStepController",
    "MetrologyStepController",
    "SealingStepController",
    "PicturesStepController",
    "AirtightnessTestLpStepController",
    "GasFillingBpStepController",
    "GasFillingHpStepController",
    "PermeationStepController",
    "DepressurizationStepController",
    "RepressurizationStepController",
]
