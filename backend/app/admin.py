from django.contrib import admin

from app.repository.campaign.models.campaign_document_subtypes_entity import (
    CampaignDocumentSubtypesEntity,
)
from app.repository.campaign.models.campaign_document_types_entity import (
    CampaignDocumentTypesEntity,
)
from app.repository.campaign.models.campaign_documents_entity import (
    CampaignDocumentsEntity,
)

# Campaign Entities
from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.campaign.models.campaign_installations_entity import (
    CampaignInstallationsEntity,
)
from app.repository.campaign.models.campaign_roles_entity import CampaignRolesEntity
from app.repository.campaign.models.campaign_status_entity import CampaignStatusEntity
from app.repository.campaign.models.campaign_teams_entity import CampaignTeamsEntity
from app.repository.campaign.models.campaign_types_entity import CampaignTypesEntity

# Embase Entities
from app.repository.embase.models.embase_entity import EmbaseEntity
from app.repository.embase.models.etalonnage_entity import EtalonnageEntity
from app.repository.fsec.models.fsec_category_entity import FsecCategoryEntity
from app.repository.fsec.models.fsec_document_subtypes_entity import (
    FsecDocumentSubtypesEntity,
)
from app.repository.fsec.models.fsec_document_types_entity import (
    FsecDocumentTypesEntity,
)
from app.repository.fsec.models.fsec_documents_entity import FsecDocumentsEntity

# FSEC Entities
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.fsec.models.fsec_rack_entity import FsecRackEntity
from app.repository.fsec.models.fsec_roles_entity import FsecRolesEntity
from app.repository.fsec.models.fsec_status_entity import FsecStatusEntity
from app.repository.fsec.models.fsec_teams_entity import FsecTeamsEntity

# Lab Contact Entity (annuaire des laboratoires)
from app.repository.labcontact.models.lab_contact_entity import LabContactEntity

# Messaging Entities (messagerie interne)
from app.repository.messaging.models.conversation_entity import ConversationEntity
from app.repository.messaging.models.conversation_member_entity import (
    ConversationMemberEntity,
)
from app.repository.messaging.models.message_attachment_entity import (
    MessageAttachmentEntity,
)
from app.repository.messaging.models.message_entity import MessageEntity
from app.repository.messaging.models.message_entity_ref_entity import (
    MessageEntityRefEntity,
)

# Planning Entities
from app.repository.planning.models.planning_step_entity import PlanningStepEntity
from app.repository.steps.models.airtightness_test_lp_step_entity import (
    AirtightnessTestLpStepEntity,
)

# Steps Entities
from app.repository.steps.models.assembly_bench_entity import AssemblyBenchEntity
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
from app.repository.steps.models.metrology_machine_entity import MetrologyMachineEntity
from app.repository.steps.models.metrology_step_entity import MetrologyStepEntity
from app.repository.steps.models.permeation_step_entity import PermeationStepEntity
from app.repository.steps.models.photo_view_entity import PhotoViewEntity
from app.repository.steps.models.pictures_step_entity import PicturesStepEntity
from app.repository.steps.models.repressurization_step_entity import (
    RepressurizationStepEntity,
)
from app.repository.steps.models.sealing_step_entity import SealingStepEntity


# Campaign Admin Classes
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("uuid", "year", "installation_id", "name", "type_id", "semester")


class CampaignTypesAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class CampaignStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class CampaignInstallationsAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class CampaignRolesAdmin(admin.ModelAdmin):
    list_display = ("id", "label")


class CampaignDocumentTypesAdmin(admin.ModelAdmin):
    list_display = ("id", "label")


class CampaignDocumentSubtypesAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "type_id")


class CampaignTeamsAdmin(admin.ModelAdmin):
    list_display = ("uuid", "campaign_uuid", "role_id", "name")


class CampaignDocumentsAdmin(admin.ModelAdmin):
    list_display = ("uuid", "campaign_uuid", "subtype_id", "name", "date")


# FSEC Admin Classes
class FsecAdmin(admin.ModelAdmin):
    list_display = (
        "version_uuid",
        "fsec_uuid",
        "name",
        "campaign_id",
        "status_id",
        "category_id",
        "is_active",
    )


class FsecCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class FsecStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class FsecRackAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color", "is_full")


class FsecRolesAdmin(admin.ModelAdmin):
    list_display = ("id", "label")


class FsecTeamsAdmin(admin.ModelAdmin):
    list_display = ("uuid", "fsec_id", "role_id", "name")


class FsecDocumentsAdmin(admin.ModelAdmin):
    list_display = ("uuid", "fsec_id", "subtype_id", "name", "date")


# Steps Admin Classes
class AssemblyBenchAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class MetrologyMachineAdmin(admin.ModelAdmin):
    list_display = ("id", "label", "color")


class AssemblyStepAdmin(admin.ModelAdmin):
    list_display = ("uuid", "fsec_version_id", "start_date", "end_date")


class MetrologyStepAdmin(admin.ModelAdmin):
    list_display = ("uuid", "fsec_version_id", "date")


class SealingStepAdmin(admin.ModelAdmin):
    list_display = ("uuid", "metrology_step_id", "interface_io")


class PicturesStepAdmin(admin.ModelAdmin):
    list_display = ("uuid", "fsec_version_id", "operator", "date")


class PhotoViewAdmin(admin.ModelAdmin):
    list_display = ("uuid", "pictures_step_id", "name", "link")


