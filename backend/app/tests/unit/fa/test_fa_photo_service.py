"""Tests unitaires du service galerie photos FA (fa_photo_service).

Repositories mockés (Mock(spec=...)) : on teste la logique métier du service
(ownership, garde-fou FA existante, délégation), pas l'ORM.
"""

from datetime import datetime
from unittest.mock import Mock
from uuid import uuid4

import pytest

from app.domain.exceptions import NotFoundException
from app.domain.fa.interface.fa_photo_repository import IFaPhotoRepository
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.models.fa_bean import FaBean
from app.domain.fa.models.fa_photo_bean import FaPhotoBean
from app.domain.fa.services.fa_photo_service import (
    add_fa_photo,
    delete_fa_photo,
    list_fa_photos,
)


def _photo(uuid=None, fa_uuid=None, order=0):
    return FaPhotoBean(
        uuid=str(uuid or uuid4()),
        fa_uuid=str(fa_uuid or uuid4()),
        image_url="/api/media/fa/photos/x.jpg",
        caption=None,
        order=order,
        created_at=datetime(2026, 1, 1),
    )


@pytest.fixture
def photo_repo():
    return Mock(spec=IFaPhotoRepository)


@pytest.fixture
def fa_repo():
    return Mock(spec=IFaRepository)


@pytest.mark.unit
class TestListFaPhotos:
    def test_returns_repository_list(self, photo_repo):
        fa_uuid = str(uuid4())
        photos = [_photo(fa_uuid=fa_uuid, order=0), _photo(fa_uuid=fa_uuid, order=1)]
        photo_repo.list_by_fa.return_value = photos

        assert list_fa_photos(photo_repo, fa_uuid) == photos

    def test_empty_when_none(self, photo_repo):
        photo_repo.list_by_fa.return_value = []
        assert list_fa_photos(photo_repo, str(uuid4())) == []

    def test_calls_repo_with_fa_uuid(self, photo_repo):
        photo_repo.list_by_fa.return_value = []
        fa_uuid = str(uuid4())

        list_fa_photos(photo_repo, fa_uuid)

        photo_repo.list_by_fa.assert_called_once_with(fa_uuid)


@pytest.mark.unit
class TestAddFaPhoto:
    def test_success_returns_added_photo(self, photo_repo, fa_repo):
        fa_uuid = str(uuid4())
        fa_repo.get_by_uuid.return_value = FaBean(uuid=fa_uuid)
        expected = _photo(fa_uuid=fa_uuid)
        photo_repo.add.return_value = expected
        image = Mock()

        result = add_fa_photo(photo_repo, fa_repo, fa_uuid, image, caption="cap")

        assert result is expected
        photo_repo.add.assert_called_once_with(fa_uuid, image, "cap")

    def test_default_caption_is_none(self, photo_repo, fa_repo):
        fa_uuid = str(uuid4())
        fa_repo.get_by_uuid.return_value = FaBean(uuid=fa_uuid)
        photo_repo.add.return_value = _photo(fa_uuid=fa_uuid)
        image = Mock()

        add_fa_photo(photo_repo, fa_repo, fa_uuid, image)

        photo_repo.add.assert_called_once_with(fa_uuid, image, None)

    def test_raises_not_found_when_fa_missing(self, photo_repo, fa_repo):
        fa_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc:
            add_fa_photo(photo_repo, fa_repo, str(uuid4()), Mock())

        assert exc.value.resource == "FA"

    def test_does_not_add_when_fa_missing(self, photo_repo, fa_repo):
        fa_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            add_fa_photo(photo_repo, fa_repo, str(uuid4()), Mock())

        photo_repo.add.assert_not_called()


@pytest.mark.unit
class TestDeleteFaPhoto:
    def test_success_deletes(self, photo_repo):
        fa_uuid = str(uuid4())
        photo_uuid = str(uuid4())
        photo_repo.get_by_uuid.return_value = _photo(uuid=photo_uuid, fa_uuid=fa_uuid)

        delete_fa_photo(photo_repo, fa_uuid, photo_uuid)

        photo_repo.delete.assert_called_once_with(photo_uuid)

    def test_ownership_is_case_insensitive(self, photo_repo):
        """Un fa_uuid d'URL en majuscules vise bien la photo (pas de faux 404)."""
        fa_uuid = str(uuid4())
        photo_uuid = str(uuid4())
        photo_repo.get_by_uuid.return_value = _photo(uuid=photo_uuid, fa_uuid=fa_uuid)

        delete_fa_photo(photo_repo, fa_uuid.upper(), photo_uuid)

        photo_repo.delete.assert_called_once_with(photo_uuid)

    def test_raises_not_found_when_photo_missing(self, photo_repo):
        photo_repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException):
            delete_fa_photo(photo_repo, str(uuid4()), str(uuid4()))

        photo_repo.delete.assert_not_called()

    def test_raises_not_found_when_photo_belongs_to_other_fa(self, photo_repo):
        """Une photo d'une autre FA ne peut pas être supprimée via cette FA."""
        photo_uuid = str(uuid4())
        photo_repo.get_by_uuid.return_value = _photo(
            uuid=photo_uuid, fa_uuid=str(uuid4())
        )

        with pytest.raises(NotFoundException):
            delete_fa_photo(photo_repo, str(uuid4()), photo_uuid)

        photo_repo.delete.assert_not_called()
