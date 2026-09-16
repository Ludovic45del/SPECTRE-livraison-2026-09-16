"""Data migration : backfill des FK user sur CampaignTeams + FsecTeams.

Pour les roles "internes" (RCE/IEC pour Campaign, RCE/IEC/ASSEMBLEUR/METROLOGUE/
OPERATEUR_PHOTOS pour FSEC), tente de matcher le name texte vers un UserProfile
via match_user_profile, et vide le name si succes.

Pour les roles externes (MOE pour Campaign, MOE/TCI pour FSEC) : laisse name
inchange, user reste NULL.

Idempotente : skip les lignes ou la FK est deja renseignee.
"""

from django.db import migrations

from app.domain.campaign.models.campaign_team_constants import (
    CAMPAIGN_FREE_TEXT_ROLE_IDS,
)
from app.domain.fsec.models.fsec_team_constants import FSEC_FREE_TEXT_ROLE_IDS
from app.migrations._user_lookup_helper import match_user_profile


def _backfill_campaign(apps):
    Model = apps.get_model("app", "CampaignTeamsEntity")
    rows = (
        Model.objects.exclude(role_id__in=list(CAMPAIGN_FREE_TEXT_ROLE_IDS))
        .exclude(name__isnull=True)
        .exclude(name="")
        .filter(user__isnull=True)
    )
    for row in rows.iterator(chunk_size=500):
        matched_uuid = match_user_profile(apps, row.name)
        if matched_uuid:
            row.user_id = matched_uuid
            row.name = None
            row.save(update_fields=["user", "name"])


def _backfill_fsec(apps):
    Model = apps.get_model("app", "FsecTeamsEntity")
    rows = (
        Model.objects.exclude(role_id__in=list(FSEC_FREE_TEXT_ROLE_IDS))
        .exclude(name__isnull=True)
        .exclude(name="")
        .filter(user__isnull=True)
    )
    for row in rows.iterator(chunk_size=500):
        matched_uuid = match_user_profile(apps, row.name)
        if matched_uuid:
            row.user_id = matched_uuid
            row.name = None
            row.save(update_fields=["user", "name"])


def forwards(apps, schema_editor):
    _backfill_campaign(apps)
    _backfill_fsec(apps)


def reverse(apps, schema_editor):
    """Reverse : remet user_id a NULL. Le name reste tel quel (pas de perte)."""
    for entity_label in ("CampaignTeamsEntity", "FsecTeamsEntity"):
        Model = apps.get_model("app", entity_label)
        Model.objects.exclude(user__isnull=True).update(user=None)


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0055_teams_add_user_fk_and_relax_name"),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
