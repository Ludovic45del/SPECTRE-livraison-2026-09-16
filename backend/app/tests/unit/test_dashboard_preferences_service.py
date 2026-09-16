"""
Tests unitaires pour le service Dashboard Preferences.

Teste la validation et la logique de gestion des preferences sans acces DB.
Objectif: couverture exhaustive pour tuer les mutants de mutation testing.
"""

import logging
import uuid
from unittest.mock import MagicMock

import pytest

from app.domain.user.models.dashboard_preferences_bean import (
    DashboardPreferencesBean,
    LayoutItemBean,
    ShortcutBean,
    TodoItemBean,
)
from app.domain.user.services.dashboard_preferences_service import (
    _SAFE_URL_PATTERN,
    ALLOWED_WIDGET_IDS,
    MAX_SHORTCUTS,
    MAX_TODOS,
    _clean_layout,
    _clean_shortcuts,
    _clean_todos,
    _clean_widgets,
    _dict_to_bean,
    get_default_preferences,
    get_preferences,
    logger,
    update_preferences,
    validate_dashboard_preferences,
)


@pytest.fixture
def mock_user_repository():
    """Mock du repository User."""
    return MagicMock()


@pytest.fixture
def sample_user_uuid():
    return uuid.uuid4()


# ============================================================================
# Module-level constants and logger
# ============================================================================


@pytest.mark.unit
class TestModuleConstants:

    def test_logger_exists(self):
        assert logger is not None
        assert isinstance(logger, logging.Logger)

    def test_allowed_widget_ids_content(self):
        """Verifie chaque widget ID autorise."""
        assert "kpis" in ALLOWED_WIDGET_IDS
        assert "planning" in ALLOWED_WIDGET_IDS
        assert "activity" in ALLOWED_WIDGET_IDS
        assert "shortcuts" in ALLOWED_WIDGET_IDS
        assert "todos" in ALLOWED_WIDGET_IDS
        assert "sharedTasks" in ALLOWED_WIDGET_IDS
        assert len(ALLOWED_WIDGET_IDS) == 6

    def test_max_shortcuts_value(self):
        assert MAX_SHORTCUTS == 50

    def test_max_todos_value(self):
        assert MAX_TODOS == 100

    def test_safe_url_pattern_matches_http(self):
        assert _SAFE_URL_PATTERN.match("http://example.com")

    def test_safe_url_pattern_matches_https(self):
        assert _SAFE_URL_PATTERN.match("https://example.com")

    def test_safe_url_pattern_matches_unc(self):
        assert _SAFE_URL_PATTERN.match("\\\\server\\share")

    def test_safe_url_pattern_matches_absolute_path(self):
        assert _SAFE_URL_PATTERN.match("/local/path")

    def test_safe_url_pattern_rejects_javascript(self):
        assert _SAFE_URL_PATTERN.match("javascript:alert(1)") is None

    def test_safe_url_pattern_rejects_data_uri(self):
        assert _SAFE_URL_PATTERN.match("data:text/html,<h1>x</h1>") is None

    def test_safe_url_pattern_case_insensitive(self):
        assert _SAFE_URL_PATTERN.match("HTTP://example.com")
        assert _SAFE_URL_PATTERN.match("HTTPS://example.com")


# ============================================================================
# get_default_preferences
# ============================================================================


