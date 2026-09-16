"""Interface ILabContactRepository — annuaire des laboratoires."""

import abc
from typing import List, Optional

from app.domain.labcontact.models.lab_contact_bean import LabContactBean


class ILabContactRepository(abc.ABC):
    """Interface abstraite pour le repository LabContact."""

    @abc.abstractmethod
    def get_all(self) -> List[LabContactBean]:
        """Retourne tous les contacts, triés par nom."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[LabContactBean]:
        """Retourne le contact identifié par `uuid`, ou None s'il n'existe pas."""
        raise NotImplementedError

    @abc.abstractmethod
    def create(self, bean: LabContactBean) -> LabContactBean:
        """Persiste un nouveau contact et retourne le bean créé (uuid renseigné)."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: LabContactBean) -> LabContactBean:
        """Met à jour le contact identifié par `bean.uuid` et retourne le bean à jour."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime le contact ; True si une ligne a été supprimée, False sinon."""
        raise NotImplementedError
