"""Interfaces FSEC - Exports."""

from app.domain.fsec.interface.fsec_repository import (
    IFsecDocumentsRepository,
    IFsecRepository,
    IFsecTeamsRepository,
)

__all__ = [
    "IFsecRepository",
    "IFsecTeamsRepository",
    "IFsecDocumentsRepository",
]
