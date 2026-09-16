"""Beans EntityRef — référence structurée (FSEC, campagne, FA) attachée à un message."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class EntityRefBean:
    """Référence attachée à un message (lecture et écriture).

    L'identité de la cible est `(entity_type, entity_uuid)` : `fsec_uuid` pour
    une FSEC (stable à travers les versions), `uuid` pour une campagne ou une
    FA. `label` est un instantané pris à la création ; à la lecture il est
    remplacé par le libellé courant tant que l'entité existe. `slug` n'est
    jamais stocké : il est recalculé à la lecture et vaut None si l'entité a
    été supprimée (`exists=False`).
    """

    entity_type: str = ""
    entity_uuid: str = ""
    label: str = ""
    slug: Optional[str] = None
    exists: bool = True


@dataclass
class EntityRefTargetBean:
    """Cible résolue par le resolver : libellé et slug courants d'une entité existante."""

    entity_type: str
    entity_uuid: str
    label: str
    slug: Optional[str]
