"""Migration: Convert member periods from week-based to date-based."""

import datetime

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0019_labmachineentity_labsalleentity_labevententity_and_more"),
    ]

    operations = [
        # 1. Remove unique_together constraint
        migrations.AlterUniqueTogether(
            name="planningmemberperiodentity",
            unique_together=set(),
        ),
        # 2. Remove week_num field
        migrations.RemoveField(
            model_name="planningmemberperiodentity",
            name="week_num",
        ),
        # 3. Add start_date with default (for existing rows)
        migrations.AddField(
            model_name="planningmemberperiodentity",
            name="start_date",
            field=models.DateField(default=datetime.date(2026, 1, 1)),
            preserve_default=False,
        ),
        # 4. Add end_date with default (for existing rows)
        migrations.AddField(
            model_name="planningmemberperiodentity",
            name="end_date",
            field=models.DateField(default=datetime.date(2026, 1, 1)),
            preserve_default=False,
        ),
    ]
