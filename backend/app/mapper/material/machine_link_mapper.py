"""Mapper MachineLink — Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.material.models.machine_link_bean import MachineLinkBean
from app.mapper.type_conversion import format_date_for_api
from app.repository.material.models.machine_link_entity import MachineLinkEntity


def machine_link_entity_to_bean(entity: MachineLinkEntity) -> MachineLinkBean:
    return MachineLinkBean(
        uuid=str(entity.uuid),
        machine_uuid=str(entity.machine_id),
        label=entity.label,
        url=entity.url,
        position=entity.position,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def machine_link_api_to_bean(data: Dict[str, Any]) -> MachineLinkBean:
    return MachineLinkBean(
        uuid=str(data.get("uuid", "")),
        machine_uuid=str(data.get("machine_uuid", "")),
        label=data.get("label", ""),
        url=data.get("url", ""),
        position=int(data.get("position", 0) or 0),
    )


def machine_link_bean_to_api(bean: MachineLinkBean) -> Dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "machine_uuid": bean.machine_uuid,
        "label": bean.label,
        "url": bean.url,
        "position": bean.position,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def machine_link_beans_to_api(beans: List[MachineLinkBean]) -> List[Dict[str, Any]]:
    return [machine_link_bean_to_api(bean) for bean in beans]
