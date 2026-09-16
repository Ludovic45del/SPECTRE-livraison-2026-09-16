/**
 * Steps Referential Constants
 * @module entities/steps/lib
 *
 * Hardcoded values matching database initialization (fsec_racks.csv, etc.)
 */

export interface FsecRack {
    id: number;
    label: string;
}

// Referential - FSEC Racks (from fsec_racks.csv)
export const FSEC_RACKS: Record<number, FsecRack> = {
    0: { id: 0, label: 'RACK B1' },
    1: { id: 1, label: 'RACK B2' },
    2: { id: 2, label: 'RACK B3' },
    3: { id: 3, label: 'RACK B4' },
    4: { id: 4, label: 'RACK B5' },
    5: { id: 5, label: 'RACK B6' },
    6: { id: 6, label: 'RACK B7' },
    7: { id: 7, label: 'RACK B8' },
    8: { id: 8, label: 'RACK B9' },
    9: { id: 9, label: 'RACK B10' },
    10: { id: 10, label: 'RACK B11' },
    11: { id: 11, label: 'RACK B12' },
    12: { id: 12, label: 'RACK B13' },
    13: { id: 13, label: 'RACK B14' },
    14: { id: 14, label: 'RACK B15' },
    15: { id: 15, label: 'RACK B16' },
    16: { id: 16, label: 'RACK B17' },
    17: { id: 17, label: 'RACK B18' },
    18: { id: 18, label: 'RACK B19' },
    19: { id: 19, label: 'RACK B20' },
    20: { id: 20, label: 'RACK B21' },
    21: { id: 21, label: 'RACK B22' },
    22: { id: 22, label: 'RACK B23' },
    23: { id: 23, label: 'RACK B24' },
    24: { id: 24, label: 'RACK B25' },
    25: { id: 25, label: 'RACK B26' },
    26: { id: 26, label: 'RACK B27' },
    27: { id: 27, label: 'RACK B28' },
    28: { id: 28, label: 'RACK B29' },
    29: { id: 29, label: 'RACK B30' },
    30: { id: 30, label: 'RACK B31' },
    31: { id: 31, label: 'RACK B32' },
    32: { id: 32, label: 'RACK B33' },
    33: { id: 33, label: 'RACK B34' },
    34: { id: 34, label: 'RACK B35' },
    35: { id: 35, label: 'RACK B36' },
    36: { id: 36, label: 'RACK B37' },
    37: { id: 37, label: 'RACK B38' },
    38: { id: 38, label: 'RACK B39' },
    39: { id: 39, label: 'RACK B40' },
};

// Helper arrays for selectors
export const FSEC_RACKS_LIST = Object.values(FSEC_RACKS);

// Getter functions
export function getFsecRack(id: number | null): FsecRack | null {
    if (id === null || id === undefined) return null;
    return FSEC_RACKS[id] ?? null;
}
