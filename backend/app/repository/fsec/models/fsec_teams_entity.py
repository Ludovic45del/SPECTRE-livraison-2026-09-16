"""Entité FSEC_TEAMS - Équipes FSEC.

Le membre est représenté soit par une FK `user` vers UserProfile (cas standard),
soit par un `name` texte libre (cas MOE et TCI = intervenants extérieurs au labo).
La cohérence est assurée par un CheckConstraint au niveau base + une
validation métier dans le service.
"""

import uuid

from django.db import models

from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.fsec.models.fsec_roles_entity import FsecRolesEntity


class FsecTeamsEntity(models.Model):
    """Entité représentant les équipes FSEC."""

    class Meta:
        app_label = "app"
        db_table = "FSEC_TEAMS"
        # NOTE: la contrainte XOR (MOE/TCI -> name | autres -> user) sera ajoutee
        # en release de cleanup, une fois que toutes les lignes existantes
        # auront ete migrees. Aujourd'hui l'invariant est garanti par
        # FsecTeamsService.

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fsec_id = models.ForeignKey(
        FsecEntity,
        on_delete=models.PROTECT,
        db_column="fsec_id",
        related_name="teams",
        to_field="version_uuid",
    )
    role_id = models.ForeignKey(
        FsecRolesEntity,
        on_delete=models.PROTECT,
        db_column="role_id",
        related_name="team_members",
    )
    # Nom texte libre — utilisé uniquement pour les rôles externes (MOE, TCI).
    name = models.CharField(max_length=50, null=True, blank=True)
    # FK vers UserProfile — utilisée pour tous les rôles internes (RCE, IEC, etc.).
    user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
