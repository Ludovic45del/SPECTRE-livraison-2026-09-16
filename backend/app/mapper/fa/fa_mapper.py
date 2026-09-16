"""Mapper FA - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.fa.models.fa_bean import FaBean
from app.domain.shared.naming import build_fsec_display_name
from app.domain.shared.slug import build_campaign_slug, build_fsec_slug, slugify_text
from app.mapper.type_conversion import parse_date_string
from app.repository.fa.models.fa_entity import FaEntity


def _user_fk_uuid(entity: FaEntity, attr: str):
    """Lit l'uuid de la FK *_user (`*_user_id`) ou None.

    Les FK utilisent to_field='uuid' donc *_user_id contient directement l'uuid.
    """
    raw = getattr(entity, f"{attr}_id", None)
    return str(raw) if raw else None


def _resolve_fsec_derived_fields(entity: FaEntity) -> tuple:
    """Extrait fsec_name + installation + slugs parents depuis les FK pré-chargées.

    FaRepository.SELECT_RELATED inclut `fsec_version_id__campaign_id__installation_id`
    pour éviter tout N+1 ; en cas d'usage hors repository, l'accès attribut peut
    déclencher des requêtes supplémentaires.

    Retourne ``(fsec_name, fsec_display_name, installation, campaign_slug,
    fsec_slug)`` ; les slugs sont None si la FSEC parente n'a pas de campagne,
    et le nom complet retombe alors sur le nom court.
    """
    fsec = (
        entity.fsec_version_id
    )  # FK obligatoire (PROTECT), jamais None pour une FA persistée
    fsec_name = getattr(fsec, "name", None) if fsec is not None else None
    fsec_display_name = fsec_name
    installation = None
    campaign_slug = None
    fsec_slug = None
    if fsec is not None:
        campaign = getattr(fsec, "campaign_id", None)
        if campaign is not None:
            inst = getattr(campaign, "installation_id", None)
            if inst is not None:
                installation = getattr(inst, "label", None)
            campaign_slug = build_campaign_slug(
                campaign.year, campaign.semester, installation, campaign.name
            )
            fsec_slug = build_fsec_slug(
                campaign.year,
                campaign.semester,
                installation,
                campaign.name,
                fsec_name,
            )
            fsec_display_name = build_fsec_display_name(
                campaign.year, installation, campaign.name, fsec_name
            )
    return fsec_name, fsec_display_name, installation, campaign_slug, fsec_slug


def fa_mapper_entity_to_bean(entity: FaEntity) -> FaBean:
    """Convertit une FaEntity en FaBean."""
    fsec_name, fsec_display_name, installation, campaign_slug, fsec_slug = (
        _resolve_fsec_derived_fields(entity)
    )
    return FaBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        status_id=entity.status_id_id if entity.status_id_id is not None else None,
        type_id=entity.type_id_id if entity.type_id_id is not None else None,
        criticality_id=(
            entity.criticality_id_id if entity.criticality_id_id is not None else None
        ),
        identifier=entity.identifier,
        # Phase Ouvert
        fsec_step_id=entity.fsec_step_id,
        fsec_step_other=entity.fsec_step_other,
        discoverer=entity.discoverer,
        discoverer_user_uuid=_user_fk_uuid(entity, "discoverer_user"),
        event_date=entity.event_date,
        observation=entity.observation,
        location_equipment=entity.location_equipment,
        quick_analysis=entity.quick_analysis,
        immediate_measures=entity.immediate_measures,
        iec_validation_open=entity.iec_validation_open,
        iec_validation_open_date=entity.iec_validation_open_date,
        iec_validation_open_name=entity.iec_validation_open_name,
        iec_validation_open_user_uuid=_user_fk_uuid(entity, "iec_validation_open_user"),
        # Phase En cours (sans date de passage en cours)
        cause=entity.cause,
        experience_impact=entity.experience_impact,
        iec_validation_progress=entity.iec_validation_progress,
        iec_validation_progress_name=entity.iec_validation_progress_name,
        iec_validation_progress_user_uuid=_user_fk_uuid(
            entity, "iec_validation_progress_user"
        ),
        # Phase Clos
        closure_validation=entity.closure_validation,
        closure_date=entity.closure_date,
        closure_validator_name=entity.closure_validator_name,
        closure_validator_user_uuid=_user_fk_uuid(entity, "closure_validator_user"),
        # Metadata
        created_at=entity.created_at,
        last_updated=entity.last_updated,
        # Champs dérivés
        fsec_name=fsec_name,
        fsec_display_name=fsec_display_name,
        installation=installation,
        slug=slugify_text(entity.identifier),
        fsec_slug=fsec_slug,
        campaign_slug=campaign_slug,
    )


def fa_mapper_bean_to_entity(bean: FaBean) -> FaEntity:
    """Convertit un FaBean en FaEntity."""
    entity = FaEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.status_id_id = bean.status_id
    entity.type_id_id = bean.type_id
    entity.criticality_id_id = bean.criticality_id
    entity.identifier = bean.identifier
    # Phase Ouvert
    entity.fsec_step_id = bean.fsec_step_id
    entity.fsec_step_other = bean.fsec_step_other
    # discoverer/observation/quick_analysis sont NOT NULL en base : on coerce
    # None -> "" (le mapper api_to_bean peut produire None pour les PUT partiels).
    entity.discoverer = bean.discoverer or ""
    entity.discoverer_user_id = bean.discoverer_user_uuid
    entity.event_date = bean.event_date
    entity.observation = bean.observation or ""
    entity.location_equipment = bean.location_equipment
    entity.quick_analysis = bean.quick_analysis or ""
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
    return entity


def _opt_uuid_str(value):
    return str(value) if value else None


def fa_mapper_api_to_bean(data: Dict[str, Any]) -> FaBean:
    """Convertit des données API en FaBean.

    Pour les champs str non-Optional (discoverer, observation, quick_analysis),
    on retourne None quand la clé est absente afin que `_merge_fa_beans` puisse
    distinguer "non fourni" (preserve l'existant) de "vide explicitement" ("").
    Sinon un PUT partiel (ex: phase En Cours) écraserait silencieusement
    observation/quick_analysis avec une chaîne vide.
    """
    return FaBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        status_id=data.get("status_id"),
        type_id=data.get("type_id"),
        criticality_id=data.get("criticality_id"),
        identifier=data.get("identifier", ""),
        # Phase Ouvert
        fsec_step_id=data.get("fsec_step_id"),
        fsec_step_other=data.get("fsec_step_other"),
        discoverer=data.get("discoverer"),
        discoverer_user_uuid=_opt_uuid_str(data.get("discoverer_user_uuid")),
        event_date=parse_date_string(data.get("event_date")),
        observation=data.get("observation"),
        location_equipment=data.get("location_equipment"),
        quick_analysis=data.get("quick_analysis"),
        immediate_measures=data.get("immediate_measures"),
        iec_validation_open=data.get("iec_validation_open", False),
        iec_validation_open_date=parse_date_string(
            data.get("iec_validation_open_date")
        ),
        iec_validation_open_name=data.get("iec_validation_open_name"),
        iec_validation_open_user_uuid=_opt_uuid_str(
            data.get("iec_validation_open_user_uuid")
        ),
        # Phase En cours (sans date de passage en cours)
        cause=data.get("cause"),
        experience_impact=data.get("experience_impact"),
        iec_validation_progress=data.get("iec_validation_progress", False),
        iec_validation_progress_name=data.get("iec_validation_progress_name"),
        iec_validation_progress_user_uuid=_opt_uuid_str(
            data.get("iec_validation_progress_user_uuid")
        ),
        # Phase Clos
        closure_validation=data.get("closure_validation"),
        closure_date=parse_date_string(data.get("closure_date")),
        closure_validator_name=data.get("closure_validator_name"),
        closure_validator_user_uuid=_opt_uuid_str(
            data.get("closure_validator_user_uuid")
        ),
    )


def fa_mapper_bean_to_api(bean: FaBean) -> Dict[str, Any]:
    """Convertit un FaBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "status_id": bean.status_id,
        "type_id": bean.type_id,
        "criticality_id": bean.criticality_id,
        "identifier": bean.identifier,
        # Phase Ouvert
        "fsec_step_id": bean.fsec_step_id,
        "fsec_step_other": bean.fsec_step_other,
        "discoverer": bean.discoverer,
        "discoverer_user_uuid": bean.discoverer_user_uuid,
        "event_date": bean.event_date.isoformat() if bean.event_date else None,
        "observation": bean.observation,
        "location_equipment": bean.location_equipment,
        "quick_analysis": bean.quick_analysis,
        "immediate_measures": bean.immediate_measures,
        "iec_validation_open": bean.iec_validation_open,
        "iec_validation_open_date": (
            bean.iec_validation_open_date.isoformat()
            if bean.iec_validation_open_date
            else None
        ),
        "iec_validation_open_name": bean.iec_validation_open_name,
        "iec_validation_open_user_uuid": bean.iec_validation_open_user_uuid,
        # Phase En cours (sans date de passage en cours)
        "cause": bean.cause,
        "experience_impact": bean.experience_impact,
        "iec_validation_progress": bean.iec_validation_progress,
        "iec_validation_progress_name": bean.iec_validation_progress_name,
        "iec_validation_progress_user_uuid": bean.iec_validation_progress_user_uuid,
        # Phase Clos
        "closure_validation": bean.closure_validation,
        "closure_date": bean.closure_date.isoformat() if bean.closure_date else None,
        "closure_validator_name": bean.closure_validator_name,
        "closure_validator_user_uuid": bean.closure_validator_user_uuid,
        # Metadata
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
        "last_updated": bean.last_updated.isoformat() if bean.last_updated else None,
        # Champs dérivés (lecture seule) — évitent un re-fetch de /fsecs/ + /campaigns/
        # côté frontend pour résoudre le nom de la FSEC associée et l'installation.
        "fsec_name": bean.fsec_name,
        "fsec_display_name": bean.fsec_display_name,
        "installation": bean.installation,
        # Slugs d'URL (lecture seule) : la FA et ses parents, pour la navigation.
        "slug": bean.slug,
        "fsec_slug": bean.fsec_slug,
        "campaign_slug": bean.campaign_slug,
    }


def fa_mapper_beans_to_api(beans: List[FaBean]) -> List[Dict[str, Any]]:
    """Convertit une liste de FaBeans en liste de données API."""
    return [fa_mapper_bean_to_api(bean) for bean in beans]
