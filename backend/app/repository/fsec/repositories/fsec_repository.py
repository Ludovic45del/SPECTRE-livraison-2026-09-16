"""Repository FSEC - Implémentation IFsecRepository."""

from typing import Any, List, Optional

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.shared.slug import extract_leading_year
from app.domain.stock.models.stock_constants import (
    ELEMENT_STATUS_AFFECTEE,
    ELEMENT_STATUS_DISPO,
    ELEMENT_STATUS_RESERVEE,
    ITEM_KIND_ELEMENT,
)
from app.mapper.fsec.fsec_mapper import (
    fsec_mapper_bean_to_entity,
    fsec_mapper_entity_to_bean,
)
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.stock.models.fsec_assembly_item_entity import FsecAssemblyItemEntity
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity


class FsecRepository(IFsecRepository):
    """Implémentation du repository FSEC."""

    SELECT_RELATED = (
        "campaign_id",
        # Installation de la campagne parente : nécessaire au calcul du slug
        # (label d'installation) sans requête N+1.
        "campaign_id__installation_id",
        "status_id",
        "category_id",
        "rack_id",
        "delivery_validated_by",
        "delivery_acceptor_user",
        "delivery_acceptor_user__profile",
    )

    def _base_queryset(self):
        """Queryset de base avec select_related sur les FK."""
        return FsecEntity.objects.select_related(*self.SELECT_RELATED)

    @transaction.atomic
    def create(self, bean: FsecBean) -> FsecBean:
        """Crée un nouveau FSEC."""
        entity = fsec_mapper_bean_to_entity(bean)
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    def get_by_version_uuid(self, version_uuid: str) -> Optional[FsecBean]:
        """Récupère un FSEC par son version_uuid (PK)."""
        try:
            entity = self._base_queryset().get(version_uuid=version_uuid)
            return fsec_mapper_entity_to_bean(entity)
        except FsecEntity.DoesNotExist:
            return None

    def get_by_slug(self, slug: str) -> Optional[FsecBean]:
        """Récupère un FSEC par son slug calculé (préfixé du contexte campagne).

        Filtre par année de campagne (préfixe du slug) puis compare le slug
        recalculé de chaque candidat. Privilégie la version active si plusieurs
        versions partagent le même nom.
        """
        year = extract_leading_year(slug)
        query = self._base_queryset()
        if year is not None:
            query = query.filter(campaign_id__year=year)
        fallback: Optional[FsecBean] = None
        for entity in query:
            bean = fsec_mapper_entity_to_bean(entity)
            if bean.slug == slug:
                if entity.is_active:
                    return bean
                fallback = fallback or bean
        return fallback

    def get_by_fsec_uuid(self, fsec_uuid: str) -> List[FsecBean]:
        """Récupère toutes les versions d'un FSEC par son fsec_uuid."""
        entities = self._base_queryset().filter(fsec_uuid=fsec_uuid)
        return [fsec_mapper_entity_to_bean(entity) for entity in entities]

    def get_active_by_fsec_uuid(self, fsec_uuid: str) -> Optional[FsecBean]:
        """Récupère la version active d'un FSEC."""
        try:
            entity = self._base_queryset().get(fsec_uuid=fsec_uuid, is_active=True)
            return fsec_mapper_entity_to_bean(entity)
        except FsecEntity.DoesNotExist:
            return None

    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[FsecBean]:
        """Récupère tous les FSECs."""
        query = self._base_queryset().all()
        if limit is not None:
            entities = query[offset : offset + limit]
        else:
            entities = query[offset:]
        return [fsec_mapper_entity_to_bean(entity) for entity in entities]

    def count_all(self) -> int:
        """Retourne le nombre de FSECs."""
        return FsecEntity.objects.count()

    def get_all_active(self) -> List[FsecBean]:
        """Récupère tous les FSECs actifs."""
        entities = self._base_queryset().filter(is_active=True)
        return [fsec_mapper_entity_to_bean(entity) for entity in entities]

    def get_by_campaign_id(self, campaign_id: str) -> List[FsecBean]:
        """Récupère tous les FSECs d'une campagne."""
        entities = self._base_queryset().filter(campaign_id_id=campaign_id)
        return [fsec_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: FsecBean) -> FsecBean:
        """Met à jour un FSEC."""
        entity = self._base_queryset().get(version_uuid=bean.version_uuid)
        entity.campaign_id_id = bean.campaign_id
        entity.status_id_id = bean.status_id
        entity.category_id_id = bean.category_id
        entity.rack_id_id = bean.rack_id
        entity.name = bean.name
        entity.comments = bean.comments
        entity.is_active = bean.is_active
        entity.delivery_date = bean.delivery_date
        entity.shooting_date = bean.shooting_date
        entity.preshooting_pressure = bean.preshooting_pressure
        entity.experience_srxx = bean.experience_srxx
        entity.localisation = bean.localisation
        entity.depressurization_failed = bean.depressurization_failed
        entity.alignment_file_link = bean.alignment_file_link
        entity.fdie_link = bean.fdie_link
        # Vues demandées (R08) : écrit en write-through — le service garantit
        # que le bean porte la valeur courante (PUT) ou la nouvelle (PATCH dédié).
        # Sans cette ligne, le PATCH requested-views serait silencieusement perdu.
        entity.requested_views = bean.requested_views
        # Champs workflow Fiche de livraison (assignés explicitement par les
        # services delivery_workflow ; on les écrit en write-through ici car
        # le bean a été chargé puis muté juste avant l'appel).
        entity.delivery_validation = bean.delivery_validation
        entity.delivery_remarques = bean.delivery_remarques
        entity.delivery_validated_by_id = bean.delivery_validated_by_id
        entity.delivery_validated_at = bean.delivery_validated_at
        entity.delivery_acceptor_user_id = bean.delivery_acceptor_user_id
        entity.delivery_receiver_name = bean.delivery_receiver_name
        entity.delivery_receiver_date = bean.delivery_receiver_date
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    @transaction.atomic
    def delete(self, version_uuid: str) -> bool:
        """Supprime un FSEC et toutes les données rattachées à cette version.

        Les enfants directs d'une version FSEC — étapes de vie labo, FA,
        documents, équipes — sont déclarés en `on_delete=PROTECT` : c'est un
        garde-fou contre les suppressions accidentelles par d'autres voies
        (admin Django, shell). La suppression d'un FSEC est, elle, une action
        admin explicite et assumée irréversible (cf. dialog de confirmation
        côté front). On vide donc d'abord toutes les lignes qui référencent
        cette version — sinon Django lève `ProtectedError` (→ 500) — puis on
        supprime le FSEC, le tout dans une seule transaction.

        L'itération sur `_meta.related_objects` couvre l'ensemble des relations
        inverses sans liste en dur : elle reste correcte quand de nouveaux types
        d'étapes sont ajoutés (le référentiel de vie labo évolue). Les liens
        planning (CASCADE) sont inclus ; les petits-enfants en CASCADE (sealing
        via metrology, photo_views via pictures) sont gérés par le collector
        Django lors du `.delete()` du queryset parent.

        Les `FsecAssemblyItem` (tableau récap) sont reliés par `fsec_uuid`
        (partagé entre versions), pas par une FK vers la version supprimée : on
        ne les touche donc PAS tant qu'il reste une autre version de cette FSEC.
        En revanche, si on supprime la **dernière** version d'un `fsec_uuid`, ces
        lignes deviendraient orphelines (et garderaient des éléments « Réservés »
        indéfiniment) : on les supprime alors et on libère les éléments concernés
        (cf. CDC §4.2).
        """
        try:
            entity = FsecEntity.objects.get(version_uuid=version_uuid)
        except FsecEntity.DoesNotExist:
            return False

        fsec_uuid = entity.fsec_uuid

        for relation in entity._meta.related_objects:
            accessor = relation.get_accessor_name()
            if relation.one_to_one:
                try:
                    getattr(entity, accessor).delete()
                except ObjectDoesNotExist:
                    pass
            else:
                getattr(entity, accessor).all().delete()

        entity.delete()

        # Dernière version de cette FSEC supprimée → nettoyer le récap orphelin.
        if not FsecEntity.objects.filter(fsec_uuid=fsec_uuid).exists():
            self._cleanup_orphan_assembly_items(fsec_uuid)

        return True

    @staticmethod
    def _cleanup_orphan_assembly_items(fsec_uuid) -> None:
        """Supprime les lignes de récap d'un `fsec_uuid` sans version restante et
        libère les éléments sérialisés qui ne sont plus référencés (reservee/
        affectee → dispo, fsec_name vidé par cohérence — cf. R09 ; `tiree` est
        irréversible, on n'y touche pas)."""
        assembly_qs = FsecAssemblyItemEntity.objects.filter(fsec_uuid=fsec_uuid)
        item_uuids = list(assembly_qs.values_list("catalog_item_id", flat=True))
        assembly_qs.delete()
        if not item_uuids:
            return
        still_referenced = FsecAssemblyItemEntity.objects.values_list(
            "catalog_item_id", flat=True
        )
        StockCatalogItemEntity.objects.filter(
            uuid__in=item_uuids,
            kind=ITEM_KIND_ELEMENT,
            status__in=(ELEMENT_STATUS_RESERVEE, ELEMENT_STATUS_AFFECTEE),
        ).exclude(uuid__in=still_referenced).update(
            status=ELEMENT_STATUS_DISPO, fsec_name=None
        )

    def exists_by_campaign_and_name(self, campaign_id: str, name: str) -> bool:
        """Vérifie si un FSEC existe pour cette campagne avec ce nom."""
        return FsecEntity.objects.filter(campaign_id_id=campaign_id, name=name).exists()

    def exists_by_name(self, name: str) -> bool:
        """Vérifie si un FSEC existe avec ce nom (sans campagne)."""
        return FsecEntity.objects.filter(
            name=name, campaign_id_id__isnull=True
        ).exists()

    @transaction.atomic
    def deactivate_all_versions(self, fsec_uuid: str) -> bool:
        """Désactive toutes les versions d'un FSEC.

        Utilise select_for_update() pour verrouiller les lignes et éviter
        les race conditions lors du versioning concurrent.
        """
        rows = FsecEntity.objects.select_for_update().filter(fsec_uuid=fsec_uuid)
        updated = rows.update(is_active=False)
        return updated > 0

    @transaction.atomic
    def create_version_atomic(self, fsec_uuid: str, bean: FsecBean) -> FsecBean:
        """Désactive toutes les versions et crée la nouvelle version active.

        Exécuté dans une seule transaction atomique avec select_for_update()
        pour garantir qu'une seule version active existe à tout moment.
        """
        FsecEntity.objects.select_for_update().filter(fsec_uuid=fsec_uuid).update(
            is_active=False
        )
        bean.fsec_uuid = fsec_uuid
        bean.is_active = True
        entity = fsec_mapper_bean_to_entity(bean)
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    @transaction.atomic
    def _replace_image_field(
        self, version_uuid: str, field_name: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Remplace ou supprime un ImageField du FSEC en libérant l'ancien fichier.

        Mutualise la logique des photos/signatures : verrou ligne, suppression du
        fichier disque existant (delete(save=False) pour n'écrire qu'une fois),
        puis assignation du nouveau fichier (ou None). Retourne None si la version
        est introuvable.
        """
        try:
            entity = FsecEntity.objects.select_for_update().get(
                version_uuid=version_uuid
            )
        except FsecEntity.DoesNotExist:
            return None

        current = getattr(entity, field_name)
        if current:
            current.delete(save=False)

        setattr(entity, field_name, image_file if image_file is not None else None)
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    def set_overview_image(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Remplace ou supprime la photo de vue d'ensemble."""
        return self._replace_image_field(version_uuid, "overview_image", image_file)

    @transaction.atomic
    def set_assembly_plan_image(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Remplace ou supprime l'image du plan d'assemblage.

        Méthode dédiée (vs `_replace_image_field`) car la suppression du plan
        doit aussi vider le calque d'annotations : leurs coordonnées sont
        relatives au plan, elles n'ont plus de sens sans support. Le remplacement
        (image_file non None) conserve les annotations existantes.
        """
        try:
            entity = FsecEntity.objects.select_for_update().get(
                version_uuid=version_uuid
            )
        except FsecEntity.DoesNotExist:
            return None

        current = entity.assembly_plan_image
        if current:
            current.delete(save=False)

        entity.assembly_plan_image = image_file if image_file is not None else None
        if image_file is None:
            entity.assembly_plan_annotations = []
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    @transaction.atomic
    def set_assembly_plan_annotations(
        self, version_uuid: str, annotations: Any
    ) -> Optional[FsecBean]:
        """Remplace le calque d'annotations du plan d'assemblage (sémantique PUT)."""
        try:
            entity = FsecEntity.objects.select_for_update().get(
                version_uuid=version_uuid
            )
        except FsecEntity.DoesNotExist:
            return None

        entity.assembly_plan_annotations = annotations or []
        entity.save()
        return fsec_mapper_entity_to_bean(entity)

    def set_delivery_acceptor_signature(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Fige (copie) ou supprime la signature de l'accepteur (phase 1)."""
        return self._replace_image_field(
            version_uuid, "delivery_acceptor_signature", image_file
        )

    def set_delivery_validator_signature(
        self, version_uuid: str, image_file: Optional[Any]
    ) -> Optional[FsecBean]:
        """Fige (copie) ou supprime la signature du validateur TCI (phase 2)."""
        return self._replace_image_field(
            version_uuid, "delivery_validator_signature", image_file
        )
