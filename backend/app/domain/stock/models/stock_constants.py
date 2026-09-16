"""Constantes du module Stock (kinds, rubriques, statuts, mouvements, installations).

Ce module est l'unique source de vérité pour les enums côté backend. Les choices
Django sont dérivés de ces constantes pour garantir la cohérence Entity ↔ Service ↔ API.

Voir CAHIER_DES_CHARGES_STOCK.md §3.1, §3.2 et §4.6.
"""

# ---------------------------------------------------------------------------
# Kind d'item (sérialisé vs quantifié)
# ---------------------------------------------------------------------------
ITEM_KIND_ELEMENT = "element"
ITEM_KIND_CONSUMABLE = "consumable"

ITEM_KINDS = (ITEM_KIND_ELEMENT, ITEM_KIND_CONSUMABLE)

ITEM_KIND_CHOICES = (
    (ITEM_KIND_ELEMENT, "Élément sérialisé"),
    (ITEM_KIND_CONSUMABLE, "Consommable"),
)


# ---------------------------------------------------------------------------
# Rubriques (catégories métier figées) — cf. CDC §4.6
# ---------------------------------------------------------------------------
CATEGORY_PIECES_ELEMENTAIRES = "pieces_elementaires"
CATEGORY_STRUCTURATION = "structuration"
CATEGORY_COLLES = "colles"
CATEGORY_AUTRES = "autres"

CATEGORY_CHOICES = (
    (CATEGORY_PIECES_ELEMENTAIRES, "Pièces élémentaires"),
    (CATEGORY_STRUCTURATION, "Structuration"),
    (CATEGORY_COLLES, "Colles"),
    (CATEGORY_AUTRES, "Autres"),
)

# Mapping kind → rubriques autorisées (validé en service avant persistance).
CATEGORY_BY_KIND = {
    ITEM_KIND_ELEMENT: frozenset(
        {
            CATEGORY_PIECES_ELEMENTAIRES,
            CATEGORY_STRUCTURATION,
        }
    ),
    ITEM_KIND_CONSUMABLE: frozenset(
        {
            CATEGORY_COLLES,
            CATEGORY_AUTRES,
        }
    ),
}


# ---------------------------------------------------------------------------
# Types de structuration — sous-classification de la rubrique "structuration".
# Requis quand category == structuration, interdit (None) sinon.
# ---------------------------------------------------------------------------
STRUCTURATION_TYPE_STANDARD = "standard"
STRUCTURATION_TYPE_SPECIALE = "speciale"
STRUCTURATION_TYPE_EC = "ec"

STRUCTURATION_TYPES = (
    STRUCTURATION_TYPE_STANDARD,
    STRUCTURATION_TYPE_SPECIALE,
    STRUCTURATION_TYPE_EC,
)

STRUCTURATION_TYPE_CHOICES = (
    (STRUCTURATION_TYPE_STANDARD, "Standard"),
    (STRUCTURATION_TYPE_SPECIALE, "Spéciale"),
    (STRUCTURATION_TYPE_EC, "EC"),
)

# Création par lot ("paquet") de structurations : la numérotation (`name`) est
# automatique, globale et continue (max + 1). Borne haute du nombre de pièces
# créées en une seule fois.
STRUCTURATION_BATCH_MAX = 500


# ---------------------------------------------------------------------------
# Cycle de vie des éléments sérialisés — cf. CDC §4.1
# ---------------------------------------------------------------------------
ELEMENT_STATUS_DISPO = "dispo"
ELEMENT_STATUS_RESERVEE = "reservee"
ELEMENT_STATUS_AFFECTEE = "affectee"
ELEMENT_STATUS_TIREE = "tiree"

ELEMENT_STATUSES = (
    ELEMENT_STATUS_DISPO,
    ELEMENT_STATUS_RESERVEE,
    ELEMENT_STATUS_AFFECTEE,
    ELEMENT_STATUS_TIREE,
)

ELEMENT_STATUS_CHOICES = (
    (ELEMENT_STATUS_DISPO, "Disponible"),
    (ELEMENT_STATUS_RESERVEE, "Réservée"),
    (ELEMENT_STATUS_AFFECTEE, "Affectée"),
    (ELEMENT_STATUS_TIREE, "Tirée"),
)


# ---------------------------------------------------------------------------
# Types de mouvements de stock — cf. CDC §3.2
# ---------------------------------------------------------------------------
MOVEMENT_TYPE_ENTREE = "entree"
MOVEMENT_TYPE_SORTIE = "sortie"
MOVEMENT_TYPE_AJUSTEMENT = "ajustement"

