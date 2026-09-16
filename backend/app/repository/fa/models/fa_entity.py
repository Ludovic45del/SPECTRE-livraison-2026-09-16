"""Entité principale FA - Fiche d'Anomalie."""

import uuid

from django.db import models

from app.repository.fa.models.fa_criticality_entity import FaCriticalityEntity
from app.repository.fa.models.fa_status_entity import FaStatusEntity
from app.repository.fa.models.fa_type_entity import FaTypeEntity
from app.repository.fsec.models.fsec_entity import FsecEntity

# Import direct (et non chaîne lazy "app.UserProfileEntity") : garantit
# l'enregistrement du modèle cible quel que soit l'ordre de chargement, sinon
# instancier FaEntity() lève un TypeError tant que le module user n'est pas importé.
from app.repository.user.models.user_profile_entity import UserProfileEntity


class FaEntity(models.Model):
    """Entité représentant une Fiche d'Anomalie (FA)."""

    class Meta:
        app_label = "app"
        db_table = "FA"
        indexes = [
            models.Index(fields=["fsec_version_id"], name="fa_fsec_idx"),
            models.Index(fields=["status_id"], name="fa_status_idx"),
            # Couvre la requête principale list() : order_by("-created_at").
            models.Index(fields=["-created_at"], name="fa_created_idx"),
        ]

    # Clé primaire
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Foreign Keys
    # Une FSEC peut avoir plusieurs FA (l'unicité de l'identifier est assurée
    # par le suffixe séquentiel ajouté par generate_fa_identifier).
    fsec_version_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_version_id",
        related_name="fas",
        to_field="version_uuid",
    )
    status_id = models.ForeignKey(
        FaStatusEntity,
        on_delete=models.PROTECT,
        db_column="status_id",
        related_name="fas",
    )
    type_id = models.ForeignKey(
        FaTypeEntity,
        on_delete=models.PROTECT,
        db_column="type_id",
        related_name="fas",
        null=True,
        blank=True,
    )
    criticality_id = models.ForeignKey(
        FaCriticalityEntity,
        on_delete=models.PROTECT,
        db_column="criticality_id",
        related_name="fas",
        null=True,
        blank=True,
    )

    # Identifiant généré automatiquement
    identifier = models.CharField(max_length=100, unique=True)

    # Phase Ouvert
    fsec_step_id = models.IntegerField(
        null=True, blank=True
    )  # Étape FSEC où l'anomalie a été découverte
    fsec_step_other = models.CharField(
        max_length=255, null=True, blank=True
    )  # Précision si "Autre"
    # Decouvreur — texte legacy + FK source de verite
    discoverer = models.CharField(max_length=100)
    discoverer_user = models.ForeignKey(
        UserProfileEntity,
        on_delete=models.PROTECT,
        db_column="discoverer_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    event_date = models.DateField()
    observation = models.TextField()
    location_equipment = models.CharField(max_length=255, null=True, blank=True)
    quick_analysis = models.TextField()
    immediate_measures = models.TextField(null=True, blank=True)
    iec_validation_open = models.BooleanField(default=False)
    iec_validation_open_date = models.DateField(null=True, blank=True)
    iec_validation_open_name = models.CharField(max_length=100, null=True, blank=True)
    iec_validation_open_user = models.ForeignKey(
        UserProfileEntity,
        on_delete=models.PROTECT,
        db_column="iec_validation_open_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    # Phase En cours.
    # Note : on ne stocke plus de "date de passage en cours" — seules les dates
    # d'ouverture et de clôture sont remontées (cf. KPI DCP indicators_repository).
    cause = models.TextField(null=True, blank=True)
    experience_impact = models.TextField(null=True, blank=True)
    iec_validation_progress = models.BooleanField(default=False)
    iec_validation_progress_name = models.CharField(
        max_length=100, null=True, blank=True
    )
    iec_validation_progress_user = models.ForeignKey(
        UserProfileEntity,
        on_delete=models.PROTECT,
        db_column="iec_validation_progress_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    # Phase Clos
    closure_validation = models.TextField(null=True, blank=True)
    closure_date = models.DateField(null=True, blank=True)
    closure_validator_name = models.CharField(max_length=100, null=True, blank=True)
    closure_validator_user = models.ForeignKey(
        UserProfileEntity,
        on_delete=models.PROTECT,
        db_column="closure_validator_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
