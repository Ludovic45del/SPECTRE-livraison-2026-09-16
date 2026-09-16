/**
 * Tests Comparison Table Component
 * @module features/embase/comparaison-tab
 *
 * Affiche le tableau de comparaison des tests V1/V2 (OK/KO chips).
 */

import { memo } from 'react';
import { Paper, Typography } from '@mui/material';
import { TestStatusChip } from '@features/embase/shared';
import { V1_COLOR, V2_COLOR } from './voie-colors';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TestRow {
    label: string;
    v1: string;
    v2: string;
}

interface TestsComparisonTableProps {
    testRows: TestRow[];
    animated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────────

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

export const TestsComparisonTable = memo(function TestsComparisonTable({
    testRows,
    animated,
}: TestsComparisonTableProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 3,
                borderRadius: 1,
                height: '100%',
                opacity: animated ? 1 : 0,
                transform: animated ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 0.5s ease 0.8s, transform 0.5s ease 0.8s',
            }}
        >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Tests
            </Typography>
            <table style={tableStyle}>
                <thead>
                    <tr>
                        <th style={thEmptyStyle} />
                        <th style={thStyle}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: V1_COLOR }}>
                                V1
                            </Typography>
                        </th>
                        <th style={thStyle}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: V2_COLOR }}>
                                V2
                            </Typography>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {testRows.map((row) => (
                        <tr key={row.label}>
                            <td style={tdLabelStyle}>
                                <Typography variant="body2" fontWeight={500}>
                                    {row.label}
                                </Typography>
                            </td>
                            <td style={tdCenterStyle}>
                                <TestStatusChip value={row.v1} />
                            </td>
                            <td style={tdCenterStyle}>
                                <TestStatusChip value={row.v2} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Paper>
    );
});
