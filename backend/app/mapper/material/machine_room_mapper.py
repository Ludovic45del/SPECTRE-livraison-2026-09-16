"""Mapper MachineRoom — Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.material.models.machine_room_bean import MachineRoomBean
from app.repository.material.models.machine_room_entity import MachineRoomEntity


def machine_room_entity_to_bean(entity: MachineRoomEntity) -> MachineRoomBean:
    return MachineRoomBean(
        id=entity.id,
        code=entity.code,
        label=entity.label,
        color=entity.color or "",
        sort_order=entity.sort_order,
    )


def machine_room_bean_to_api(bean: MachineRoomBean) -> Dict[str, Any]:
    return {
        "id": bean.id,
        "code": bean.code,
        "label": bean.label,
        "color": bean.color,
        "sort_order": bean.sort_order,
    }


def machine_room_beans_to_api(beans: List[MachineRoomBean]) -> List[Dict[str, Any]]:
    return [machine_room_bean_to_api(bean) for bean in beans]
