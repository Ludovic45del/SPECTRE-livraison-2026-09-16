"""Tests unitaires du service fsec_assembly Stock (cf. CDC §4.2, §4.3, §5.3)."""

import uuid

import pytest

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.fsec.models.fsec_bean import FsecBean
from app.domain.stock.models.fsec_assembly_item_bean import FsecAssemblyItemBean
from app.domain.stock.models.stock_constants import (
    ELEMENT_STATUS_AFFECTEE,
    ELEMENT_STATUS_DISPO,
    ELEMENT_STATUS_RESERVEE,
    ELEMENT_STATUS_TIREE,
    ERROR_CODE_FSEC_LOCKED,
    FSEC_STATUS_ID_EN_COURS_ASSEMBLAGE,
    FSEC_STATUS_ID_TIREE,
)
from app.domain.stock.services.fsec_assembly_service import (
    add_assembly_item,
    patch_assembly_item,
    remove_assembly_item,
)


class TestAddAssemblyItem:
    @pytest.mark.unit
    def test_add_element_reserves_it(
        self,
        sample_element_bean,
        sample_assembly_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.return_value = False
        mock_fsec_assembly_repository.create.return_value = sample_assembly_bean

        result = add_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_catalog_repository,
            mock_stock_fsec_repository,
            stock_fsec_uuid,
            sample_element_bean.uuid,
        )
        assert result.uuid == sample_assembly_bean.uuid
        # R09 : la réservation renseigne fsec_name avec le nom de la FSEC active.
        mock_stock_catalog_repository.patch.assert_called_once_with(
            sample_element_bean.uuid,
            {"status": ELEMENT_STATUS_RESERVEE, "fsec_name": "FSEC Test"},
        )
        # FSEC au statut 0 (Design) → pas de promotion immédiate.
        mock_stock_catalog_repository.update_status_for_uuids.assert_not_called()
        mock_fsec_assembly_repository.create.assert_called_once()

    @pytest.mark.unit
    def test_add_element_on_started_fsec_promotes_to_affectee(
        self,
        sample_element_bean,
        sample_assembly_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        """R09 : ajout sur une FSEC déjà « En cours d'assemblage » (statut 1)
        → l'élément est promu immédiatement en 'affectee'."""
        fsec = mock_stock_fsec_repository.get_active_by_fsec_uuid.return_value
        fsec.status_id = FSEC_STATUS_ID_EN_COURS_ASSEMBLAGE
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.return_value = False
        mock_fsec_assembly_repository.create.return_value = sample_assembly_bean

        add_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_catalog_repository,
            mock_stock_fsec_repository,
            stock_fsec_uuid,
            sample_element_bean.uuid,
        )
        mock_stock_catalog_repository.update_status_for_uuids.assert_called_once_with(
            [sample_element_bean.uuid], ELEMENT_STATUS_AFFECTEE
        )

    @pytest.mark.unit
    def test_add_consumable_does_not_reserve(
        self,
        sample_consumable_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.return_value = False
        mock_fsec_assembly_repository.create.return_value = FsecAssemblyItemBean(
            uuid=str(uuid.uuid4()),
            fsec_uuid=stock_fsec_uuid,
            catalog_item_uuid=sample_consumable_bean.uuid,
        )
        add_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_catalog_repository,
            mock_stock_fsec_repository,
            stock_fsec_uuid,
            sample_consumable_bean.uuid,
        )
        # Pas de reservation pour les consommables
        mock_stock_catalog_repository.patch.assert_not_called()
        mock_stock_catalog_repository.update_status_for_uuids.assert_not_called()

    @pytest.mark.unit
    def test_add_same_consumable_twice_creates_two_rows(
        self,
        sample_consumable_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        """R20 : un consommable déjà présent peut être ré-ajouté (pas d'anti-doublon)."""
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_consumable_bean
        # Une ligne existe déjà pour ce consommable sur cette FSEC
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.return_value = True
        mock_fsec_assembly_repository.create.return_value = FsecAssemblyItemBean(
            uuid=str(uuid.uuid4()),
            fsec_uuid=stock_fsec_uuid,
            catalog_item_uuid=sample_consumable_bean.uuid,
            remarque="Seconde application",
        )
        result = add_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_catalog_repository,
            mock_stock_fsec_repository,
            stock_fsec_uuid,
            sample_consumable_bean.uuid,
            remarque="Seconde application",
        )
        assert result.remarque == "Seconde application"
        mock_fsec_assembly_repository.create.assert_called_once()
        # L'anti-doublon n'est même pas consulté pour un consommable
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.assert_not_called()

    @pytest.mark.unit
    def test_add_refused_when_fsec_locked(
        self,
        sample_element_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        # FSEC au statut Tirée
        mock_stock_fsec_repository.get_active_by_fsec_uuid.return_value = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=stock_fsec_uuid,
            campaign_id=None,
            status_id=FSEC_STATUS_ID_TIREE,
            category_id=0,
            rack_id=0,
            name="Tirée",
            is_active=True,
        )
        with pytest.raises(ConflictException) as exc:
            add_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_catalog_repository,
                mock_stock_fsec_repository,
                stock_fsec_uuid,
                sample_element_bean.uuid,
            )
        assert exc.value.field == ERROR_CODE_FSEC_LOCKED

    @pytest.mark.unit
    def test_add_refused_if_duplicate_element(
        self,
        sample_element_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        """R20 : l'anti-doublon reste strict pour les éléments sérialisés."""
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_fsec_assembly_repository.exists_by_fsec_and_catalog.return_value = True
        with pytest.raises(ConflictException):
            add_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_catalog_repository,
                mock_stock_fsec_repository,
                stock_fsec_uuid,
                sample_element_bean.uuid,
            )
        mock_fsec_assembly_repository.create.assert_not_called()

    @pytest.mark.unit
    def test_add_unknown_catalog_item_raises(
        self,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        mock_stock_catalog_repository.get_by_uuid.return_value = None
        with pytest.raises(NotFoundException):
            add_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_catalog_repository,
                mock_stock_fsec_repository,
                stock_fsec_uuid,
                "missing",
            )


