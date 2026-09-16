"""Tests d'intégration API pour le Catalog Stock Controller.

Deux familles de tests :
- Controller isolé (service mocké) : vérifie que le controller construit la
  bonne réponse HTTP (status, payload).
- Bout-en-bout DB (client Django authentifié) : vérifie la persistance réelle
  des retours R01 (assigned_*), R03 (matiere/masse_mg), R09 (cycle de vie des
  statuts éléments) et R20 (multi-ajout de consommables).
"""

import json
import uuid as uuid_lib
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from django.test import RequestFactory

from app.api.stock.catalog_controller import StockCatalogController
from app.domain.exceptions import NotFoundException
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_COLLES,
    CATEGORY_PIECES_ELEMENTAIRES,
    CATEGORY_STRUCTURATION,
    ELEMENT_STATUS_DISPO,
    INSTALLATION_LMJ,
    ITEM_KIND_CONSUMABLE,
    ITEM_KIND_ELEMENT,
    STRUCTURATION_TYPE_STANDARD,
)


@pytest.fixture
def request_factory():
    return RequestFactory()


@pytest.fixture
def sample_element_api_bean():
    return StockCatalogItemBean(
        uuid="11111111-1111-4111-8111-111111111111",
        kind=ITEM_KIND_ELEMENT,
        category=CATEGORY_PIECES_ELEMENTAIRES,
        name="Cible D2",
        reference="CIB-D2-2026-042",
        installation=INSTALLATION_LMJ,
        status=ELEMENT_STATUS_DISPO,
        is_active=True,
    )


@pytest.fixture
def sample_consumable_api_bean():
    return StockCatalogItemBean(
        uuid="22222222-2222-4222-8222-222222222222",
        kind=ITEM_KIND_CONSUMABLE,
        category=CATEGORY_COLLES,
        name="Colle Araldite 2011",
        reference="COL-ARA-2011",
        unite="tubes",
        quantite=24,
        seuil_alerte=5,
        date_peremption=date(2027, 6, 30),
        is_active=True,
    )


def _make_get(factory, url):
    request = factory.get(url)
    request.query_params = {}
    return request


def _make_post(factory, url, data):
    request = factory.post(url, data=json.dumps(data), content_type="application/json")
    request.data = data
    return request


# ============================================================================
# LIST
# ============================================================================


class TestStockCatalogControllerList:
    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.list_items")
    @patch("app.api.stock.catalog_controller.count_items")
    def test_list_empty(self, mock_count, mock_list, request_factory):
        mock_list.return_value = []
        mock_count.return_value = 0
        controller = StockCatalogController()
        response = controller.list(_make_get(request_factory, "/api/v1/stock/catalog/"))
        assert response.status_code == 200
        assert json.loads(response.content) == []

    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.list_items")
    @patch("app.api.stock.catalog_controller.count_items")
    def test_list_returns_items(
        self,
        mock_count,
        mock_list,
        request_factory,
        sample_element_api_bean,
    ):
        mock_list.return_value = [sample_element_api_bean]
        mock_count.return_value = 1
        controller = StockCatalogController()
        response = controller.list(_make_get(request_factory, "/api/v1/stock/catalog/"))
        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data) == 1
        assert data[0]["uuid"] == sample_element_api_bean.uuid


# ============================================================================
# RETRIEVE
# ============================================================================


class TestStockCatalogControllerRetrieve:
    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.get_item")
    def test_retrieve_found(
        self, mock_get, request_factory, sample_consumable_api_bean
    ):
        mock_get.return_value = sample_consumable_api_bean
        controller = StockCatalogController()
        response = controller.retrieve(
            _make_get(
                request_factory,
                f"/api/v1/stock/catalog/{sample_consumable_api_bean.uuid}/",
            ),
            uuid=sample_consumable_api_bean.uuid,
        )
        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["uuid"] == sample_consumable_api_bean.uuid
        assert data["category"] == CATEGORY_COLLES

    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.get_item")
    def test_retrieve_not_found_raises(self, mock_get, request_factory):
        mock_get.side_effect = NotFoundException("StockCatalogItem", "missing")
        controller = StockCatalogController()
        with pytest.raises(NotFoundException):
            controller.retrieve(
                _make_get(request_factory, "/api/v1/stock/catalog/missing/"),
                uuid="missing",
            )


