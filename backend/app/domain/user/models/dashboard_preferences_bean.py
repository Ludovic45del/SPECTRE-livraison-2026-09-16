"""Bean DashboardPreferences — DTO pour les preferences de layout utilisateur."""

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class LayoutItemBean:
    """Position et taille d'un widget dans la grille."""

    i: str = ""
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 3
    min_w: int = 2
    min_h: int = 2


@dataclass
class ShortcutBean:
    """Raccourci externe de l'utilisateur."""

    id: str = ""
    label: str = ""
    url: str = ""
    icon: str = "Link"
    category: str = ""


@dataclass
class TodoItemBean:
    """Element de liste de taches."""

    id: str = ""
    text: str = ""
    done: bool = False


@dataclass
class DashboardPreferencesBean:
    """Preferences completes du dashboard utilisateur."""

    layout: List[LayoutItemBean] = field(default_factory=list)
    widgets: Dict[str, dict] = field(default_factory=dict)
    shortcuts: List[ShortcutBean] = field(default_factory=list)
    todos: List[TodoItemBean] = field(default_factory=list)
