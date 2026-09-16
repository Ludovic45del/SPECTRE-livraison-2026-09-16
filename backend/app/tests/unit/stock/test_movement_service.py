"""Tests unitaires du service movement Stock."""

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.stock.models.stock_constants import ERROR_CODE_INVALID_KIND_OPERATION
from app.domain.stock.services.movement_service import (
    create_movement,
    delete_movement_admin,
    get_movement,
    list_movements,
)


class TestCreateMovement:
    @pytest.mark.unit
    def test_create_movement_on_consumable_success(
        self,
        sample_consumable_bean,
        sample_movement_bean,
        mock_stock_catalog_repository,
        mock_stock_movement_repository,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_stock_movement_repository.create_with_quantity_update.return_value = (
            sample_movement_bean
        )
        result = create_movement(
            mock_stock_movement_repository,
            mock_stock_catalog_repository,
            sample_movement_bean,
        )
        assert result.uuid == sample_movement_bean.uuid
        mock_stock_movement_repository.create_with_quantity_update.assert_called_once()

    @pytest.mark.unit
    def test_create_movement_rejected_on_element(
        self,
        sample_element_bean,
        sample_movement_bean,
        mock_stock_catalog_repository,
        mock_stock_movement_repository,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        with pytest.raises(ValidationException) as exc:
            create_movement(
                mock_stock_movement_repository,
                mock_stock_catalog_repository,
                sample_movement_bean,
            )
        assert exc.value.field == ERROR_CODE_INVALID_KIND_OPERATION
        mock_stock_movement_repository.create_with_quantity_update.assert_not_called()

    @pytest.mark.unit
    def test_create_movement_unknown_catalog_item(
        self,
        sample_movement_bean,
        mock_stock_catalog_repository,
        mock_stock_movement_repository,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            create_movement(
                mock_stock_movement_repository,
                mock_stock_catalog_repository,
                sample_movement_bean,
            )


class TestGetMovement:
    @pytest.mark.unit
    def test_get_movement_found(
        self, sample_movement_bean, mock_stock_movement_repository
    ):
        mock_stock_movement_repository.get_by_uuid.return_value = sample_movement_bean
        result = get_movement(mock_stock_movement_repository, sample_movement_bean.uuid)
        assert result.uuid == sample_movement_bean.uuid

    @pytest.mark.unit
    def test_get_movement_not_found(self, mock_stock_movement_repository):
        mock_stock_movement_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            get_movement(mock_stock_movement_repository, "missing")


class TestListMovements:
    @pytest.mark.unit
    def test_list_movements_passes_filters(self, mock_stock_movement_repository):
        mock_stock_movement_repository.list_by_filters.return_value = []
        list_movements(
            mock_stock_movement_repository,
            catalog_item_uuid="abc",
            movement_type="entree",
            limit=5,
        )
        mock_stock_movement_repository.list_by_filters.assert_called_once()


class TestDeleteMovementAdmin:
    @pytest.mark.unit
    def test_delete_recomputes_quantity(
        self, sample_movement_bean, mock_stock_movement_repository
    ):
        mock_stock_movement_repository.get_by_uuid.return_value = sample_movement_bean
        mock_stock_movement_repository.delete_and_recompute.return_value = True
        assert delete_movement_admin(
            mock_stock_movement_repository, sample_movement_bean.uuid
        )
        mock_stock_movement_repository.delete_and_recompute.assert_called_once_with(
            sample_movement_bean.uuid
        )

    @pytest.mark.unit
    def test_delete_not_found(self, mock_stock_movement_repository):
        mock_stock_movement_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            delete_movement_admin(mock_stock_movement_repository, "missing")
