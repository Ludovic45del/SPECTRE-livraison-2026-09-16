"""Tests unitaires du service alert Stock (cf. CDC §5.4)."""

from datetime import date

import pytest

from app.domain.stock.services.alert_service import StockAlertsBean, get_alerts


class TestGetAlerts:
    @pytest.mark.unit
    def test_get_alerts_aggregates_three_lists(
        self,
        sample_low_stock_consumable_bean,
        mock_stock_catalog_repository,
    ):
        mock_stock_catalog_repository.find_low_stock.return_value = [
            sample_low_stock_consumable_bean
        ]
        mock_stock_catalog_repository.find_expired.return_value = []
        mock_stock_catalog_repository.find_expiring_soon.return_value = []

        result = get_alerts(mock_stock_catalog_repository, today=date(2026, 4, 25))
        assert isinstance(result, StockAlertsBean)
        assert len(result.low_stock) == 1
        assert result.low_stock[0].uuid == sample_low_stock_consumable_bean.uuid
        assert result.expired == []
        assert result.expiring_soon == []

    @pytest.mark.unit
    def test_get_alerts_passes_today_to_repository(self, mock_stock_catalog_repository):
        mock_stock_catalog_repository.find_low_stock.return_value = []
        mock_stock_catalog_repository.find_expired.return_value = []
        mock_stock_catalog_repository.find_expiring_soon.return_value = []

        ref_today = date(2026, 4, 25)
        get_alerts(mock_stock_catalog_repository, today=ref_today, days_ahead=30)

        mock_stock_catalog_repository.find_expired.assert_called_once_with(ref_today)
        mock_stock_catalog_repository.find_expiring_soon.assert_called_once_with(
            ref_today, 30
        )
