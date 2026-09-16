"""Entité Embase - Embase à gaz."""

import uuid

from django.db import models

from app.domain.embase.models.embase_constants import EMBASE_TYPE_CHOICES


class EmbaseEntity(models.Model):
    """Entité représentant une Embase à gaz."""

    class Meta:
        app_label = "app"
        db_table = "EMBASE"
        ordering = ["identifier"]

    # Clé primaire
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    NOMBRE_VOIES_CHOICES = [
        (1, "1 voie"),
        (2, "2 voies"),
    ]

    # Identifiant & Type
    identifier = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=20, choices=EMBASE_TYPE_CHOICES)
    nombre_voies = models.IntegerField(choices=NOMBRE_VOIES_CHOICES, default=1)

    # --- VOIE V1 ---
    soufflet_v1 = models.CharField(max_length=100, blank=True, default="")
    capteur_v1 = models.CharField(max_length=50, blank=True, default="")
    offset_v1_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    mesurande_lie_v1_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    sensibilite_v1_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    signal_meteociel_v1_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    capteur_cible_pfeiffer_mbar = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    etendue_v1_mbar = models.IntegerField(null=True, blank=True)
    test_etancheite_he = models.CharField(max_length=200, blank=True, default="")
    test_capteur_mrg = models.CharField(max_length=200, blank=True, default="")
    etalonnage_date = models.DateField(null=True, blank=True)
    observations_v1 = models.TextField(blank=True, default="")

    # --- MECA ---
    operationnelle_aimant = models.BooleanField(default=False)
    operationnelle_broche = models.BooleanField(default=False)
    localisation_actuelle = models.CharField(max_length=50, blank=True, default="")
    cote_ve = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    decalage_angulaire = models.CharField(max_length=50, blank=True, default="")
    chargement_mcc = models.CharField(max_length=10, blank=True, default="")

    # --- VOIE V2 ---
    soufflet_v2 = models.CharField(max_length=100, blank=True, default="")
    capteur_v2 = models.CharField(max_length=50, blank=True, default="")
    offset_v2_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    mesurande_lie_v2_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    sensibilite_v2_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    signal_meteociel_v2_mv = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    capteur_cible_pfeiffer_v2_mbar = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    etendue_v2_mbar = models.IntegerField(null=True, blank=True)
    test_etancheite_he_v2 = models.CharField(max_length=200, blank=True, default="")
    test_capteur_mrg_v2 = models.CharField(max_length=200, blank=True, default="")
    observations_v2 = models.TextField(blank=True, default="")
    electrovanne = models.BooleanField(default=False)

    # --- Historique FSECs gaz (temporaire, sera remplacé par relation) ---
    fsec_history = models.TextField(blank=True, default="")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
