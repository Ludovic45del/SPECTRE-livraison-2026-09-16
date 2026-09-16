"""Entité principale FSEC - Édifices Cibles."""

import uuid

from django.db import models

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_category_entity import FsecCategoryEntity
from app.repository.fsec.models.fsec_rack_entity import FsecRackEntity
from app.repository.fsec.models.fsec_status_entity import FsecStatusEntity


class FsecEntity(models.Model):
    """Entité représentant un FSEC (Édifice Cible) avec versioning."""

    class Meta:
        app_label = "app"
        db_table = "FSEC"
        unique_together = [("campaign_id", "name")]
        indexes = [
            models.Index(fields=["fsec_uuid"], name="fsec_fsec_uuid_idx"),
            models.Index(fields=["is_active"], name="fsec_is_active_idx"),
            models.Index(fields=["campaign_id"], name="fsec_campaign_id_idx"),
        ]

    # Clé primaire - ID unique de la version
    version_uuid = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    # ID FSEC partagé entre toutes les versions
    fsec_uuid = models.UUIDField(default=uuid.uuid4, editable=False)

    # Foreign Keys
    campaign_id = models.ForeignKey(
        CampaignEntity,
        on_delete=models.PROTECT,
        db_column="campaign_id",
        related_name="fsecs",
        null=True,
        blank=True,
    )
    status_id = models.ForeignKey(
        FsecStatusEntity,
        on_delete=models.PROTECT,
        db_column="status_id",
        related_name="fsecs",
    )
    category_id = models.ForeignKey(
        FsecCategoryEntity,
        on_delete=models.PROTECT,
        db_column="category_id",
        related_name="fsecs",
    )
    rack_id = models.ForeignKey(
        FsecRackEntity,
        on_delete=models.PROTECT,
        db_column="rack_id",
        related_name="fsecs",
        null=True,
        blank=True,
    )

    # Champs de base
    name = models.CharField(max_length=50)
    comments = models.TextField(max_length=4000, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Champs workflow (Usable Step, Installed Step, Shot Step)
    delivery_date = models.DateField(null=True, blank=True)
    shooting_date = models.DateField(null=True, blank=True)
    preshooting_pressure = models.FloatField(null=True, blank=True)
    experience_srxx = models.CharField(max_length=50, null=True, blank=True)
    localisation = models.CharField(max_length=20, null=True, blank=True)
    depressurization_failed = models.BooleanField(null=True, blank=True)

    # Photo de la vue d'ensemble.
    # Upload sous MEDIA_ROOT/fsec/overview/<version_uuid>/<filename>.
    # La compression est faite côté client (Canvas) AVANT l'upload — le serveur
    # ne re-compresse pas, il stocke tel quel pour préserver les EXIF si présents.
    overview_image = models.ImageField(
        upload_to="fsec/overview/",
        null=True,
        blank=True,
        max_length=500,
    )

    # Vues / photos demandées (rubrique Vue/Photo, retour R08).
    # Texte libre porté par la FSEC — indépendant de la session photo — pour
    # noter les prises de vue à réaliser AVANT qu'une session existe. Modifié
    # uniquement via l'action dédiée PATCH /fsecs/:uuid/requested-views/ (le PUT
    # global le préserve, cf. fsec_service.update_fsec).
    requested_views = models.TextField(max_length=4000, null=True, blank=True)

    # ------------------------------------------------------------------
    # Plan d'assemblage annotable (rubrique Assemblage)
    # ------------------------------------------------------------------
    # Image du plan (PNG/JPEG/WebP), compressée côté client comme overview_image.
    # Upload sous MEDIA_ROOT/fsec/assembly-plan/<version_uuid>/<filename>.
    assembly_plan_image = models.ImageField(
        upload_to="fsec/assembly-plan/",
        null=True,
        blank=True,
        max_length=500,
    )
    # Calque d'annotations (flèches, textes, cadres) dessiné par-dessus le plan.
    # Format maison : liste d'objets {id, type, coords normalisées 0–100, color…}
    # rendu côté front en SVG. Stocké tel quel — le front possède le contrat de
    # rendu. Calque partagé (pas d'attribution par auteur, cf. choix produit).
    assembly_plan_annotations = models.JSONField(default=list, blank=True)

    # Liens vers les fichiers métiers (réseau fermé) : URL HTTP interne ou
    # chemin UNC type \\serveur\share\..., d'où CharField plutôt que URLField
    # (ce dernier rejette les UNC). Validation laissée à l'utilisateur.
    alignment_file_link = models.CharField(max_length=500, null=True, blank=True)
    fdie_link = models.CharField(max_length=500, null=True, blank=True)

    # ------------------------------------------------------------------
    # Fiche de livraison (workflow 2 phases)
    # ------------------------------------------------------------------
    # Phase 1 (équipe livraison) : `delivery_date` ci-dessus + `interface_io`
    # qui vit dans SealingStep + nom de l'accepteur (FK user dropdown).
    # Phase 2 (TCI) : OK/KO + remarques + signataire/horodatage + nom et
    # date du réceptionnaire (saisis manuellement dans la fiche papier).
    delivery_validation = models.CharField(max_length=10, null=True, blank=True)
    delivery_remarques = models.TextField(max_length=500, null=True, blank=True)
    delivery_validated_by = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        db_column="delivery_validated_by_id",
        related_name="validated_fsec_deliveries",
        null=True,
        blank=True,
    )
    delivery_validated_at = models.DateTimeField(null=True, blank=True)

    # Phase 1 : nom de l'accepteur sélectionné dans un menu déroulant.
    delivery_acceptor_user = models.ForeignKey(
        "auth.User",
        on_delete=models.SET_NULL,
        db_column="delivery_acceptor_user_id",
        related_name="accepted_fsec_deliveries",
        null=True,
        blank=True,
    )

    # Phase 2 : nom du réceptionnaire saisi texte libre + date de réception.
    # Texte libre car la personne peut ne pas avoir de compte dans SPECTRE.
    delivery_receiver_name = models.CharField(max_length=100, null=True, blank=True)
    delivery_receiver_date = models.DateField(null=True, blank=True)

    # Signatures figées (valeur probante) apposées dans la fiche de livraison.
    # On stocke une COPIE du fichier de la signature de profil au moment où la
    # personne signe — et non une FK vers le profil — pour que la fiche reste
    # intègre même si l'utilisateur modifie ou supprime sa signature ensuite
    # (même discipline d'instantané que delivery_validated_by_username).
    #   - acceptor  : signature de l'accepteur (phase 1), colonne RECEPTION (1).
    #   - validator : signature du validateur TCI (phase 2), colonne RECEPTION (2).
    delivery_acceptor_signature = models.ImageField(
        upload_to="fsec/signatures/",
        max_length=500,
        null=True,
        blank=True,
    )
    delivery_validator_signature = models.ImageField(
        upload_to="fsec/signatures/",
        max_length=500,
        null=True,
        blank=True,
    )
