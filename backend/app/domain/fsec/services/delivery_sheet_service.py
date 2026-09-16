"""Service de génération de la fiche de livraison des édifices cibles LMJ.

Rend un template Django en HTML puis le convertit en PDF via WeasyPrint.
Deux modes :
- ``build_single_target_sheet`` : fiche pour une seule cible (1 ligne).
- ``build_campaign_recap_sheet`` : fiche récapitulative pour toutes les cibles
  d'une campagne (N lignes).
"""

from __future__ import annotations

import base64
import logging
import mimetypes
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable, List, Optional

from django.conf import settings
from django.template.loader import render_to_string

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.shared.naming import build_campaign_display_name

logger = logging.getLogger(__name__)

DELIVERY_SHEET_TEMPLATE = "fsec/delivery_sheet.html"


@dataclass
class TargetRow:
    """Une ligne du tableau IDENTIFICATION EDIFICES CIBLES."""

    name: str
    num_interface_io: str = ""
    delivery_date: str = ""
    validation_integrite: str = ""
    remarques: str = ""


@dataclass
class SignaturesBlock:
    """Bloc SIGNATAIRES EXPEDITION du PDF.

    - reception_1 : phase 1 (équipe livraison) → nom = accepteur dropdown,
      date = `delivery_date` du FSEC (réutilisée depuis le tableau du haut),
      visa = signature figée de l'accepteur.
    - reception_2 : phase 2 (TCI) → nom = réceptionnaire texte libre,
      date = `delivery_receiver_date` saisie manuellement, visa = signature
      figée du validateur authentifié.
    L'acceptor (1re colonne) n'a pas de signataire pré-rempli (case papier).
    Les `*_signature` sont des data URI base64 (embarqués) ou None.
    """

    reception_1_name: str = ""
    reception_1_date: str = ""
    reception_1_signature: Optional[str] = None
    reception_2_name: str = ""
    reception_2_date: str = ""
    reception_2_signature: Optional[str] = None


def _format_campaign_code(
    campaign: CampaignBean, installation_label: Optional[str]
) -> str:
    """Formate le code campagne `{year}-{installation}_{name}`."""
    return build_campaign_display_name(campaign.year, installation_label, campaign.name)


def _format_date(value: Optional[date]) -> str:
    if value is None:
        return ""
    return value.strftime("%d/%m/%Y")


def _logo_data_uri() -> Optional[str]:
    """Encode le logo CEA en data URI pour l'embarquer dans le PDF.

    Retourne None si l'asset est absent ; le template gère l'absence.
    """
    logo_path = Path(settings.BASE_DIR) / "app" / "static" / "fsec" / "cea_logo.png"
    if not logo_path.exists():
        logger.warning("CEA logo not found at %s", logo_path)
        return None
    mime, _ = mimetypes.guess_type(logo_path.name)
    mime = mime or "image/png"
    encoded = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _media_image_data_uri(relative_url: Optional[str]) -> Optional[str]:
    """Encode une image MEDIA (URL relative) en data URI pour le PDF.

    On embarque les octets en base64 plutôt que de laisser WeasyPrint télécharger
    l'URL : le rendu fonctionne hors-ligne et sans dépendre du serveur de médias
    (cohérent avec `_logo_data_uri`). Retourne None si l'URL est vide ou le
    fichier introuvable ; le template gère l'absence.
    """
    if not relative_url:
        return None

    from django.core.files.storage import default_storage

    media_url = settings.MEDIA_URL
    name = (
        relative_url[len(media_url) :]
        if relative_url.startswith(media_url)
        else relative_url.lstrip("/")
    )
    try:
        with default_storage.open(name, "rb") as fh:
            data = fh.read()
    except (FileNotFoundError, OSError):
        logger.warning("Signature introuvable pour le PDF : %s", name)
        return None

    mime = mimetypes.guess_type(name)[0] or "image/png"
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _render_pdf(context: dict) -> bytes:
    """Rend le template + génère le PDF via WeasyPrint.

    Import local + protégé : WeasyPrint (et ses dépendances système cairo /
    pango / gdk-pixbuf) est **optionnel**. Il n'est pas embarqué dans le
    déploiement air-gap SQLite par défaut. Si la fonctionnalité « fiche de
    livraison PDF » est utilisée sans WeasyPrint installé, on lève une erreur
    explicite et actionnable plutôt qu'un ImportError brut.
    """
    try:
        from weasyprint import HTML
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "La génération PDF des fiches de livraison nécessite WeasyPrint, "
            "non installé dans ce déploiement. Installez `weasyprint` et ses "
            "dépendances système (cairo, pango, gdk-pixbuf, libffi) pour "
            "activer cette fonctionnalité."
        ) from exc

    html = render_to_string(DELIVERY_SHEET_TEMPLATE, context)
    return HTML(string=html).write_pdf()


def build_single_target_sheet(
    *,
    fsec: FsecBean,
    campaign: CampaignBean,
    installation_label: Optional[str],
    num_interface_io: str,
    delivery_date: Optional[date],
    validation_integrite: str,
    remarques: str,
) -> bytes:
    """Génère le PDF de la fiche pour une seule cible."""
    effective_delivery_date = delivery_date or fsec.delivery_date
    target = TargetRow(
        name=fsec.display_name or fsec.name,
        num_interface_io=num_interface_io,
        delivery_date=_format_date(effective_delivery_date),
        validation_integrite=validation_integrite,
        remarques=remarques,
    )
    # Tableau "SIGNATAIRES EXPEDITION" : on remplit les 2 colonnes RECEPTION
    # à partir des phases 1 et 2 (cf. SignaturesBlock).
    signatures = SignaturesBlock(
        reception_1_name=fsec.delivery_acceptor_username or "",
        reception_1_date=_format_date(effective_delivery_date),
        reception_1_signature=_media_image_data_uri(fsec.delivery_acceptor_signature),
        reception_2_name=fsec.delivery_receiver_name or "",
        reception_2_date=_format_date(fsec.delivery_receiver_date),
        reception_2_signature=_media_image_data_uri(fsec.delivery_validator_signature),
    )
    context = {
        "campaign_code": _format_campaign_code(campaign, installation_label),
        "targets": [target],
        "signatures": signatures,
        "logo_data_uri": _logo_data_uri(),
    }
    return _render_pdf(context)


def build_campaign_recap_sheet(
    *,
    campaign: CampaignBean,
    installation_label: Optional[str],
    fsecs: Iterable[FsecBean],
    overrides: dict[str, dict],
) -> bytes:
    """Génère le PDF récapitulatif de toutes les cibles d'une campagne.

    ``overrides`` map version_uuid -> {num_interface_io, validation_integrite,
    remarques, delivery_date} pour les valeurs saisies dans la modal frontend.
    """
    targets: List[TargetRow] = []
    for fsec in fsecs:
        override = overrides.get(fsec.version_uuid, {})
        targets.append(
            TargetRow(
                name=fsec.display_name or fsec.name,
                num_interface_io=override.get("num_interface_io", "") or "",
                delivery_date=_format_date(
                    override.get("delivery_date") or fsec.delivery_date
                ),
                validation_integrite=override.get("validation_integrite", "") or "",
                remarques=override.get("remarques", "") or "",
            )
        )
    context = {
        "campaign_code": _format_campaign_code(campaign, installation_label),
        "targets": targets,
        "logo_data_uri": _logo_data_uri(),
    }
    return _render_pdf(context)
