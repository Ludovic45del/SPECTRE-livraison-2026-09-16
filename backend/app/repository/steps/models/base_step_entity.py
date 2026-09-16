"""Entité abstraite BaseStep - Champs communs pour toutes les étapes."""

import uuid

from django.db import models


class BaseStepEntity(models.Model):
    """Modèle abstrait avec les champs communs à toutes les étapes.

    Champs hérités par chaque sous-classe :
    - fsec_version_id: clé étrangère vers FsecEntity (définie dans la sous-classe).
    - operator: nom legacy texte libre (conservé en transition).
    - operator_user: FK vers UserProfileEntity (nouvelle source de vérité).
    - created_at / modified_at: timestamps.

    `related_name="+"` sur la FK : chaque sous-classe est un Model concret ;
    sans cela, Django créerait un reverse accessor en collision.
    """

    class Meta:
        abstract = True

    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Champ texte legacy. Conservé jusqu'à suppression dans une release ulterieure.
    operator = models.CharField(max_length=200, null=True, blank=True)
    # Source de vérité actuelle : FK vers le profil utilisateur.
    operator_user = models.ForeignKey(
        "app.UserProfileEntity",
        on_delete=models.PROTECT,
        db_column="operator_user_uuid",
        to_field="uuid",
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
