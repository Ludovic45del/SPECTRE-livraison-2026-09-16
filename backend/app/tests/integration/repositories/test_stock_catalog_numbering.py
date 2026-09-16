"""Tests d'intégration (DB) : numérotation des structurations par lot.

Couvre le cœur de la création par paquet : compteur de série global et continu,
calculé sur `kind=element`, et création atomique séquentielle.
"""

import pytest

from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_PIECES_ELEMENTAIRES,
    CATEGORY_STRUCTURATION,
    ELEMENT_STATUS_DISPO,
    INSTALLATION_LMJ,
    ITEM_KIND_ELEMENT,
    STRUCTURATION_TYPE_SPECIALE,
    STRUCTURATION_TYPE_STANDARD,
)
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)


def _structuration_template(structuration_type=STRUCTURATION_TYPE_STANDARD):
    return StockCatalogItemBean(
        kind=ITEM_KIND_ELEMENT,
        category=CATEGORY_STRUCTURATION,
        structuration_type=structuration_type,
        name="",
        installation=INSTALLATION_LMJ,
        status=ELEMENT_STATUS_DISPO,
    )


def _make_element(
    name,
    *,
    category=CATEGORY_STRUCTURATION,
    is_active=True,
    structuration_type=STRUCTURATION_TYPE_STANDARD
):
    return StockCatalogItemEntity.objects.create(
        kind=ITEM_KIND_ELEMENT,
        category=category,
        structuration_type=(
            structuration_type if category == CATEGORY_STRUCTURATION else None
        ),
        name=name,
        installation=INSTALLATION_LMJ,
        status=ELEMENT_STATUS_DISPO,
        is_active=is_active,
    )


@pytest.fixture
def repo():
    return StockCatalogRepository()


@pytest.mark.integration
def test_next_number_is_1_when_empty(db, repo):
    assert repo.next_structuration_number() == 1


@pytest.mark.integration
def test_batch_creates_sequential_names_from_1(db, repo):
    created = repo.create_structuration_batch(_structuration_template(), 3)
    assert [c.name for c in created] == ["1", "2", "3"]
    assert all(c.category == CATEGORY_STRUCTURATION for c in created)
    assert all(c.status == ELEMENT_STATUS_DISPO for c in created)
    assert repo.next_structuration_number() == 4


@pytest.mark.integration
def test_batch_continues_from_max_plus_1(db, repo):
    _make_element("10")
    _make_element("7")
    created = repo.create_structuration_batch(_structuration_template(), 2)
    assert [c.name for c in created] == ["11", "12"]


@pytest.mark.integration
def test_legacy_descriptive_names_are_ignored(db, repo):
    # Une structuration legacy au nom descriptif ne casse pas le compteur.
    _make_element("Cible D2 legacy")
    created = repo.create_structuration_batch(_structuration_template(), 1)
    assert created[0].name == "1"


@pytest.mark.integration
def test_numeric_piece_elementaire_avoids_collision(db, repo):
    # Une pièce élémentaire au nom numérique est prise en compte par le compteur
    # (scope kind=element) : pas de collision sur l'unicité (kind, name, reference).
    _make_element("5", category=CATEGORY_PIECES_ELEMENTAIRES)
    created = repo.create_structuration_batch(_structuration_template(), 1)
    assert created[0].name == "6"


@pytest.mark.integration
def test_inactive_numbers_are_not_reused(db, repo):
    _make_element("4", is_active=False)
    created = repo.create_structuration_batch(_structuration_template(), 1)
    assert created[0].name == "5"


@pytest.mark.integration
def test_template_type_propagates(db, repo):
    created = repo.create_structuration_batch(
        _structuration_template(structuration_type=STRUCTURATION_TYPE_SPECIALE), 2
    )
    assert all(c.structuration_type == STRUCTURATION_TYPE_SPECIALE for c in created)