# ============================================================================
# CREATE
# ============================================================================


class TestStockCatalogControllerCreate:
    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.create_item")
    def test_create_consumable_success(
        self, mock_create, request_factory, sample_consumable_api_bean
    ):
        mock_create.return_value = sample_consumable_api_bean
        controller = StockCatalogController()
        request = _make_post(
            request_factory,
            "/api/v1/stock/catalog/",
            {
                "kind": ITEM_KIND_CONSUMABLE,
                "category": CATEGORY_COLLES,
                "name": "Colle Araldite 2011",
                "reference": "COL-ARA-2011",
                "unite": "tubes",
                "quantite": 24,
                "seuil_alerte": 5,
            },
        )
        response = controller.create(request)
        assert response.status_code == 201
        data = json.loads(response.content)
        assert data["category"] == CATEGORY_COLLES

    @pytest.mark.integration
    def test_create_invalid_kind_returns_400(self, request_factory):
        controller = StockCatalogController()
        request = _make_post(
            request_factory,
            "/api/v1/stock/catalog/",
            {
                "kind": "bogus",
                "category": CATEGORY_COLLES,
                "name": "X",
            },
        )
        from app.domain.exceptions import InvalidDataException

        with pytest.raises(InvalidDataException):
            controller.create(request)


# ============================================================================
# BATCH STRUCTURATION
# ============================================================================


class TestStockCatalogControllerBatchStructuration:
    @staticmethod
    def _structuration_bean(uuid, name):
        return StockCatalogItemBean(
            uuid=uuid,
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_STRUCTURATION,
            structuration_type=STRUCTURATION_TYPE_STANDARD,
            name=name,
            installation=INSTALLATION_LMJ,
            status=ELEMENT_STATUS_DISPO,
            is_active=True,
        )

    @pytest.mark.integration
    def test_next_number_endpoint(self, request_factory):
        controller = StockCatalogController()
        controller.repository = MagicMock()
        controller.repository.next_structuration_number.return_value = 12
        response = controller.next_structuration_number(
            _make_get(
                request_factory, "/api/v1/stock/catalog/next-structuration-number/"
            )
        )
        assert response.status_code == 200
        assert json.loads(response.content) == {"next": 12}

    @pytest.mark.integration
    @patch("app.api.stock.catalog_controller.create_structuration_batch")
    def test_batch_success_returns_201_list(self, mock_batch, request_factory):
        mock_batch.return_value = [
            self._structuration_bean("a" * 8 + "-1111-4111-8111-111111111111", "11"),
            self._structuration_bean("b" * 8 + "-1111-4111-8111-111111111111", "12"),
        ]
        controller = StockCatalogController()
        request = _make_post(
            request_factory,
            "/api/v1/stock/catalog/batch-structuration/",
            {
                "structuration_type": STRUCTURATION_TYPE_STANDARD,
                "installation": INSTALLATION_LMJ,
                "quantity": 2,
            },
        )
        response = controller.batch_structuration(request)
        assert response.status_code == 201
        data = json.loads(response.content)
        assert [item["name"] for item in data] == ["11", "12"]

    @pytest.mark.integration
    def test_batch_invalid_quantity_returns_400(self, request_factory):
        from app.domain.exceptions import InvalidDataException

        controller = StockCatalogController()
        request = _make_post(
            request_factory,
            "/api/v1/stock/catalog/batch-structuration/",
            {
                "structuration_type": STRUCTURATION_TYPE_STANDARD,
                "installation": INSTALLATION_LMJ,
                "quantity": 0,
            },
        )
        with pytest.raises(InvalidDataException):
            controller.batch_structuration(request)


# ============================================================================
# BOUT-EN-BOUT DB (client Django authentifié) — R01 / R03 / R09 / R20
# ============================================================================

CATALOG_URL = "/api/v1/stock/catalog/"
ASSEMBLY_URL = "/api/v1/fsec-assembly-items/"
FSECS_URL = "/api/v1/fsecs/"


def _post_json(client, url, payload):
    return client.post(url, data=json.dumps(payload), content_type="application/json")


def _put_json(client, url, payload):
    return client.put(url, data=json.dumps(payload), content_type="application/json")


def _patch_json(client, url, payload):
    return client.patch(url, data=json.dumps(payload), content_type="application/json")


