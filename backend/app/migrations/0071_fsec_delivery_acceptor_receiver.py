"""Fiche de livraison : nom accepteur (phase 1) + nom/date réceptionnaire (phase 2).

Phase 1 : dropdown utilisateur (FK auth.User, nullable).
Phase 2 : texte libre (le réceptionnaire peut ne pas avoir de compte) + date.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0070_fsec_delivery_validation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="fsecentity",
            name="delivery_acceptor_user",
            field=models.ForeignKey(
                blank=True,
                db_column="delivery_acceptor_user_id",
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="accepted_fsec_deliveries",
                to="auth.user",
            ),
        ),
        migrations.AddField(
            model_name="fsecentity",
            name="delivery_receiver_name",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="fsecentity",
            name="delivery_receiver_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
