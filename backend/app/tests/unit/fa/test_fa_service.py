"""
Tests unitaires pour le service FA.

Vérifie la logique métier des Fiches d'Anomalie (FA).
Conçu pour tuer les mutants de mutation testing :
- String constants mutés (noms de champs dans les sets)
- Regex replacements mutés ("" → "XXXX")
- Conditions inversées (or ↔ and, > ↔ <)
- Noms de champs d'exception mutés
- Valeurs de retour modifiées
- Logger mis à None
"""

import logging
from datetime import date
from unittest.mock import MagicMock, create_autospec, patch

import pytest

from app.domain.campaign.interface.campaign_repository import ICampaignRepository
from app.domain.exceptions import (
    ConflictException,
    InvalidDataException,
    NotFoundException,
)
from app.domain.fa.interface.fa_repository import IFaRepository
from app.domain.fa.models.fa_bean import FaBean
from app.domain.fa.models.fa_constants import FaStatus
from app.domain.fa.models.fa_creation_context_bean import FaCreationContextBean
from app.domain.fa.services import fa_service
from app.domain.fa.services.fa_service import (
    _PROTECTED_MERGE_FIELDS,
    _merge_fa_beans,
    _parse_fa_sequence,
    close_fa,
    count_all_fas,
    create_fa,
    delete_fa,
    generate_fa_identifier,
    get_all_fas,
    get_fa_by_uuid,
    get_fas_by_fsec_version_id,
    patch_fa,
    regenerate_fa_identifiers_for_campaign,
    regenerate_fa_identifiers_for_fsec,
    resolve_fa_creation_context,
    update_fa,
    validate_open_phase,
    validate_progress_phase,
)
from app.domain.fsec.interface.fsec_repository import IFsecRepository
from app.domain.fsec.models.fsec_bean import FsecBean

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def repo():
    """Mock IFaRepository avec autospec."""
    return create_autospec(IFaRepository, instance=True)


@pytest.fixture
def fsec_repo():
    """Mock IFsecRepository."""
    return MagicMock(spec=IFsecRepository)


@pytest.fixture
def campaign_repo():
    """Mock ICampaignRepository."""
    return MagicMock(spec=ICampaignRepository)


@pytest.fixture
def sample_fa():
    """Fixture FA pour tests — statut Ouvert."""
    return FaBean(
        uuid="fa-uuid-001",
        fsec_version_id="fsec-version-001",
        status_id=FaStatus.OPEN,
        type_id=None,
        criticality_id=None,
        identifier="FA_2024_Campagne_Test_FSEC_01",
        fsec_step_id=1,
        fsec_step_other=None,
        discoverer="John Doe",
        event_date=date(2024, 1, 15),
        observation="Anomalie détectée lors de l'assemblage",
        location_equipment="Banc 1",
        quick_analysis="Défaut de soudure",
        immediate_measures="Arrêt de la production",
        iec_validation_open=False,
        iec_validation_open_date=None,
        iec_validation_open_name=None,
        cause=None,
        experience_impact=None,
        iec_validation_progress=False,
        iec_validation_progress_name=None,
        closure_validation=None,
        closure_date=None,
        closure_validator_name=None,
    )


@pytest.fixture
def fa_en_cours(sample_fa):
    """FA au statut En cours avec validation Ouvert faite."""
    sample_fa.status_id = FaStatus.IN_PROGRESS
    sample_fa.iec_validation_open = True
    sample_fa.iec_validation_open_date = date(2024, 1, 20)
    sample_fa.iec_validation_open_name = "Validator IEC"
    sample_fa.type_id = 0
    sample_fa.criticality_id = 1
    sample_fa.cause = "Cause identifiée"
    sample_fa.iec_validation_progress = True
    sample_fa.iec_validation_progress_name = "Validator IEC Progress"
    return sample_fa


@pytest.fixture
def fa_en_cours_no_progress_validation(sample_fa):
    """FA au statut En cours SANS validation IEC de la phase En cours."""
    sample_fa.status_id = FaStatus.IN_PROGRESS
    sample_fa.iec_validation_open = True
    sample_fa.iec_validation_open_date = date(2024, 1, 20)
    sample_fa.iec_validation_open_name = "Validator IEC"
    sample_fa.iec_validation_progress = False
    sample_fa.iec_validation_progress_name = None
    return sample_fa


# ============================================================================
# LOGGER MUTATION KILLER
# ============================================================================


@pytest.mark.unit
class TestFaServiceLogger:
    """Kill logger=None mutation."""

    def test_fa_service_has_logger(self):
        """Vérifie que le logger du module n'est pas None."""
        assert fa_service.logger is not None

    def test_fa_service_logger_is_logging_instance(self):
        """Vérifie que le logger est une instance logging."""
        assert isinstance(fa_service.logger, logging.Logger)

    def test_fa_service_logger_name(self):
        """Vérifie le nom du logger."""
        assert fa_service.logger.name == "app.domain.fa.services.fa_service"


# ============================================================================
# GENERATE FA IDENTIFIER
# ============================================================================


@pytest.mark.unit
class TestGenerateFaIdentifier:
    """Tests de la génération d'identifiant FA — couvre les mutations regex."""

    def test_basic_generation(self):
        """Format de base : FA_{year}_{campaign}_{fsec}."""
        result = generate_fa_identifier("CampA", "FsecB", 2024)
        assert result == "FA_2024_CampA_FsecB_01"

    def test_spaces_replaced_by_underscores(self):
        """Les espaces dans les noms sont remplacés par des underscores."""
        result = generate_fa_identifier("Camp A", "Fsec B", 2024)
        assert result == "FA_2024_Camp_A_Fsec_B_01"
        # Vérifie qu'il n'y a PAS d'espace dans le résultat
        assert " " not in result

    def test_dashes_replaced_by_underscores(self):
        """Les tirets dans les noms sont remplacés par des underscores."""
        result = generate_fa_identifier("Camp-A", "Fsec-B", 2024)
        assert result == "FA_2024_Camp_A_Fsec_B_01"
        # Vérifie qu'il n'y a PAS de tiret dans le résultat
        assert "-" not in result

    def test_special_characters_stripped(self):
        """Les caractères spéciaux sont supprimés (regex mutation killer)."""
        result = generate_fa_identifier("Camp@#$A", "Fsec!%&B", 2025)
        assert result == "FA_2025_CampA_FsecB_01"
        # Aucun caractère spécial ne doit rester
        assert "@" not in result
        assert "#" not in result
        assert "$" not in result
        assert "!" not in result
        assert "%" not in result
        assert "&" not in result

    def test_special_chars_with_spaces_and_dashes(self):
        """Combinaison espaces + tirets + caractères spéciaux."""
        result = generate_fa_identifier("Camp Test-01!@#", "FSEC Test-02$%^", 2025)
        assert result == "FA_2025_Camp_Test_01_FSEC_Test_02_01"

    def test_regex_replaces_with_empty_string_not_xxxx(self):
        """Kill mutant: regex substitution replacement "" mutated to "XXXX"."""
        result = generate_fa_identifier("A@B", "C!D", 2024)
        # If mutant replaced "" with "XXXX", result would contain "XXXX"
        assert "XXXX" not in result
        assert result == "FA_2024_AB_CD_01"

    def test_parentheses_stripped(self):
        """Les parenthèses sont supprimées."""
        result = generate_fa_identifier("Camp(A)", "Fsec(B)", 2024)
        assert result == "FA_2024_CampA_FsecB_01"
        assert "(" not in result
        assert ")" not in result

    def test_dots_stripped(self):
        """Les points sont supprimés."""
        result = generate_fa_identifier("Camp.A", "Fsec.B", 2024)
        assert result == "FA_2024_CampA_FsecB_01"
        assert "." not in result

    def test_year_in_result(self):
        """L'année est présente dans le résultat."""
        result = generate_fa_identifier("Camp", "Fsec", 2025)
        assert "2025" in result

    def test_different_year(self):
        """Vérifier que le résultat change si l'année change."""
        r1 = generate_fa_identifier("Camp", "Fsec", 2024)
        r2 = generate_fa_identifier("Camp", "Fsec", 2025)
        assert r1 != r2
        assert "2024" in r1
        assert "2025" in r2

    def test_prefix_is_FA(self):
        """L'identifiant commence par 'FA_'."""
        result = generate_fa_identifier("C", "F", 2024)
        assert result.startswith("FA_")

    def test_alphanumeric_and_underscore_only_in_campaign(self):
        """Après nettoyage, la partie campagne ne contient que [A-Za-z0-9_]."""
        import re

        result = generate_fa_identifier("Camp!@# Test$%-01", "F", 2024)
        # Extract campaign part: FA_2024_{campaign}_F
        parts = result.split("_")
        # Parts: ['FA', '2024', 'Camp', 'Test', '01', 'F']
        campaign_part = "_".join(parts[2:-1])
        assert re.match(r"^[A-Za-z0-9_]+$", campaign_part)

    def test_alphanumeric_and_underscore_only_in_fsec(self):
        """Après nettoyage, la partie FSEC ne contient que [A-Za-z0-9_]."""
        import re

        result = generate_fa_identifier("C", "Fsec!@# Test$%-02", 2024)
        # Last part after C_ = fsec part
        # FA_2024_C_Fsec_Test_02
        parts = result.split("_")
        fsec_part = "_".join(parts[3:])
        assert re.match(r"^[A-Za-z0-9_]+$", fsec_part)

    def test_empty_campaign_name(self):
        """Nom de campagne vide : identifiant réduit au seul segment FSEC (pas de double underscore)."""
        result = generate_fa_identifier("", "Fsec", 2024)
        assert result == "FA_2024_Fsec_01"

    def test_empty_fsec_name(self):
        """Nom de FSEC vide produit un identifiant sans partie FSEC."""
        result = generate_fa_identifier("Camp", "", 2024)
        assert result == "FA_2024_Camp__01"

    # ------------------------------------------------------------------
    # Dédoublonnage campagne/FSEC (R13)
    # ------------------------------------------------------------------

    def test_dedupe_fsec_equals_campaign(self):
        """FSEC == campagne : un seul segment dans l'identifiant."""
        result = generate_fa_identifier("TAGADA", "TAGADA", 2026)
        assert result == "FA_2026_TAGADA_01"

    def test_dedupe_fsec_prefixed_by_campaign(self):
        """FSEC préfixée par `{campagne}_` : le segment campagne n'est pas répété."""
        result = generate_fa_identifier("TAGADA", "TAGADA_C01", 2026)
        assert result == "FA_2026_TAGADA_C01_01"

    def test_dedupe_fsec_prefixed_after_cleaning(self):
        """Le recouvrement est détecté APRÈS nettoyage (espaces/tirets → underscore)."""
        result = generate_fa_identifier("Camp Test", "Camp-Test C01", 2026)
        assert result == "FA_2026_Camp_Test_C01_01"

    def test_dedupe_case_insensitive(self):
        """Le recouvrement est détecté sans tenir compte de la casse (segment FSEC conservé tel quel)."""
        result = generate_fa_identifier("tagada", "TAGADA_C01", 2026)
        assert result == "FA_2026_TAGADA_C01_01"

    def test_no_dedupe_campaign_suffixed_by_fsec(self):
        """Pas de règle symétrique : deux FSEC distinctes (« TAGADA » vs une FSEC
        nommée « Cible_TAGADA ») ne doivent jamais converger vers le même
        identifiant — le format nominal est conservé."""
        result = generate_fa_identifier("Cible_TAGADA", "TAGADA", 2026)
        assert result == "FA_2026_Cible_TAGADA_TAGADA_01"

    def test_dedupe_campaign_as_inner_segment(self):
        """Nom complet de cible : la campagne apparaît comme segment interne
        (« 2026-LMJ_TAGADA_C01 » pour la campagne « TAGADA ») et n'est pas répétée."""
        result = generate_fa_identifier("TAGADA", "2026-LMJ_TAGADA_C01", 2026)
        assert result == "FA_2026_2026_LMJ_TAGADA_C01_01"

    def test_no_dedupe_on_partial_inner_segment(self):
        """« TAG » n'est pas un segment complet de « TAGADA_C01 » : pas de dédoublonnage."""
        result = generate_fa_identifier("TAG", "TAGADA_C01", 2026)
        assert result == "FA_2026_TAG_TAGADA_C01_01"

    def test_no_dedupe_on_partial_overlap_without_separator(self):
        """Pas de dédoublonnage si le préfixe n'est pas suivi d'un underscore (TAGADAC01 ≠ TAGADA_...)."""
        result = generate_fa_identifier("TAGADA", "TAGADAC01", 2026)
        assert result == "FA_2026_TAGADA_TAGADAC01_01"

    def test_dedupe_preserves_sequence_suffix(self):
        """Le suffixe séquentiel reste appliqué après dédoublonnage."""
        result = generate_fa_identifier("TAGADA", "TAGADA_C01", 2026, sequence=7)
        assert result == "FA_2026_TAGADA_C01_07"

    def test_nominal_case_unchanged_by_dedupe(self):
        """Cas nominal sans recouvrement : format historique inchangé."""
        result = generate_fa_identifier("CampA", "FsecB", 2024)
        assert result == "FA_2024_CampA_FsecB_01"