def _element_payload(**overrides):
    """Payload POST minimal d'un élément sérialisé (nom unique par défaut)."""
    payload = {
        "kind": ITEM_KIND_ELEMENT,
        "category": CATEGORY_PIECES_ELEMENTAIRES,
        "name": f"Element {uuid_lib.uuid4().hex[:10]}",
        "reference": f"REF-{uuid_lib.uuid4().hex[:8]}",
        "installation": INSTALLATION_LMJ,
    }
    payload.update(overrides)
    return payload


def _consumable_payload(**overrides):
    """Payload POST minimal d'un consommable (nom unique par défaut)."""
    payload = {
        "kind": ITEM_KIND_CONSUMABLE,
        "category": CATEGORY_COLLES,
        "name": f"Colle {uuid_lib.uuid4().hex[:10]}",
        "unite": "tubes",
        "quantite": 10,
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def sample_campaign_db(db):
    """Campagne minimale (installation 0 = LMJ) pour rattacher les FSEC."""
    from app.repository.campaign.models.campaign_entity import CampaignEntity

    return CampaignEntity.objects.create(
        uuid=str(uuid_lib.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Campagne Stock {uuid_lib.uuid4().hex[:8]}",
        year=2026,
        semester="S1",
    )


@pytest.fixture
def created_fsec(api_client, sample_campaign_db):
    """FSEC active en statut 0 (Design). Renvoie le payload API complet."""
    payload = {
        "name": f"FSEC {uuid_lib.uuid4().hex[:8]}",
        "campaign_id": sample_campaign_db.uuid,
        "status_id": 0,
        "category_id": 0,
    }
    response = _post_json(api_client, FSECS_URL, payload)
    assert response.status_code == 201, response.content
    return response.json()


def _set_fsec_status(api_client, fsec: dict, status_id: int) -> None:
    """Change le statut d'une FSEC via PUT (déclenche le couplage stock — R09)."""
    response = _put_json(
        api_client,
        f"{FSECS_URL}{fsec['version_uuid']}/",
        {
            "name": fsec["name"],
            "campaign_id": fsec["campaign_id"],
            "status_id": status_id,
            "category_id": fsec.get("category_id") or 0,
        },
    )
    assert response.status_code == 200, response.content


def _create_catalog_item(api_client, payload) -> dict:
    response = _post_json(api_client, CATALOG_URL, payload)
    assert response.status_code == 201, response.content
    return response.json()


def _add_assembly_item(api_client, fsec_uuid, catalog_item_uuid, **extra):
    return _post_json(
        api_client,
        ASSEMBLY_URL,
        {"fsec_uuid": fsec_uuid, "catalog_item_uuid": catalog_item_uuid, **extra},
    )


def _get_catalog_item(api_client, item_uuid) -> dict:
    response = api_client.get(f"{CATALOG_URL}{item_uuid}/")
    assert response.status_code == 200, response.content
    return response.json()


class TestCatalogApiMatiereMasseDb:
    """R03 : champs Matière / Masse [mg] des éléments sérialisés (DB réelle)."""

    @pytest.mark.integration
    def test_post_element_matiere_masse_round_trip(self, api_client):
        created = _create_catalog_item(
            api_client, _element_payload(matiere="Cuivre OFHC", masse_mg=0.45)
        )
        assert created["matiere"] == "Cuivre OFHC"
        assert created["masse_mg"] == 0.45

        fetched = _get_catalog_item(api_client, created["uuid"])
        assert fetched["matiere"] == "Cuivre OFHC"
        assert fetched["masse_mg"] == 0.45

    @pytest.mark.integration
    def test_patch_matiere_masse_persists(self, api_client):
        created = _create_catalog_item(api_client, _element_payload())
        assert created["matiere"] is None
        assert created["masse_mg"] is None

        response = _patch_json(
            api_client,
            f"{CATALOG_URL}{created['uuid']}/",
            {"matiere": "Or 24k", "masse_mg": 1250.0},
        )
        assert response.status_code == 200, response.content

        fetched = _get_catalog_item(api_client, created["uuid"])
        assert fetched["matiere"] == "Or 24k"
        assert fetched["masse_mg"] == 1250.0

    @pytest.mark.integration
    def test_put_preserves_matiere_masse(self, api_client):
        """Anti-régression : StockCatalogRepository.update copie matiere/masse_mg
        (liste explicite de champs — un oubli les effacerait silencieusement)."""
        created = _create_catalog_item(
            api_client, _element_payload(matiere="Aluminium", masse_mg=12.5)
        )
        put_payload = {
            key: value
            for key, value in created.items()
            if key
            not in (
                "uuid",
                "created_at",
                "updated_at",
                "assigned_fsec_name",
                "assigned_campaign_name",
                "assigned_fsec_slug",
            )
        }
        response = _put_json(
            api_client, f"{CATALOG_URL}{created['uuid']}/", put_payload
        )
        assert response.status_code == 200, response.content

        fetched = _get_catalog_item(api_client, created["uuid"])
        assert fetched["matiere"] == "Aluminium"
        assert fetched["masse_mg"] == 12.5

    @pytest.mark.integration
    def test_post_consumable_with_matiere_returns_400(self, api_client):
        response = _post_json(
            api_client, CATALOG_URL, _consumable_payload(matiere="Cuivre OFHC")
        )
        assert response.status_code == 400

    @pytest.mark.integration
    def test_post_consumable_with_masse_mg_returns_400(self, api_client):
        response = _post_json(
            api_client, CATALOG_URL, _consumable_payload(masse_mg=3.2)
        )
        assert response.status_code == 400

    @pytest.mark.integration
    def test_batch_structuration_propagates_matiere_masse(self, api_client):
        response = _post_json(
            api_client,
            f"{CATALOG_URL}batch-structuration/",
            {
                "structuration_type": STRUCTURATION_TYPE_STANDARD,
                "installation": INSTALLATION_LMJ,
                "quantity": 2,
                "matiere": "Cuivre OFHC",
                "masse_mg": 0.45,
            },
        )
        assert response.status_code == 201, response.content
        items = response.json()
        assert len(items) == 2
        for item in items:
            assert item["matiere"] == "Cuivre OFHC"
            assert item["masse_mg"] == 0.45


class TestCatalogApiAssignedFsecDb:
    """R01 : exposition de la FSEC réellement réservée + campagne (DB réelle)."""

    @pytest.mark.integration
    def test_reserved_element_payload_contains_assignment(
        self, api_client, created_fsec, sample_campaign_db
    ):
        element = _create_catalog_item(api_client, _element_payload())
        response = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], element["uuid"]
        )
        assert response.status_code == 201, response.content

        fetched = _get_catalog_item(api_client, element["uuid"])
        # Nom complet de la FSEC : {year}-{installation}_{campagne}_{fsec}
        assert fetched["assigned_fsec_name"] == created_fsec["display_name"]
        assert (
            fetched["assigned_fsec_name"]
            == f"2026-LMJ_{sample_campaign_db.name}_{created_fsec['name']}"
        )
        # Format campagne : {year}-{installation}_{name}
        assert (
            fetched["assigned_campaign_name"] == f"2026-LMJ_{sample_campaign_db.name}"
        )
        assert fetched["assigned_fsec_slug"]
        # R09 : la réservation renseigne aussi le fsec_name déclaratif + statut.
        assert fetched["fsec_name"] == created_fsec["name"]
        assert fetched["status"] == "reservee"

    @pytest.mark.integration
    def test_unassigned_element_has_null_assignment(self, api_client):
        element = _create_catalog_item(api_client, _element_payload())
        fetched = _get_catalog_item(api_client, element["uuid"])
        assert fetched["assigned_fsec_name"] is None
        assert fetched["assigned_campaign_name"] is None
        assert fetched["assigned_fsec_slug"] is None

    @pytest.mark.integration
    def test_assignment_present_in_list_payload(self, api_client, created_fsec):
        element = _create_catalog_item(api_client, _element_payload())
        assert (
            _add_assembly_item(
                api_client, created_fsec["fsec_uuid"], element["uuid"]
            ).status_code
            == 201
        )
        response = api_client.get(f"{CATALOG_URL}?search={element['name']}")
        assert response.status_code == 200, response.content
        rows = response.json()
        payload = rows["results"] if isinstance(rows, dict) else rows
        matching = [r for r in payload if r["uuid"] == element["uuid"]]
        assert len(matching) == 1
        assert matching[0]["assigned_fsec_name"] == created_fsec["display_name"]


