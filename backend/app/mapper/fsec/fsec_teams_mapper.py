"""Mapper FsecTeams - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.fsec.models.fsec_teams_bean import FsecTeamsBean
from app.repository.fsec.models.fsec_teams_entity import FsecTeamsEntity


def _user_uuid(entity: FsecTeamsEntity):
    raw = getattr(entity, "user_id", None)
    return str(raw) if raw else None


def fsec_teams_mapper_entity_to_bean(entity: FsecTeamsEntity) -> FsecTeamsBean:
    """Convertit une FsecTeamsEntity en FsecTeamsBean."""
    return FsecTeamsBean(
        uuid=str(entity.uuid),
        fsec_id=str(entity.fsec_id_id) if entity.fsec_id_id else "",
        role_id=entity.role_id_id if entity.role_id_id is not None else None,
        name=entity.name,
        user_uuid=_user_uuid(entity),
    )


def fsec_teams_mapper_bean_to_entity(bean: FsecTeamsBean) -> FsecTeamsEntity:
    """Convertit un FsecTeamsBean en FsecTeamsEntity."""
    entity = FsecTeamsEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_id_id = bean.fsec_id
    entity.role_id_id = bean.role_id
    entity.name = bean.name
    entity.user_id = bean.user_uuid
    return entity


def fsec_teams_mapper_api_to_bean(data: Dict[str, Any]) -> FsecTeamsBean:
    """Convertit des données API en FsecTeamsBean."""
    user_uuid = data.get("user_uuid")
    raw_name = data.get("name")
    return FsecTeamsBean(
        uuid=data.get("uuid", ""),
        fsec_id=data.get("fsec_id", ""),
        role_id=data.get("role_id"),
        name=raw_name if raw_name else None,
        user_uuid=str(user_uuid) if user_uuid else None,
    )


def fsec_teams_mapper_bean_to_api(bean: FsecTeamsBean) -> Dict[str, Any]:
    """Convertit un FsecTeamsBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_id": bean.fsec_id,
        "role_id": bean.role_id,
        "name": bean.name,
        "user_uuid": bean.user_uuid,
    }
