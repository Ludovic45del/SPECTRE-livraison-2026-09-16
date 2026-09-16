/**
 * Equipment Table Component
 * @module features/embase/comparaison-tab
 *
 * Affiche le tableau de comparaison des equipements V1/V2 (soufflet, capteur).
 */

import { memo } from 'react';
import { Paper, Typography } from '@mui/material';
import { V1_COLOR, V2_COLOR } from './voie-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TextRow {
    label: string;
    v1: string | null;
    v2: string | null;
}

interface EquipmentTableProps {
    textRows: TextRow[];
    animated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const thStyle: React.CSSProperties = {
    padding: '8px',
    textAlign: 'center',
    borderBottom: '2px solid var(--mui-palette-divider, #e0e0e0)',
};
const thEmptyStyle: React.CSSProperties = {
    padding: '8px',
    textAlign: 'left',
    borderBottom: '2px solid var(--mui-palette-divider, #e0e0e0)',
};
const tdCenterStyle: React.CSSProperties = {
    padding: '12px',
    textAlign: 'center',
    borderBottom: '1px solid var(--mui-palette-divider, #e0e0e0)',
};
const tdLabelStyle: React.CSSProperties = {
    padding: '12px',
    borderBottom: '1px solid var(--mui-palette-divider, #e0e0e0)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const EquipmentTable = memo(function EquipmentTable({ textRows, animated }: EquipmentTableProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: 1,
                height: '100%',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'opacity 0.5s ease 0.8s, transform 0.5s ease 0.8s',
            }}
        >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Équipement
            </Typography>
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thEmptyStyle} />
                        <th style={thStyle}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: V1_COLOR }}>
                                Voie V1
                            </Typography>
                        </th>
                        <th style={thStyle}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: V2_COLOR }}>
                                Voie V2
                            </Typography>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {textRows.map((row) => (
                        <tr key={row.label}>
                            <td style={tdLabelStyle}>
                                <Typography variant="body2" fontWeight={500}>
                                    {row.label}
                                </Typography>
                            </td>
                            <td style={tdCenterStyle}>
                                <Typography variant="body2">{row.v1 || '-'}</Typography>
                            </td>
                            <td style={tdCenterStyle}>
                                <Typography variant="body2">{row.v2 || '-'}</Typography>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Paper>
    );
});
