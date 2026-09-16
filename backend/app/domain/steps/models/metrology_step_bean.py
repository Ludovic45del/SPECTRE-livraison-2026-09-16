"""Bean MetrologyStep - Étape de métrologie."""

from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional


@dataclass
class MetrologyStepBean:
    """Bean représentant une étape de métrologie."""

    uuid: str = ""
    fsec_version_id: str = ""
    rack_id: Optional[int] = None
    metrologist_name: Optional[str] = None
    # Premier métrologue (dérivé de la liste) — conservé pour la rétro-compat.
    metrologist_user_uuid: Optional[str] = None
    # Liste des métrologues (source de vérité). Une étape peut être réalisée à plusieurs.
    metrologist_user_uuids: List[str] = field(default_factory=list)
    date: Optional[date] = None
    comments: Optional[str] = None
    machine_uuids: List[str] = field(default_factory=list)
    # Liens fichiers (URL HTTP ou chemin UNC \\serveur\...) : fichier métro .txt et Visrad réalisé.
    metro_file_link: Optional[str] = None
    visrad_link: Optional[str] = None
