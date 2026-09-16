"""Bean TaskItem — tâche d'une liste partagée."""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from app.domain.tasklist.models.constants import PRIORITY_NORMAL


@dataclass
class TaskItemBean:
    """Tâche : titre, note libre (annotation), priorité, échéance, assignation.

    `comment_count` est hydraté par le repository lors des lectures.
    """

    uuid: str = ""
    task_list_uuid: str = ""
    title: str = ""
    note: str = ""
    priority: str = PRIORITY_NORMAL
    done: bool = False
    position: int = 0
    due_date: Optional[date] = None
    assignee_uuid: Optional[str] = None
    created_by_uuid: Optional[str] = None
    completed_by_uuid: Optional[str] = None
    completed_at: Optional[datetime] = None

    # Agrégat hydraté par le repository
    comment_count: int = 0

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
