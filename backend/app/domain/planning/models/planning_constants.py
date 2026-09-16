"""Constantes metier du module Planning - Source unique de verite."""


class WeekStateEnum:
    """Etats possibles d'une semaine."""

    VACANCES = "vacances"
    FERMETURE = "fermeture"

    CHOICES = [VACANCES, FERMETURE]


class StepLabelEnum:
    """Labels des etapes de campagne."""

    ASSEMBLAGE = "Assemblage"
    METROLOGIE = "Métrologie"
    LIVRAISON = "Livraison"
    TIR = "Tir"
    RECEPTION_CIBLES = "Réception cibles"
    GAZ = "Gaz"

    CHOICES = [ASSEMBLAGE, METROLOGIE, LIVRAISON, TIR, RECEPTION_CIBLES, GAZ]


class PeriodTypeEnum:
    """Types de periodes d'indisponibilite."""

    CONGES = "congés"
    MISSION = "mission"
    FORMATION = "formation"
    RTT = "rtt"
    MALADIE = "maladie"
    TELETRAVAIL = "télétravail"

    CHOICES = [CONGES, MISSION, FORMATION, RTT, MALADIE, TELETRAVAIL]


class LabEventCategoryEnum:
    """Categories d'evenements labo."""

    MAINTENANCE = "Maintenance"
    PANNE = "Panne"
    INSTALLATION = "Installation"
    CALIBRATION = "Calibration"
    NETTOYAGE = "Nettoyage"
    AUTRE = "Autre"

    CHOICES = [MAINTENANCE, PANNE, INSTALLATION, CALIBRATION, NETTOYAGE, AUTRE]


# Backward compatibility aliases
WEEK_STATE_CHOICES = WeekStateEnum.CHOICES
STEP_LABEL_CHOICES = StepLabelEnum.CHOICES
PERIOD_TYPE_CHOICES = PeriodTypeEnum.CHOICES
LAB_EVENT_CATEGORY_CHOICES = LabEventCategoryEnum.CHOICES
