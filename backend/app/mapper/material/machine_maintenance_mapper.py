"""Mapper MachineMaintenance — Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List, Optional

from app.domain.material.models.constants import MAINTENANCE_TYPE_PREVENTIVE
from app.domain.material.models.machine_maintenance_bean import MachineMaintenanceBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.material.models.machine_maintenance_entity import (
    MachineMaintenanceEntity,
)


def _performed_by_user_uuid(entity: MachineMaintenanceEntity) -> Optional[str]:
    raw = getattr(entity, "performed_by_user_id", None)
    return str(raw) if raw else None


def machine_maintenance_entity_to_bean(
    entity: MachineMaintenanceEntity,
) -> MachineMaintenanceBean:
    return MachineMaintenanceBean(
        uuid=str(entity.uuid),
        machine_uuid=str(entity.machine_id),
        date=entity.date,
        type=entity.type,
        performed_by_user_uuid=_performed_by_user_uuid(entity),
        performed_by_name=entity.performed_by_name or "",
        description=entity.description or "",
        next_maintenance_date=entity.next_maintenance_date,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def machine_maintenance_bean_to_entity(
    bean: MachineMaintenanceBean,
) -> MachineMaintenanceEntity:
    entity = MachineMaintenanceEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.machine_id = bean.machine_uuid
    entity.date = bean.date
    entity.type = bean.type
    entity.performed_by_user_id = bean.performed_by_user_uuid
    entity.performed_by_name = bean.performed_by_name
    entity.description = bean.description
    entity.next_maintenance_date = bean.next_maintenance_date
    return entity


def machine_maintenance_update_entity_from_bean(
    entity: MachineMaintenanceEntity, bean: MachineMaintenanceBean
) -> None:
    entity.date = bean.date
    entity.type = bean.type
    entity.performed_by_user_id = bean.performed_by_user_uuid
    entity.performed_by_name = bean.performed_by_name
    entity.description = bean.description
    entity.next_maintenance_date = bean.next_maintenance_date


def machine_maintenance_api_to_bean(data: Dict[str, Any]) -> MachineMaintenanceBean:
    user_uuid = data.get("performed_by_user_uuid")
    return MachineMaintenanceBean(
        uuid=str(data.get("uuid", "")),
        machine_uuid=str(data.get("machine_uuid", "")),
        date=parse_date_string(data.get("date")),
        type=data.get("type", MAINTENANCE_TYPE_PREVENTIVE),
        performed_by_user_uuid=str(user_uuid) if user_uuid else None,
        performed_by_name=data.get("performed_by_name", "") or "",
        description=data.get("description", "") or "",
        next_maintenance_date=parse_date_string(data.get("next_maintenance_date")),
    )


def machine_maintenance_bean_to_api(bean: MachineMaintenanceBean) -> Dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "machine_uuid": bean.machine_uuid,
        "date": format_date_for_api(bean.date),
        "type": bean.type,
        "performed_by_user_uuid": bean.performed_by_user_uuid,
        "performed_by_name": bean.performed_by_name,
        "description": bean.description,
        "next_maintenance_date": format_date_for_api(bean.next_maintenance_date),
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def machine_maintenance_beans_to_api(
    beans: List[MachineMaintenanceBean],
) -> List[Dict[str, Any]]:
    return [machine_maintenance_bean_to_api(bean) for bean in beans]
