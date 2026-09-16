/**
 * Embase type labels, colors & status helpers
 * @module entities/embase/model
 */

// ============================================================================
// Type labels
// ============================================================================

export type EmbaseType = 'jet_de_gaz' | 'hp' | 'bp';

export const EMBASE_TYPE_LABELS: Record<EmbaseType, string> = {
    jet_de_gaz: 'Jet de Gaz',
    hp: 'HP',
    bp: 'BP',
};

export const EMBASE_TYPE_COLORS: Record<EmbaseType, 'primary' | 'secondary' | 'warning'> = {
    jet_de_gaz: 'primary',
    hp: 'secondary',
    bp: 'warning',
};

// ============================================================================
// Étalonnage status helper
// ============================================================================

export type EtalonnageStatus = 'valid' | 'expired' | 'none';

export function getEtalonnageStatus(etalonnageDate: string | null): {
    status: EtalonnageStatus;
    label: string;
    color: string;
} {
    if (!etalonnageDate) {
        return { status: 'none', label: 'Pas étalonné', color: '#ff9800' };
    }
    const date = new Date(etalonnageDate);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (date < oneMonthAgo) {
        return { status: 'expired', label: 'Étalonnage expiré', color: '#f44336' };
    }
    return { status: 'valid', label: 'Étalonné', color: '#4caf50' };
}
