"""FA Repository Models - Entities."""

from app.repository.fa.models.fa_criticality_entity import FaCriticalityEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fa.models.fa_status_entity import FaStatusEntity
from app.repository.fa.models.fa_type_entity import FaTypeEntity

__all__ = [
    "FaStatusEntity",
    "FaTypeEntity",
    "FaCriticalityEntity",
    "FaEntity",
]
