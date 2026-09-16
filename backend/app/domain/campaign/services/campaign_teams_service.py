"""Service CampaignTeams - Logique métier pure."""

import logging
from typing import List

from app.domain.campaign.interface.campaign_repository import (
    ICampaignRepository,
    ICampaignTeamsRepository,
)
from app.domain.campaign.models.campaign_team_constants import is_free_text_role
from app.domain.campaign.models.campaign_teams_bean import CampaignTeamsBean
from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)

logger = logging.getLogger(__name__)


def _validate_member_invariant(bean: CampaignTeamsBean) -> None:
    """Verifie l'invariant MOE / autres roles.

    Pendant la phase de coexistence (release N) :
    - MOE : exige `name` ; rejette `user_uuid` (rôle externe au labo).
    - Autres roles : exige `name` OU `user_uuid` (le frontend nouveau envoie
      `user_uuid`, mais on accepte encore `name` pour les anciens clients).

    L'invariant strict (autres roles -> user_uuid obligatoire et name interdit)
    sera reimpose en release de cleanup, une fois le frontend deploye et la
    migration data finalisee.

    Raises:
        ValidationException: si aucun des deux n'est fourni, ou si MOE+user_uuid.
    """
    is_free = is_free_text_role(bean.role_id)
    has_name = bool(bean.name and bean.name.strip())
    has_user = bool(bean.user_uuid)

    if is_free:
        if not has_name:
            raise ValidationException(
                "name",
                "Le rôle MOE exige un nom en texte libre (membre extérieur au labo)",
            )
        if has_user:
            raise ValidationException(
                "user_uuid",
                "Le rôle MOE n'accepte pas de FK utilisateur (membre extérieur au labo)",
            )
    else:
        if not has_name and not has_user:
            raise ValidationException(
                "name/user_uuid",
                f"Le rôle {bean.role_id} exige soit un nom soit une FK utilisateur",
            )


def _member_dedup_key(member: CampaignTeamsBean) -> tuple:
    """Cle de deduplication d'un membre.

    Pour MOE : (role_id, "name", name). Pour les autres : on prefere user_uuid
    quand fourni (cas standard apres bascule UI), sinon retombe sur name
    (anciens clients).
    """
    if is_free_text_role(member.role_id):
        return (member.role_id, "name", member.name)
    if member.user_uuid:
        return (member.role_id, "user_uuid", member.user_uuid)
    return (member.role_id, "name", member.name)


def create_campaign_team_member(
    repository: ICampaignTeamsRepository,
    bean: CampaignTeamsBean,
    campaign_repository: ICampaignRepository,
) -> CampaignTeamsBean:
    """Crée un nouveau membre d'équipe.

    Args:
        repository: Le repository CampaignTeams
        bean: Le bean à créer
        campaign_repository: Repository Campaign (optionnel, pour vérifier l'existence du parent)

    Raises:
        NotFoundException: Si la campagne parente n'existe pas
        ConflictException: Si un membre identique existe déjà
        ValidationException: Si l'invariant MOE/non-MOE n'est pas respecté
    """
    _validate_member_invariant(bean)

    # Vérifier l'existence de la campagne parente
    if campaign_repository is not None and bean.campaign_uuid:
        if campaign_repository.get_by_uuid(bean.campaign_uuid) is None:
            raise NotFoundException("Campaign", bean.campaign_uuid)

    # Vérifier les doublons (cle calculee par invariant : nom pour MOE, user pour autres)
    existing_members = repository.get_by_campaign_uuid(bean.campaign_uuid)
    bean_key = _member_dedup_key(bean)
    for member in existing_members:
        if _member_dedup_key(member) == bean_key:
            # Affiche ce qui identifie effectivement le membre dans la cle de dedup
            label = bean.user_uuid if bean_key[1] == "user_uuid" else bean.name
            raise ConflictException(
                "name/role_id",
                f"Le membre '{label}' avec le rôle {bean.role_id} existe déjà dans cette campagne",
            )

    logger.info(f"Creating campaign team member for campaign_uuid={bean.campaign_uuid}")
    result = repository.create(bean)
    logger.info(f"Created campaign team member uuid={result.uuid}")
    return result


def get_campaign_team_member_by_uuid(
    repository: ICampaignTeamsRepository, uuid: str
) -> CampaignTeamsBean:
    """Récupère un membre d'équipe par son UUID."""
    bean = repository.get_by_uuid(uuid)
    if bean is None:
        raise NotFoundException("CampaignTeamMember", uuid)
    return bean


def get_campaign_team_members(
    repository: ICampaignTeamsRepository, campaign_uuid: str
) -> List[CampaignTeamsBean]:
    """Récupère tous les membres d'une équipe de campagne."""
    return repository.get_by_campaign_uuid(campaign_uuid)


def update_campaign_team_member(
    repository: ICampaignTeamsRepository, bean: CampaignTeamsBean
) -> CampaignTeamsBean:
    """Met à jour un membre d'équipe."""
    existing = repository.get_by_uuid(bean.uuid)
    if existing is None:
        raise NotFoundException("CampaignTeamMember", bean.uuid)

    _validate_member_invariant(bean)

    # Vérifier que le changement de cle ne cree pas de doublon
    new_key = _member_dedup_key(bean)
    old_key = _member_dedup_key(existing)
    if new_key != old_key:
        existing_members = repository.get_by_campaign_uuid(bean.campaign_uuid)
        for member in existing_members:
            if member.uuid != bean.uuid and _member_dedup_key(member) == new_key:
                label = bean.user_uuid if new_key[1] == "user_uuid" else bean.name
                raise ConflictException(
                    "name/role_id",
                    f"Le membre '{label}' avec le rôle {bean.role_id} existe déjà dans cette campagne",
                )

    logger.info(f"Updating campaign team member uuid={bean.uuid}")
    return repository.update(bean)


def delete_campaign_team_member(
    repository: ICampaignTeamsRepository, uuid: str
) -> bool:
    """Supprime un membre d'équipe."""
    existing = repository.get_by_uuid(uuid)
    if existing is None:
        raise NotFoundException("CampaignTeamMember", uuid)
    logger.info(f"Deleting campaign team member uuid={uuid}")
    if not repository.delete(uuid):
        raise NotFoundException("CampaignTeamMember", uuid)
    logger.info(f"Deleted campaign team member uuid={uuid}")
    return True
