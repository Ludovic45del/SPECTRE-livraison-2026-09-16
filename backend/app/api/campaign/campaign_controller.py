"""Controller Campaign - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ViewSet

from app.api.campaign.serializers import CampaignPatchSerializer, CampaignSerializer
from app.api.fsec.serializers import DeliveryRecapBatchSerializer
from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.campaign.services.campaign_service import (
    count_all_campaigns,
    create_campaign,
    delete_campaign,
    get_all_campaigns,
    get_campaign_by_slug,
    get_campaign_by_uuid,
    patch_campaign,
    update_campaign,
)
from app.domain.exceptions import InvalidDataException
from app.domain.fsec.services.delivery_sheet_service import build_campaign_recap_sheet
from app.domain.fsec.services.delivery_workflow_service import (
    get_delivery_snapshot,
    update_delivery_info,
)
from app.domain.fsec.services.fsec_service import get_fsecs_by_campaign
from app.domain.shared.naming import build_campaign_display_name
from app.mapper.campaign.campaign_mapper import (
    campaign_mapper_api_to_bean,
    campaign_mapper_bean_to_api,
)
from app.repository.campaign.models.campaign_installations_entity import (
    CampaignInstallationsEntity,
)
from app.repository.campaign.repositories.campaign_documents_repository import (
    CampaignDocumentsRepository,
)
from app.repository.campaign.repositories.campaign_repository import CampaignRepository
from app.repository.campaign.repositories.campaign_teams_repository import (
    CampaignTeamsRepository,
)
from app.repository.fa.repositories.fa_repository import FaRepository
from app.repository.fsec.repositories.fsec_repository import FsecRepository
from app.repository.steps.repositories.sealing_step_repository import (
    SealingStepRepository,
)


class CampaignPagination(PageNumberPagination):
    """Pagination pour les campagnes."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class CampaignController(PaginatedControllerMixin, ViewSet):
    """Controller REST pour les campagnes."""

    lookup_field = "uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = CampaignRepository()
        self.paginator = CampaignPagination()
        # Repos injectés dans update/patch_campaign pour réaligner les
        # identifiants FA des FSEC rattachées quand le nom/année change.
        self.fa_repository = FaRepository()
        self.fsec_repository = FsecRepository()

    def list(self, request) -> JsonResponse:
        """Liste toutes les campagnes avec pagination (GET /)."""
        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: get_all_campaigns(
                self.repository, limit=limit, offset=offset
            ),
            count_func=lambda: count_all_campaigns(self.repository),
        )
        return self.paginate_or_json(request, source, campaign_mapper_bean_to_api)

    def retrieve(self, request, uuid=None) -> JsonResponse:
        """Récupère une campagne par UUID (GET /:uuid/)."""
        bean = get_campaign_by_uuid(self.repository, uuid)
        return JsonResponse(
            campaign_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[^/]+)")
    def by_slug(self, request, slug=None) -> JsonResponse:
        """Récupère une campagne par son slug d'URL (GET /by-slug/:slug/)."""
        bean = get_campaign_by_slug(self.repository, slug)
        return JsonResponse(
            campaign_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder
        )

    def create(self, request) -> JsonResponse:
        """Crée une nouvelle campagne (POST /)."""
        data = request.data

        # Validation avec serializer
        serializer = CampaignSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = campaign_mapper_api_to_bean(serializer.validated_data)
        result = create_campaign(self.repository, bean)
        return JsonResponse(
            campaign_mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, uuid=None) -> JsonResponse:
        """Met à jour une campagne (PUT /:uuid/)."""
        data = request.data.copy()
        data["uuid"] = uuid

        # Validation avec serializer
        serializer = CampaignSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = campaign_mapper_api_to_bean(serializer.validated_data)
        result = update_campaign(
            self.repository,
            bean,
            fa_repository=self.fa_repository,
            fsec_repository=self.fsec_repository,
        )
        return JsonResponse(
            campaign_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    def partial_update(self, request, uuid=None) -> JsonResponse:
        """Met à jour partiellement une campagne (PATCH /:uuid/)."""
        data = request.data

        # Validation partielle avec serializer
        serializer = CampaignPatchSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        validated = serializer.validated_data
        result = patch_campaign(
            self.repository,
            uuid,
            validated,
            fa_repository=self.fa_repository,
            fsec_repository=self.fsec_repository,
        )
        return JsonResponse(
            campaign_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
        )

    def get_permissions(self):
        """Admin-only pour la suppression."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def destroy(self, request, uuid=None) -> HttpResponse:
        """Supprime une campagne et ses données rattachées (DELETE /:uuid/)."""
        delete_campaign(
            self.repository,
            uuid,
            fsec_repository=FsecRepository(),
            teams_repository=CampaignTeamsRepository(),
            documents_repository=CampaignDocumentsRepository(),
        )
        return HttpResponse(status=204)

    def _build_installation_label(self, installation_id):
        # `is None` plutôt que `not installation_id` : LMJ a l'id 0 et 0 est
        # falsy ⇒ `not 0` ferait passer LMJ pour absente (cf. fix jumeau dans
        # fsec_controller._build_installation_label).
        if installation_id is None:
            return None
        return (
            CampaignInstallationsEntity.objects.filter(pk=installation_id)
            .values_list("label", flat=True)
            .first()
        )

    def _serialize_recap_row(self, snapshot) -> dict:
        fsec = snapshot.fsec
        return {
            "version_uuid": fsec.version_uuid,
            "name": fsec.name,
            "display_name": getattr(fsec, "display_name", None) or fsec.name,
            "delivery_date": (
                fsec.delivery_date.isoformat() if fsec.delivery_date else None
            ),
            "num_interface_io": snapshot.num_interface_io,
            "has_sealing_step": snapshot.has_sealing_step,
            "delivery_validation": fsec.delivery_validation,
            "delivery_remarques": fsec.delivery_remarques,
            "delivery_validated_by_username": fsec.delivery_validated_by_username,
            "delivery_validated_at": (
                fsec.delivery_validated_at.isoformat()
                if fsec.delivery_validated_at
                else None
            ),
            "delivery_acceptor_user_uuid": fsec.delivery_acceptor_user_uuid,
            "delivery_acceptor_username": fsec.delivery_acceptor_username,
            "delivery_receiver_name": fsec.delivery_receiver_name,
            "delivery_receiver_date": (
                fsec.delivery_receiver_date.isoformat()
                if fsec.delivery_receiver_date
                else None
            ),
        }

    def _build_recap_payload(self, campaign_uuid: str) -> dict:
        sealing_repo = SealingStepRepository()
        fsec_repo = FsecRepository()
        fsecs = get_fsecs_by_campaign(fsec_repo, campaign_uuid)
        rows = [
            self._serialize_recap_row(
                get_delivery_snapshot(fsec_repo, sealing_repo, f.version_uuid)
            )
            for f in fsecs
        ]
        return {"targets": rows}

    @action(detail=True, methods=["get", "patch"], url_path="delivery-recap")
    def delivery_recap(self, request, uuid=None) -> JsonResponse:
        """GET : état actuel des fiches ; PATCH : sauvegarde batch des saisies.

        Le PATCH ne pose PAS de signature : phase 2 reste un acte explicite
        via /fsecs/{id}/delivery-validation. Ici on persiste juste les
        valeurs (interface, date, OK/KO, remarques).
        """
        if request.method == "GET":
            return JsonResponse(
                self._build_recap_payload(uuid), encoder=DjangoJSONEncoder
            )

        serializer = DeliveryRecapBatchSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        fsec_repo = FsecRepository()
        sealing_repo = SealingStepRepository()

        for target in serializer.validated_data["targets"]:
            version_uuid = str(target["version_uuid"])
            update_delivery_info(
                fsec_repo,
                sealing_repo,
                version_uuid,
                delivery_date=target.get("delivery_date"),
                num_interface_io=target.get("num_interface_io"),
                delivery_acceptor_user_uuid=(
                    str(target["delivery_acceptor_user_uuid"])
                    if target.get("delivery_acceptor_user_uuid")
                    else None
                ),
            )
            validation = target.get("delivery_validation")
            remarques = target.get("delivery_remarques")
            receiver_name = target.get("delivery_receiver_name")
            receiver_date = target.get("delivery_receiver_date")
            # Le batch ne pose pas de signature TCI (cf. docstring) ; on persiste
            # juste les valeurs métiers, y compris le réceptionnaire (texte + date)
            # qui font partie de la fiche papier.
            if any(
                v is not None
                for v in (validation, remarques, receiver_name, receiver_date)
            ):
                fsec = fsec_repo.get_by_version_uuid(version_uuid)
                if fsec is not None:
                    if validation is not None:
                        fsec.delivery_validation = validation or None
                    if remarques is not None:
                        fsec.delivery_remarques = remarques or None
                    if receiver_name is not None:
                        fsec.delivery_receiver_name = receiver_name or None
                    if receiver_date is not None:
                        fsec.delivery_receiver_date = receiver_date
                    fsec_repo.update(fsec)

        return JsonResponse(self._build_recap_payload(uuid), encoder=DjangoJSONEncoder)

    @action(detail=True, methods=["post"], url_path="delivery-sheet")
    def delivery_sheet(self, request, uuid=None) -> HttpResponse:
        """Génère le PDF récap à partir des données stockées (plus de body)."""
        campaign = get_campaign_by_uuid(self.repository, uuid)
        installation_label = self._build_installation_label(campaign.installation_id)

        fsec_repo = FsecRepository()
        sealing_repo = SealingStepRepository()
        fsecs = get_fsecs_by_campaign(fsec_repo, uuid)
        overrides = {}
        for fsec in fsecs:
            snapshot = get_delivery_snapshot(fsec_repo, sealing_repo, fsec.version_uuid)
            overrides[fsec.version_uuid] = {
                "num_interface_io": snapshot.num_interface_io or "",
                "delivery_date": snapshot.fsec.delivery_date,
                "validation_integrite": snapshot.fsec.delivery_validation or "",
                "remarques": snapshot.fsec.delivery_remarques or "",
            }

        pdf = build_campaign_recap_sheet(
            campaign=campaign,
            installation_label=installation_label,
            fsecs=fsecs,
            overrides=overrides,
        )
        campaign_display_name = build_campaign_display_name(
            campaign.year, installation_label, campaign.name
        )
        filename = f"fiche-livraison-recap-{campaign_display_name}.pdf".replace(
            " ", "_"
        )
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
