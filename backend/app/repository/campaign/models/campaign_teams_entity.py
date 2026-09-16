"""Entité CAMPAIGN_TEAMS - Équipes de campagne.

Le membre est représenté soit par une FK `user` vers UserProfile (cas standard),
soit par un `name` texte libre (cas MOE = intervenant extérieur au labo).
La cohérence est assurée par un CheckConstraint au niveau base + une
validation métier dans le service.
"""

import uuid

from django.db import models

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.campaign.models.campaign_roles_entity import CampaignRolesEntity


class CampaignTeamsEntity(models.Model):
    """Entité représentant les équipes de campagne."""

    class Meta:
        app_label = "app"
        db_table = "CAMPAIGN_TEAMS"
        # NOTE: la contrainte XOR (MOE -> name | autres -> user) sera ajoutee
        # en release de cleanup, une fois que toutes les lignes existantes
        # auront ete migrees (FK user_id renseignee + name vide pour les non-MOE).
        # Aujourd'hui l'invariant est garanti par CampaignTeamsService.

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign_uuid = models.ForeignKey(
        CampaignEntity,
        on_delete=models.PROTECT,
        db_column="campaign_uuid",
        related_name="teams",
    )
    role_id = models.ForeignKey(
        CampaignRolesEntity,
        on_delete=models.PROTECT,
        db_column="role_id",
        related_name="team_members",
    )
    # Nom texte libre — utilisé uniquement pour le rôle MOE (extérieur au labo).
    name = models.CharField(max_length=50, null=True, blank=True)
    # FK vers UserProfile — utilisée pour tous les autres rôles (RCE, IEC).
    user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
