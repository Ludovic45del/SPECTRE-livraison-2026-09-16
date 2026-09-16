"""Tests unitaires du helper de nommage (noms complets campagne / FSEC)."""

import pytest

from app.domain.shared.naming import (
    build_campaign_display_name,
    build_fsec_display_name,
)


@pytest.mark.unit
class TestBuildCampaignDisplayName:
    def test_nominal(self):
        assert build_campaign_display_name(2026, "LMJ", "gorfou") == "2026-LMJ_gorfou"

    def test_unknown_installation_falls_back_to_unk(self):
        assert build_campaign_display_name(2026, None, "gorfou") == "2026-UNK_gorfou"


@pytest.mark.unit
class TestBuildFsecDisplayName:
    def test_nominal_appends_short_name_with_underscore(self):
        assert (
            build_fsec_display_name(2026, "LMJ", "gorfou", "2") == "2026-LMJ_gorfou_2"
        )

    def test_unknown_installation(self):
        assert build_fsec_display_name(2026, None, "gorfou", "2") == "2026-UNK_gorfou_2"

    def test_short_name_already_prefixed_is_not_duplicated(self):
        """FSEC historiques nommées avec le nom complet (R13)."""
        assert (
            build_fsec_display_name(2026, "LMJ", "TAGADA", "2026-LMJ_TAGADA_C01")
            == "2026-LMJ_TAGADA_C01"
        )

    def test_empty_short_name(self):
        assert build_fsec_display_name(2026, "LMJ", "gorfou", "") == "2026-LMJ_gorfou_"
