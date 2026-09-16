/**
 * Generic Voie Tab Component
 * @module features/embase/shared
 *
 * Composant générique pour les onglets Voie V1 et V2.
 * Gère l'état du formulaire, l'édition, la sauvegarde et l'annulation.
 */

import { memo, useState, useCallback, type ReactNode } from 'react';
import { TextField, Typography, Stack } from '@mui/material';
import { EditableSection } from './EditableSection';
import { MesuresSection } from './MesuresSection';
import { TestsSection } from './TestsSection';
import { parseNum } from './parseNum';
import type { EditableTabProps } from './types';
import type { Embase, EmbaseCreate } from '@entities/embase';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MesureFieldConfig {
    label: string;
    displayLabel?: string;
    embaseField: keyof Embase;
    formField: string;
    type?: 'text' | 'number';
    unit?: string;
}

interface TestFieldConfig {
    label: string;
    embaseField: keyof Embase;
    formField: string;
}

/** Describes which embase fields belong to a given voie. */
export interface VoieConfig {
    /** String fields: { formFieldName: embaseFieldName } */
    stringFields: Record<string, keyof Embase>;
    /** Numeric fields: { formFieldName: embaseFieldName } */
    numericFields: Record<string, keyof Embase>;
    /** Observations field name on Embase */
    observationsField: keyof Embase;
    /** Observations form field name */
    observationsFormField: string;
    /** Field configs for the MesuresSection */
    mesuresFields: MesureFieldConfig[];
    /** Field configs for the TestsSection */
    testsFields: TestFieldConfig[];
    /** Section titles */
    titles: { mesures: string; tests: string; observations: string };
    /** Optional extra content rendered after MesuresSection in edit/view mode */
    renderExtra?: (props: {
        isEditing: boolean;
        form: Record<string, string | boolean>;
        onFormChange: (field: string, value: string | boolean) => void;
        embase: Embase;
    }) => ReactNode;
    /** Extra form fields with their initial values (e.g. electrovanne) */
    extraFormDefaults?: Record<string, string | boolean>;
    /** Extra fields to include in the save payload (field -> transform fn) */
    extraSaveFields?: Record<string, (form: Record<string, string | boolean>) => unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface VoieTabProps extends EditableTabProps {
    config: VoieConfig;
}

export const VoieTab = memo(function VoieTab({ embase, onSave, isPending, config }: VoieTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Record<string, string | boolean>>({});

    const handleEdit = useCallback(() => {
        const newForm: Record<string, string | boolean> = {};

        for (const [formField, embaseField] of Object.entries(config.stringFields)) {
            newForm[formField] = (embase[embaseField] as string) ?? '';
        }
        for (const [formField, embaseField] of Object.entries(config.numericFields)) {
            newForm[formField] = (embase[embaseField] as number | null)?.toString() ?? '';
        }
        newForm[config.observationsFormField] = (embase[config.observationsField] as string) ?? '';

        if (config.extraFormDefaults) {
            for (const [field, defaultVal] of Object.entries(config.extraFormDefaults)) {
                const embaseVal = embase[field as keyof Embase];
                newForm[field] = typeof defaultVal === 'boolean' ? Boolean(embaseVal) : String(embaseVal ?? '');
            }
        }

        setForm(newForm);
        setIsEditing(true);
    }, [embase, config]);

    const handleCancel = useCallback(() => setIsEditing(false), []);

    const handleSave = useCallback(async () => {
        const overrides: Partial<EmbaseCreate> = {};

        for (const formField of Object.keys(config.stringFields)) {
            (overrides as Record<string, unknown>)[formField] = form[formField] as string;
        }
        for (const formField of Object.keys(config.numericFields)) {
            (overrides as Record<string, unknown>)[formField] = parseNum(form[formField] as string);
        }
        (overrides as Record<string, unknown>)[config.observationsFormField] = form[config.observationsFormField];

        if (config.extraSaveFields) {
            for (const [field, transform] of Object.entries(config.extraSaveFields)) {
                (overrides as Record<string, unknown>)[field] = transform(form);
            }
        }

        await onSave(overrides);
        setIsEditing(false);
    }, [form, onSave, config]);

    const handleFormChange = useCallback((field: string, value: string | boolean) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    }, []);

    return (
        <Stack spacing={3}>
            <EditableSection
                title={config.titles.mesures}
                isEditing={isEditing}
                isPending={isPending}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                <MesuresSection
                    embase={embase}
                    isEditing={isEditing}
                    form={form}
                    onFormChange={(field, value) => handleFormChange(field, value)}
                    fields={config.mesuresFields}
                />
                {config.renderExtra?.({ isEditing, form, onFormChange: handleFormChange, embase })}
            </EditableSection>

            <EditableSection
                title={config.titles.tests}
                isEditing={isEditing}
                isPending={isPending}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                <TestsSection
                    embase={embase}
                    isEditing={isEditing}
                    form={form}
                    onFormChange={(field, value) => handleFormChange(field, value)}
                    fields={config.testsFields}
                />
            </EditableSection>

            <EditableSection
                title={config.titles.observations}
                isEditing={isEditing}
                isPending={isPending}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
            >
                {isEditing ? (
                    <TextField
                        fullWidth
                        size="small"
                        label="Observations"
                        multiline
                        rows={3}
                        value={form[config.observationsFormField] ?? ''}
                        onChange={(e) => handleFormChange(config.observationsFormField, e.target.value)}
                    />
                ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {(embase[config.observationsField] as string) || '-'}
                    </Typography>
                )}
            </EditableSection>
        </Stack>
    );
});
