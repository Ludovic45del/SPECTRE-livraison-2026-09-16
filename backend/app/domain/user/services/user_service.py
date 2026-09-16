"""Service utilisateur — logique metier pure."""

import logging
import secrets
import string
import uuid as uuid_lib

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from app.domain.exceptions import (
    ConflictException,
    NotFoundException,
    ValidationException,
)
from app.domain.user.interface.user_repository import IUserRepository
from app.domain.user.models.user_bean import ALL_SPECTRE_ROLES, UserBean, sort_roles

logger = logging.getLogger(__name__)


def _validate_password_strength(password: str, username: str | None = None) -> None:
    """Applique AUTH_PASSWORD_VALIDATORS (longueur, commun, similarité username).

    Wrappe les django.core.exceptions.ValidationError en ValidationException du
    domaine pour que ErrorHandlerMiddleware retourne un 400 cohérent.

    Utilise une instance User non-persistée pour que
    `UserAttributeSimilarityValidator` puisse accéder à `_meta` sans créer
    réellement l'utilisateur en base.
    """
    # Import local pour éviter un import lourd au chargement du module.
    from django.contrib.auth.models import User

    user_reference = User(username=username) if username else None
    try:
        validate_password(password, user=user_reference)
    except DjangoValidationError as exc:
        raise ValidationException("password", "; ".join(exc.messages)) from exc


def _validate_roles(roles: list[str] | None) -> list[str]:
    """Valide la liste de roles metier et la renvoie normalisee (triee, dedoublonnee).

    Defense en profondeur : createadmin et les commandes de management ne
    passent pas par un serializer.
    """
    normalized = sort_roles(roles)
    if not normalized:
        raise ValidationException(
            "roles",
            "Au moins un role metier est requis",
        )
    invalid = [r for r in normalized if r not in ALL_SPECTRE_ROLES]
    if invalid:
        raise ValidationException(
            "roles",
            f"Role invalide : {', '.join(invalid)}. "
            f"Roles acceptes : {', '.join(ALL_SPECTRE_ROLES)}",
        )
    return normalized


