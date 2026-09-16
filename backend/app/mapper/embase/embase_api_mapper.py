"""Mapper Embase API - Conversion Bean <-> API."""

from dataclasses import asdict
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from app.domain.embase.models.embase_bean import EmbaseBean
from app.domain.embase.models.fsec_history_bean import FsecHistoryEntryBean
from app.domain.shared.slug import slugify_text
from app.mapper.type_conversion import (
    decimal_to_float,
    format_date_for_api,
    parse_date_string,
)


def _to_decimal(value: Any) -> Decimal | None:
    """Convertit une valeur en Decimal si possible."""
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (ValueError, TypeError, InvalidOperation):
        return None


# ---------------------------------------------------------------------------
# Helpers internes : extraction depuis API data (dict)
# ---------------------------------------------------------------------------


def _extract_v1_fields_from_api(data: Dict[str, Any]) -> dict:
    """Extrait les champs V1 depuis des donnees API."""
    return {
        "soufflet_v1": data.get("soufflet_v1", ""),
        "capteur_v1": data.get("capteur_v1", ""),
        "offset_v1_mv": _to_decimal(data.get("offset_v1_mv")),
        "mesurande_lie_v1_mv": _to_decimal(data.get("mesurande_lie_v1_mv")),
        "sensibilite_v1_mv": _to_decimal(data.get("sensibilite_v1_mv")),
        "signal_meteociel_v1_mv": _to_decimal(data.get("signal_meteociel_v1_mv")),
        "capteur_cible_pfeiffer_mbar": _to_decimal(
            data.get("capteur_cible_pfeiffer_mbar")
        ),
        "etendue_v1_mbar": data.get("etendue_v1_mbar"),
        "test_etancheite_he": data.get("test_etancheite_he", ""),
        "test_capteur_mrg": data.get("test_capteur_mrg", ""),
        "etalonnage_date": parse_date_string(data.get("etalonnage_date")),
        "observations_v1": data.get("observations_v1", ""),
    }


def _extract_v2_fields_from_api(data: Dict[str, Any]) -> dict:
    """Extrait les champs V2 depuis des donnees API."""
    return {
        "soufflet_v2": data.get("soufflet_v2", ""),
        "capteur_v2": data.get("capteur_v2", ""),
        "offset_v2_mv": _to_decimal(data.get("offset_v2_mv")),
        "mesurande_lie_v2_mv": _to_decimal(data.get("mesurande_lie_v2_mv")),
        "sensibilite_v2_mv": _to_decimal(data.get("sensibilite_v2_mv")),
        "signal_meteociel_v2_mv": _to_decimal(data.get("signal_meteociel_v2_mv")),
        "capteur_cible_pfeiffer_v2_mbar": _to_decimal(
            data.get("capteur_cible_pfeiffer_v2_mbar")
        ),
        "etendue_v2_mbar": data.get("etendue_v2_mbar"),
        "test_etancheite_he_v2": data.get("test_etancheite_he_v2", ""),
        "test_capteur_mrg_v2": data.get("test_capteur_mrg_v2", ""),
        "observations_v2": data.get("observations_v2", ""),
        "electrovanne": data.get("electrovanne", False),
    }


def _extract_meca_fields_from_api(data: Dict[str, Any]) -> dict:
    """Extrait les champs MECA depuis des donnees API."""
    return {
        "operationnelle_aimant": data.get("operationnelle_aimant", False),
        "operationnelle_broche": data.get("operationnelle_broche", False),
        "localisation_actuelle": data.get("localisation_actuelle", ""),
        "cote_ve": _to_decimal(data.get("cote_ve")),
        "decalage_angulaire": data.get("decalage_angulaire", ""),
        "chargement_mcc": data.get("chargement_mcc", ""),
    }


# ---------------------------------------------------------------------------
# Helpers internes : build pour bean_to_api
# ---------------------------------------------------------------------------


def _build_v1_fields_for_api(bean: EmbaseBean) -> dict:
    """Construit les champs V1 pour la sortie API."""
    return {
        "soufflet_v1": bean.soufflet_v1,
        "capteur_v1": bean.capteur_v1,
        "offset_v1_mv": decimal_to_float(bean.offset_v1_mv),
        "mesurande_lie_v1_mv": decimal_to_float(bean.mesurande_lie_v1_mv),
        "sensibilite_v1_mv": decimal_to_float(bean.sensibilite_v1_mv),
        "signal_meteociel_v1_mv": decimal_to_float(bean.signal_meteociel_v1_mv),
        "capteur_cible_pfeiffer_mbar": decimal_to_float(
            bean.capteur_cible_pfeiffer_mbar
        ),
        "etendue_v1_mbar": bean.etendue_v1_mbar,
        "test_etancheite_he": bean.test_etancheite_he,
        "test_capteur_mrg": bean.test_capteur_mrg,
        "etalonnage_date": format_date_for_api(bean.etalonnage_date),
        "observations_v1": bean.observations_v1,
    }


