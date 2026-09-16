from pathlib import Path

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from app.core.permissions import ALL_ROLES
from app.management.commands.database_util import insert_csv_into_table

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class Command(BaseCommand):
    help = "Initialize database with reference data"

    def handle(self, *args, **options):
        # Create RBAC groups (S-1)
        self.stdout.write(self.style.NOTICE("=== Initializing RBAC groups ==="))
        for role_name in ALL_ROLES:
            group, created = Group.objects.get_or_create(name=role_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created group: {role_name}"))
            else:
                self.stdout.write(f"  Group already exists: {role_name}")
        self.stdout.write(
            self.style.NOTICE("=== Initializing CAMPAIGN referentials ===")
        )

        # CAMPAIGN Referentials (ordre important : pas de FK)
        insert_csv_into_table(
            self,
            "CAMPAIGN_STATUS",
            DATA_DIR / "campaign" / "campaign_status.csv",
        )
        insert_csv_into_table(
            self,
            "CAMPAIGN_TYPES",
            DATA_DIR / "campaign" / "campaign_types.csv",
        )
        insert_csv_into_table(
            self,
            "CAMPAIGN_INSTALLATIONS",
            DATA_DIR / "campaign" / "campaign_installations.csv",
        )
        insert_csv_into_table(
            self,
            "CAMPAIGN_ROLES",
            DATA_DIR / "campaign" / "campaign_roles.csv",
        )
        insert_csv_into_table(
            self,
            "CAMPAIGN_DOCUMENT_TYPES",
            DATA_DIR / "campaign" / "campaign_document_types.csv",
        )
        insert_csv_into_table(
            self,
            "CAMPAIGN_DOCUMENT_SUBTYPES",
            DATA_DIR / "campaign" / "campaign_document_subtypes.csv",
        )

        self.stdout.write(self.style.NOTICE("=== Initializing FSEC referentials ==="))

        # FSEC Referentials (ordre important : pas de FK)
        insert_csv_into_table(
            self,
            "FSEC_CATEGORY",
            DATA_DIR / "fsec" / "fsec_category.csv",
        )
        insert_csv_into_table(
            self,
            "FSEC_STATUS",
            DATA_DIR / "fsec" / "fsec_status.csv",
        )
        insert_csv_into_table(
            self,
            "FSEC_RACK",
            DATA_DIR / "fsec" / "fsec_racks.csv",
        )
        insert_csv_into_table(
            self,
            "FSEC_ROLES",
            DATA_DIR / "fsec" / "fsec_roles.csv",
        )
        insert_csv_into_table(
            self,
            "FSEC_DOCUMENT_TYPES",
            DATA_DIR / "fsec" / "fsec_document_types.csv",
        )
        insert_csv_into_table(
            self,
            "FSEC_DOCUMENT_SUBTYPES",
            DATA_DIR / "fsec" / "fsec_document_subtypes.csv",
        )

        self.stdout.write(self.style.NOTICE("=== Initializing STEPS referentials ==="))

        # STEPS Referentials
        insert_csv_into_table(
            self,
            "METROLOGY_MACHINE",
            DATA_DIR / "fsec" / "metrology_machine.csv",
        )
        insert_csv_into_table(
            self,
            "ASSEMBLY_BENCH",
            DATA_DIR / "fsec" / "fsec_assembly_benches.csv",
        )

        self.stdout.write(
            self.style.SUCCESS("=== Referential data initialized successfully ===")
        )
        self.stdout.write(
            self.style.WARNING(
                "NOTE: CAMPAIGN, FSEC, CAMPAIGN_TEAMS, CAMPAIGN_DOCUMENTS, FSEC_TEAMS, "
                "FSEC_DOCUMENTS and STEPS data require existing parent records. "
                "Use 'python manage.py demo' to insert demo data with proper FK relationships."
            )
        )
