"""Repository Indicators - Agrégations Django ORM pour les indicateurs.

Implémente IIndicatorsRepository. Le filtrage temporel passe par la campagne
associée (la campagne porte `year` et `semester`), pas par les dates de
création/tir des FSEC. Ainsi une FSEC d'une campagne S1 reste comptée en S1
même si elle est tirée plus tard.

Choix de modélisation pour les délais entre étapes :
- Le calcul porte sur les FSEC tirées (shooting_date non nul) appartenant aux
  campagnes de la période. Cela garantit un pipeline complet.
- Quand un FSEC a plusieurs occurrences d'une étape (ex. plusieurs métrologies),
  on retient la date la plus récente (MAX) comme représentative de l'étape.
- Une transition n'est comptée que si les deux dates extrêmes sont non nulles.
- "Disponible" (statut 5) n'a pas de date dédiée dans le modèle FSEC : il n'est
  donc pas exposé comme étape datée.

Les séries mensuelles (created_per_month, shot_per_month, started_per_month)
sont renvoyées avec leurs clés 'YYYY-MM' triées chronologiquement : les
événements hors période (comptés volontairement) s'insèrent sinon en fin de
dict (ordre d'insertion Python), ordre que JSON sérialise tel quel.

Fuseau horaire : les DateTimeField (created_at, permeation.start_date…) sont
stockés en UTC (USE_TZ). Toute réduction à une date civile (clé mensuelle,
delta en jours) passe par `_as_date`, qui convertit d'abord dans TIME_ZONE
(Europe/Paris) : un instant saisi « le 1er mars à minuit » à Paris est stocké
'28/02 23:00 UTC' et doit rester compté le 1er mars.
"""

import statistics
from datetime import date, datetime
from typing import Dict, List, Optional

from django.db.models import Count, Max, Q
from django.utils import timezone

from app.domain.indicators.interface.indicators_repository import IIndicatorsRepository
from app.domain.indicators.models.indicators_bean import (
    CampaignIndicatorsBean,
    CampaignVolumeBean,
    FaIndicatorsBean,
    FsecIndicatorsBean,
    StepDurationBean,
)
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fa.models.fa_entity import FaEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)
from app.repository.steps.models.assembly_step_entity import AssemblyStepEntity
from app.repository.steps.models.depressurization_step_entity import (
    DepressurizationStepEntity,
)
from app.repository.steps.models.gas_filling_bp_step_entity import (
    GasFillingBpStepEntity,
)
from app.repository.steps.models.gas_filling_hp_step_entity import (
    GasFillingHpStepEntity,
)
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity
from app.repository.steps.models.permeation_step_entity import PermeationStepEntity
from app.repository.steps.models.pictures_step_entity import PicturesStepEntity
from app.repository.steps.models.sealing_step_entity import SealingStepEntity

# Catégories FSEC "avec gaz" — voir backend/app/data/fsec/fsec_category.csv
# 0 = Sans Gaz ; 1..4 = variantes avec gaz (BP, HP, BP+HP, Permeation+HP).
GAS_CATEGORY_IDS = (1, 2, 3, 4)

# Statut FSEC : 7 = Tirée. Critère secondaire si shooting_date manquant.
# La source de vérité pour "tirée dans l'année" reste shooting_date pour
# permettre les calculs de délais sur la date factuelle.

# Transitions (ordre = ordre d'affichage côté UI).
# Tuple : (key, label, is_gas, from_step, to_step)
_TRANSITIONS = [
    (
        "assembly_to_metrology",
        "Assemblage → Métrologie",
        False,
        "assembly",
        "metrology",
    ),
    ("metrology_to_sealing", "Métrologie → Scellement", False, "metrology", "sealing"),
    ("sealing_to_pictures", "Scellement → Photos", False, "sealing", "pictures"),
    (
        "pictures_to_delivery",
        "Photos → Sur installation",
        False,
        "pictures",
        "delivery",
    ),
    ("delivery_to_shooting", "Sur installation → Tirée", False, "delivery", "shooting"),
    ("pictures_to_permeation", "Photos → Perméation", True, "pictures", "permeation"),
    (
        "permeation_to_gas_filling",
        "Perméation → Remplissage gaz",
        True,
        "permeation",
        "gas_filling",
    ),
    (
        "gas_filling_to_airtightness",
        "Remplissage gaz → Étanchéité BP",
        True,
        "gas_filling",
        "airtightness",
    ),
    (
        "airtightness_to_depressurization",
        "Étanchéité BP → Dépressurisation",
        True,
        "airtightness",
        "depressurization",
    ),
]


