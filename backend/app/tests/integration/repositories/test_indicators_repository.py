"""Tests d'intégration pour IndicatorsRepository (agrégations ORM).

Couvre en particulier la chaîne gaz : `permeation.start_date` est un
DateTimeField alors que les étapes voisines sont des DateField. La conversion
datetime→date doit fonctionner, sinon `date - datetime` lève une TypeError qui
casse tout le calcul des durées (régression _as_date / datetime sous-classe de
date).

Fuseau (R12 côté indicateurs) : les DateTimeField sont stockés en UTC ; leur
date civile doit être prise dans TIME_ZONE (Europe/Paris), sinon un instant
saisi « à minuit Paris » (= 23:00 UTC la veille) est compté J-1.
"""

import uuid
from datetime import date, datetime
from datetime import timezone as dt_timezone

import pytest

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.indicators.repositories.indicators_repository import (
    IndicatorsRepository,
)
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)
from app.repository.steps.models.depressurization_step_entity import (
    DepressurizationStepEntity,
)
from app.repository.steps.models.gas_filling_bp_step_entity import (
    GasFillingBpStepEntity,
)
from app.repository.steps.models.permeation_step_entity import PermeationStepEntity
from app.repository.steps.models.pictures_step_entity import PicturesStepEntity


@pytest.fixture
def gas_fsec_shot(db):
    """Une FSEC gaz tirée (campagne 2025 S1) avec toute la chaîne gaz datée."""
    campaign = CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"Indic Gas {uuid.uuid4().hex[:8]}",
        year=2025,
        semester="S1",
    )
    fsec = FsecEntity.objects.create(
        campaign_id_id=campaign.uuid,
        status_id_id=7,
        category_id_id=3,  # catégorie gaz (∈ GAS_CATEGORY_IDS)
        rack_id_id=0,
        name="GAS-INDIC-1",
        is_active=True,
        delivery_date=date(2025, 3, 1),
        shooting_date=date(2025, 3, 10),
    )
    fid = fsec.version_uuid
    PicturesStepEntity.objects.create(fsec_version_id_id=fid, date=date(2025, 2, 1))
    PermeationStepEntity.objects.create(
        fsec_version_id_id=fid, start_date=date(2025, 2, 4)
    )
    GasFillingBpStepEntity.objects.create(
        fsec_version_id_id=fid, date_of_fulfilment=date(2025, 2, 8)
    )
    AirtightnessTestLpStepEntity.objects.create(
        fsec_version_id_id=fid, date_of_fulfilment=date(2025, 2, 12)
    )
    DepressurizationStepEntity.objects.create(
        fsec_version_id_id=fid, date_of_fulfilment=date(2025, 2, 16)
    )
    return fsec


@pytest.mark.integration
@pytest.mark.django_db
class TestStepDurationsGasChain:
    def test_gas_transitions_are_computed(self, gas_fsec_shot):
        """La chaîne gaz produit des durées (pas de crash datetime/date)."""
        durations = IndicatorsRepository().get_step_durations(2025, semester=1)
        by_key = {d.key: d for d in durations}

        # Les transitions qui touchent permeation (DateTimeField) doivent compter.
        for key in ("pictures_to_permeation", "permeation_to_gas_filling"):
            assert by_key[key].is_gas is True
            assert by_key[key].count == 1, key
            assert by_key[key].avg_days is not None, key
            assert by_key[key].avg_days >= 0, key

        # Le reste de la chaîne gaz (DateField only) aussi.
        for key in ("gas_filling_to_airtightness", "airtightness_to_depressurization"):
            assert by_key[key].count == 1, key
            assert by_key[key].avg_days is not None, key

    def test_non_gas_fsec_excluded_from_gas_chain(self, gas_fsec_shot):
        """Une FSEC sans gaz (catégorie 0) ne gonfle pas les transitions gaz."""
        campaign = CampaignEntity.objects.create(
            uuid=str(uuid.uuid4()),
            type_id_id=0,
            status_id_id=0,
            installation_id_id=0,
            name=f"Indic NoGas {uuid.uuid4().hex[:8]}",
            year=2025,
            semester="S1",
        )
        no_gas = FsecEntity.objects.create(
            campaign_id_id=campaign.uuid,
            status_id_id=7,
            category_id_id=0,  # Sans gaz
            rack_id_id=0,
            name="NOGAS-1",
            is_active=True,
            shooting_date=date(2025, 3, 5),
        )
        # Même si on lui colle une perméation, la catégorie 0 doit être exclue.
        PermeationStepEntity.objects.create(
            fsec_version_id_id=no_gas.version_uuid, start_date=date(2025, 2, 4)
        )

        durations = IndicatorsRepository().get_step_durations(2025, semester=1)
        by_key = {d.key: d for d in durations}
        # Seule la FSEC gaz (fixture) compte dans la transition gaz.
        assert by_key["pictures_to_permeation"].count == 1


