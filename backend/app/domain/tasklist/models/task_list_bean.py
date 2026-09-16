"""Bean TaskList — liste de tâches partagée à visibilité restreinte."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

from app.domain.tasklist.models.constants import LIST_COLOR_DEFAULT
from app.domain.tasklist.models.task_item_bean import TaskItemBean


@dataclass
class TaskListBean:
    """Liste partagée : visible uniquement par son propriétaire et ses membres.

    `member_uuids`, `task_count` et `done_count` sont hydratés par le repository.
    `tasks` n'est peuplé que par `get_detail_by_uuid`.
    """

    uuid: str = ""
    name: str = ""
    description: str = ""
    color: str = LIST_COLOR_DEFAULT
    owner_uuid: str = ""

    # Agrégats hydratés par le repository
    member_uuids: List[str] = field(default_factory=list)
    task_count: int = 0
    done_count: int = 0
    tasks: List[TaskItemBean] = field(default_factory=list)

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
