"""Tests unitaires du mapper catalog Stock.

Couverture R03 (round-trip matiere/masse_mg dans les 4 directions) et
R01 (exposition lecture seule des champs calculés assigned_*).
"""

import pytest

from app.domain.stock.models.fsec_assembly_item_bean import (
    FsecAssemblyItemBean,
    FsecAssemblyItemDetailBean,
)
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_PIECES_ELEMENTAIRES,
    ELEMENT_STATUS_RESERVEE,
    INSTALLATION_LMJ,
    ITEM_KIND_ELEMENT,
)
from app.mapper.stock.catalog_mapper import (
    stock_catalog_mapper_api_to_bean,
    stock_catalog_mapper_bean_to_api,
    stock_catalog_mapper_bean_to_entity,
    stock_catalog_mapper_entity_to_bean,
)
from app.mapper.stock.fsec_assembly_mapper import (
    fsec_assembly_mapper_detail_bean_to_api,
)
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity


def _element_bean(**overrides) -> StockCatalogItemBean:
    """Bean élément valide avec matiere/masse_mg renseignés (base des tests)."""
    defaults = dict(
        uuid="11111111-1111-4111-8111-111111111111",
        kind=ITEM_KIND_ELEMENT,
        category=CATEGORY_PIECES_ELEMENTAIRES,
        name="Cible D2",
        reference="CIB-D2-2026-042",
        installation=INSTALLATION_LMJ,
        status=ELEMENT_STATUS_RESERVEE,
        matiere="Cuivre OFHC",
        masse_mg=0.45,
        is_active=True,
    )
    defaults.update(overrides)
    return StockCatalogItemBean(**defaults)


class TestMatiereMasseRoundTrip:
    """R03 : matiere/masse_mg traversent les 4 directions du mapper."""

    @pytest.mark.unit
    def test_bean_to_entity_carries_matiere_masse(self):
        entity = stock_catalog_mapper_bean_to_entity(_element_bean())
        assert entity.matiere == "Cuivre OFHC"
        assert entity.masse_mg == 0.45

    @pytest.mark.unit
    def test_entity_to_bean_carries_matiere_masse(self):
        entity = StockCatalogItemEntity(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible D2",
            installation=INSTALLATION_LMJ,
            matiere="Or 24k",
            masse_mg=1250.0,
        )
        bean = stock_catalog_mapper_entity_to_bean(entity)
        assert bean.matiere == "Or 24k"
        assert bean.masse_mg == 1250.0

    @pytest.mark.unit
    def test_api_to_bean_reads_matiere_masse(self):
        bean = stock_catalog_mapper_api_to_bean(
            {
                "kind": ITEM_KIND_ELEMENT,
                "category": CATEGORY_PIECES_ELEMENTAIRES,
                "name": "Cible D2",
                "installation": INSTALLATION_LMJ,
                "matiere": "Aluminium",
                "masse_mg": 12.5,
            }
        )
        assert bean.matiere == "Aluminium"
        assert bean.masse_mg == 12.5

    @pytest.mark.unit
    def test_bean_to_api_exposes_matiere_masse(self):
        payload = stock_catalog_mapper_bean_to_api(_element_bean())
        assert payload["matiere"] == "Cuivre OFHC"
        assert payload["masse_mg"] == 0.45

    @pytest.mark.unit
    def test_round_trip_bean_entity_bean_preserves_matiere_masse(self):
        original = _element_bean()
        result = stock_catalog_mapper_entity_to_bean(
            stock_catalog_mapper_bean_to_entity(original)
        )
        assert result.matiere == original.matiere
        assert result.masse_mg == original.masse_mg

    @pytest.mark.unit
    def test_absent_fields_default_to_none(self):
        # Rétro-compatibilité : un payload sans matiere/masse_mg reste valide.
        bean = stock_catalog_mapper_api_to_bean(
            {
                "kind": ITEM_KIND_ELEMENT,
                "category": CATEGORY_PIECES_ELEMENTAIRES,
                "name": "Cible sans matière",
                "installation": INSTALLATION_LMJ,
            }
        )
        assert bean.matiere is None
        assert bean.masse_mg is None
        payload = stock_catalog_mapper_bean_to_api(bean)
        assert payload["matiere"] is None
        assert payload["masse_mg"] is None


