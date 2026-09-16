"""Bean FaCreationContext - Contexte de création d'une FA."""

from dataclasses import dataclass


@dataclass
class FaCreationContextBean:
    """Contexte nécessaire à la création d'une FA."""

    campaign_name: str
    fsec_name: str
    year: int
