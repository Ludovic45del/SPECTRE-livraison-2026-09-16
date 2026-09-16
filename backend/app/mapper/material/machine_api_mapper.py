"""Mapper Machine — Bean ↔ API (incluant l'agrégat liens documentaires)."""

from typing import Any, Dict, List

from app.domain.material.models.constants import MACHINE_STATUS_IN_SERVICE
from app.domain.material.models.machine_bean import MachineBean
from app.mapper.material.machine_link_mapper import machine_link_bean_to_api
from app.mapper.type_conversion import format_date_for_api, parse_date_string


def machine_api_to_bean(data: Dict[str, Any]) -> MachineBean:
    """Convertit la payload API en bean.

    L'agrégat `links` n'est pas porté par le bean ici : il est extrait
    séparément par le contrôleur car sa logique de persistance est distincte
    (delete + recreate des liens).
    """
    responsible_uuid = data.get("responsible_user_uuid")
    return MachineBean(
        uuid=str(data.get("uuid", "")),
        name=data.get("name", ""),
        room_id=int(data.get("room_id", 0) or 0),
        reference=data.get("reference", "") or "",
        manufacturer=data.get("manufacturer", "") or "",
        model=data.get("model", "") or "",
        commissioning_date=parse_date_string(data.get("commissioning_date")),
        status=data.get("status", MACHINE_STATUS_IN_SERVICE),
        responsible_user_uuid=str(responsible_uuid) if responsible_uuid else None,
        description=data.get("description", "") or "",
    )


def machine_bean_to_api(bean: MachineBean) -> Dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "name": bean.name,
        "room_id": bean.room_id,
        "reference": bean.reference,
        "manufacturer": bean.manufacturer,
        "model": bean.model,
        "commissioning_date": format_date_for_api(bean.commissioning_date),
        "status": bean.status,
        "responsible_user_uuid": bean.responsible_user_uuid,
        "description": bean.description,
        "links": [machine_link_bean_to_api(link) for link in bean.links],
        "next_maintenance_date": format_date_for_api(bean.next_maintenance_date),
        "last_maintenance_date": format_date_for_api(bean.last_maintenance_date),
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def machine_beans_to_api(beans: List[MachineBean]) -> List[Dict[str, Any]]:
    return [machine_bean_to_api(bean) for bean in beans]
