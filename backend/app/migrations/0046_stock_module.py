"""Migration initiale du module Stock — crée les 3 tables :

- STOCK_CATALOG_ITEM   : catalogue unifié (élément sérialisé OU consommable)
- STOCK_MOVEMENT       : historique des mouvements de stock (consommables)
- FSEC_ASSEMBLY_ITEM   : lignes du tableau récap d'une FSEC (lien Stock ↔ FSEC)

Voir CAHIER_DES_CHARGES_STOCK.md §3 et §7.
"""

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0045_password_activation_token"),
    ]

    operations = [
        # -------------------------------------------------------------------
        # 1. STOCK_CATALOG_ITEM
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="StockCatalogItemEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("element", "Élément sérialisé"),
                            ("consumable", "Consommable"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("pieces_elementaires", "Pièces élémentaires"),
                            ("structuration", "Structuration"),
                            ("structuration_speciale", "Structuration spéciale"),
                            ("structuration_ec", "Structuration EC"),
                            ("colles", "Colles"),
                            ("autres", "Autres"),
                        ],
                        max_length=50,
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                ("reference", models.CharField(blank=True, max_length=200, null=True)),
                (
                    "caracteristique",
                    models.CharField(blank=True, max_length=200, null=True),
                ),
                (
                    "type_de_colle",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                (
                    "fournisseur",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                (
                    "remarques",
                    models.TextField(blank=True, max_length=4000, null=True),
                ),
                ("unite", models.CharField(blank=True, max_length=50, null=True)),
                ("quantite", models.IntegerField(blank=True, default=0, null=True)),
                ("seuil_alerte", models.IntegerField(blank=True, null=True)),
                ("date_peremption", models.DateField(blank=True, null=True)),
                (
                    "type_d_achat",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                (
                    "installation",
                    models.CharField(
                        blank=True,
                        choices=[("LMJ", "LMJ"), ("OMEGA", "OMEGA")],
                        max_length=10,
                        null=True,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("dispo", "Disponible"),
                            ("reservee", "Réservée"),
                            ("affectee", "Affectée"),
                            ("tiree", "Tirée"),
                        ],
                        default="dispo",
                        max_length=20,
                        null=True,
                    ),
                ),
                (
                    "materiaux_mat",
                    models.CharField(blank=True, max_length=200, null=True),
                ),
                ("boite", models.CharField(blank=True, max_length=200, null=True)),
                (
                    "emplacement",
                    models.CharField(blank=True, max_length=200, null=True),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "STOCK_CATALOG_ITEM",
                "indexes": [
                    models.Index(fields=["kind"], name="stock_item_kind_idx"),
                    models.Index(fields=["category"], name="stock_item_category_idx"),
                    models.Index(fields=["status"], name="stock_item_status_idx"),
                    models.Index(fields=["is_active"], name="stock_item_active_idx"),
                    models.Index(
                        fields=["date_peremption"], name="stock_item_perem_idx"
                    ),
                ],
            },
        ),
        # CheckConstraint : quantite >= 0 (interdit stock négatif côté DB
        # en plus de la validation service). cf. CDC §13.
        migrations.AddConstraint(
            model_name="StockCatalogItemEntity",
            constraint=models.CheckConstraint(
                condition=models.Q(quantite__gte=0) | models.Q(quantite__isnull=True),
                name="stock_item_quantite_non_negative",
            ),
        ),
        # -------------------------------------------------------------------
        # 2. STOCK_MOVEMENT
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="StockMovementEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "movement_type",
                    models.CharField(
                        choices=[
                            ("entree", "Entrée"),
                            ("sortie", "Sortie"),
                            ("ajustement", "Ajustement"),
                        ],
                        max_length=20,
                    ),
                ),
                ("quantite_delta", models.IntegerField()),
                ("quantite_apres", models.IntegerField()),
                ("date", models.DateField()),
                ("remarque", models.TextField(blank=True, max_length=1000, null=True)),
                (
                    "auteur_name",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "catalog_item",
                    models.ForeignKey(
                        db_column="catalog_item_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="movements",
                        to="app.stockcatalogitementity",
                    ),
                ),
            ],
            options={
                "db_table": "STOCK_MOVEMENT",
                "ordering": ["-date", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["catalog_item", "-date"],
                        name="stock_mvmt_item_date_idx",
                    ),
                    models.Index(fields=["movement_type"], name="stock_mvmt_type_idx"),
                ],
            },
        ),
        # -------------------------------------------------------------------
        # 3. FSEC_ASSEMBLY_ITEM
        # -------------------------------------------------------------------
        migrations.CreateModel(
            name="FsecAssemblyItemEntity",
            fields=[
                (
                    "uuid",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("fsec_uuid", models.UUIDField()),
                ("sort_order", models.IntegerField(default=0)),
                ("remarque", models.TextField(blank=True, max_length=1000, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "catalog_item",
                    models.ForeignKey(
                        db_column="catalog_item_uuid",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="fsec_assembly_items",
                        to="app.stockcatalogitementity",
                    ),
                ),
            ],
            options={
                "db_table": "FSEC_ASSEMBLY_ITEM",
                "ordering": ["sort_order", "created_at"],
                "indexes": [
                    models.Index(fields=["fsec_uuid"], name="fsec_asm_item_fsec_idx"),
                    models.Index(
                        fields=["catalog_item"], name="fsec_asm_item_catalog_idx"
                    ),
                ],
                "constraints": [
                    models.UniqueConstraint(
                        fields=["fsec_uuid", "catalog_item"],
                        name="uq_fsec_assembly_item_fsec_item",
                    ),
                ],
            },
        ),
    ]
