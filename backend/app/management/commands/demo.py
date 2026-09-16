from django.core import management
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Initialize reference data (wrapper around initdb)"

    def handle(self, *args, **options):
        try:
            management.call_command("initdb")
        except Exception as e:
            self.stderr.write(
                self.style.WARNING(
                    f"initdb reported errors (likely already seeded): {e}"
                )
            )
