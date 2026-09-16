"""Migration: Planning audit refactor.

Changes:
- PlanningCampaignStepEntity: campaign_uuid (UUIDField) -> campaign (ForeignKey)
  (same DB column 'campaign_uuid', adds FK constraint + referential integrity)
- Replace all unique_together with UniqueConstraint
- Add choices on step_label in CellAnnotation and FsecCellLink
- Add composite index on MemberPeriod (start_date, end_date)
"""

import django.db.models.deletion
from django.db import connection, migrations, models


def add_fk_constraint(apps, schema_editor):
    """Add FK constraint only on PostgreSQL (SQLite handles FKs via CREATE TABLE)."""
    if connection.vendor != "sqlite":
        schema_editor.execute(
            'ALTER TABLE "PLANNING_CAMPAIGN_STEP" '
            'ADD CONSTRAINT "fk_campaign_step_campaign" '
            'FOREIGN KEY ("campaign_uuid") '
            'REFERENCES "CAMPAIGN" ("uuid") '
            "DEFERRABLE INITIALLY DEFERRED;"
        )


def drop_fk_constraint(apps, schema_editor):
    if connection.vendor != "sqlite":
        schema_editor.execute(
            'ALTER TABLE "PLANNING_CAMPAIGN_STEP" '
            'DROP CONSTRAINT IF EXISTS "fk_campaign_step_campaign";'
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0023_planning_indexes_and_choices"),
    ]

    operations = [
        # ============================================================
        # 0. Drop CampaignStep unique_together & index BEFORE renaming
        #    field (both internally reference 'campaign_uuid')
        # ============================================================
        migrations.AlterUniqueTogether(
            name="planningcampaignstepentity",
            unique_together=set(),
        ),
        migrations.RemoveIndex(
            model_name="planningcampaignstepentity",
            name="PLANNING_CA_campaig_da17a4_idx",
        ),
        # ============================================================
        # 1. PlanningCampaignStepEntity: campaign_uuid -> campaign FK
        #    The DB column stays 'campaign_uuid', we just add a FK constraint.
        # ============================================================
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="planningcampaignstepentity",
                    name="campaign_uuid",
                ),
                migrations.AddField(
                    model_name="planningcampaignstepentity",
                    name="campaign",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        db_column="campaign_uuid",
                        related_name="planning_campaign_steps",
                        to="app.campaignentity",
                    ),
                    preserve_default=False,
                ),
            ],
            database_operations=[
                migrations.RunPython(add_fk_constraint, drop_fk_constraint),
            ],
        ),
        # ============================================================
        # 2. Replace unique_together with UniqueConstraint
        # ============================================================
        # WeekState
        migrations.AlterUniqueTogether(
            name="planningweekstateentity",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="planningweekstateentity",
            constraint=models.UniqueConstraint(
                fields=["year", "week_num"],
                name="uq_planning_week_state_year_week",
            ),
        ),
        # CellAnnotation
        migrations.AlterUniqueTogether(
            name="planningcellannotationentity",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="planningcellannotationentity",
            constraint=models.UniqueConstraint(
                fields=["campaign", "step_label", "year", "week_num"],
                name="uq_planning_cell_annotation_composite",
            ),
        ),
        # FsecCellLink
        migrations.AlterUniqueTogether(
            name="planningfseccelllinkentity",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="planningfseccelllinkentity",
            constraint=models.UniqueConstraint(
                fields=["campaign", "step_label", "year", "week_num", "fsec_uuid"],
                name="uq_planning_fsec_cell_link_composite",
            ),
        ),
        # CampaignStep (unique_together already dropped above, add new constraint)
        migrations.AddConstraint(
            model_name="planningcampaignstepentity",
            constraint=models.UniqueConstraint(
                fields=["campaign", "step_label", "fsec_uuid"],
                name="uq_planning_campaign_step_composite",
            ),
        ),
        # LabMachine
        migrations.AlterUniqueTogether(
            name="labmachineentity",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="labmachineentity",
            constraint=models.UniqueConstraint(
                fields=["salle", "name"],
                name="uq_planning_lab_machine_salle_name",
            ),
        ),
        # ============================================================
        # 3. Add choices on step_label where missing
        # ============================================================
        migrations.AlterField(
            model_name="planningcellannotationentity",
            name="step_label",
            field=models.CharField(
                max_length=50,
                choices=[
                    ("Assemblage", "Assemblage"),
                    ("Metrologie", "Metrologie"),
                    ("Livraison", "Livraison"),
                    ("Tir", "Tir"),
                    ("Reception cibles", "Reception cibles"),
                    ("Gaz", "Gaz"),
                ],
            ),
        ),
        migrations.AlterField(
            model_name="planningfseccelllinkentity",
            name="step_label",
            field=models.CharField(
                max_length=50,
                choices=[
                    ("Assemblage", "Assemblage"),
                    ("Metrologie", "Metrologie"),
                    ("Livraison", "Livraison"),
                    ("Tir", "Tir"),
                    ("Reception cibles", "Reception cibles"),
                    ("Gaz", "Gaz"),
                ],
            ),
        ),
        # ============================================================
        # 4. Add composite date index on MemberPeriod
        # ============================================================
        migrations.AddIndex(
            model_name="planningmemberperiodentity",
            index=models.Index(
                fields=["start_date", "end_date"],
                name="idx_member_period_dates",
            ),
        ),
        # ============================================================
        # 5. Add campaign_step index using new FK field name
        #    (RemoveIndex already done in step 0 above)
        # ============================================================
        migrations.AddIndex(
            model_name="planningcampaignstepentity",
            index=models.Index(
                fields=["campaign"],
                name="idx_campaign_step_campaign",
            ),
        ),
    ]