# Planning Admin Classes
class PlanningStepAdmin(admin.ModelAdmin):
    list_display = (
        "display_order",
        "label",
        "color",
        "min_status_for_done",
        "use_shooting_date",
        "gas_only",
    )
    list_editable = (
        "color",
        "min_status_for_done",
        "use_shooting_date",
        "gas_only",
    )
    ordering = ("display_order",)


# Register Campaign Models
admin.site.register(CampaignEntity, CampaignAdmin)
admin.site.register(CampaignTypesEntity, CampaignTypesAdmin)
admin.site.register(CampaignStatusEntity, CampaignStatusAdmin)
admin.site.register(CampaignInstallationsEntity, CampaignInstallationsAdmin)
admin.site.register(CampaignRolesEntity, CampaignRolesAdmin)
admin.site.register(CampaignDocumentTypesEntity, CampaignDocumentTypesAdmin)
admin.site.register(CampaignDocumentSubtypesEntity, CampaignDocumentSubtypesAdmin)
admin.site.register(CampaignTeamsEntity, CampaignTeamsAdmin)
admin.site.register(CampaignDocumentsEntity, CampaignDocumentsAdmin)

# Register FSEC Models
admin.site.register(FsecEntity, FsecAdmin)
admin.site.register(FsecCategoryEntity, FsecCategoryAdmin)
admin.site.register(FsecStatusEntity, FsecStatusAdmin)
admin.site.register(FsecRackEntity, FsecRackAdmin)
admin.site.register(FsecRolesEntity, FsecRolesAdmin)
admin.site.register(FsecDocumentTypesEntity)
admin.site.register(FsecDocumentSubtypesEntity)
admin.site.register(FsecTeamsEntity, FsecTeamsAdmin)
admin.site.register(FsecDocumentsEntity, FsecDocumentsAdmin)

# Register Steps Models
admin.site.register(AssemblyBenchEntity, AssemblyBenchAdmin)
admin.site.register(MetrologyMachineEntity, MetrologyMachineAdmin)
admin.site.register(AssemblyStepEntity, AssemblyStepAdmin)
admin.site.register(MetrologyStepEntity, MetrologyStepAdmin)
admin.site.register(SealingStepEntity, SealingStepAdmin)
admin.site.register(PicturesStepEntity, PicturesStepAdmin)
admin.site.register(PhotoViewEntity, PhotoViewAdmin)
admin.site.register(AirtightnessTestLpStepEntity)
admin.site.register(GasFillingBpStepEntity)
admin.site.register(GasFillingHpStepEntity)
admin.site.register(PermeationStepEntity)
admin.site.register(DepressurizationStepEntity)
admin.site.register(RepressurizationStepEntity)

# Register Planning Models
admin.site.register(PlanningStepEntity, PlanningStepAdmin)


# Embase Admin Classes
class EmbaseAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "identifier",
        "type",
        "nombre_voies",
        "localisation_actuelle",
        "operationnelle_aimant",
        "operationnelle_broche",
        "created_at",
    )
    search_fields = ("identifier", "localisation_actuelle", "fsec_history")
    list_filter = (
        "type",
        "nombre_voies",
        "operationnelle_aimant",
        "operationnelle_broche",
    )


class EtalonnageAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "embase",
        "voie",
        "date",
        "operateur",
        "offset_0_bar_mv",
        "signal_etendue_mv",
    )


# Register Embase Models
admin.site.register(EmbaseEntity, EmbaseAdmin)
admin.site.register(EtalonnageEntity, EtalonnageAdmin)


# Lab Contact Admin Class
class LabContactAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "updated_at")
    search_fields = ("name", "phone", "comment")
    ordering = ("name",)


# Register Lab Contact Model
admin.site.register(LabContactEntity, LabContactAdmin)


# Messaging Admin Classes (messagerie interne)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("uuid", "kind", "name", "owner", "last_message_at", "created_at")
    list_select_related = ("owner__user",)
    search_fields = ("uuid", "name", "direct_key")
    list_filter = ("kind",)


class ConversationMemberAdmin(admin.ModelAdmin):
    list_display = ("uuid", "conversation", "member", "last_read_at", "joined_at")
    list_select_related = ("conversation", "member__user")
    search_fields = ("uuid", "conversation__uuid", "member__user__username")


class MessageAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "conversation",
        "author",
        "kind",
        "created_at",
        "edited_at",
        "deleted_at",
    )
    list_select_related = ("conversation", "author__user")
    search_fields = ("uuid", "conversation__uuid", "body")
    list_filter = ("kind",)


class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "message",
        "original_name",
        "content_type",
        "size",
        "position",
        "created_at",
    )
    list_select_related = ("message",)
    search_fields = ("uuid", "message__uuid", "original_name")


class MessageEntityRefAdmin(admin.ModelAdmin):
    list_display = (
        "uuid",
        "message",
        "entity_type",
        "entity_uuid",
        "label",
        "position",
        "created_at",
    )
    list_select_related = ("message",)
    search_fields = ("uuid", "message__uuid", "entity_uuid", "label")
    list_filter = ("entity_type",)


# Register Messaging Models
admin.site.register(ConversationEntity, ConversationAdmin)
admin.site.register(ConversationMemberEntity, ConversationMemberAdmin)
admin.site.register(MessageEntity, MessageAdmin)
admin.site.register(MessageEntityRefEntity, MessageEntityRefAdmin)
admin.site.register(MessageAttachmentEntity, MessageAttachmentAdmin)
