"""Bean Mention — message référençant une entité, avec le contexte de sa conversation."""

from dataclasses import dataclass, field
from typing import List

from app.domain.messaging.models.message_bean import MessageBean
from app.domain.messaging.models.user_summary_bean import UserSummaryBean


@dataclass
class MentionBean:
    """Résultat de `GET /conversations/mentions/` : un message et sa conversation.

    Le contexte de conversation est aplati (uuid, type, nom, membres) pour que
    le frontend puisse titrer la discussion sans requête supplémentaire.
    """

    message: MessageBean = field(default_factory=MessageBean)
    conversation_uuid: str = ""
    conversation_kind: str = ""
    conversation_name: str = ""
    conversation_members: List[UserSummaryBean] = field(default_factory=list)