class TestAssignedFieldsExposure:
    """R01 : champs calculés assigned_* exposés en lecture seule uniquement."""

    @pytest.mark.unit
    def test_bean_to_api_exposes_assigned_fields(self):
        bean = _element_bean(
            assigned_fsec_name="FSEC Alpha",
            assigned_campaign_name="2026-LMJ_Campagne Test",
            assigned_fsec_slug="2026-s1-lmj-campagne-test-fsec-alpha",
        )
        payload = stock_catalog_mapper_bean_to_api(bean)
        assert payload["assigned_fsec_name"] == "FSEC Alpha"
        assert payload["assigned_campaign_name"] == "2026-LMJ_Campagne Test"
        assert payload["assigned_fsec_slug"] == "2026-s1-lmj-campagne-test-fsec-alpha"

    @pytest.mark.unit
    def test_bean_to_api_defaults_assigned_fields_to_none(self):
        payload = stock_catalog_mapper_bean_to_api(_element_bean())
        assert payload["assigned_fsec_name"] is None
        assert payload["assigned_campaign_name"] is None
        assert payload["assigned_fsec_slug"] is None

    @pytest.mark.unit
    def test_api_to_bean_never_reads_assigned_fields(self):
        # Un client malveillant/naïf qui renvoie les champs calculés ne doit
        # pas pouvoir les injecter dans le bean (lecture seule — cf. R01).
        bean = stock_catalog_mapper_api_to_bean(
            {
                "kind": ITEM_KIND_ELEMENT,
                "category": CATEGORY_PIECES_ELEMENTAIRES,
                "name": "Cible D2",
                "installation": INSTALLATION_LMJ,
                "assigned_fsec_name": "Injection",
                "assigned_campaign_name": "Injection",
                "assigned_fsec_slug": "injection",
            }
        )
        assert bean.assigned_fsec_name is None
        assert bean.assigned_campaign_name is None
        assert bean.assigned_fsec_slug is None

    @pytest.mark.unit
    def test_bean_to_entity_never_writes_assigned_fields(self):
        # L'entité ne porte pas ces colonnes : le mapper ne doit rien poser.
        entity = stock_catalog_mapper_bean_to_entity(
            _element_bean(assigned_fsec_name="FSEC Alpha")
        )
        assert not hasattr(entity, "assigned_fsec_name")
        assert not hasattr(entity, "assigned_campaign_name")
        assert not hasattr(entity, "assigned_fsec_slug")


class TestAssemblyDetailMapperPropagation:
    """Le payload enrichi de l'onglet Assemblage réutilise bean_to_api :
    matiere/masse_mg et assigned_* doivent y apparaître automatiquement."""

    @pytest.mark.unit
    def test_detail_bean_to_api_propagates_new_fields(self):
        detail = FsecAssemblyItemDetailBean(
            item=FsecAssemblyItemBean(
                uuid="44444444-4444-4444-8444-444444444444",
                fsec_uuid="33333333-3333-4333-8333-333333333333",
                catalog_item_uuid="11111111-1111-4111-8111-111111111111",
                sort_order=0,
                remarque="Collage face avant",
            ),
            catalog_item=_element_bean(
                assigned_fsec_name="FSEC Alpha",
                assigned_campaign_name="2026-LMJ_Campagne Test",
            ),
        )
        payload = fsec_assembly_mapper_detail_bean_to_api(detail)
        catalog_payload = payload["catalog_item"]
        assert catalog_payload["matiere"] == "Cuivre OFHC"
        assert catalog_payload["masse_mg"] == 0.45
        assert catalog_payload["assigned_fsec_name"] == "FSEC Alpha"
        assert catalog_payload["assigned_campaign_name"] == "2026-LMJ_Campagne Test"
