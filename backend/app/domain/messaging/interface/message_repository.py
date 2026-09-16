"""Interface IMessageRepository — messages d'une conversation, pagination par curseur."""

import abc
from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from app.domain.messaging.models.attachment_bean import AttachmentUploadBean
from app.domain.messaging.models.mention_bean import MentionBean
from app.domain.messaging.models.message_bean import MessageBean

#: Page de messages : (résultats, has_more, messages mis à jour hors résultats).
MessagePage = Tuple[List[MessageBean], bool, List[MessageBean]]


class IMessageRepository(abc.ABC):
    """Contrat d'accès aux messages.

    Toutes les lectures hydratent `entity_refs` et `attachments` EN MASSE : une
    requête pour les références de tous les messages renvoyés, une requête pour
    leurs pièces jointes, puis une résolution des cibles par le resolver
    injecté (≤ 1 requête par type d'entité). Jamais de requête par message.
    """

    @abc.abstractmethod
    def get_by_uuid(self, uuid: str) -> Optional[MessageBean]:
        """None si inconnu ou uuid malformé."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_page(
        self,
        conversation_uuid: str,
        limit: int,
        before_uuid: Optional[str] = None,
        after_uuid: Optional[str] = None,
        updated_since: Optional[datetime] = None,
    ) -> Optional[MessagePage]:
        """Page de messages d'une conversation, TOUJOURS renvoyée en ordre chronologique croissant.

        - ni before ni after : les `limit` plus récents ; has_more = il en existe de plus anciens.
        - before=<uuid> : les `limit` messages strictement antérieurs au curseur ;
          has_more = plus anciens existent.
        - after=<uuid> : les `limit` messages strictement postérieurs au curseur ;
          has_more = plus récents existent encore.

        Ordre strict (created_at, uuid). Le curseur est relu (1 requête, la seule
        lecture du curseur : le service ne le relit pas) pour obtenir
        (created_at, uuid) ; s'il est absent, malformé ou d'une autre conversation,
        renvoie None — le SERVICE lève alors NotFoundException("Message", uuid).
        Troncature : rows = list(qs[:limit+1]) ; has_more = len(rows) > limit ;
        rows = rows[:limit] (on retire TOUJOURS la dernière ligne au sens du tri SQL,
        AVANT toute inversion) ; puis rows.reverse() pour les modes sans curseur et before.

        Les messages supprimés logiquement restent dans les pages (corps vide,
        `deleted_at` renseigné) : l'historique et les curseurs restent stables.

        Troisième élément `updated` : messages de la conversation dont
        `updated_at > updated_since` et qui ne figurent pas dans `results`
        (éditions / suppressions d'anciens messages, propagées par le polling).
        Avec `after`, seuls les messages situés au plus tard au curseur sont
        candidats (les plus récents relèvent de `results` / `has_more`). Liste
        vide si `updated_since` est None. Ordre chronologique croissant.

        Hydrate author (select_related author__user), entity_refs et attachments
        (en masse, pour `results` et `updated` ensemble).
        """
        raise NotImplementedError

    @abc.abstractmethod
    def create(
        self, bean: MessageBean, attachments: Sequence[AttachmentUploadBean] = ()
    ) -> MessageBean:
        """Insère le message, met à jour conversation.last_message_at = message.created_at
        et, si author_uuid est membre, membership.last_read_at = message.created_at.

        Persiste aussi `bean.entity_refs` (libellé instantané, position = ordre
        de la liste) et les fichiers `attachments` (position = ordre de la
        liste, chemin non devinable sous MEDIA_ROOT). Transaction atomique : en
        cas d'échec d'écriture disque, la transaction est annulée et les
        fichiers déjà écrits sont nettoyés. Relit avec select_related pour
        hydrater author, et hydrate entity_refs et attachments.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def update_body(
        self, message_uuid: str, body: str, edited_at: datetime
    ) -> MessageBean:
        """Remplace le corps du message et positionne `edited_at` (et `updated_at`)
        à `edited_at`. Le message est relu et renvoyé hydraté."""
        raise NotImplementedError

    @abc.abstractmethod
    def soft_delete(self, message_uuid: str, deleted_at: datetime) -> MessageBean:
        """Suppression logique : corps vidé, `deleted_at` (et `updated_at`) à
        `deleted_at`, références et pièces jointes supprimées, fichiers disque
        effacés. La ligne du message subsiste. Renvoie le message relu."""
        raise NotImplementedError

    @abc.abstractmethod
    def get_mentions(
        self, user_uuid: str, entity_type: str, entity_uuid: str, limit: int
    ) -> List[MentionBean]:
        """Messages référençant la cible, dans les conversations dont `user_uuid`
        est membre, du plus récent au plus ancien, au plus `limit` résultats.

        Hydrate l'auteur (select_related), les membres des conversations (une
        requête pour toutes) et entity_refs (en masse). Liste vide si la cible
        est inconnue ou si `entity_uuid` est malformé (jamais d'exception).
        """
        raise NotImplementedError

    @abc.abstractmethod
    def search(self, user_uuid: str, query: str, limit: int) -> List[MentionBean]:
        """Messages texte non supprimés dont le corps contient `query`
        (insensible à la casse), dans les conversations dont `user_uuid` est
        membre, du plus récent au plus ancien, au plus `limit` résultats.
        Même hydratation et même forme que `get_mentions`."""
        raise NotImplementedError
