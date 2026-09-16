"""Tests unitaires du service LabContact (annuaire des laboratoires).

Logique métier pure (normalisation, validation du nom / téléphone, not found),
isolée du repository via un mock autospec sur l'interface. Aucune dépendance BD.
"""

from unittest.mock import create_autospec

import pytest

from app.domain.exceptions import NotFoundException, ValidationException
from app.domain.labcontact.interface.lab_contact_repository import ILabContactRepository
from app.domain.labcontact.models.lab_contact_bean import LabContactBean
from app.domain.labcontact.services import lab_contact_service as svc

CONTACT_UUID = "77777777-7777-4777-8777-777777777777"


@pytest.fixture
def repo():
    return create_autospec(ILabContactRepository, instance=True)


@pytest.fixture
def valid_contact():
    return LabContactBean(
        uuid=CONTACT_UUID,
        name="Labo 426",
        phone="426",
        comment="Salle blanche",
    )


# ---------------------------------------------------------------------------
# Lectures (délégation pure)
# ---------------------------------------------------------------------------


class TestReads:
    @pytest.mark.unit
    def test_get_all_contacts_delegates(self, repo, valid_contact):
        repo.get_all.return_value = [valid_contact]

        result = svc.get_all_contacts(repo)

        assert result == [valid_contact]
        repo.get_all.assert_called_once_with()

    @pytest.mark.unit
    def test_get_contact_by_uuid_success(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact

        assert svc.get_contact_by_uuid(repo, CONTACT_UUID) is valid_contact
        repo.get_by_uuid.assert_called_once_with(CONTACT_UUID)

    @pytest.mark.unit
    def test_get_contact_by_uuid_missing_raises_not_found(self, repo):
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            svc.get_contact_by_uuid(repo, "nope")

        # Le nom de ressource pilote le code API (LAB_CONTACT_NOT_FOUND).
        assert exc_info.value.resource == "LAB_CONTACT"
        assert exc_info.value.identifier == "nope"


# ---------------------------------------------------------------------------
# Création
# ---------------------------------------------------------------------------


class TestCreateContact:
    @pytest.mark.unit
    def test_create_contact_success(self, repo, valid_contact):
        repo.create.return_value = valid_contact

        result = svc.create_contact(repo, valid_contact)

        assert result is valid_contact
        repo.create.assert_called_once_with(valid_contact)

    @pytest.mark.unit
    def test_create_contact_normalizes_whitespace(self, repo):
        bean = LabContactBean(name="  Labo 215  ", phone=" 215 ", comment="  note ")
        repo.create.side_effect = lambda b: b

        result = svc.create_contact(repo, bean)

        assert result.name == "Labo 215"
        assert result.phone == "215"
        assert result.comment == "note"

    @pytest.mark.unit
    def test_create_contact_none_optional_fields_become_empty(self, repo):
        bean = LabContactBean(name="Gardiennage", phone=None, comment=None)  # type: ignore[arg-type]
        repo.create.side_effect = lambda b: b

        result = svc.create_contact(repo, bean)

        assert result.phone == ""
        assert result.comment == ""

    @pytest.mark.unit
    @pytest.mark.parametrize("name", ["", "   ", None])
    def test_create_contact_blank_name_raises(self, repo, name):
        bean = LabContactBean(name=name, phone="426")  # type: ignore[arg-type]

        with pytest.raises(ValidationException) as exc_info:
            svc.create_contact(repo, bean)

        assert exc_info.value.field == "name"
        repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_contact_name_too_long_raises(self, repo):
        bean = LabContactBean(name="x" * (svc.LAB_CONTACT_NAME_MAX_LENGTH + 1))

        with pytest.raises(ValidationException) as exc_info:
            svc.create_contact(repo, bean)

        assert exc_info.value.field == "name"
        repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_contact_name_at_max_length_accepted(self, repo):
        bean = LabContactBean(name="x" * svc.LAB_CONTACT_NAME_MAX_LENGTH)
        repo.create.side_effect = lambda b: b

        assert svc.create_contact(repo, bean).name == bean.name

    @pytest.mark.unit
    def test_create_contact_phone_too_long_raises(self, repo):
        bean = LabContactBean(
            name="Labo", phone="9" * (svc.LAB_CONTACT_PHONE_MAX_LENGTH + 1)
        )

        with pytest.raises(ValidationException) as exc_info:
            svc.create_contact(repo, bean)

        assert exc_info.value.field == "phone"
        repo.create.assert_not_called()

    @pytest.mark.unit
    def test_create_contact_phone_optional(self, repo):
        bean = LabContactBean(name="Accueil", phone="")
        repo.create.side_effect = lambda b: b

        result = svc.create_contact(repo, bean)

        assert result.phone == ""
        repo.create.assert_called_once()


# ---------------------------------------------------------------------------
# Mise à jour
# ---------------------------------------------------------------------------


class TestUpdateContact:
    @pytest.mark.unit
    def test_update_contact_success(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        incoming = LabContactBean(
            uuid=CONTACT_UUID, name=" Labo 426 bis ", phone="4260"
        )
        repo.update.return_value = incoming

        result = svc.update_contact(repo, incoming)

        assert result is incoming
        assert incoming.name == "Labo 426 bis"
        repo.get_by_uuid.assert_called_once_with(CONTACT_UUID)
        repo.update.assert_called_once_with(incoming)

    @pytest.mark.unit
    def test_update_contact_without_uuid_raises(self, repo):
        bean = LabContactBean(uuid="", name="Labo")

        with pytest.raises(ValidationException) as exc_info:
            svc.update_contact(repo, bean)

        assert exc_info.value.field == "uuid"
        repo.update.assert_not_called()

    @pytest.mark.unit
    def test_update_contact_missing_raises_not_found(self, repo):
        repo.get_by_uuid.return_value = None
        bean = LabContactBean(uuid="nope", name="Labo")

        with pytest.raises(NotFoundException):
            svc.update_contact(repo, bean)

        repo.update.assert_not_called()

    @pytest.mark.unit
    def test_update_contact_blank_name_raises(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        bean = LabContactBean(uuid=CONTACT_UUID, name="   ")

        with pytest.raises(ValidationException):
            svc.update_contact(repo, bean)

        repo.update.assert_not_called()


# ---------------------------------------------------------------------------
# Suppression
# ---------------------------------------------------------------------------


class TestDeleteContact:
    @pytest.mark.unit
    def test_delete_contact_success(self, repo):
        repo.delete.return_value = True

        svc.delete_contact(repo, CONTACT_UUID)

        repo.delete.assert_called_once_with(CONTACT_UUID)

    @pytest.mark.unit
    def test_delete_contact_missing_raises_not_found(self, repo):
        repo.delete.return_value = False

        with pytest.raises(NotFoundException):
            svc.delete_contact(repo, "nope")


# ---------------------------------------------------------------------------
# Mise à jour partielle (PATCH)
# ---------------------------------------------------------------------------


class TestPatchContact:
    @pytest.mark.unit
    def test_patch_contact_updates_only_provided_fields(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        repo.update.side_effect = lambda b: b

        result = svc.patch_contact(repo, CONTACT_UUID, {"phone": "4260"})

        # Les champs absents du payload sont conservés.
        assert result.uuid == CONTACT_UUID
        assert result.name == "Labo 426"
        assert result.phone == "4260"
        assert result.comment == "Salle blanche"
        repo.get_by_uuid.assert_called_once_with(CONTACT_UUID)
        repo.update.assert_called_once_with(valid_contact)

    @pytest.mark.unit
    def test_patch_contact_normalizes_whitespace(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        repo.update.side_effect = lambda b: b

        result = svc.patch_contact(
            repo, CONTACT_UUID, {"name": "  Labo 426 bis ", "comment": " note "}
        )

        assert result.name == "Labo 426 bis"
        assert result.comment == "note"

    @pytest.mark.unit
    def test_patch_contact_can_clear_optional_fields(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        repo.update.side_effect = lambda b: b

        result = svc.patch_contact(repo, CONTACT_UUID, {"phone": "", "comment": ""})

        assert result.phone == ""
        assert result.comment == ""
        assert result.name == "Labo 426"

    @pytest.mark.unit
    def test_patch_contact_empty_payload_is_noop(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact
        repo.update.side_effect = lambda b: b

        result = svc.patch_contact(repo, CONTACT_UUID, {})

        assert result == valid_contact
        repo.update.assert_called_once_with(valid_contact)

    @pytest.mark.unit
    def test_patch_contact_ignores_protected_and_unknown_fields(
        self, repo, valid_contact
    ):
        repo.get_by_uuid.return_value = valid_contact
        repo.update.side_effect = lambda b: b

        result = svc.patch_contact(
            repo,
            CONTACT_UUID,
            {"uuid": "hacked", "created_at": "hacked", "inconnu": 1, "phone": "1"},
        )

        assert result.uuid == CONTACT_UUID
        assert result.created_at is None
        assert not hasattr(result, "inconnu")
        assert result.phone == "1"

    @pytest.mark.unit
    def test_patch_contact_without_uuid_raises(self, repo):
        with pytest.raises(ValidationException) as exc_info:
            svc.patch_contact(repo, "", {"name": "Labo"})

        assert exc_info.value.field == "uuid"
        repo.get_by_uuid.assert_not_called()
        repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_contact_missing_raises_not_found(self, repo):
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            svc.patch_contact(repo, "nope", {"name": "Labo"})

        assert exc_info.value.resource == "LAB_CONTACT"
        repo.update.assert_not_called()

    @pytest.mark.unit
    @pytest.mark.parametrize("name", ["", "   "])
    def test_patch_contact_blank_name_raises(self, repo, valid_contact, name):
        repo.get_by_uuid.return_value = valid_contact

        with pytest.raises(ValidationException) as exc_info:
            svc.patch_contact(repo, CONTACT_UUID, {"name": name})

        assert exc_info.value.field == "name"
        repo.update.assert_not_called()

    @pytest.mark.unit
    def test_patch_contact_phone_too_long_raises(self, repo, valid_contact):
        repo.get_by_uuid.return_value = valid_contact

        with pytest.raises(ValidationException) as exc_info:
            svc.patch_contact(
                repo,
                CONTACT_UUID,
                {"phone": "9" * (svc.LAB_CONTACT_PHONE_MAX_LENGTH + 1)},
            )

        assert exc_info.value.field == "phone"
        repo.update.assert_not_called()
