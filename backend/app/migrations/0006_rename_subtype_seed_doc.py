# Generated manually
import uuid
from datetime import date

from django.db import migrations


def update_subtype_and_seed_doc(apps, schema_editor):
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )
    CampaignDocumentsEntity = apps.get_model("app", "CampaignDocumentsEntity")
    CampaignEntity = apps.get_model("app", "CampaignEntity")

    # 1. Rename 'CAO.pdf' (id=7) to 'Plan PDF'
    try:
        subtype = CampaignDocumentSubtypesEntity.objects.get(id=7)
        subtype.label = "Plan PDF"
        subtype.save()
    except CampaignDocumentSubtypesEntity.DoesNotExist:
        pass

    # 2. Seed 'fichier.pdf' in 'Plan 3D' (id=8)
    # We need a valid campaign to attach the document to.
    # We'll try to find the first available campaign, or skip if none.
    first_campaign = CampaignEntity.objects.first()

    if first_campaign:
        try:
            plan_3d_subtype = CampaignDocumentSubtypesEntity.objects.get(
                id=8
            )  # Plan 3D

            # Check if doc already exists to avoid dupes if migration runs twice
            if not CampaignDocumentsEntity.objects.filter(
                name="fichier.pdf",
                subtype_id=plan_3d_subtype,
                campaign_uuid=first_campaign,
            ).exists():
                CampaignDocumentsEntity.objects.create(
                    uuid=uuid.uuid4(),
                    campaign_uuid=first_campaign,
                    subtype_id=plan_3d_subtype,
                    file_type_id=None,  # No folder
                    name="fichier.pdf",
                    path="P:\\Test\\fichier.pdf",
                    date=date.today(),
                )
        except CampaignDocumentSubtypesEntity.DoesNotExist:
            print("Subtype Plan 3D (id=8) not found. Skipping doc seed.")


def reverse_func(apps, schema_editor):
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )
    try:
        subtype = CampaignDocumentSubtypesEntity.objects.get(id=7)
        subtype.label = "CAO.pdf"
        subtype.save()
    except:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_seed_campaign_file_types"),
    ]

    operations = [
        migrations.RunPython(update_subtype_and_seed_doc, reverse_func),
    ]