@pytest.mark.unit
class TestGetDefaultPreferences:

    def test_returns_dashboard_preferences_bean(self):
        prefs = get_default_preferences()
        assert isinstance(prefs, DashboardPreferencesBean)

    def test_layout_has_six_items(self):
        prefs = get_default_preferences()
        assert len(prefs.layout) == 6

    def test_layout_contains_all_widgets(self):
        prefs = get_default_preferences()
        layout_ids = {item.i for item in prefs.layout}
        assert layout_ids == ALLOWED_WIDGET_IDS

    def test_kpis_layout_values(self):
        prefs = get_default_preferences()
        kpis = next(item for item in prefs.layout if item.i == "kpis")
        assert kpis.x == 0
        assert kpis.y == 0
        assert kpis.w == 12
        assert kpis.h == 2
        assert kpis.min_w == 6
        assert kpis.min_h == 2

    def test_planning_layout_values(self):
        prefs = get_default_preferences()
        planning = next(item for item in prefs.layout if item.i == "planning")
        assert planning.x == 0
        assert planning.y == 2
        assert planning.w == 6
        assert planning.h == 4
        assert planning.min_w == 4
        assert planning.min_h == 3

    def test_activity_layout_values(self):
        prefs = get_default_preferences()
        activity = next(item for item in prefs.layout if item.i == "activity")
        assert activity.x == 6
        assert activity.y == 2
        assert activity.w == 6
        assert activity.h == 4
        assert activity.min_w == 4
        assert activity.min_h == 3

    def test_shortcuts_layout_values(self):
        prefs = get_default_preferences()
        shortcuts = next(item for item in prefs.layout if item.i == "shortcuts")
        assert shortcuts.x == 0
        assert shortcuts.y == 6
        assert shortcuts.w == 6
        assert shortcuts.h == 3
        assert shortcuts.min_w == 4
        assert shortcuts.min_h == 2

    def test_todos_layout_values(self):
        prefs = get_default_preferences()
        todos = next(item for item in prefs.layout if item.i == "todos")
        assert todos.x == 6
        assert todos.y == 6
        assert todos.w == 6
        assert todos.h == 3
        assert todos.min_w == 4
        assert todos.min_h == 2

    def test_all_widgets_visible_by_default(self):
        prefs = get_default_preferences()
        for wid in ALLOWED_WIDGET_IDS:
            assert wid in prefs.widgets
            assert prefs.widgets[wid]["visible"] is True

    def test_shortcuts_empty(self):
        prefs = get_default_preferences()
        assert prefs.shortcuts == []

    def test_todos_empty(self):
        prefs = get_default_preferences()
        assert prefs.todos == []


# ============================================================================
# _clean_layout
# ============================================================================


@pytest.mark.unit
class TestCleanLayout:

    def test_returns_none_for_non_list(self):
        assert _clean_layout("not_a_list") is None
        assert _clean_layout(42) is None
        assert _clean_layout(None) is None
        assert _clean_layout({"key": "val"}) is None

    def test_returns_empty_list_for_empty_list(self):
        assert _clean_layout([]) == []

    def test_cleans_valid_item(self):
        raw = [{"i": "kpis", "x": 1, "y": 2, "w": 10, "h": 3, "minW": 5, "minH": 2}]
        result = _clean_layout(raw)
        assert len(result) == 1
        assert result[0]["i"] == "kpis"
        assert result[0]["x"] == 1
        assert result[0]["y"] == 2
        assert result[0]["w"] == 10
        assert result[0]["h"] == 3
        assert result[0]["minW"] == 5
        assert result[0]["minH"] == 2

    def test_uses_defaults_for_missing_fields(self):
        raw = [{"i": "kpis"}]
        result = _clean_layout(raw)
        assert result[0]["x"] == 0
        assert result[0]["y"] == 0
        assert result[0]["w"] == 6
        assert result[0]["h"] == 3
        assert result[0]["minW"] == 2
        assert result[0]["minH"] == 2

    def test_skips_items_without_i(self):
        raw = [{"x": 0, "y": 0}, {"i": "kpis"}]
        result = _clean_layout(raw)
        assert len(result) == 1
        assert result[0]["i"] == "kpis"

    def test_skips_non_dict_items(self):
        raw = ["string_item", 42, None, {"i": "kpis"}]
        result = _clean_layout(raw)
        assert len(result) == 1

    def test_converts_i_to_string(self):
        raw = [{"i": 123}]
        result = _clean_layout(raw)
        assert result[0]["i"] == "123"

    def test_converts_numeric_fields_to_int(self):
        raw = [
            {
                "i": "test",
                "x": "3",
                "y": "4",
                "w": "5",
                "h": "6",
                "minW": "7",
                "minH": "8",
            }
        ]
        result = _clean_layout(raw)
        assert result[0]["x"] == 3
        assert result[0]["y"] == 4
        assert result[0]["w"] == 5
        assert result[0]["h"] == 6
        assert result[0]["minW"] == 7
        assert result[0]["minH"] == 8


# ============================================================================
# _clean_widgets
# ============================================================================


