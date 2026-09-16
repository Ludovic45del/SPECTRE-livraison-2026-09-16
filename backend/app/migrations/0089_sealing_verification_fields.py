"""Vérification du scellement (R23-B) : statut OK/NOK + remarque sur SEALING_STEP.

`verification_status` : 'OK' / 'NOK', null = non vérifié (même pattern que
`phase` sur AIRTIGHTNESS_TEST_LP_STEP). `verification_remark` : remarque libre.
Réversible nativement (AddField).
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0088_add_verification_scellement_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="sealingstepentity",
            name="verification_status",
            field=models.CharField(
                blank=True,
                choices=[("OK", "OK"), ("NOK", "NOK")],
                max_length=3,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="sealingstepentity",
            name="verification_remark",
            field=models.TextField(blank=True, max_length=4000, null=True),
        ),
    ]
