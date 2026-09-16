"""Bean TaskComment — commentaire (annotation) sur une tâche."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class TaskCommentBean:
    """Commentaire horodaté d'un membre sur une tâche.

    `author_uuid` est None si le compte auteur a été supprimé.
    """

    uuid: str = ""
    task_uuid: str = ""
    author_uuid: Optional[str] = None
    text: str = ""
    created_at: Optional[datetime] = None