@pytest.mark.unit
class TestCleanWidgets:

    def test_returns_none_for_non_dict(self):
        assert _clean_widgets("not_a_dict") is None
        assert _clean_widgets([1, 2]) is None
        assert _clean_widgets(42) is None
        assert _clean_widgets(None) is None

    def test_cleans_valid_widgets(self):
        raw = {"kpis": {"visible": True}, "planning": {"visible": False}}
        result = _clean_widgets(raw)
        assert result["kpis"]["visible"] is True
        assert result["planning"]["visible"] is False

    def test_defaults_visible_to_true(self):
        raw = {"kpis": {}}
        result = _clean_widgets(raw)
        assert result["kpis"]["visible"] is True

    def test_skips_non_dict_values(self):
        raw = {"kpis": {"visible": True}, "bad": "not_a_dict", "also_bad": 42}
        result = _clean_widgets(raw)
        assert "kpis" in result
        assert "bad" not in result
        assert "also_bad" not in result

    def test_returns_empty_dict_for_empty_input(self):
        assert _clean_widgets({}) == {}

    def test_coerces_visible_to_bool(self):
        raw = {"kpis": {"visible": 0}, "planning": {"visible": 1}}
        result = _clean_widgets(raw)
        assert result["kpis"]["visible"] is False
        assert result["planning"]["visible"] is True


# ============================================================================
# _clean_shortcuts
# ============================================================================


