/**
 * Phase En Cours Section - FA Details
 * @module pages/fa-details/sections
 *
 * Displays Phase 2 (En cours) with view and edit modes
 */

import { memo } from 'react';
import { Paper, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Fa, getTypeInfo, getCriticalityInfo } from '@entities/fa';

import { FaSectionHeader, PAPER_BASE_SX, EDIT_BUTTON_SX } from '../components';
import { useFaPhaseEnCoursForm } from '../hooks';
import { PhaseEnCoursEditMode } from './PhaseEnCoursEditMode';
import { PhaseEnCoursViewMode } from './PhaseEnCoursViewMode';

// ============================================================================
// Types
// ============================================================================

interface PhaseEnCoursSectionProps {
    fa: Fa;
}

// ============================================================================
// Component
// ============================================================================

export const PhaseEnCoursSection = memo(function PhaseEnCoursSection({ fa }: PhaseEnCoursSectionProps) {
    const { form, setForm, isEditing, isSaving, startEditing, cancelEditing, save } = useFaPhaseEnCoursForm(fa);

    const typeInfo = getTypeInfo(fa.typeId ?? null);
    const criticalityInfo = getCriticalityInfo(fa.criticalityId ?? null);

    return (
        <Paper
            variant="outlined"
            sx={PAPER_BASE_SX}
            component="section"
            aria-label="Phase 2 - En cours / Clos"
            aria-busy={isSaving}
        >
            {!isEditing && (
                <IconButton
                    onClick={startEditing}
                    aria-label="Modifier les informations de la Phase 2 En cours"
                    sx={EDIT_BUTTON_SX}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <FaSectionHeader label="Phase 2 - En cours" chipColor="info" />

            {isEditing ? (
                <PhaseEnCoursEditMode
                    form={form}
                    setForm={setForm}
                    onCancel={cancelEditing}
                    onSave={save}
                    isPending={isSaving}
                />
            ) : (
                <PhaseEnCoursViewMode fa={fa} typeInfo={typeInfo} criticalityInfo={criticalityInfo} />
            )}
        </Paper>
    );
});
