"""Service de validation et gestion des preferences dashboard."""

import logging
import re
import uuid as uuid_lib
from typing import Any, Dict, List, Optional

from app.domain.user.interface.user_repository import IUserRepository
from app.domain.user.models.dashboard_preferences_bean import (
    DashboardPreferencesBean,
    LayoutItemBean,
    ShortcutBean,
    TodoItemBean,
)

logger = logging.getLogger(__name__)

# Widget IDs autorises
ALLOWED_WIDGET_IDS = {
    "kpis",
    "planning",
    "activity",
    "shortcuts",
    "todos",
    "sharedTasks",
}

MAX_SHORTCUTS = 50
MAX_TODOS = 100

# Protocoles autorises pour les URLs de raccourcis
_SAFE_URL_PATTERN = re.compile(r"^(https?://|\\\\|/)", re.IGNORECASE)


def get_default_preferences() -> DashboardPreferencesBean:
    """Retourne le layout par defaut (identique au layout actuel de la page)."""
    return DashboardPreferencesBean(
        layout=[
            LayoutItemBean(i="kpis", x=0, y=0, w=12, h=2, min_w=6, min_h=2),
            LayoutItemBean(i="planning", x=0, y=2, w=6, h=4, min_w=4, min_h=3),
            LayoutItemBean(i="activity", x=6, y=2, w=6, h=4, min_w=4, min_h=3),
            LayoutItemBean(i="shortcuts", x=0, y=6, w=6, h=3, min_w=4, min_h=2),
            LayoutItemBean(i="todos", x=6, y=6, w=6, h=3, min_w=4, min_h=2),
            LayoutItemBean(i="sharedTasks", x=0, y=9, w=6, h=4, min_w=4, min_h=3),
        ],
        widgets={wid: {"visible": True} for wid in ALLOWED_WIDGET_IDS},
        shortcuts=[],
        todos=[],
    )


def _clean_layout(raw: Any) -> Optional[List[Dict[str, Any]]]:
    """Nettoie et valide les items de layout."""
    if not isinstance(raw, list):
        return None
    cleaned = []
    for item in raw:
        if isinstance(item, dict) and "i" in item:
            cleaned.append(
                {
                    "i": str(item["i"]),
                    "x": int(item.get("x", 0)),
                    "y": int(item.get("y", 0)),
                    "w": int(item.get("w", 6)),
                    "h": int(item.get("h", 3)),
                    "minW": int(item.get("minW", 2)),
                    "minH": int(item.get("minH", 2)),
                }
            )
    return cleaned


def _clean_widgets(raw: Any) -> Optional[Dict[str, Dict[str, bool]]]:
    """Nettoie et valide la visibilite des widgets."""
    if not isinstance(raw, dict):
        return None
    return {
        k: {"visible": bool(v.get("visible", True))}
        for k, v in raw.items()
        if isinstance(v, dict)
    }


def _clean_shortcuts(raw: Any) -> Optional[List[Dict[str, str]]]:
    """Nettoie et valide les raccourcis."""
    if not isinstance(raw, list):
        return None
    cleaned = []
    for s in raw[:MAX_SHORTCUTS]:
        if isinstance(s, dict) and s.get("label") and s.get("url"):
            url_value = str(s["url"])[:500]
            if not _SAFE_URL_PATTERN.match(url_value):
                continue
            cleaned.append(
                {
                    "id": str(s.get("id", "")),
                    "label": str(s["label"])[:100],
                    "url": url_value,
                    "icon": str(s.get("icon", "Link"))[:50],
                    "category": str(s.get("category", ""))[:50],
                }
            )
    return cleaned


def _clean_todos(raw: Any) -> Optional[List[Dict[str, Any]]]:
    """Nettoie et valide les taches."""
    if not isinstance(raw, list):
        return None
    cleaned = []
    for t in raw[:MAX_TODOS]:
        if isinstance(t, dict) and t.get("text"):
            cleaned.append(
                {
                    "id": str(t.get("id", "")),
                    "text": str(t["text"])[:500],
                    "done": bool(t.get("done", False)),
                }
            )
    return cleaned


def validate_dashboard_preferences(data: dict) -> dict:
    """Valide la structure des preferences. Retourne les donnees nettoyees."""
    result = {}
    layout = _clean_layout(data.get("layout", []))
    if layout is not None:
        result["layout"] = layout
    widgets = _clean_widgets(data.get("widgets", {}))
    if widgets is not None:
        result["widgets"] = widgets
    shortcuts = _clean_shortcuts(data.get("shortcuts", []))
    if shortcuts is not None:
        result["shortcuts"] = shortcuts
    todos = _clean_todos(data.get("todos", []))
    if todos is not None:
        result["todos"] = todos
    return result


def _dict_to_bean(data: Dict[str, Any]) -> DashboardPreferencesBean:
    """Convertit un dict nettoyé en bean (logique interne au service)."""
    layout = [
        LayoutItemBean(
            i=item.get("i", ""),
            x=int(item.get("x", 0)),
            y=int(item.get("y", 0)),
            w=int(item.get("w", 6)),
            h=int(item.get("h", 3)),
            min_w=int(item.get("minW", 2)),
            min_h=int(item.get("minH", 2)),
        )
        for item in data.get("layout", [])
        if isinstance(item, dict)
    ]
    shortcuts = [
        ShortcutBean(
            id=s.get("id", ""),
            label=s.get("label", ""),
            url=s.get("url", ""),
            icon=s.get("icon", "Link"),
            category=s.get("category", ""),
        )
        for s in data.get("shortcuts", [])
        if isinstance(s, dict)
    ]
    todos = [
        TodoItemBean(
            id=t.get("id", ""),
            text=t.get("text", ""),
            done=bool(t.get("done", False)),
        )
        for t in data.get("todos", [])
        if isinstance(t, dict)
    ]
    return DashboardPreferencesBean(
        layout=layout,
        widgets=data.get("widgets", {}),
        shortcuts=shortcuts,
        todos=todos,
    )


def get_preferences(
    repository: IUserRepository, user_uuid: uuid_lib.UUID
) -> DashboardPreferencesBean:
    """Retourne les preferences ou les defaults si vide."""
    bean = repository.get_dashboard_preferences(user_uuid)
    if not bean.layout:
        return get_default_preferences()
    return bean


def update_preferences(
    repository: IUserRepository, user_uuid: uuid_lib.UUID, data: dict
) -> DashboardPreferencesBean:
    """Valide et sauvegarde les preferences."""
    cleaned = validate_dashboard_preferences(data)
    bean = _dict_to_bean(cleaned)
    logger.info("Preferences dashboard mises a jour pour l'utilisateur %s", user_uuid)
    return repository.update_dashboard_preferences(user_uuid, bean)
