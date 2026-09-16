"""Serializers FSEC - Validation des entrées pour les FSECs."""

import json

from rest_framework import serializers

# Limite côté serveur : la compression côté client vise < 500 ko, on accepte
# jusqu'à 5 Mo pour absorber les rares cas où le navigateur n'a pas réussi à
# compresser (ex. canvas tainted en mode privé).
OVERVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
OVERVIEW_IMAGE_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Plan d'assemblage : mêmes contraintes d'image que la vue d'ensemble.
ASSEMBLY_PLAN_IMAGE_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
ASSEMBLY_PLAN_IMAGE_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
# Garde-fous du calque d'annotations (anti-blob/anti-DoS) : on borne le nombre
# d'éléments et la taille sérialisée sans figer la géométrie (le front possède
# le contrat de rendu — éviter un couplage back/front sur chaque type d'objet).
ASSEMBLY_PLAN_MAX_ANNOTATIONS = 1000
ASSEMBLY_PLAN_ANNOTATIONS_MAX_BYTES = 256 * 1024  # 256 KB sérialisés


class FsecSerializer(serializers.Serializer):
    """Serializer pour la validation des FSECs."""

    # Versioning (optionnel pour création)
    version_uuid = serializers.UUIDField(required=False, allow_null=True)
    fsec_uuid = serializers.UUIDField(required=False, allow_null=True)

    # Foreign Keys
    campaign_id = serializers.UUIDField(required=False, allow_null=True)
    status_id = serializers.IntegerField(required=False, allow_null=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    rack_id = serializers.IntegerField(required=False, allow_null=True)

    # Champs de base
    name = serializers.CharField(max_length=50, required=True)
    comments = serializers.CharField(
        max_length=4000, required=False, allow_blank=True, allow_null=True
    )
    is_active = serializers.BooleanField(required=False, default=True)

    # Champs workflow
    delivery_date = serializers.DateField(required=False, allow_null=True)
    shooting_date = serializers.DateField(required=False, allow_null=True)
    preshooting_pressure = serializers.FloatField(required=False, allow_null=True)
    experience_srxx = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    localisation = serializers.CharField(
        max_length=20, required=False, allow_blank=True, allow_null=True
    )
    depressurization_failed = serializers.BooleanField(required=False, allow_null=True)
    alignment_file_link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )
    fdie_link = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )


class FsecRequestedViewsSerializer(serializers.Serializer):
    """Vues / photos demandées (onglet Vue/Photo, R08).

    Action dédiée PATCH /fsecs/:uuid/requested-views/ : le champ est
    volontairement absent de `FsecSerializer` (PUT global) pour qu'un PUT
    partiel ne puisse jamais l'écraser. Chaîne vide ou null ⇒ effacement.
    """

    requested_views = serializers.CharField(
        max_length=4000, required=True, allow_blank=True, allow_null=True
    )


class FsecDocumentsSerializer(serializers.Serializer):
    """Serializer pour la validation des documents FSEC."""

    uuid = serializers.UUIDField(required=False, allow_null=True)
    fsec_id = serializers.UUIDField(required=True)
    # Les sous-types FSEC sont seedés à partir de l'id 0
    # (cf. data/fsec/fsec_document_subtypes.csv, ex: "Visrad initial").
    subtype_id = serializers.IntegerField(required=True, min_value=0)
    name = serializers.CharField(max_length=100, required=True)
    path = serializers.CharField(max_length=500, required=True)
    date = serializers.DateField(required=True)


class FsecTeamsSerializer(serializers.Serializer):
    """Serializer pour la validation des membres d'équipe FSEC.

    name OU user_uuid est requis selon le rôle (MOE/TCI → name, autres → user_uuid).
    Le service `fsec_teams_service` valide la cohérence et renvoie 400 sinon.
    """

    uuid = serializers.UUIDField(required=False, allow_null=True)
    fsec_id = serializers.UUIDField(required=True)
    # Les rôles FSEC sont seedés à partir de l'id 0
    # (cf. data/fsec/fsec_roles.csv, ex: "RCE" id=0).
    role_id = serializers.IntegerField(required=True, min_value=0)
    name = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    user_uuid = serializers.UUIDField(required=False, allow_null=True)


class FsecCreateVersionSerializer(FsecSerializer):
    """Serializer pour la création d'une nouvelle version de FSEC.

    Hérite de FsecSerializer et retire les champs de versioning
    (version_uuid, fsec_uuid, is_active) qui sont gérés par le service.
    """

    version_uuid = None
    fsec_uuid = None
    is_active = None


class DeliveryInfoSerializer(serializers.Serializer):
    """Phase 1 (équipe livraison) : N° Interface I0 + date livraison + accepteur.

    `delivery_acceptor_user_uuid` est l'uuid UserProfile sélectionné via le
    dropdown frontend ; le service le résout en auth.User.id pour la FK.
    """

    num_interface_io = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_acceptor_user_uuid = serializers.UUIDField(required=False, allow_null=True)


