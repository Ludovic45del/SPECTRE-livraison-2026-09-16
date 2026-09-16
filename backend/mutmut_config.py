"""
mutmut configuration for SPECTRE backend.

Targets domain services only (pure business logic, no ORM/HTTP).
"""


def pre_mutation(context):
    """Skip files that are not domain services."""
    if "/domain/" not in context.filename or "/services/" not in context.filename:
        context.skip = True
        return

    if context.filename.endswith("__init__.py"):
        context.skip = True
