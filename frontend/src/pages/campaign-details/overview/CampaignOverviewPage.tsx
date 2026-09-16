/**
 * Campaign Overview Tab
 * @module pages/campaign-details/overview
 *
 * Orchestrates the overview sections: GeneralInfo, Statistics, Team, Dates.
 * Each section is a separate memoized component in ./components/.
 */

import { useMemo, memo } from 'react';
import { Grid } from '@mui/material';
import { CampaignWithRelations } from '@entities/campaign';
import { useFsecsByCampaign, FSEC_STATUS_ID, getFsecStatusRank } from '@entities/fsec';
import { ErrorBoundary } from '@shared/ui';
import { GeneralInfoSection, StatisticsSection, TeamSection, DatesSection } from './components';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignOverviewPageProps {
    campaign: CampaignWithRelations;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function CampaignOverviewPageComponent({ campaign }: CampaignOverviewPageProps) {
    const { data: fsecs, isLoading: isLoadingFsecs } = useFsecsByCampaign(campaign.uuid);

    const stats = useMemo(() => {
        if (!fsecs) return { total: 0, tirees: 0, pretes: 0, fabrication: 0, hs: 0, decisionMoe: 0 };

        return fsecs.reduce(
            (acc, fsec) => {
                acc.total++;
                const statusId = fsec.statusId;

                if (statusId === FSEC_STATUS_ID.TIREE) {
                    acc.tirees++;
                } else if (statusId === FSEC_STATUS_ID.DISPONIBLE || statusId === FSEC_STATUS_ID.SUR_INSTALLATION) {
                    acc.pretes++;
                } else if (
                    statusId !== null &&
                    // Fabrication : tout statut du workflow linéaire situé AVANT Disponible
                    // (Design → Photos, Vérification scellement 16, étapes gaz 9..14).
                    // Les ids ne sont pas monotones : on raisonne sur le rang de workflow.
                    // Les statuts de pause (HS, Décision MOE) ont un rang postérieur et
                    // tombent dans leurs propres compteurs ci-dessous.
                    getFsecStatusRank(statusId) < getFsecStatusRank(FSEC_STATUS_ID.DISPONIBLE)
                ) {
                    acc.fabrication++;
                } else if (statusId === FSEC_STATUS_ID.HS) {
                    acc.hs++;
                } else if (statusId === FSEC_STATUS_ID.DECISION_MOE) {
                    acc.decisionMoe++;
                }

                return acc;
            },
            { total: 0, tirees: 0, pretes: 0, fabrication: 0, hs: 0, decisionMoe: 0 },
        );
    }, [fsecs]);

    return (
        <Grid container spacing={3}>
            {/* Row 1 */}
            <Grid item xs={12} md={7}>
                <ErrorBoundary sectionName="Informations Générales" compact>
                    <GeneralInfoSection campaign={campaign} />
                </ErrorBoundary>
            </Grid>
            <Grid item xs={12} md={5}>
                <ErrorBoundary sectionName="Statistiques" compact>
                    <StatisticsSection stats={stats} isLoading={isLoadingFsecs} />
                </ErrorBoundary>
            </Grid>

            {/* Row 2 */}
            <Grid item xs={12} md={5}>
                <ErrorBoundary sectionName="Équipe" compact>
                    <TeamSection campaign={campaign} />
                </ErrorBoundary>
            </Grid>
            <Grid item xs={12} md={7}>
                <ErrorBoundary sectionName="Dates Clés" compact>
                    <DatesSection campaign={campaign} />
                </ErrorBoundary>
            </Grid>
        </Grid>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export with memo
// ─────────────────────────────────────────────────────────────────────────────

export const CampaignOverviewPage = memo(CampaignOverviewPageComponent);
