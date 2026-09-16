"""
Exceptions partagées pour le domaine SPECTRE.

Ce module centralise toutes les exceptions métier pour éviter
la duplication dans chaque service.
"""


class DomainException(Exception):
    """Exception de base pour le domaine."""

    pass


class NotFoundException(DomainException):
    """Exception levée quand une ressource n'est pas trouvée."""

    def __init__(self, resource: str, identifier: str):
        self.resource = resource
        self.identifier = identifier
        super().__init__(f"{resource} avec l'identifiant '{identifier}' non trouvé")


class ConflictException(DomainException):
    """Exception levée en cas de conflit (doublon)."""

    def __init__(self, field: str, value: str):
        self.field = field
        self.value = value
        super().__init__(f"Conflit sur le champ '{field}' avec la valeur '{value}'")


class ValidationException(DomainException):
    """Exception levée en cas d'erreur de validation."""

    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"Validation échouée sur '{field}': {message}")


class InvalidDataException(DomainException):
    """Exception levée quand les données sont invalides."""

    def __init__(self, message: str):
        super().__init__(f"Données invalides: {message}")


class ForbiddenException(DomainException):
    """Exception levée quand l'utilisateur n'a pas le droit d'effectuer l'action.

    À la différence de NotFoundException, la ressource existe et est visible :
    c'est l'action demandée qui est refusée (ex. action réservée au propriétaire).
    """

    def __init__(self, message: str):
        self.message = message
        super().__init__(f"Action non autorisée: {message}")