@pytest.mark.unit
class TestCleanShortcuts:

    def test_returns_none_for_non_list(self):
        assert _clean_shortcuts("not_a_list") is None
        assert _clean_shortcuts(42) is None
        assert _clean_shortcuts(None) is None

    def test_returns_empty_list_for_empty_list(self):
        assert _clean_shortcuts([]) == []

    def test_cleans_valid_shortcut(self):
        raw = [
            {
                "id": "s1",
                "label": "Google",
                "url": "https://google.com",
                "icon": "Search",
                "category": "search",
            }
        ]
        result = _clean_shortcuts(raw)
        assert len(result) == 1
        assert result[0]["id"] == "s1"
        assert result[0]["label"] == "Google"
        assert result[0]["url"] == "https://google.com"
        assert result[0]["icon"] == "Search"
        assert result[0]["category"] == "search"

    def test_defaults_for_missing_optional_fields(self):
        raw = [{"label": "Google", "url": "https://google.com"}]
        result = _clean_shortcuts(raw)
        assert result[0]["id"] == ""
        assert result[0]["icon"] == "Link"
        assert result[0]["category"] == ""

    def test_skips_shortcut_without_label(self):
        raw = [{"url": "https://example.com"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_skips_shortcut_with_empty_label(self):
        raw = [{"label": "", "url": "https://example.com"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_skips_shortcut_without_url(self):
        raw = [{"label": "Test"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_skips_shortcut_with_empty_url(self):
        raw = [{"label": "Test", "url": ""}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_truncates_label_to_100(self):
        raw = [{"label": "x" * 200, "url": "https://ok.com"}]
        result = _clean_shortcuts(raw)
        assert len(result[0]["label"]) == 100

    def test_truncates_url_to_500(self):
        raw = [{"label": "Test", "url": "https://" + "y" * 600}]
        result = _clean_shortcuts(raw)
        assert len(result[0]["url"]) == 500

    def test_truncates_icon_to_50(self):
        raw = [{"label": "Test", "url": "https://ok.com", "icon": "z" * 100}]
        result = _clean_shortcuts(raw)
        assert len(result[0]["icon"]) == 50

    def test_truncates_category_to_50(self):
        raw = [{"label": "Test", "url": "https://ok.com", "category": "c" * 100}]
        result = _clean_shortcuts(raw)
        assert len(result[0]["category"]) == 50

    def test_limits_to_max_shortcuts(self):
        raw = [
            {"label": f"L{i}", "url": f"https://ex.com/{i}"}
            for i in range(MAX_SHORTCUTS + 10)
        ]
        result = _clean_shortcuts(raw)
        assert len(result) == MAX_SHORTCUTS

    def test_rejects_unsafe_url_javascript(self):
        raw = [{"label": "Bad", "url": "javascript:alert(1)"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_rejects_unsafe_url_data(self):
        raw = [{"label": "Bad", "url": "data:text/html,<h1>x</h1>"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 0

    def test_accepts_http_url(self):
        raw = [{"label": "Ok", "url": "http://example.com"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 1

    def test_accepts_https_url(self):
        raw = [{"label": "Ok", "url": "https://example.com"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 1

    def test_accepts_unc_path(self):
        raw = [{"label": "Share", "url": "\\\\server\\share"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 1

    def test_accepts_absolute_path(self):
        raw = [{"label": "Local", "url": "/local/path"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 1

    def test_skips_non_dict_items(self):
        raw = ["string", 42, None, {"label": "Ok", "url": "https://ok.com"}]
        result = _clean_shortcuts(raw)
        assert len(result) == 1

    def test_converts_label_and_url_to_string(self):
        raw = [{"label": 123, "url": "https://ok.com"}]
        # label is truthy (123), so s.get("label") is truthy
        result = _clean_shortcuts(raw)
        # The URL is valid; label gets str() coercion
        assert len(result) == 1
        assert result[0]["label"] == "123"


# ============================================================================
# _clean_todos
# ============================================================================


@pytest.mark.unit
class TestCleanTodos:

    def test_returns_none_for_non_list(self):
        assert _clean_todos("not_a_list") is None
        assert _clean_todos(42) is None
        assert _clean_todos(None) is None

    def test_returns_empty_list_for_empty_list(self):
        assert _clean_todos([]) == []

    def test_cleans_valid_todo(self):
        raw = [{"id": "t1", "text": "Buy milk", "done": True}]
        result = _clean_todos(raw)
        assert len(result) == 1
        assert result[0]["id"] == "t1"
        assert result[0]["text"] == "Buy milk"
        assert result[0]["done"] is True

    def test_defaults_for_missing_optional_fields(self):
        raw = [{"text": "Buy milk"}]
        result = _clean_todos(raw)
        assert result[0]["id"] == ""
        assert result[0]["done"] is False

    def test_skips_todo_without_text(self):
        raw = [{"done": True}]
        result = _clean_todos(raw)
        assert len(result) == 0

    def test_skips_todo_with_empty_text(self):
        raw = [{"text": ""}]
        result = _clean_todos(raw)
        assert len(result) == 0

    def test_truncates_text_to_500(self):
        raw = [{"text": "x" * 600}]
        result = _clean_todos(raw)
        assert len(result[0]["text"]) == 500

    def test_limits_to_max_todos(self):
        raw = [{"text": f"Task {i}"} for i in range(MAX_TODOS + 20)]
        result = _clean_todos(raw)
        assert len(result) == MAX_TODOS

    def test_coerces_done_to_bool(self):
        raw = [{"text": "A", "done": 0}, {"text": "B", "done": 1}]
        result = _clean_todos(raw)
        assert result[0]["done"] is False
        assert result[1]["done"] is True

    def test_skips_non_dict_items(self):
        raw = ["string", 42, None, {"text": "Valid"}]
        result = _clean_todos(raw)
        assert len(result) == 1

    def test_converts_text_to_string(self):
        raw = [{"text": 12345}]
        result = _clean_todos(raw)
        assert result[0]["text"] == "12345"


# ============================================================================
# validate_dashboard_preferences
# ============================================================================


@pytest.mark.unit
class TestValidateDashboardPreferences:

    def test_empty_data_returns_empty_dict_with_all_keys(self):
        result = validate_dashboard_preferences({})
        # layout=[] is cleaned to [] (not None), so key is present
        assert "layout" in result
        assert result["layout"] == []
        assert "widgets" in result
        assert result["widgets"] == {}
        assert "shortcuts" in result
        assert result["shortcuts"] == []
        assert "todos" in result
        assert result["todos"] == []

    def test_cleans_layout_items(self):
        data = {
            "layout": [
                {"i": "kpis", "x": 0, "y": 0, "w": 12, "h": 2},
                {"i": "planning", "x": 0, "y": 2, "w": 6, "h": 4, "minW": 4, "minH": 3},
            ]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["layout"]) == 2
        assert result["layout"][0]["i"] == "kpis"
        assert result["layout"][1]["minW"] == 4

    def test_skips_layout_items_without_id(self):
        data = {
            "layout": [{"x": 0, "y": 0}, {"i": "kpis", "x": 0, "y": 0, "w": 12, "h": 2}]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["layout"]) == 1
        assert result["layout"][0]["i"] == "kpis"

    def test_cleans_widgets_visibility(self):
        data = {"widgets": {"kpis": {"visible": True}, "planning": {"visible": False}}}
        result = validate_dashboard_preferences(data)
        assert result["widgets"]["kpis"]["visible"] is True
        assert result["widgets"]["planning"]["visible"] is False

    def test_truncates_shortcuts_to_max(self):
        data = {
            "shortcuts": [
                {"label": f"Lien {i}", "url": f"https://example.com/{i}"}
                for i in range(MAX_SHORTCUTS + 10)
            ]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["shortcuts"]) == MAX_SHORTCUTS

    def test_truncates_shortcut_fields(self):
        data = {
            "shortcuts": [
                {"label": "x" * 200, "url": "https://" + "y" * 600, "icon": "z" * 100}
            ]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["shortcuts"][0]["label"]) == 100
        assert len(result["shortcuts"][0]["url"]) == 500
        assert len(result["shortcuts"][0]["icon"]) == 50

    def test_skips_shortcuts_without_label_or_url(self):
        data = {
            "shortcuts": [
                {"label": "Valid", "url": "https://ok.com"},
                {"label": "", "url": "https://bad.com"},
                {"label": "No URL"},
            ]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["shortcuts"]) == 1

    def test_truncates_todos_to_max(self):
        data = {"todos": [{"text": f"Task {i}"} for i in range(MAX_TODOS + 20)]}
        result = validate_dashboard_preferences(data)
        assert len(result["todos"]) == MAX_TODOS

    def test_skips_todos_without_text(self):
        data = {
            "todos": [
                {"text": "Valid task"},
                {"text": ""},
                {"done": True},
            ]
        }
        result = validate_dashboard_preferences(data)
        assert len(result["todos"]) == 1

    def test_handles_invalid_layout_type_excludes_key(self):
        result = validate_dashboard_preferences({"layout": "not_a_list"})
        assert "layout" not in result

    def test_handles_invalid_widgets_type_excludes_key(self):
        result = validate_dashboard_preferences({"widgets": "not_a_dict"})
        assert "widgets" not in result

    def test_handles_invalid_shortcuts_type_excludes_key(self):
        result = validate_dashboard_preferences({"shortcuts": "not_a_list"})
        assert "shortcuts" not in result

    def test_handles_invalid_todos_type_excludes_key(self):
        result = validate_dashboard_preferences({"todos": "not_a_list"})
        assert "todos" not in result

    def test_validates_url_protocol(self):
        data = {
            "shortcuts": [
                {"label": "Safe", "url": "https://safe.com"},
                {"label": "Dangerous", "url": "javascript:alert(1)"},
                {"label": "File", "url": "\\\\server\\share"},
                {"label": "Local", "url": "/local/path"},
            ]
        }
        result = validate_dashboard_preferences(data)
        urls = [s["url"] for s in result["shortcuts"]]
        assert "https://safe.com" in urls
        assert "javascript:alert(1)" not in urls
        assert "\\\\server\\share" in urls
        assert "/local/path" in urls

    def test_full_data_round_trip(self):
        data = {
            "layout": [{"i": "kpis", "x": 0, "y": 0, "w": 12, "h": 2}],
            "widgets": {"kpis": {"visible": True}},
            "shortcuts": [{"label": "G", "url": "https://g.com"}],
            "todos": [{"text": "Do stuff", "done": False}],
        }
        result = validate_dashboard_preferences(data)
        assert len(result["layout"]) == 1
        assert len(result["widgets"]) == 1
        assert len(result["shortcuts"]) == 1
        assert len(result["todos"]) == 1


# ============================================================================
# _dict_to_bean
# ============================================================================


@pytest.mark.unit
class TestDictToBean:

    def test_converts_empty_dict(self):
        bean = _dict_to_bean({})
        assert isinstance(bean, DashboardPreferencesBean)
        assert bean.layout == []
        assert bean.widgets == {}
        assert bean.shortcuts == []
        assert bean.todos == []

    def test_converts_layout(self):
        data = {
            "layout": [
                {"i": "kpis", "x": 1, "y": 2, "w": 10, "h": 3, "minW": 5, "minH": 2}
            ]
        }
        bean = _dict_to_bean(data)
        assert len(bean.layout) == 1
        item = bean.layout[0]
        assert isinstance(item, LayoutItemBean)
        assert item.i == "kpis"
        assert item.x == 1
        assert item.y == 2
        assert item.w == 10
        assert item.h == 3
        assert item.min_w == 5
        assert item.min_h == 2

    def test_layout_uses_defaults_for_missing_keys(self):
        data = {"layout": [{"i": "test"}]}
        bean = _dict_to_bean(data)
        item = bean.layout[0]
        assert item.x == 0
        assert item.y == 0
        assert item.w == 6
        assert item.h == 3
        assert item.min_w == 2
        assert item.min_h == 2

    def test_layout_default_i_when_missing(self):
        data = {"layout": [{}]}
        bean = _dict_to_bean(data)
        assert bean.layout[0].i == ""

    def test_skips_non_dict_layout_items(self):
        data = {"layout": ["string", 42, {"i": "kpis"}]}
        bean = _dict_to_bean(data)
        assert len(bean.layout) == 1

    def test_converts_shortcuts(self):
        data = {
            "shortcuts": [
                {
                    "id": "s1",
                    "label": "Google",
                    "url": "https://google.com",
                    "icon": "G",
                    "category": "search",
                }
            ]
        }
        bean = _dict_to_bean(data)
        assert len(bean.shortcuts) == 1
        s = bean.shortcuts[0]
        assert isinstance(s, ShortcutBean)
        assert s.id == "s1"
        assert s.label == "Google"
        assert s.url == "https://google.com"
        assert s.icon == "G"
        assert s.category == "search"

    def test_shortcut_defaults(self):
        data = {"shortcuts": [{}]}
        bean = _dict_to_bean(data)
        s = bean.shortcuts[0]
        assert s.id == ""
        assert s.label == ""
        assert s.url == ""
        assert s.icon == "Link"
        assert s.category == ""

    def test_skips_non_dict_shortcut_items(self):
        data = {"shortcuts": ["string", None, {"label": "Ok"}]}
        bean = _dict_to_bean(data)
        assert len(bean.shortcuts) == 1

    def test_converts_todos(self):
        data = {"todos": [{"id": "t1", "text": "Buy milk", "done": True}]}
        bean = _dict_to_bean(data)
        assert len(bean.todos) == 1
        t = bean.todos[0]
        assert isinstance(t, TodoItemBean)
        assert t.id == "t1"
        assert t.text == "Buy milk"
        assert t.done is True

    def test_todo_defaults(self):
        data = {"todos": [{}]}
        bean = _dict_to_bean(data)
        t = bean.todos[0]
        assert t.id == ""
        assert t.text == ""
        assert t.done is False

    def test_skips_non_dict_todo_items(self):
        data = {"todos": ["string", 42, {"text": "Valid"}]}
        bean = _dict_to_bean(data)
        assert len(bean.todos) == 1

    def test_converts_widgets_dict(self):
        data = {"widgets": {"kpis": {"visible": True}}}
        bean = _dict_to_bean(data)
        assert bean.widgets == {"kpis": {"visible": True}}

    def test_todo_done_coerced_to_bool(self):
        data = {"todos": [{"text": "A", "done": 0}, {"text": "B", "done": 1}]}
        bean = _dict_to_bean(data)
        assert bean.todos[0].done is False
        assert bean.todos[1].done is True


# ============================================================================
# get_preferences
# ============================================================================


@pytest.mark.unit
class TestGetPreferences:

    def test_returns_saved_preferences_with_non_empty_layout(
        self, mock_user_repository, sample_user_uuid
    ):
        saved = DashboardPreferencesBean(
            layout=[LayoutItemBean(i="kpis", x=0, y=0, w=12, h=2)],
            widgets={},
        )
        mock_user_repository.get_dashboard_preferences.return_value = saved

        result = get_preferences(mock_user_repository, sample_user_uuid)

        assert result is saved
        mock_user_repository.get_dashboard_preferences.assert_called_once_with(
            sample_user_uuid
        )

    def test_returns_defaults_when_empty_layout(
        self, mock_user_repository, sample_user_uuid
    ):
        mock_user_repository.get_dashboard_preferences.return_value = (
            DashboardPreferencesBean()
        )

        result = get_preferences(mock_user_repository, sample_user_uuid)

        defaults = get_default_preferences()
        assert result == defaults
        assert result is not defaults  # new instance

    def test_returns_defaults_when_layout_is_none(
        self, mock_user_repository, sample_user_uuid
    ):
        bean = DashboardPreferencesBean(layout=[])
        mock_user_repository.get_dashboard_preferences.return_value = bean

        result = get_preferences(mock_user_repository, sample_user_uuid)

        assert result == get_default_preferences()

    def test_calls_repository_with_correct_uuid(
        self, mock_user_repository, sample_user_uuid
    ):
        mock_user_repository.get_dashboard_preferences.return_value = (
            DashboardPreferencesBean(
                layout=[LayoutItemBean(i="kpis")],
            )
        )
        get_preferences(mock_user_repository, sample_user_uuid)
        mock_user_repository.get_dashboard_preferences.assert_called_once_with(
            sample_user_uuid
        )


# ============================================================================
# update_preferences
# ============================================================================


@pytest.mark.unit
class TestUpdatePreferences:

    def test_validates_and_saves(self, mock_user_repository, sample_user_uuid):
        data = {
            "layout": [{"i": "kpis", "x": 0, "y": 0, "w": 12, "h": 2}],
            "widgets": {"kpis": {"visible": True}},
            "shortcuts": [],
            "todos": [],
        }
        mock_user_repository.update_dashboard_preferences.return_value = _dict_to_bean(
            data
        )

        result = update_preferences(mock_user_repository, sample_user_uuid, data)

        assert isinstance(result, DashboardPreferencesBean)
        mock_user_repository.update_dashboard_preferences.assert_called_once()
        call_args = mock_user_repository.update_dashboard_preferences.call_args
        assert call_args[0][0] == sample_user_uuid
        bean = call_args[0][1]
        assert isinstance(bean, DashboardPreferencesBean)
        assert bean.layout[0].i == "kpis"

    def test_cleans_data_before_saving(self, mock_user_repository, sample_user_uuid):
        data = {
            "layout": [{"not_valid": True}],
            "shortcuts": [{"label": "", "url": ""}],
        }
        mock_user_repository.update_dashboard_preferences.return_value = (
            DashboardPreferencesBean()
        )

        update_preferences(mock_user_repository, sample_user_uuid, data)

        call_args = mock_user_repository.update_dashboard_preferences.call_args
        bean = call_args[0][1]
        assert isinstance(bean, DashboardPreferencesBean)
        assert bean.layout == []
        assert bean.shortcuts == []

    def test_passes_cleaned_bean_to_repository(
        self, mock_user_repository, sample_user_uuid
    ):
        data = {
            "layout": [{"i": "kpis", "x": 1, "y": 2, "w": 10, "h": 5}],
            "shortcuts": [{"label": "Test", "url": "https://test.com", "icon": "Star"}],
            "todos": [{"text": "Todo 1", "done": True}],
        }
        expected_bean = _dict_to_bean(validate_dashboard_preferences(data))
        mock_user_repository.update_dashboard_preferences.return_value = expected_bean

        update_preferences(mock_user_repository, sample_user_uuid, data)

        call_args = mock_user_repository.update_dashboard_preferences.call_args
        bean = call_args[0][1]
        assert bean.layout[0].x == 1
        assert bean.layout[0].y == 2
        assert bean.shortcuts[0].label == "Test"
        assert bean.shortcuts[0].icon == "Star"
        assert bean.todos[0].text == "Todo 1"
        assert bean.todos[0].done is True

    def test_returns_repository_result(self, mock_user_repository, sample_user_uuid):
        expected = DashboardPreferencesBean(
            layout=[LayoutItemBean(i="planning")],
        )
        mock_user_repository.update_dashboard_preferences.return_value = expected

        result = update_preferences(
            mock_user_repository,
            sample_user_uuid,
            {"layout": [{"i": "planning"}]},
        )

        assert result is expected


# ============================================================================
# Cas d'erreur
# ============================================================================


@pytest.mark.unit
class TestDashboardPreferencesErrors:

    def test_get_preferences_propagates_repository_exception(
        self, mock_user_repository, sample_user_uuid
    ):
        mock_user_repository.get_dashboard_preferences.side_effect = Exception(
            "DB error"
        )

        with pytest.raises(Exception, match="DB error"):
            get_preferences(mock_user_repository, sample_user_uuid)

    def test_update_preferences_propagates_repository_exception(
        self, mock_user_repository, sample_user_uuid
    ):
        mock_user_repository.update_dashboard_preferences.side_effect = Exception(
            "DB error"
        )

        with pytest.raises(Exception, match="DB error"):
            update_preferences(
                mock_user_repository,
                sample_user_uuid,
                {"layout": [], "shortcuts": [], "todos": []},
            )


# ============================================================================
# MUTATION-KILLING: Dict key mutations and logger messages
# ============================================================================


@pytest.mark.unit
class TestDashboardPreferencesMutationKilling:
    """Kill mutants on dict key accesses and logger messages."""

    def test_clean_layout_uses_h_key_with_default_3(self):
        """Verify item.get('h', 3) uses the 'h' key correctly."""
        raw = [{"i": "test", "h": 5}]
        result = _clean_layout(raw)
        assert result[0]["h"] == 5

    def test_clean_layout_h_default_is_3(self):
        """Verify default value for 'h' key is 3 (not some mutated value)."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["h"] == 3

    def test_clean_layout_w_default_is_6(self):
        """Verify default value for 'w' key is 6."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["w"] == 6

    def test_clean_layout_x_default_is_0(self):
        """Verify default value for 'x' key is 0."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["x"] == 0

    def test_clean_layout_y_default_is_0(self):
        """Verify default value for 'y' key is 0."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["y"] == 0

    def test_clean_layout_minW_default_is_2(self):
        """Verify default value for 'minW' key is 2."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["minW"] == 2

    def test_clean_layout_minH_default_is_2(self):
        """Verify default value for 'minH' key is 2."""
        raw = [{"i": "test"}]
        result = _clean_layout(raw)
        assert result[0]["minH"] == 2

    def test_clean_layout_with_all_keys_present(self):
        """Test that when all keys are present, they are used (not defaults)."""
        raw = [{"i": "kpis", "x": 10, "y": 20, "w": 8, "h": 7, "minW": 3, "minH": 1}]
        result = _clean_layout(raw)
        assert result[0]["x"] == 10
        assert result[0]["y"] == 20
        assert result[0]["w"] == 8
        assert result[0]["h"] == 7
        assert result[0]["minW"] == 3
        assert result[0]["minH"] == 1

    def test_dict_to_bean_layout_h_default_is_3(self):
        """Verify _dict_to_bean uses correct default for h (3)."""
        data = {"layout": [{"i": "test"}]}
        bean = _dict_to_bean(data)
        assert bean.layout[0].h == 3

    def test_dict_to_bean_layout_w_default_is_6(self):
        """Verify _dict_to_bean uses correct default for w (6)."""
        data = {"layout": [{"i": "test"}]}
        bean = _dict_to_bean(data)
        assert bean.layout[0].w == 6

    def test_update_preferences_logs_message(
        self, mock_user_repository, sample_user_uuid
    ):
        """Verify logger.info is called with 'Preferences dashboard mises a jour'."""
        from unittest.mock import patch

        mock_user_repository.update_dashboard_preferences.return_value = (
            DashboardPreferencesBean()
        )

        with patch(
            "app.domain.user.services.dashboard_preferences_service.logger"
        ) as mock_logger:
            update_preferences(
                mock_user_repository,
                sample_user_uuid,
                {"layout": [], "shortcuts": [], "todos": []},
            )
            mock_logger.info.assert_called()
            log_msg = mock_logger.info.call_args[0][0]
            assert "Preferences dashboard" in log_msg
