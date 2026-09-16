"""Ajout created_at / updated_at sur les 8 tables du module planning."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0024_planning_audit_refactor"),
    ]

    operations = [
        # --- PlanningWeekStateEntity ---
        migrations.AddField(
            model_name="planningweekstateentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="planningweekstateentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- PlanningMemberPeriodEntity ---
        migrations.AddField(
            model_name="planningmemberperiodentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="planningmemberperiodentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- PlanningCellAnnotationEntity ---
        migrations.AddField(
            model_name="planningcellannotationentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="planningcellannotationentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- PlanningFsecCellLinkEntity ---
        migrations.AddField(
            model_name="planningfseccelllinkentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="planningfseccelllinkentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- PlanningCampaignStepEntity ---
        migrations.AddField(
            model_name="planningcampaignstepentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="planningcampaignstepentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- LabSalleEntity ---
        migrations.AddField(
            model_name="labsalleentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="labsalleentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- LabMachineEntity ---
        migrations.AddField(
            model_name="labmachineentity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="labmachineentity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
        # --- LabEventEntity ---
        migrations.AddField(
            model_name="labevententity",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="labevententity",
            name="updated_at",
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]
