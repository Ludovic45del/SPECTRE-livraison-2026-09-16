"""Constantes métier pour les Embases à gaz."""

VALID_EMBASE_TYPES = {"jet_de_gaz", "hp", "bp"}

EMBASE_TYPE_CHOICES = [
    ("jet_de_gaz", "Jet de Gaz"),
    ("hp", "HP"),
    ("bp", "BP"),
]

# Champs protégés (non modifiables via CSV ou patch)
PROTECTED_FIELDS = {
    "uuid",
    "created_at",
    "updated_at",
    "last_etalonnage_date",
    "last_etalonnage_date_v1",
    "last_etalonnage_date_v2",
}
