"""Controller Indicators - Endpoint agrégé en lecture seule pour les KPI."""

from typing import Optional

from django.core.serializers.json import DjangoJSONEncoder
from django.http import JsonResponse
from rest_framework.viewsets import ViewSet

from app.core.permissions import IsReadOnlyOrOperateur
from app.domain.indicators.services.indicators_service import (
    current_year,
    get_indicators,
)
from app.mapper.indicators.indicators_mapper import indicators_bean_to_api
from app.repository.indicators.repositories.indicators_repository import (
    IndicatorsRepository,
)


class IndicatorsController(ViewSet):
    """Endpoint agrégé pour la page Indicateurs (lecture seule, pas de CRUD)."""

    permission_classes = [IsReadOnlyOrOperateur]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = IndicatorsRepository()

    def list(self, request) -> JsonResponse:
        """GET /api/v1/indicators/?year=YYYY&semester=1|2 — KPI agrégés pour la période.

        - `year` (optionnel, défaut = année courante)
        - `semester` (optionnel) : 1 ou 2. Toute autre valeur = année entière.
        """
        year_param = request.query_params.get("year")
        year = current_year()
        if year_param is not None:
            try:
                year = int(year_param)
            except (TypeError, ValueError):
                pass

        semester: Optional[int] = None
        semester_param = request.query_params.get("semester")
        if semester_param is not None:
            try:
                value = int(semester_param)
                if value in (1, 2):
                    semester = value
            except (TypeError, ValueError):
                pass

        bean = get_indicators(self.repository, year=year, semester=semester)
        return JsonResponse(indicators_bean_to_api(bean), encoder=DjangoJSONEncoder)
