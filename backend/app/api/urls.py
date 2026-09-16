"""API URLs - Router principal pour les endpoints REST."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

# Campaign Controllers
from app.api.campaign.campaign_controller import CampaignController
from app.api.campaign.campaign_documents_controller import CampaignDocumentsController
from app.api.campaign.campaign_teams_controller import CampaignTeamsController

# Dashboard Controller
from app.api.dashboard.dashboard_controller import DashboardController

# Embase Controllers
from app.api.embase.embase_controller import EmbaseController
from app.api.embase.etalonnage_controller import EtalonnageController

# FA Controllers
from app.api.fa.fa_controller import FaController

# FSEC Controllers
from app.api.fsec.fsec_controller import FsecController
from app.api.fsec.fsec_documents_controller import FsecDocumentsController
from app.api.fsec.fsec_teams_controller import FsecTeamsController

# Indicators Controller
from app.api.indicators.indicators_controller import IndicatorsController

# Lab Contact Controller (annuaire des laboratoires)
from app.api.labcontact.lab_contact_controller import LabContactController

# Material Controllers
from app.api.material.machine_controller import MachineController
from app.api.material.machine_maintenance_controller import MachineMaintenanceController
from app.api.material.machine_room_controller import MachineRoomController

# Messaging Controller (messagerie interne)
from app.api.messaging.conversation_controller import ConversationController

# Steps Controllers
from app.api.steps.assembly_step_controller import AssemblyStepController
from app.api.steps.gas_steps_controller import (
    AirtightnessTestLpStepController,
    AllGasStepsController,
    DepressurizationStepController,
    GasFillingBpStepController,
    GasFillingHpStepController,
    PermeationStepController,
    RepressurizationStepController,
)
from app.api.steps.metrology_step_controller import MetrologyStepController
from app.api.steps.photo_view_controller import PhotoViewController
from app.api.steps.pictures_step_controller import PicturesStepController
from app.api.steps.sealing_step_controller import SealingStepController

# Stock Controllers
from app.api.stock.alert_controller import StockAlertController
from app.api.stock.catalog_controller import StockCatalogController
from app.api.stock.fsec_assembly_controller import FsecAssemblyItemController
from app.api.stock.movement_controller import StockMovementController

# Tasklist Controller
from app.api.tasklist.task_list_controller import TaskListController

# User Controllers
from app.api.user.change_password_controller import ChangePasswordController
from app.api.user.dashboard_preferences_controller import DashboardPreferencesController
from app.api.user.me_controller import MeController
from app.api.user.set_initial_password_controller import SetInitialPasswordController
from app.api.user.user_admin_controller import UserAdminController
from app.api.user.user_lookup_controller import UserLookupController

# Create router
router = DefaultRouter()

# Campaign routes
router.register(r"campaigns", CampaignController, basename="campaigns")
router.register(r"campaign-teams", CampaignTeamsController, basename="campaign-teams")
router.register(
    r"campaign-documents", CampaignDocumentsController, basename="campaign-documents"
)

# FSEC routes
router.register(r"fsecs", FsecController, basename="fsecs")
router.register(r"fsec-teams", FsecTeamsController, basename="fsec-teams")
router.register(r"fsec-documents", FsecDocumentsController, basename="fsec-documents")

# FA routes
router.register(r"fas", FaController, basename="fas")

# Embase routes
router.register(r"embases", EmbaseController, basename="embases")
router.register(r"etalonnages", EtalonnageController, basename="etalonnages")

# Material routes
router.register(r"material/rooms", MachineRoomController, basename="material-rooms")
router.register(r"material/machines", MachineController, basename="material-machines")
router.register(
    r"material/maintenances",
    MachineMaintenanceController,
    basename="material-maintenances",
)

# Lab contacts route (annuaire des laboratoires — Équipe et Carte)
router.register(r"lab-contacts", LabContactController, basename="lab-contacts")

# Stock routes
router.register(r"stock/catalog", StockCatalogController, basename="stock-catalog")
router.register(r"stock/movements", StockMovementController, basename="stock-movements")
router.register(r"stock/alerts", StockAlertController, basename="stock-alerts")
router.register(
    r"fsec-assembly-items",
    FsecAssemblyItemController,
    basename="fsec-assembly-items",
)

# Steps routes
router.register(r"assembly-steps", AssemblyStepController, basename="assembly-steps")
router.register(r"metrology-steps", MetrologyStepController, basename="metrology-steps")
router.register(r"sealing-steps", SealingStepController, basename="sealing-steps")
router.register(r"pictures-steps", PicturesStepController, basename="pictures-steps")
router.register(r"photo-views", PhotoViewController, basename="photo-views")

# Gas Steps routes
router.register(
    r"airtightness-test-lp-steps",
    AirtightnessTestLpStepController,
    basename="airtightness-test-lp-steps",
)
router.register(
    r"gas-filling-bp-steps", GasFillingBpStepController, basename="gas-filling-bp-steps"
)
router.register(
    r"gas-filling-hp-steps", GasFillingHpStepController, basename="gas-filling-hp-steps"
)
router.register(
    r"permeation-steps", PermeationStepController, basename="permeation-steps"
)
router.register(
    r"depressurization-steps",
    DepressurizationStepController,
    basename="depressurization-steps",
)
router.register(
    r"repressurization-steps",
    RepressurizationStepController,
    basename="repressurization-steps",
)

# Aggregated Gas Steps route (performance optimization: 6 requests → 1)
router.register(r"all-gas-steps", AllGasStepsController, basename="all-gas-steps")

# Tasklist route (listes de tâches partagées du widget d'accueil)
router.register(r"task-lists", TaskListController, basename="task-lists")

# Messaging routes (messagerie interne : conversations, membres, messages)
router.register(r"conversations", ConversationController, basename="conversations")

# Dashboard route (agrégation légère pour la page d'accueil)
router.register(r"dashboard", DashboardController, basename="dashboard")

# Indicators route (KPI agrégés pour la page Indicateurs)
router.register(r"indicators", IndicatorsController, basename="indicators")

# User routes
router.register(r"users", UserAdminController, basename="users")
router.register(
    r"auth/change-password", ChangePasswordController, basename="change-password"
)
router.register(
    r"auth/set-initial-password",
    SetInitialPasswordController,
    basename="set-initial-password",
)
router.register(r"auth/me", MeController, basename="me")
router.register(
    r"auth/dashboard-preferences",
    DashboardPreferencesController,
    basename="dashboard-preferences",
)

urlpatterns = [
    # Endpoint dedie aux dropdowns d'operateurs (acces operateur + admin).
    # Declare avant l'include router pour eviter la collision avec /users/<uuid>/.
    path(
        "users/lookup/",
        UserLookupController.as_view({"get": "list"}),
        name="users-lookup",
    ),
    path("", include(router.urls)),
    path("planning/", include("app.api.planning.urls")),
]
