"""JWT enrichi avec les informations de profil SPECTRE."""

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from app.domain.user.models.user_bean import permission_group_for_roles, sort_roles


class SpectreTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Ajoute roles, permission_group et force_password_change au login.

    `roles` est la liste complete des roles metier (un membre peut en cumuler
    plusieurs) ; `permission_group` est le groupe effectif deduit du role le
    plus privilegie.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        if hasattr(user, "profile"):
            roles = sort_roles(user.profile.roles)
            token["roles"] = roles
            token["permission_group"] = permission_group_for_roles(roles)
            token["force_password_change"] = user.profile.force_password_change
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if hasattr(self.user, "profile"):
            roles = sort_roles(self.user.profile.roles)
            data["roles"] = roles
            data["permission_group"] = permission_group_for_roles(roles)
            data["force_password_change"] = self.user.profile.force_password_change
        data["first_name"] = self.user.first_name or None
        return data


class SpectreTokenObtainPairView(TokenObtainPairView):
    serializer_class = SpectreTokenObtainPairSerializer
