"""Mapper Embase Entity - Conversion Entity <-> Bean."""

from app.domain.embase.models.embase_bean import EmbaseBean
from app.repository.embase.models.embase_entity import EmbaseEntity

# ---------------------------------------------------------------------------
# Helpers internes : extraction depuis Entity
# ---------------------------------------------------------------------------


def _extract_v1_fields_from_entity(entity: EmbaseEntity) -> dict:
    """Extrait les champs V1 depuis une EmbaseEntity."""
    return {
        "soufflet_v1": entity.soufflet_v1 or "",
        "capteur_v1": entity.capteur_v1 or "",
        "offset_v1_mv": entity.offset_v1_mv,
        "mesurande_lie_v1_mv": entity.mesurande_lie_v1_mv,
        "sensibilite_v1_mv": entity.sensibilite_v1_mv,
        "signal_meteociel_v1_mv": entity.signal_meteociel_v1_mv,
        "capteur_cible_pfeiffer_mbar": entity.capteur_cible_pfeiffer_mbar,
        "etendue_v1_mbar": entity.etendue_v1_mbar,
        "test_etancheite_he": entity.test_etancheite_he or "",
        "test_capteur_mrg": entity.test_capteur_mrg or "",
        "etalonnage_date": entity.etalonnage_date,
        "observations_v1": entity.observations_v1 or "",
    }


def _extract_v2_fields_from_entity(entity: EmbaseEntity) -> dict:
    """Extrait les champs V2 depuis une EmbaseEntity."""
    return {
        "soufflet_v2": entity.soufflet_v2 or "",
        "capteur_v2": entity.capteur_v2 or "",
        "offset_v2_mv": entity.offset_v2_mv,
        "mesurande_lie_v2_mv": entity.mesurande_lie_v2_mv,
        "sensibilite_v2_mv": entity.sensibilite_v2_mv,
        "signal_meteociel_v2_mv": entity.signal_meteociel_v2_mv,
        "capteur_cible_pfeiffer_v2_mbar": entity.capteur_cible_pfeiffer_v2_mbar,
        "etendue_v2_mbar": entity.etendue_v2_mbar,
        "test_etancheite_he_v2": entity.test_etancheite_he_v2 or "",
        "test_capteur_mrg_v2": entity.test_capteur_mrg_v2 or "",
        "observations_v2": entity.observations_v2 or "",
        "electrovanne": entity.electrovanne,
    }


def _extract_meca_fields_from_entity(entity: EmbaseEntity) -> dict:
    """Extrait les champs MECA depuis une EmbaseEntity."""
    return {
        "operationnelle_aimant": entity.operationnelle_aimant,
        "operationnelle_broche": entity.operationnelle_broche,
        "localisation_actuelle": entity.localisation_actuelle or "",
        "cote_ve": entity.cote_ve,
        "decalage_angulaire": entity.decalage_angulaire or "",
        "chargement_mcc": entity.chargement_mcc or "",
    }


# ---------------------------------------------------------------------------
# Helpers internes : build pour bean_to_entity
# ---------------------------------------------------------------------------


def _apply_v1_fields_to_entity(entity: EmbaseEntity, bean: EmbaseBean) -> None:
    """Applique les champs V1 du bean sur l'entity."""
    entity.soufflet_v1 = bean.soufflet_v1
    entity.capteur_v1 = bean.capteur_v1
    entity.offset_v1_mv = bean.offset_v1_mv
    entity.mesurande_lie_v1_mv = bean.mesurande_lie_v1_mv
    entity.sensibilite_v1_mv = bean.sensibilite_v1_mv
    entity.signal_meteociel_v1_mv = bean.signal_meteociel_v1_mv
    entity.capteur_cible_pfeiffer_mbar = bean.capteur_cible_pfeiffer_mbar
    entity.etendue_v1_mbar = bean.etendue_v1_mbar
    entity.test_etancheite_he = bean.test_etancheite_he
    entity.test_capteur_mrg = bean.test_capteur_mrg
    entity.etalonnage_date = bean.etalonnage_date
    entity.observations_v1 = bean.observations_v1


