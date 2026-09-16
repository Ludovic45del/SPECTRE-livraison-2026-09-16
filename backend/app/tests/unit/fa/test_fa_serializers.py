"""
Tests unitaires pour les serializers FA.

Vérifie la validation des entrées pour les Fiches d'Anomalie.
"""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from app.api.fa.serializers import (
    FA_PHOTO_MAX_BYTES,
    FaCloseSerializer,
    FaPatchSerializer,
    FaPhotoUploadSerializer,
    FaSerializer,
    FaValidatePhaseSerializer,
)


def _png_upload(name="photo.png", content_type="image/png"):
    """Construit un vrai PNG en mémoire (validé par Pillow côté ImageField)."""
    buf = io.BytesIO()
    Image.new("RGB", (2, 2), "blue").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type=content_type)


SAMPLE_FSEC_VERSION_UUID = "00000000-0000-0000-0000-000000000001"


@pytest.mark.unit
class TestFaSerializer:
    """Tests du serializer principal FA."""

    def test_valid_full_payload(self):
        """Test validation d'un payload complet."""
        data = {
            "fsec_version_id": SAMPLE_FSEC_VERSION_UUID,
            "status_id": 0,
            "discoverer": "Jean Dupont",
            "event_date": "2025-01-15",
            "observation": "Anomalie constatée",
            "quick_analysis": "Analyse immédiate",
        }
        serializer = FaSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_minimal_payload(self):
        """Test validation d'un payload minimal (tous optionnels)."""
        serializer = FaSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_invalid_uuid_format(self):
        """Test rejet d'un UUID invalide."""
        data = {"uuid": "not-a-uuid"}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "uuid" in serializer.errors

    def test_invalid_fsec_version_id_format(self):
        """Test rejet d'un fsec_version_id invalide."""
        data = {"fsec_version_id": "invalid"}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "fsec_version_id" in serializer.errors

    def test_discoverer_max_length(self):
        """Test rejet si discoverer dépasse 100 chars."""
        data = {"discoverer": "x" * 101}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "discoverer" in serializer.errors

    def test_observation_max_length(self):
        """Test rejet si observation dépasse 4000 chars."""
        data = {"observation": "x" * 4001}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "observation" in serializer.errors

    def test_quick_analysis_max_length(self):
        """Test rejet si quick_analysis dépasse 4000 chars."""
        data = {"quick_analysis": "x" * 4001}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "quick_analysis" in serializer.errors

    def test_location_equipment_max_length(self):
        """Test rejet si location_equipment dépasse 255 chars."""
        data = {"location_equipment": "x" * 256}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "location_equipment" in serializer.errors

    def test_invalid_event_date_format(self):
        """Test rejet d'une date invalide."""
        data = {"event_date": "not-a-date"}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "event_date" in serializer.errors

    def test_null_nullable_fields(self):
        """Test acceptation de null pour les champs nullable."""
        data = {
            "status_id": None,
            "type_id": None,
            "criticality_id": None,
            "location_equipment": None,
            "immediate_measures": None,
            "cause": None,
            "event_date": None,
        }
        serializer = FaSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_identifier_is_read_only(self):
        """Test que identifier est ignoré en entrée."""
        data = {"identifier": "FA-INJECTED"}
        serializer = FaSerializer(data=data)
        assert serializer.is_valid()
        assert "identifier" not in serializer.validated_data

    def test_iec_validation_open_defaults_false(self):
        """Test que iec_validation_open vaut False par défaut."""
        serializer = FaSerializer(data={})
        assert serializer.is_valid()
        assert serializer.validated_data.get("iec_validation_open") is False

    def test_fsec_step_other_max_length(self):
        """Test rejet si fsec_step_other dépasse 255 chars."""
        data = {"fsec_step_other": "x" * 256}
        serializer = FaSerializer(data=data)
        assert not serializer.is_valid()
        assert "fsec_step_other" in serializer.errors


@pytest.mark.unit
class TestFaPatchSerializer:
    """Tests du serializer PATCH partiel."""

    def test_valid_single_field(self):
        """Test PATCH avec un seul champ."""
        data = {"discoverer": "Marie Martin"}
        serializer = FaPatchSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["discoverer"] == "Marie Martin"

    def test_valid_empty_payload(self):
        """Test PATCH vide (aucun champ à modifier)."""
        serializer = FaPatchSerializer(data={})
        assert serializer.is_valid()

    def test_valid_multiple_fields(self):
        """Test PATCH avec plusieurs champs."""
        data = {
            "discoverer": "Nouveau",
            "cause": "Cause identifiée",
            "type_id": 2,
            "criticality_id": 1,
        }
        serializer = FaPatchSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_too_long_cause(self):
        """Test rejet si cause dépasse 4000 chars."""
        data = {"cause": "x" * 4001}
        serializer = FaPatchSerializer(data=data)
        assert not serializer.is_valid()
        assert "cause" in serializer.errors

    def test_accepts_null_nullable_fields(self):
        """Test acceptation de null pour remettre un champ à zéro."""
        data = {"type_id": None, "criticality_id": None, "cause": None}
        serializer = FaPatchSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_invalid_date(self):
        """Test rejet d'une date invalide."""
        data = {"event_date": "invalid"}
        serializer = FaPatchSerializer(data=data)
        assert not serializer.is_valid()
        assert "event_date" in serializer.errors


