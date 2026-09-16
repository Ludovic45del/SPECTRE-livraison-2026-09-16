"""Interface repository pour le module utilisateur."""

import abc
import uuid as uuid_lib
from typing import List, Optional

from app.domain.user.models.dashboard_preferences_bean import DashboardPreferencesBean
from app.domain.user.models.user_bean import UserBean


class IUserRepository(abc.ABC):

    @abc.abstractmethod
    def create(self, bean: UserBean, password: str) -> UserBean:
        """Cree un utilisateur avec son mot de passe et son profil."""
        pass

    @abc.abstractmethod
    def get_by_uuid(self, uuid: uuid_lib.UUID) -> Optional[UserBean]:
        pass

    @abc.abstractmethod
    def get_all(
        self,
        offset: int = 0,
        limit: int = 50,
        roles: Optional[List[str]] = None,
        is_active: Optional[bool] = None,
    ) -> List[UserBean]:
        pass

    @abc.abstractmethod
    def update(self, bean: UserBean) -> UserBean:
        """Met a jour les infos profil (role, nom, prenom). Pas le mot de passe."""
        pass

    @abc.abstractmethod
    def set_password(self, uuid: uuid_lib.UUID, new_password: str) -> None:
        pass

    @abc.abstractmethod
    def check_password(self, uuid: uuid_lib.UUID, password: str) -> bool:
        pass

    @abc.abstractmethod
    def set_force_password_change(self, uuid: uuid_lib.UUID, value: bool) -> None:
        pass

    @abc.abstractmethod
    def reset_password(self, uuid: uuid_lib.UUID, new_password: str) -> None:
        """Reset mot de passe + force_password_change en une seule transaction."""
        pass

    @abc.abstractmethod
    def toggle_active(self, uuid: uuid_lib.UUID) -> UserBean:
        """Inverse l'etat actif/inactif."""
        pass

    @abc.abstractmethod
    def set_avatar(self, uuid: uuid_lib.UUID, image_file) -> UserBean:
        """Remplace (image_file fourni) ou supprime (None) la photo de profil.

        L'ancien fichier physique est libéré avant la nouvelle assignation.
        """
        pass

    @abc.abstractmethod
    def set_signature(self, uuid: uuid_lib.UUID, image_file) -> UserBean:
        """Remplace (image_file fourni) ou supprime (None) la signature.

        L'ancien fichier physique est libéré avant la nouvelle assignation.
        """
        pass

    @abc.abstractmethod
    def exists_by_username(self, username: str) -> bool:
        pass

    @abc.abstractmethod
    def get_dashboard_preferences(
        self, uuid: uuid_lib.UUID
    ) -> DashboardPreferencesBean:
        pass

    @abc.abstractmethod
    def update_dashboard_preferences(
        self, uuid: uuid_lib.UUID, preferences: DashboardPreferencesBean
    ) -> DashboardPreferencesBean:
        pass