def _apply_v2_fields_to_entity(entity: EmbaseEntity, bean: EmbaseBean) -> None:
    """Applique les champs V2 du bean sur l'entity."""
    entity.soufflet_v2 = bean.soufflet_v2
    entity.capteur_v2 = bean.capteur_v2
    entity.offset_v2_mv = bean.offset_v2_mv
    entity.mesurande_lie_v2_mv = bean.mesurande_lie_v2_mv
    entity.sensibilite_v2_mv = bean.sensibilite_v2_mv
    entity.signal_meteociel_v2_mv = bean.signal_meteociel_v2_mv
    entity.capteur_cible_pfeiffer_v2_mbar = bean.capteur_cible_pfeiffer_v2_mbar
    entity.etendue_v2_mbar = bean.etendue_v2_mbar
    entity.test_etancheite_he_v2 = bean.test_etancheite_he_v2
    entity.test_capteur_mrg_v2 = bean.test_capteur_mrg_v2
    entity.observations_v2 = bean.observations_v2
    entity.electrovanne = bean.electrovanne


def _apply_meca_fields_to_entity(entity: EmbaseEntity, bean: EmbaseBean) -> None:
    """Applique les champs MECA du bean sur l'entity."""
    entity.operationnelle_aimant = bean.operationnelle_aimant
    entity.operationnelle_broche = bean.operationnelle_broche
    entity.localisation_actuelle = bean.localisation_actuelle
    entity.cote_ve = bean.cote_ve
    entity.decalage_angulaire = bean.decalage_angulaire
    entity.chargement_mcc = bean.chargement_mcc


# ---------------------------------------------------------------------------
# Fonctions publiques
# ---------------------------------------------------------------------------


def embase_mapper_entity_to_bean(entity: EmbaseEntity) -> EmbaseBean:
    """Convertit une EmbaseEntity en EmbaseBean."""
    v1 = _extract_v1_fields_from_entity(entity)
    v2 = _extract_v2_fields_from_entity(entity)
    meca = _extract_meca_fields_from_entity(entity)
    return EmbaseBean(
        uuid=str(entity.uuid),
        identifier=entity.identifier,
        type=entity.type,
        nombre_voies=entity.nombre_voies,
        **v1,
        **meca,
        **v2,
        # Historique FSECs
        fsec_history=entity.fsec_history or "",
        # Computed: dernier etalonnage
        last_etalonnage_date=getattr(entity, "_last_etalonnage_date", None),
        last_etalonnage_date_v1=getattr(entity, "_last_etalonnage_date_v1", None),
        last_etalonnage_date_v2=getattr(entity, "_last_etalonnage_date_v2", None),
        # Metadata
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def embase_mapper_bean_to_entity(bean: EmbaseBean) -> EmbaseEntity:
    """Convertit un EmbaseBean en EmbaseEntity (pour creation)."""
    entity = EmbaseEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.identifier = bean.identifier
    entity.type = bean.type
    entity.nombre_voies = bean.nombre_voies
    _apply_v1_fields_to_entity(entity, bean)
    _apply_meca_fields_to_entity(entity, bean)
    _apply_v2_fields_to_entity(entity, bean)
    entity.fsec_history = bean.fsec_history
    return entity


def embase_mapper_update_entity_from_bean(
    entity: EmbaseEntity, bean: EmbaseBean
) -> None:
    """Met a jour une EmbaseEntity existante depuis un EmbaseBean.

    Copie tous les champs modifiables du bean vers l'entity.
    N'affecte pas uuid, created_at, updated_at.
    """
    entity.identifier = bean.identifier
    entity.type = bean.type
    entity.nombre_voies = bean.nombre_voies
    _apply_v1_fields_to_entity(entity, bean)
    _apply_meca_fields_to_entity(entity, bean)
    _apply_v2_fields_to_entity(entity, bean)
    entity.fsec_history = bean.fsec_history
