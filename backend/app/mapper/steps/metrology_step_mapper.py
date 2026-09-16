"""Mapper MetrologyStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity


def _read_metrologist_user_uuids(entity: MetrologyStepEntity) -> List[str]:
    """Lit les uuids des métrologues (M2M), triés par uuid (ordre déterministe).

    L'étape étant collaborative, l'ordre n'a pas de sémantique métier : on
    canonicalise par tri uuid car un ManyToManyField sans `through` ne garantit
    pas l'ordre de `.all()`. Fallback sur la FK simple `metrologist_user` si le
    M2M est vide (données legacy non backfillées, ou rollback du backfill 0076).
    """
    uuids = sorted(str(profile.uuid) for profile in entity.metrologist_users.all())
    if uuids:
        return uuids
    return [str(entity.metrologist_user_id)] if entity.metrologist_user_id else []


def _api_metrologist_user_uuids(data: Dict[str, Any]) -> List[str]:
    """Lit metrologist_user_uuids depuis l'API (trié), avec fallback sur le singulier."""
    raw = data.get("metrologist_user_uuids")
    if raw:
        return sorted(str(uuid) for uuid in raw)
    single = data.get("metrologist_user_uuid")
    return [str(single)] if single else []


def metrology_step_mapper_entity_to_bean(
    entity: MetrologyStepEntity,
) -> MetrologyStepBean:
    """Convertit une MetrologyStepEntity en MetrologyStepBean."""
    metrologist_user_uuids = _read_metrologist_user_uuids(entity)
    return MetrologyStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        rack_id=entity.rack_id_id if entity.rack_id_id is not None else None,
        metrologist_name=entity.metrologist_name,
        metrologist_user_uuid=(
            metrologist_user_uuids[0] if metrologist_user_uuids else None
        ),
        metrologist_user_uuids=metrologist_user_uuids,
        date=entity.date,
        comments=entity.comments,
        machine_uuids=[str(machine.uuid) for machine in entity.machines.all()],
        metro_file_link=entity.metro_file_link,
        visrad_link=entity.visrad_link,
    )


def metrology_step_mapper_bean_to_entity(
    bean: MetrologyStepBean,
) -> MetrologyStepEntity:
    """Convertit un MetrologyStepBean en MetrologyStepEntity.

    Le M2M metrologist_users est posé par le repository après save() ; ici on
    synchronise la FK simple metrologist_user sur le premier métrologue.
    """
    entity = MetrologyStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.rack_id_id = bean.rack_id
    entity.metrologist_name = bean.metrologist_name
    entity.metrologist_user_id = (
        bean.metrologist_user_uuids[0] if bean.metrologist_user_uuids else None
    )
    entity.date = bean.date
    entity.comments = bean.comments
    entity.metro_file_link = bean.metro_file_link
    entity.visrad_link = bean.visrad_link
    return entity


def metrology_step_mapper_api_to_bean(data: Dict[str, Any]) -> MetrologyStepBean:
    """Convertit des données API en MetrologyStepBean."""
    metrologist_user_uuids = _api_metrologist_user_uuids(data)
    return MetrologyStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        rack_id=data.get("rack_id"),
        metrologist_name=data.get("metrologist_name"),
        metrologist_user_uuid=(
            metrologist_user_uuids[0] if metrologist_user_uuids else None
        ),
        metrologist_user_uuids=metrologist_user_uuids,
        date=parse_date_string(data.get("date")),
        comments=data.get("comments"),
        machine_uuids=[str(uuid) for uuid in data.get("machine_uuids") or []],
        metro_file_link=data.get("metro_file_link"),
        visrad_link=data.get("visrad_link"),
    )


def metrology_step_mapper_bean_to_api(bean: MetrologyStepBean) -> Dict[str, Any]:
    """Convertit un MetrologyStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "rack_id": bean.rack_id,
        "metrologist_name": bean.metrologist_name,
        "metrologist_user_uuid": bean.metrologist_user_uuid,
        "metrologist_user_uuids": list(bean.metrologist_user_uuids),
        "date": format_date_for_api(bean.date),
        "comments": bean.comments,
        "machine_uuids": list(bean.machine_uuids),
        "metro_file_link": bean.metro_file_link,
        "visrad_link": bean.visrad_link,
    }
