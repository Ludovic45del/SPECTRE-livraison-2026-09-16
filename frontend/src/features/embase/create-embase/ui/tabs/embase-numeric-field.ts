/**
 * Shared helpers for embase form tabs
 * @module features/embase/create-embase/ui/tabs
 */

export function numericField(value: string): number | null {
    if (value === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : n;
}

export function numericDisplay(value: number | null | undefined): string {
    return value != null ? String(value) : '';
}