class TestPatchAssemblyItem:
    @pytest.mark.unit
    def test_patch_only_allowed_fields(
        self,
        sample_assembly_bean,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
    ):
        mock_fsec_assembly_repository.get_by_uuid.return_value = sample_assembly_bean
        mock_fsec_assembly_repository.patch.return_value = sample_assembly_bean

        patch_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_fsec_repository,
            sample_assembly_bean.uuid,
            {"sort_order": 5, "remarque": "Note", "fsec_uuid": "should-be-ignored"},
        )
        # sanitization : seuls sort_order et remarque sont passés au repository
        called_args = mock_fsec_assembly_repository.patch.call_args
        passed_fields = called_args[0][1]
        assert "fsec_uuid" not in passed_fields
        assert "sort_order" in passed_fields
        assert "remarque" in passed_fields

    @pytest.mark.unit
    def test_patch_refused_when_fsec_locked(
        self,
        sample_assembly_bean,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        mock_fsec_assembly_repository.get_by_uuid.return_value = sample_assembly_bean
        mock_stock_fsec_repository.get_active_by_fsec_uuid.return_value = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=stock_fsec_uuid,
            campaign_id=None,
            status_id=FSEC_STATUS_ID_TIREE,
            category_id=0,
            rack_id=0,
            name="Tirée",
            is_active=True,
        )
        with pytest.raises(ConflictException):
            patch_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_fsec_repository,
                sample_assembly_bean.uuid,
                {"sort_order": 1},
            )


class TestRemoveAssemblyItem:
    @pytest.mark.unit
    def test_remove_releases_element(
        self,
        sample_assembly_bean,
        sample_element_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
    ):
        sample_element_bean.status = ELEMENT_STATUS_RESERVEE
        mock_fsec_assembly_repository.get_by_uuid.return_value = sample_assembly_bean
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean
        mock_fsec_assembly_repository.delete.return_value = True

        assert remove_assembly_item(
            mock_fsec_assembly_repository,
            mock_stock_catalog_repository,
            mock_stock_fsec_repository,
            sample_assembly_bean.uuid,
        )
        # release_element : status DISPO et fsec_name vidé (R09)
        mock_stock_catalog_repository.patch.assert_called_once_with(
            sample_element_bean.uuid,
            {"status": ELEMENT_STATUS_DISPO, "fsec_name": None},
        )

    @pytest.mark.unit
    def test_remove_refuses_if_element_tiree(
        self,
        sample_assembly_bean,
        sample_element_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
    ):
        sample_element_bean.status = ELEMENT_STATUS_TIREE
        mock_fsec_assembly_repository.get_by_uuid.return_value = sample_assembly_bean
        mock_stock_catalog_repository.get_by_uuid.return_value = sample_element_bean

        with pytest.raises(ValidationException):
            remove_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_catalog_repository,
                mock_stock_fsec_repository,
                sample_assembly_bean.uuid,
            )
        mock_fsec_assembly_repository.delete.assert_not_called()

    @pytest.mark.unit
    def test_remove_refused_when_fsec_locked(
        self,
        sample_assembly_bean,
        mock_stock_catalog_repository,
        mock_fsec_assembly_repository,
        mock_stock_fsec_repository,
        stock_fsec_uuid,
    ):
        mock_fsec_assembly_repository.get_by_uuid.return_value = sample_assembly_bean
        mock_stock_fsec_repository.get_active_by_fsec_uuid.return_value = FsecBean(
            version_uuid=str(uuid.uuid4()),
            fsec_uuid=stock_fsec_uuid,
            campaign_id=None,
            status_id=FSEC_STATUS_ID_TIREE,
            category_id=0,
            rack_id=0,
            name="Tirée",
            is_active=True,
        )
        with pytest.raises(ConflictException):
            remove_assembly_item(
                mock_fsec_assembly_repository,
                mock_stock_catalog_repository,
                mock_stock_fsec_repository,
                sample_assembly_bean.uuid,
            )
