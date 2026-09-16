"""Serializers utilisateur — validation input uniquement."""

from rest_framework import serializers

from app.domain.user.models.user_bean import ALL_SPECTRE_ROLES

# Garde-fou serveur sur l'upload d'avatar. La compression Canvas côté client
# sort déjà en JPEG < 100 ko ; on tolère jusqu'à 5 Mo pour les cas non
# compressés (mêmes valeurs que la photo FSEC/FA), le serveur re-compresse.
AVATAR_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
AVATAR_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
# Plafond en pixels (≈ 24 Mpx, soit un capteur photo ~6000x4000). Borne le
# coût mémoire du décodage Pillow indépendamment de la taille du FICHIER : une
# « bombe de décompression » (PNG/WebP très compressé) peut peser < 5 Mo mais
# allouer des centaines de Mo une fois décodée. On rejette ces images AVANT tout
# décodage du bitmap, en ne lisant que l'en-tête (Image.open est paresseux).
AVATAR_MAX_PIXELS = 24_000_000


class CreateUserSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150)
    first_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    last_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    # Roles metier cumulables. `ListField` + `ChoiceField` : au moins un role,
    # pas de doublon, valeurs bornees a ALL_SPECTRE_ROLES.
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[(r, r) for r in ALL_SPECTRE_ROLES]),
        allow_empty=False,
        max_length=len(ALL_SPECTRE_ROLES),
    )
    laboratoire = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    service = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    numero = serializers.CharField(
        max_length=30, required=False, allow_blank=True, default=""
    )
    bureau = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    password = serializers.CharField(
        min_length=8,
        max_length=128,
        required=False,
        write_only=True,
    )


class UpdateUserSerializer(serializers.Serializer):
    # `allow_blank=True` : le front renvoie systématiquement les 7 champs, y
    # compris "" pour ceux non renseignés. Sans cela, changer les rôles d'un
    # membre au profil incomplet est rejeté (400 "This field may not be blank.").
    #
    # Pas de `default=""` ici (contrairement à Create/SelfProfile) : on veut
    # garder la sémantique d'update partiel du repository, qui préserve la
    # valeur existante quand le champ est ABSENT (None) et ne l'écrase qu'avec
    # une chaîne explicitement fournie.
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    # Roles metier cumulables. `ListField` + `ChoiceField` : au moins un role,
    # pas de doublon, valeurs bornees a ALL_SPECTRE_ROLES.
    roles = serializers.ListField(
        child=serializers.ChoiceField(choices=[(r, r) for r in ALL_SPECTRE_ROLES]),
        allow_empty=False,
        max_length=len(ALL_SPECTRE_ROLES),
    )
    laboratoire = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    service = serializers.CharField(max_length=100, required=False, allow_blank=True)
    numero = serializers.CharField(max_length=30, required=False, allow_blank=True)
    bureau = serializers.CharField(max_length=50, required=False, allow_blank=True)


class UpdateSelfProfileSerializer(serializers.Serializer):
    # Self-update : pas de roles (privilege escalation), pas de username (immuable).
    first_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    last_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, default=""
    )
    laboratoire = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    service = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )
    numero = serializers.CharField(
        max_length=30, required=False, allow_blank=True, default=""
    )
    bureau = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )


class AvatarUploadSerializer(serializers.Serializer):
    """Upload de la photo de profil — champ `image` multipart.

    Validation : image décodable (ImageField), JPEG/PNG/WebP, max 5 Mo. Le
    serveur re-traite ensuite l'image (carré 256px, JPEG compressé).
    """

    image = serializers.ImageField(required=True, allow_null=False)

    def validate_image(self, value):
        if value.size > AVATAR_MAX_BYTES:
            raise serializers.ValidationError(
                f"Image trop volumineuse ({value.size} octets, max {AVATAR_MAX_BYTES})."
            )
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in AVATAR_ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                f"Type d'image non supporté ({content_type}). "
                f"Formats acceptés : JPEG, PNG, WebP."
            )

        # Borne les dimensions sans charger le bitmap (en-tête uniquement) pour
        # neutraliser les bombes de décompression. Import local : Pillow est lourd.
        from PIL import Image, UnidentifiedImageError

        try:
            with Image.open(value) as img:
                width, height = img.size
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise serializers.ValidationError("Image illisible ou corrompue.") from exc
        finally:
            # Repositionne le curseur pour la re-compression serveur en aval.
            value.seek(0)

        if width * height > AVATAR_MAX_PIXELS:
            raise serializers.ValidationError(
                f"Dimensions trop grandes ({width}x{height} px, "
                f"max {AVATAR_MAX_PIXELS} px)."
            )
        return value


class SignatureUploadSerializer(serializers.Serializer):
    """Upload de la signature — champ `image` multipart.

    Mêmes garde-fous que l'avatar (JPEG/PNG/WebP, max 5 Mo, anti-bombe de
    décompression) ; le serveur re-traite ensuite en PNG transparent
    rectangulaire (cf. `app.core.signature_image.process_signature`).
    """

    image = serializers.ImageField(required=True, allow_null=False)

    def validate_image(self, value):
        if value.size > AVATAR_MAX_BYTES:
            raise serializers.ValidationError(
                f"Image trop volumineuse ({value.size} octets, max {AVATAR_MAX_BYTES})."
            )
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in AVATAR_ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                f"Type d'image non supporté ({content_type}). "
                f"Formats acceptés : JPEG, PNG, WebP."
            )

        # Borne les dimensions sans charger le bitmap (anti-bombe) — cf.
        # AvatarUploadSerializer.validate_image.
        from PIL import Image, UnidentifiedImageError

        try:
            with Image.open(value) as img:
                width, height = img.size
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise serializers.ValidationError("Image illisible ou corrompue.") from exc
        finally:
            value.seek(0)

        if width * height > AVATAR_MAX_PIXELS:
            raise serializers.ValidationError(
                f"Dimensions trop grandes ({width}x{height} px, "
                f"max {AVATAR_MAX_PIXELS} px)."
            )
        return value


class DashboardPreferencesSerializer(serializers.Serializer):
    layout = serializers.ListField(
        child=serializers.DictField(), required=False, default=list, max_length=20
    )
    widgets = serializers.DictField(required=False, default=dict)
    shortcuts = serializers.ListField(
        child=serializers.DictField(), required=False, default=list, max_length=50
    )
    todos = serializers.ListField(
        child=serializers.DictField(), required=False, default=list, max_length=100
    )


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
    )


class SetInitialPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(
        min_length=8,
        max_length=128,
        write_only=True,
    )
