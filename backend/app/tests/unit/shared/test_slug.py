"""Tests unitaires de l'util slug (logique pure, sans BDD)."""

import pytest

from app.domain.shared.slug import (
    build_campaign_slug,
    build_fsec_slug,
    extract_leading_year,
    slugify_text,
)


@pytest.mark.unit
class TestSlugifyText:
    def test_lowercase_and_hyphens(self):
        assert slugify_text("Essai Pression") == "essai-pression"

    def test_translitterates_accents(self):
        assert slugify_text("Été à Côté") == "ete-a-cote"

    def test_strips_special_chars(self):
        assert slugify_text("Joint #1 (amont)") == "joint-1-amont"

    def test_keeps_underscores(self):
        # slugify conserve les underscores (\w) : cohérent avec l'exemple
        # utilisateur `nom_de_la_fsec`.
        assert slugify_text("FA_2024_01") == "fa_2024_01"

    @pytest.mark.parametrize("value", ["", None])
    def test_empty_or_none(self, value):
        assert slugify_text(value) == ""


@pytest.mark.unit
class TestBuildCampaignSlug:
    def test_nominal(self):
        assert (
            build_campaign_slug(2024, "S1", "LMJ", "Essai pression")
            == "2024-s1-lmj-essai-pression"
        )

    def test_installation_none_fallback(self):
        assert (
            build_campaign_slug(2024, "S1", None, "Essai")
            == "2024-s1-sans-installation-essai"
        )

    def test_empty_semester_skipped(self):
        assert build_campaign_slug(2024, "", "LMJ", "Essai") == "2024-lmj-essai"

    def test_semester_disambiguates_recurring_campaign(self):
        # Même nom/année/installation mais semestres différents → slugs distincts.
        s1 = build_campaign_slug(2024, "S1", "LMJ", "Essai")
        s2 = build_campaign_slug(2024, "S2", "LMJ", "Essai")
        assert s1 != s2


@pytest.mark.unit
class TestBuildFsecSlug:
    def test_prefixed_by_campaign(self):
        assert (
            build_fsec_slug(2024, "S1", "LMJ", "Camp A", "Joint Amont")
            == "2024-s1-lmj-camp-a-joint-amont"
        )

    def test_starts_with_year(self):
        slug = build_fsec_slug(2024, "S1", "LMJ", "Camp", "FSEC")
        assert slug.startswith("2024-")


@pytest.mark.unit
class TestExtractLeadingYear:
    def test_extracts_year(self):
        assert extract_leading_year("2024-s1-lmj-essai") == 2024

    @pytest.mark.parametrize("value", ["g01", "", None, "abc-2024"])
    def test_no_year(self, value):
        assert extract_leading_year(value) is None
