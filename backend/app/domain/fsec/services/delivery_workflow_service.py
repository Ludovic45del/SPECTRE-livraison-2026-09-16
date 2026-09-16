"""Service workflow fiche de livraison FSEC (2 phases).

- Phase 1 (équipe livraison) : N° Interface I0 (-> SealingStep.interface_io)
  et date de livraison (-> FSEC.delivery_date).
- Phase 2 (TCI) : validation OK/KO + remarques + signature implicite (user
  authentifié + horodatage serveur).

L'I0 vit dans SealingStep (cf. CDC §livraison). Si le FSEC n'a pas encore
d'étape de scellement, la phase 1 enregistre la date mais laisse l'I0
intact côté serveur — le frontend bloque la saisie dans ce cas.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import List, Optional

from app.domain.exceptions import ValidationException
from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.services.fsec_service import get_fsec_by_version_uuid
from app.domain.steps.interface.steps_repository import ISealingStepRepository
from app.domain.steps.models.sealing_step_bean import SealingStepBean

logger = logging.getLogger(__name__)


@dataclass
class DeliveryWorkflowSnapshot:
    """Vue agrégée du workflow livraison d'un FSEC (lecture pour PDF/modal)."""

    fsec: FsecBean
    num_interface_io: Optional[str]
    has_sealing_step: bool


def _pick_latest_sealing(steps: List[SealingStepBean]) -> Optional[SealingStepBean]:
    """Retient le sealing step le plus récent (par `date` puis `uuid`).

    Permet de désigner un I0 unique quand un FSEC porte plusieurs métrologies.
    """
    if not steps:
        return None
    return sorted(
        steps,
        key=lambda s: (s.date or date.min, s.uuid),
        reverse=True,
    )[0]


def get_delivery_snapshot(
    fsec_repository: IFsecRepository,
    sealing_repository: ISealingStepRepository,
    version_uuid: str,
) -> DeliveryWorkflowSnapshot:
    """Charge le FSEC + I0 du sealing step le plus récent (lecture)."""
    fsec = get_fsec_by_version_uuid(fsec_repository, version_uuid)
    steps = sealing_repository.get_by_fsec_version_id(version_uuid)
    latest = _pick_latest_sealing(steps)
    return DeliveryWorkflowSnapshot(
        fsec=fsec,
        num_interface_io=latest.interface_io if latest else None,
        has_sealing_step=latest is not None,
    )


def _require_signature(profile, error_message: str):
    """Retourne le fichier signature du profil, ou lève si absent.

    `profile` est une UserProfileEntity (ou None). Sert à imposer la signature
    avant d'apposer un VISA sur la fiche de livraison.
    """
    if profile is None or not profile.signature:
        raise ValidationException("signature", error_message)
    return profile.signature


def _copy_signature_file(signature_file, name: str):
    """Copie le contenu d'un ImageFieldFile en un ContentFile autonome.

    On copie les octets (et non une référence) pour figer la signature sur le
    FSEC : la fiche reste intègre même si l'utilisateur change la sienne ensuite.

    Import local : `ContentFile` n'est utile que sur ce chemin.
    """
    from django.core.files.base import ContentFile

    signature_file.open("rb")
    try:
        data = signature_file.read()
    finally:
        signature_file.close()
    return ContentFile(data, name=name)


def _snapshot_acceptor_signature(
    fsec_repository: IFsecRepository, version_uuid: str, acceptor_user_uuid: str
) -> None:
    """Fige la signature de l'accepteur (phase 1) sur le FSEC.

    Lève une ValidationException si l'accepteur n'a pas de signature de profil.
    Import local : éviter une dépendance circulaire au module load.
    """
    from app.repository.user.models.user_profile_entity import UserProfileEntity

    profile = UserProfileEntity.objects.filter(uuid=acceptor_user_uuid).first()
    signature = _require_signature(
        profile,
        "L'accepteur sélectionné n'a pas de signature enregistrée dans son "
        "profil : il ne peut pas signer la fiche de livraison.",
    )
    copied = _copy_signature_file(signature, name=f"{version_uuid}-acceptor.png")
    fsec_repository.set_delivery_acceptor_signature(version_uuid, copied)


def _resolve_acceptor_user_id(acceptor_user_uuid: Optional[str]) -> Optional[int]:
    """Convertit l'uuid UserProfile (envoyé par le UserSelect frontend) en id
    auth.User pour stocker la FK locale. Retourne None si uuid absent.

    Import local : éviter une dépendance circulaire au moment du module load.
    """
    if not acceptor_user_uuid:
        return None
    from app.repository.user.models.user_profile_entity import UserProfileEntity

    profile_id = (
        UserProfileEntity.objects.filter(uuid=acceptor_user_uuid)
        .values_list("user_id", flat=True)
        .first()
    )
    if profile_id is None:
        raise ValidationException(
            "delivery_acceptor_user_uuid",
            f"Utilisateur introuvable : {acceptor_user_uuid}",
        )
    return profile_id


