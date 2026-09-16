/**
 * Dates Section - Start/End dates with MiniCalendar
 * @module pages/campaign-details/overview/components
 */

import { memo } from 'react';
import { Box, Paper, IconButton, useTheme } from '@mui/material';
import { RangeCalendar } from '@shared/ui';
import { CampaignWithRelations } from '@entities/campaign';
import EditIcon from '@mui/icons-material/Edit';
import { useCampaignDatesForm } from '../hooks';
import { SectionHeader } from './SectionHeader';
import { FormActions } from './FormActions';
import { MiniCalendar } from './MiniCalendar';
import { EDIT_BUTTON_SX, PAPER_BASE_SX } from './styles';

export interface DatesSectionProps {
    campaign: CampaignWithRelations;
}

export const DatesSection = memo(function DatesSection({ campaign }: DatesSectionProps) {
    const theme = useTheme();
    const { form, isEditing, isSaving, setStartDate, setEndDate, startEditing, cancelEditing, save } =
        useCampaignDatesForm(campaign);

    return (
        <Paper variant="outlined" sx={PAPER_BASE_SX} role="region" aria-label="Dates clés de la campagne">
            {!isEditing && (
                <IconButton size="small" onClick={startEditing} sx={EDIT_BUTTON_SX} aria-label="Modifier les dates">
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <SectionHeader title="Dates Clés" />

            {isEditing ? (
                <Box
                    component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        save();
                    }}
                >
                    <RangeCalendar
                        value={{ start: form.startDate, end: form.endDate }}
                        onChange={(range) => {
                            setStartDate(range.start);
                            setEndDate(range.end);
                        }}
                        accentColor={theme.palette.primary.main}
                    />
                    <FormActions onCancel={cancelEditing} isSaving={isSaving} />
                </Box>
            ) : (
                <MiniCalendar startDate={campaign.startDate} endDate={campaign.endDate} />
            )}
        </Paper>
    );
});
