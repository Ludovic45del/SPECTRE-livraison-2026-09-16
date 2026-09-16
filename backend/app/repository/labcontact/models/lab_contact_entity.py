"""Entité LAB_CONTACT — annuaire des laboratoires (numéros utiles partagés)."""

import uuid

from django.db import models


class LabContactEntity(models.Model):
    """Un contact de l'annuaire des laboratoires (ex. « Labo 426 », « Gardiennage »).

    Liste éditable par toute l'équipe : ce ne sont PAS des utilisateurs SPECTRE
    (cf. UserProfileEntity) mais des numéros utiles à afficher dans la section
    « Équipe et Carte ». Volumétrie attendue : quelques dizaines d'entrées.
    """

    class Meta:
        app_label = "app"
        db_table = "LAB_CONTACT"
        ordering = ["name"]

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Nom du laboratoire / du service / de la personne à joindre.
    name = models.CharField(max_length=150)
    # Numéro saisi librement (poste interne « 426 », « 01 23 45 67 89 »…) : texte, pas de format imposé.
    phone = models.CharField(max_length=30, blank=True, default="")
    comment = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
