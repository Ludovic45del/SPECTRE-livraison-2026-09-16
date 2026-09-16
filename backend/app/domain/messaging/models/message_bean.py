"""Bean Message — message texte ou système d'une conversation."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from app.domain.messaging.models.attachment_bean import AttachmentBean
from app.domain.messaging.models.constants import MESSAGE_KIND_TEXT
from app.domain.messaging.models.entity_ref_bean import EntityRefBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean


@dataclass
class MessageBean:
    """Message d'une conversation.

    `author` est hydraté par le repository (select_related) ; None si le
    compte de l'auteur a été supprimé. `entity_refs` (références FSEC /
    campagne / FA) et `attachments` (pièces jointes) sont hydratés en masse
    par le repository, dans l'ordre d'insertion.

    Suppression logique (vague M4) : un message supprimé reste dans les pages
    (curseurs et historique stables) avec un corps vide, `deleted_at`
    renseigné, et sans référence ni pièce jointe.
    """

    uuid: str = ""
    conversation_uuid: str = ""
    author_uuid: Optional[str] = None
    author: Optional[UserSummaryBean] = None
    kind: str = MESSAGE_KIND_TEXT
    body: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    entity_refs: List[EntityRefBean] = field(default_factory=list)
    attachments: List[AttachmentBean] = field(default_factory=list)
    # Aperçu (liste des conversations) : nombres annotés en base, sans
    # résolution des cibles ni chargement des fichiers — `entity_refs` et
    # `attachments` restent vides dans ce cas.
    entity_ref_count: int = 0
    attachment_count: int = 0

    @property
    def is_deleted(self) -> bool:
        """True si le message a été supprimé logiquement."""
        return self.deleted_at is not None