@pytest.mark.unit
class TestFaValidatePhaseSerializer:
    """Tests du serializer de validation de phase."""

    def test_valid_with_name_and_date(self):
        """Test validation complète."""
        data = {"validator_name": "Chef Labo", "validation_date": "2025-02-01"}
        serializer = FaValidatePhaseSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_with_name_only(self):
        """Test validation sans date (sera défaut today côté service)."""
        data = {"validator_name": "Chef Labo"}
        serializer = FaValidatePhaseSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_accepts_empty_payload(self):
        """Le serializer ne juge plus la presence du validateur : c'est le service
        qui exige validator_name OU validator_user_uuid (avec validation role
        stricte). Le serializer ne doit donc plus rejeter un payload vide.
        """
        serializer = FaValidatePhaseSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_accepts_only_validator_user_uuid(self):
        """Acceptation d'une validation par FK uniquement (cas standard apres bascule UI)."""
        data = {"validator_user_uuid": "11111111-1111-1111-1111-111111111111"}
        serializer = FaValidatePhaseSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_rejects_too_long_validator_name(self):
        """Test rejet si nom dépasse 100 chars."""
        data = {"validator_name": "x" * 101}
        serializer = FaValidatePhaseSerializer(data=data)
        assert not serializer.is_valid()
        assert "validator_name" in serializer.errors

    def test_rejects_invalid_date(self):
        """Test rejet d'une date invalide."""
        data = {"validator_name": "Chef", "validation_date": "not-a-date"}
        serializer = FaValidatePhaseSerializer(data=data)
        assert not serializer.is_valid()
        assert "validation_date" in serializer.errors


@pytest.mark.unit
class TestFaCloseSerializer:
    """Tests du serializer de fermeture FA."""

    def test_valid_full_payload(self):
        """Test fermeture complète."""
        data = {
            "validator_name": "IEC + Chef",
            "closure_validation": "Problème résolu, retour normal",
            "closure_date": "2025-03-01",
        }
        serializer = FaCloseSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_valid_name_only(self):
        """Test fermeture avec uniquement le nom (closure_validation et date optionnels)."""
        data = {"validator_name": "IEC"}
        serializer = FaCloseSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_accepts_empty_payload(self):
        """La verification 'au moins un validateur fourni' est faite cote service."""
        serializer = FaCloseSerializer(data={})
        assert serializer.is_valid(), serializer.errors

    def test_rejects_too_long_closure_validation(self):
        """Test rejet si closure_validation dépasse 4000 chars."""
        data = {"validator_name": "IEC", "closure_validation": "x" * 4001}
        serializer = FaCloseSerializer(data=data)
        assert not serializer.is_valid()
        assert "closure_validation" in serializer.errors

    def test_rejects_invalid_closure_date(self):
        """Test rejet d'une date invalide."""
        data = {"validator_name": "IEC", "closure_date": "bad-date"}
        serializer = FaCloseSerializer(data=data)
        assert not serializer.is_valid()
        assert "closure_date" in serializer.errors


@pytest.mark.unit
class TestFaPhotoUploadSerializer:
    """Tests du serializer d'upload d'une photo de galerie FA."""

    def test_valid_png_passes(self):
        serializer = FaPhotoUploadSerializer(data={"image": _png_upload()})
        assert serializer.is_valid(), serializer.errors

    def test_caption_is_optional(self):
        serializer = FaPhotoUploadSerializer(data={"image": _png_upload()})
        assert serializer.is_valid(), serializer.errors

    def test_caption_accepted(self):
        serializer = FaPhotoUploadSerializer(
            data={"image": _png_upload(), "caption": "Vue de l'anomalie"}
        )
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["caption"] == "Vue de l'anomalie"

    def test_image_required(self):
        serializer = FaPhotoUploadSerializer(data={"caption": "x"})
        assert not serializer.is_valid()
        assert "image" in serializer.errors

    def test_rejects_non_image(self):
        """Un fichier non-image est rejeté par Pillow (ImageField)."""
        bad = SimpleUploadedFile("x.png", b"not-an-image", content_type="image/png")
        serializer = FaPhotoUploadSerializer(data={"image": bad})
        assert not serializer.is_valid()
        assert "image" in serializer.errors

    def test_rejects_disallowed_real_format(self):
        """Un format réel non autorisé (GIF) est rejeté.

        Le content_type vérifié est celui détecté par Pillow (et non l'en-tête
        fourni par le client), donc un vrai GIF est bien rejeté.
        """
        buf = io.BytesIO()
        Image.new("RGB", (2, 2), "blue").save(buf, format="GIF")
        gif = SimpleUploadedFile("p.gif", buf.getvalue(), content_type="image/gif")
        serializer = FaPhotoUploadSerializer(data={"image": gif})
        assert not serializer.is_valid()
        assert "image" in serializer.errors

    def test_rejects_oversized_image(self):
        """Une image dépassant la taille max est rejetée."""
        upload = _png_upload()
        upload.size = FA_PHOTO_MAX_BYTES + 1
        serializer = FaPhotoUploadSerializer(data={"image": upload})
        assert not serializer.is_valid()
        assert "image" in serializer.errors
