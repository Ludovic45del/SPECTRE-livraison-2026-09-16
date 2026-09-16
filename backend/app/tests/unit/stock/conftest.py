"""Fixtures partagées pour les tests unitaires du module Stock."""

import uuid
from datetime import date
from unittest.mock import MagicMock

import pytest

from app.domain.stock.models.fsec_assembly_item_bean import FsecAssemblyItemBean
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_COLLES,
    CATEGORY_PIECES_ELEMENTAIRES,
    ELEMENT_STATUS_DISPO,
    INSTALLATION_LMJ,
    ITEM_KIND_CONSUMABLE,
    ITEM_KIND_ELEMENT,
    MOVEMENT_TYPE_ENTREE,
)
from app.domain.stock.models.stock_movement_bean import StockMovementBean

# ===========================================================================
# UUIDs déterministes
# ===========================================================================


@pytest.fixture
def stock_element_uuid() -> str:
    return "11111111-1111-4111-8111-111111111111"


@pytest.fixture
def stock_consumable_uuid() -> str:
    return "22222222-2222-4222-8222-222222222222"


@pytest.fixture
def stock_fsec_uuid() -> str:
    return "33333333-3333-4333-8333-333333333333"


@pytest.fixture
def stock_assembly_uuid() -> str:
    return "44444444-4444-4444-8444-444444444444"


@pytest.fixture
def stock_movement_uuid() -> str:
    return "55555555-5555-4555-8555-555555555555"


# ===========================================================================
# Sample beans
# ===========================================================================


@pytest.fixture
def sample_element_bean(stock_element_uuid) -> StockCatalogItemBean:
    """Élément sérialisé valide (Cible D2)."""
    return StockCatalogItemBean(
        uuid=stock_element_uuid,
        kind=ITEM_KIND_ELEMENT,
        category=CATEGORY_PIECES_ELEMENTAIRES,
        name="Cible D2",
        reference="CIB-D2-2026-042",
        installation=INSTALLATION_LMJ,
        status=ELEMENT_STATUS_DISPO,
        fournisseur="CEA Valduc",
        boite="A12",
        emplacement="Étagère 3",
        is_active=True,
    )


@pytest.fixture
def sample_consumable_bean(stock_consumable_uuid) -> StockCatalogItemBean:
    """Consommable valide (Colle Araldite)."""
    return StockCatalogItemBean(
        uuid=stock_consumable_uuid,
        kind=ITEM_KIND_CONSUMABLE,
        category=CATEGORY_COLLES,
        name="Colle Araldite 2011",
        reference="COL-ARA-2011",
        unite="tubes",
        quantite=24,
        seuil_alerte=5,
        date_peremption=date(2027, 6, 30),
        fournisseur="Huntsman",
        boite="Armoire A",
        emplacement="Étagère 1",
        is_active=True,
    )


@pytest.fixture
def sample_low_stock_consumable_bean() -> StockCatalogItemBean:
    """Consommable sous le seuil d'alerte."""
    return StockCatalogItemBean(
        uuid=str(uuid.uuid4()),
        kind=ITEM_KIND_CONSUMABLE,
        category=CATEGORY_COLLES,
        name="Colle Stycast 2850FT",
        reference="COL-STY-2850",
        unite="kits",
        quantite=3,
        seuil_alerte=5,
        is_active=True,
    )


@pytest.fixture
def sample_movement_bean(
    stock_consumable_uuid, stock_movement_uuid
) -> StockMovementBean:
    """Mouvement d'entrée de 12 tubes."""
    return StockMovementBean(
        uuid=stock_movement_uuid,
        catalog_item_uuid=stock_consumable_uuid,
        movement_type=MOVEMENT_TYPE_ENTREE,
        quantite_delta=12,
        quantite_apres=0,  # placeholder, calculé serveur
        date=date(2026, 4, 24),
        remarque="Réapprovisionnement trimestriel",
        auteur_name="Marc",
    )


@pytest.fixture
def sample_assembly_bean(
    stock_fsec_uuid, stock_element_uuid, stock_assembly_uuid
) -> FsecAssemblyItemBean:
    """Ligne du tableau récap FSEC liant un élément."""
    return FsecAssemblyItemBean(
        uuid=stock_assembly_uuid,
        fsec_uuid=stock_fsec_uuid,
        catalog_item_uuid=stock_element_uuid,
        sort_order=0,
        remarque=None,
    )


# ===========================================================================
# Repository mocks
# ===========================================================================


@pytest.fixture
def mock_stock_catalog_repository():
    """Mock du IStockCatalogRepository avec des défauts permissifs."""
    mock = MagicMock()
    mock.exists_by_kind_name_reference.return_value = False
    mock.is_referenced_by_assembly.return_value = False
    mock.update_status_for_uuids.return_value = 0
    return mock


@pytest.fixture
def mock_stock_movement_repository():
    """Mock du IStockMovementRepository."""
    return MagicMock()


@pytest.fixture
def mock_fsec_assembly_repository():
    """Mock du IFsecAssemblyItemRepository."""
    mock = MagicMock()
    mock.find_active_assignment_for_element.return_value = None
    mock.exists_by_fsec_and_catalog.return_value = False
    mock.list_catalog_uuids_by_fsec.return_value = []
    return mock


@pytest.fixture
def mock_stock_fsec_repository(stock_fsec_uuid):
    """Mock du IFsecRepository pour les tests Stock.

    `get_active_by_fsec_uuid` retourne un FsecBean au statut `0` (Design)
    par défaut — c.-à-d. NON verrouillé.
    """
    from app.domain.fsec.models.fsec_bean import FsecBean

    mock = MagicMock()
    mock.get_active_by_fsec_uuid.return_value = FsecBean(
        version_uuid=str(uuid.uuid4()),
        fsec_uuid=stock_fsec_uuid,
        campaign_id=None,
        status_id=0,
        category_id=0,
        rack_id=0,
        name="FSEC Test",
        is_active=True,
    )
    return mock