class TestCatalogApiElementLifecycleDb:
    """R09 : couplage statut FSEC ↔ statut des éléments (DB réelle)."""

    @pytest.mark.integration
    def test_add_element_on_started_fsec_promotes_to_affectee(
        self, api_client, created_fsec
    ):
        """Un élément ajouté à une FSEC déjà en assemblage passe directement 'affectee'."""
        _set_fsec_status(api_client, created_fsec, 1)
        element = _create_catalog_item(api_client, _element_payload())
        response = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], element["uuid"]
        )
        assert response.status_code == 201, response.content
        assert _get_catalog_item(api_client, element["uuid"])["status"] == "affectee"

    @pytest.mark.integration
    def test_fsec_status_transitions_sync_elements(self, api_client, created_fsec):
        """0 → 1 promeut en 'affectee' ; retour 1 → 0 redescend en 'reservee'."""
        element = _create_catalog_item(api_client, _element_payload())
        assert (
            _add_assembly_item(
                api_client, created_fsec["fsec_uuid"], element["uuid"]
            ).status_code
            == 201
        )
        assert _get_catalog_item(api_client, element["uuid"])["status"] == "reservee"

        _set_fsec_status(api_client, created_fsec, 1)
        assert _get_catalog_item(api_client, element["uuid"])["status"] == "affectee"

        _set_fsec_status(api_client, created_fsec, 0)
        assert _get_catalog_item(api_client, element["uuid"])["status"] == "reservee"

    @pytest.mark.integration
    def test_remove_assembly_line_releases_element(self, api_client, created_fsec):
        """La suppression de la ligne libère l'élément et vide fsec_name (R09)."""
        element = _create_catalog_item(api_client, _element_payload())
        response = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], element["uuid"]
        )
        assert response.status_code == 201, response.content
        line_uuid = response.json()["uuid"]

        assert api_client.delete(f"{ASSEMBLY_URL}{line_uuid}/").status_code == 204
        fetched = _get_catalog_item(api_client, element["uuid"])
        assert fetched["status"] == "dispo"
        assert fetched["fsec_name"] is None
        assert fetched["assigned_fsec_name"] is None


