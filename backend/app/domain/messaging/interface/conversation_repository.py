"""Interface IConversationRepository — conversations, adhésions et non-lus."""

import abc
from datetime import datetime
from typing import List, Optional

from app.domain.messaging.models.conversation_bean import ConversationBean


class IConversationRepository(abc.ABC):
    """Contrat d'accès aux conversations.

    Les lectures hydratent `members`, `last_message` et, lorsqu'un utilisateur
    est fourni, `unread_count` pour cet utilisateur.
    """

    @abc.abstractmethod
    def get_all_for_user(self, user_uuid: str) -> List[ConversationBean]:
        """Conversations dont l'utilisateur est membre, triées par last_message_at desc
        (NULL en dernier) puis created_at desc.

        Hydrate members, last_message et unread_count (pour cet utilisateur) en un
        nombre de requêtes BORNÉ, indépendant du nombre de conversations.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_by_uuid(
        self, uuid: str, for_user_uuid: Optional[str] = None
    ) -> Optional[ConversationBean]:
        """Hydrate members et last_message ; unread_count pour for_user_uuid si fourni (0 sinon).

        None si inconnu OU si `uuid` est une chaîne non-UUID.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def find_direct(
        self, direct_key: str, for_user_uuid: Optional[str] = None
    ) -> Optional[ConversationBean]:
        """Recherche une conversation privée par sa clé canonique. Même hydratation que get_by_uuid."""
        raise NotImplementedError

    @abc.abstractmethod
    def is_member(self, conversation_uuid: str, user_uuid: str) -> bool:
        """Une seule requête exists() ; False si uuid malformé. Chemin chaud du polling."""
        raise NotImplementedError

    @abc.abstractmethod
    def create(
        self, bean: ConversationBean, member_uuids: List[str]
    ) -> ConversationBean:
        """Crée la conversation + une ligne membre par uuid (le propriétaire DOIT être
        inclus par l'appelant, en première position).

        Lève ConflictException("direct_key", key) si la contrainte unique direct_key est
        violée (course entre deux créations).
        Retourne get_by_uuid(uuid, for_user_uuid=bean.owner_uuid).
        """
        raise NotImplementedError

    @abc.abstractmethod
    def update(
        self, bean: ConversationBean, for_user_uuid: Optional[str] = None
    ) -> ConversationBean:
        """Persiste name et owner_uuid ; retourne get_by_uuid(bean.uuid, for_user_uuid)."""
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, uuid: str) -> bool:
        """Supprime la conversation (cascade sur membres et messages). False si inconnue ou uuid malformé."""
        raise NotImplementedError

    @abc.abstractmethod
    def add_members(self, conversation_uuid: str, member_uuids: List[str]) -> None:
        """Ajoute des adhésions (ignore_conflicts : les doublons sont ignorés)."""
        raise NotImplementedError

    @abc.abstractmethod
    def remove_member(self, conversation_uuid: str, member_uuid: str) -> bool:
        """Retire une adhésion. False si l'utilisateur n'était pas membre."""
        raise NotImplementedError

    @abc.abstractmethod
    def mark_read(
        self, conversation_uuid: str, member_uuid: str, read_at: datetime
    ) -> bool:
        """Positionne last_read_at = read_at si (NULL ou < read_at).

        True si la ligne membre existe (même si non modifiée). False si non membre ou
        uuid malformé.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def active_user_uuids(self, user_uuids: List[str]) -> List[str]:
        """Filtre les uuids correspondant à des profils dont user.is_active est True."""
        raise NotImplementedError

    @abc.abstractmethod
    def total_unread_for_user(self, user_uuid: str) -> int:
        """Somme des messages non lus sur toutes les conversations de l'utilisateur, en UNE
        requête (count sur le queryset filtré, jamais sur un queryset groupé)."""
        raise NotImplementedError
