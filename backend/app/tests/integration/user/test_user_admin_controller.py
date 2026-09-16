"""Tests d'integration pour les controllers utilisateur (Admin, Me, ChangePassword).

Teste les endpoints API avec des requetes HTTP reelles contre la base de donnees.
"""

import json

import pytest
from django.contrib.auth.models import Group, User
from django.test import Client

from app.repository.user.models.user_profile_entity import UserProfileEntity

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def admin_user(db):
    """Cree un utilisateur admin avec profil."""
    group, _ = Group.objects.get_or_create(name="admin")
    Group.objects.get_or_create(name="operateur")
    Group.objects.get_or_create(name="lecteur")

    user = User.objects.create_user(
        username="admin_test",
        password="AdminPass123!",
        first_name="Admin",
        last_name="Test",
    )
    user.groups.add(group)
    UserProfileEntity.objects.create(
        user=user, roles=["chef_labo"], force_password_change=False
    )
    return user


@pytest.fixture
def admin_client(admin_user):
    """Client authentifie en tant qu'admin."""
    client = Client()
    client.force_login(admin_user)
    return client


@pytest.fixture
def operateur_user(db):
    """Cree un utilisateur operateur avec profil."""
    group, _ = Group.objects.get_or_create(name="operateur")
    user = User.objects.create_user(username="oper_test", password="OperPass123!")
    user.groups.add(group)
    UserProfileEntity.objects.create(
        user=user, roles=["iec"], force_password_change=False
    )
    return user


@pytest.fixture
def operateur_client(operateur_user):
    """Client authentifie en tant qu'operateur (non-admin)."""
    client = Client()
    client.force_login(operateur_user)
    return client


@pytest.fixture
def create_user_payload():
    """Payload de creation d'utilisateur."""
    return {
        "username": "nouveau_user",
        "first_name": "Nouveau",
        "last_name": "Utilisateur",
        "roles": ["iec"],
        "laboratoire": "Labo A",
        "service": "Service X",
        "numero": "042",
        "bureau": "B12",
    }


@pytest.fixture
def existing_user(db):
    """Cree un utilisateur existant pour les tests retrieve/update/toggle."""
    group, _ = Group.objects.get_or_create(name="operateur")
    user = User.objects.create_user(
        username="user_existant",
        password="ExistPass123!",
        first_name="Existant",
        last_name="User",
    )
    user.groups.add(group)
    profile = UserProfileEntity.objects.create(
        user=user,
        roles=["rce"],
        laboratoire="Labo B",
        service="Service Y",
        force_password_change=False,
    )
    return user, profile


# ============================================================================
# PERMISSION TESTS
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminPermissions:
    """Verifie que seuls les admins accedent aux endpoints."""

    def test_operateur_cannot_list_users(self, operateur_client):
        response = operateur_client.get("/api/v1/users/")
        assert response.status_code == 403

    def test_operateur_cannot_create_user(self, operateur_client, create_user_payload):
        response = operateur_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_unauthenticated_cannot_list_users(self, db):
        client = Client()
        response = client.get("/api/v1/users/")
        assert response.status_code in (401, 403)


