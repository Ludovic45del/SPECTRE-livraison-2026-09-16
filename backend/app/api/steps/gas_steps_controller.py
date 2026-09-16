"""Controller GasSteps - API REST pour les étapes GAZ.

Même pattern que BaseStepController (class attributes + staticmethod).
Ajoute la validation FSEC et l'action get_by_fsec partagée.
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.viewsets import ViewSet

from app.api.steps.serializers import (
    AirtightnessTestLpStepSerializer,
    DepressurizationStepSerializer,
    GasFillingBpStepSerializer,
    GasFillingHpStepSerializer,
    PermeationStepSerializer,
    RepressurizationStepSerializer,
)
from app.domain.exceptions import InvalidDataException, NotFoundException
from app.domain.steps.services.steps_service import (
    create_step,
    delete_step,
    get_all_gas_steps_by_fsec,
    get_step_by_uuid,
    get_steps_by_fsec_version_id,
    update_step,
)
from app.mapper.steps.airtightness_test_lp_step_mapper import (
    airtightness_test_lp_step_mapper_api_to_bean,
    airtightness_test_lp_step_mapper_bean_to_api,
)
from app.mapper.steps.depressurization_step_mapper import (
    depressurization_step_mapper_api_to_bean,
    depressurization_step_mapper_bean_to_api,
)
from app.mapper.steps.gas_filling_bp_step_mapper import (
    gas_filling_bp_step_mapper_api_to_bean,
    gas_filling_bp_step_mapper_bean_to_api,
)
from app.mapper.steps.gas_filling_hp_step_mapper import (
    gas_filling_hp_step_mapper_api_to_bean,
    gas_filling_hp_step_mapper_bean_to_api,
)
from app.mapper.steps.permeation_step_mapper import (
    permeation_step_mapper_api_to_bean,
    permeation_step_mapper_bean_to_api,
)
from app.mapper.steps.repressurization_step_mapper import (
    repressurization_step_mapper_api_to_bean,
    repressurization_step_mapper_bean_to_api,
)
from app.repository.fsec.repositories.fsec_repository import FsecRepository
from app.repository.steps.repositories.airtightness_test_lp_step_repository import (
    AirtightnessTestLpStepRepository,
)
from app.repository.steps.repositories.depressurization_step_repository import (
    DepressurizationStepRepository,
)
from app.repository.steps.repositories.gas_filling_bp_step_repository import (
    GasFillingBpStepRepository,
)
from app.repository.steps.repositories.gas_filling_hp_step_repository import (
    GasFillingHpStepRepository,
)
from app.repository.steps.repositories.permeation_step_repository import (
    PermeationStepRepository,
)
from app.repository.steps.repositories.repressurization_step_repository import (
    RepressurizationStepRepository,
)


class BaseGasStepController(ViewSet):
    """Base controller for gas step entities.

    Same pattern as BaseStepController (class attributes + staticmethod).
    Adds FSEC existence validation on create and shared get_by_fsec action.

    Subclasses must set:
        repository_class   – Repository class to instantiate
        step_name          – Name for error messages
        mapper_api_to_bean – callable(dict) -> Bean
        mapper_bean_to_api – callable(Bean) -> dict
    """

    lookup_field = "uuid"
    repository_class = None
    step_name = ""
    mapper_api_to_bean = None
    mapper_bean_to_api = None
    serializer_class = None

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = self.repository_class()

    def _validate(self, data):
        """Validate input data through the serializer if configured."""
        if self.serializer_class is None:
            return data
        serializer = self.serializer_class(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        return serializer.validated_data

    def _validate_fsec_exists(self, fsec_version_id: str) -> None:
        """Valide que le FSEC existe."""
        fsec_repo = FsecRepository()
        if fsec_repo.get_by_version_uuid(fsec_version_id) is None:
            raise NotFoundException("FsecVersion", fsec_version_id)

    @action(detail=False, methods=["get"], url_path="fsec/(?P<fsec_version_id>[^/.]+)")
    def get_by_fsec(self, request, fsec_version_id=None):
        """Récupère tous les steps pour une version FSEC donnée."""
        result = get_steps_by_fsec_version_id(self.repository, fsec_version_id)
        if result is None:
            return JsonResponse([], safe=False, encoder=DjangoJSONEncoder)
        if isinstance(result, list):
            return JsonResponse(
                [self.mapper_bean_to_api(b) for b in result],
                safe=False,
                encoder=DjangoJSONEncoder,
            )
        return JsonResponse(
            [self.mapper_bean_to_api(result)], safe=False, encoder=DjangoJSONEncoder
        )

    def retrieve(self, request, uuid=None) -> JsonResponse:
        bean = get_step_by_uuid(self.repository, uuid, self.step_name)
        return JsonResponse(self.mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        validated = self._validate(request.data)
        fsec_version_id = validated.get("fsec_version_id")
        if fsec_version_id:
            self._validate_fsec_exists(str(fsec_version_id))
        bean = self.mapper_api_to_bean(validated)
        result = create_step(self.repository, bean)
        return JsonResponse(
            self.mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        validated = self._validate(data)
        bean = self.mapper_api_to_bean(validated)
        result = update_step(self.repository, bean, self.step_name)
        return JsonResponse(self.mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        delete_step(self.repository, uuid, self.step_name)
        return HttpResponse(status=204)


class AirtightnessTestLpStepController(BaseGasStepController):
    """Contrôleur REST pour les tests d'étanchéité basse pression."""

    repository_class = AirtightnessTestLpStepRepository
    step_name = "AirtightnessTestLpStep"
    serializer_class = AirtightnessTestLpStepSerializer
    mapper_api_to_bean = staticmethod(airtightness_test_lp_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(airtightness_test_lp_step_mapper_bean_to_api)


class GasFillingBpStepController(BaseGasStepController):
    """Contrôleur REST pour le remplissage gaz basse pression."""

    repository_class = GasFillingBpStepRepository
    step_name = "GasFillingBpStep"
    serializer_class = GasFillingBpStepSerializer
    mapper_api_to_bean = staticmethod(gas_filling_bp_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(gas_filling_bp_step_mapper_bean_to_api)


class GasFillingHpStepController(BaseGasStepController):
    """Contrôleur REST pour le remplissage gaz haute pression."""

    repository_class = GasFillingHpStepRepository
    step_name = "GasFillingHpStep"
    serializer_class = GasFillingHpStepSerializer
    mapper_api_to_bean = staticmethod(gas_filling_hp_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(gas_filling_hp_step_mapper_bean_to_api)


class PermeationStepController(BaseGasStepController):
    """Contrôleur REST pour les étapes de perméation."""

    repository_class = PermeationStepRepository
    step_name = "PermeationStep"
    serializer_class = PermeationStepSerializer
    mapper_api_to_bean = staticmethod(permeation_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(permeation_step_mapper_bean_to_api)


class DepressurizationStepController(BaseGasStepController):
    """Contrôleur REST pour les étapes de dépressurisation."""

    repository_class = DepressurizationStepRepository
    step_name = "DepressurizationStep"
    serializer_class = DepressurizationStepSerializer
    mapper_api_to_bean = staticmethod(depressurization_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(depressurization_step_mapper_bean_to_api)


class RepressurizationStepController(BaseGasStepController):
    """Contrôleur REST pour les étapes de repressurisation."""

    repository_class = RepressurizationStepRepository
    step_name = "RepressurizationStep"
    serializer_class = RepressurizationStepSerializer
    mapper_api_to_bean = staticmethod(repressurization_step_mapper_api_to_bean)
    mapper_bean_to_api = staticmethod(repressurization_step_mapper_bean_to_api)


class AllGasStepsController(ViewSet):
    """Endpoint agrege pour recuperer tous les gas steps en une requete."""

    @action(detail=False, methods=["get"], url_path="(?P<fsec_version_id>[^/.]+)")
    def get_all(self, request, fsec_version_id=None):
        """Recupere tous les gas steps pour une version FSEC (6 types en 1 requete)."""
        repositories = {
            "airtightnessTestLp": AirtightnessTestLpStepRepository(),
            "gasFillingBp": GasFillingBpStepRepository(),
            "gasFillingHp": GasFillingHpStepRepository(),
            "permeation": PermeationStepRepository(),
            "depressurization": DepressurizationStepRepository(),
            "repressurization": RepressurizationStepRepository(),
        }
        mappers = {
            "airtightnessTestLp": airtightness_test_lp_step_mapper_bean_to_api,
            "gasFillingBp": gas_filling_bp_step_mapper_bean_to_api,
            "gasFillingHp": gas_filling_hp_step_mapper_bean_to_api,
            "permeation": permeation_step_mapper_bean_to_api,
            "depressurization": depressurization_step_mapper_bean_to_api,
            "repressurization": repressurization_step_mapper_bean_to_api,
        }
        result = get_all_gas_steps_by_fsec(repositories, mappers, fsec_version_id)
        return JsonResponse(result, encoder=DjangoJSONEncoder)
