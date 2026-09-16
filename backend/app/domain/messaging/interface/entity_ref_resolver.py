"""Interface IEntityRefResolver — résolution en masse des cibles d'une référence."""

import abc
from typing import Dict, List, Tuple

from app.domain.messaging.models.entity_ref_bean import EntityRefTargetBean


class IEntityRefResolver(abc.ABC):
    """Contrat de résolution des cibles `(entity_type, entity_uuid)` d'un message."""

    @abc.abstractmethod
    def resolve(
        self, refs: List[Tuple[str, str]]
    ) -> Dict[Tuple[str, str], EntityRefTargetBean]:
        """Résout en masse (≤ 1 requête par type) les cibles existantes.

        Les clés du dictionnaire sont les couples `(entity_type, entity_uuid)`
        sous forme canonique (uuid en minuscules avec tirets) ; les cibles
        introuvables n'y figurent pas. FSEC : cible = `fsec_uuid`, version
        active uniquement. Les slugs sont calculés via `app.domain.shared.slug`
        avec les mêmes règles que les mappers FSEC / campagne / FA.
        """
        raise NotImplementedError