# ============================================================================
# LIST ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminList:
    """Tests endpoint GET /api/v1/users/"""

    def test_list_users_success(self, admin_client, existing_user):
        response = admin_client.get("/api/v1/users/")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_list_users_returns_all_fields(self, admin_client, existing_user):
        response = admin_client.get("/api/v1/users/")
        data = response.json()
        user_data = next(u for u in data if u["username"] == "user_existant")

        assert "uuid" in user_data
        assert user_data["first_name"] == "Existant"
        assert user_data["last_name"] == "User"
        assert user_data["role"] == "rce"
        assert user_data["permission_group"] == "operateur"
        assert user_data["is_active"] is True
        assert "created_at" in user_data

    def test_list_users_pagination(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/users/?offset=0&limit=1")
        data = response.json()
        assert len(data) == 1

    def test_list_users_offset_beyond_total(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/users/?offset=9999&limit=10")
        data = response.json()
        assert data == []

    def test_list_users_invalid_offset(self, admin_client):
        response = admin_client.get("/api/v1/users/?offset=abc")
        assert response.status_code == 400

    def test_list_users_limit_capped_at_100(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/users/?limit=500")
        # Should not crash — limit is capped server-side
        assert response.status_code == 200


# ============================================================================
# CREATE ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminCreate:
    """Tests endpoint POST /api/v1/users/"""

    def test_create_user_success(self, admin_client, create_user_payload):
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "nouveau_user"
        assert data["role"] == "iec"
        assert data["permission_group"] == "operateur"
        # Mot de passe temporaire généré, renvoyé une seule fois (no-store),
        # à communiquer au nouvel utilisateur.
        assert "activation_url" not in data
        assert len(data["generated_password"]) >= 12
        assert response["Cache-Control"] == "no-store"

        # L'utilisateur peut se connecter avec ce mot de passe.
        user = User.objects.get(username="nouveau_user")
        assert user.check_password(data["generated_password"])

    def test_create_user_with_explicit_password(
        self, admin_client, create_user_payload
    ):
        create_user_payload["password"] = "MonMotDePasse123!"
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        # Le mot de passe effectif (celui fourni) est renvoyé pour affichage.
        assert data["generated_password"] == "MonMotDePasse123!"

    def test_create_user_with_blank_optional_fields(self, admin_client):
        # Champs optionnels vides ou absents : doivent être acceptés (allow_blank).
        payload = {
            "username": "user_minimal",
            "roles": ["iec"],
            "first_name": "",
            "last_name": "",
            "laboratoire": "",
            "service": "",
            "numero": "",
            "bureau": "",
        }
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "user_minimal"
        assert data["laboratoire"] == ""
        assert data["bureau"] == ""
        assert "generated_password" in data

    def test_create_user_duplicate_username(
        self, admin_client, create_user_payload, existing_user
    ):
        create_user_payload["username"] = "user_existant"
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        assert response.status_code == 409

    def test_create_user_username_too_short(self, admin_client, create_user_payload):
        create_user_payload["username"] = "ab"
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_user_invalid_role(self, admin_client, create_user_payload):
        create_user_payload["roles"] = ["role_inexistant"]
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_user_missing_username(self, admin_client):
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps({"roles": ["iec"]}),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_create_user_sets_force_password_change(
        self, admin_client, create_user_payload
    ):
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        data = response.json()
        assert data["force_password_change"] is True

    def test_create_user_assigns_django_group(self, admin_client, create_user_payload):
        admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        user = User.objects.get(username="nouveau_user")
        assert user.groups.filter(name="operateur").exists()

    def test_create_user_with_several_roles(self, admin_client, create_user_payload):
        """Roles cumules : tous persistes, tries par hierarchie, role principal derive."""
        create_user_payload["roles"] = ["metrologue", "assembleur"]
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        data = response.json()
        assert data["roles"] == ["assembleur", "metrologue"]
        assert data["role"] == "assembleur"
        assert data["permission_group"] == "operateur"

    def test_create_user_group_follows_most_privileged_role(
        self, admin_client, create_user_payload
    ):
        """chef_labo + stagiaire -> groupe admin (le plus permissif l'emporte)."""
        create_user_payload["roles"] = ["stagiaire", "chef_labo"]
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )

        assert response.status_code == 201
        assert response.json()["permission_group"] == "admin"
        user = User.objects.get(username="nouveau_user")
        assert {g.name for g in user.groups.all()} == {"admin"}

    def test_create_user_rejects_empty_roles(self, admin_client, create_user_payload):
        create_user_payload["roles"] = []
        response = admin_client.post(
            "/api/v1/users/",
            data=json.dumps(create_user_payload),
            content_type="application/json",
        )
        assert response.status_code == 400


# ============================================================================
# RETRIEVE ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminRetrieve:
    """Tests endpoint GET /api/v1/users/{uuid}/"""

    def test_retrieve_user_success(self, admin_client, existing_user):
        _, profile = existing_user
        response = admin_client.get(f"/api/v1/users/{profile.uuid}/")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "user_existant"
        assert data["role"] == "rce"

    def test_retrieve_user_not_found(self, admin_client):
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = admin_client.get(f"/api/v1/users/{fake_uuid}/")
        assert response.status_code == 404


# ============================================================================
# UPDATE ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminUpdate:
    """Tests endpoint PUT /api/v1/users/{uuid}/"""

    def test_update_user_success(self, admin_client, existing_user):
        _, profile = existing_user
        payload = {
            "first_name": "Modifie",
            "last_name": "Nom",
            "roles": ["assembleur"],
            "laboratoire": "Nouveau Labo",
        }
        response = admin_client.put(
            f"/api/v1/users/{profile.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Modifie"
        assert data["role"] == "assembleur"
        assert data["laboratoire"] == "Nouveau Labo"

    def test_update_user_changes_django_group(self, admin_client, existing_user):
        user, profile = existing_user
        payload = {"roles": ["chef_labo"]}
        admin_client.put(
            f"/api/v1/users/{profile.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        user.refresh_from_db()
        assert user.groups.filter(name="admin").exists()

    def test_update_user_to_several_roles(self, admin_client, existing_user):
        """Passer d'un role unique a des roles cumules met a jour le groupe Django."""
        user, profile = existing_user
        payload = {"roles": ["stagiaire", "chef_labo"]}
        response = admin_client.put(
            f"/api/v1/users/{profile.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["roles"] == ["chef_labo", "stagiaire"]
        assert data["permission_group"] == "admin"

        user.refresh_from_db()
        assert {g.name for g in user.groups.all()} == {"admin"}

    def test_update_user_not_found(self, admin_client):
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        payload = {"roles": ["iec"]}
        response = admin_client.put(
            f"/api/v1/users/{fake_uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_update_user_invalid_role(self, admin_client, existing_user):
        _, profile = existing_user
        payload = {"roles": ["role_fake"]}
        response = admin_client.put(
            f"/api/v1/users/{profile.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_update_user_accepts_blank_optional_fields(
        self, admin_client, existing_user
    ):
        # Le front envoie TOUJOURS les 7 champs, y compris "" pour les champs
        # profil non renseignés (laboratoire/service/numero/bureau). Changer le
        # rôle d'un tel utilisateur ne doit pas être rejeté (400 "may not be
        # blank"). Cohérent avec CreateUserSerializer / UpdateSelfProfileSerializer.
        _, profile = existing_user
        payload = {
            "first_name": "Existant",
            "last_name": "User",
            "roles": ["assembleur"],
            "laboratoire": "",
            "service": "",
            "numero": "",
            "bureau": "",
        }
        response = admin_client.put(
            f"/api/v1/users/{profile.uuid}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "assembleur"
        assert data["laboratoire"] == ""
        assert data["service"] == ""
        assert data["numero"] == ""
        assert data["bureau"] == ""


# ============================================================================
# TOGGLE ACTIVE ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminToggle:
    """Tests endpoint PATCH /api/v1/users/{uuid}/toggle/"""

    def test_toggle_deactivate(self, admin_client, existing_user):
        _, profile = existing_user
        response = admin_client.patch(f"/api/v1/users/{profile.uuid}/toggle/")

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    def test_toggle_reactivate(self, admin_client, existing_user):
        user, profile = existing_user
        # Desactiver d'abord
        user.is_active = False
        user.save(update_fields=["is_active"])

        response = admin_client.patch(f"/api/v1/users/{profile.uuid}/toggle/")

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True

    def test_toggle_not_found(self, admin_client):
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = admin_client.patch(f"/api/v1/users/{fake_uuid}/toggle/")
        assert response.status_code == 404


# ============================================================================
# RESET PASSWORD ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestUserAdminResetPassword:
    """Tests endpoint POST /api/v1/users/{uuid}/reset-password/"""

    def test_reset_password_success(self, admin_client, existing_user):
        user, profile = existing_user
        response = admin_client.post(f"/api/v1/users/{profile.uuid}/reset-password/")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "user_existant"
        # Mot de passe temporaire renvoyé une seule fois (no-store) ; l'ancien
        # est immédiatement invalidé.
        assert "activation_url" not in data
        assert len(data["generated_password"]) >= 12
        assert response["Cache-Control"] == "no-store"

        user.refresh_from_db()
        assert user.check_password(data["generated_password"])

    def test_reset_password_sets_force_change_flag(self, admin_client, existing_user):
        _, profile = existing_user
        # Mettre le flag a False d'abord
        profile.force_password_change = False
        profile.save(update_fields=["force_password_change"])

        admin_client.post(f"/api/v1/users/{profile.uuid}/reset-password/")

        profile.refresh_from_db()
        assert profile.force_password_change is True

    def test_reset_password_invalidates_current_password(
        self, admin_client, existing_user
    ):
        """L'ancien mot de passe ne doit plus être valide après reset."""
        user, profile = existing_user
        admin_client.post(f"/api/v1/users/{profile.uuid}/reset-password/")
        user.refresh_from_db()
        assert not user.check_password("ExistPass123!")

    def test_reset_password_not_found(self, admin_client):
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        response = admin_client.post(f"/api/v1/users/{fake_uuid}/reset-password/")
        assert response.status_code == 404


# ============================================================================
# ME ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestMeController:
    """Tests endpoint GET /api/v1/auth/me/"""

    def test_me_returns_current_user(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/auth/me/")

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin_test"
        assert data["role"] == "chef_labo"
        assert data["permission_group"] == "admin"

    def test_me_unauthenticated(self, db):
        client = Client()
        response = client.get("/api/v1/auth/me/")
        assert response.status_code in (401, 403)


@pytest.mark.integration
@pytest.mark.django_db
class TestMeUpdateProfile:
    """Tests endpoint PUT /api/v1/auth/me/update/ — self-service profil."""

    def test_update_self_profile_success(self, operateur_client, operateur_user):
        payload = {
            "first_name": "Jean",
            "last_name": "Dupont",
            "laboratoire": "Labo Z",
            "service": "Service Y",
            "numero": "999",
            "bureau": "B42",
        }
        response = operateur_client.put(
            "/api/v1/auth/me/update/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Jean"
        assert data["last_name"] == "Dupont"
        assert data["laboratoire"] == "Labo Z"
        assert data["service"] == "Service Y"
        assert data["numero"] == "999"
        assert data["bureau"] == "B42"
        # Le role et le matricule sont inchanges
        assert data["role"] == "iec"
        assert data["username"] == "oper_test"

        operateur_user.refresh_from_db()
        assert operateur_user.first_name == "Jean"
        assert operateur_user.last_name == "Dupont"

    def test_update_self_profile_ignores_role(self, operateur_client, operateur_user):
        """Tente de passer des roles : doit etre ignore (preserve ceux existants)."""
        payload = {
            "first_name": "Hack",
            "roles": ["chef_labo"],  # Champ non declare dans le serializer self-update
        }
        response = operateur_client.put(
            "/api/v1/auth/me/update/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "iec"  # role inchange
        assert data["permission_group"] == "operateur"

        operateur_user.refresh_from_db()
        assert operateur_user.profile.roles == ["iec"]
        assert {g.name for g in operateur_user.groups.all()} == {"operateur"}

    def test_update_self_profile_unauthenticated(self, db):
        client = Client()
        response = client.put(
            "/api/v1/auth/me/update/",
            data=json.dumps({"first_name": "X"}),
            content_type="application/json",
        )
        assert response.status_code in (401, 403)

    def test_update_self_profile_partial(self, operateur_client, operateur_user):
        """Un payload partiel ne casse pas — les champs absents sont vides par defaut."""
        response = operateur_client.put(
            "/api/v1/auth/me/update/",
            data=json.dumps({"bureau": "C99"}),
            content_type="application/json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["bureau"] == "C99"


# ============================================================================
# CHANGE PASSWORD ENDPOINT
# ============================================================================


@pytest.mark.integration
@pytest.mark.django_db
class TestChangePasswordController:
    """Tests endpoint POST /api/v1/auth/change-password/"""

    def test_change_password_success(self, admin_client, admin_user):
        payload = {
            "current_password": "AdminPass123!",
            "new_password": "NouveauPass456!",
        }
        response = admin_client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        assert response.status_code == 200
        admin_user.refresh_from_db()
        assert admin_user.check_password("NouveauPass456!")

    def test_change_password_clears_force_flag(self, admin_client, admin_user):
        profile = admin_user.profile
        profile.force_password_change = True
        profile.save(update_fields=["force_password_change"])

        payload = {
            "current_password": "AdminPass123!",
            "new_password": "NouveauPass456!",
        }
        admin_client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        profile.refresh_from_db()
        assert profile.force_password_change is False

    def test_change_password_wrong_current(self, admin_client):
        payload = {
            "current_password": "MauvaisMotDePasse",
            "new_password": "NouveauPass456!",
        }
        response = admin_client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_change_password_same_as_current(self, admin_client):
        payload = {
            "current_password": "AdminPass123!",
            "new_password": "AdminPass123!",
        }
        response = admin_client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_change_password_too_short(self, admin_client):
        payload = {
            "current_password": "AdminPass123!",
            "new_password": "court",
        }
        response = admin_client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code == 400

    def test_change_password_unauthenticated(self, db):
        client = Client()
        payload = {
            "current_password": "abc",
            "new_password": "NouveauPass456!",
        }
        response = client.post(
            "/api/v1/auth/change-password/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert response.status_code in (401, 403)
