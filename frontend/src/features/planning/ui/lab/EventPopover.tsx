/**
 * EventPopover — création/édition d'un événement labo (catégorie + plage + description).
 *
 * Wrapper mince autour d'EntityRangeDialog : ne porte que l'état métier labo
 * (catégorie, plage, description) et le câblage des mutations. La présentation
 * (calendrier de plage, layout, accessibilité) est mutualisée avec la modale
 * membre via EntityRangeDialog.
 */
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { LAB_EVENT_CATEGORIES, getEventCategoryMeta } from '../../lib/planning.constants';
import { usePlanningColors } from '../../lib/planning.hooks';
import { useCreateLabEvent, useDeleteLabEvent, useUpdateLabEvent } from '@entities/planning/core/api/planning.queries';
import type { LabEvent } from '@entities/planning/core/model/planning.schema';
import { ColoredSelect } from '../shared/ColoredSelect';
import { EntityRangeDialog } from '../shared/EntityRangeDialog';
import type { DateRange } from '@shared/lib';

export interface EventPopoverProps {
    anchorEl: HTMLElement;
    existingEvent?: LabEvent;
    defaultDate: string;
    machineUuid: string;
    onClose: () => void;
}

const CATEGORY_OPTIONS = LAB_EVENT_CATEGORIES.map((c) => ({ label: c.label, value: c.label, color: c.color }));

export function EventPopover({ anchorEl, existingEvent, defaultDate, machineUuid, onClose }: EventPopoverProps) {
    const colors = usePlanningColors();
    const createEvent = useCreateLabEvent();
    const updateEvent = useUpdateLabEvent();
    const deleteEvent = useDeleteLabEvent();

    const [category, setCategory] = useState(existingEvent?.category ?? LAB_EVENT_CATEGORIES[0].label);
    const [description, setDescription] = useState(existingEvent?.description ?? '');
    const [range, setRange] = useState<DateRange>({
        start: dayjs(existingEvent?.startDate ?? defaultDate),
        end: dayjs(existingEvent?.endDate ?? defaultDate),
    });

    const accentColor = useMemo(() => getEventCategoryMeta(category)?.color ?? colors.blue, [category, colors.blue]);
    const canSave = !!category && !!range.start && !!range.end;

    const handleSave = () => {
        if (!canSave) return;
        const payload = {
            machineUuid,
            category,
            description: description.trim(),
            startDate: range.start!.format('YYYY-MM-DD'),
            endDate: range.end!.format('YYYY-MM-DD'),
        };
        if (existingEvent) {
            updateEvent.mutate({ uuid: existingEvent.uuid, data: payload }, { onSuccess: onClose });
        } else {
            createEvent.mutate(payload, { onSuccess: onClose });
        }
    };

    const handleDelete = existingEvent
        ? () => deleteEvent.mutate({ uuid: existingEvent.uuid }, { onSuccess: onClose })
        : undefined;

    return (
        <EntityRangeDialog
            anchorEl={anchorEl}
            title={existingEvent ? 'Modifier l’événement' : 'Nouvel événement'}
            accentColor={accentColor}
            typologySlot={
                <ColoredSelect label="Catégorie" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
            }
            range={range}
            onRangeChange={setRange}
            note={{ label: 'Description (optionnel)', value: description, onChange: setDescription }}
            mode={existingEvent ? 'edit' : 'create'}
            canSave={canSave}
            isSaving={createEvent.isPending || updateEvent.isPending}
            isDeleting={deleteEvent.isPending}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={onClose}
        />
    );
}