# ============================================================================
# CREATE FA
# ============================================================================


@pytest.mark.unit
class TestCreateFa:
    """Tests création FA — couvre les mutations de conditions et champs d'exception."""

    def test_create_success_returns_result(self, repo, sample_fa):
        """Test que create_fa retourne le résultat du repository.create."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        repo.create.return_value = sample_fa

        result = create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert result is sample_fa
        repo.create.assert_called_once()

    def test_create_sets_status_to_open(self, repo, sample_fa):
        """Le statut est forcé à FaStatus.OPEN (0) avant la création."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        sample_fa.status_id = FaStatus.CLOSED  # Tentative de tricher

        created_bean = None

        def capture(bean):
            nonlocal created_bean
            created_bean = bean
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert created_bean.status_id == FaStatus.OPEN
        assert created_bean.status_id == 0

    def test_create_generates_identifier(self, repo, sample_fa):
        """L'identifiant est généré automatiquement à partir des paramètres."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False

        captured = {}

        def capture(bean):
            captured["identifier"] = bean.identifier
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Campagne Test", "FSEC", 2024)

        assert captured["identifier"] == "FA_2024_Campagne_Test_FSEC_01"

    def test_create_duplicate_identifier_raises_conflict(self, repo, sample_fa):
        """ConflictException si un identifiant généré existe déjà."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = True

        with pytest.raises(ConflictException) as exc_info:
            create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert exc_info.value.field == "identifier"
        assert "identifier" in str(exc_info.value)

    def test_create_does_not_call_create_on_identifier_conflict(self, repo, sample_fa):
        """repository.create n'est PAS appelé si identifier existe déjà."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = True

        with pytest.raises(ConflictException):
            create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        repo.create.assert_not_called()

    def test_create_uses_max_sequence_with_bean_value(self, repo, sample_fa):
        """max_sequence_by_fsec_version_id est appelé avec le fsec_version_id du bean."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        repo.create.return_value = sample_fa

        create_fa(repo, sample_fa, "C", "F", 2024)

        repo.max_sequence_by_fsec_version_id.assert_called_once_with(
            sample_fa.fsec_version_id
        )

    def test_create_second_fa_increments_sequence(self, repo, sample_fa):
        """Une 2e FA sur la même FSEC reçoit le suffixe suivant (multi-FA assumé)."""
        repo.max_sequence_by_fsec_version_id.return_value = 1
        repo.exists_by_identifier.return_value = False

        captured = {}

        def capture(bean):
            captured["identifier"] = bean.identifier
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert captured["identifier"].endswith("_02")

    def test_create_sequence_no_collision_after_delete(self, repo, sample_fa):
        """Après hard-delete d'une FA du milieu, le max-suffixe évite la collision.

        FSEC avec _01/_02/_03, _02 supprimée → max=3 → la FA suivante est _04
        (pas _03, qui réutiliserait un identifier détruit).
        """
        repo.max_sequence_by_fsec_version_id.return_value = 3
        repo.exists_by_identifier.return_value = False

        captured = {}

        def capture(bean):
            captured["identifier"] = bean.identifier
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert captured["identifier"].endswith("_04")

    def test_create_bumps_sequence_on_cross_fsec_collision(self, repo, sample_fa):
        """Collision inter-FSEC due au dédoublonnage R13 (ex. FSEC « C01 » vs
        « TAGADA_C01 ») : la séquence avance jusqu'au premier numéro libre au
        lieu de renvoyer un 409."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        # _01 déjà pris par la FA d'une autre FSEC au même « nom » dédoublonné.
        repo.exists_by_identifier.side_effect = [True, False, False]

        captured = {}

        def capture(bean):
            captured["identifier"] = bean.identifier
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "TAGADA", "TAGADA_C01", 2026)

        assert captured["identifier"] == "FA_2026_TAGADA_C01_02"

    def test_create_return_value_is_from_repository(self, repo, sample_fa):
        """Kill mutant: return value changed — vérifie que le résultat vient bien de repo.create."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        expected = FaBean(uuid="returned-uuid")
        repo.create.return_value = expected

        result = create_fa(repo, sample_fa, "C", "F", 2024)

        assert result is expected

    def test_create_sets_opening_date_to_today_when_missing(self, repo, sample_fa):
        """La date d'ouverture est posée à aujourd'hui à la création si absente."""
        from datetime import date

        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        sample_fa.iec_validation_open_date = None

        captured = {}

        def capture(bean):
            captured["opening_date"] = bean.iec_validation_open_date
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert captured["opening_date"] == date.today()

    def test_create_preserves_provided_opening_date(self, repo, sample_fa):
        """Une date d'ouverture fournie explicitement (ex: backfill) est respectée."""
        from datetime import date

        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        fixed = date(2020, 1, 15)
        sample_fa.iec_validation_open_date = fixed

        captured = {}

        def capture(bean):
            captured["opening_date"] = bean.iec_validation_open_date
            return bean

        repo.create.side_effect = capture

        create_fa(repo, sample_fa, "Camp", "FSEC", 2024)

        assert captured["opening_date"] == fixed


# ============================================================================
# RESOLVE FA CREATION CONTEXT
# ============================================================================


