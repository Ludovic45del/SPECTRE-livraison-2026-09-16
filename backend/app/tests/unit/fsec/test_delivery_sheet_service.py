"""Tests unitaires du service de génération de fiche de livraison."""

import base64
import io
import shutil
import tempfile
from datetime import date

import pytest
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.test import override_settings
from PIL import Image

from app.domain.campaign.models.campaign_bean import CampaignBean
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.services.delivery_sheet_service import (
    _format_campaign_code,
    _format_date,
    _media_image_data_uri,
    build_campaign_recap_sheet,
    build_single_target_sheet,
)


@pytest.fixture
def campaign():
    return CampaignBean(
        uuid="c1", installation_id=1, name="FCIAI", year=2026, semester="S1"
    )


@pytest.fixture
def fsec():
    return FsecBean(
        version_uuid="f1",
        campaign_id="c1",
        name="2026-LMJ_FCIAI_1",
        delivery_date=date(2026, 4, 24),
    )


def test_format_campaign_code(campaign):
    assert _format_campaign_code(campaign, "LMJ") == "2026-LMJ_FCIAI"


def test_format_campaign_code_unknown_installation(campaign):
    assert _format_campaign_code(campaign, None) == "2026-UNK_FCIAI"


def test_format_date_none():
    assert _format_date(None) == ""


def test_format_date_value():
    assert _format_date(date(2026, 4, 24)) == "24/04/2026"


def test_build_single_target_sheet_returns_pdf_bytes(campaign, fsec):
    pdf = build_single_target_sheet(
        fsec=fsec,
        campaign=campaign,
        installation_label="LMJ",
        num_interface_io="785",
        delivery_date=date(2026, 4, 24),
        validation_integrite="OK",
        remarques="GO3 chargement à la main",
    )
    assert isinstance(pdf, (bytes, bytearray))
    assert pdf[:4] == b"%PDF"


def test_build_single_target_sheet_falls_back_to_fsec_delivery_date(campaign, fsec):
    """Si delivery_date n'est pas fourni dans le payload, on prend celui du FSEC."""
    pdf = build_single_target_sheet(
        fsec=fsec,
        campaign=campaign,
        installation_label="LMJ",
        num_interface_io="",
        delivery_date=None,
        validation_integrite="",
        remarques="",
    )
    assert pdf[:4] == b"%PDF"


def test_build_campaign_recap_sheet_with_multiple_targets(campaign):
    fsecs = [
        FsecBean(
            version_uuid=f"f{i}",
            campaign_id="c1",
            name=f"2026-LMJ_FCIAI_{i}",
            delivery_date=date(2026, 4, 24) if i == 1 else None,
        )
        for i in range(1, 4)
    ]
    overrides = {
        "f1": {
            "num_interface_io": "785",
            "validation_integrite": "OK",
            "remarques": "GO3",
            "delivery_date": None,
        },
        "f2": {"num_interface_io": "784"},
    }
    pdf = build_campaign_recap_sheet(
        campaign=campaign,
        installation_label="LMJ",
        fsecs=fsecs,
        overrides=overrides,
    )
    assert pdf[:4] == b"%PDF"


def test_build_campaign_recap_sheet_empty_targets(campaign):
    pdf = build_campaign_recap_sheet(
        campaign=campaign,
        installation_label="LMJ",
        fsecs=[],
        overrides={},
    )
    assert pdf[:4] == b"%PDF"


# --------------------------------------------------------------------------- #
#  Signatures (embarquage base64 dans le PDF)
# --------------------------------------------------------------------------- #
@pytest.fixture
def media_root(monkeypatch):
    tmp = tempfile.mkdtemp(prefix="spectre-sheet-sig-test-")
    monkeypatch.setattr("django.conf.settings.MEDIA_ROOT", tmp)
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (100, 50), (0, 0, 0, 255)).save(buf, format="PNG")
    return buf.getvalue()


def _store_signature(name="fsec/signatures/x.png") -> str:
    """Écrit un PNG dans le storage et retourne l'URL relative (comme le bean)."""
    saved = default_storage.save(name, ContentFile(_png_bytes()))
    return f"{settings.MEDIA_URL}{saved}"


def test_media_image_data_uri_none_returns_none():
    assert _media_image_data_uri(None) is None
    assert _media_image_data_uri("") is None


def test_media_image_data_uri_missing_file_returns_none():
    # URL plausible mais fichier absent → None (le template gère l'absence).
    assert (
        _media_image_data_uri(f"{settings.MEDIA_URL}fsec/signatures/ghost.png") is None
    )


@pytest.mark.django_db
def test_media_image_data_uri_embeds_stored_file(media_root):
    with override_settings(MEDIA_ROOT=media_root):
        url = _store_signature()
        data_uri = _media_image_data_uri(url)

    assert data_uri is not None
    assert data_uri.startswith("data:image/png;base64,")
    decoded = base64.b64decode(data_uri.split(",", 1)[1])
    assert decoded == _png_bytes()


@pytest.mark.django_db
def test_build_single_target_sheet_embeds_signatures(campaign, media_root):
    with override_settings(MEDIA_ROOT=media_root):
        fsec = FsecBean(
            version_uuid="f1",
            campaign_id="c1",
            name="2026-LMJ_FCIAI_1",
            delivery_date=date(2026, 4, 24),
            delivery_acceptor_username="alice",
            delivery_acceptor_signature=_store_signature("fsec/signatures/a.png"),
            delivery_receiver_name="bob",
            delivery_validator_signature=_store_signature("fsec/signatures/v.png"),
        )
        pdf = build_single_target_sheet(
            fsec=fsec,
            campaign=campaign,
            installation_label="LMJ",
            num_interface_io="785",
            delivery_date=date(2026, 4, 24),
            validation_integrite="OK",
            remarques="",
        )
    assert pdf[:4] == b"%PDF"