def _semester_label(semester: Optional[int]) -> Optional[str]:
    """Convertit 1/2 en libellé DB ('S1'/'S2'), None reste None."""
    if semester == 1:
        return "S1"
    if semester == 2:
        return "S2"
    return None


def _campaign_q(year: int, semester: Optional[int], prefix: str = "") -> Q:
    """Construit le Q sur la campagne (year + semester optionnel).

    `prefix` désigne le chemin ORM jusqu'à la FK `campaign_id` :
    - ""                                      → entité = FsecEntity (campaign_id direct)
    - "fsec_version_id__"                     → entité = FA / Step rattachée à FSEC
    - "metrology_step_id__fsec_version_id__"  → entité = SealingStep (indirect)
    """
    q = Q(**{f"{prefix}campaign_id__year": year})
    sem_label = _semester_label(semester)
    if sem_label is not None:
        q &= Q(**{f"{prefix}campaign_id__semester": sem_label})
    return q


def _campaign_filter(year: int, semester: Optional[int]) -> Q:
    """Filtre direct sur FsecEntity (raccourci historique)."""
    return _campaign_q(year, semester)


def _campaign_entity_filter(year: int, semester: Optional[int]) -> Q:
    """Filtre direct sur CampaignEntity (qui porte `year` et `semester`)."""
    q = Q(year=year)
    sem_label = _semester_label(semester)
    if sem_label is not None:
        q &= Q(semester=sem_label)
    return q


def _campaign_filter_via_fsec(year: int, semester: Optional[int]) -> Q:
    """Filtre pour FaEntity / Step liée 1-FSEC."""
    return _campaign_q(year, semester, prefix="fsec_version_id__")


def _month_buckets(year: int, semester: Optional[int]) -> Dict[str, int]:
    """Pré-remplit les buckets mensuels (clé YYYY-MM → 0) pour la période.

    Pour l'axe X des charts mensuels : 6 mois si un semestre est filtré, 12 sinon.
    """
    if semester == 1:
        months = range(1, 7)
    elif semester == 2:
        months = range(7, 13)
    else:
        months = range(1, 13)
    return {f"{year:04d}-{m:02d}": 0 for m in months}