@pytest.mark.unit
class TestResolveFaCreationContext:
    """Tests résolution du contexte de création FA."""

    def test_context_with_valid_fsec_and_campaign(self, fsec_repo, campaign_repo):
        """Résolution avec FSEC et campagne valides."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "FSEC-Alpha"
        mock_fsec.campaign_id = "camp-001"
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        mock_campaign = MagicMock()
        mock_campaign.name = "Campagne Alpha"
        mock_campaign.year = 2025
        campaign_repo.get_by_uuid.return_value = mock_campaign

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert isinstance(result, FaCreationContextBean)
        assert result.campaign_name == "Campagne Alpha"
        assert result.fsec_name == "FSEC-Alpha"
        assert result.year == 2025

    def test_context_missing_fsec_version_id_empty_string(
        self, fsec_repo, campaign_repo
    ):
        """InvalidDataException si fsec_version_id est une chaîne vide."""
        fa_bean = FaBean(fsec_version_id="")

        with pytest.raises(InvalidDataException) as exc_info:
            resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert "fsec_version_id" in str(exc_info.value)

    def test_context_missing_fsec_version_id_none(self, fsec_repo, campaign_repo):
        """InvalidDataException si fsec_version_id est None."""
        fa_bean = FaBean()
        fa_bean.fsec_version_id = None

        with pytest.raises(InvalidDataException):
            resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

    def test_context_fsec_not_found(self, fsec_repo, campaign_repo):
        """NotFoundException si la FSEC n'existe pas."""
        fa_bean = FaBean(fsec_version_id="nonexistent-fsec")
        fsec_repo.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert exc_info.value.resource == "FSEC"
        assert "FSEC" in str(exc_info.value)

    def test_context_fsec_not_found_exception_identifier(
        self, fsec_repo, campaign_repo
    ):
        """Kill mutant: l'identifiant dans NotFoundException est bien le fsec_version_id."""
        fa_bean = FaBean(fsec_version_id="specific-fsec-id")
        fsec_repo.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert exc_info.value.identifier == "specific-fsec-id"

    def test_context_no_campaign_id_defaults_unknown(self, fsec_repo, campaign_repo):
        """Si FSEC n'a pas de campaign_id, le nom est 'Unknown'."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "FSEC-Beta"
        mock_fsec.campaign_id = None
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.campaign_name == "Unknown"
        assert result.fsec_name == "FSEC-Beta"
        campaign_repo.get_by_uuid.assert_not_called()

    def test_context_no_campaign_id_defaults_year_to_today(
        self, fsec_repo, campaign_repo
    ):
        """Si FSEC n'a pas de campaign_id, year = date.today().year."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "F"
        mock_fsec.campaign_id = None
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.year == date.today().year

    def test_context_campaign_not_found_defaults(self, fsec_repo, campaign_repo):
        """Si campaign_repository.get_by_uuid retourne None, on garde les défauts."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "FSEC-Gamma"
        mock_fsec.campaign_id = "camp-nonexistent"
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        campaign_repo.get_by_uuid.return_value = None

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.campaign_name == "Unknown"
        assert result.year == date.today().year
        assert result.fsec_name == "FSEC-Gamma"

    def test_context_returns_fsec_name_from_fsec(self, fsec_repo, campaign_repo):
        """Kill mutant: le fsec_name vient de fsec.name, pas d'ailleurs."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "UniqueSpecificFsecName"
        mock_fsec.campaign_id = None
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.fsec_name == "UniqueSpecificFsecName"

    def test_context_returns_campaign_year(self, fsec_repo, campaign_repo):
        """Kill mutant: l'année vient de campaign.year, pas de date.today()."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "F"
        mock_fsec.campaign_id = "camp-001"
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        mock_campaign = MagicMock()
        mock_campaign.name = "C"
        mock_campaign.year = 1999  # année distincte pour tester
        campaign_repo.get_by_uuid.return_value = mock_campaign

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.year == 1999

    def test_context_returns_campaign_name(self, fsec_repo, campaign_repo):
        """Kill mutant: campaign_name vient de campaign.name."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "F"
        mock_fsec.campaign_id = "camp-001"
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        mock_campaign = MagicMock()
        mock_campaign.name = "SpecificCampaignName"
        mock_campaign.year = 2024
        campaign_repo.get_by_uuid.return_value = mock_campaign

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result.campaign_name == "SpecificCampaignName"

    def test_context_return_type_is_creation_context_bean(
        self, fsec_repo, campaign_repo
    ):
        """Kill mutant: le retour est un FaCreationContextBean, pas None ou autre."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "F"
        mock_fsec.campaign_id = None
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        result = resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        assert result is not None
        assert isinstance(result, FaCreationContextBean)


# ============================================================================
# GET FA BY UUID
# ============================================================================


@pytest.mark.unit
class TestGetFaByUuid:
    """Tests récupération par UUID."""

    def test_success_returns_bean(self, repo, sample_fa):
        """Retourne le bean si trouvé."""
        repo.get_by_uuid.return_value = sample_fa

        result = get_fa_by_uuid(repo, "fa-uuid-001")

        assert result is sample_fa
        assert result.uuid == "fa-uuid-001"

    def test_not_found_raises_exception(self, repo):
        """NotFoundException si le repository retourne None."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fa_by_uuid(repo, "nonexistent")

        assert exc_info.value.resource == "FA"
        assert "FA" in str(exc_info.value)

    def test_not_found_exception_contains_uuid(self, repo):
        """L'exception contient le UUID recherché."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fa_by_uuid(repo, "specific-uuid-123")

        assert exc_info.value.identifier == "specific-uuid-123"
        assert "specific-uuid-123" in str(exc_info.value)

    def test_calls_repository_with_correct_uuid(self, repo, sample_fa):
        """Le repository est appelé avec le bon UUID."""
        repo.get_by_uuid.return_value = sample_fa

        get_fa_by_uuid(repo, "my-uuid")

        repo.get_by_uuid.assert_called_once_with("my-uuid")

    def test_return_value_is_from_repository(self, repo):
        """Kill mutant: return value changed."""
        expected = FaBean(uuid="returned-bean")
        repo.get_by_uuid.return_value = expected

        result = get_fa_by_uuid(repo, "returned-bean")

        assert result is expected


# ============================================================================
# GET ALL FAS
# ============================================================================


@pytest.mark.unit
class TestGetAllFas:
    """Tests récupération de toutes les FA."""

    def test_returns_list_from_repository(self, repo, sample_fa):
        """Retourne la liste du repository."""
        repo.get_all.return_value = [sample_fa]

        result = get_all_fas(repo)

        assert result == [sample_fa]
        assert len(result) == 1

    def test_returns_empty_list(self, repo):
        """Retourne une liste vide si aucune FA."""
        repo.get_all.return_value = []

        result = get_all_fas(repo)

        assert result == []
        assert len(result) == 0

    def test_passes_limit_and_offset(self, repo):
        """Les paramètres limit et offset sont transmis au repository."""
        repo.get_all.return_value = []

        get_all_fas(repo, limit=10, offset=20)

        repo.get_all.assert_called_once_with(limit=10, offset=20)

    def test_default_limit_is_none_and_offset_is_zero(self, repo):
        """Par défaut limit=None et offset=0."""
        repo.get_all.return_value = []

        get_all_fas(repo)

        repo.get_all.assert_called_once_with(limit=None, offset=0)

    def test_return_value_is_from_repository(self, repo):
        """Kill mutant: return value changed."""
        expected = [FaBean(uuid="a"), FaBean(uuid="b")]
        repo.get_all.return_value = expected

        result = get_all_fas(repo)

        assert result is expected


# ============================================================================
# COUNT ALL FAS
# ============================================================================


@pytest.mark.unit
class TestCountAllFas:
    """Tests comptage FA."""

    def test_returns_count_from_repository(self, repo):
        """Retourne le nombre du repository."""
        repo.count_all.return_value = 42

        result = count_all_fas(repo)

        assert result == 42

    def test_returns_zero(self, repo):
        """Retourne 0 si aucune FA."""
        repo.count_all.return_value = 0

        result = count_all_fas(repo)

        assert result == 0

    def test_return_value_is_from_repository(self, repo):
        """Kill mutant: return value changed."""
        repo.count_all.return_value = 99

        result = count_all_fas(repo)

        assert result == 99
        assert result is not None


# ============================================================================
# GET FA BY FSEC VERSION ID
# ============================================================================


@pytest.mark.unit
class TestGetFaByFsecVersionId:
    """Tests récupération par FSEC version ID."""

    def test_returns_list_of_beans(self, repo, sample_fa):
        """Retourne la liste des FA de la FSEC (une FSEC peut en avoir plusieurs)."""
        repo.get_all_by_fsec_version_id.return_value = [sample_fa]

        result = get_fas_by_fsec_version_id(repo, "fsec-version-001")

        assert result == [sample_fa]

    def test_returns_empty_list_when_none(self, repo):
        """Liste vide si aucune FA pour cette FSEC (pas d'exception)."""
        repo.get_all_by_fsec_version_id.return_value = []

        result = get_fas_by_fsec_version_id(repo, "nonexistent-fsec")

        assert result == []

    def test_calls_repository_with_correct_id(self, repo, sample_fa):
        """Le repository est appelé avec le bon fsec_version_id."""
        repo.get_all_by_fsec_version_id.return_value = [sample_fa]

        get_fas_by_fsec_version_id(repo, "my-fsec-id")

        repo.get_all_by_fsec_version_id.assert_called_once_with("my-fsec-id")


# ============================================================================
# _PROTECTED_MERGE_FIELDS — Kill string constant mutations
# ============================================================================


@pytest.mark.unit
class TestProtectedMergeFields:
    """Kill mutants: string constants in _PROTECTED_MERGE_FIELDS set."""

    def test_uuid_is_protected(self):
        assert "uuid" in _PROTECTED_MERGE_FIELDS

    def test_fsec_version_id_is_protected(self):
        assert "fsec_version_id" in _PROTECTED_MERGE_FIELDS

    def test_identifier_is_protected(self):
        assert "identifier" in _PROTECTED_MERGE_FIELDS

    def test_status_id_is_protected(self):
        assert "status_id" in _PROTECTED_MERGE_FIELDS

    def test_iec_validation_open_is_protected(self):
        assert "iec_validation_open" in _PROTECTED_MERGE_FIELDS

    def test_iec_validation_open_date_is_protected(self):
        assert "iec_validation_open_date" in _PROTECTED_MERGE_FIELDS

    def test_iec_validation_open_name_is_protected(self):
        assert "iec_validation_open_name" in _PROTECTED_MERGE_FIELDS

    def test_iec_validation_progress_is_protected(self):
        assert "iec_validation_progress" in _PROTECTED_MERGE_FIELDS

    def test_iec_validation_progress_name_is_protected(self):
        assert "iec_validation_progress_name" in _PROTECTED_MERGE_FIELDS

    def test_closure_validation_is_protected(self):
        assert "closure_validation" in _PROTECTED_MERGE_FIELDS

    def test_closure_date_is_protected(self):
        assert "closure_date" in _PROTECTED_MERGE_FIELDS

    def test_closure_validator_name_is_protected(self):
        assert "closure_validator_name" in _PROTECTED_MERGE_FIELDS

    def test_created_at_is_protected(self):
        assert "created_at" in _PROTECTED_MERGE_FIELDS

    def test_last_updated_is_protected(self):
        assert "last_updated" in _PROTECTED_MERGE_FIELDS

    def test_exact_field_count(self):
        """Vérifie le nombre exact de champs protégés (kill ajout/suppression mutants).

        17 champs : is_active a été retiré (passage de la FA en hard delete).
        discoverer_user_uuid n'est pas protégé (le découvreur reste modifiable).
        """
        assert len(_PROTECTED_MERGE_FIELDS) == 17

    def test_no_mutated_field_names(self):
        """Kill mutant: aucun nom de champ ne contient 'XX'."""
        for field in _PROTECTED_MERGE_FIELDS:
            assert "XX" not in field, f"Mutated field name detected: {field}"


# ============================================================================
# _MERGE_FA_BEANS
# ============================================================================


@pytest.mark.unit
class TestMergeFaBeans:
    """Tests du merge de beans FA."""

    def test_protected_fields_preserved(self):
        """Les champs protégés gardent les valeurs de l'existant."""
        existing = FaBean(
            uuid="original-uuid",
            fsec_version_id="original-fsec",
            identifier="FA_ORIGINAL",
            status_id=FaStatus.OPEN,
            iec_validation_open=True,
            iec_validation_open_date=date(2024, 1, 20),
            iec_validation_open_name="IEC User",
        )
        updated = FaBean(
            uuid="changed-uuid",
            fsec_version_id="changed-fsec",
            identifier="FA_CHANGED",
            status_id=FaStatus.CLOSED,
            iec_validation_open=False,
            iec_validation_open_date=date(2099, 1, 1),
            iec_validation_open_name="Hacker",
        )

        merged = _merge_fa_beans(existing, updated)

        assert merged.uuid == "original-uuid"
        assert merged.fsec_version_id == "original-fsec"
        assert merged.identifier == "FA_ORIGINAL"
        assert merged.status_id == FaStatus.OPEN
        assert merged.iec_validation_open is True
        assert merged.iec_validation_open_date == date(2024, 1, 20)
        assert merged.iec_validation_open_name == "IEC User"

    def test_non_protected_fields_updated_when_not_none(self):
        """Les champs non-protégés sont mis à jour quand non None."""
        existing = FaBean(
            uuid="uuid-1",
            discoverer="Old Discoverer",
            observation="Old observation",
            quick_analysis="Old analysis",
        )
        updated = FaBean(
            uuid="uuid-1",
            discoverer="New Discoverer",
            observation="New observation",
            quick_analysis=None,  # Devrait garder l'existant
        )

        merged = _merge_fa_beans(existing, updated)

        assert merged.discoverer == "New Discoverer"
        assert merged.observation == "New observation"
        assert merged.quick_analysis == "Old analysis"

    def test_non_protected_none_keeps_existing(self):
        """Les champs non-protégés à None gardent la valeur existante."""
        existing = FaBean(
            uuid="uuid-1",
            discoverer="Existing Discoverer",
            cause="Existing Cause",
        )
        updated = FaBean(
            uuid="uuid-1",
            discoverer=None,
            cause=None,
        )

        merged = _merge_fa_beans(existing, updated)

        assert merged.discoverer == "Existing Discoverer"
        assert merged.cause == "Existing Cause"

    def test_returns_new_fabean_instance(self):
        """Le merge retourne une nouvelle instance FaBean."""
        existing = FaBean(uuid="uuid-1")
        updated = FaBean(uuid="uuid-1")

        merged = _merge_fa_beans(existing, updated)

        assert isinstance(merged, FaBean)
        assert merged is not existing
        assert merged is not updated

    def test_closure_fields_preserved(self):
        """Les champs de fermeture sont protégés."""
        existing = FaBean(
            uuid="uuid-1",
            closure_validation="Validé",
            closure_date=date(2024, 6, 1),
            closure_validator_name="Chef Labo",
        )
        updated = FaBean(
            uuid="uuid-1",
            closure_validation="Modifié",
            closure_date=date(2099, 1, 1),
            closure_validator_name="Hacker",
        )

        merged = _merge_fa_beans(existing, updated)

        assert merged.closure_validation == "Validé"
        assert merged.closure_date == date(2024, 6, 1)
        assert merged.closure_validator_name == "Chef Labo"

    def test_progress_validation_fields_preserved(self):
        """Les champs de validation progress sont protégés."""
        existing = FaBean(
            uuid="uuid-1",
            iec_validation_progress=True,
            iec_validation_progress_name="Validator Progress",
        )
        updated = FaBean(
            uuid="uuid-1",
            iec_validation_progress=False,
            iec_validation_progress_name=None,
        )

        merged = _merge_fa_beans(existing, updated)

        assert merged.iec_validation_progress is True
        assert merged.iec_validation_progress_name == "Validator Progress"


# ============================================================================
# UPDATE FA
# ============================================================================


@pytest.mark.unit
class TestUpdateFa:
    """Tests mise à jour FA."""

    def test_success(self, repo, sample_fa):
        """Mise à jour réussie via merge."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        updated = FaBean(uuid=sample_fa.uuid, observation="Updated")
        result = update_fa(repo, updated)

        repo.update.assert_called_once()
        assert result is not None

    def test_not_found_raises(self, repo):
        """NotFoundException si la FA n'existe pas."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            update_fa(repo, FaBean(uuid="missing"))

        assert exc_info.value.resource == "FA"
        assert exc_info.value.identifier == "missing"

    def test_merges_beans_before_update(self, repo, sample_fa):
        """Le bean est mergé avant appel à repository.update."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        updated = FaBean(
            uuid=sample_fa.uuid,
            observation="New Obs",
            discoverer=None,  # Should keep original
        )
        update_fa(repo, updated)

        assert captured["bean"].observation == "New Obs"
        assert captured["bean"].discoverer == sample_fa.discoverer

    def test_protected_fields_not_overwritten(self, repo, sample_fa):
        """Les champs protégés ne sont pas modifiés par update."""
        original_fsec = sample_fa.fsec_version_id
        original_identifier = sample_fa.identifier
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        updated = FaBean(
            uuid=sample_fa.uuid,
            fsec_version_id="hacked-fsec",
            identifier="HACKED_ID",
        )
        update_fa(repo, updated)

        assert captured["bean"].fsec_version_id == original_fsec
        assert captured["bean"].identifier == original_identifier

    def test_return_value_from_repository_update(self, repo, sample_fa):
        """Kill mutant: return value is from repository.update."""
        repo.get_by_uuid.return_value = sample_fa
        expected = FaBean(uuid="result-uuid")
        repo.update.return_value = expected

        result = update_fa(repo, FaBean(uuid=sample_fa.uuid))

        assert result is expected


# ============================================================================
# DELETE FA
# ============================================================================


@pytest.mark.unit
class TestDeleteFa:
    """Tests suppression FA."""

    def test_success_returns_true(self, repo):
        """Suppression réussie retourne True."""
        repo.delete.return_value = True

        result = delete_fa(repo, "uuid-to-delete")

        assert result is True

    def test_calls_repository_delete(self, repo):
        """Le repository.delete est appelé avec le bon UUID."""
        repo.delete.return_value = True

        delete_fa(repo, "uuid-to-delete")

        repo.delete.assert_called_once_with("uuid-to-delete")

    def test_not_found_raises(self, repo):
        """NotFoundException si repository.delete retourne False."""
        repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_fa(repo, "nonexistent")

        assert exc_info.value.resource == "FA"
        assert "FA" in str(exc_info.value)

    def test_not_found_exception_contains_uuid(self, repo):
        """L'exception contient le UUID."""
        repo.delete.return_value = False

        with pytest.raises(NotFoundException) as exc_info:
            delete_fa(repo, "specific-delete-uuid")

        assert exc_info.value.identifier == "specific-delete-uuid"

    def test_return_value_is_true_not_false(self, repo):
        """Kill mutant: return value changed from True to False."""
        repo.delete.return_value = True

        result = delete_fa(repo, "uuid")

        assert result is True


# ============================================================================
# PATCH FA
# ============================================================================


@pytest.mark.unit
class TestPatchFa:
    """Tests mise à jour partielle (PATCH)."""

    def test_updates_allowed_fields(self, repo, sample_fa):
        """Les champs autorisés sont mis à jour."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(
            repo, sample_fa.uuid, {"discoverer": "Jane Doe", "observation": "New obs"}
        )

        assert captured["bean"].discoverer == "Jane Doe"
        assert captured["bean"].observation == "New obs"

    def test_ignores_uuid_field(self, repo, sample_fa):
        """Le champ 'uuid' est protégé et ignoré."""
        original_uuid = sample_fa.uuid
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"uuid": "hacked-uuid"})

        assert captured["bean"].uuid == original_uuid

    def test_ignores_fsec_version_id_field(self, repo, sample_fa):
        """Le champ 'fsec_version_id' est protégé et ignoré."""
        original = sample_fa.fsec_version_id
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"fsec_version_id": "hacked"})

        assert captured["bean"].fsec_version_id == original

    def test_ignores_identifier_field(self, repo, sample_fa):
        """Le champ 'identifier' est protégé et ignoré."""
        original = sample_fa.identifier
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"identifier": "HACKED"})

        assert captured["bean"].identifier == original

    def test_allows_status_id_change_via_patch(self, repo, sample_fa):
        """Le champ 'status_id' est modifiable via PATCH (stepper libre)."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"status_id": FaStatus.CLOSED})

        assert captured["bean"].status_id == FaStatus.CLOSED

    def test_ignores_created_at_field(self, repo, sample_fa):
        """Le champ 'created_at' est protégé et ignoré."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        from datetime import datetime

        patch_fa(repo, sample_fa.uuid, {"created_at": datetime(2099, 1, 1)})

        assert captured["bean"].created_at == sample_fa.created_at

    def test_ignores_last_updated_field(self, repo, sample_fa):
        """Le champ 'last_updated' est protégé et ignoré."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        from datetime import datetime

        patch_fa(repo, sample_fa.uuid, {"last_updated": datetime(2099, 1, 1)})

        assert captured["bean"].last_updated == sample_fa.last_updated

    def test_ignores_iec_validation_open_fields(self, repo, sample_fa):
        """Les champs IEC validation open sont protégés."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(
            repo,
            sample_fa.uuid,
            {
                "iec_validation_open": True,
                "iec_validation_open_date": date(2099, 1, 1),
                "iec_validation_open_name": "Hacker",
            },
        )

        assert captured["bean"].iec_validation_open == sample_fa.iec_validation_open
        assert (
            captured["bean"].iec_validation_open_date
            == sample_fa.iec_validation_open_date
        )
        assert (
            captured["bean"].iec_validation_open_name
            == sample_fa.iec_validation_open_name
        )

    def test_ignores_iec_validation_progress_fields(self, repo, sample_fa):
        """Les champs IEC validation progress sont protégés."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(
            repo,
            sample_fa.uuid,
            {
                "iec_validation_progress": True,
                "iec_validation_progress_name": "Hacker",
            },
        )

        assert (
            captured["bean"].iec_validation_progress
            == sample_fa.iec_validation_progress
        )
        assert (
            captured["bean"].iec_validation_progress_name
            == sample_fa.iec_validation_progress_name
        )

    def test_ignores_closure_fields(self, repo, sample_fa):
        """Les champs closure sont protégés."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(
            repo,
            sample_fa.uuid,
            {
                "closure_validation": "Hacked",
                "closure_date": date(2099, 1, 1),
                "closure_validator_name": "Hacker",
            },
        )

        assert captured["bean"].closure_validation == sample_fa.closure_validation
        assert captured["bean"].closure_date == sample_fa.closure_date
        assert (
            captured["bean"].closure_validator_name == sample_fa.closure_validator_name
        )

    def test_allows_status_id_change(self, repo, sample_fa):
        """Le champ 'status_id' est modifiable via PATCH (navigation libre stepper)."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"status_id": FaStatus.IN_PROGRESS})

        assert captured["bean"].status_id == FaStatus.IN_PROGRESS

    def test_ignores_status_id_null(self, repo, sample_fa):
        """Le champ 'status_id' à None est ignoré (NOT NULL en base)."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        patch_fa(repo, sample_fa.uuid, {"status_id": None})

        assert captured["bean"].status_id == FaStatus.OPEN

    @patch("app.domain.fa.services.fa_service.logger")
    def test_patch_logs_status_bypass_when_status_changes(
        self, mock_logger, repo, sample_fa
    ):
        """Un PATCH qui change status_id émet un log d'audit (fa_status_bypass)."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.side_effect = lambda b: b

        patch_fa(repo, sample_fa.uuid, {"status_id": FaStatus.CLOSED})

        bypass_calls = [
            call
            for call in mock_logger.info.call_args_list
            if call.kwargs.get("extra", {}).get("action") == "fa_status_bypass"
        ]
        assert len(bypass_calls) == 1
        extra = bypass_calls[0].kwargs["extra"]
        assert extra["entity_type"] == "FA"
        assert extra["entity_id"] == sample_fa.uuid
        assert extra["extra_data"] == {
            "from_status": FaStatus.OPEN,
            "to_status": FaStatus.CLOSED,
        }

    @patch("app.domain.fa.services.fa_service.logger")
    def test_patch_does_not_log_bypass_when_status_absent(
        self, mock_logger, repo, sample_fa
    ):
        """Un PATCH sans status_id ne produit pas de log de bypass."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.side_effect = lambda b: b

        patch_fa(repo, sample_fa.uuid, {"discoverer": "Jane Doe"})

        bypass_calls = [
            call
            for call in mock_logger.info.call_args_list
            if call.kwargs.get("extra", {}).get("action") == "fa_status_bypass"
        ]
        assert bypass_calls == []

    @patch("app.domain.fa.services.fa_service.logger")
    def test_patch_does_not_log_bypass_when_status_unchanged(
        self, mock_logger, repo, sample_fa
    ):
        """Un PATCH avec le même status_id ne produit pas de log de bypass."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.side_effect = lambda b: b

        patch_fa(repo, sample_fa.uuid, {"status_id": sample_fa.status_id})

        bypass_calls = [
            call
            for call in mock_logger.info.call_args_list
            if call.kwargs.get("extra", {}).get("action") == "fa_status_bypass"
        ]
        assert bypass_calls == []

    def test_ignores_nonexistent_fields(self, repo, sample_fa):
        """Les champs inexistants sur le bean sont ignorés (pas d'erreur)."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        # Should not raise
        result = patch_fa(repo, sample_fa.uuid, {"nonexistent_field": "value"})
        assert result is not None

    def test_not_found_raises(self, repo):
        """NotFoundException si FA n'existe pas."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            patch_fa(repo, "missing-uuid", {"discoverer": "X"})

        assert exc_info.value.resource == "FA"
        assert exc_info.value.identifier == "missing-uuid"

    def test_return_value_from_repository(self, repo, sample_fa):
        """Kill mutant: return value is from repository.update."""
        repo.get_by_uuid.return_value = sample_fa
        expected = FaBean(uuid="patched")
        repo.update.return_value = expected

        result = patch_fa(repo, sample_fa.uuid, {"discoverer": "X"})

        assert result is expected

    def test_patch_protected_fields_set_contents(self, repo, sample_fa):
        """Vérifie que TOUS les champs protégés de patch_fa sont bien protégés."""
        repo.get_by_uuid.return_value = sample_fa

        # List of all protected fields in patch_fa
        patch_protected = {
            "uuid",
            "fsec_version_id",
            "identifier",
            "created_at",
            "last_updated",
            "iec_validation_open",
            "iec_validation_open_date",
            "iec_validation_open_name",
            "iec_validation_progress",
            "iec_validation_progress_name",
            "closure_validation",
            "closure_date",
            "closure_validator_name",
        }

        # Try to patch each protected field
        for field_name in patch_protected:
            fa_copy = FaBean(
                uuid=sample_fa.uuid,
                fsec_version_id=sample_fa.fsec_version_id,
                status_id=sample_fa.status_id,
                identifier=sample_fa.identifier,
            )
            repo.get_by_uuid.return_value = fa_copy
            original_val = getattr(fa_copy, field_name)

            captured = {}

            def make_capture(cap):
                def capture_update(bean):
                    cap["bean"] = bean
                    return bean

                return capture_update

            repo.update.side_effect = make_capture(captured)

            patch_fa(repo, fa_copy.uuid, {field_name: "hacked_value"})

            assert (
                getattr(captured["bean"], field_name) == original_val
            ), f"Protected field '{field_name}' was modified by patch_fa"


