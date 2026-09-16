# Generated manually
from django.db import migrations


def seed_file_types(apps, schema_editor):
    CampaignFileTypesEntity = apps.get_model("app", "CampaignFileTypesEntity")
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )

    # Data from frontend constant CAMPAIGN_FILE_TYPES
    # 0: { id: 0, label: 'Validé', subtypeId: 7 },
    # 1: { id: 1, label: 'Brouillon', subtypeId: 7 },
    # 2: { id: 2, label: 'Archives', subtypeId: 7 },

    file_types_data = [
        {"id": 0, "label": "Validé", "subtype_id": 7},
        {"id": 1, "label": "Brouillon", "subtype_id": 7},
        {"id": 2, "label": "Archives", "subtype_id": 7},
    ]

    for data in file_types_data:
        # Ensure subtype exists (it should, from previous seed)
        try:
            subtype = CampaignDocumentSubtypesEntity.objects.get(id=data["subtype_id"])
            CampaignFileTypesEntity.objects.update_or_create(
                id=data["id"], defaults={"label": data["label"], "subtype_id": subtype}
            )
        except CampaignDocumentSubtypesEntity.DoesNotExist:
            print(
                f"Skipping FileType {data['label']} because Subtype {data['subtype_id']} does not exist."
            )


def reverse_seed(apps, schema_editor):
    CampaignFileTypesEntity = apps.get_model("app", "CampaignFileTypesEntity")
    CampaignFileTypesEntity.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_campaignfiletypesentity_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_file_types, reverse_seed),
    ]
