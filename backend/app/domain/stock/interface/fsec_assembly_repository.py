"""Interface IFsecAssemblyItemRepository — contrat du repository tableau récap FSEC."""

import abc
from typing import List, Optional

from app.domain.stock.models.fsec_assembly_item_bean import (
    FsecAssemblyItemBean,
    FsecAssemblyItemDetailBean,
)


class IFsecAssemblyItemRepository(abc.ABC):
    """Contrat du repository pour FsecAssemblyItem (lien Stock ↔ FSEC)."""

    # ---------------------------------------------------------------- CRUD

    @abc.abstractmethod
    def create(self, bean: FsecAssemblyItemBean) -> FsecAssemblyItemBean:
        """Crée une nouvelle ligne du tableau récap."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[FsecAssemblyItemBean]:
        """Récupère une ligne par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def patch(self, uuid: str, fields: dict) -> FsecAssemblyItemBean:
        """Met à jour partiellement (sort_order, remarque uniquement — cf. CDC §5.3)."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime une ligne du tableau récap. Retourne True si trouvée."""
        raise NotImplementedError

    # ---------------------------------------------------------------- Listing

    @abc.abstractmethod
    def list_by_fsec(self, fsec_uuid: str) -> List[FsecAssemblyItemDetailBean]:
        """Liste les items du tableau récap d'une FSEC, triés par sort_order puis created_at.

        Retourne des `FsecAssemblyItemDetailBean` qui inclut les données du
        catalog_item joint, pour éviter un N+1 côté frontend (cf. CDC §5.3).
        """
        raise NotImplementedError

    @abc.abstractmethod
    def list_catalog_uuids_by_fsec(self, fsec_uuid: str) -> List[str]:
        """Liste les UUIDs des catalog_items associés à une FSEC.

        Utilisé pour le couplage FSEC → éléments (CDC §4.2) : récupérer
        les éléments à passer en bulk à `affectee` ou `tiree`.
        """
        raise NotImplementedError

    # ---------------------------------------------------------------- Specific queries

    @abc.abstractmethod
    def find_active_assignment_for_element(
        self, catalog_item_uuid: str
    ) -> Optional[FsecAssemblyItemBean]:
        """Cherche une assignation active pour un élément sérialisé (un seul max — cf. CDC §3.3).

        Retourne le FsecAssemblyItemBean si trouvé, None sinon.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_fsec_and_catalog(
        self, fsec_uuid: str, catalog_item_uuid: str
    ) -> bool:
        """Vérifie qu'une paire (fsec_uuid, catalog_item) n'existe pas déjà (anti-doublon)."""
        raise NotImplementedError