# ============================================================================
# VALIDATE OPEN PHASE
# ============================================================================


@pytest.mark.unit
class TestValidateOpenPhase:
    """Tests validation phase Ouvert."""

    def test_success_transitions_to_in_progress(self, repo, sample_fa):
        """Valide la phase Ouvert et passe le statut à IN_PROGRESS."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_open_phase(repo, sample_fa.uuid, "Validator", date(2024, 1, 20))

        assert captured["bean"].status_id == FaStatus.IN_PROGRESS
        assert captured["bean"].status_id == 1

    def test_success_sets_iec_validation_open_true(self, repo, sample_fa):
        """iec_validation_open est mis à True."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 1, 20))

        assert captured["bean"].iec_validation_open is True

    def test_success_sets_validation_date(self, repo, sample_fa):
        """La date de validation est enregistrée."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 2, 15))

        assert captured["bean"].iec_validation_open_date == date(2024, 2, 15)

    def test_success_sets_validator_name(self, repo, sample_fa):
        """Le nom du valideur est enregistré."""
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_open_phase(repo, sample_fa.uuid, "Jean Dupont", date(2024, 2, 15))

        assert captured["bean"].iec_validation_open_name == "Jean Dupont"

    def test_not_found_raises(self, repo):
        """NotFoundException si FA n'existe pas."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            validate_open_phase(repo, "missing", "V", date(2024, 1, 20))

        assert exc_info.value.resource == "FA"

    def test_wrong_status_in_progress_raises(self, repo, fa_en_cours):
        """ConflictException si la FA est au statut IN_PROGRESS (pas OPEN)."""
        repo.get_by_uuid.return_value = fa_en_cours

        with pytest.raises(ConflictException) as exc_info:
            validate_open_phase(repo, fa_en_cours.uuid, "V", date(2024, 1, 20))

        assert exc_info.value.field == "status"
        assert "Ouvert" in str(exc_info.value)

    def test_wrong_status_closed_raises(self, repo):
        """ConflictException si la FA est au statut CLOSED."""
        closed_fa = FaBean(uuid="closed-uuid", status_id=FaStatus.CLOSED)
        repo.get_by_uuid.return_value = closed_fa

        with pytest.raises(ConflictException) as exc_info:
            validate_open_phase(repo, "closed-uuid", "V", date(2024, 1, 20))

        assert exc_info.value.field == "status"

    def test_date_before_event_raises_invalid_data(self, repo, sample_fa):
        """InvalidDataException si validation_date < event_date."""
        sample_fa.event_date = date(2024, 3, 1)
        repo.get_by_uuid.return_value = sample_fa

        with pytest.raises(InvalidDataException) as exc_info:
            validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 2, 15))

        assert "antérieure" in str(exc_info.value)

    def test_date_equal_to_event_does_not_raise(self, repo, sample_fa):
        """Si validation_date == event_date, pas d'exception."""
        sample_fa.event_date = date(2024, 3, 1)
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        # Should NOT raise
        validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 3, 1))

        repo.update.assert_called_once()

    def test_date_after_event_succeeds(self, repo, sample_fa):
        """Si validation_date > event_date, tout va bien."""
        sample_fa.event_date = date(2024, 1, 1)
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 6, 1))

        repo.update.assert_called_once()

    def test_no_event_date_skips_check(self, repo, sample_fa):
        """Si event_date est None, le contrôle chronologique est sauté."""
        sample_fa.event_date = None
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        # Should NOT raise
        validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 1, 1))

        repo.update.assert_called_once()

    @patch("app.domain.fa.services.fa_service.date")
    def test_none_date_defaults_to_today(self, mock_date, repo, sample_fa):
        """Si validation_date est None, date.today() est utilisé."""
        mock_date.today.return_value = date(2024, 6, 15)
        mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)
        sample_fa.event_date = date(2024, 1, 1)
        repo.get_by_uuid.return_value = sample_fa

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_open_phase(repo, sample_fa.uuid, "V")

        assert captured["bean"].iec_validation_open_date == date(2024, 6, 15)

    def test_return_value_from_repository(self, repo, sample_fa):
        """Kill mutant: return value is from repository.update."""
        repo.get_by_uuid.return_value = sample_fa
        expected = FaBean(uuid="updated-open")
        repo.update.return_value = expected

        result = validate_open_phase(repo, sample_fa.uuid, "V", date(2024, 2, 1))

        assert result is expected