def _make_campaign(name, *, year, semester="S1"):
    """Crée une campagne minimale (référentiels id 0) pour isoler un scénario."""
    return CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=0,
        installation_id_id=0,
        name=f"{name} {uuid.uuid4().hex[:8]}",
        year=year,
        semester=semester,
    )


# 28 février 2026 à 23:00 UTC = 1er mars 2026 00:00 à Paris (UTC+1) : c'est
# exactement ce que le front envoie (toISOString) pour un DatePicker « 1er mars ».
_PARIS_MIDNIGHT_MARCH_1_AS_UTC = datetime(2026, 2, 28, 23, 0, tzinfo=dt_timezone.utc)


@pytest.mark.integration
@pytest.mark.django_db
class TestDatetimeFieldsUseParisCivilDate:
    """Les DateTimeField sont réduits à leur date civile Europe/Paris, pas UTC."""

    def test_permeation_start_datetime_is_not_shifted_to_previous_day(self):
        """Perméation saisie le 1er mars (Paris) : delta 0 j avec Photos/Gaz du 1er mars.

        Avec un `.date()` UTC, la perméation tomberait le 28 février :
        « Photos → Perméation » deviendrait négatif (exclu, count 0) et
        « Perméation → Remplissage gaz » vaudrait 1 jour au lieu de 0.
        """
        campaign = _make_campaign("Indic TZ", year=2026)
        fsec = FsecEntity.objects.create(
            campaign_id_id=campaign.uuid,
            status_id_id=7,
            category_id_id=3,  # catégorie gaz
            rack_id_id=0,
            name="GAS-TZ-1",
            is_active=True,
            shooting_date=date(2026, 3, 10),
        )
        fid = fsec.version_uuid
        PicturesStepEntity.objects.create(fsec_version_id_id=fid, date=date(2026, 3, 1))
        PermeationStepEntity.objects.create(
            fsec_version_id_id=fid, start_date=_PARIS_MIDNIGHT_MARCH_1_AS_UTC
        )
        GasFillingBpStepEntity.objects.create(
            fsec_version_id_id=fid, date_of_fulfilment=date(2026, 3, 1)
        )

        durations = IndicatorsRepository().get_step_durations(2026, semester=1)
        by_key = {d.key: d for d in durations}

        assert by_key["pictures_to_permeation"].count == 1
        assert by_key["pictures_to_permeation"].avg_days == 0.0
        assert by_key["permeation_to_gas_filling"].count == 1
        assert by_key["permeation_to_gas_filling"].avg_days == 0.0

    def test_fsec_cycle_time_uses_paris_date_of_created_at(self):
        """FSEC créée le 1er mars 00:00 Paris et tirée le 1er mars : cycle 0 j (pas 1)."""
        campaign = _make_campaign("Indic TZ cycle", year=2026)
        fsec = _make_fsec(campaign, "CYCLE-TZ-1", shot=True)
        # created_at est auto_now_add : on le force après coup via update().
        FsecEntity.objects.filter(pk=fsec.pk).update(
            created_at=_PARIS_MIDNIGHT_MARCH_1_AS_UTC, shooting_date=date(2026, 3, 1)
        )

        bean = IndicatorsRepository().get_fsec_indicators(2026, semester=1)

        assert bean.total_shot_in_year == 1
        assert bean.avg_cycle_time_days == 0.0
        assert bean.median_cycle_time_days == 0.0

    def test_fa_created_per_month_uses_paris_month(self):
        """FA créée le 28/02 23:30 UTC (= 1er mars Paris) : comptée en mars, pas février."""
        campaign = _make_campaign("Indic TZ FA", year=2026)
        fsec = _make_fsec(campaign, "FA-TZ-1", shot=False)
        fa = FaEntity.objects.create(
            fsec_version_id=fsec,
            status_id_id=0,
            identifier=f"FA-{uuid.uuid4().hex[:8]}",
            discoverer="Testeur",
            event_date=date(2026, 3, 1),
            observation="Observation de test",
            quick_analysis="Analyse de test",
        )
        FaEntity.objects.filter(pk=fa.pk).update(
            created_at=datetime(2026, 2, 28, 23, 30, tzinfo=dt_timezone.utc)
        )

        bean = IndicatorsRepository().get_fa_indicators(2026, semester=1)

        assert bean.created_per_month["2026-03"] == 1
        assert bean.created_per_month["2026-02"] == 0


