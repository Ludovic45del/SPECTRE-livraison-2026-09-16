"""Bean AirtightnessTestLpStep - Test d'étanchéité basse pression."""

from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class AirtightnessTestLpStepBean:
    """Bean représentant un test d'étanchéité basse pression.

    `phase` indique à quelle phase fonctionnelle le test est rattaché :
    'BP' (default) pour les rubriques BP, 'HP' pour les rubriques HP d'une FSEC.
    """

    uuid: str = ""
    fsec_version_id: str = ""
    embase_id: Optional[str] = None
    embase_identifier: Optional[str] = None
    leak_rate_dtri: Optional[str] = None
    gas_type: Optional[str] = None
    experiment_pressure: Optional[float] = None
    airtightness_test_duration: Optional[float] = None
    operator: Optional[str] = None
    operator_user_uuid: Optional[str] = None
    date_of_fulfilment: Optional[date] = None
    phase: str = "BP"