# ============================================================================
# VALIDATE PROGRESS PHASE
# ============================================================================


@pytest.mark.unit
class TestValidateProgressPhase:
    """Tests validation phase En cours."""

    def test_success_keeps_in_progress_status(self, repo, fa_en_cours):
        """Le statut reste IN_PROGRESS (validate_progress_phase ne change pas le statut)."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_progress_phase(repo, fa_en_cours.uuid, "V2", date(2024, 2, 1))

        assert captured["bean"].status_id == FaStatus.IN_PROGRESS

    def test_success_sets_iec_validation_progress_true(self, repo, fa_en_cours):
        """iec_validation_progress est mis à True."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_progress_phase(repo, fa_en_cours.uuid, "V2", date(2024, 2, 1))

        assert captured["bean"].iec_validation_progress is True

    def test_success_sets_validator_name(self, repo, fa_en_cours):
        """Le nom du valideur est enregistré."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        validate_progress_phase(repo, fa_en_cours.uuid, "Marie Curie")

        assert captured["bean"].iec_validation_progress_name == "Marie Curie"

    def test_not_found_raises(self, repo):
        """NotFoundException si FA n'existe pas."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            validate_progress_phase(repo, "missing", "V")

        assert exc_info.value.resource == "FA"

    def test_wrong_status_open_raises(self, repo, sample_fa):
        """ConflictException si la FA est au statut OPEN (pas IN_PROGRESS)."""
        repo.get_by_uuid.return_value = sample_fa  # status_id = OPEN

        with pytest.raises(ConflictException) as exc_info:
            validate_progress_phase(repo, sample_fa.uuid, "V")

        assert exc_info.value.field == "status"
        assert "En cours" in str(exc_info.value)

    def test_wrong_status_closed_raises(self, repo):
        """ConflictException si la FA est au statut CLOSED."""
        closed_fa = FaBean(uuid="closed", status_id=FaStatus.CLOSED)
        repo.get_by_uuid.return_value = closed_fa

        with pytest.raises(ConflictException) as exc_info:
            validate_progress_phase(repo, "closed", "V")

        assert exc_info.value.field == "status"

    def test_return_value_from_repository(self, repo, fa_en_cours):
        """Kill mutant: return value is from repository.update."""
        repo.get_by_uuid.return_value = fa_en_cours
        expected = FaBean(uuid="progress-result")
        repo.update.return_value = expected

        result = validate_progress_phase(repo, fa_en_cours.uuid, "V")

        assert result is expected


