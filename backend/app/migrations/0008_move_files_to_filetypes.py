# Generated manually
from django.db import migrations


def move_files_to_filetypes(apps, schema_editor):
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )
    CampaignDocumentsEntity = apps.get_model("app", "CampaignDocumentsEntity")
    CampaignFileTypesEntity = apps.get_model("app", "CampaignFileTypesEntity")

    # 1. Delete the "fake" documents created in 0007
    CampaignDocumentsEntity.objects.filter(
        name__in=[
            "note_synthese.docx",
            "budget_previsionnel.xlsx",
            "guide_utilisateur.pdf",
        ]
    ).delete()

    # 2. Create them as CampaignFileTypes
    # IDs 11, 12, 13 to match frontend constants
    # Plan PDF is subtype_id=7
    try:
        plan_pdf = CampaignDocumentSubtypesEntity.objects.get(id=7)

        new_types = [
            (11, "Note de synthèse.docx"),
            (12, "Budget prévisionnel.xlsx"),
            (13, "Guide utilisateur.pdf"),
        ]

        for fid, label in new_types:
            if not CampaignFileTypesEntity.objects.filter(id=fid).exists():
                CampaignFileTypesEntity.objects.create(
                    id=fid, label=label, subtype_id=plan_pdf
                )
    except CampaignDocumentSubtypesEntity.DoesNotExist:
        pass


def reverse_move(apps, schema_editor):
    CampaignFileTypesEntity = apps.get_model("app", "CampaignFileTypesEntity")
    CampaignFileTypesEntity.objects.filter(id__in=[11, 12, 13]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0007_seed_mixed_files"),
    ]

    operations = [
        migrations.RunPython(move_files_to_filetypes, reverse_move),
    ]
