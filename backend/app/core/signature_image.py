"""Normalisation des signatures utilisateur.

À la différence de l'avatar (carré opaque, cf. `app.core.avatar_image`), une
signature est destinée à être apposée dans une cellule VISA de la fiche de
livraison. On la traite donc différemment :

  1. Redressement EXIF (photo de signature prise au téléphone) puis suppression
     des métadonnées (exif_transpose ne les propage pas au résultat).
  2. Conservation du canal alpha (sortie PNG). Une signature détourée garde sa
     transparence ; une signature scannée sur fond blanc reste lisible — dans
     les deux cas la cellule du tableau n'est pas masquée par un bloc opaque.
  3. Mise à l'échelle « contain » dans une boîte rectangulaire (ratio préservé,
     pas de recadrage, pas d'upscale au-delà de la source).
  4. Ré-encodage PNG optimisé.

Le frontend n'effectue PAS de compression pour la signature (la compression
Canvas aplatit l'alpha en JPEG) : il envoie le fichier brut et le serveur le
normalise systématiquement ici, quel que soit le client.
"""

import io
import uuid as uuid_lib

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# Boîte englobante (largeur x hauteur) en pixels. Le ratio est préservé, donc
# la signature occupe au plus 600x300 — assez net pour un VISA ~18 mm de haut
# en impression, sans peser lourd sur le disque.
SIGNATURE_BOX = (600, 300)


def process_signature(uploaded_file) -> ContentFile:
    """Normalise une image uploadée en signature PNG transparente rectangulaire.

    Args:
        uploaded_file: fichier image validé par le serializer (UploadedFile).

    Returns:
        ContentFile PNG prêt à être assigné à un ImageField.

    Raises:
        OSError / PIL.UnidentifiedImageError: si l'image n'est pas décodable.
            Le serializer (ImageField) a déjà rejeté les non-images en amont ;
            ce garde-fou couvre les fichiers tronqués.
    """
    image = Image.open(uploaded_file)

    # Redresse selon l'orientation EXIF, puis repart d'une image sans EXIF.
    image = ImageOps.exif_transpose(image)

    # On garde l'alpha : RGBA pour la couleur, LA pour le niveau de gris alpha.
    if image.mode not in ("RGBA", "LA"):
        image = image.convert("RGBA")

    # « contain » : tient dans la boîte sans déformer ni recadrer (pas d'upscale).
    image = ImageOps.contain(image, SIGNATURE_BOX, method=Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{uuid_lib.uuid4().hex}.png")
