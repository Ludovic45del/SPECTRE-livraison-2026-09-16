"""Controller FSEC - API REST."""

from django.core.serializers.json import DjangoJSONEncoder
from django.http import HttpResponse, JsonResponse
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.viewsets import ViewSet

from app.api.fsec.serializers import (
    DeliveryInfoSerializer,
    DeliveryValidationSerializer,
    FsecAssemblyPlanAnnotationsSerializer,
    FsecAssemblyPlanImageSerializer,
    FsecCreateVersionSerializer,
    FsecOverviewImageSerializer,
    FsecRequestedViewsSerializer,
    FsecSerializer,
)
from app.api.shared.mixins import LazyRepositoryList, PaginatedControllerMixin
from app.core.permissions import IsReadOnlyOrAdmin
from app.domain.campaign.services.campaign_service import get_campaign_by_uuid
from app.domain.exceptions import InvalidDataException
from app.domain.fsec.services.delivery_sheet_service import build_single_target_sheet
from app.domain.fsec.services.delivery_workflow_service import (
    get_delivery_snapshot,
    update_delivery_info,
    update_delivery_validation,
)
from app.domain.fsec.services.fsec_service import (
    count_all_fsecs,
    create_fsec,
    create_new_version,
    delete_fsec,
    get_active_fsec,
    get_all_active_fsecs,
    get_all_fsecs,
    get_fsec_by_slug,
    get_fsec_by_version_uuid,
    get_fsec_versions,
    get_fsecs_by_campaign,
    patch_fsec,
    set_fsec_assembly_plan_annotations,
    set_fsec_assembly_plan_image,
    set_fsec_overview_image,
    update_fsec,
)
from app.mapper.fsec.fsec_mapper import fsec_mapper_api_to_bean, fsec_mapper_bean_to_api
from app.repository.campaign.models.campaign_installations_entity import (
    CampaignInstallationsEntity,
)
from app.repository.campaign.repositories.campaign_repository import CampaignRepository
from app.repository.fa.repositories.fa_repository import FaRepository
from app.repository.fsec.repositories.fsec_repository import FsecRepository
from app.repository.steps.repositories.sealing_step_repository import (
    SealingStepRepository,
)
from app.repository.stock.repositories.fsec_assembly_item_repository import (
    FsecAssemblyItemRepository,
)
from app.repository.stock.repositories.stock_catalog_repository import (
    StockCatalogRepository,
)