def update_delivery_info(
    fsec_repository: IFsecRepository,
    sealing_repository: ISealingStepRepository,
    version_uuid: str,
    delivery_date: Optional[date],
    num_interface_io: Optional[str],
    delivery_acceptor_user_uuid: Optional[str] = None,
) -> DeliveryWorkflowSnapshot:
    """Phase 1 : enregistre `delivery_date` (FSEC), `interface_io` (sealing)
    et le nom de l'accepteur (FK user résolu depuis l'uuid UserProfile).

    Si `num_interface_io` est fourni mais qu'aucun sealing step n'existe, le
    champ est ignoré silencieusement (la valeur sera ressaisie dans le step
    Scellement) — la phase 1 reste valide pour ne pas bloquer le workflow.
    """
    fsec = get_fsec_by_version_uuid(fsec_repository, version_uuid)
    # Vérifie la signature de l'accepteur AVANT toute écriture : si elle manque,
    # on refuse la phase 1 sans persister de demi-état (date enregistrée mais
    # accepteur sans VISA).
    if delivery_acceptor_user_uuid:
        _snapshot_acceptor_signature(
            fsec_repository, version_uuid, delivery_acceptor_user_uuid
        )

    # Mise à jour de la date de livraison FSEC.
    fsec.delivery_date = delivery_date
    fsec.delivery_acceptor_user_id = _resolve_acceptor_user_id(
        delivery_acceptor_user_uuid
    )
    fsec_repository.update(fsec)

    # Accepteur retiré (UserSelect vidé) → on efface aussi sa signature figée
    # pour que le VISA disparaisse de la fiche (cohérence FK / signature).
    if not delivery_acceptor_user_uuid:
        fsec_repository.set_delivery_acceptor_signature(version_uuid, None)

    # Sync vers le sealing step le plus récent (s'il existe).
    if num_interface_io is not None:
        steps = sealing_repository.get_by_fsec_version_id(version_uuid)
        latest = _pick_latest_sealing(steps)
        if latest is not None:
            latest.interface_io = num_interface_io or None
            sealing_repository.update(latest)
        else:
            logger.info(
                "delivery-info: FSEC %s sans sealing step, I0 ignoré (=%r)",
                version_uuid,
                num_interface_io,
            )

    return get_delivery_snapshot(fsec_repository, sealing_repository, version_uuid)


def update_delivery_validation(
    fsec_repository: IFsecRepository,
    sealing_repository: ISealingStepRepository,
    version_uuid: str,
    validator_user_id: int,
    validator_username: str,
    validation: str,
    remarques: Optional[str],
    receiver_name: Optional[str] = None,
    receiver_date: Optional[date] = None,
) -> DeliveryWorkflowSnapshot:
    """Phase 2 : pose OK/KO + remarques + signataire/horodatage + réceptionnaire.

    `receiver_name` est un texte libre (le réceptionnaire n'a pas forcément
    de compte SPECTRE) ; `receiver_date` est la date manuscrite sur la fiche.

    Le validateur signe par son action : sa signature de profil est obligatoire
    et figée (copiée) sur le FSEC. La vérification précède toute écriture pour
    ne pas laisser de demi-état (validé mais sans VISA).
    """
    from app.repository.user.models.user_profile_entity import UserProfileEntity

    profile = UserProfileEntity.objects.filter(user_id=validator_user_id).first()
    validator_signature = _require_signature(
        profile,
        "Vous devez enregistrer votre signature dans votre profil avant de "
        "valider et signer la fiche de livraison.",
    )

    fsec = get_fsec_by_version_uuid(fsec_repository, version_uuid)
    fsec.delivery_validation = validation or None
    fsec.delivery_remarques = remarques or None
    fsec.delivery_validated_by_id = validator_user_id
    fsec.delivery_validated_by_username = validator_username
    fsec.delivery_validated_at = datetime.now(timezone.utc)
    fsec.delivery_receiver_name = receiver_name or None
    fsec.delivery_receiver_date = receiver_date
    fsec_repository.update(fsec)

    # Fige la copie de la signature du validateur (colonne RECEPTION 2 / VISA).
    copied = _copy_signature_file(
        validator_signature, name=f"{version_uuid}-validator.png"
    )
    fsec_repository.set_delivery_validator_signature(version_uuid, copied)

    return get_delivery_snapshot(fsec_repository, sealing_repository, version_uuid)
