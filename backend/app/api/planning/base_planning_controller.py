"""Base controller pour les entites planning.

Fournit un CRUD generique list/create/partial_update/destroy.
Les sous-classes declarent les attributs de configuration.
"""

import datetime
import uuid as uuid_mod

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.viewsets import ViewSet

from app.core.permissions import IsReadOnlyOrOperateur
from app.domain.exceptions import InvalidDataException, ValidationException
from app.repository.planning.repositories.planning_repository import PlanningRepository


def _get_year(request) -> int:
    """Extrait et valide le parametre ?year= de la requete."""
    year_param = request.query_params.get("year")
    if year_param is None:
        return datetime.date.today().year
    try:
        year = int(year_param)
    except (ValueError, TypeError):
        raise ValidationException(
            "year", f"Valeur invalide: '{year_param}'. Un entier est attendu."
        )
    if year < 2000 or year > 2100:
        raise ValidationException("year", "L'annee doit etre entre 2000 et 2100.")
    return year


def _parse_uuid(pk: str | None) -> uuid_mod.UUID:
    """Valide et parse un pk en UUID."""
    if pk is None:
        raise InvalidDataException("Un identifiant UUID est requis.")
    try:
        return uuid_mod.UUID(str(pk))
    except (ValueError, AttributeError):
        raise InvalidDataException(f"Identifiant UUID invalide: '{pk}'.")


class BasePlanningController(ViewSet):
    """Controller generique planning.

    Sous-classes doivent definir :
        serializer_class     - Classe Serializer DRF pour validation
        mapper_api_to_bean   - callable(dict) -> Bean
        mapper_bean_to_api   - callable(Bean) -> dict
        service_list         - callable(repo, year) ou callable(repo) selon list_mode
        service_create       - callable(repo, bean) -> Bean
        service_update       - callable(repo, uuid, bean) -> Bean (None si pas d'update)
        service_delete       - callable(repo, uuid) -> bool
        list_mode            - 'year' ou 'all'
        entity_name          - nom pour les messages d'erreur
    """

    permission_classes = [IsReadOnlyOrOperateur]
    http_method_names = ["get", "post", "patch", "delete", "options", "head"]

    serializer_class = None
    mapper_api_to_bean = None
    mapper_bean_to_api = None
    service_list = None
    service_create = None
    service_update = None
    service_delete = None
    list_mode = "year"
    entity_name = ""
    update_serializer_class = None
    repository_class = PlanningRepository

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = self.repository_class()

    def list(self, request) -> JsonResponse:
        if self.service_list is None:
            raise MethodNotAllowed("GET")
        if self.list_mode == "year":
            year = _get_year(request)
            beans = self.service_list(self.repository, year)
        else:
            beans = self.service_list(self.repository)

        # Pagination optionnelle via ?limit= et ?offset=
        limit_param = request.query_params.get("limit")
        offset_param = request.query_params.get("offset", "0")
        total = len(beans)
        if limit_param is not None:
            try:
                limit = int(limit_param)
                offset = int(offset_param)
            except (ValueError, TypeError):
                raise ValidationException(
                    "limit/offset",
                    "Les paramètres limit et offset doivent être des entiers.",
                )
            if limit < 0 or offset < 0:
                raise ValidationException(
                    "limit/offset",
                    "Les paramètres limit et offset doivent être positifs.",
                )
            limit = min(limit, 1000)
            beans = beans[offset : offset + limit]
            return JsonResponse(
                {
                    "results": [self.mapper_bean_to_api(b) for b in beans],
                    "total": total,
                },
                encoder=DjangoJSONEncoder,
            )

        return JsonResponse(
            [self.mapper_bean_to_api(b) for b in beans],
            safe=False,
            encoder=DjangoJSONEncoder,
        )

    def create(self, request) -> JsonResponse:
        serializer = self.serializer_class(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        bean = self.mapper_api_to_bean(serializer.validated_data)
        result = self.service_create(self.repository, bean)
        return JsonResponse(
            self.mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def partial_update(self, request, pk=None) -> JsonResponse:
        if self.service_update is None:
            raise MethodNotAllowed("PATCH")
        uuid = _parse_uuid(pk)
        ser_class = self.update_serializer_class or self.serializer_class
        serializer = ser_class(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        bean = self.mapper_api_to_bean(serializer.validated_data)
        result = self.service_update(self.repository, uuid, bean)
        return JsonResponse(self.mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, pk=None) -> HttpResponse:
        uuid = _parse_uuid(pk)
        self.service_delete(self.repository, uuid)
        return HttpResponse(status=204)
