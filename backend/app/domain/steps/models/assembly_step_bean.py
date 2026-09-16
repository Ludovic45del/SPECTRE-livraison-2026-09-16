"""Bean AssemblyStep - Étape d'assemblage."""

from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional


@dataclass
class AssemblyStepBean:
    """Bean représentant une étape d'assemblage."""

    uuid: str = ""
    fsec_version_id: str = ""
    operator: Optional[str] = None
    # Premier assembleur (dérivé de la liste) — conservé pour la rétro-compat.
    operator_user_uuid: Optional[str] = None
    # Liste des assembleurs (source de vérité). Une étape peut être réalisée à plusieurs.
    operator_user_uuids: List[str] = field(default_factory=list)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    comments: Optional[str] = None
    machine_uuids: List[str] = field(default_factory=list)