MOVEMENT_TYPES = (MOVEMENT_TYPE_ENTREE, MOVEMENT_TYPE_SORTIE, MOVEMENT_TYPE_AJUSTEMENT)

MOVEMENT_TYPE_CHOICES = (
    (MOVEMENT_TYPE_ENTREE, "Entrée"),
    (MOVEMENT_TYPE_SORTIE, "Sortie"),
    (MOVEMENT_TYPE_AJUSTEMENT, "Ajustement"),
)


# ---------------------------------------------------------------------------
# Installations cibles (pour les éléments sérialisés)
# ---------------------------------------------------------------------------
INSTALLATION_LMJ = "LMJ"
INSTALLATION_OMEGA = "OMEGA"

INSTALLATIONS = (INSTALLATION_LMJ, INSTALLATION_OMEGA)

INSTALLATION_CHOICES = (
    (INSTALLATION_LMJ, "LMJ"),
    (INSTALLATION_OMEGA, "OMEGA"),
)


# ---------------------------------------------------------------------------
# Seuils & alertes
# ---------------------------------------------------------------------------
# Nombre de jours avant péremption à partir duquel l'alerte "expiring soon"
# se déclenche (cf. CDC §4.5).
EXPIRATION_WARNING_DAYS = 30


# ---------------------------------------------------------------------------
# IDs des statuts FSEC déclencheurs du couplage automatique — cf. CDC §4.2
# Source : backend/app/data/fsec/fsec_status.csv
# ---------------------------------------------------------------------------
FSEC_STATUS_ID_DESIGN = 0
FSEC_STATUS_ID_EN_COURS_ASSEMBLAGE = 1
FSEC_STATUS_ID_TIREE = 7
FSEC_STATUS_ID_HS = 8
FSEC_STATUS_ID_DECISION_MOE = 15
FSEC_STATUS_ID_VERIFICATION_SCELLEMENT = 16

# Statuts FSEC « de travail » : l'assemblage a démarré (ou est plus avancé),
# les éléments liés via le tableau récap sont considérés engagés → 'affectee'.
# Couvre 1 (En cours d'assemblage) à 6 (Sur installation), les étapes gaz
# 9..14 et 16 (Vérification scellement). Exclut 0 (Design), 7 (Tirée),
# 8 (HS) et 15 (Décision MOE).
FSEC_STATUS_IDS_ELEMENTS_AFFECTES = frozenset(
    {1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, FSEC_STATUS_ID_VERIFICATION_SCELLEMENT}
)

# Table de transition : statut FSEC → statut cible des éléments liés (CDC §4.2).
# - 0 (Design)            → 'reservee' (retour en arrière : les éléments redeviennent réservés)
# - 1..6, 9..14, 16       → 'affectee' (l'assemblage est engagé)
# - 7 (Tirée)             → 'tiree'    (terminal)
# - 8 (HS), 15 (Décision MOE) : absents → no-op (états de pause, on ne touche pas
#   aux statuts éléments)
# Le statut terminal 'tiree' n'est jamais dégradé en bulk : voir
# StockCatalogRepository.update_status_for_uuids.
ELEMENT_STATUS_BY_FSEC_STATUS = {
    FSEC_STATUS_ID_DESIGN: ELEMENT_STATUS_RESERVEE,
    FSEC_STATUS_ID_TIREE: ELEMENT_STATUS_TIREE,
    **{
        status_id: ELEMENT_STATUS_AFFECTEE
        for status_id in FSEC_STATUS_IDS_ELEMENTS_AFFECTES
    },
}


# ---------------------------------------------------------------------------
# Codes d'erreur métier exposés par le module Stock
# (utilisés comme `field` dans les ValidationException pour piloter
# l'enrichissement de code par ErrorHandlerMiddleware ou pour matching frontend)
# ---------------------------------------------------------------------------
ERROR_CODE_FSEC_LOCKED = "FSEC_LOCKED"
ERROR_CODE_ELEMENT_ALREADY_USED = "ELEMENT_ALREADY_USED"
ERROR_CODE_INVALID_KIND_OPERATION = "INVALID_KIND_OPERATION"
ERROR_CODE_INVALID_KIND_CATEGORY = "INVALID_KIND_CATEGORY"
ERROR_CODE_CATALOG_ITEM_IN_USE = "CATALOG_ITEM_IN_USE"