class FsecPagination(PageNumberPagination):
    """Pagination pour les FSECs."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class FsecController(PaginatedControllerMixin, ViewSet):
    """Controller REST pour les FSECs."""

    lookup_field = "version_uuid"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = FsecRepository()
        self.paginator = FsecPagination()
        # Repositories Stock injectés dans patch/update_fsec pour activer le
        # couplage automatique des statuts d'éléments (CDC §4.2).
        self.stock_catalog_repository = StockCatalogRepository()
        self.stock_assembly_repository = FsecAssemblyItemRepository()
        self.sealing_repository = SealingStepRepository()
        # Réalignement des identifiants FA quand le nom/la campagne de la FSEC
        # change (le « nom » d'une FA encode le contexte campagne/FSEC).
        self.fa_repository = FaRepository()
        self.campaign_repository = CampaignRepository()

    def list(self, request) -> JsonResponse:
        """Liste tous les FSECs (GET /)."""
        source = LazyRepositoryList(
            fetch_func=lambda limit, offset: get_all_fsecs(
                self.repository, limit=limit, offset=offset
            ),
            count_func=lambda: count_all_fsecs(self.repository),
        )
        return self.paginate_or_json(request, source, fsec_mapper_bean_to_api)

    def retrieve(self, request, version_uuid=None) -> JsonResponse:
        """Récupère un FSEC par version_uuid (GET /:version_uuid/)."""
        bean = get_fsec_by_version_uuid(self.repository, version_uuid)
        return JsonResponse(fsec_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    @action(detail=False, methods=["get"], url_path=r"by-slug/(?P<slug>[^/]+)")
    def by_slug(self, request, slug=None) -> JsonResponse:
        """Récupère un FSEC par son slug d'URL (GET /by-slug/:slug/)."""
        bean = get_fsec_by_slug(self.repository, slug)
        return JsonResponse(fsec_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    def create(self, request) -> JsonResponse:
        """Crée un nouveau FSEC (POST /)."""
        data = request.data

        # Validation avec serializer
        serializer = FsecSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = fsec_mapper_api_to_bean(serializer.validated_data)
        result = create_fsec(self.repository, bean)
        return JsonResponse(
            fsec_mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def update(self, request, version_uuid=None) -> JsonResponse:
        """Met à jour un FSEC (PUT /:version_uuid/)."""
        data = request.data.copy()
        data["version_uuid"] = version_uuid

        # Validation avec serializer
        serializer = FsecSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = fsec_mapper_api_to_bean(serializer.validated_data)
        result = update_fsec(
            self.repository,
            bean,
            stock_catalog_repository=self.stock_catalog_repository,
            stock_assembly_repository=self.stock_assembly_repository,
            fa_repository=self.fa_repository,
            campaign_repository=self.campaign_repository,
        )
        return JsonResponse(fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    def get_permissions(self):
        """Admin-only pour la suppression."""
        if self.action == "destroy":
            return [IsReadOnlyOrAdmin()]
        return super().get_permissions()

    def destroy(self, request, version_uuid=None) -> HttpResponse:
        """Supprime un FSEC (DELETE /:version_uuid/)."""
        delete_fsec(self.repository, version_uuid)
        return HttpResponse(status=204)

    # Custom Actions
    @action(detail=False, methods=["get"], url_path="active")
    def list_active_fsecs(self, request) -> JsonResponse:
        """Liste tous les FSECs actifs."""
        beans = get_all_active_fsecs(self.repository)
        return self.paginate_or_json(request, beans, fsec_mapper_bean_to_api)

    @action(detail=False, methods=["get"], url_path="campaign/(?P<campaign_id>[^/.]+)")
    def list_by_campaign(self, request, campaign_id=None) -> JsonResponse:
        """Liste tous les FSECs d'une campagne."""
        beans = get_fsecs_by_campaign(self.repository, campaign_id)
        return self.paginate_or_json(request, beans, fsec_mapper_bean_to_api)

    @action(detail=False, methods=["get"], url_path="versions/(?P<fsec_uuid>[^/.]+)")
    def get_versions(self, request, fsec_uuid=None) -> JsonResponse:
        """Récupère toutes les versions d'un FSEC."""
        beans = get_fsec_versions(self.repository, fsec_uuid)
        return self.paginate_or_json(request, beans, fsec_mapper_bean_to_api)

    @action(detail=False, methods=["get"], url_path="active/(?P<fsec_uuid>[^/.]+)")
    def get_active(self, request, fsec_uuid=None) -> JsonResponse:
        """Récupère la version active d'un FSEC."""
        bean = get_active_fsec(self.repository, fsec_uuid)
        return JsonResponse(fsec_mapper_bean_to_api(bean), encoder=DjangoJSONEncoder)

    @action(detail=False, methods=["post"], url_path="version/(?P<fsec_uuid>[^/.]+)")
    def create_version(self, request, fsec_uuid=None) -> JsonResponse:
        """Crée une nouvelle version d'un FSEC existant."""
        data = request.data

        # Validation avec serializer
        serializer = FsecCreateVersionSerializer(data=data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        bean = fsec_mapper_api_to_bean(serializer.validated_data)
        result = create_new_version(self.repository, fsec_uuid, bean)
        return JsonResponse(
            fsec_mapper_bean_to_api(result), status=201, encoder=DjangoJSONEncoder
        )

    def _build_installation_label(self, installation_id):
        # `is None` plutôt que `not installation_id` : l'installation LMJ a
        # l'id 0 (cf. data/campaign/campaign_installations.csv), or 0 est
        # falsy en Python ⇒ `not 0` faisait passer LMJ pour absente et la
        # fiche affichait "UNK_<campagne>" au lieu de "LMJ_<campagne>".
        if installation_id is None:
            return None
        return (
            CampaignInstallationsEntity.objects.filter(pk=installation_id)
            .values_list("label", flat=True)
            .first()
        )

    def _serialize_snapshot(self, snapshot) -> dict:
        fsec = snapshot.fsec
        return {
            "version_uuid": fsec.version_uuid,
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
            # Phase 1 dropdown accepteur (uuid UserProfile + username pour affichage).
            "delivery_acceptor_user_uuid": fsec.delivery_acceptor_user_uuid,
            "delivery_acceptor_username": fsec.delivery_acceptor_username,
            # Phase 2 réceptionnaire saisi libre (texte + date).
            "delivery_receiver_name": fsec.delivery_receiver_name,
            "delivery_receiver_date": (
                fsec.delivery_receiver_date.isoformat()
                if fsec.delivery_receiver_date
                else None
            ),
        }

    @action(detail=True, methods=["get", "patch"], url_path="delivery-info")
    def delivery_info(self, request, version_uuid=None) -> JsonResponse:
        """GET : lit l'état actuel du workflow ; PATCH : phase 1 (date + I0).

        Le N° I0 est écrit sur le `SealingStep` le plus récent du FSEC. S'il
        n'y a aucun sealing step, l'I0 est ignoré côté serveur (le frontend
        désactive le champ dans ce cas).
        """
        if request.method == "GET":
            snapshot = get_delivery_snapshot(
                self.repository, self.sealing_repository, version_uuid
            )
            return JsonResponse(
                self._serialize_snapshot(snapshot), encoder=DjangoJSONEncoder
            )

        serializer = DeliveryInfoSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        payload = serializer.validated_data
        snapshot = update_delivery_info(
            self.repository,
            self.sealing_repository,
            version_uuid,
            delivery_date=payload.get("delivery_date"),
            num_interface_io=payload.get("num_interface_io"),
            delivery_acceptor_user_uuid=(
                str(payload["delivery_acceptor_user_uuid"])
                if payload.get("delivery_acceptor_user_uuid")
                else None
            ),
        )
        return JsonResponse(
            self._serialize_snapshot(snapshot), encoder=DjangoJSONEncoder
        )

    @action(detail=True, methods=["patch"], url_path="delivery-validation")
    def patch_delivery_validation(self, request, version_uuid=None) -> JsonResponse:
        """Phase 2 : signature TCI + OK/KO + remarques.

        Le signataire est `request.user` (auth JWT). L'horodatage est posé
        côté serveur. Pas de signature anonyme : si l'utilisateur n'est pas
        authentifié, le middleware DRF refuse avant d'arriver ici.
        """
        serializer = DeliveryValidationSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))
        payload = serializer.validated_data
        snapshot = update_delivery_validation(
            self.repository,
            self.sealing_repository,
            version_uuid,
            validator_user_id=request.user.id,
            validator_username=request.user.username,
            validation=payload.get("delivery_validation", ""),
            remarques=payload.get("delivery_remarques"),
            receiver_name=payload.get("delivery_receiver_name"),
            receiver_date=payload.get("delivery_receiver_date"),
        )
        return JsonResponse(
            self._serialize_snapshot(snapshot), encoder=DjangoJSONEncoder
        )

    @action(detail=True, methods=["patch"], url_path="requested-views")
    def requested_views(self, request, version_uuid=None) -> JsonResponse:
        """Met à jour les vues / photos demandées (onglet Vue/Photo, R08).

        Corps : `{ "requested_views": "..." | "" | null }`. Action dédiée (et non
        le PUT global) : le champ n'est pas dans `FsecSerializer`, un PUT partiel
        ne peut donc jamais l'effacer. Renvoie le FSEC complet mis à jour.
        """
        serializer = FsecRequestedViewsSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        # Chaîne vide ⇒ None : pas de distinction métier entre « vide » et
        # « absent », et on évite de stocker des blancs inutiles.
        value = serializer.validated_data.get("requested_views")
        if value is not None:
            value = value.strip() or None

        result = patch_fsec(self.repository, version_uuid, {"requested_views": value})
        return JsonResponse(fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    @action(detail=True, methods=["post"], url_path="delivery-sheet")
    def delivery_sheet(self, request, version_uuid=None) -> HttpResponse:
        """Génère le PDF de la fiche de livraison à partir des données stockées.

        Plus aucune saisie côté requête : la modal frontend a déjà persisté
        les valeurs via /delivery-info et /delivery-validation.
        """
        snapshot = get_delivery_snapshot(
            self.repository, self.sealing_repository, version_uuid
        )
        fsec = snapshot.fsec
        if not fsec.campaign_id:
            raise InvalidDataException("FSEC sans campagne associée")
        campaign = get_campaign_by_uuid(CampaignRepository(), fsec.campaign_id)

        pdf = build_single_target_sheet(
            fsec=fsec,
            campaign=campaign,
            installation_label=self._build_installation_label(campaign.installation_id),
            num_interface_io=snapshot.num_interface_io or "",
            delivery_date=fsec.delivery_date,
            validation_integrite=fsec.delivery_validation or "",
            remarques=fsec.delivery_remarques or "",
        )
        filename = f"fiche-livraison-{fsec.display_name or fsec.name}.pdf".replace(
            " ", "_"
        )
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="overview-image",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def overview_image(self, request, version_uuid=None) -> JsonResponse:
        """Upload (PATCH) ou suppression (DELETE) de la photo de vue d'ensemble.

        PATCH multipart/form-data, champ `image`. Renvoie le FSEC mis à jour
        avec l'URL de la photo dans `overview_image` (ou null après DELETE).
        """
        if request.method == "DELETE":
            result = set_fsec_overview_image(self.repository, version_uuid, None)
            return JsonResponse(
                fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
            )

        serializer = FsecOverviewImageSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        result = set_fsec_overview_image(
            self.repository, version_uuid, serializer.validated_data["image"]
        )
        return JsonResponse(fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="assembly-plan",
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def assembly_plan(self, request, version_uuid=None) -> JsonResponse:
        """Upload (PATCH) ou suppression (DELETE) de l'image du plan d'assemblage.

        PATCH multipart/form-data, champ `image`. Renvoie le FSEC mis à jour avec
        l'URL dans `assembly_plan_image` (ou null après DELETE). Le DELETE vide
        aussi le calque `assembly_plan_annotations`.
        """
        if request.method == "DELETE":
            result = set_fsec_assembly_plan_image(self.repository, version_uuid, None)
            return JsonResponse(
                fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder
            )

        serializer = FsecAssemblyPlanImageSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        result = set_fsec_assembly_plan_image(
            self.repository, version_uuid, serializer.validated_data["image"]
        )
        return JsonResponse(fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder)

    @action(detail=True, methods=["put"], url_path="assembly-plan-annotations")
    def assembly_plan_annotations(self, request, version_uuid=None) -> JsonResponse:
        """Remplace le calque d'annotations du plan d'assemblage (PUT, JSON).

        Corps : `{ "annotations": [...] }`. Renvoie le FSEC mis à jour avec le
        calque dans `assembly_plan_annotations`.
        """
        serializer = FsecAssemblyPlanAnnotationsSerializer(data=request.data)
        if not serializer.is_valid():
            raise InvalidDataException(str(serializer.errors))

        result = set_fsec_assembly_plan_annotations(
            self.repository, version_uuid, serializer.validated_data["annotations"]
        )
        return JsonResponse(fsec_mapper_bean_to_api(result), encoder=DjangoJSONEncoder)