def _generate_temporary_password(length: int = 12) -> str:
    """Genere un mot de passe temporaire securise (CSPRNG)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%&*" for c in password)
        ):
            return password


def create_user(
    repository: IUserRepository,
    bean: UserBean,
    password: str = None,
) -> tuple[UserBean, str]:
    """Cree un nouvel utilisateur.

    Returns:
        tuple (UserBean cree, mot de passe en clair a communiquer)
    """
    if not bean.username or not bean.username.strip():
        raise ValidationException(
            "username",
            "Le nom d'utilisateur est requis",
        )

    bean.roles = _validate_roles(bean.roles)

    if repository.exists_by_username(bean.username):
        raise ConflictException("username", bean.username)

    if password:
        # Le mot de passe généré par _generate_temporary_password() passe toujours
        # les validators (12 chars + diversité) : skip la validation coûteuse
        # côté défaut, et la réservons aux mots de passe fournis par l'admin.
        _validate_password_strength(password, username=bean.username)
        generated_password = password
    else:
        generated_password = _generate_temporary_password()
    created_bean = repository.create(bean, generated_password)
    logger.debug("Utilisateur cree: %s (roles=%s)", bean.username, bean.roles)
    return created_bean, generated_password


def get_user_by_uuid(repository: IUserRepository, uuid: uuid_lib.UUID) -> UserBean:
    bean = repository.get_by_uuid(uuid)
    if not bean:
        raise NotFoundException("USER", str(uuid))
    return bean


def list_users(
    repository: IUserRepository,
    offset: int = 0,
    limit: int = 50,
    roles: list[str] | None = None,
    is_active: bool | None = None,
) -> list[UserBean]:
    return repository.get_all(
        offset=offset,
        limit=limit,
        roles=roles,
        is_active=is_active,
    )


def update_user(
    repository: IUserRepository, uuid: uuid_lib.UUID, bean: UserBean
) -> UserBean:
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    bean.roles = _validate_roles(bean.roles)
    bean.uuid = uuid
    updated = repository.update(bean)
    logger.debug("Utilisateur modifie: %s (roles=%s)", updated.username, updated.roles)
    return updated


def update_user_self_profile(
    repository: IUserRepository, uuid: uuid_lib.UUID, bean: UserBean
) -> UserBean:
    """Self-update : conserve roles/username de l'existant pour éviter l'escalade."""
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    bean.uuid = uuid
    bean.username = existing.username
    bean.roles = list(existing.roles)
    updated = repository.update(bean)
    logger.debug("Profil self-modifie: %s", updated.username)
    return updated


def set_user_avatar(
    repository: IUserRepository, uuid: uuid_lib.UUID, uploaded_image
) -> UserBean:
    """Normalise puis enregistre la photo de profil de l'utilisateur.

    L'image est re-traitée côté serveur (carré 256px, JPEG compressé, EXIF
    strippé) avant stockage — cf. `app.core.avatar_image.process_avatar`.
    """
    # Import local : Pillow est lourd, on ne le charge qu'au moment de l'upload.
    from PIL import Image, UnidentifiedImageError

    from app.core.avatar_image import process_avatar

    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    # Le serializer valide l'en-tête mais pas l'intégrité des pixels : un fichier
    # tronqué peut échouer ici au décodage complet → 400 propre plutôt qu'un 500.
    try:
        processed = process_avatar(uploaded_image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationException(
            "image", "Fichier image illisible ou corrompu."
        ) from exc

    updated = repository.set_avatar(uuid, processed)
    logger.debug("Avatar mis à jour pour: %s", updated.username)
    return updated


def delete_user_avatar(repository: IUserRepository, uuid: uuid_lib.UUID) -> UserBean:
    """Supprime la photo de profil (retour aux initiales côté UI)."""
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    updated = repository.set_avatar(uuid, None)
    logger.debug("Avatar supprimé pour: %s", updated.username)
    return updated


def set_user_signature(
    repository: IUserRepository, uuid: uuid_lib.UUID, uploaded_image
) -> UserBean:
    """Normalise puis enregistre la signature de l'utilisateur.

    L'image est re-traitée côté serveur (PNG transparent, rectangulaire 600x300,
    EXIF strippé) avant stockage — cf. `app.core.signature_image.process_signature`.
    """
    # Import local : Pillow est lourd, on ne le charge qu'au moment de l'upload.
    from PIL import Image, UnidentifiedImageError

    from app.core.signature_image import process_signature

    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    # Le serializer valide l'en-tête mais pas l'intégrité des pixels : un fichier
    # tronqué peut échouer ici au décodage complet → 400 propre plutôt qu'un 500.
    try:
        processed = process_signature(uploaded_image)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationException(
            "image", "Fichier image illisible ou corrompu."
        ) from exc

    updated = repository.set_signature(uuid, processed)
    logger.debug("Signature mise à jour pour: %s", updated.username)
    return updated


def delete_user_signature(repository: IUserRepository, uuid: uuid_lib.UUID) -> UserBean:
    """Supprime la signature de l'utilisateur."""
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    updated = repository.set_signature(uuid, None)
    logger.debug("Signature supprimée pour: %s", updated.username)
    return updated


def toggle_active(repository: IUserRepository, uuid: uuid_lib.UUID) -> UserBean:
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))
    result = repository.toggle_active(uuid)
    logger.debug("Utilisateur %s: is_active=%s", result.username, result.is_active)
    return result


def reset_password(
    repository: IUserRepository, uuid: uuid_lib.UUID
) -> tuple[UserBean, str]:
    """Reinitialise le mot de passe (action admin).

    Genere un mot de passe temporaire qui remplace immediatement l'ancien.
    L'admin le communique a l'utilisateur, qui devra le changer a sa premiere
    connexion (force_password_change pose par le repository).

    Returns:
        tuple (UserBean cible, mot de passe temporaire en clair a communiquer).
    """
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    new_password = _generate_temporary_password()
    repository.reset_password(uuid, new_password)
    logger.debug("Mot de passe reinitialise pour: %s", existing.username)
    return existing, new_password


def change_password(
    repository: IUserRepository,
    uuid: uuid_lib.UUID,
    current_password: str,
    new_password: str,
) -> None:
    """Change le mot de passe (action self-service)."""
    existing = repository.get_by_uuid(uuid)
    if not existing:
        raise NotFoundException("USER", str(uuid))

    if not repository.check_password(uuid, current_password):
        raise ValidationException("current_password", "Mot de passe actuel incorrect")

    if current_password == new_password:
        raise ValidationException(
            "new_password",
            "Le nouveau mot de passe doit etre different de l'ancien",
        )

    _validate_password_strength(new_password, username=existing.username)

    repository.set_password(uuid, new_password)
    repository.set_force_password_change(uuid, False)
    logger.debug("Mot de passe change par l'utilisateur: %s", existing.username)
