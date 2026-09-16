"""Bean ConversationMember — adhésion d'un utilisateur à une conversation."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.domain.messaging.models.user_summary_bean import UserSummaryBean


@dataclass
class ConversationMemberBean:
    """Membre d'une conversation avec son curseur de lecture.

    `last_read_at` à None signifie « jamais lu depuis l'adhésion » : le point
    de départ des non-lus est alors `joined_at`.
    """

    user: UserSummaryBean = field(default_factory=UserSummaryBean)
    joined_at: Optional[datetime] = None
    last_read_at: Optional[datetime] = None
