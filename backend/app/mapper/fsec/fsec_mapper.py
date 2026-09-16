"""Mapper Fsec - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict, Optional, Tuple

from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.shared.naming import build_fsec_display_name
from app.domain.shared.slug import build_campaign_slug, build_fsec_slug, slugify_text
from app.mapper.type_conversion import parse_date_string
from app.repository.fsec.models.fsec_entity import FsecEntity


def _fsec_campaign_context(entity: FsecEntity) -> Tuple[Optional[Any], Optional[str]]:
    """Retourne ``(campagne, label installation)`` de la FSEC, ou ``(None, None)``.

    Suppose ``campaign_id__installation_id`` préchargé (cf. SELECT_RELATED).
    Le garde ``is not None`` est indispensable : l'installation LMJ a l'id 0.
    """
    campaign = entity.campaign_id if entity.campaign_id_id else None
    if campaign is None:
        return None, None
    installation_label = (
        campaign.installation_id.label
        if campaign.installation_id_id is not None
        else None
    )
    return campaign, installation_label


def fsec_slugs_from_entity(entity: FsecEntity) -> Tuple[Optional[str], Optional[str]]:
    """Calcule ``(slug FSEC, slug campagne)`` depuis l'entité.

    Le slug FSEC est préfixé par le contexte campagne (année-semestre-installation
    -nom) car le nom de FSEC n'est unique que ``(campaign_id, name)``. Un FSEC
    orphelin (sans campagne) retombe sur ``slugify(nom)`` et ``campaign_slug``
    None. Suppose ``campaign_id__installation_id`` préchargé (cf. SELECT_RELATED).
    """
    campaign, installation_label = _fsec_campaign_context(entity)
    if campaign is None:
        # FSEC orphelin (sans campagne) : slug = nom seul ; pas de campaign_slug.
        return slugify_text(entity.name), None
    campaign_slug = build_campaign_slug(
        campaign.year, campaign.semester, installation_label, campaign.name
    )
    slug = build_fsec_slug(
        campaign.year,
        campaign.semester,
        installation_label,
        campaign.name,
        entity.name,
    )
    return slug, campaign_slug


def fsec_display_name_from_entity(entity: FsecEntity) -> str:
    """Nom complet d'affichage ``{année}-{installation}_{campagne}_{nom}``.

    Une FSEC orpheline (sans campagne) garde son nom court. Suppose
    ``campaign_id__installation_id`` préchargé (cf. SELECT_RELATED).
    """
    campaign, installation_label = _fsec_campaign_context(entity)
    if campaign is None:
        return entity.name
    return build_fsec_display_name(
        campaign.year, installation_label, campaign.name, entity.name
    )


def _acceptor_profile_uuid(entity: FsecEntity) -> Optional[str]:
    """Retourne l'uuid UserProfile de l'accepteur de livraison (ou None).

    La FK pointe sur auth.User ; on remonte au UserProfile via `user.profile`
    (related_name défini sur UserProfileEntity). Le try/except couvre le cas
    rare d'un auth.User sans profil (ne devrait pas arriver en prod, mais
    on ne casse pas la sérialisation si jamais).
    """
    user = getattr(entity, "delivery_acceptor_user", None)
    if user is None:
        return None
    try:
        return str(user.profile.uuid)
    except Exception:  # pragma: no cover - profil orphelin
        return None


def fsec_mapper_entity_to_bean(entity: FsecEntity) -> FsecBean:
    """Convertit une FsecEntity en FsecBean."""
    # ImageField.url lève ValueError si le champ est vide → garde-fou explicite.
    overview_image_url = entity.overview_image.url if entity.overview_image else None
    assembly_plan_image_url = (
        entity.assembly_plan_image.url if entity.assembly_plan_image else None
    )
    slug, campaign_slug = fsec_slugs_from_entity(entity)
    return FsecBean(
        version_uuid=str(entity.version_uuid),
        fsec_uuid=str(entity.fsec_uuid),
        campaign_id=str(entity.campaign_id_id) if entity.campaign_id_id else None,
        status_id=entity.status_id_id if entity.status_id_id is not None else None,
        category_id=(
            entity.category_id_id if entity.category_id_id is not None else None
        ),
        rack_id=entity.rack_id_id if entity.rack_id_id is not None else None,
        name=entity.name,
        slug=slug,
        campaign_slug=campaign_slug,
        display_name=fsec_display_name_from_entity(entity),
        comments=entity.comments,
        last_updated=entity.last_updated,
        is_active=entity.is_active,
        created_at=entity.created_at,
        delivery_date=entity.delivery_date,
        shooting_date=entity.shooting_date,
        preshooting_pressure=entity.preshooting_pressure,
        experience_srxx=entity.experience_srxx,
        localisation=entity.localisation,
        depressurization_failed=entity.depressurization_failed,
        overview_image=overview_image_url,
        requested_views=entity.requested_views,
        assembly_plan_image=assembly_plan_image_url,
        assembly_plan_annotations=entity.assembly_plan_annotations or [],
        alignment_file_link=entity.alignment_file_link,
        fdie_link=entity.fdie_link,
        delivery_validation=entity.delivery_validation,
        delivery_remarques=entity.delivery_remarques,
        delivery_validated_by_id=(
            entity.delivery_validated_by_id
            if entity.delivery_validated_by_id is not None
            else None
        ),
        delivery_validated_by_username=(
            entity.delivery_validated_by.username
            if entity.delivery_validated_by_id is not None
            and entity.delivery_validated_by
            else None
        ),
        delivery_validated_at=entity.delivery_validated_at,
        delivery_acceptor_user_id=(
            entity.delivery_acceptor_user_id
            if entity.delivery_acceptor_user_id is not None
            else None
        ),
        delivery_acceptor_user_uuid=_acceptor_profile_uuid(entity),
        delivery_acceptor_username=(
            entity.delivery_acceptor_user.username
            if entity.delivery_acceptor_user_id is not None
            and entity.delivery_acceptor_user
            else None
        ),
        delivery_receiver_name=entity.delivery_receiver_name,
        delivery_receiver_date=entity.delivery_receiver_date,
        # ImageField.url lève ValueError si vide → garde-fou explicite.
        delivery_acceptor_signature=(
            entity.delivery_acceptor_signature.url
            if entity.delivery_acceptor_signature
            else None
        ),
        delivery_validator_signature=(
            entity.delivery_validator_signature.url
            if entity.delivery_validator_signature
            else None
        ),
    )


def fsec_mapper_bean_to_entity(bean: FsecBean) -> FsecEntity:
    """Convertit un FsecBean en FsecEntity."""
    entity = FsecEntity()
    if bean.version_uuid:
        entity.version_uuid = bean.version_uuid
    if bean.fsec_uuid:
        entity.fsec_uuid = bean.fsec_uuid
    entity.campaign_id_id = bean.campaign_id
    entity.status_id_id = bean.status_id
    entity.category_id_id = bean.category_id
    entity.rack_id_id = bean.rack_id
    entity.name = bean.name
    entity.comments = bean.comments
    entity.is_active = bean.is_active if bean.is_active is not None else True
    entity.delivery_date = bean.delivery_date
    entity.shooting_date = bean.shooting_date
    entity.preshooting_pressure = bean.preshooting_pressure
    entity.experience_srxx = bean.experience_srxx
    entity.localisation = bean.localisation
    entity.depressurization_failed = bean.depressurization_failed
    entity.requested_views = bean.requested_views
    entity.alignment_file_link = bean.alignment_file_link
    entity.fdie_link = bean.fdie_link
    entity.delivery_validation = bean.delivery_validation
    entity.delivery_remarques = bean.delivery_remarques
    if bean.delivery_validated_by_id is not None:
        entity.delivery_validated_by_id = bean.delivery_validated_by_id
    entity.delivery_validated_at = bean.delivery_validated_at
    # Phase 1 dropdown accepteur (FK auth.User). On assigne uniquement quand
    # l'id est fourni, sinon on conserve l'éventuelle valeur existante.
    if bean.delivery_acceptor_user_id is not None:
        entity.delivery_acceptor_user_id = bean.delivery_acceptor_user_id
    # Phase 2 texte libre + date.
    entity.delivery_receiver_name = bean.delivery_receiver_name
    entity.delivery_receiver_date = bean.delivery_receiver_date
    return entity


def fsec_mapper_api_to_bean(data: Dict[str, Any]) -> FsecBean:
    """Convertit des données API en FsecBean."""
    campaign_id = data.get("campaign_id")
    version_uuid = data.get("version_uuid", "")
    fsec_uuid = data.get("fsec_uuid", "")
    return FsecBean(
        version_uuid=str(version_uuid) if version_uuid else "",
        fsec_uuid=str(fsec_uuid) if fsec_uuid else "",
        campaign_id=str(campaign_id) if campaign_id else None,
        status_id=data.get("status_id"),
        category_id=data.get("category_id"),
        rack_id=data.get("rack_id"),
        name=data.get("name", ""),
        comments=data.get("comments"),
        is_active=data.get("is_active", True),
        delivery_date=parse_date_string(data.get("delivery_date")),
        shooting_date=parse_date_string(data.get("shooting_date")),
        preshooting_pressure=data.get("preshooting_pressure"),
        experience_srxx=data.get("experience_srxx"),
        localisation=data.get("localisation"),
        depressurization_failed=data.get("depressurization_failed"),
        alignment_file_link=data.get("alignment_file_link"),
        fdie_link=data.get("fdie_link"),
    )


def fsec_mapper_bean_to_api(bean: FsecBean) -> Dict[str, Any]:
    """Convertit un FsecBean en données API."""
    return {
        "version_uuid": bean.version_uuid,
        "fsec_uuid": bean.fsec_uuid,
        "slug": bean.slug,
        "campaign_id": bean.campaign_id,
        "campaign_slug": bean.campaign_slug,
        "status_id": bean.status_id,
        "category_id": bean.category_id,
        "rack_id": bean.rack_id,
        "name": bean.name,
        "display_name": (
            bean.display_name if bean.display_name is not None else bean.name
        ),
        "comments": bean.comments,
        "last_updated": bean.last_updated.isoformat() if bean.last_updated else None,
        "is_active": bean.is_active,
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
        "delivery_date": bean.delivery_date.isoformat() if bean.delivery_date else None,
        "shooting_date": bean.shooting_date.isoformat() if bean.shooting_date else None,
        "preshooting_pressure": bean.preshooting_pressure,
        "experience_srxx": bean.experience_srxx,
        "localisation": bean.localisation,
        "depressurization_failed": bean.depressurization_failed,
        "overview_image": bean.overview_image,
        "requested_views": bean.requested_views,
        "assembly_plan_image": bean.assembly_plan_image,
        "assembly_plan_annotations": bean.assembly_plan_annotations,
        "alignment_file_link": bean.alignment_file_link,
        "fdie_link": bean.fdie_link,
        "delivery_validation": bean.delivery_validation,
        "delivery_remarques": bean.delivery_remarques,
        "delivery_validated_by_username": bean.delivery_validated_by_username,
        "delivery_validated_at": (
            bean.delivery_validated_at.isoformat()
            if bean.delivery_validated_at
            else None
        ),
        "delivery_acceptor_user_uuid": bean.delivery_acceptor_user_uuid,
        "delivery_acceptor_username": bean.delivery_acceptor_username,
        "delivery_receiver_name": bean.delivery_receiver_name,
        "delivery_receiver_date": (
            bean.delivery_receiver_date.isoformat()
            if bean.delivery_receiver_date
            else None
        ),
    }
