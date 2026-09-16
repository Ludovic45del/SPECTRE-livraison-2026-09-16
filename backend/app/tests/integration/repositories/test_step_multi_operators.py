"""Tests d'intégration : assembleurs / métrologues multiples par étape.

Vérifie le round-trip M2M (liste persistée + relue), la synchronisation de la
FK simple sur le premier membre et la validation des uuids inconnus.
Couvre aussi les liens fichiers de la métrologie (R15) et la vérification du
scellement OK/NOK (R23-B).
"""

import json
import uuid

import pytest
from django.contrib.auth.models import User

from app.domain.exceptions import ValidationException
from app.domain.steps.models.assembly_step_bean import AssemblyStepBean
from app.domain.steps.models.metrology_step_bean import MetrologyStepBean
from app.domain.steps.models.sealing_step_bean import SealingStepBean
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.assembly_step_entity import AssemblyStepEntity
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity
from app.repository.steps.models.sealing_step_entity import SealingStepEntity
from app.repository.steps.repositories.assembly_step_repository import (
    AssemblyStepRepository,
)
from app.repository.steps.repositories.metrology_step_repository import (
    MetrologyStepRepository,
)
from app.repository.steps.repositories.sealing_step_repository import (
    SealingStepRepository,
)
from app.repository.user.models.user_profile_entity import UserProfileEntity


def _make_profile(role: str, username: str) -> UserProfileEntity:
    user = User.objects.create_user(username=username, password="Pwd12345!")
    return UserProfileEntity.objects.create(
        user=user, roles=[role], force_password_change=False
    )


@pytest.fixture
def operators(db):
    return [
        _make_profile("assembleur", f"asm_{uuid.uuid4().hex[:6]}"),
        _make_profile("assembleur", f"asm_{uuid.uuid4().hex[:6]}"),
    ]


@pytest.fixture
def metrologists(db):
    return [
        _make_profile("metrologue", f"met_{uuid.uuid4().hex[:6]}"),
        _make_profile("metrologue", f"met_{uuid.uuid4().hex[:6]}"),
    ]


@pytest.fixture
def campaign(db):
    return CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"FCIAI Test {uuid.uuid4().hex[:6]}",
        year=2026,
        semester="S1",
    )


@pytest.fixture
def fsec(db, campaign):
    return FsecEntity.objects.create(
        version_uuid=str(uuid.uuid4()),
        fsec_uuid=str(uuid.uuid4()),
        name=f"2026-LMJ_FCIAI_{uuid.uuid4().hex[:4]}",
        campaign_id_id=campaign.uuid,
        status_id_id=0,
        category_id_id=0,
        is_active=True,
    )


