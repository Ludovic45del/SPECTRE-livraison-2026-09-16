"""Mapper StockCatalogItem — Conversion Entity ↔ Bean ↔ API."""

from typing import Any, Dict

from app.domain.stock.models.stock_catalog_bean import StockCatalogItemBean
from app.mapper.type_conversion import format_date_for_api, parse_date_string
from app.repository.stock.models.stock_catalog_entity import StockCatalogItemEntity


def stock_catalog_mapper_entity_to_bean(
    entity: StockCatalogItemEntity,
) -> StockCatalogItemBean:
    """Convertit une StockCatalogItemEntity en StockCatalogItemBean."""
    return StockCatalogItemBean(
        uuid=str(entity.uuid),
        kind=entity.kind,
        category=entity.category,
        structuration_type=entity.structuration_type,
        name=entity.name,
        reference=entity.reference,
        caracteristique=entity.caracteristique,
        type_de_colle=entity.type_de_colle,
        fournisseur=entity.fournisseur,
        remarques=entity.remarques,
        unite=entity.unite,
        quantite=entity.quantite,
        seuil_alerte=entity.seuil_alerte,
        date_peremption=entity.date_peremption,
        type_d_achat=entity.type_d_achat,
        fsec_name=entity.fsec_name,
        installation=entity.installation,
        status=entity.status,
        materiaux_mat=entity.materiaux_mat,
        matiere=entity.matiere,
        masse_mg=entity.masse_mg,
        boite=entity.boite,
        emplacement=entity.emplacement,
        is_active=entity.is_active,
        created_at=entity.created_at,
        updated_at=entity.updated_at,
    )


def stock_catalog_mapper_bean_to_entity(
    bean: StockCatalogItemBean,
) -> StockCatalogItemEntity:
    """Convertit un StockCatalogItemBean en StockCatalogItemEntity (sans persistance)."""
    entity = StockCatalogItemEntity()
    if bean.uuid:
        entity.uuid = bean.uuid
    entity.kind = bean.kind
    entity.category = bean.category
    entity.structuration_type = bean.structuration_type
    entity.name = bean.name
    entity.reference = bean.reference
    entity.caracteristique = bean.caracteristique
    entity.type_de_colle = bean.type_de_colle
    entity.fournisseur = bean.fournisseur
    entity.remarques = bean.remarques
    entity.unite = bean.unite
    entity.quantite = bean.quantite
    entity.seuil_alerte = bean.seuil_alerte
    entity.date_peremption = bean.date_peremption
    entity.type_d_achat = bean.type_d_achat
    entity.fsec_name = bean.fsec_name
    entity.installation = bean.installation
    entity.status = bean.status
    entity.materiaux_mat = bean.materiaux_mat
    entity.matiere = bean.matiere
    entity.masse_mg = bean.masse_mg
    # NB : les champs calculés assigned_* ne sont jamais écrits en base.
    entity.boite = bean.boite
    entity.emplacement = bean.emplacement
    entity.is_active = bean.is_active
    return entity


def stock_catalog_mapper_api_to_bean(data: Dict[str, Any]) -> StockCatalogItemBean:
    """Convertit un payload API (déjà validé par serializer) en StockCatalogItemBean."""
    return StockCatalogItemBean(
        uuid=data.get("uuid", ""),
        kind=data.get("kind", ""),
        category=data.get("category", ""),
        structuration_type=data.get("structuration_type"),
        name=data.get("name", ""),
        reference=data.get("reference"),
        caracteristique=data.get("caracteristique"),
        type_de_colle=data.get("type_de_colle"),
        fournisseur=data.get("fournisseur"),
        remarques=data.get("remarques"),
        unite=data.get("unite"),
        quantite=data.get("quantite"),
        seuil_alerte=data.get("seuil_alerte"),
        date_peremption=parse_date_string(data.get("date_peremption")),
        type_d_achat=data.get("type_d_achat"),
        fsec_name=data.get("fsec_name"),
        installation=data.get("installation"),
        status=data.get("status"),
        materiaux_mat=data.get("materiaux_mat"),
        matiere=data.get("matiere"),
        masse_mg=data.get("masse_mg"),
        # NB : les champs calculés assigned_* ne sont volontairement PAS lus
        # depuis l'API (lecture seule — cf. R01).
        boite=data.get("boite"),
        emplacement=data.get("emplacement"),
        is_active=data.get("is_active", True),
    )


def stock_catalog_mapper_bean_to_api(bean: StockCatalogItemBean) -> Dict[str, Any]:
    """Convertit un StockCatalogItemBean en payload API JSON-sérialisable."""
    return {
        "uuid": bean.uuid,
        "kind": bean.kind,
        "category": bean.category,
        "structuration_type": bean.structuration_type,
        "name": bean.name,
        "reference": bean.reference,
        "caracteristique": bean.caracteristique,
        "type_de_colle": bean.type_de_colle,
        "fournisseur": bean.fournisseur,
        "remarques": bean.remarques,
        "unite": bean.unite,
        "quantite": bean.quantite,
        "seuil_alerte": bean.seuil_alerte,
        "date_peremption": format_date_for_api(bean.date_peremption),
        "type_d_achat": bean.type_d_achat,
        "fsec_name": bean.fsec_name,
        "installation": bean.installation,
        "status": bean.status,
        "materiaux_mat": bean.materiaux_mat,
        "matiere": bean.matiere,
        "masse_mg": bean.masse_mg,
        # Champs calculés lecture seule : FSEC réellement réservée + campagne (R01)
        "assigned_fsec_name": bean.assigned_fsec_name,
        "assigned_campaign_name": bean.assigned_campaign_name,
        "assigned_fsec_slug": bean.assigned_fsec_slug,
        "boite": bean.boite,
        "emplacement": bean.emplacement,
        "is_active": bean.is_active,
        "created_at": bean.created_at.isoformat() if bean.created_at else None,
        "updated_at": bean.updated_at.isoformat() if bean.updated_at else None,
    }
