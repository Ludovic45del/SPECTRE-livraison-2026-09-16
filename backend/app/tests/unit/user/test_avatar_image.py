"""Tests unitaires de la normalisation des avatars (process_avatar)."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from app.core.avatar_image import AVATAR_SIZE, process_avatar


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
class TestProcessAvatar:
    def test_outputs_square_jpeg_at_avatar_size(self):
        upload = _upload(Image.new("RGB", (800, 600), "red"))

        result = process_avatar(upload)

        assert result.name.endswith(".jpg")
        out = _reopen(result)
        assert out.format == "JPEG"
        assert out.size == (AVATAR_SIZE, AVATAR_SIZE)

    def test_non_square_is_cropped_square(self):
        # Image très large : doit être recadrée carrée (pas déformée).
        upload = _upload(Image.new("RGB", (1000, 200), "blue"))

        out = _reopen(process_avatar(upload))

        assert out.width == out.height == AVATAR_SIZE

    def test_small_image_is_upscaled_to_avatar_size(self):
        upload = _upload(Image.new("RGB", (48, 48), "green"))

        out = _reopen(process_avatar(upload))

        assert out.size == (AVATAR_SIZE, AVATAR_SIZE)

    def test_rgba_is_flattened_to_opaque_rgb(self):
        # PNG transparent → sortie JPEG opaque (mode RGB, pas d'alpha).
        upload = _upload(Image.new("RGBA", (300, 300), (0, 128, 255, 0)))

        out = _reopen(process_avatar(upload))

        assert out.mode == "RGB"

    def test_output_carries_no_exif(self):
        out = _reopen(process_avatar(_upload(Image.new("RGB", (256, 256), "white"))))

        # exif_transpose suivi d'un ré-encodage sans passer d'EXIF → aucune métadonnée.
        assert not out.getexif()

    def test_output_is_compact(self):
        # Avatar carré 256px JPEG → quelques Ko, bien en dessous de 200 Ko.
        result = process_avatar(_upload(Image.new("RGB", (1200, 1200), "red")))

        assert len(result.read()) < 200 * 1024
