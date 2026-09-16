"""Conftest partagé pour les tests d'intégration.

Fournit des fixtures autouse pour seeder les tables référentielles
nécessaires aux tests qui créent des entités directement.
"""

import pytest
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.test import Client


@pytest.fixture(autouse=True)
def _reset_throttle_cache():
    """Empêche les throttles DRF de leak entre tests.

    Les PK utilisateurs peuvent être réassignées après rollback transactionnel ;
    le ScopedRateThrottle utilise la PK dans la clé de cache ⇒ sans reset, la
    N+1e requête d'un test est vue comme une suite des précédentes → 429 intempestif.
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client(db):
    """Client Django authentifié avec rôle operateur pour les tests API."""
    user, created = User.objects.get_or_create(username="testuser")
    if created:
        user.set_password("testpass")
        user.save()
    group, _ = Group.objects.get_or_create(name="operateur")
    user.groups.add(group)
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def admin_api_client(db):
    """Client Django authentifié avec rôle admin pour les tests nécessitant des droits élevés."""
    user, created = User.objects.get_or_create(username="adminuser")
    if created:
        user.set_password("adminpass")
        user.save()
    group, _ = Group.objects.get_or_create(name="admin")
    user.groups.add(group)
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture(autouse=True)
def seed_reference_data(db):
    """Seed les tables référentielles pour les tests d'intégration.

    Les migrations seed déjà les données Campaign (types, status, installations).
    Ici on seed les données FSEC (status, category, rack) qui n'ont pas de migration seed.
    """
    from app.repository.fsec.models.fsec_category_entity import FsecCategoryEntity
    from app.repository.fsec.models.fsec_rack_entity import FsecRackEntity
    from app.repository.fsec.models.fsec_status_entity import FsecStatusEntity

    # FSEC Status (0-16) — aligné sur le référentiel app/data/fsec/fsec_status.csv
    # (source de vérité du seed initdb) : mêmes ids, labels et couleurs.
    for id_, label, color in [
        (0, "Design", "#c3c3c3"),
        (1, "En cours d'assemblage", "#ecce18"),
        (2, "En attente de métrologie", "#7a8ce0"),
        (3, "En attente de scellement", "#a2d82b"),
        (4, "Photos à prendre", "#aa5485"),
        (5, "Disponible", "#2a5486"),
        (6, "Sur installation", "#2ee454"),
        (7, "Tirée", "#123456"),
        (8, "HS", "#FF0000"),
        (9, "Remplissage HP", "#FF0000"),
        (10, "Test étanchéité BP", "#FF0000"),
        (11, "Remplissage BP", "#FF0000"),
        (12, "Permeation", "#FF0000"),
        (13, "Depressurisation", "#FF0000"),
        (14, "Repressurisation", "#FF0000"),
        (15, "Décision MOE", "#64748b"),
        (16, "Vérification scellement", "#7cb342"),
    ]:
        FsecStatusEntity.objects.get_or_create(
            id=id_, defaults={"label": label, "color": color}
        )

    # FSEC Category
    for id_, label in [
        (0, "Sans gaz"),
        (1, "BP"),
        (2, "BP + HP"),
        (3, "Perméation + HP"),
        (4, "Perméation + BP + HP"),
    ]:
        FsecCategoryEntity.objects.get_or_create(id=id_, defaults={"label": label})

    # FSEC Rack
    for id_, label in [
        (0, "Rack A"),
        (1, "Rack B"),
        (2, "Rack C"),
    ]:
        FsecRackEntity.objects.get_or_create(id=id_, defaults={"label": label})
