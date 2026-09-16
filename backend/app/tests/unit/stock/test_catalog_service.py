"""Tests unitaires du service catalog Stock.

Couverture des règles CDC §3.1 et §10.1.
"""

from dataclasses import replace

import pytest

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.domain.stock.models.stock_constants import (
    CATEGORY_COLLES,
    CATEGORY_PIECES_ELEMENTAIRES,
    CATEGORY_STRUCTURATION,
    ELEMENT_STATUS_DISPO,
    ERROR_CODE_CATALOG_ITEM_IN_USE,
    ERROR_CODE_INVALID_KIND_CATEGORY,
    INSTALLATION_LMJ,
    ITEM_KIND_CONSUMABLE,
    ITEM_KIND_ELEMENT,
    STRUCTURATION_BATCH_MAX,
    STRUCTURATION_TYPE_EC,
    STRUCTURATION_TYPE_SPECIALE,
    STRUCTURATION_TYPE_STANDARD,
)
from app.domain.stock.services.catalog_service import (
    create_item,
    create_structuration_batch,
    get_item,
    list_items,
    patch_item,
    soft_delete_item,
    update_item,
)


class TestCreateItem:
    @pytest.mark.unit
    def test_create_element_success(
        self, sample_element_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.create.return_value = sample_element_bean
        result = create_item(mock_stock_catalog_repository, sample_element_bean)
        assert result.uuid == sample_element_bean.uuid
        mock_stock_catalog_repository.create.assert_called_once()

    @pytest.mark.unit
    def test_create_consumable_success(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.create.return_value = sample_consumable_bean
        result = create_item(mock_stock_catalog_repository, sample_consumable_bean)
        assert result.uuid == sample_consumable_bean.uuid

    @pytest.mark.unit
    def test_create_rejects_invalid_kind(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(kind="bogus", category=CATEGORY_COLLES, name="X")
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "kind"

    @pytest.mark.unit
    def test_create_rejects_kind_category_mismatch(self, mock_stock_catalog_repository):
        # consumable + rubrique element → doit lever INVALID_KIND_CATEGORY
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Bad",
            unite="tubes",
            quantite=1,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == ERROR_CODE_INVALID_KIND_CATEGORY

    @pytest.mark.unit
    def test_create_element_requires_installation(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible sans install",
            installation=None,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "installation"

    @pytest.mark.unit
    def test_create_element_rejects_consumable_fields(
        self, mock_stock_catalog_repository
    ):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible",
            installation=INSTALLATION_LMJ,
            unite="tubes",  # interdit pour element
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "unite"

    @pytest.mark.unit
    def test_create_element_accepts_optional_fsec_name(
        self, mock_stock_catalog_repository
    ):
        # fsec_name est un lien déclaratif optionnel : accepté renseigné ou absent.
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible libre",
            fsec_name="FSEC-2026-001",
            installation=INSTALLATION_LMJ,
        )
        mock_stock_catalog_repository.create.return_value = bean
        result = create_item(mock_stock_catalog_repository, bean)
        assert result.fsec_name == "FSEC-2026-001"

        bean_sans_fsec = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible sans FSEC",
            installation=INSTALLATION_LMJ,
        )
        mock_stock_catalog_repository.create.return_value = bean_sans_fsec
        result = create_item(mock_stock_catalog_repository, bean_sans_fsec)
        assert result.fsec_name is None

    @pytest.mark.unit
    def test_create_consumable_rejects_fsec_name(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            name="Colle",
            unite="tubes",
            quantite=1,
            fsec_name="FSEC-2026-001",
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "fsec_name"

    @pytest.mark.unit
    def test_create_structuration_requires_type(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_STRUCTURATION,
            name="Structuration sans type",
            installation=INSTALLATION_LMJ,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "structuration_type"

    @pytest.mark.unit
    def test_create_structuration_with_type_success(
        self, mock_stock_catalog_repository
    ):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_STRUCTURATION,
            structuration_type=STRUCTURATION_TYPE_EC,
            name="Structuration EC",
            installation=INSTALLATION_LMJ,
        )
        mock_stock_catalog_repository.create.return_value = bean
        result = create_item(mock_stock_catalog_repository, bean)
        assert result.structuration_type == STRUCTURATION_TYPE_EC

    @pytest.mark.unit
    def test_create_structuration_rejects_unknown_type(
        self, mock_stock_catalog_repository
    ):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_STRUCTURATION,
            structuration_type="bogus",
            name="Structuration type inconnu",
            installation=INSTALLATION_LMJ,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "structuration_type"

    @pytest.mark.unit
    def test_create_non_structuration_clears_type(self, mock_stock_catalog_repository):
        # Type fourni hors rubrique structuration → remis à None silencieusement.
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            structuration_type=STRUCTURATION_TYPE_SPECIALE,
            name="Cible",
            installation=INSTALLATION_LMJ,
        )
        mock_stock_catalog_repository.create.return_value = bean
        create_item(mock_stock_catalog_repository, bean)
        assert bean.structuration_type is None

    @pytest.mark.unit
    def test_create_consumable_requires_unite(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            name="Colle sans unité",
            unite=None,
            quantite=10,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "unite"

    @pytest.mark.unit
    def test_create_consumable_requires_quantite(self, mock_stock_catalog_repository):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            name="Colle sans qté",
            unite="tubes",
            quantite=None,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "quantite"

    @pytest.mark.unit
    def test_create_consumable_rejects_negative_qty(
        self, mock_stock_catalog_repository
    ):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            name="Colle",
            unite="tubes",
            quantite=-1,
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "quantite"

    @pytest.mark.unit
    def test_create_consumable_rejects_element_only_fields(
        self, mock_stock_catalog_repository
    ):
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            name="Colle",
            unite="tubes",
            quantite=1,
            installation=INSTALLATION_LMJ,  # interdit pour consumable
        )
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "installation"

    @pytest.mark.unit
    def test_create_rejects_duplicate(
        self, sample_element_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.exists_by_kind_name_reference.return_value = True
        with pytest.raises(ConflictException):
            create_item(mock_stock_catalog_repository, sample_element_bean)
        mock_stock_catalog_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_create_element_defaults_status_to_dispo(
        self, mock_stock_catalog_repository
    ):
        # status omis → service force `dispo`
        bean = StockCatalogItemBean(
            kind=ITEM_KIND_ELEMENT,
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Cible default",
            installation=INSTALLATION_LMJ,
            status=None,
        )
        mock_stock_catalog_repository.create.return_value = bean
        create_item(mock_stock_catalog_repository, bean)
        # Le bean est mutuellement modifié par _validate_kind_specific_fields.
        assert bean.status == ELEMENT_STATUS_DISPO


class TestGetItem:
    @pytest.mark.unit
    def test_get_item_found(self, sample_element_bean, mock_stock_catalog_repository):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        result = get_item(mock_stock_catalog_repository, sample_element_bean.uuid)
        assert result.uuid == sample_element_bean.uuid

    @pytest.mark.unit
    def test_get_item_not_found_raises(self, mock_stock_catalog_repository):
        mock_stock_catalog_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            get_item(mock_stock_catalog_repository, "missing-uuid")


class TestListItems:
    @pytest.mark.unit
    def test_list_items_passes_filters(self, mock_stock_catalog_repository):
        mock_stock_catalog_repository.list_by_filters.return_value = []
        list_items(
            mock_stock_catalog_repository,
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            limit=10,
            offset=0,
        )
        mock_stock_catalog_repository.list_by_filters.assert_called_once_with(
            kind=ITEM_KIND_CONSUMABLE,
            category=CATEGORY_COLLES,
            status=None,
            installation=None,
            is_active=True,
            search=None,
            limit=10,
            offset=0,
        )


class TestUpdateItem:
    @pytest.mark.unit
    def test_update_preserves_kind(
        self, sample_element_bean, mock_stock_catalog_repository
    ):
        # Tentative de modifier kind via PUT — doit être ignoré.
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_stock_catalog_repository.update.return_value = sample_element_bean

        modified = StockCatalogItemBean(
            uuid=sample_element_bean.uuid,
            kind=ITEM_KIND_CONSUMABLE,  # tentative de changement
            category=CATEGORY_PIECES_ELEMENTAIRES,
            name="Renamed",
            installation=INSTALLATION_LMJ,
        )
        update_item(mock_stock_catalog_repository, modified)
        # Le service force kind à la valeur en base avant validation
        assert modified.kind == ITEM_KIND_ELEMENT


class TestPatchItem:
    @pytest.mark.unit
    def test_patch_ignores_unknown_fields(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_stock_catalog_repository.update.return_value = sample_consumable_bean

        patch_item(
            mock_stock_catalog_repository,
            sample_consumable_bean.uuid,
            {"unknown_field": "ignored", "remarques": "Note"},
        )
        # Pas de crash = OK ; le repository est appelé avec le bean fusionné.
        mock_stock_catalog_repository.update.assert_called_once()

    @pytest.mark.unit
    def test_patch_kind_field_silently_ignored(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        # `kind` n'est pas dans ALLOWED_PATCH_FIELDS → ignoré silencieusement.
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_stock_catalog_repository.update.return_value = sample_consumable_bean

        patch_item(
            mock_stock_catalog_repository,
            sample_consumable_bean.uuid,
            {"kind": ITEM_KIND_ELEMENT},
        )
        # Le bean fusionné conserve son kind d'origine.
        assert sample_consumable_bean.kind == ITEM_KIND_CONSUMABLE


class TestSoftDelete:
    @pytest.mark.unit
    def test_soft_delete_success(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_stock_catalog_repository.is_referenced_by_assembly.return_value = False
        mock_stock_catalog_repository.soft_delete.return_value = True

        assert soft_delete_item(
            mock_stock_catalog_repository, sample_consumable_bean.uuid
        )

    @pytest.mark.unit
    def test_soft_delete_rejected_if_referenced(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_stock_catalog_repository.is_referenced_by_assembly.return_value = True

        with pytest.raises(ValidationException) as exc:
            soft_delete_item(mock_stock_catalog_repository, sample_consumable_bean.uuid)
        assert exc.value.field == ERROR_CODE_CATALOG_ITEM_IN_USE

    @pytest.mark.unit
    def test_soft_delete_not_found(self, mock_stock_catalog_repository):
        mock_stock_catalog_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            soft_delete_item(mock_stock_catalog_repository, "missing-uuid")


class TestCreateStructurationBatch:
    """Création par lot de structurations : le service valide et délègue
    l'allocation (numérotation atomique + verrouillée) au repository."""

    @staticmethod
    def _setup(repo):
        # Simule l'attribution séquentielle des numéros côté repository.
        repo.create_structuration_batch.side_effect = lambda template, quantity: [
            replace(template, name=str(i + 1)) for i in range(quantity)
        ]

    @pytest.mark.unit
    def test_builds_validated_template_and_delegates(
        self, mock_stock_catalog_repository
    ):
        self._setup(mock_stock_catalog_repository)
        result = create_structuration_batch(
            mock_stock_catalog_repository,
            structuration_type=STRUCTURATION_TYPE_STANDARD,
            installation=INSTALLATION_LMJ,
            quantity=3,
        )
        assert len(result) == 3
        mock_stock_catalog_repository.create_structuration_batch.assert_called_once()
        template, quantity = (
            mock_stock_catalog_repository.create_structuration_batch.call_args[0]
        )
        assert quantity == 3
        assert template.kind == ITEM_KIND_ELEMENT
        assert template.category == CATEGORY_STRUCTURATION
        assert template.structuration_type == STRUCTURATION_TYPE_STANDARD
        assert template.installation == INSTALLATION_LMJ
        assert template.status == ELEMENT_STATUS_DISPO

    @pytest.mark.unit
    def test_fsec_is_optional(self, mock_stock_catalog_repository):
        self._setup(mock_stock_catalog_repository)
        create_structuration_batch(
            mock_stock_catalog_repository,
            structuration_type=STRUCTURATION_TYPE_STANDARD,
            installation=INSTALLATION_LMJ,
            quantity=1,
            fsec_name=None,
        )
        template = mock_stock_catalog_repository.create_structuration_batch.call_args[
            0
        ][0]
        assert template.fsec_name is None

    @pytest.mark.unit
    def test_propagates_common_fields(self, mock_stock_catalog_repository):
        self._setup(mock_stock_catalog_repository)
        create_structuration_batch(
            mock_stock_catalog_repository,
            structuration_type=STRUCTURATION_TYPE_SPECIALE,
            installation=INSTALLATION_LMJ,
            quantity=2,
            materiaux_mat="Cu/Au",
            fournisseur="CEA Valduc",
        )
        template = mock_stock_catalog_repository.create_structuration_batch.call_args[
            0
        ][0]
        assert template.materiaux_mat == "Cu/Au"
        assert template.fournisseur == "CEA Valduc"

    @pytest.mark.unit
    @pytest.mark.parametrize("quantity", [0, -1, STRUCTURATION_BATCH_MAX + 1])
    def test_rejects_invalid_quantity(self, quantity, mock_stock_catalog_repository):
        self._setup(mock_stock_catalog_repository)
        with pytest.raises(ValidationException) as exc:
            create_structuration_batch(
                mock_stock_catalog_repository,
                structuration_type=STRUCTURATION_TYPE_STANDARD,
                installation=INSTALLATION_LMJ,
                quantity=quantity,
            )
        assert exc.value.field == "quantity"
        mock_stock_catalog_repository.create_structuration_batch.assert_not_called()

    @pytest.mark.unit
    def test_rejects_invalid_structuration_type(self, mock_stock_catalog_repository):
        self._setup(mock_stock_catalog_repository)
        with pytest.raises(ValidationException) as exc:
            create_structuration_batch(
                mock_stock_catalog_repository,
                structuration_type="bogus",
                installation=INSTALLATION_LMJ,
                quantity=2,
            )
        assert exc.value.field == "structuration_type"
        mock_stock_catalog_repository.create_structuration_batch.assert_not_called()

    @pytest.mark.unit
    def test_propagates_matiere_masse(self, mock_stock_catalog_repository):
        """R03 : matiere/masse_mg sont propagés au template du paquet."""
        self._setup(mock_stock_catalog_repository)
        create_structuration_batch(
            mock_stock_catalog_repository,
            structuration_type=STRUCTURATION_TYPE_EC,
            installation=INSTALLATION_LMJ,
            quantity=2,
            matiere="Cuivre OFHC",
            masse_mg=0.45,
        )
        template = mock_stock_catalog_repository.create_structuration_batch.call_args[
            0
        ][0]
        assert template.matiere == "Cuivre OFHC"
        assert template.masse_mg == 0.45


class TestMatiereMasseFields:
    """R03 : règles métier des champs Matière / Masse [mg]."""

    @pytest.mark.unit
    def test_create_element_accepts_matiere_masse(
        self, sample_element_bean, mock_stock_catalog_repository
    ):
        bean = replace(sample_element_bean, matiere="Cuivre OFHC", masse_mg=0.45)
        mock_stock_catalog_repository.create.return_value = bean
        create_item(mock_stock_catalog_repository, bean)
        created = mock_stock_catalog_repository.create.call_args[0][0]
        assert created.matiere == "Cuivre OFHC"
        assert created.masse_mg == 0.45

    @pytest.mark.unit
    def test_create_consumable_rejects_matiere(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        bean = replace(sample_consumable_bean, matiere="Cuivre OFHC")
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "matiere"
        mock_stock_catalog_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_create_consumable_rejects_masse_mg(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        bean = replace(sample_consumable_bean, masse_mg=12.5)
        with pytest.raises(ValidationException) as exc:
            create_item(mock_stock_catalog_repository, bean)
        assert exc.value.field == "masse_mg"
        mock_stock_catalog_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_patch_matiere_masse_merged_into_bean(
        self, sample_element_bean, mock_stock_catalog_repository
    ):
        """matiere/masse_mg sont dans ALLOWED_PATCH_FIELDS → fusionnés et persistés."""
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_stock_catalog_repository.update.return_value = sample_element_bean

        patch_item(
            mock_stock_catalog_repository,
            sample_element_bean.uuid,
            {"matiere": "Or 24k", "masse_mg": 1250.0},
        )
        updated = mock_stock_catalog_repository.update.call_args[0][0]
        assert updated.matiere == "Or 24k"
        assert updated.masse_mg == 1250.0

    @pytest.mark.unit
    def test_patch_consumable_with_matiere_rejected(
        self, sample_consumable_bean, mock_stock_catalog_repository
    ):
        """La re-validation post-fusion refuse matiere sur un consommable."""
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        with pytest.raises(ValidationException) as exc:
            patch_item(
                mock_stock_catalog_repository,
                sample_consumable_bean.uuid,
                {"matiere": "Cuivre OFHC"},
            )
        assert exc.value.field == "matiere"
        mock_stock_catalog_repository.update.assert_not_called()