class TestCatalogApiConsumableMultiAddDb:
    """R20 : multi-ajout des consommables au tableau récap (DB réelle)."""

    @pytest.mark.integration
    def test_same_consumable_twice_returns_201_201(self, api_client, created_fsec):
        consumable = _create_catalog_item(api_client, _consumable_payload())
        first = _add_assembly_item(
            api_client,
            created_fsec["fsec_uuid"],
            consumable["uuid"],
            remarque="Première application",
        )
        second = _add_assembly_item(
            api_client,
            created_fsec["fsec_uuid"],
            consumable["uuid"],
            remarque="Retouche finale",
        )
        assert first.status_code == 201, first.content
        assert second.status_code == 201, second.content

        response = api_client.get(f"{ASSEMBLY_URL}fsec/{created_fsec['fsec_uuid']}/")
        assert response.status_code == 200, response.content
        rows = [
            r for r in response.json() if r["catalog_item_uuid"] == consumable["uuid"]
        ]
        assert len(rows) == 2
        assert {r["remarque"] for r in rows} == {
            "Première application",
            "Retouche finale",
        }

    @pytest.mark.integration
    def test_same_element_twice_returns_409(self, api_client, created_fsec):
        element = _create_catalog_item(api_client, _element_payload())
        first = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], element["uuid"]
        )
        second = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], element["uuid"]
        )
        assert first.status_code == 201, first.content
        assert second.status_code == 409, second.content

    @pytest.mark.integration
    def test_delete_one_of_two_consumable_lines_keeps_the_other(
        self, api_client, created_fsec
    ):
        consumable = _create_catalog_item(api_client, _consumable_payload())
        first = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], consumable["uuid"]
        )
        second = _add_assembly_item(
            api_client, created_fsec["fsec_uuid"], consumable["uuid"]
        )
        assert first.status_code == 201 and second.status_code == 201

        assert (
            api_client.delete(f"{ASSEMBLY_URL}{first.json()['uuid']}/").status_code
            == 204
        )
        response = api_client.get(f"{ASSEMBLY_URL}fsec/{created_fsec['fsec_uuid']}/")
        remaining = [
            r for r in response.json() if r["catalog_item_uuid"] == consumable["uuid"]
        ]
        assert len(remaining) == 1
        assert remaining[0]["uuid"] == second.json()["uuid"]
