"""Normalisation des photos de profil (avatars).

La compression côté navigateur (cf. frontend `shared/lib/compressImage`) réduit
déjà le poids avant l'upload, mais on ne lui fait pas confiance : le serveur
re-traite systématiquement l'image reçue pour garantir un avatar petit, carré et
sans métadonnée, quel que soit le client (upload direct via l'API, navigateur
sans canvas, etc.).

Traitement appliqué :
  1. Redressement EXIF (photos prises en portrait) puis suppression des EXIF.
  2. Aplatissement de la transparence sur fond blanc (sortie JPEG opaque).
  3. Recadrage carré centré + redimensionnement à AVATAR_SIZE (pas d'upscale
     au-delà de la source si elle est plus petite).
  4. Ré-encodage JPEG compressé (`optimize`, qualité fixe) → quelques Ko.
"""

import io
import uuid as uuid_lib

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# Côté final de l'avatar carré, en pixels. 256 px couvre tous les usages UI
# (Avatar 56 px @home, 32 px sidebar, popovers) y compris en écran Retina.
AVATAR_SIZE = 256

# Qualité JPEG : 82 = même compromis que la compression Canvas côté client.
AVATAR_JPEG_QUALITY = 82


def process_avatar(uploaded_file) -> ContentFile:
    """Normalise une image uploadée en avatar JPEG carré compressé.

    Args:
        uploaded_file: fichier image validé par le serializer (UploadedFile).

    Returns:
        ContentFile JPEG prêt à être assigné à un ImageField.

    Raises:
        OSError / PIL.UnidentifiedImageError: si l'image n'est pas décodable.
            Le serializer (ImageField) a déjà rejeté les non-images en amont ;
            ce garde-fou couvre les cas de fichiers tronqués.
    """
    image = Image.open(uploaded_file)

    # Redresse selon l'orientation EXIF, puis on repart d'une image sans EXIF
    # (exif_transpose ne propage pas les métadonnées au résultat).
    image = ImageOps.exif_transpose(image)

    # Aplatit alpha/palette sur fond blanc pour une sortie JPEG opaque propre.
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        background.alpha_composite(image)
        image = background.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")

    # Recadrage carré centré + resize en une passe (Lanczos = meilleur rendu).
    image = ImageOps.fit(image, (AVATAR_SIZE, AVATAR_SIZE), method=Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=AVATAR_JPEG_QUALITY, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{uuid_lib.uuid4().hex}.jpg")
