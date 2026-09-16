"""Mapper AssemblyStep - Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict, List

from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
from app.mapper.type_conversion import format_date_for_api
from app.repository.steps.models.assembly_step_entity import AssemblyStepEntity


def _read_operator_user_uuids(entity: AssemblyStepEntity) -> List[str]:
    """Lit les uuids des assembleurs (M2M), triés par uuid (ordre déterministe).

    L'étape étant collaborative, l'ordre des assembleurs n'a pas de sémantique
    métier : on canonicalise par tri uuid car un ManyToManyField sans `through`
    ne garantit pas l'ordre de `.all()` (sinon le singulier dérivé pourrait
    varier entre deux lectures). Fallback sur la FK simple `operator_user` si le
    M2M est vide (données legacy non backfillées, ou rollback du backfill 0076).
    """
    uuids = sorted(str(profile.uuid) for profile in entity.operator_users.all())
    if uuids:
        return uuids
    return [str(entity.operator_user_id)] if entity.operator_user_id else []


def _api_operator_user_uuids(data: Dict[str, Any]) -> List[str]:
    """Lit operator_user_uuids depuis l'API (trié), avec fallback sur le singulier.

    Rétro-compat : un ancien client qui n'envoie que `operator_user_uuid` est
    traité comme une liste à un élément. Le tri uuid garantit que FK simple,
    singulier API et liste partagent le même « premier » de façon déterministe.
    """
    raw = data.get("operator_user_uuids")
    if raw:
        return sorted(str(uuid) for uuid in raw)
    single = data.get("operator_user_uuid")
    return [str(single)] if single else []


def assembly_step_mapper_entity_to_bean(entity: AssemblyStepEntity) -> AssemblyStepBean:
    """Convertit une AssemblyStepEntity en AssemblyStepBean."""
    operator_user_uuids = _read_operator_user_uuids(entity)
    return AssemblyStepBean(
        uuid=str(entity.uuid),
        fsec_version_id=(
            str(entity.fsec_version_id_id) if entity.fsec_version_id_id else ""
        ),
        operator=entity.operator,
        operator_user_uuid=operator_user_uuids[0] if operator_user_uuids else None,
        operator_user_uuids=operator_user_uuids,
        start_date=entity.start_date,
        end_date=entity.end_date,
        comments=entity.comments,
        machine_uuids=[str(machine.uuid) for machine in entity.machines.all()],
    )


def assembly_step_mapper_bean_to_entity(bean: AssemblyStepBean) -> AssemblyStepEntity:
    """Convertit un AssemblyStepBean en AssemblyStepEntity.

    Le M2M operator_users est posé par le repository après save() ; ici on
    synchronise la FK simple operator_user sur le premier assembleur.
    """
    entity = AssemblyStepEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.fsec_version_id_id = bean.fsec_version_id
    entity.operator = bean.operator
    entity.operator_user_id = (
        bean.operator_user_uuids[0] if bean.operator_user_uuids else None
    )
    entity.start_date = bean.start_date
    entity.end_date = bean.end_date
    entity.comments = bean.comments
    return entity


def assembly_step_mapper_api_to_bean(data: Dict[str, Any]) -> AssemblyStepBean:
    """Convertit des données API en AssemblyStepBean."""
    operator_user_uuids = _api_operator_user_uuids(data)
    return AssemblyStepBean(
        uuid=data.get("uuid", ""),
        fsec_version_id=data.get("fsec_version_id", ""),
        operator=data.get("operator"),
        operator_user_uuid=operator_user_uuids[0] if operator_user_uuids else None,
        operator_user_uuids=operator_user_uuids,
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        comments=data.get("comments"),
        machine_uuids=[str(uuid) for uuid in data.get("machine_uuids") or []],
    )


def assembly_step_mapper_bean_to_api(bean: AssemblyStepBean) -> Dict[str, Any]:
    """Convertit un AssemblyStepBean en données API."""
    return {
        "uuid": bean.uuid,
        "fsec_version_id": bean.fsec_version_id,
        "operator": bean.operator,
        "operator_user_uuid": bean.operator_user_uuid,
        "operator_user_uuids": list(bean.operator_user_uuids),
        "start_date": format_date_for_api(bean.start_date),
        "end_date": format_date_for_api(bean.end_date),
        "comments": bean.comments,
        "machine_uuids": list(bean.machine_uuids),
    }