@pytest.mark.integration
@pytest.mark.django_db
class TestAssemblyMultiOperators:
    def test_create_persists_list_and_syncs_fk(self, fsec, operators):
        repo = AssemblyStepRepository()
        u1, u2 = str(operators[0].uuid), str(operators[1].uuid)

        bean = repo.create(
            AssemblyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                operator_user_uuids=[u1, u2],
            )
        )

        # Liste relue canonicalisée (tri uuid, ordre déterministe) ; singulier = premier.
        assert bean.operator_user_uuids == sorted([u1, u2])
        assert bean.operator_user_uuid == sorted([u1, u2])[0]

        entity = AssemblyStepEntity.objects.get(uuid=bean.uuid)
        assert entity.operator_users.count() == 2
        # FK simple = un opérateur du set (colonne legacy de rétro-compat).
        assert str(entity.operator_user_id) in {u1, u2}

    def test_read_order_is_deterministic(self, fsec, operators):
        """Relire l'étape (même en saisissant à l'envers) donne un ordre stable."""
        repo = AssemblyStepRepository()
        u1, u2 = str(operators[0].uuid), str(operators[1].uuid)

        created = repo.create(
            AssemblyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                operator_user_uuids=[u2, u1],  # saisie inversée
            )
        )
        reread = repo.get_by_uuid(created.uuid)

        assert created.operator_user_uuids == sorted([u1, u2])
        assert reread.operator_user_uuids == created.operator_user_uuids
        assert reread.operator_user_uuid == reread.operator_user_uuids[0]

    def test_read_falls_back_to_fk_when_m2m_empty(self, fsec, operators):
        """M2M vidé (rollback backfill / legacy) → la lecture retombe sur la FK."""
        repo = AssemblyStepRepository()
        u1 = str(operators[0].uuid)
        created = repo.create(
            AssemblyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                operator_user_uuids=[u1],
            )
        )

        entity = AssemblyStepEntity.objects.get(uuid=created.uuid)
        entity.operator_users.clear()  # simule le reverse de 0076

        reread = repo.get_by_uuid(created.uuid)
        assert reread.operator_user_uuids == [u1]
        assert reread.operator_user_uuid == u1

    def test_update_replaces_list_and_resyncs_fk(self, fsec, operators):
        repo = AssemblyStepRepository()
        u1, u2 = str(operators[0].uuid), str(operators[1].uuid)
        created = repo.create(
            AssemblyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                operator_user_uuids=[u1, u2],
            )
        )

        updated = repo.update(
            AssemblyStepBean(
                uuid=created.uuid,
                fsec_version_id=str(fsec.version_uuid),
                operator_user_uuids=[u2],
            )
        )

        assert updated.operator_user_uuids == [u2]
        assert updated.operator_user_uuid == u2
        entity = AssemblyStepEntity.objects.get(uuid=created.uuid)
        assert str(entity.operator_user_id) == u2

    def test_unknown_user_raises(self, fsec):
        repo = AssemblyStepRepository()
        with pytest.raises(ValidationException):
            repo.create(
                AssemblyStepBean(
                    fsec_version_id=str(fsec.version_uuid),
                    operator_user_uuids=[str(uuid.uuid4())],
                )
            )


@pytest.mark.integration
@pytest.mark.django_db
class TestMetrologyMultiOperators:
    def test_create_persists_list_and_syncs_fk(self, fsec, metrologists):
        repo = MetrologyStepRepository()
        u1, u2 = str(metrologists[0].uuid), str(metrologists[1].uuid)

        bean = repo.create(
            MetrologyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                metrologist_user_uuids=[u1, u2],
            )
        )

        assert bean.metrologist_user_uuids == sorted([u1, u2])
        assert bean.metrologist_user_uuid == sorted([u1, u2])[0]

        entity = MetrologyStepEntity.objects.get(uuid=bean.uuid)
        assert entity.metrologist_users.count() == 2
        assert str(entity.metrologist_user_id) in {u1, u2}


@pytest.mark.integration
@pytest.mark.django_db
class TestMetrologyFileLinks:
    """Round-trip DB des liens fichiers de la métrologie (migration 0090 + colonne + mapper).

    Seul chemin exerçant réellement migration + entity + mapper bidirectionnel :
    create()/update() puis relecture depuis la base.
    """

    METRO_LINK = "\\\\serveur\\metro\\fsec-001.txt"  # chemin UNC
    VISRAD_LINK = "https://intranet/visrad/fsec-001"  # URL HTTP

    def test_create_persists_file_links(self, fsec):
        repo = MetrologyStepRepository()
        created = repo.create(
            MetrologyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                metro_file_link=self.METRO_LINK,
                visrad_link=self.VISRAD_LINK,
            )
        )

        # Relecture depuis la base (et non l'objet en mémoire).
        reread = repo.get_by_uuid(created.uuid)
        assert reread.metro_file_link == self.METRO_LINK
        assert reread.visrad_link == self.VISRAD_LINK

        # Colonnes réellement écrites en base.
        entity = MetrologyStepEntity.objects.get(uuid=created.uuid)
        assert entity.metro_file_link == self.METRO_LINK
        assert entity.visrad_link == self.VISRAD_LINK

    def test_update_replaces_file_links(self, fsec):
        repo = MetrologyStepRepository()
        created = repo.create(
            MetrologyStepBean(
                fsec_version_id=str(fsec.version_uuid),
                metro_file_link=self.METRO_LINK,
                visrad_link=self.VISRAD_LINK,
            )
        )

        updated = repo.update(
            MetrologyStepBean(
                uuid=created.uuid,
                fsec_version_id=created.fsec_version_id,
                metro_file_link=None,  # effacement
                visrad_link="https://intranet/visrad/updated",
            )
        )

        assert updated.metro_file_link is None
        assert updated.visrad_link == "https://intranet/visrad/updated"
        reread = repo.get_by_uuid(created.uuid)
        assert reread.metro_file_link is None
        assert reread.visrad_link == "https://intranet/visrad/updated"


