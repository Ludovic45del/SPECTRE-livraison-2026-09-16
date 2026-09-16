"""Interfaces Steps - Repositories abstraits pour les étapes FSEC.

Ce module définit une interface générique IStepRepository[BeanT] et des
aliases rétro-compatibles pour chaque type de step.
"""

import abc
from typing import Generic, List, Optional, TypeVar

from app.domain.steps.models.airtightness_test_lp_step_bean import (
    AirtightnessTestLpStepBean,
)
from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
from app.domain.steps.models.depressurization_step_bean import DepressurizationStepBean
from app.domain.steps.models.gas_filling_bp_step_bean import GasFillingBpStepBean
from app.domain.steps.models.gas_filling_hp_step_bean import GasFillingHpStepBean
from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
from app.domain.steps.models.permeation_step_bean import PermeationStepBean
from app.domain.steps.models.photo_view_bean import PhotoViewBean
from app.domain.steps.models.pictures_step_bean import PicturesStepBean
from app.domain.steps.models.repressurization_step_bean import RepressurizationStepBean
from app.domain.steps.models.sealing_step_bean import SealingStepBean

# Type variable pour les Beans
BeanT = TypeVar("BeanT")


class IStepRepository(abc.ABC, Generic[BeanT]):
    """Interface générique pour tous les repositories de Steps FSEC.

    Cette interface définit les opérations CRUD standard pour les steps.
    Les repositories spécifiques peuvent hériter de cette interface et
    ajouter des méthodes supplémentaires si nécessaire.

    Type Parameters:
        BeanT: Le type de Bean manipulé par ce repository
    """

    @abc.abstractmethod
    def create(self, bean: BeanT) -> BeanT:
        """Crée un nouveau step.

        Args:
            bean: Le bean contenant les données du step à créer

        Returns:
            Le bean créé avec son UUID généré
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[BeanT]:
        """Récupère un step par son UUID.

        Args:
            uuid: L'identifiant unique du step

        Returns:
            Le bean correspondant ou None si non trouvé
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[BeanT]:
        """Récupère tous les steps d'une version FSEC.

        Args:
            fsec_version_id: L'identifiant de la version FSEC

        Returns:
            Liste des beans associés à cette version FSEC
        """
        raise NotImplementedError

    @abc.abstractmethod
    def update(self, bean: BeanT) -> BeanT:
        """Met à jour un step existant.

        Args:
            bean: Le bean contenant les données mises à jour

        Returns:
            Le bean mis à jour
        """
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime un step par son UUID.

        Args:
            uuid: L'identifiant unique du step à supprimer

        Returns:
            True si la suppression a réussi, False sinon
        """
        raise NotImplementedError


# =============================================================================
# Interfaces spécialisées avec méthodes additionnelles
# =============================================================================


class ISealingStepRepository(IStepRepository[SealingStepBean]):
    """Interface pour le repository SealingStep avec méthode spécifique."""

    @abc.abstractmethod
    def get_by_metrology_step_id(
        self, metrology_step_id: str
    ) -> Optional[SealingStepBean]:
        """Récupère le step de scellement associé à un step métrologie.

        Args:
            metrology_step_id: L'identifiant du step métrologie

        Returns:
            Le bean de scellement ou None si non trouvé
        """
        raise NotImplementedError


class IPhotoViewRepository(IStepRepository[PhotoViewBean]):
    """Interface pour le repository PhotoView avec méthode spécifique."""

    @abc.abstractmethod
    def get_by_pictures_step_id(self, pictures_step_id: str) -> List[PhotoViewBean]:
        """Récupère les vues photo associées à un step photos.

        Args:
            pictures_step_id: L'identifiant du step photos

        Returns:
            Liste des vues photo associées
        """
        raise NotImplementedError


# =============================================================================
# Aliases rétro-compatibles (types concrets de l'interface générique)
# =============================================================================

# Ces aliases permettent de maintenir la compatibilité avec le code existant
# tout en utilisant l'interface générique sous-jacente.


class IAssemblyStepRepository(IStepRepository[AssemblyStepBean]):
    """Interface pour le repository AssemblyStep."""

    pass


class IMetrologyStepRepository(IStepRepository[MetrologyStepBean]):
    """Interface pour le repository MetrologyStep."""

    pass


class IPicturesStepRepository(IStepRepository[PicturesStepBean]):
    """Interface pour le repository PicturesStep."""

    pass


class IAirtightnessTestLpStepRepository(IStepRepository[AirtightnessTestLpStepBean]):
    """Interface pour le repository AirtightnessTestLpStep."""

    pass


class IGasFillingBpStepRepository(IStepRepository[GasFillingBpStepBean]):
    """Interface pour le repository GasFillingBpStep."""

    pass


class IGasFillingHpStepRepository(IStepRepository[GasFillingHpStepBean]):
    """Interface pour le repository GasFillingHpStep."""

    pass


class IPermeationStepRepository(IStepRepository[PermeationStepBean]):
    """Interface pour le repository PermeationStep."""

    pass


class IDepressurizationStepRepository(IStepRepository[DepressurizationStepBean]):
    """Interface pour le repository DepressurizationStep."""

    pass


class IRepressurizationStepRepository(IStepRepository[RepressurizationStepBean]):
    """Interface pour le repository RepressurizationStep."""

    pass