class IndicatorsRepository(IIndicatorsRepository):
    """Implémentation du repository Indicators (lecture seule, sans cache interne)."""

    # ------------------------------------------------------------------ FA
    def get_fa_indicators(
        self, year: int, semester: Optional[int] = None
    ) -> FaIndicatorsBean:
        """Compteurs FA pour la période + délais moyens de traitement + stock ouvert.

        Le rattachement FA→période passe par la campagne de la FSEC liée : une FA
        sur une FSEC d'une campagne S1 est comptée en S1, peu importe quand
        elle a été créée. Les FA dont la FSEC n'a pas de campagne sont exclues.
        """
        in_year = FaEntity.objects.filter(_campaign_filter_via_fsec(year, semester))

        total = in_year.count()

        by_status = self._counter_dict(
            in_year.values_list("status_id").annotate(c=Count("uuid"))
        )

        by_criticality = self._counter_dict(
            in_year.exclude(criticality_id__isnull=True)
            .values_list("criticality_id")
            .annotate(c=Count("uuid"))
        )

        by_discovery_step: Dict[str, int] = {}
        for row in (
            in_year.exclude(fsec_step_id__isnull=True)
            .values_list("fsec_step_id")
            .annotate(c=Count("uuid"))
        ):
            step_id, count = row[0], row[1]
            by_discovery_step[str(step_id)] = count

        # Stock ouvert = FA non clôturées (toutes années confondues).
        open_stock = FaEntity.objects.filter(closure_date__isnull=True).count()

        # Délais (en jours). On ne moyenne que sur les FA pour lesquelles les
        # deux dates concernées sont renseignées.
        avg_event_to_open = self._avg_days(
            in_year.exclude(event_date__isnull=True).exclude(
                iec_validation_open_date__isnull=True
            ),
            from_field="event_date",
            to_field="iec_validation_open_date",
        )
        # Délai ouverture → clôture : remplace les anciennes étapes
        # open→progress et progress→closure (la date de passage en cours n'est
        # plus persistée). C'est le KPI DCP de "temps de traitement" d'une FA.
        avg_open_to_closure = self._avg_days(
            in_year.exclude(iec_validation_open_date__isnull=True).exclude(
                closure_date__isnull=True
            ),
            from_field="iec_validation_open_date",
            to_field="closure_date",
        )
        avg_total_lifecycle = self._avg_days(
            in_year.exclude(event_date__isnull=True).exclude(closure_date__isnull=True),
            from_field="event_date",
            to_field="closure_date",
        )

        # Créations par mois : pré-rempli pour avoir un axe X stable. Les FA
        # rattachées à une campagne S1 mais créées hors période sont quand même
        # ajoutées (la sémantique métier reste "FA appartenant à la période").
        created_per_month: Dict[str, int] = _month_buckets(year, semester)
        for created_at in in_year.values_list("created_at", flat=True):
            if created_at is None:
                continue
            key = _month_key(_as_date(created_at))
            created_per_month[key] = created_per_month.get(key, 0) + 1

        return FaIndicatorsBean(
            total_created_in_year=total,
            by_status=by_status,
            by_criticality=by_criticality,
            by_discovery_step=by_discovery_step,
            open_stock_all_years=open_stock,
            avg_event_to_open_days=avg_event_to_open,
            avg_open_to_closure_days=avg_open_to_closure,
            avg_total_lifecycle_days=avg_total_lifecycle,
            # Clés triées : une création hors période ne doit pas apparaître en fin de dict.
            created_per_month=dict(sorted(created_per_month.items())),
        )

    # ---------------------------------------------------------------- FSEC
    def get_fsec_indicators(
        self, year: int, semester: Optional[int] = None
    ) -> FsecIndicatorsBean:
        """Compteurs FSEC + cycle time + throughput mensuel.

        Rattachement par campagne (year + semester). Les FSEC sans campagne
        sont exclues du périmètre.
        """
        in_period = FsecEntity.objects.filter(
            _campaign_filter(year, semester), is_active=True
        )
        shot = in_period.filter(shooting_date__isnull=False)

        total_created = in_period.count()
        total_shot = shot.count()

        by_status = self._counter_dict(
            in_period.values_list("status_id").annotate(c=Count("version_uuid"))
        )
        by_category = self._counter_dict(
            in_period.values_list("category_id").annotate(c=Count("version_uuid"))
        )

        # Cycle time = délai created_at → shooting_date pour les FSEC tirées dans l'année.
        cycle_days: List[float] = []
        for row in shot.values("created_at", "shooting_date"):
            created_at = row["created_at"]
            shooting = row["shooting_date"]
            if created_at and shooting:
                delta = (shooting - _as_date(created_at)).days
                if delta >= 0:
                    cycle_days.append(float(delta))
        avg_cycle = _safe_mean(cycle_days)
        median_cycle = _safe_median(cycle_days)

        # Throughput mensuel : nb FSEC tirées par mois "YYYY-MM". L'axe est
        # pré-rempli pour la période ; les tirs effectifs hors période sont
        # quand même comptés (une FSEC S1 peut être tirée en S2).
        shot_per_month: Dict[str, int] = _month_buckets(year, semester)
        for shooting_date in shot.values_list("shooting_date", flat=True):
            if shooting_date is None:
                continue
            key = _month_key(shooting_date)
            shot_per_month[key] = shot_per_month.get(key, 0) + 1

        return FsecIndicatorsBean(
            total_created_in_year=total_created,
            total_shot_in_year=total_shot,
            by_status=by_status,
            by_category=by_category,
            avg_cycle_time_days=avg_cycle,
            median_cycle_time_days=median_cycle,
            # Clés triées : un tir hors période ne doit pas apparaître en fin de dict.
            shot_per_month=dict(sorted(shot_per_month.items())),
        )

    # ------------------------------------------------------------ Campaign
    def get_campaign_indicators(
        self, year: int, semester: Optional[int] = None, limit: int = 8
    ) -> CampaignIndicatorsBean:
        """Indicateurs campagnes de la période + densité FSEC + durée moyenne.

        Le filtrage est direct sur la campagne (elle porte `year`/`semester`).
        Les FSEC rattachées sont comptées par campagne (versions actives) pour
        dériver la densité moyenne et le top des campagnes les plus volumineuses.
        """
        campaigns = CampaignEntity.objects.filter(
            _campaign_entity_filter(year, semester)
        )
        total = campaigns.count()

        by_status = self._counter_dict(
            campaigns.values_list("status_id").annotate(c=Count("uuid"))
        )
        by_type = self._counter_dict(
            campaigns.values_list("type_id").annotate(c=Count("uuid"))
        )
        by_installation = self._counter_dict(
            campaigns.values_list("installation_id").annotate(c=Count("uuid"))
        )

        # FSEC (versions actives) rattachées, groupées par campagne.
        fsec_rows = (
            FsecEntity.objects.filter(_campaign_filter(year, semester), is_active=True)
            .values("campaign_id")
            .annotate(
                count=Count("version_uuid"),
                shot=Count("version_uuid", filter=Q(shooting_date__isnull=False)),
            )
        )
        fsec_by_campaign = {row["campaign_id"]: row for row in fsec_rows}
        total_fsec = sum(row["count"] for row in fsec_by_campaign.values())
        total_fsec_shot = sum(row["shot"] for row in fsec_by_campaign.values())
        avg_fsec = round(total_fsec / total, 2) if total else None

        # Durée (start_date → end_date) + démarrages mensuels + libellés campagne.
        durations: List[float] = []
        started_per_month: Dict[str, int] = _month_buckets(year, semester)
        name_by_uuid: Dict = {}
        for row in campaigns.values("uuid", "name", "start_date", "end_date"):
            name_by_uuid[row["uuid"]] = row["name"]
            start, end = row["start_date"], row["end_date"]
            if start and end:
                delta = (end - start).days
                if delta >= 0:
                    durations.append(float(delta))
            if start:
                key = _month_key(start)
                started_per_month[key] = started_per_month.get(key, 0) + 1
        avg_duration = _safe_mean(durations)

        # Top campagnes par volume de FSEC (densité décroissante).
        top_sorted = sorted(
            fsec_by_campaign.items(),
            key=lambda kv: kv[1]["count"],
            reverse=True,
        )[:limit]
        top_by_volume = [
            CampaignVolumeBean(
                uuid=str(campaign_id),
                name=name_by_uuid.get(campaign_id, "Campagne inconnue"),
                fsec_count=row["count"],
            )
            for campaign_id, row in top_sorted
        ]

        return CampaignIndicatorsBean(
            total_in_period=total,
            by_status=by_status,
            by_type=by_type,
            by_installation=by_installation,
            total_fsec=total_fsec,
            total_fsec_shot=total_fsec_shot,
            avg_fsec_per_campaign=avg_fsec,
            avg_duration_days=avg_duration,
            # Clés triées : un démarrage hors période ne doit pas apparaître en fin de dict.
            started_per_month=dict(sorted(started_per_month.items())),
            top_by_volume=top_by_volume,
        )

    # --------------------------------------------------------- Step durations
    def get_step_durations(
        self, year: int, semester: Optional[int] = None
    ) -> List[StepDurationBean]:
        """Durées des transitions inter-étapes (FSEC tirées de la période).

        Filtrage par campagne (year + semester) sur les FSEC déjà tirées
        (shooting_date non nul, garant d'un pipeline complet).
        """
        fsec_qs = FsecEntity.objects.filter(
            _campaign_filter(year, semester),
            is_active=True,
            shooting_date__isnull=False,
        )
        fsec_data = {
            row["version_uuid"]: {
                "category_id": row["category_id_id"],
                "delivery": row["delivery_date"],
                "shooting": row["shooting_date"],
            }
            for row in fsec_qs.values(
                "version_uuid", "category_id_id", "delivery_date", "shooting_date"
            )
        }
        fsec_ids = list(fsec_data.keys())
        if not fsec_ids:
            return [
                StepDurationBean(key=key, label=label, count=0, is_gas=is_gas)
                for key, label, is_gas, _, _ in _TRANSITIONS
            ]

        # Date représentative par FSEC pour chaque étape : MAX de la date applicable.
        step_dates: Dict[str, Dict] = {
            "assembly": _agg_max(
                AssemblyStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                "fsec_version_id",
                "end_date",
            ),
            "metrology": _agg_max(
                MetrologyStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                "fsec_version_id",
                "date",
            ),
            # SealingStep n'a pas de FK directe vers FSEC : on passe par metrology.
            "sealing": _agg_max(
                SealingStepEntity.objects.filter(
                    metrology_step_id__fsec_version_id__in=fsec_ids
                ),
                "metrology_step_id__fsec_version_id",
                "date",
            ),
            "pictures": _agg_max(
                PicturesStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                "fsec_version_id",
                "date",
            ),
            "permeation": _agg_max(
                PermeationStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                "fsec_version_id",
                "start_date",
            ),
            # Gas filling : min entre BP et HP (la première remplissage marque l'étape).
            "gas_filling": _agg_min_across(
                [
                    GasFillingBpStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                    GasFillingHpStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                ],
                "fsec_version_id",
                "date_of_fulfilment",
            ),
            "airtightness": _agg_max(
                AirtightnessTestLpStepEntity.objects.filter(
                    fsec_version_id__in=fsec_ids
                ),
                "fsec_version_id",
                "date_of_fulfilment",
            ),
            "depressurization": _agg_max(
                DepressurizationStepEntity.objects.filter(fsec_version_id__in=fsec_ids),
                "fsec_version_id",
                "date_of_fulfilment",
            ),
        }

        # Étapes "synthétiques" prises directement sur l'entité FSEC.
        delivery_map = {
            fid: d["delivery"] for fid, d in fsec_data.items() if d["delivery"]
        }
        shooting_map = {
            fid: d["shooting"] for fid, d in fsec_data.items() if d["shooting"]
        }
        step_dates["delivery"] = delivery_map
        step_dates["shooting"] = shooting_map

        results: List[StepDurationBean] = []
        for key, label, is_gas, from_step, to_step in _TRANSITIONS:
            deltas: List[float] = []
            for fid in fsec_ids:
                if is_gas and fsec_data[fid]["category_id"] not in GAS_CATEGORY_IDS:
                    continue
                d_from = step_dates[from_step].get(fid)
                d_to = step_dates[to_step].get(fid)
                if d_from and d_to:
                    delta = (_as_date(d_to) - _as_date(d_from)).days
                    if delta >= 0:
                        deltas.append(float(delta))
            results.append(
                StepDurationBean(
                    key=key,
                    label=label,
                    is_gas=is_gas,
                    count=len(deltas),
                    avg_days=_safe_mean(deltas),
                    median_days=_safe_median(deltas),
                    min_days=min(deltas) if deltas else None,
                    max_days=max(deltas) if deltas else None,
                )
            )
        return results

    # --------------------------------------------------------- Utilities
    @staticmethod
    def _counter_dict(queryset_rows) -> Dict[str, int]:
        """Convertit un queryset values_list+annotate en dict {str(key): count}."""
        result: Dict[str, int] = {}
        for row in queryset_rows:
            key, count = row[0], row[1]
            if key is None:
                continue
            result[str(key)] = count
        return result

    @staticmethod
    def _avg_days(queryset, from_field: str, to_field: str) -> Optional[float]:
        """Calcule la moyenne des deltas (en jours) entre deux DateField."""
        deltas: List[float] = []
        for row in queryset.values(from_field, to_field):
            a = row[from_field]
            b = row[to_field]
            if a and b:
                delta = (b - a).days
                if delta >= 0:
                    deltas.append(float(delta))
        return _safe_mean(deltas)


