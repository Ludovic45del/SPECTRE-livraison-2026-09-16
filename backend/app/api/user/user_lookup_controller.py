"""Endpoint lecture seule des utilisateurs pour les dropdowns + popovers metier.

Expose les champs publics d'annuaire interne (uuid, username, first_name,
last_name, roles, is_active, laboratoire, service, numero, bureau, avatar_url)
pour alimenter :
- les dropdowns UserSelect (selection d'un operateur),
- les popovers UserChip (carte d'identite affichee au clic sur un nom).

Accessible a tout utilisateur authentifie : les operateurs doivent pouvoir
designer un metrologue/IEC ET consulter les coordonnees d'un collegue.

Champs intentionnellement omis : password, dashboard_preferences, dates de
creation/modification, force_password_change.

Filtres :
- ?role=metrologue&role=chef_labo (multi) — matche les membres portant AU
  MOINS un des roles demandes
- ?is_active=true|false (defaut true)
"""

from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from app.domain.user.models.user_bean import ALL_SPECTRE_ROLES, UserBean
from app.domain.user.services import user_service
from app.repository.user.repositories.user_repository import UserRepository

LOOKUP_LIMIT = 500


def _user_bean_to_lookup(bean: UserBean) -> dict:
    """Projection annuaire d'un UserBean pour dropdown + popover infos."""
    return {
        "uuid": str(bean.uuid),
        "username": bean.username,
        "first_name": bean.first_name or "",
        "last_name": bean.last_name or "",
        # `roles` fait foi (un membre peut cumuler plusieurs roles) ; `role`
        # reste expose pour l'affichage compact (role principal derive).
        "roles": bean.roles or [],
        "role": bean.role,
        "is_active": bean.is_active,
        "laboratoire": bean.laboratoire or "",
        "service": bean.service or "",
        "numero": bean.numero or "",
        "bureau": bean.bureau or "",
        "avatar_url": bean.avatar_url,
    }


def _parse_is_active(raw: str | None) -> bool:
    """Parse ?is_active=... en bool. Defaut True (cas standard du dropdown)."""
    if raw is None:
        return True
    return raw.strip().lower() in ("true", "1", "yes")


class UserLookupController(viewsets.ViewSet):
    """GET /api/v1/users/lookup/ — liste minimale pour les dropdowns."""

    permission_classes = [IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.repository = UserRepository()

    def list(self, request):
        roles = [
            r for r in request.query_params.getlist("role") if r in ALL_SPECTRE_ROLES
        ]
        is_active = _parse_is_active(request.query_params.get("is_active"))

        beans = user_service.list_users(
            self.repository,
            offset=0,
            limit=LOOKUP_LIMIT,
            roles=roles or None,
            is_active=is_active,
        )
        return JsonResponse([_user_bean_to_lookup(b) for b in beans], safe=False)
