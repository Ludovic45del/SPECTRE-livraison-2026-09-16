"""Controller LabContact — CRUD de l'annuaire des laboratoires (/lab-contacts/).

Liste partagée et éditable par toute l'équipe : la permission est
`IsAuthenticated` (comme le matériel et les listes de tâches), pas de
restriction au chef de labo.
"""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ViewSet

from app.api.labcontact.serializers import (
    LabContactPatchSerializer,
    LabContactSerializer,
)
from app.domain.exceptions import InvalidDataException
from app.domain.labcontact.services.lab_contact_service import (
    create_contact,
    delete_contact,
    get_all_contacts,
    get_contact_by_uuid,
    patch_contact,
    update_contact,
)
from app.mapper.labcontact.lab_contact_mapper import (
    lab_contact_api_to_bean,
    lab_contact_bean_to_api,
    lab_contact_beans_to_api,
)
from app.repository.labcontact.repositories.lab_contact_repository import (
    LabContactRepository,
)


class LabContactController(ViewSet):
    """Liste complète + CRUD individuel (lookup par uuid) : GET, POST, PUT, PATCH, DELETE.

    Un uuid d'URL malformé ou inconnu donne 404 (le repository le traite comme
    absent) ; le PUT le valide via le serializer (400).
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = LabContactRepository()

    def list(self, request) -> JsonResponse:
        beans = get_all_contacts(self.repository)
        return JsonResponse(
            lab_contact_beans_to_api(beans),
            safe=False,
            encoder=DjangoJSONEncoder,
        )

    def retrieve(self, request, uuid=None) -> JsonResponse:
        bean = get_contact_by_uuid(self.repository, str(uuid))
        return JsonResponse(lab_contact_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        serializer = LabContactSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = lab_contact_api_to_bean(serializer.validated_data)
        result = create_contact(self.repository, bean)
        return JsonResponse(
            lab_contact_bean_to_api(result),
            status=201,
            encoder=DjangoJSONEncoder,
        )

    def update(self, request, uuid=None) -> JsonResponse:
        data = request.data.copy()
        data["uuid"] = uuid
        serializer = LabContactSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = lab_contact_api_to_bean(serializer.validated_data)
        # L'uuid de l'URL fait foi : un uuid divergent dans le corps est ignoré.
        bean.uuid = str(uuid)
        result = update_contact(self.repository, bean)
        return JsonResponse(lab_contact_bean_to_api(result), encoder=DjangoJSONEncoder)

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """Mise à jour partielle (PATCH /:uuid/) : seuls les champs fournis changent."""
        serializer = LabContactPatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        result = patch_contact(self.repository, str(uuid), serializer.validated_data)
        return JsonResponse(lab_contact_bean_to_api(result), encoder=DjangoJSONEncoder)

    def destroy(self, request, uuid=None) -> HttpResponse:
        delete_contact(self.repository, str(uuid))
        return HttpResponse(status=204)