# ============================================================================
# CLOSE FA
# ============================================================================


@pytest.mark.unit
class TestCloseFa:
    """Tests fermeture FA."""

    def test_success_transitions_to_closed(self, repo, fa_en_cours):
        """Fermeture réussie passe le statut à CLOSED."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        close_fa(repo, fa_en_cours.uuid, "Chef", "Validé", date(2024, 2, 1))

        assert captured["bean"].status_id == FaStatus.CLOSED
        assert captured["bean"].status_id == 2

    def test_success_sets_closure_validation(self, repo, fa_en_cours):
        """closure_validation est enregistré."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        close_fa(
            repo, fa_en_cours.uuid, "Chef", "Texte de validation", date(2024, 2, 1)
        )

        assert captured["bean"].closure_validation == "Texte de validation"

    def test_success_sets_closure_date(self, repo, fa_en_cours):
        """closure_date est enregistré."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        close_fa(repo, fa_en_cours.uuid, "Chef", "Validé", date(2024, 8, 15))

        assert captured["bean"].closure_date == date(2024, 8, 15)

    def test_success_sets_closure_validator_name(self, repo, fa_en_cours):
        """closure_validator_name est enregistré."""
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        close_fa(repo, fa_en_cours.uuid, "Chef Jean Labo", "OK", date(2024, 2, 1))

        assert captured["bean"].closure_validator_name == "Chef Jean Labo"

    def test_not_found_raises(self, repo):
        """NotFoundException si FA n'existe pas."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            close_fa(repo, "missing", "Chef", "Text", date(2024, 2, 1))

        assert exc_info.value.resource == "FA"

    def test_wrong_status_open_raises(self, repo, sample_fa):
        """ConflictException si FA au statut OPEN."""
        repo.get_by_uuid.return_value = sample_fa  # status_id = OPEN

        with pytest.raises(ConflictException) as exc_info:
            close_fa(repo, sample_fa.uuid, "Chef", "Text", date(2024, 2, 1))

        assert exc_info.value.field == "status"

    def test_wrong_status_closed_raises(self, repo):
        """ConflictException si FA déjà au statut CLOSED."""
        closed_fa = FaBean(uuid="closed", status_id=FaStatus.CLOSED)
        repo.get_by_uuid.return_value = closed_fa

        with pytest.raises(ConflictException) as exc_info:
            close_fa(repo, "closed", "Chef", "Text", date(2024, 2, 1))

        assert exc_info.value.field == "status"

    def test_missing_iec_validation_progress_raises(
        self, repo, fa_en_cours_no_progress_validation
    ):
        """ConflictException si iec_validation_progress est False."""
        repo.get_by_uuid.return_value = fa_en_cours_no_progress_validation

        with pytest.raises(ConflictException) as exc_info:
            close_fa(
                repo,
                fa_en_cours_no_progress_validation.uuid,
                "Chef",
                "Text",
                date(2024, 2, 1),
            )

        assert exc_info.value.field == "iec_validation_progress"
        assert "iec_validation_progress" in str(exc_info.value)

    def test_date_before_open_validation_raises(self, repo, fa_en_cours):
        """InvalidDataException si closure_date < iec_validation_open_date.

        La chronologie ne dépend plus de la phase intermédiaire 'En cours'
        (date supprimée) — seule la date d'ouverture borne la clôture.
        """
        repo.get_by_uuid.return_value = fa_en_cours  # open_date = 2024-01-20

        with pytest.raises(InvalidDataException) as exc_info:
            close_fa(repo, fa_en_cours.uuid, "Chef", "Text", date(2024, 1, 15))

        assert "antérieure" in str(exc_info.value)

    def test_date_equal_to_open_validation_does_not_raise(self, repo, fa_en_cours):
        """Si closure_date == iec_validation_open_date, pas d'exception."""
        repo.get_by_uuid.return_value = fa_en_cours  # open_date = 2024-01-20
        repo.update.return_value = fa_en_cours

        close_fa(repo, fa_en_cours.uuid, "Chef", "Text", date(2024, 1, 20))

        repo.update.assert_called_once()

    def test_no_open_date_skips_check(self, repo, fa_en_cours):
        """Si iec_validation_open_date est None, le contrôle chronologique est sauté."""
        fa_en_cours.iec_validation_open_date = None
        repo.get_by_uuid.return_value = fa_en_cours
        repo.update.return_value = fa_en_cours

        close_fa(repo, fa_en_cours.uuid, "Chef", "Text", date(2024, 1, 1))

        repo.update.assert_called_once()

    @patch("app.domain.fa.services.fa_service.date")
    def test_none_date_defaults_to_today(self, mock_date, repo, fa_en_cours):
        """Si closure_date est None, date.today() est utilisé."""
        mock_date.today.return_value = date(2024, 6, 15)
        mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)
        repo.get_by_uuid.return_value = fa_en_cours

        captured = {}

        def capture_update(bean):
            captured["bean"] = bean
            return bean

        repo.update.side_effect = capture_update

        close_fa(repo, fa_en_cours.uuid, "Chef", "Text")

        assert captured["bean"].closure_date == date(2024, 6, 15)

    def test_return_value_from_repository(self, repo, fa_en_cours):
        """Kill mutant: return value is from repository.update."""
        repo.get_by_uuid.return_value = fa_en_cours
        expected = FaBean(uuid="closed-result")
        repo.update.return_value = expected

        result = close_fa(repo, fa_en_cours.uuid, "Chef", "Text", date(2024, 2, 1))

        assert result is expected

    def test_status_check_uses_not_equal(self, repo):
        """Kill mutant: condition inversion (== vs !=).
        Vérifie que seule IN_PROGRESS est acceptée, pas les autres."""
        for status in [FaStatus.OPEN, FaStatus.CLOSED, 99]:
            fa = FaBean(uuid="test", status_id=status, iec_validation_progress=True)
            repo.get_by_uuid.return_value = fa

            with pytest.raises(ConflictException):
                close_fa(repo, "test", "Chef", "Text", date(2024, 2, 1))

    def test_iec_validation_progress_must_be_truthy(self, repo):
        """Kill mutant: 'not bean.iec_validation_progress' inversion.
        Vérifie que False déclenche l'erreur."""
        fa = FaBean(
            uuid="test",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=False,
        )
        repo.get_by_uuid.return_value = fa

        with pytest.raises(ConflictException) as exc_info:
            close_fa(repo, "test", "Chef", "Text", date(2024, 2, 1))

        assert exc_info.value.field == "iec_validation_progress"


# ============================================================================
# ADDITIONAL MUTATION KILLERS — cross-cutting concerns
# ============================================================================


@pytest.mark.unit
class TestFaStatusConstants:
    """Kill mutants: vérification que les constantes FaStatus ont les bonnes valeurs."""

    def test_open_is_zero(self):
        assert FaStatus.OPEN == 0

    def test_in_progress_is_one(self):
        assert FaStatus.IN_PROGRESS == 1

    def test_closed_is_two(self):
        assert FaStatus.CLOSED == 2


