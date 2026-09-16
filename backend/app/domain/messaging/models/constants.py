"""Constantes du module Messagerie interne."""

# Types de conversation
KIND_DIRECT = "direct"
KIND_GROUP = "group"
KIND_CHOICES = [(KIND_DIRECT, "Privée"), (KIND_GROUP, "Groupe")]
VALID_KINDS = {KIND_DIRECT, KIND_GROUP}

# Types de message
MESSAGE_KIND_TEXT = "text"
MESSAGE_KIND_SYSTEM = "system"
MESSAGE_KIND_CHOICES = [(MESSAGE_KIND_TEXT, "Texte"), (MESSAGE_KIND_SYSTEM, "Système")]

# Limites métier
MAX_CONVERSATION_NAME_LENGTH = 120
MAX_MESSAGE_LENGTH = 4000  # caractères Unicode
MAX_MEMBERS_PER_CONVERSATION = 50  # propriétaire inclus
MESSAGE_PAGE_DEFAULT_LIMIT = 50
MESSAGE_PAGE_MAX_LIMIT = 100
LAST_MESSAGE_PREVIEW_LENGTH = 200

# Références d'entités attachées à un message (vague M3)
ENTITY_REF_FSEC = "fsec"
ENTITY_REF_CAMPAIGN = "campaign"
ENTITY_REF_FA = "fa"
ENTITY_REF_TYPE_CHOICES = [
    (ENTITY_REF_FSEC, "FSEC"),
    (ENTITY_REF_CAMPAIGN, "Campagne"),
    (ENTITY_REF_FA, "FA"),
]
VALID_ENTITY_REF_TYPES = {ENTITY_REF_FSEC, ENTITY_REF_CAMPAIGN, ENTITY_REF_FA}
MAX_ENTITY_REFS_PER_MESSAGE = 10
ENTITY_REF_LABEL_MAX_LENGTH = 150  # snapshot du libellé (survit à la suppression)
MENTIONS_DEFAULT_LIMIT = 20
MENTIONS_MAX_LIMIT = 50

# Pièces jointes, édition / suppression logique et recherche (vague M4)
MAX_ATTACHMENTS_PER_MESSAGE = 5
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 Mo
ALLOWED_ATTACHMENT_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "pdf",
    "txt",
    "csv",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "zip",
}
IMAGE_ATTACHMENT_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
SEARCH_MIN_LENGTH = 2
SEARCH_MAX_LENGTH = 100
SEARCH_DEFAULT_LIMIT = 20
SEARCH_MAX_LIMIT = 50
DELETED_MESSAGE_BODY = ""  # corps d'un message supprimé logiquement