def _make_fsec(campaign, name, *, shot, is_active=True):
    """Crée une FSEC rattachée à `campaign` (helper partagé par les tests)."""
    return FsecEntity.objects.create(
        campaign_id_id=campaign.uuid,
        status_id_id=7,
        category_id_id=0,
        rack_id_id=0,
        name=name,
        is_active=is_active,
        shooting_date=date(2025, 3, 5) if shot else None,
    )


@pytest.fixture
def campaign_landscape(db):
    """Trois campagnes 2025 S1 + une 2025 S2, avec FSEC rattachées.

    Campagne A (S1) : statut 2 / type 0 / install 0, datée (42 j), 3 FSEC (1 tirée).
    Campagne B (S1) : statut 3 / type 1 / install 1, non datée, 1 FSEC (tirée).
    Campagne D (S1) : statut 2 / type 0 / install 0, non datée, 0 FSEC.
    Campagne C (S2) : statut 2 / type 0 / install 0, hors période S1.

    La campagne D (sans FSEC) compte dans `total_in_period` mais pas dans la
    somme des FSEC : elle dissocie le dénominateur de la densité (nb campagnes)
    du numérateur (FSEC sommées). La campagne C valide à la fois l'exclusion en
    S1 et l'agrégation en année entière.
    """
    campaign_a = CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=2,
        installation_id_id=0,
        name="Campagne A",
        year=2025,
        semester="S1",
        start_date=date(2025, 2, 1),
        end_date=date(2025, 3, 15),
    )
    campaign_b = CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=1,
        status_id_id=3,
        installation_id_id=1,
        name="Campagne B",
        year=2025,
        semester="S1",
    )
    CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=2,
        installation_id_id=0,
        name="Campagne D",
        year=2025,
        semester="S1",
    )
    CampaignEntity.objects.create(
        uuid=str(uuid.uuid4()),
        type_id_id=0,
        status_id_id=2,
        installation_id_id=0,
        name="Campagne C",
        year=2025,
        semester="S2",
    )

    _make_fsec(campaign_a, "A-1", shot=True)
    _make_fsec(campaign_a, "A-2", shot=False)
    _make_fsec(campaign_a, "A-3", shot=False)
    _make_fsec(campaign_b, "B-1", shot=True)
    return campaign_a, campaign_b


