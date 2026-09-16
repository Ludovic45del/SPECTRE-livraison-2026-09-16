"""Interface IEmbaseRepository - Repository abstrait pour Embase."""

import abc
from typing import List, Optional

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.fsec_history_bean import FsecHistoryEntryBean


class IEmbaseRepository(abc.ABC):
    """Interface abstraite pour le repository Embase."""

    @abc.abstractmethod
    def create(self, bean: EmbaseBean) -> EmbaseBean:
        """Crée une nouvelle Embase."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[EmbaseBean]:
        """Récupère une Embase par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[EmbaseBean]:
        """Récupère toutes les Embases (avec pagination optionnelle)."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_all(self) -> int:
        """Retourne le nombre total d'Embases."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_identifier(self, identifier: str) -> Optional[EmbaseBean]:
        """Récupère une Embase par son identifiant (G01, G02...)."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_slug(self, slug: str) -> Optional[EmbaseBean]:
        """Récupère une Embase par son slug d'URL calculé."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: EmbaseBean) -> EmbaseBean:
        """Met à jour une Embase."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime une Embase par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_identifier(self, identifier: str) -> bool:
        """Vérifie si une Embase existe avec cet identifiant."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_duplicate(self, exclude_uuid: str, identifier: str) -> bool:
        """Vérifie si une autre Embase (excluant l'UUID donné) a cet identifiant."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_fsec_history(self, embase_uuid: str) -> List[FsecHistoryEntryBean]:
        """Retourne l'historique des FSECs associés à une embase via les steps gaz HP.

        Chaque entrée contient : fsec_uuid, fsec_version_uuid, fsec_name,
        campaign_name, campaign_uuid, date_of_fulfilment, gas_type.
        Dédupliqué par fsec_uuid, trié par date décroissante.
        """
        raise NotImplementedError