@pytest.mark.unit
class TestEdgeCases:
    """Tests de bord pour tuer les mutants restants."""

    def test_generate_identifier_only_special_chars_campaign(self):
        """Campagne composée uniquement de caractères spéciaux → vide après nettoyage → segment FSEC seul."""
        result = generate_fa_identifier("@#$%", "FSEC", 2024)
        assert result == "FA_2024_FSEC_01"

    def test_generate_identifier_only_special_chars_fsec(self):
        """Un nom de FSEC composé uniquement de caractères spéciaux → vide après nettoyage."""
        result = generate_fa_identifier("CAMP", "!@#$", 2024)
        assert result == "FA_2024_CAMP__01"

    def test_generate_identifier_numbers_preserved(self):
        """Les chiffres sont préservés dans les noms."""
        result = generate_fa_identifier("Camp123", "FSEC456", 2024)
        assert result == "FA_2024_Camp123_FSEC456_01"

    def test_generate_identifier_underscore_preserved(self):
        """Les underscores existants sont préservés."""
        result = generate_fa_identifier("Camp_A", "FSEC_B", 2024)
        assert result == "FA_2024_Camp_A_FSEC_B_01"

    def test_create_fa_identifier_is_set_on_bean_before_create(self, repo):
        """Vérifie que l'identifiant est mis sur le bean AVANT l'appel à exists_by_identifier."""
        fa = FaBean(uuid="u1", fsec_version_id="f1", identifier="old")
        repo.max_sequence_by_fsec_version_id.return_value = 0

        def check_identifier(identifier):
            # L'identifiant passé à exists_by_identifier devrait être le nouveau
            assert identifier == "FA_2024_C_F_01"
            return False

        repo.exists_by_identifier.side_effect = check_identifier
        repo.create.return_value = fa

        create_fa(repo, fa, "C", "F", 2024)

        repo.exists_by_identifier.assert_called_once()

    def test_get_all_fas_with_limit_only(self, repo):
        """get_all_fas avec limit mais offset par défaut."""
        repo.get_all.return_value = []

        get_all_fas(repo, limit=5)

        repo.get_all.assert_called_once_with(limit=5, offset=0)

    def test_patch_fa_empty_partial_data(self, repo, sample_fa):
        """Patch avec un dictionnaire vide — aucun champ modifié."""
        repo.get_by_uuid.return_value = sample_fa
        repo.update.return_value = sample_fa

        result = patch_fa(repo, sample_fa.uuid, {})

        repo.update.assert_called_once()
        assert result is not None

    def test_validate_open_phase_status_check_exact_value(self, repo):
        """Kill mutant: vérifie que le check est bien != OPEN (0) et pas une autre valeur."""
        # Only status_id == FaStatus.OPEN (0) should pass
        for status in [FaStatus.IN_PROGRESS, FaStatus.CLOSED, 42, -1]:
            fa = FaBean(uuid="test", status_id=status)
            repo.get_by_uuid.return_value = fa

            with pytest.raises(ConflictException):
                validate_open_phase(repo, "test", "V", date(2024, 1, 20))

    def test_validate_progress_phase_status_check_exact_value(self, repo):
        """Kill mutant: vérifie que le check est bien != IN_PROGRESS (1)."""
        for status in [FaStatus.OPEN, FaStatus.CLOSED, 42, -1]:
            fa = FaBean(uuid="test", status_id=status)
            repo.get_by_uuid.return_value = fa

            with pytest.raises(ConflictException):
                validate_progress_phase(repo, "test", "V", date(2024, 1, 25))

    def test_delete_fa_false_is_not_found(self, repo):
        """Kill mutant: 'not repository.delete(uuid)' — False doit lever NotFoundException."""
        repo.delete.return_value = False

        with pytest.raises(NotFoundException):
            delete_fa(repo, "uuid")

    def test_delete_fa_true_does_not_raise(self, repo):
        """Kill mutant: True ne doit PAS lever d'exception."""
        repo.delete.return_value = True

        # Should NOT raise
        result = delete_fa(repo, "uuid")
        assert result is True

    def test_resolve_context_calls_fsec_repo_with_correct_id(
        self, fsec_repo, campaign_repo
    ):
        """Vérifie que get_by_version_uuid est appelé avec le bon fsec_version_id."""
        fa_bean = FaBean(fsec_version_id="specific-fsec-vid")
        fsec_repo.get_by_version_uuid.return_value = None

        with pytest.raises(NotFoundException):
            resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        fsec_repo.get_by_version_uuid.assert_called_once_with("specific-fsec-vid")

    def test_resolve_context_calls_campaign_repo_with_correct_id(
        self, fsec_repo, campaign_repo
    ):
        """Vérifie que get_by_uuid est appelé avec campaign_id de la FSEC."""
        fa_bean = FaBean(fsec_version_id="fsec-v-001")

        mock_fsec = MagicMock()
        mock_fsec.name = "F"
        mock_fsec.campaign_id = "camp-specific-id"
        fsec_repo.get_by_version_uuid.return_value = mock_fsec

        mock_campaign = MagicMock()
        mock_campaign.name = "C"
        mock_campaign.year = 2024
        campaign_repo.get_by_uuid.return_value = mock_campaign

        resolve_fa_creation_context(fa_bean, fsec_repo, campaign_repo)

        campaign_repo.get_by_uuid.assert_called_once_with("camp-specific-id")

    def test_merge_all_fabean_fields_covered(self):
        """Vérifie que _merge_fa_beans couvre tous les champs de FaBean."""
        from dataclasses import fields

        existing = FaBean(uuid="e")
        updated = FaBean(uuid="u")

        merged = _merge_fa_beans(existing, updated)

        # All fields from FaBean should be present on the merged result
        for field in fields(FaBean):
            assert hasattr(
                merged, field.name
            ), f"Field {field.name} missing from merged bean"

    def test_close_fa_in_progress_with_validation_succeeds(self, repo):
        """Kill mutant: and ↔ or inversion on status + validation checks.
        A FA must be IN_PROGRESS AND have iec_validation_progress=True."""
        fa = FaBean(
            uuid="test",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=True,
        )
        repo.get_by_uuid.return_value = fa
        repo.update.return_value = fa

        # Should NOT raise
        result = close_fa(repo, "test", "Chef", "Text", date(2024, 2, 1))
        assert result is not None

    def test_validate_open_chronology_uses_less_than(self, repo):
        """Kill mutant: < mutated to > or <=.
        Date exactly one day before event_date should raise."""
        fa = FaBean(uuid="t", status_id=FaStatus.OPEN, event_date=date(2024, 3, 10))
        repo.get_by_uuid.return_value = fa

        with pytest.raises(InvalidDataException):
            validate_open_phase(repo, "t", "V", date(2024, 3, 9))

    def test_close_fa_chronology_uses_less_than(self, repo):
        """Kill mutant: < mutated to > or <=.
        Date exactly one day before open_validation_date should raise."""
        fa = FaBean(
            uuid="t",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=True,
            iec_validation_open_date=date(2024, 3, 10),
        )
        repo.get_by_uuid.return_value = fa

        with pytest.raises(InvalidDataException):
            close_fa(repo, "t", "Chef", "Text", date(2024, 3, 9))


# ============================================================================
# MUTATION-KILLING: Logger message verification
# ============================================================================


@pytest.mark.unit
class TestFaServiceLoggerMessages:
    """Kill mutants on logger format strings by verifying log messages."""

    @patch("app.domain.fa.services.fa_service.logger")
    def test_create_fa_logs_creation(self, mock_logger, repo):
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = False
        bean = FaBean(uuid="fa-1", fsec_version_id="fsec-1", identifier="")
        repo.create.return_value = bean

        create_fa(repo, bean, "Camp", "FSEC", 2025)

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "FA créée" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_delete_fa_logs_deletion(self, mock_logger, repo):
        repo.delete.return_value = True

        delete_fa(repo, "fa-uuid-del")

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "FA supprimée" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_patch_fa_logs_patch(self, mock_logger, repo):
        existing = FaBean(uuid="fa-uuid", status_id=FaStatus.OPEN)
        repo.get_by_uuid.return_value = existing
        repo.update.return_value = existing

        patch_fa(repo, "fa-uuid", {"observation": "new"})

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "patch appliqué" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_validate_open_phase_logs(self, mock_logger, repo):
        fa = FaBean(uuid="fa-1", status_id=FaStatus.OPEN)
        repo.get_by_uuid.return_value = fa
        repo.update.return_value = fa

        validate_open_phase(repo, "fa-1", "Valideur", date(2024, 6, 1))

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "validation phase Ouvert" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_validate_progress_phase_logs(self, mock_logger, repo):
        fa = FaBean(uuid="fa-1", status_id=FaStatus.IN_PROGRESS)
        repo.get_by_uuid.return_value = fa
        repo.update.return_value = fa

        validate_progress_phase(repo, "fa-1", "Valideur", date(2024, 6, 1))

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "validation phase En cours" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_close_fa_logs(self, mock_logger, repo):
        fa = FaBean(
            uuid="fa-1",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=True,
        )
        repo.get_by_uuid.return_value = fa
        repo.update.return_value = fa

        close_fa(repo, "fa-1", "Chef", "OK", date(2024, 6, 1))

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "fermeture" in log_msg

    @patch("app.domain.fa.services.fa_service.logger")
    def test_resolve_context_logs(self, mock_logger, repo, fsec_repo, campaign_repo):
        fsec_mock = MagicMock()
        fsec_mock.name = "FSEC-001"
        fsec_mock.campaign_id = "camp-1"
        fsec_repo.get_by_version_uuid.return_value = fsec_mock

        campaign_mock = MagicMock()
        campaign_mock.name = "CampTest"
        campaign_mock.year = 2025
        campaign_repo.get_by_uuid.return_value = campaign_mock

        bean = FaBean(fsec_version_id="fsec-1")
        resolve_fa_creation_context(bean, fsec_repo, campaign_repo)

        mock_logger.info.assert_called()
        log_msg = mock_logger.info.call_args[0][0]
        assert "Contexte FA résolu" in log_msg


# ============================================================================
# MUTATION-KILLING: Error message content verification
# ============================================================================