@pytest.mark.integration
@pytest.mark.django_db
class TestCampaignIndicators:
    def test_period_scoping_and_ventilations(self, campaign_landscape):
        """Filtrage S1 + ventilations par statut/type/installation."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        # A, B et D sont en S1 ; la campagne C (S2) est exclue.
        assert bean.total_in_period == 3
        assert bean.by_status == {"2": 2, "3": 1}
        assert bean.by_type == {"0": 2, "1": 1}
        assert bean.by_installation == {"0": 2, "1": 1}

    def test_fsec_density_and_shot_count(self, campaign_landscape):
        """Densité = FSEC sommées / nb campagnes, y compris celles sans FSEC."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        assert bean.total_fsec == 4
        assert bean.total_fsec_shot == 2
        # 4 FSEC / 3 campagnes (D incluse au dénominateur bien que sans FSEC).
        assert bean.avg_fsec_per_campaign == 1.33

    def test_inactive_fsec_excluded_from_counts(self, campaign_landscape):
        """Une version FSEC inactive ne gonfle ni le total ni le top."""
        campaign_a, _ = campaign_landscape
        _make_fsec(campaign_a, "A-OLD", shot=True, is_active=False)

        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        assert bean.total_fsec == 4
        assert bean.total_fsec_shot == 2
        assert bean.top_by_volume[0].fsec_count == 3

    def test_avg_duration_only_on_dated_campaigns(self, campaign_landscape):
        """La durée moyenne ne porte que sur les campagnes datées (A = 42 j)."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        assert bean.avg_duration_days == 42.0

    def test_started_per_month_buckets(self, campaign_landscape):
        """L'axe mensuel S1 est pré-rempli ; A démarre en février."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        assert bean.started_per_month["2025-02"] == 1
        # Pré-remplissage : 6 mois pour un semestre.
        assert len(bean.started_per_month) == 6
        assert bean.started_per_month["2025-01"] == 0

    def test_started_per_month_out_of_period_counted_and_keys_sorted(
        self, campaign_landscape
    ):
        """Un démarrage hors période est compté ET les clés restent triées (R19).

        Une campagne attribuée à 2025-S1 mais démarrée en août 2024 doit
        produire la clé '2024-08' (sémantique métier : elle appartient à la
        période) placée en TÊTE du dict — pas en fin selon l'ordre d'insertion
        Python, que JsonResponse sérialise tel quel.
        """
        CampaignEntity.objects.create(
            uuid=str(uuid.uuid4()),
            type_id_id=0,
            status_id_id=2,
            installation_id_id=0,
            name="Campagne E",
            year=2025,
            semester="S1",
            start_date=date(2024, 8, 15),
        )

        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)

        # Le démarrage hors période est bien compté.
        assert bean.started_per_month["2024-08"] == 1
        # Les 6 buckets S1 pré-remplis + la clé hors période.
        assert len(bean.started_per_month) == 7
        # Tri chronologique des clés 'YYYY-MM' (zéro-paddées → tri lexical OK).
        keys = list(bean.started_per_month.keys())
        assert keys == sorted(keys)
        assert keys[0] == "2024-08"

    def test_full_year_aggregates_both_semesters(self, campaign_landscape):
        """semester=None agrège S1 + S2 (la campagne C réintègre le périmètre)."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=None)
        # A, B, D (S1) + C (S2).
        assert bean.total_in_period == 4
        assert bean.by_status == {"2": 3, "3": 1}
        assert bean.total_fsec == 4  # C n'a pas de FSEC.
        assert bean.avg_fsec_per_campaign == 1.0  # 4 FSEC / 4 campagnes.
        # Axe annuel sur 12 mois quand aucun semestre n'est filtré.
        assert len(bean.started_per_month) == 12
        assert bean.started_per_month["2025-02"] == 1

    def test_top_by_volume_is_sorted_desc(self, campaign_landscape):
        """Le top campagnes est classé par volume de FSEC décroissant."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1)
        # D (sans FSEC) n'apparaît pas dans le top.
        assert [c.name for c in bean.top_by_volume] == ["Campagne A", "Campagne B"]
        assert bean.top_by_volume[0].fsec_count == 3

    def test_top_by_volume_respects_limit(self, campaign_landscape):
        """Le paramètre limit borne le nombre de campagnes du top."""
        bean = IndicatorsRepository().get_campaign_indicators(2025, semester=1, limit=1)
        assert len(bean.top_by_volume) == 1
        assert bean.top_by_volume[0].name == "Campagne A"

    def test_empty_period_returns_zeroed_bean(self, campaign_landscape):
        """Une année sans campagne renvoie un bean neutre (pas de crash)."""
        bean = IndicatorsRepository().get_campaign_indicators(1999, semester=None)
        assert bean.total_in_period == 0
        assert bean.total_fsec == 0
        assert bean.avg_fsec_per_campaign is None
        assert bean.avg_duration_days is None
        assert bean.top_by_volume == []


@pytest.mark.integration
@pytest.mark.django_db
class TestFsecMonthlySeriesSorted:
    def test_shot_per_month_out_of_period_counted_and_keys_sorted(
        self, campaign_landscape
    ):
        """Même garantie R19 pour la série FSEC : tir hors période compté + clés triées."""
        campaign_a, _ = campaign_landscape
        FsecEntity.objects.create(
            campaign_id_id=campaign_a.uuid,
            status_id_id=7,
            category_id_id=0,
            rack_id_id=0,
            name="A-EARLY",
            is_active=True,
            shooting_date=date(2024, 8, 20),
        )

        bean = IndicatorsRepository().get_fsec_indicators(2025, semester=1)

        assert bean.shot_per_month["2024-08"] == 1
        keys = list(bean.shot_per_month.keys())
        assert keys == sorted(keys)
        assert keys[0] == "2024-08"
