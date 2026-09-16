"""Bean Fsec - FSEC (Édifice Cible) principal avec versioning."""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Dict, List, Optional


@dataclass
class FsecBean:
    """Bean représentant un FSEC avec versioning."""

    # Versioning
    version_uuid: str = ""
    fsec_uuid: str = ""

    # Foreign Keys
    campaign_id: Optional[str] = None
    status_id: Optional[int] = None
    category_id: Optional[int] = None
    rack_id: Optional[int] = None

    # Champs de base
    name: str = ""
    # Slugs d'URL calculés (non persistés), renseignés par le mapper entity→bean :
    # `slug` du FSEC (préfixé par le contexte campagne) et `campaign_slug` de la
    # campagne parente (pour la navigation croisée vers la campagne).
    slug: Optional[str] = None
    campaign_slug: Optional[str] = None
    # Nom complet d'affichage (non persisté) : ``{année}-{installation}_{campagne}_{nom}``
    # (ex. ``2026-LMJ_gorfou_2``), renseigné par le mapper entity→bean. Une FSEC
    # orpheline retombe sur son nom court.
    display_name: Optional[str] = None
    comments: Optional[str] = None
    last_updated: Optional[datetime] = None
    is_active: bool = True
    created_at: Optional[datetime] = None

    # Champs workflow
    delivery_date: Optional[date] = None
    shooting_date: Optional[date] = None
    preshooting_pressure: Optional[float] = None
    experience_srxx: Optional[str] = None
    localisation: Optional[str] = None
    depressurization_failed: Optional[bool] = None

    # URL relative (servie via MEDIA_URL) ou None si pas de photo.
    overview_image: Optional[str] = None

    # Vues / photos demandées (onglet Vue/Photo, R08) : texte libre indépendant
    # de la session photo. Écrit uniquement via l'action PATCH dédiée.
    requested_views: Optional[str] = None

    # Plan d'assemblage annotable (rubrique Assemblage).
    # `assembly_plan_image` : URL relative MEDIA ou None si pas de plan.
    # `assembly_plan_annotations` : calque d'annotations (format maison rendu en
    # SVG côté front) ; [] si aucune annotation.
    assembly_plan_image: Optional[str] = None
    assembly_plan_annotations: List[Dict[str, Any]] = field(default_factory=list)

    # Liens vers fichiers métiers (URL HTTP interne ou chemin UNC).
    alignment_file_link: Optional[str] = None
    fdie_link: Optional[str] = None

    # Fiche de livraison phase 2 (TCI signe avec OK/KO + remarques).
    delivery_validation: Optional[str] = None
    delivery_remarques: Optional[str] = None
    delivery_validated_by_id: Optional[int] = None
    delivery_validated_by_username: Optional[str] = None
    delivery_validated_at: Optional[datetime] = None

    # Fiche de livraison phase 1 : nom de l'accepteur sélectionné via dropdown.
    # `user_id` est l'id auth.User (FK locale) ; `user_uuid` est l'uuid
    # UserProfile correspondant (exposé/consommé par le frontend qui parle
    # uuid UserProfile via UserSelect).
    delivery_acceptor_user_id: Optional[int] = None
    delivery_acceptor_user_uuid: Optional[str] = None
    delivery_acceptor_username: Optional[str] = None

    # Fiche de livraison phase 2 : nom et date du réceptionnaire (saisis libre
    # car la personne peut ne pas avoir de compte SPECTRE).
    delivery_receiver_name: Optional[str] = None
    delivery_receiver_date: Optional[date] = None

    # Signatures figées de la fiche (URL relative MEDIA, ou None) : copie du
    # fichier de profil au moment de signer (cf. FsecEntity). acceptor = phase 1
    # (colonne RECEPTION 1), validator = phase 2 (colonne RECEPTION 2).
    delivery_acceptor_signature: Optional[str] = None
    delivery_validator_signature: Optional[str] = None
