/**
 * MemberPeriodPopover — création/édition d'une période membre (type + plage + commentaire).
 *
 * Wrapper mince autour d'EntityRangeDialog : ne porte que l'état métier membre
 * (type de période, plage, commentaire) et le câblage des mutations. La modale
 * elle-même est mutualisée avec la modale labo (EventPopover) — fin de la
 * duplication ~95% et de l'incohérence Autocomplete vs select.
 */
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { PERIODES, type Periode, getPeriodeMeta } from '../../lib/planning.constants';
import { usePlanningColors } from '../../lib/planning.hooks';
import type { PlanningMemberPeriod } from '@entities/planning/core/model/planning.schema';
import {
    useCreateMemberPeriod,
    useDeleteMemberPeriod,
    useUpdateMemberPeriod,
} from '@entities/planning/core/api/planning.queries';
import { ColoredSelect } from '../shared/ColoredSelect';
import { EntityRangeDialog } from '../shared/EntityRangeDialog';
import type { DateRange } from '@shared/lib';

export interface MemberPeriodPopoverProps {
    anchorEl: HTMLElement;
    existingPeriod?: PlanningMemberPeriod;
    defaultDate: string;
    memberName: string;
    memberRole: string;
    year: number;
    onClose: () => void;
}

const PERIOD_OPTIONS = PERIODES.map((p) => ({ label: p.label, value: p.value, color: p.color }));

export function MemberPeriodPopover({
    anchorEl,
    existingPeriod,
    defaultDate,
    memberName,
    memberRole,
    year,
    onClose,
}: MemberPeriodPopoverProps) {
    const colors = usePlanningColors();
    const createPeriod = useCreateMemberPeriod();
    const updatePeriod = useUpdateMemberPeriod();
    const deletePeriod = useDeleteMemberPeriod();

    const [periodType, setPeriodType] = useState<string>(existingPeriod?.periodType ?? '');
    const [comment, setComment] = useState(existingPeriod?.commentaire ?? '');
    const [range, setRange] = useState<DateRange>({
        start: dayjs(existingPeriod?.startDate ?? defaultDate),
        end: dayjs(existingPeriod?.endDate ?? defaultDate),
    });

    const accentColor = useMemo(() => getPeriodeMeta(periodType)?.color ?? colors.blue, [periodType, colors.blue]);
    const canSave = !!periodType && !!range.start && !!range.end;

    const handleSave = () => {
        if (!canSave) return;
        const payload = {
            memberName,
            memberRole,
            year,
            periodType: periodType as Periode['value'],
            commentaire: comment.trim() || null,
            startDate: range.start!.format('YYYY-MM-DD'),
            endDate: range.end!.format('YYYY-MM-DD'),
        };
        if (existingPeriod) {
            updatePeriod.mutate({ uuid: existingPeriod.uuid, data: payload }, { onSuccess: onClose });
        } else {
            createPeriod.mutate(payload, { onSuccess: onClose });
        }
    };

    const handleDelete = existingPeriod
        ? () => deletePeriod.mutate({ uuid: existingPeriod.uuid, year }, { onSuccess: onClose })
        : undefined;

    return (
        <EntityRangeDialog
            anchorEl={anchorEl}
            title={existingPeriod ? 'Modifier la période' : 'Nouvelle période'}
            accentColor={accentColor}
            typologySlot={
                <ColoredSelect
                    label="Type de période"
                    value={periodType}
                    onChange={setPeriodType}
                    options={PERIOD_OPTIONS}
                />
            }
            range={range}
            onRangeChange={setRange}
            note={{ label: 'Commentaire (optionnel)', value: comment, onChange: setComment }}
            mode={existingPeriod ? 'edit' : 'create'}
            canSave={canSave}
            isSaving={createPeriod.isPending || updatePeriod.isPending}
            isDeleting={deletePeriod.isPending}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={onClose}
        />
    );
}
