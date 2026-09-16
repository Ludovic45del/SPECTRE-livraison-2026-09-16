"""Jetons d'activation signés pour fixation initiale / reset de mot de passe.

Flux :
1. L'admin crée un utilisateur ou réinitialise son mot de passe.
2. Le backend incrémente `password_token_version` sur son profil et génère un
   jeton signé `{user_id}:{version}` avec `TimestampSigner` (TTL 24h).
3. L'URL d'activation est loggée côté serveur et retournée à l'admin pour
   transmission hors-bande (mail/SMS/chat interne).
4. L'utilisateur ouvre le lien et définit son mot de passe via
   `POST /api/v1/auth/set-initial-password/`.
5. Le backend vérifie signature + TTL + version courante, change le mot de
   passe, incrémente à nouveau la version (rend le jeton inutilisable).
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db import transaction
from django.db.models import F

from app.domain.exceptions import ValidationException
from app.repository.user.models.user_profile_entity import UserProfileEntity

ACTIVATION_SALT = "spectre.password.activation"
ACTIVATION_PATH = "/auth/set-initial-password"
TOKEN_TTL = timedelta(hours=24)
TOKEN_TTL_SECONDS = int(TOKEN_TTL.total_seconds())


def _signer() -> TimestampSigner:
    return TimestampSigner(salt=ACTIVATION_SALT)


def _build_payload(user_id: int, version: int) -> str:
    return f"{user_id}:{version}"


def _parse_payload(payload: str) -> tuple[int, int]:
    try:
        user_id_str, version_str = payload.split(":", 1)
        return int(user_id_str), int(version_str)
    except (ValueError, AttributeError) as exc:
        raise ValidationException("token", "Jeton d'activation malformé") from exc


@transaction.atomic
def issue_activation_token(profile: UserProfileEntity) -> str:
    """Émet un nouveau jeton d'activation pour le profil, en invalidant les précédents.

    L'incrément de `password_token_version` rend immédiatement obsolètes tous
    les jetons émis précédemment pour cet utilisateur.
    """
    UserProfileEntity.objects.filter(pk=profile.pk).update(
        password_token_version=F("password_token_version") + 1
    )
    profile.refresh_from_db(fields=["password_token_version"])
    payload = _build_payload(profile.user_id, profile.password_token_version)
    return _signer().sign(payload)


def build_activation_url(token: str, base_url: str | None = None) -> str:
    """Construit l'URL d'activation à loguer / communiquer hors-bande.

    `base_url` doit être fourni par l'appelant quand il connaît l'hôte public
    (via `request.build_absolute_uri`). Sinon on retourne un chemin relatif.
    """
    path = f"{ACTIVATION_PATH}?token={token}"
    if not base_url:
        return path
    return f"{base_url.rstrip('/')}{path}"


@transaction.atomic
def consume_activation_token(token: str, new_password: str) -> User:
    """Vérifie + consomme un jeton, applique le nouveau mot de passe.

    Échoue avec ValidationException si le jeton est invalide, expiré, déjà
    consommé, ou si le mot de passe ne passe pas validate_password.
    """
    if not token or not isinstance(token, str):
        raise ValidationException("token", "Jeton d'activation requis")
    if not new_password or not isinstance(new_password, str):
        raise ValidationException("new_password", "Mot de passe requis")

    try:
        payload = _signer().unsign(token, max_age=TOKEN_TTL_SECONDS)
    except SignatureExpired as exc:
        raise ValidationException(
            "token", "Jeton d'activation expiré — demandez un nouveau lien"
        ) from exc
    except BadSignature as exc:
        raise ValidationException("token", "Jeton d'activation invalide") from exc

    user_id, version = _parse_payload(payload)

    try:
        profile = UserProfileEntity.objects.select_related("user").get(user_id=user_id)
    except UserProfileEntity.DoesNotExist as exc:
        raise ValidationException("token", "Utilisateur introuvable") from exc

    if profile.password_token_version != version:
        raise ValidationException(
            "token", "Jeton d'activation déjà utilisé ou remplacé"
        )

    user = profile.user

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        raise ValidationException("new_password", "; ".join(exc.messages)) from exc

    user.set_password(new_password)
    user.save(update_fields=["password"])

    UserProfileEntity.objects.filter(pk=profile.pk).update(
        force_password_change=False,
        password_token_version=F("password_token_version") + 1,
    )

    return user