# ------------------------------------------------------------- helpers


def _agg_max(queryset, group_field: str, date_field: str) -> Dict:
    """Groupe par `group_field` et retourne {key: MAX(date_field)} en filtrant nulls."""
    rows = (
        queryset.exclude(**{f"{date_field}__isnull": True})
        .values(group_field)
        .annotate(d=Max(date_field))
    )
    return {row[group_field]: row["d"] for row in rows if row["d"] is not None}


def _agg_min_across(querysets, group_field: str, date_field: str) -> Dict:
    """Combine plusieurs querysets en prenant la date MIN (la plus précoce)."""
    merged: Dict = {}
    for qs in querysets:
        rows = (
            qs.exclude(**{f"{date_field}__isnull": True})
            .values(group_field)
            .annotate(d=Max(date_field))
        )
        for row in rows:
            key, value = row[group_field], row["d"]
            if value is None:
                continue
            if key not in merged or value < merged[key]:
                merged[key] = value
    return merged


def _as_date(value) -> date:
    """Convertit datetime → date CIVILE (fuseau TIME_ZONE du projet) si besoin.

    `datetime` est une sous-classe de `date` : tester `isinstance(value, date)`
    est donc toujours vrai pour un datetime. On teste explicitement `datetime`
    pour réellement convertir (sinon `date - datetime` lève une TypeError, ce qui
    cassait les transitions impliquant `permeation.start_date`, un DateTimeField).

    Avec USE_TZ, l'ORM renvoie des datetimes aware en UTC : un `.date()` direct
    donnerait la VEILLE pour un instant saisi à minuit Europe/Paris
    ('2026-01-14T23:00:00Z' = 15 janvier à Paris → bug J-1 sur les transitions
    « Photos → Perméation » et « Perméation → Remplissage gaz »). On bascule
    donc d'abord dans TIME_ZONE ; un datetime naïf (hors ORM) est laissé tel quel.
    """
    if isinstance(value, datetime):
        if timezone.is_aware(value):
            value = timezone.localtime(value)
        return value.date()
    return value


def _month_key(value: date) -> str:
    """Clé de bucket mensuel 'YYYY-MM' (zéro-paddée → tri lexical = chronologique)."""
    return f"{value.year:04d}-{value.month:02d}"


def _safe_mean(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return round(statistics.fmean(values), 2)


def _safe_median(values: List[float]) -> Optional[float]:
    if not values:
        return None
    return round(statistics.median(values), 2)
