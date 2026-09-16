"""Mapper DashboardPreferences — conversions Bean <-> dict (API/JSON)."""

from typing import List

from app.domain.user.models.dashboard_preferences_bean import (
    DashboardPreferencesBean,
    LayoutItemBean,
    ShortcutBean,
    TodoItemBean,
)


def dashboard_preferences_bean_to_dict(bean: DashboardPreferencesBean) -> dict:
    """Convertit un DashboardPreferencesBean en dict JSON."""
    return {
        "layout": [
            {
                "i": it.i,
                "x": it.x,
                "y": it.y,
                "w": it.w,
                "h": it.h,
                "minW": it.min_w,
                "minH": it.min_h,
            }
            for it in bean.layout
        ],
        "widgets": bean.widgets,
        "shortcuts": [
            {
                "id": s.id,
                "label": s.label,
                "url": s.url,
                "icon": s.icon,
                "category": s.category,
            }
            for s in bean.shortcuts
        ],
        "todos": [{"id": t.id, "text": t.text, "done": t.done} for t in bean.todos],
    }


def dashboard_preferences_dict_to_bean(data: dict) -> DashboardPreferencesBean:
    """Convertit un dict JSON en DashboardPreferencesBean."""
    layout: List[LayoutItemBean] = [
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
    shortcuts: List[ShortcutBean] = [
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
    todos: List[TodoItemBean] = [
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
