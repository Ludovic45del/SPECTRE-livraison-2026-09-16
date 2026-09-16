"""Bean Conversation — conversation privée (direct) ou de groupe."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from app.domain.messaging.models.constants import KIND_DIRECT
from app.domain.messaging.models.conversation_member_bean import ConversationMemberBean
from app.domain.messaging.models.message_bean import MessageBean


@dataclass
class ConversationBean:
    """Conversation visible uniquement par ses membres.

    Le propriétaire est lui aussi une ligne membre. `members`, `unread_count`
    et `last_message` sont hydratés par le repository.
    """

    uuid: str = ""
    kind: str = KIND_DIRECT
    name: str = ""
    owner_uuid: str = ""
    direct_key: Optional[str] = None
    last_message_at: Optional[datetime] = None

    # Agrégats hydratés par le repository
    members: List[ConversationMemberBean] = field(
        default_factory=list
    )  # TOUJOURS triés (joined_at, user.uuid)
    unread_count: int = (
        0  # pour l'utilisateur passé en paramètre des lectures (0 sinon)
    )
    last_message: Optional[MessageBean] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @property
    def member_uuids(self) -> List[str]:
        """UUID des membres, dans l'ordre de `members`."""
        return [m.user.uuid for m in self.members]
