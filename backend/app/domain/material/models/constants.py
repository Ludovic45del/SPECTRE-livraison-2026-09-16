"""Constantes du module Matériel."""

# Status d'une machine (cycle de vie matériel).
MACHINE_STATUS_IN_SERVICE = "in_service"
MACHINE_STATUS_OUT_OF_SERVICE = "out_of_service"
MACHINE_STATUS_UNDER_MAINTENANCE = "under_maintenance"

MACHINE_STATUS_CHOICES = [
    (MACHINE_STATUS_IN_SERVICE, "En service"),
    (MACHINE_STATUS_OUT_OF_SERVICE, "Hors service"),
    (MACHINE_STATUS_UNDER_MAINTENANCE, "En maintenance"),
]

VALID_MACHINE_STATUSES = {value for value, _ in MACHINE_STATUS_CHOICES}


# Type d'intervention de maintenance.
MAINTENANCE_TYPE_PREVENTIVE = "preventive"
MAINTENANCE_TYPE_CURATIVE = "curative"

MAINTENANCE_TYPE_CHOICES = [
    (MAINTENANCE_TYPE_PREVENTIVE, "Préventive"),
    (MAINTENANCE_TYPE_CURATIVE, "Curative"),
]

VALID_MAINTENANCE_TYPES = {value for value, _ in MAINTENANCE_TYPE_CHOICES}


# Codes des salles seedées (cf. migration 0062).
ROOM_CODES = ("B1", "B2", "A13")