@pytest.mark.integration
@pytest.mark.django_db
class TestSealingVerificationApi:
    """Vérification du scellement OK/NOK + remarque via l'API (R23-B).

    Exerce le chemin complet serializer → mapper → repository → base :
    PUT /api/v1/sealing-steps/{uuid}/ avec verification_status/verification_remark,
    et rejet 400 d'un statut hors choix ('KO').
    """

    def _create_sealing(self, fsec) -> SealingStepBean:
        """Crée une métrologie + son scellement (lié 1:1)."""
        metro = MetrologyStepRepository().create(
            MetrologyStepBean(fsec_version_id=str(fsec.version_uuid))
        )
        return SealingStepRepository().create(
            SealingStepBean(metrology_step_id=metro.uuid)
        )

    def test_put_persists_verification(self, api_client, fsec):
        created = self._create_sealing(fsec)

        response = api_client.put(
            f"/api/v1/sealing-steps/{created.uuid}/",
            data=json.dumps(
                {
                    "metrology_step_id": created.metrology_step_id,
                    "verification_status": "NOK",
                    "verification_remark": "Fuite détectée sur l'interface I0",
                }
            ),
            content_type="application/json",
        )

        assert response.status_code == 200
        body = response.json()
        assert body["verification_status"] == "NOK"
        assert body["verification_remark"] == "Fuite détectée sur l'interface I0"

        # Colonnes réellement écrites en base.
        entity = SealingStepEntity.objects.get(uuid=created.uuid)
        assert entity.verification_status == "NOK"
        assert entity.verification_remark == "Fuite détectée sur l'interface I0"

    def test_put_clears_verification_with_null(self, api_client, fsec):
        """Repasser à null = non vérifié (désélection du toggle)."""
        created = self._create_sealing(fsec)
        SealingStepRepository().update(
            SealingStepBean(
                uuid=created.uuid,
                metrology_step_id=created.metrology_step_id,
                verification_status="OK",
            )
        )

        response = api_client.put(
            f"/api/v1/sealing-steps/{created.uuid}/",
            data=json.dumps(
                {
                    "metrology_step_id": created.metrology_step_id,
                    "verification_status": None,
                    "verification_remark": None,
                }
            ),
            content_type="application/json",
        )

        assert response.status_code == 200
        entity = SealingStepEntity.objects.get(uuid=created.uuid)
        assert entity.verification_status is None
        assert entity.verification_remark is None

    def test_put_invalid_status_rejected(self, api_client, fsec):
        """Un statut hors choix ('KO') est rejeté par le serializer → 400."""
        created = self._create_sealing(fsec)

        response = api_client.put(
            f"/api/v1/sealing-steps/{created.uuid}/",
            data=json.dumps(
                {
                    "metrology_step_id": created.metrology_step_id,
                    "verification_status": "KO",
                }
            ),
            content_type="application/json",
        )

        assert response.status_code == 400
        # Aucune écriture silencieuse en base.
        entity = SealingStepEntity.objects.get(uuid=created.uuid)
        assert entity.verification_status is None
