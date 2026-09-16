"""Interface IFsecRepository - Repository abstrait pour FSEC."""

import abc
from typing import Any, List, Optional

from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.models.fsec_documents_bean import FsecDocumentsBean
from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean


class IFsecRepository(abc.ABC):
    """Interface abstraite pour le repository FSEC."""

    @abc.abstractmethod
    def create(self, bean: FsecBean) -> FsecBean:
        """Crée un nouveau FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_version_uuid(self, version_uuid: str) -> Optional[FsecBean]:
        """Récupère un FSEC par son version_uuid (PK)."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_slug(self, slug: str) -> Optional[FsecBean]:
        """Récupère un FSEC par son slug d'URL calculé."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_fsec_uuid(self, fsec_uuid: str) -> List[FsecBean]:
        """Récupère toutes les versions d'un FSEC par son fsec_uuid."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_active_by_fsec_uuid(self, fsec_uuid: str) -> Optional[FsecBean]:
        """Récupère la version active d'un FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[FsecBean]:
        """Récupère tous les FSECs."""
        raise NotImplementedError

    @abc.abstractmethod
    def count_all(self) -> int:
        """Retourne le nombre de FSECs."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_all_active(self) -> List[FsecBean]:
        """Récupère tous les FSECs actifs."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_campaign_id(self, campaign_id: str) -> List[FsecBean]:
        """Récupère tous les FSECs d'une campagne."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: FsecBean) -> FsecBean:
        """Met à jour un FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, version_uuid: str) -> bool:
        """Supprime un FSEC par son version_uuid."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_campaign_and_name(self, campaign_id: str, name: str) -> bool:
        """Vérifie si un FSEC existe pour cette campagne avec ce nom."""
        raise NotImplementedError

    @abc.abstractmethod
    def exists_by_name(self, name: str) -> bool:
        """Vérifie si un FSEC existe avec ce nom (sans campagne)."""
        raise NotImplementedError

    @abc.abstractmethod
    def deactivate_all_versions(self, fsec_uuid: str) -> bool:
        """Désactive toutes les versions d'un FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def create_version_atomic(self, fsec_uuid: str, bean: FsecBean) -> FsecBean:
        """Désactive toutes les versions existantes et crée la nouvelle version active.

        Doit être exécuté dans une seule transaction atomique.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def set_overview_image(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Remplace (ou supprime) la photo de vue d'ensemble.

        - image_file non None : nouveau fichier upload (UploadedFile-like). L'ancien
          fichier est supprimé du stockage avant assignation.
        - image_file None : suppression de la photo existante.

        Retourne le bean mis à jour, ou None si version_uuid introuvable.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def set_assembly_plan_image(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Remplace (ou supprime) l'image du plan d'assemblage.

        - image_file non None : nouveau fichier upload (UploadedFile-like).
          L'ancien fichier est supprimé du stockage avant assignation ; le calque
          d'annotations existant est conservé.
        - image_file None : suppression du plan ET du calque d'annotations
          (coordonnées relatives au plan : sans support elles n'ont plus de sens).

        Retourne le bean mis à jour, ou None si version_uuid introuvable.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def set_assembly_plan_annotations(
        self, version_uuid: str, annotations: Any
    ) -> Optional[FsecBean]:
        """Remplace le calque d'annotations du plan d'assemblage.

        `annotations` est la liste complète d'annotations (remplacement total,
        sémantique PUT). Retourne le bean mis à jour, ou None si version_uuid
        introuvable.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def set_delivery_acceptor_signature(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Fige (copie) ou supprime la signature de l'accepteur (phase 1).

        L'ancien fichier est libéré avant assignation. Retourne le bean mis à
        jour, ou None si version_uuid introuvable.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def set_delivery_validator_signature(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Fige (copie) ou supprime la signature du validateur TCI (phase 2).

        L'ancien fichier est libéré avant assignation. Retourne le bean mis à
        jour, ou None si version_uuid introuvable.
        """
        raise NotImplementedError


class IFsecTeamsRepository(abc.ABC):
    """Interface abstraite pour le repository FsecTeams."""

    @abc.abstractmethod
    def create(self, bean: FsecTeamsBean) -> FsecTeamsBean:
        """Crée un nouveau membre d'équipe."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[FsecTeamsBean]:
        """Récupère un membre d'équipe par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_fsec_id(self, fsec_id: str) -> List[FsecTeamsBean]:
        """Récupère tous les membres d'une équipe FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: FsecTeamsBean) -> FsecTeamsBean:
        """Met à jour un membre d'équipe."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime un membre d'équipe par son UUID."""
        raise NotImplementedError


class IFsecDocumentsRepository(abc.ABC):
    """Interface abstraite pour le repository FsecDocuments."""

    @abc.abstractmethod
    def create(self, bean: FsecDocumentsBean) -> FsecDocumentsBean:
        """Crée un nouveau document."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[FsecDocumentsBean]:
        """Récupère un document par son UUID."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_fsec_id(self, fsec_id: str) -> List[FsecDocumentsBean]:
        """Récupère tous les documents d'un FSEC."""
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: FsecDocumentsBean) -> FsecDocumentsBean:
        """Met à jour un document."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime un document par son UUID."""
        raise NotImplementedError
