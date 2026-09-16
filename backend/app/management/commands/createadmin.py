"""Commande de creation du premier compte chef de laboratoire (admin)."""

from django.core.management.base import BaseCommand

from app.domain.user.models.user_bean import ROLE_CHEF_LABO, UserBean
from app.domain.user.services import user_service
from app.repository.user.repositories.user_repository import UserRepository


class Command(BaseCommand):
    help = "Cree le premier compte chef de laboratoire (admin)"

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Nom d'utilisateur")
        parser.add_argument("--first-name", type=str, default="")
        parser.add_argument("--last-name", type=str, default="")
        parser.add_argument(
            "--password",
            type=str,
            default=None,
            help="Mot de passe (genere automatiquement si omis)",
        )

    def handle(self, *args, **options):
        repository = UserRepository()
        bean = UserBean(
            username=options["username"],
            first_name=options["first_name"],
            last_name=options["last_name"],
            roles=[ROLE_CHEF_LABO],
        )

        try:
            created_bean, password = user_service.create_user(
                repository,
                bean,
                password=options.get("password"),
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return

        self.stdout.write(
            self.style.SUCCESS("\nCompte chef de laboratoire cree avec succes :")
        )
        self.stdout.write(f"  Username : {created_bean.username}")
        self.stdout.write("  Role     : Chef de laboratoire")
        self.stdout.write(f"  Mot de passe temporaire : {password}")
        self.stdout.write(
            self.style.WARNING(
                "\n  Communiquez ce mot de passe oralement a l'utilisateur."
                "\n  Il devra le changer a la premiere connexion."
            )
        )
