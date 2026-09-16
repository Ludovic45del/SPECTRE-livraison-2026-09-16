"""Repository FA - Implémentation IFaRepository."""

import re
from typing import List, Optional

from django.db import IntegrityError, transaction

from app.domain.exceptions import ConflictException
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.models.fa_bean import FaBean
from app.domain.shared.slug import slugify_text
from app.mapper.fa.fa_mapper import fa_mapper_bean_to_entity, fa_mapper_entity_to_bean
from app.repository.fa.models.fa_entity import FaEntity


class FaRepository(IFaRepository):
    """Implémentation du repository FA."""

    SELECT_RELATED = (
        "fsec_version_id",
        # Précharge fsec → campaign → installation pour exposer fsec_name +
        # installation dans le mapper sans déclencher de N+1 sur les listes.
        "fsec_version_id__campaign_id",
        "fsec_version_id__campaign_id__installation_id",
        "status_id",
        "type_id",
        "criticality_id",
    )

    @transaction.atomic
    def create(self, bean: FaBean) -> FaBean:
        """Crée une nouvelle FA.

        En cas de course sur la séquence d'identifiant (deux créations
        simultanées sur la même FSEC calculant le même suffixe), la contrainte
        unique sur `identifier` lève une IntegrityError : on la convertit en
        ConflictException pour remonter un 409 propre (et non une 500).
        """
        entity = fa_mapper_bean_to_entity(bean)
        try:
            entity.save()
        except IntegrityError as exc:
            raise ConflictException("identifier", bean.identifier) from exc
        return fa_mapper_entity_to_bean(entity)

    def get_by_uuid(self, uuid: str) -> Optional[FaBean]:
        """Récupère une FA par son UUID."""
        try:
            entity = FaEntity.objects.select_related(*self.SELECT_RELATED).get(
                uuid=uuid
            )
            return fa_mapper_entity_to_bean(entity)
        except FaEntity.DoesNotExist:
            return None

    def get_by_slug(self, slug: str) -> Optional[FaBean]:
        """Récupère une FA par son slug d'URL (slugify de l'identifier unique).

        La slugification n'étant pas réversible, on compare le slug recalculé de
        chaque identifier (requête légère sur deux colonnes) puis on charge la FA
        correspondante.
        """
        for fa_uuid, identifier in FaEntity.objects.values_list("uuid", "identifier"):
            if slugify_text(identifier) == slug:
                return self.get_by_uuid(str(fa_uuid))
        return None

    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[FaBean]:
        """Récupère toutes les FA."""
        query = FaEntity.objects.select_related(*self.SELECT_RELATED).order_by(
            "-created_at"
        )
        if limit is not None:
            entities = query[offset : offset + limit]
        else:
            entities = query[offset:]
        return [fa_mapper_entity_to_bean(entity) for entity in entities]

    def count_all(self) -> int:
        """Retourne le nombre total de FA."""
        return FaEntity.objects.count()

    def get_all_by_fsec_version_id(self, fsec_version_id: str) -> List[FaBean]:
        """Récupère toutes les FA associées à une FSEC, plus récentes en premier."""
        entities = (
            FaEntity.objects.select_related(*self.SELECT_RELATED)
            .filter(fsec_version_id_id=fsec_version_id)
            .order_by("-created_at")
        )
        return [fa_mapper_entity_to_bean(entity) for entity in entities]

    @transaction.atomic
    def update(self, bean: FaBean) -> FaBean:
        """Met à jour une FA.

        AUDIT R-PERF-01 : le SELECT avant UPDATE est intentionnel.
        On a besoin de l'entité avec select_related pour retourner un bean complet.
        Pour ~2000 FA max, le surcoût est négligeable (~1ms par requête supplémentaire).
        """
        entity = FaEntity.objects.select_related(*self.SELECT_RELATED).get(
            uuid=bean.uuid
        )
        # FK
        entity.status_id_id = bean.status_id
        entity.type_id_id = bean.type_id
        entity.criticality_id_id = bean.criticality_id
        # Phase Ouvert
        entity.fsec_step_id = bean.fsec_step_id
        entity.fsec_step_other = bean.fsec_step_other
        entity.discoverer = bean.discoverer
        entity.discoverer_user_id = bean.discoverer_user_uuid
        entity.event_date = bean.event_date
        entity.observation = bean.observation
        entity.location_equipment = bean.location_equipment
        entity.quick_analysis = bean.quick_analysis
        entity.immediate_measures = bean.immediate_measures
        entity.iec_validation_open = bean.iec_validation_open
        entity.iec_validation_open_date = bean.iec_validation_open_date
        entity.iec_validation_open_name = bean.iec_validation_open_name
        entity.iec_validation_open_user_id = bean.iec_validation_open_user_uuid
        # Phase En cours (sans date de passage en cours)
        entity.cause = bean.cause
        entity.experience_impact = bean.experience_impact
        entity.iec_validation_progress = bean.iec_validation_progress
        entity.iec_validation_progress_name = bean.iec_validation_progress_name
        entity.iec_validation_progress_user_id = bean.iec_validation_progress_user_uuid
        # Phase Clos
        entity.closure_validation = bean.closure_validation
        entity.closure_date = bean.closure_date
        entity.closure_validator_name = bean.closure_validator_name
        entity.closure_validator_user_id = bean.closure_validator_user_uuid
        entity.save()
        return fa_mapper_entity_to_bean(entity)

    @transaction.atomic
    def update_identifier(self, uuid: str, identifier: str) -> bool:
        """Réécrit uniquement l'identifiant d'une FA (réalignement de contexte).

        `update()` ne touche jamais l'`identifier` (clé unique de référence). On
        passe par un `UPDATE` ciblé quand la FSEC parente change de nom ou de
        campagne, pour que le « nom » de la FA suive le contexte. `last_updated`
        (auto_now) n'est volontairement pas bumpé : c'est une conséquence système,
        pas une édition de contenu utilisateur.
        """
        updated = FaEntity.objects.filter(uuid=uuid).update(identifier=identifier)
        return updated > 0

    @transaction.atomic
    def delete(self, uuid: str) -> bool:
        """Supprime définitivement une FA par son UUID (hard delete).

        Les lignes photos liées sont supprimées par le CASCADE de la FK, mais
        Django ne purge pas les fichiers disque : on les supprime explicitement
        avant pour ne pas laisser d'orphelins sous MEDIA_ROOT.
        """
        try:
            entity = FaEntity.objects.get(uuid=uuid)
            for photo in entity.photos.all():
                if photo.image:
                    photo.image.delete(save=False)
            entity.delete()
            return True
        except FaEntity.DoesNotExist:
            return False

    def exists_by_identifier(self, identifier: str) -> bool:
        """Vérifie si une FA existe avec cet identifiant."""
        return FaEntity.objects.filter(identifier=identifier).exists()

    def max_sequence_by_fsec_version_id(self, fsec_version_id: str) -> int:
        """Retourne le plus grand suffixe séquentiel `_NN` utilisé pour cette FSEC.

        Sert à générer le prochain numéro de séquence dans l'identifier. On se
        base sur le max des suffixes existants (et non sur un count de lignes)
        pour rester monotone même après une suppression définitive : un
        identifier détruit n'est jamais réutilisé (des « trous » dans la
        numérotation sont acceptés et voulus). Retourne 0 si aucune FA.
        """
        identifiers = FaEntity.objects.filter(
            fsec_version_id_id=fsec_version_id
        ).values_list("identifier", flat=True)
        max_seq = 0
        for ident in identifiers:
            match = re.search(r"_(\d{2,})$", ident or "")
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return max_seq
