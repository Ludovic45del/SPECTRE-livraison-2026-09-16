"""DB-2: Add composite index on FsecEntity for campaign_id + is_active."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "app",
            "0026_rename_idx_campaign_step_campaign_planning_ca_campaig_da17a4_idx_and_more",
        ),
    ]

    operations = [
        migrations.AddIndex(
            model_name="fsecentity",
            index=models.Index(
                fields=["campaign_id", "is_active"],
                name="idx_fsec_campaign_active",
            ),
        ),
    ]
