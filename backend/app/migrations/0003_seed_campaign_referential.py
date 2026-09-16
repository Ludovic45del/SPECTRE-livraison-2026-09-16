from django.db import migrations


def seed_campaign_referential(apps, schema_editor):
    CampaignTypesEntity = apps.get_model("app", "CampaignTypesEntity")
    CampaignStatusEntity = apps.get_model("app", "CampaignStatusEntity")
    CampaignInstallationsEntity = apps.get_model("app", "CampaignInstallationsEntity")
    CampaignDocumentTypesEntity = apps.get_model("app", "CampaignDocumentTypesEntity")
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )

    # Types
    types = [
        {"id": 0, "label": "Campagne DAM", "color": "#b6c9fd"},
        {"id": 1, "label": "Campagne d'installation", "color": "#fdb9e3"},
        {"id": 2, "label": "Campagne d'ouverture", "color": "#fcc6b6"},
    ]
    for t in types:
        CampaignTypesEntity.objects.get_or_create(
            id=t["id"], defaults={"label": t["label"], "color": t["color"]}
        )

    # Statuses
    statuses = [
        {"id": 0, "label": "Brouillon", "color": "#c3c3c3"},
        {"id": 1, "label": "Définition terminée", "color": "#ecce18"},
        {"id": 2, "label": "En réalisation", "color": "#7a8ce0"},
        {"id": 3, "label": "Terminée", "color": "#a2d82b"},
    ]
    for s in statuses:
        CampaignStatusEntity.objects.get_or_create(
            id=s["id"], defaults={"label": s["label"], "color": s["color"]}
        )

    # Installations
    installations = [
        {"id": 0, "label": "LMJ"},
        {"id": 1, "label": "OMEGA"},
    ]
    for i in installations:
        CampaignInstallationsEntity.objects.get_or_create(
            id=i["id"], defaults={"label": i["label"]}
        )

    # Document Types
    doc_types = [
        {"id": 0, "label": "Documentaire"},
        {"id": 1, "label": "CAO"},
        {"id": 2, "label": "Assemblage"},
        {"id": 3, "label": "Métrologie"},
        {"id": 4, "label": "Transport"},
        {"id": 5, "label": "Fichiers PALS"},
    ]
    for dt in doc_types:
        CampaignDocumentTypesEntity.objects.get_or_create(
            id=dt["id"], defaults={"label": dt["label"]}
        )

    # Document Subtypes
    subtypes = [
        {"id": 0, "label": "Document LIE", "type_id": 0},
        {"id": 1, "label": "Document DTRI", "type_id": 0},
        {"id": 2, "label": "Document DCRE", "type_id": 0},
        {"id": 3, "label": "Mail", "type_id": 0},
        {"id": 4, "label": "Autre document", "type_id": 0},
        {"id": 5, "label": "CAO", "type_id": 1},
        {"id": 6, "label": "Plan et STEP DTRI", "type_id": 1},
        {"id": 7, "label": "Plan PDF", "type_id": 1},
        {"id": 8, "label": "Plan 3D", "type_id": 1},
        {"id": 9, "label": "Visrad", "type_id": 1},
        {"id": 10, "label": "Echanges BE", "type_id": 1},
        {"id": 11, "label": "Ametra", "type_id": 1},
        {"id": 12, "label": "Autre Document", "type_id": 1},
        {"id": 13, "label": "Recette pré-assemblage", "type_id": 2},
        {"id": 14, "label": "Assemblage campagne", "type_id": 2},
        {"id": 15, "label": "Gamme d'assemblage", "type_id": 2},
        {"id": 16, "label": "Autre document", "type_id": 2},
        {"id": 17, "label": "CAO", "type_id": 3},
        {"id": 18, "label": "Autre document", "type_id": 3},
        {"id": 19, "label": "Réception", "type_id": 4},
        {"id": 20, "label": "Autre document", "type_id": 4},
        {"id": 21, "label": "Autre document", "type_id": 5},
        {"id": 22, "label": "Assemblage", "type_id": 5},
    ]
    for st in subtypes:
        CampaignDocumentSubtypesEntity.objects.get_or_create(
            id=st["id"],
            defaults={
                "label": st["label"],
                "type_id": CampaignDocumentTypesEntity.objects.get(id=st["type_id"]),
            },
        )


def reverse_seed_campaign_referential(apps, schema_editor):
    """Remove seeded campaign referential data, in FK-safe order."""
    CampaignTypesEntity = apps.get_model("app", "CampaignTypesEntity")
    CampaignStatusEntity = apps.get_model("app", "CampaignStatusEntity")
    CampaignInstallationsEntity = apps.get_model("app", "CampaignInstallationsEntity")
    CampaignDocumentTypesEntity = apps.get_model("app", "CampaignDocumentTypesEntity")
    CampaignDocumentSubtypesEntity = apps.get_model(
        "app", "CampaignDocumentSubtypesEntity"
    )

    # Subtypes référencent Types via type_id → supprimer les enfants avant les parents.
    CampaignDocumentSubtypesEntity.objects.filter(id__in=list(range(23))).delete()
    CampaignDocumentTypesEntity.objects.filter(id__in=list(range(6))).delete()
    CampaignInstallationsEntity.objects.filter(id__in=[0, 1]).delete()
    CampaignStatusEntity.objects.filter(id__in=[0, 1, 2, 3]).delete()
    CampaignTypesEntity.objects.filter(id__in=[0, 1, 2]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_seed_campaign_roles"),
    ]

    operations = [
        migrations.RunPython(
            seed_campaign_referential, reverse_seed_campaign_referential
        ),
    ]