@pytest.mark.unit
class TestFaServiceErrorMessages:
    """Kill mutants on error message format strings and exception field names."""

    def test_create_fa_conflict_identifier_field(self, repo):
        """Verify ConflictException field is exactly 'identifier'."""
        repo.max_sequence_by_fsec_version_id.return_value = 0
        repo.exists_by_identifier.return_value = True
        bean = FaBean(fsec_version_id="fsec-v1")

        with pytest.raises(ConflictException) as exc_info:
            create_fa(repo, bean, "Camp", "FSEC", 2025)

        assert exc_info.value.field == "identifier"

    def test_resolve_context_missing_fsec_version_id(
        self, repo, fsec_repo, campaign_repo
    ):
        """Verify InvalidDataException message contains 'fsec_version_id'."""
        bean = FaBean(fsec_version_id="")

        with pytest.raises(InvalidDataException) as exc_info:
            resolve_fa_creation_context(bean, fsec_repo, campaign_repo)

        assert "fsec_version_id" in str(exc_info.value)

    def test_validate_open_wrong_status_error_message(self, repo):
        """Verify ConflictException message contains 'Ouvert' and the actual status."""
        fa = FaBean(uuid="fa-1", status_id=FaStatus.IN_PROGRESS)
        repo.get_by_uuid.return_value = fa

        with pytest.raises(ConflictException) as exc_info:
            validate_open_phase(repo, "fa-1", "V")

        msg = exc_info.value.value
        assert "Ouvert" in msg
        assert str(FaStatus.IN_PROGRESS) in msg
        assert exc_info.value.field == "status"

    def test_validate_progress_wrong_status_error_message(self, repo):
        """Verify ConflictException message contains 'En cours' and the actual status."""
        fa = FaBean(uuid="fa-1", status_id=FaStatus.OPEN)
        repo.get_by_uuid.return_value = fa

        with pytest.raises(ConflictException) as exc_info:
            validate_progress_phase(repo, "fa-1", "V")

        msg = exc_info.value.value
        assert "En cours" in msg
        assert str(FaStatus.OPEN) in msg
        assert exc_info.value.field == "status"

    def test_close_fa_wrong_status_error_message(self, repo):
        """Verify ConflictException message contains 'En cours' for close_fa."""
        fa = FaBean(uuid="fa-1", status_id=FaStatus.OPEN)
        repo.get_by_uuid.return_value = fa

        with pytest.raises(ConflictException) as exc_info:
            close_fa(repo, "fa-1", "Chef", "Text")

        msg = exc_info.value.value
        assert "En cours" in msg
        assert exc_info.value.field == "status"

    def test_close_fa_missing_iec_validation_error_message(self, repo):
        """Verify ConflictException about missing IEC validation."""
        fa = FaBean(
            uuid="fa-1",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=False,
        )
        repo.get_by_uuid.return_value = fa

        with pytest.raises(ConflictException) as exc_info:
            close_fa(repo, "fa-1", "Chef", "Text")

        assert exc_info.value.field == "iec_validation_progress"
        assert "IEC" in exc_info.value.value

    def test_validate_open_chronology_error_message(self, repo):
        """Verify InvalidDataException message for chronology error."""
        fa = FaBean(uuid="fa-1", status_id=FaStatus.OPEN, event_date=date(2024, 6, 15))
        repo.get_by_uuid.return_value = fa

        with pytest.raises(InvalidDataException) as exc_info:
            validate_open_phase(repo, "fa-1", "V", date(2024, 6, 10))

        msg = str(exc_info.value)
        assert "2024-06-10" in msg
        assert "2024-06-15" in msg

    def test_close_fa_chronology_error_message(self, repo):
        """Verify InvalidDataException message for close chronology error."""
        fa = FaBean(
            uuid="fa-1",
            status_id=FaStatus.IN_PROGRESS,
            iec_validation_progress=True,
            iec_validation_open_date=date(2024, 6, 15),
        )
        repo.get_by_uuid.return_value = fa

        with pytest.raises(InvalidDataException) as exc_info:
            close_fa(repo, "fa-1", "Chef", "Text", date(2024, 6, 10))

        msg = str(exc_info.value)
        assert "2024-06-10" in msg
        assert "2024-06-15" in msg

    def test_get_fa_by_uuid_not_found_resource(self, repo):
        """Verify NotFoundException resource is 'FA'."""
        repo.get_by_uuid.return_value = None

        with pytest.raises(NotFoundException) as exc_info:
            get_fa_by_uuid(repo, "unknown")

        assert exc_info.value.resource == "FA"

    def test_create_fa_resolve_missing_fsec_version_id(
        self, repo, fsec_repo, campaign_repo
    ):
        """Verify InvalidDataException quand fsec_version_id est vide à la résolution."""
        bean = FaBean(fsec_version_id="")

        with pytest.raises(InvalidDataException):
            resolve_fa_creation_context(bean, fsec_repo, campaign_repo)


# ============================================================================
# REGENERATE FA IDENTIFIERS (réalignement contexte FSEC)
# ============================================================================


class TestParseFaSequence:
    """Extraction du suffixe séquentiel `_NN` d'un identifiant FA."""

    def test_parses_trailing_sequence(self):
        assert _parse_fa_sequence("FA_2026_OMEGA_1_03") == 3

    def test_ignores_underscores_in_names(self):
        # Noms campagne/FSEC avec underscores : seul le groupe final compte.
        assert _parse_fa_sequence("FA_2026_lol_baptiste_1f_12") == 12

    def test_defaults_to_one_when_absent(self):
        assert _parse_fa_sequence("identifiant_sans_sequence") == 1
        assert _parse_fa_sequence("") == 1


class TestRegenerateFaIdentifiersForFsec:
    """Réécriture des identifiants FA quand la FSEC change de nom/campagne."""

    def test_regenerates_preserving_sequence(self, repo):
        """Chaque FA garde son numéro de séquence, seul le contexte change."""
        repo.get_all_by_fsec_version_id.return_value = [
            FaBean(uuid="fa1", identifier="FA_2026_OMEGA_1_01"),
            FaBean(uuid="fa2", identifier="FA_2026_OMEGA_1_02"),
        ]
        repo.exists_by_identifier.return_value = False

        count = regenerate_fa_identifiers_for_fsec(
            repo, "fsec-v1", "lol", "baptiste", 2026
        )

        assert count == 2
        repo.update_identifier.assert_any_call("fa1", "FA_2026_lol_baptiste_01")
        repo.update_identifier.assert_any_call("fa2", "FA_2026_lol_baptiste_02")

    def test_skips_when_identifier_unchanged(self, repo):
        """Pas d'écriture si le contexte ne modifie pas l'identifiant."""
        repo.get_all_by_fsec_version_id.return_value = [
            FaBean(uuid="fa1", identifier="FA_2026_OMEGA_1_01"),
        ]
        repo.exists_by_identifier.return_value = False

        # Même campagne/nom/année que l'identifiant existant.
        count = regenerate_fa_identifiers_for_fsec(repo, "fsec-v1", "OMEGA", "1", 2026)

        assert count == 0
        repo.update_identifier.assert_not_called()

    def test_falls_back_to_next_sequence_on_collision(self, repo):
        """Collision sur l'identifiant cible → prochain numéro libre."""
        repo.get_all_by_fsec_version_id.return_value = [
            FaBean(uuid="fa1", identifier="FA_2026_OMEGA_1_01"),
        ]
        repo.exists_by_identifier.return_value = True
        repo.max_sequence_by_fsec_version_id.return_value = 7

        count = regenerate_fa_identifiers_for_fsec(
            repo, "fsec-v1", "lol", "baptiste", 2026
        )

        assert count == 1
        repo.update_identifier.assert_called_once_with("fa1", "FA_2026_lol_baptiste_08")

    def test_no_fa_returns_zero(self, repo):
        repo.get_all_by_fsec_version_id.return_value = []

        assert (
            regenerate_fa_identifiers_for_fsec(repo, "fsec-v1", "lol", "x", 2026) == 0
        )
        repo.update_identifier.assert_not_called()


class TestRegenerateFaIdentifiersForCampaign:
    """Réécriture des identifiants FA de toutes les FSEC d'une campagne renommée."""

    def test_regenerates_across_all_fsecs(self, repo, fsec_repo):
        """Chaque FSEC de la campagne voit ses FA réalignées sur le nouveau contexte."""
        fsec_repo.get_by_campaign_id.return_value = [
            FsecBean(version_uuid="fsec-v1", name="A"),
            FsecBean(version_uuid="fsec-v2", name="B"),
        ]
        identifiers = {
            "fsec-v1": [FaBean(uuid="fa1", identifier="FA_2025_OLD_A_01")],
            "fsec-v2": [
                FaBean(uuid="fa2", identifier="FA_2025_OLD_B_01"),
                FaBean(uuid="fa3", identifier="FA_2025_OLD_B_02"),
            ],
        }
        repo.get_all_by_fsec_version_id.side_effect = lambda vid: identifiers[vid]
        repo.exists_by_identifier.return_value = False

        count = regenerate_fa_identifiers_for_campaign(
            repo, fsec_repo, "camp-uuid", "NEW", 2026
        )

        assert count == 3
        fsec_repo.get_by_campaign_id.assert_called_once_with("camp-uuid")
        repo.update_identifier.assert_any_call("fa1", "FA_2026_NEW_A_01")
        repo.update_identifier.assert_any_call("fa2", "FA_2026_NEW_B_01")
        repo.update_identifier.assert_any_call("fa3", "FA_2026_NEW_B_02")

    def test_no_fsec_returns_zero(self, repo, fsec_repo):
        """Campagne sans FSEC : aucun appel de réécriture."""
        fsec_repo.get_by_campaign_id.return_value = []

        assert (
            regenerate_fa_identifiers_for_campaign(
                repo, fsec_repo, "camp-uuid", "NEW", 2026
            )
            == 0
        )
        repo.update_identifier.assert_not_called()

    def test_fsec_without_fa_contributes_zero(self, repo, fsec_repo):
        """Une FSEC sans FA n'incrémente pas le total."""
        fsec_repo.get_by_campaign_id.return_value = [
            FsecBean(version_uuid="fsec-v1", name="A"),
        ]
        repo.get_all_by_fsec_version_id.return_value = []

        assert (
            regenerate_fa_identifiers_for_campaign(
                repo, fsec_repo, "camp-uuid", "NEW", 2026
            )
            == 0
        )
        repo.update_identifier.assert_not_called()
