"""Synchronisation des mesures embase depuis les étalonnages."""

import logging

from app.domain.embase.interface.embase_repository import IEmbaseRepository
from app.domain.embase.interface.etalonnage_repository import IEtalonnageRepository

logger = logging.getLogger(__name__)


def sync_embase_mesures(
    etalonnage_repository: IEtalonnageRepository,
    embase_repository: IEmbaseRepository,
    embase_uuid: str,
    voie: int,
) -> None:
    """Met à jour les mesures de l'embase depuis le dernier étalonnage de la voie."""
    embase = embase_repository.get_by_uuid(embase_uuid)
    if embase is None:
        return

    latest = etalonnage_repository.get_latest_by_embase_voie(embase_uuid, voie)

    if voie == 1:
        embase.offset_v1_mv = latest.offset_0_bar_mv if latest else None
        embase.mesurande_lie_v1_mv = latest.mesurande_0_bar_lie if latest else None
        embase.sensibilite_v1_mv = latest.signal_etendue_mv if latest else None
        embase.signal_meteociel_v1_mv = latest.signal_pa_meteociel if latest else None
    else:
        embase.offset_v2_mv = latest.offset_0_bar_mv if latest else None
        embase.mesurande_lie_v2_mv = latest.mesurande_0_bar_lie if latest else None
        embase.sensibilite_v2_mv = latest.signal_etendue_mv if latest else None
        embase.signal_meteociel_v2_mv = latest.signal_pa_meteociel if latest else None

    embase_repository.update(embase)
    logger.info("Mesures embase synchronisées: uuid=%s, voie=%s", embase_uuid, voie)
