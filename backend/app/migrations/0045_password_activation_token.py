from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0044_seed_admin_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofileentity",
            name="password_token_version",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
