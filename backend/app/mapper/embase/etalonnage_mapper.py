"""Mapper Etalonnage - Conversion Entity <-> Bean <-> API."""

from typing import Any, Dict, List

from app.domain.embase.models.etalonnage_bean import EtalonnageBean
from app.mapper.type_conversion import decimal_to_float, format_date_for_api
from app.repository.embase.models.etalonnage_entity import EtalonnageEntity


def _operateur_user_uuid(entity: EtalonnageEntity):
    raw = getattr(entity, "operateur_user_id", None)
    return str(raw) if raw else None


def etalonnage_mapper_entity_to_bean(entity: EtalonnageEntity) -> EtalonnageBean:
    return EtalonnageBean(
        uuid=str(entity.uuid),
        embase_uuid=str(entity.embase_id),
        voie=entity.voie,
        offset_0_bar_mv=entity.offset_0_bar_mv,
        mesurande_0_bar_lie=entity.mesurande_0_bar_lie,
        signal_etendue_mv=entity.signal_etendue_mv,
        signal_pa_meteociel=entity.signal_pa_meteociel,
        date=entity.date,
        operateur=entity.operateur or "",
        operateur_user_uuid=_operateur_user_uuid(entity),
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def etalonnage_mapper_bean_to_entity(bean: EtalonnageBean) -> EtalonnageEntity:
    entity = EtalonnageEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.embase_id = bean.embase_uuid
    entity.voie = bean.voie
    entity.offset_0_bar_mv = bean.offset_0_bar_mv
    entity.mesurande_0_bar_lie = bean.mesurande_0_bar_lie
    entity.signal_etendue_mv = bean.signal_etendue_mv
    entity.signal_pa_meteociel = bean.signal_pa_meteociel
    entity.date = bean.date
    entity.operateur = bean.operateur
    entity.operateur_user_id = bean.operateur_user_uuid
    return entity


def etalonnage_mapper_api_to_bean(data: Dict[str, Any]) -> EtalonnageBean:
    """Convertit des données API en EtalonnageBean."""
    user_uuid = data.get("operateur_user_uuid")
    return EtalonnageBean(
        uuid=data.get("uuid", ""),
        embase_uuid=str(data.get("embase_uuid", "")),
        voie=data.get("voie", 1),
        offset_0_bar_mv=data.get("offset_0_bar_mv"),
        mesurande_0_bar_lie=data.get("mesurande_0_bar_lie"),
        signal_etendue_mv=data.get("signal_etendue_mv"),
        signal_pa_meteociel=data.get("signal_pa_meteociel"),
        date=data.get("date"),
        operateur=data.get("operateur", ""),
        operateur_user_uuid=str(user_uuid) if user_uuid else None,
    )


def etalonnage_mapper_bean_to_api(bean: EtalonnageBean) -> Dict[str, Any]:
    return {
        "uuid": bean.uuid,
        "embase_uuid": bean.embase_uuid,
        "voie": bean.voie,
        "offset_0_bar_mv": decimal_to_float(bean.offset_0_bar_mv),
        "mesurande_0_bar_lie": decimal_to_float(bean.mesurande_0_bar_lie),
        "signal_etendue_mv": decimal_to_float(bean.signal_etendue_mv),
        "signal_pa_meteociel": decimal_to_float(bean.signal_pa_meteociel),
        "date": format_date_for_api(bean.date),
        "operateur": bean.operateur,
        "operateur_user_uuid": bean.operateur_user_uuid,
        "created_at": format_date_for_api(bean.created_at),
        "updated_at": format_date_for_api(bean.updated_at),
    }


def etalonnage_mapper_beans_to_api(beans: List[EtalonnageBean]) -> List[Dict[str, Any]]:
    return [etalonnage_mapper_bean_to_api(bean) for bean in beans]
