"""Tests unitaires de la normalisation des signatures (process_signature)."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from app.core.signature_image import SIGNATURE_BOX, process_signature


def _upload(image: Image.Image, name="src.png", fmt="PNG", content_type="image/png"):
    buf = io.BytesIO()
    image.save(buf, format=fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=content_type)


def _reopen(content_file):
    """Rouvre le ContentFile retourné comme une image PIL."""
    data = content_file.read()
    content_file.seek(0)
    return Image.open(io.BytesIO(data))


@pytest.mark.unit
class TestProcessSignature:
    def test_outputs_png(self):
        result = process_signature(_upload(Image.new("RGB", (800, 300), "black")))

        assert result.name.endswith(".png")
        assert _reopen(result).format == "PNG"

    def test_preserves_alpha(self):
        # Signature détourée (RGBA transparente) → l'alpha est conservé (pas
        # d'aplatissement sur fond blanc, contrairement à l'avatar).
        upload = _upload(Image.new("RGBA", (600, 300), (0, 0, 0, 0)))

        assert _reopen(process_signature(upload)).mode in ("RGBA", "LA")

    def test_jpeg_source_converted_to_rgba_png(self):
        upload = _upload(
            Image.new("RGB", (600, 300), "white"),
            name="sig.jpg",
            fmt="JPEG",
            content_type="image/jpeg",
        )

        out = _reopen(process_signature(upload))
        assert out.format == "PNG"
        assert out.mode == "RGBA"

    def test_fits_within_box_preserving_ratio(self):
        # Image très large (ratio 5.0) : tient dans 600x300 sans déformation ni
        # recadrage → largeur bornée à 600, hauteur proportionnelle.
        out = _reopen(process_signature(_upload(Image.new("RGBA", (1000, 200)))))

        assert out.width <= SIGNATURE_BOX[0]
        assert out.height <= SIGNATURE_BOX[1]
        assert out.width == 600
        # Ratio d'origine (5.0) préservé.
        assert round(out.width / out.height, 1) == 5.0

    def test_output_carries_no_exif(self):
        out = _reopen(process_signature(_upload(Image.new("RGBA", (400, 200)))))

        assert not out.getexif()
