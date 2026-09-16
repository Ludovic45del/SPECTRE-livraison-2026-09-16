"""Mapper LabContact — Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.labcontact.models.lab_contact_bean import LabContactBean
from app.mapper.type_conversion import format_date_for_api
from app.repository.labcontact.models.lab_contact_entity import LabContactEntity

# ---------------------------------------------------------------------------
# Entity <-> Bean
# ---------------------------------------------------------------------------


def lab_contact_entity_to_bean(entity: LabContactEntity) -> LabContactBean:
    """Convertit une entité ORM en bean domaine."""
    return LabContactBean(
        uuid=str(entity.uuid),
        name=entity.name or "",
        phone=entity.phone or "",
        comment=entity.comment or "",
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def lab_contact_bean_to_entity(bean: LabContactBean) -> LabContactEntity:
    """Construit une nouvelle entité (non sauvegardée) à partir d'un bean."""
    entity = LabContactEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.name = bean.name
    entity.phone = bean.phone or ""
    entity.comment = bean.comment or ""
    return entity


def lab_contact_update_entity_from_bean(
    entity: LabContactEntity, bean: LabContactBean
) -> None:
    """Recopie les champs éditables du bean sur une entité existante (uuid inchangé)."""
    entity.name = bean.name
    entity.phone = bean.phone or ""
    entity.comment = bean.comment or ""


# ---------------------------------------------------------------------------
# API <-> Bean
# ---------------------------------------------------------------------------


def lab_contact_api_to_bean(data: Dict[str, Any]) -> LabContactBean:
    """Convertit les données validées par le serializer en bean."""
    uuid = data.get("uuid")
    return LabContactBean(
        uuid=str(uuid) if uuid else "",
        name=data.get("name", "") or "",
        phone=data.get("phone", "") or "",
        comment=data.get("comment", "") or "",
    )


def lab_contact_bean_to_api(bean: LabContactBean) -> Dict[str, Any]:
    """Sérialise un bean au format de réponse API (snake_case)."""
    return {
        "uuid": bean.uuid,
        "name": bean.name,
        "phone": bean.phone,
        "comment": bean.comment,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def lab_contact_beans_to_api(beans: List[LabContactBean]) -> List[Dict[str, Any]]:
    """Sérialise une liste de beans."""
    return [lab_contact_bean_to_api(bean) for bean in beans]
