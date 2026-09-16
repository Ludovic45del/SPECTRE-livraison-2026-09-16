"""Interface IFaRepository - Repository abstrait pour FA."""

import abc
from typing import List, Optional

from app.domain.fa.models.fa_bean import FaBean


class IFaRepository(abc.ABC):
    """Interface abstraite pour le repository FA."""

    @abc.abstractmethod
    def create(self, bean: FaBean) -> FaBean:
        """Crée une nouvelle FA."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[FaBean]:
        """Récupère une FA par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_slug(self, slug: str) -> Optional[FaBean]:
        """Récupère une FA par son slug d'URL calculé."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[FaBean]:
        """Récupère toutes les FA (avec pagination optionnelle)."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_all(self) -> int:
        """Retourne le nombre total de FA."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all_by_fsec_version_id(self, fsec_version_id: str) -> List[FaBean]:
        """Récupère toutes les FA associées à une FSEC.

        Une FSEC peut avoir plusieurs FA depuis la migration 0072.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: FaBean) -> FaBean:
        """Met à jour une FA."""
        raise NotImplementedError

    @abc.abstractmethod
    def update_identifier(self, uuid: str, identifier: str) -> bool:
        """Met à jour uniquement l'identifiant d'une FA.

        L'identifiant est normalement immuable (clé unique de référence) : cette
        méthode dédiée est l'unique voie sanctionnée pour le réaligner quand la
        FSEC parente est renommée ou rattachée à une autre campagne.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime définitivement une FA par son UUID (hard delete)."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_identifier(self, identifier: str) -> bool:
        """Vérifie si une FA existe avec cet identifiant."""
        raise NotImplementedError

    @abc.abstractmethod
    def max_sequence_by_fsec_version_id(self, fsec_version_id: str) -> int:
        """Retourne le plus grand suffixe séquentiel `_NN` utilisé pour cette FSEC.

        Utilisé pour générer le prochain numéro de séquence dans l'identifier.
        On se base sur le max des suffixes existants (et non sur un count) pour
        ne jamais réutiliser un identifier après une suppression définitive.
        """
        raise NotImplementedError
