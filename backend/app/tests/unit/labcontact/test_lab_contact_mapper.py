"""Tests unitaires du mapper LabContact (Entity ↔ Bean ↔ API).

Les entités sont instanciées en mémoire (pas de sauvegarde) : aucune BD requise.
"""

import uuid as uuid_lib
from datetime import datetime, timezone

import pytest

from app.domain.labcontact.models.lab_contact_bean import LabContactBean
from app.mapper.labcontact.lab_contact_mapper import (
    lab_contact_api_to_bean,
    lab_contact_bean_to_api,
    lab_contact_bean_to_entity,
    lab_contact_beans_to_api,
    lab_contact_entity_to_bean,
    lab_contact_update_entity_from_bean,
)
from app.repository.labcontact.models.lab_contact_entity import LabContactEntity

CONTACT_UUID = uuid_lib.UUID("77777777-7777-4777-8777-777777777777")
CREATED = datetime(2026, 8, 30, 10, 0, tzinfo=timezone.utc)


@pytest.mark.unit
def test_entity_to_bean_copies_all_fields():
    entity = LabContactEntity(
        uuid=CONTACT_UUID, name="Labo 426", phone="426", comment="Salle blanche"
    )
    entity.created_at = CREATED
    entity.updated_at = CREATED

    bean = lab_contact_entity_to_bean(entity)

    assert bean.uuid == str(CONTACT_UUID)
    assert bean.name == "Labo 426"
    assert bean.phone == "426"
    assert bean.comment == "Salle blanche"
    assert bean.created_at == CREATED
    assert bean.updated_at == CREATED


@pytest.mark.unit
def test_entity_to_bean_none_text_fields_become_empty():
    entity = LabContactEntity(uuid=CONTACT_UUID, name="Labo", phone=None, comment=None)

    bean = lab_contact_entity_to_bean(entity)

    assert bean.phone == ""
    assert bean.comment == ""


@pytest.mark.unit
def test_bean_to_entity_without_uuid_generates_one():
    bean = LabContactBean(name="Labo 215", phone="215", comment="")

    entity = lab_contact_bean_to_entity(bean)

    assert entity.uuid is not None
    assert entity.name == "Labo 215"
    assert entity.phone == "215"
    assert entity.comment == ""


@pytest.mark.unit
def test_bean_to_entity_keeps_provided_uuid():
    bean = LabContactBean(uuid=str(CONTACT_UUID), name="Labo")

    entity = lab_contact_bean_to_entity(bean)

    assert str(entity.uuid) == str(CONTACT_UUID)


@pytest.mark.unit
def test_update_entity_from_bean_does_not_touch_uuid():
    entity = LabContactEntity(uuid=CONTACT_UUID, name="Ancien", phone="1", comment="a")
    bean = LabContactBean(uuid="ignored", name="Nouveau", phone="2", comment="b")

    lab_contact_update_entity_from_bean(entity, bean)

    assert entity.uuid == CONTACT_UUID
    assert entity.name == "Nouveau"
    assert entity.phone == "2"
    assert entity.comment == "b"


@pytest.mark.unit
def test_api_to_bean_defaults_optional_fields():
    bean = lab_contact_api_to_bean({"name": "Accueil"})

    assert bean.uuid == ""
    assert bean.name == "Accueil"
    assert bean.phone == ""
    assert bean.comment == ""


@pytest.mark.unit
def test_api_to_bean_stringifies_uuid():
    bean = lab_contact_api_to_bean(
        {"uuid": CONTACT_UUID, "name": "Accueil", "phone": None, "comment": None}
    )

    assert bean.uuid == str(CONTACT_UUID)
    assert bean.phone == ""
    assert bean.comment == ""


@pytest.mark.unit
def test_bean_to_api_formats_dates_iso():
    bean = LabContactBean(
        uuid=str(CONTACT_UUID),
        name="Labo 426",
        phone="426",
        comment="",
        created_at=CREATED,
        updated_at=None,
    )

    payload = lab_contact_bean_to_api(bean)

    assert payload == {
        "uuid": str(CONTACT_UUID),
        "name": "Labo 426",
        "phone": "426",
        "comment": "",
        "created_at": CREATED.isoformat(),
        "updated_at": None,
    }


@pytest.mark.unit
def test_beans_to_api_maps_each_bean():
    beans = [LabContactBean(uuid="a", name="A"), LabContactBean(uuid="b", name="B")]

    payload = lab_contact_beans_to_api(beans)

    assert [item["uuid"] for item in payload] == ["a", "b"]