def _build_v2_fields_for_api(bean: EmbaseBean) -> dict:
    """Construit les champs V2 pour la sortie API."""
    return {
        "soufflet_v2": bean.soufflet_v2,
        "capteur_v2": bean.capteur_v2,
        "offset_v2_mv": decimal_to_float(bean.offset_v2_mv),
        "mesurande_lie_v2_mv": decimal_to_float(bean.mesurande_lie_v2_mv),
        "sensibilite_v2_mv": decimal_to_float(bean.sensibilite_v2_mv),
        "signal_meteociel_v2_mv": decimal_to_float(bean.signal_meteociel_v2_mv),
        "capteur_cible_pfeiffer_v2_mbar": decimal_to_float(
            bean.capteur_cible_pfeiffer_v2_mbar
        ),
        "etendue_v2_mbar": bean.etendue_v2_mbar,
        "test_etancheite_he_v2": bean.test_etancheite_he_v2,
        "test_capteur_mrg_v2": bean.test_capteur_mrg_v2,
        "observations_v2": bean.observations_v2,
        "electrovanne": bean.electrovanne,
    }


def _build_meca_fields_for_api(bean: EmbaseBean) -> dict:
    """Construit les champs MECA pour la sortie API."""
    return {
        "operationnelle_aimant": bean.operationnelle_aimant,
        "operationnelle_broche": bean.operationnelle_broche,
        "localisation_actuelle": bean.localisation_actuelle,
        "cote_ve": decimal_to_float(bean.cote_ve),
        "decalage_angulaire": bean.decalage_angulaire,
        "chargement_mcc": bean.chargement_mcc,
    }


# ---------------------------------------------------------------------------
# Fonctions publiques
# ---------------------------------------------------------------------------


def embase_mapper_api_to_bean(data: Dict[str, Any]) -> EmbaseBean:
    """Convertit des donnees API en EmbaseBean."""
    v1 = _extract_v1_fields_from_api(data)
    v2 = _extract_v2_fields_from_api(data)
    meca = _extract_meca_fields_from_api(data)
    return EmbaseBean(
        uuid=data.get("uuid", ""),
        identifier=data.get("identifier", ""),
        type=data.get("type", ""),
        nombre_voies=data.get("nombre_voies", 1),
        **v1,
        **meca,
        **v2,
        # Historique FSECs
        fsec_history=data.get("fsec_history", ""),
    )


def embase_mapper_bean_to_api(bean: EmbaseBean) -> Dict[str, Any]:
    """Convertit un EmbaseBean en donnees API."""
    result = {
        "uuid": bean.uuid,
        "slug": slugify_text(bean.identifier),
        "identifier": bean.identifier,
        "type": bean.type,
        "nombre_voies": bean.nombre_voies,
    }
    result.update(_build_v1_fields_for_api(bean))
    result.update(_build_meca_fields_for_api(bean))
    result.update(_build_v2_fields_for_api(bean))
    result.update(
        {
            # Historique FSECs
            "fsec_history": bean.fsec_history,
            # Computed
            "last_etalonnage_date": format_date_for_api(bean.last_etalonnage_date),
            "last_etalonnage_date_v1": format_date_for_api(
                bean.last_etalonnage_date_v1
            ),
            "last_etalonnage_date_v2": format_date_for_api(
                bean.last_etalonnage_date_v2
            ),
            # Metadata
            "created_at": format_date_for_api(bean.created_at),
            "updated_at": format_date_for_api(bean.updated_at),
        }
    )
    return result


def embase_mapper_beans_to_api(beans: List[EmbaseBean]) -> List[Dict[str, Any]]:
    """Convertit une liste d'EmbaseBeans en liste de donnees API."""
    return [embase_mapper_bean_to_api(bean) for bean in beans]


def fsec_history_entry_bean_to_api(bean: FsecHistoryEntryBean) -> Dict[str, Any]:
    """Convertit un FsecHistoryEntryBean en donnees API."""
    return asdict(bean)
