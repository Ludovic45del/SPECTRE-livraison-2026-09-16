"""
RBAC Permissions (S-1)

Three roles: admin, operateur, lecteur.
- Admin: full CRUD access
- Operateur: create, read, update (no delete campaigns/FSECs)
- Lecteur: read-only access

Usage in controllers:
    @permission_classes([IsAdmin])
    @permission_classes([IsReadOnlyOrOperateur])
    @permission_classes([IsAuthenticated])  # any authenticated user (default)

Groups should be created via initdb command or Django admin.
"""

from rest_framework.permissions import BasePermission

# Group name constants
ROLE_ADMIN = "admin"
ROLE_OPERATEUR = "operateur"
ROLE_LECTEUR = "lecteur"

ALL_ROLES = [ROLE_ADMIN, ROLE_OPERATEUR, ROLE_LECTEUR]


def _user_has_role(user, role_name: str) -> bool:
    """Check if user belongs to a Django group."""
    if not user or not user.is_authenticated:
        return False
    # Superusers always have all roles
    if user.is_superuser:
        return True
    return user.groups.filter(name=role_name).exists()


def _user_has_any_role(user, role_names: list[str]) -> bool:
    """Check if user belongs to any of the given groups."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.groups.filter(name__in=role_names).exists()


class IsAdmin(BasePermission):
    """Only admin users can access."""

    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return _user_has_role(request.user, ROLE_ADMIN)


class IsReadOnlyOrOperateur(BasePermission):
    """Read-only for lecteurs, full access for operateurs and admins.

    - GET, HEAD, OPTIONS: any authenticated user
    - POST, PUT, PATCH, DELETE: operateur or admin
    """

    message = "Accès en lecture seule. Modification réservée aux opérateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Read-only methods allowed for all authenticated users
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        # Write methods require operateur or admin role
        return _user_has_any_role(request.user, [ROLE_ADMIN, ROLE_OPERATEUR])


class IsReadOnlyOrAdmin(BasePermission):
    """Read-only for non-admins, full access for admins.

    Used for sensitive operations like deleting campaigns.
    - GET, HEAD, OPTIONS: any authenticated user
    - POST, PUT, PATCH, DELETE: admin only
    """

    message = "Modification réservée aux administrateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True

        return _user_has_role(request.user, ROLE_ADMIN)
