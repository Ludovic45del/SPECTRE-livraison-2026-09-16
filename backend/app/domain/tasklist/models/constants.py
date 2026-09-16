"""Constantes du module Listes de tâches partagées."""

# Priorités des tâches
PRIORITY_LOW = "low"
PRIORITY_NORMAL = "normal"
PRIORITY_HIGH = "high"
PRIORITY_CRITICAL = "critical"

PRIORITY_CHOICES = [
    (PRIORITY_LOW, "Basse"),
    (PRIORITY_NORMAL, "Normale"),
    (PRIORITY_HIGH, "Haute"),
    (PRIORITY_CRITICAL, "Critique"),
]

VALID_PRIORITIES = {value for value, _ in PRIORITY_CHOICES}

# Couleurs d'accent d'une liste (rendu côté frontend)
LIST_COLOR_DEFAULT = "default"

LIST_COLOR_CHOICES = [
    (LIST_COLOR_DEFAULT, "Par défaut"),
    ("blue", "Bleu"),
    ("green", "Vert"),
    ("orange", "Orange"),
    ("purple", "Violet"),
    ("red", "Rouge"),
]

VALID_LIST_COLORS = {value for value, _ in LIST_COLOR_CHOICES}

# Limites métier
MAX_LIST_NAME_LENGTH = 120
MAX_LIST_DESCRIPTION_LENGTH = 2000
MAX_TASK_TITLE_LENGTH = 300
MAX_TASK_NOTE_LENGTH = 4000
MAX_COMMENT_LENGTH = 2000
MAX_MEMBERS_PER_LIST = 30
