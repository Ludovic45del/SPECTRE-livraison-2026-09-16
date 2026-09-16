"""Tests unitaires du service delivery_workflow (phases 1 & 2).

Les tests « purs » (pick/snapshot/phase 1 sans accepteur) utilisent des fakes et
ne touchent pas la base. Les chemins de SIGNATURE (obligatoire + figeage) lisent
le profil utilisateur réel (comme `_resolve_acceptor_user_id`) : ils sont donc
marqués `@django_db` et isolent MEDIA_ROOT.
"""

import io
import shutil
import tempfile
from datetime import date, datetime
from typing import Dict, List, Optional

import pytest
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import override_settings
from PIL import Image

from app.domain.exceptions import ValidationException
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.fsec.services.delivery_workflow_service import (
    _pick_latest_sealing,
    get_delivery_snapshot,
    update_delivery_info,
    update_delivery_validation,
)
from app.domain.steps.models.sealing_step_bean import SealingStepBean
from app.repository.user.models.user_profile_entity import UserProfileEntity


class FakeFsecRepo:
    def __init__(self, fsecs: Dict[str, FsecBean]):
        self.fsecs = fsecs
        # Signatures figées par version_uuid (ce que la couche repo persisterait).
        self.acceptor_signatures: Dict[str, object] = {}
        self.validator_signatures: Dict[str, object] = {}

    def get_by_version_uuid(self, version_uuid: str) -> Optional[FsecBean]:
        return self.fsecs.get(version_uuid)

    def update(self, bean: FsecBean) -> FsecBean:
        self.fsecs[bean.version_uuid] = bean
        return bean

    def set_delivery_acceptor_signature(self, version_uuid: str, image_file) -> None:
        self.acceptor_signatures[version_uuid] = image_file

    def set_delivery_validator_signature(self, version_uuid: str, image_file) -> None:
        self.validator_signatures[version_uuid] = image_file


class FakeSealingRepo:
    def __init__(self, by_fsec: Dict[str, List[SealingStepBean]]):
        self.by_fsec = by_fsec

    def get_by_fsec_version_id(self, fsec_version_id: str) -> List[SealingStepBean]:
        return list(self.by_fsec.get(fsec_version_id, []))

    def update(self, bean: SealingStepBean) -> SealingStepBean:
        for k, steps in self.by_fsec.items():
            for i, s in enumerate(steps):
                if s.uuid == bean.uuid:
                    self.by_fsec[k][i] = bean
                    return bean
        return bean


def _fsec(version_uuid="v1", **kwargs) -> FsecBean:
    return FsecBean(version_uuid=version_uuid, fsec_uuid="f1", name="cible-1", **kwargs)


# --------------------------------------------------------------------------- #
#  Fixtures DB (signatures)
# --------------------------------------------------------------------------- #
@pytest.fixture
def media_root(monkeypatch):
    tmp = tempfile.mkdtemp(prefix="spectre-delivery-sig-test-")
    monkeypatch.setattr("django.conf.settings.MEDIA_ROOT", tmp)
    yield tmp
    shutil.rmtree(tmp, ignore_errors=True)