class DeliveryValidationSerializer(serializers.Serializer):
    """Phase 2 (TCI) : OK/KO + remarques + nom/date réceptionnaire.

    Le signataire (`delivery_validated_by`) est posé par le serveur à partir
    de `request.user`. Le `delivery_receiver_name` est un texte libre car la
    personne qui réceptionne n'a pas forcément de compte SPECTRE.
    """

    delivery_validation = serializers.ChoiceField(
        choices=["", "OK", "KO"], required=False, allow_blank=True
    )
    delivery_remarques = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )
    delivery_receiver_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    delivery_receiver_date = serializers.DateField(required=False, allow_null=True)


class DeliveryRecapTargetInfoSerializer(serializers.Serializer):
    """Une ligne du tableau récap pour la sauvegarde batch."""

    version_uuid = serializers.UUIDField(required=True)
    num_interface_io = serializers.CharField(
        max_length=50, required=False, allow_blank=True, allow_null=True
    )
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_validation = serializers.ChoiceField(
        choices=["", "OK", "KO"], required=False, allow_blank=True
    )
    delivery_remarques = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True
    )
    delivery_acceptor_user_uuid = serializers.UUIDField(required=False, allow_null=True)
    delivery_receiver_name = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    delivery_receiver_date = serializers.DateField(required=False, allow_null=True)


class DeliveryRecapBatchSerializer(serializers.Serializer):
    """Payload de sauvegarde batch des champs de livraison pour N cibles."""

    targets = DeliveryRecapTargetInfoSerializer(many=True, required=True)


class FsecOverviewImageSerializer(serializers.Serializer):
    """Serializer de l'upload de la photo de vue d'ensemble FSEC.

    Validation : seul JPEG/PNG/WebP acceptés (cohérent avec la compression
    Canvas côté client qui sort en JPEG par défaut), taille max 5 Mo.
    """

    image = serializers.ImageField(required=True, allow_null=False)

    def validate_image(self, value):
        if value.size > OVERVIEW_IMAGE_MAX_BYTES:
            raise serializers.ValidationError(
                f"Image trop volumineuse ({value.size} octets, "
                f"max {OVERVIEW_IMAGE_MAX_BYTES})."
            )
        content_type = getattr(value, "content_type", None)
        if content_type and content_type not in OVERVIEW_IMAGE_ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                f"Type d'image non supporté ({content_type}). "
                f"Formats acceptés : JPEG, PNG, WebP."
            )
        return value


class FsecAssemblyPlanImageSerializer(serializers.Serializer):
    """Serializer de l'upload de l'image du plan d'assemblage.

    Mêmes règles que la photo de vue d'ensemble : JPEG/PNG/WebP, max 5 Mo
    (la compression est faite côté client avant l'envoi).
    """

    image = serializers.ImageField(required=True, allow_null=False)

    def validate_image(self, value):
        if value.size > ASSEMBLY_PLAN_IMAGE_MAX_BYTES:
            raise serializers.ValidationError(
                f"Image trop volumineuse ({value.size} octets, "
                f"max {ASSEMBLY_PLAN_IMAGE_MAX_BYTES})."
            )
        content_type = getattr(value, "content_type", None)
        if (
            content_type
            and content_type not in ASSEMBLY_PLAN_IMAGE_ALLOWED_CONTENT_TYPES
        ):
            raise serializers.ValidationError(
                f"Type d'image non supporté ({content_type}). "
                f"Formats acceptés : JPEG, PNG, WebP."
            )
        return value


class FsecAssemblyPlanAnnotationsSerializer(serializers.Serializer):
    """Serializer du calque d'annotations du plan d'assemblage (remplacement total).

    Validation défensive et générique : on garantit une liste d'objets ayant un
    `id` et un `type` (chaînes non vides), bornée en nombre et en taille
    sérialisée. La géométrie (coordonnées, couleur…) n'est pas figée côté serveur
    pour ne pas coupler le back à chaque évolution d'outil de dessin du front.
    """

    annotations = serializers.JSONField(required=True)

    def validate_annotations(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError(
                "Le calque doit être une liste d'annotations."
            )
        if len(value) > ASSEMBLY_PLAN_MAX_ANNOTATIONS:
            raise serializers.ValidationError(
                f"Trop d'annotations ({len(value)}, "
                f"max {ASSEMBLY_PLAN_MAX_ANNOTATIONS})."
            )
        serialized_size = len(json.dumps(value).encode("utf-8"))
        if serialized_size > ASSEMBLY_PLAN_ANNOTATIONS_MAX_BYTES:
            raise serializers.ValidationError(
                f"Calque trop volumineux ({serialized_size} octets, "
                f"max {ASSEMBLY_PLAN_ANNOTATIONS_MAX_BYTES})."
            )
        for index, item in enumerate(value):
            if not isinstance(item, dict):
                raise serializers.ValidationError(
                    f"Annotation #{index} invalide (objet attendu)."
                )
            if not isinstance(item.get("id"), str) or not item["id"]:
                raise serializers.ValidationError(
                    f"Annotation #{index} : `id` (chaîne non vide) requis."
                )
            if not isinstance(item.get("type"), str) or not item["type"]:
                raise serializers.ValidationError(
                    f"Annotation #{index} : `type` (chaîne non vide) requis."
                )
        return value
