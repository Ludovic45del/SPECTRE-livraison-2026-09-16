"""Mapper Machine — Entity ↔ Bean (sans persistance des agrégats)."""

from typing import Optional

from app.domain.material.models.machine_bean import MachineBean
from app.repository.material.models.machine_entity import MachineEntity


def _responsible_user_uuid(entity: MachineEntity) -> Optional[str]:
    raw = getattr(entity, "responsible_user_id", None)
    return str(raw) if raw else None


def machine_entity_to_bean(entity: MachineEntity) -> MachineBean:
    """Convertit l'entité en bean nu (sans agrégats).

    Les agrégats `links`, `equipments`, `next_maintenance_date` et
    `last_maintenance_date` sont peuplés séparément par le repository.
    """
    return MachineBean(
        uuid=str(entity.uuid),
        name=entity.name,
        room_id=entity.room_id,
        reference=entity.reference or "",
        manufacturer=entity.manufacturer or "",
        model=entity.model or "",
        commissioning_date=entity.commissioning_date,
        status=entity.status,
        responsible_user_uuid=_responsible_user_uuid(entity),
        description=entity.description or "",
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def machine_bean_to_entity(bean: MachineBean) -> MachineEntity:
    entity = MachineEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.name = bean.name
    entity.room_id = bean.room_id
    entity.reference = bean.reference
    entity.manufacturer = bean.manufacturer
    entity.model = bean.model
    entity.commissioning_date = bean.commissioning_date
    entity.status = bean.status
    entity.responsible_user_id = bean.responsible_user_uuid
    entity.description = bean.description
    return entity


def machine_update_entity_from_bean(entity: MachineEntity, bean: MachineBean) -> None:
    entity.name = bean.name
    entity.room_id = bean.room_id
    entity.reference = bean.reference
    entity.manufacturer = bean.manufacturer
    entity.model = bean.model
    entity.commissioning_date = bean.commissioning_date
    entity.status = bean.status
    entity.responsible_user_id = bean.responsible_user_uuid
    entity.description = bean.description
