"""Management command to generate 100 FSECs for testing virtual scroll."""

import random
import uuid

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from app.repository.campaign.models.campaign_entity import CampaignEntity
from app.repository.fsec.models.fsec_category_entity import FsecCategoryEntity
from app.repository.fsec.models.fsec_entity import FsecEntity
from app.repository.fsec.models.fsec_status_entity import FsecStatusEntity


class Command(BaseCommand):
    help = "Clear all FSECs and generate 100 new ones for testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Autorise l'exécution hors mode DEBUG (destruction irréversible des FSECs).",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "generate_fsecs refuse de s'exécuter hors mode DEBUG car il supprime "
                "toutes les FSECs. Réexécuter avec --force pour forcer l'opération."
            )

        deleted_count = FsecEntity.objects.all().delete()[0]
        self.stdout.write(f"Deleted {deleted_count} existing FSECs")

        # Get referential data
        statuses = list(FsecStatusEntity.objects.all())
        categories = list(FsecCategoryEntity.objects.all())
        campaigns = list(CampaignEntity.objects.all())

        if not statuses or not categories:
            self.stdout.write(
                self.style.ERROR("Missing status or category referential data")
            )
            return

        # Generate 100 FSECs
        fsec_names = [
            "ALPHA",
            "BETA",
            "GAMMA",
            "DELTA",
            "EPSILON",
            "ZETA",
            "ETA",
            "THETA",
            "IOTA",
            "KAPPA",
            "LAMBDA",
            "MU",
            "NU",
            "XI",
            "OMICRON",
            "PI",
            "RHO",
            "SIGMA",
            "TAU",
            "UPSILON",
            "PHI",
            "CHI",
            "PSI",
            "OMEGA",
        ]

        created = 0
        for i in range(100):
            name_prefix = random.choice(fsec_names)
            name = f"{name_prefix}-{i+1:03d}"

            FsecEntity.objects.create(
                version_uuid=uuid.uuid4(),
                fsec_uuid=uuid.uuid4(),
                name=name,
                status_id=random.choice(statuses),
                category_id=random.choice(categories),
                campaign_id=random.choice(campaigns) if campaigns else None,
                comments=f"FSEC de test #{i+1} pour virtual scroll",
                is_active=True,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created} FSECs"))