def _png_bytes(color=(0, 0, 0, 255)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGBA", (120, 60), color).save(buf, format="PNG")
    return buf.getvalue()


def _make_profile(username: str, signature: bool = True) -> UserProfileEntity:
    user = User.objects.create_user(username=username, password="Pwd12345!")
    profile = UserProfileEntity.objects.create(
        user=user, roles=["iec"], force_password_change=False
    )
    if signature:
        profile.signature.save("sig.png", ContentFile(_png_bytes()), save=True)
    return profile


# --------------------------------------------------------------------------- #
#  Tests purs (pas de DB)
# --------------------------------------------------------------------------- #
def test_pick_latest_sealing_prefers_most_recent_date():
    a = SealingStepBean(
        uuid="a", metrology_step_id="m1", date=date(2026, 1, 1), interface_io="A"
    )
    b = SealingStepBean(
        uuid="b", metrology_step_id="m2", date=date(2026, 4, 1), interface_io="B"
    )
    c = SealingStepBean(
        uuid="c", metrology_step_id="m3", date=date(2026, 2, 1), interface_io="C"
    )
    assert _pick_latest_sealing([a, b, c]).uuid == "b"


def test_pick_latest_sealing_none_returns_none():
    assert _pick_latest_sealing([]) is None


def test_get_delivery_snapshot_with_sealing():
    fsec = _fsec(delivery_date=date(2026, 4, 24))
    step = SealingStepBean(
        uuid="s1", metrology_step_id="m1", date=date(2026, 4, 1), interface_io="785"
    )
    fsec_repo = FakeFsecRepo({"v1": fsec})
    sealing_repo = FakeSealingRepo({"v1": [step]})

    snap = get_delivery_snapshot(fsec_repo, sealing_repo, "v1")
    assert snap.fsec.delivery_date == date(2026, 4, 24)
    assert snap.num_interface_io == "785"
    assert snap.has_sealing_step is True


def test_get_delivery_snapshot_without_sealing():
    fsec = _fsec()
    fsec_repo = FakeFsecRepo({"v1": fsec})
    sealing_repo = FakeSealingRepo({})

    snap = get_delivery_snapshot(fsec_repo, sealing_repo, "v1")
    assert snap.num_interface_io is None
    assert snap.has_sealing_step is False


def test_update_delivery_info_writes_date_and_interface_io():
    """Phase 1 sans accepteur : pas de signature requise, chemin pur."""
    fsec = _fsec()
    step = SealingStepBean(uuid="s1", metrology_step_id="m1", interface_io=None)
    fsec_repo = FakeFsecRepo({"v1": fsec})
    sealing_repo = FakeSealingRepo({"v1": [step]})

    snap = update_delivery_info(
        fsec_repo,
        sealing_repo,
        "v1",
        delivery_date=date(2026, 5, 14),
        num_interface_io="785",
    )

    assert fsec_repo.fsecs["v1"].delivery_date == date(2026, 5, 14)
    assert sealing_repo.by_fsec["v1"][0].interface_io == "785"
    assert snap.num_interface_io == "785"
    # Sans accepteur : la signature figée est effacée (None), pas de VISA.
    assert fsec_repo.acceptor_signatures.get("v1") is None


def test_update_delivery_info_without_sealing_step_ignores_interface_io():
    fsec = _fsec()
    fsec_repo = FakeFsecRepo({"v1": fsec})
    sealing_repo = FakeSealingRepo({})

    snap = update_delivery_info(
        fsec_repo,
        sealing_repo,
        "v1",
        delivery_date=date(2026, 5, 14),
        num_interface_io="785",
    )
    assert fsec_repo.fsecs["v1"].delivery_date == date(2026, 5, 14)
    assert snap.num_interface_io is None
    assert snap.has_sealing_step is False


def test_update_delivery_info_empty_interface_io_resets():
    fsec = _fsec()
    step = SealingStepBean(uuid="s1", metrology_step_id="m1", interface_io="OLD")
    fsec_repo = FakeFsecRepo({"v1": fsec})
    sealing_repo = FakeSealingRepo({"v1": [step]})

    update_delivery_info(
        fsec_repo, sealing_repo, "v1", delivery_date=None, num_interface_io=""
    )
    assert sealing_repo.by_fsec["v1"][0].interface_io is None


# --------------------------------------------------------------------------- #
#  Tests signatures (DB)
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_update_delivery_validation_stamps_signer_and_timestamp(media_root):
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("tci_alice")
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        before = datetime.utcnow()
        update_delivery_validation(
            fsec_repo,
            sealing_repo,
            "v1",
            validator_user_id=profile.user_id,
            validator_username="tci_alice",
            validation="OK",
            remarques="RAS",
        )
        after = datetime.utcnow()

    saved = fsec_repo.fsecs["v1"]
    assert saved.delivery_validation == "OK"
    assert saved.delivery_remarques == "RAS"
    assert saved.delivery_validated_by_id == profile.user_id
    assert saved.delivery_validated_by_username == "tci_alice"
    assert saved.delivery_validated_at is not None
    naive = saved.delivery_validated_at.replace(tzinfo=None)
    assert before <= naive <= after
    # La signature du validateur a été figée (colonne RECEPTION 2 / VISA).
    assert "v1" in fsec_repo.validator_signatures


@pytest.mark.django_db
def test_update_delivery_validation_empty_string_normalized_to_none(media_root):
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("tci_bob")
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        update_delivery_validation(
            fsec_repo,
            sealing_repo,
            "v1",
            validator_user_id=profile.user_id,
            validator_username="x",
            validation="",
            remarques="",
        )
    saved = fsec_repo.fsecs["v1"]
    assert saved.delivery_validation is None
    assert saved.delivery_remarques is None


@pytest.mark.django_db
def test_update_delivery_validation_requires_signature(media_root):
    """Phase 2 sans signature de profil → 400, aucune écriture (atomicité)."""
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("tci_nosig", signature=False)
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        with pytest.raises(ValidationException):
            update_delivery_validation(
                fsec_repo,
                sealing_repo,
                "v1",
                validator_user_id=profile.user_id,
                validator_username="tci_nosig",
                validation="OK",
                remarques="RAS",
            )

    # La validation n'a pas été persistée (vérif avant écriture).
    assert fsec_repo.fsecs["v1"].delivery_validation is None
    assert fsec_repo.validator_signatures == {}


@pytest.mark.django_db
def test_update_delivery_validation_signature_is_a_frozen_copy(media_root):
    """La signature figée est une COPIE : changer le profil ensuite ne l'altère pas."""
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("tci_copy")
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        update_delivery_validation(
            fsec_repo,
            sealing_repo,
            "v1",
            validator_user_id=profile.user_id,
            validator_username="tci_copy",
            validation="OK",
            remarques="",
        )
        frozen = fsec_repo.validator_signatures["v1"]
        frozen_bytes = frozen.read()

        # L'utilisateur change sa signature de profil après coup.
        profile.signature.save(
            "sig2.png", ContentFile(_png_bytes((255, 0, 0, 255))), save=True
        )

    # La copie figée est intacte (octets inchangés).
    assert frozen_bytes == _png_bytes()


@pytest.mark.django_db
def test_update_delivery_info_snapshots_acceptor_signature(media_root):
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("accepteur_ok")
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        update_delivery_info(
            fsec_repo,
            sealing_repo,
            "v1",
            delivery_date=date(2026, 5, 14),
            num_interface_io=None,
            delivery_acceptor_user_uuid=str(profile.uuid),
        )

    assert fsec_repo.fsecs["v1"].delivery_date == date(2026, 5, 14)
    assert "v1" in fsec_repo.acceptor_signatures


@pytest.mark.django_db
def test_update_delivery_info_requires_acceptor_signature(media_root):
    """Phase 1 avec accepteur sans signature → 400, date non persistée."""
    with override_settings(MEDIA_ROOT=media_root):
        profile = _make_profile("accepteur_nosig", signature=False)
        fsec_repo = FakeFsecRepo({"v1": _fsec()})
        sealing_repo = FakeSealingRepo({})

        with pytest.raises(ValidationException):
            update_delivery_info(
                fsec_repo,
                sealing_repo,
                "v1",
                delivery_date=date(2026, 5, 14),
                num_interface_io=None,
                delivery_acceptor_user_uuid=str(profile.uuid),
            )

    # Vérif avant écriture : la date n'a pas été persistée.
    assert fsec_repo.fsecs["v1"].delivery_date is None
    assert fsec_repo.acceptor_signatures == {}
