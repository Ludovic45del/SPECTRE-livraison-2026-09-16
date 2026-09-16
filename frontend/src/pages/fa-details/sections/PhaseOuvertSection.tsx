/**
 * Phase Ouvert Section - FA Details
 * @module pages/fa-details/sections
 *
 * Displays Phase 1 (Ouvert) with view and edit modes
 */

import { memo } from 'react';
import { Paper, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Fa } from '@entities/fa';

import { FaSectionHeader, PAPER_BASE_SX, EDIT_BUTTON_SX } from '../components';
import { useFaPhaseOuvertForm } from '../hooks';
import { FaPhotoGallery } from './FaPhotoGallery';
import { PhaseOuvertEditMode } from './PhaseOuvertEditMode';
import { PhaseOuvertViewMode } from './PhaseOuvertViewMode';

// ============================================================================
// Types
// ============================================================================

interface PhaseOuvertSectionProps {
    fa: Fa;
}

// ============================================================================
// Component
// ============================================================================

export const PhaseOuvertSection = memo(function PhaseOuvertSection({ fa }: PhaseOuvertSectionProps) {
    const { form, setForm, isEditing, isSaving, startEditing, cancelEditing, save } = useFaPhaseOuvertForm(fa);

    return (
        <Paper
            variant="outlined"
            sx={PAPER_BASE_SX}
            component="section"
            aria-label="Phase 1 - Ouvert"
            aria-busy={isSaving}
        >
            {!isEditing && (
                <IconButton
                    onClick={startEditing}
                    aria-label="Modifier les informations de la Phase 1 Ouvert"
                    sx={EDIT_BUTTON_SX}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            )}

            <FaSectionHeader label="Phase 1 - Ouvert" chipColor="warning" />

            {isEditing ? (
                <PhaseOuvertEditMode
                    form={form}
                    setForm={setForm}
                    onCancel={cancelEditing}
                    onSave={save}
                    isPending={isSaving}
                />
            ) : (
                <PhaseOuvertViewMode fa={fa} />
            )}

            {/* Galerie de photos : auto-gérée (mutations propres), visible en lecture comme en édition. */}
            <FaPhotoGallery faUuid={fa.uuid} />
        </Paper>
    );
});
