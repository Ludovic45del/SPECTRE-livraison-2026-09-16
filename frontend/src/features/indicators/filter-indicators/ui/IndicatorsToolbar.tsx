/**
 * IndicatorsToolbar - barre supérieure avec sélection période (année + semestre).
 * @module features/indicators/filter-indicators/ui
 *
 * Le rattachement temporel passe par la campagne associée à la FSEC (qui porte
 * year + semester). Le sélecteur de semestre est optionnel : "Année entière"
 * désactive le filtre semestre.
 */

import { memo, useCallback, useMemo } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { formatIndicatorsPeriod, useFilterIndicatorsStore, type SemesterFilter } from '../model';

interface IndicatorsToolbarProps {
    title?: string;
}

// Valeur sentinelle pour le MenuItem "Année entière" (Select MUI n'accepte pas null).
const ALL_SEMESTERS = 'all';

export const IndicatorsToolbar = memo(function IndicatorsToolbar({ title = 'Indicateurs' }: IndicatorsToolbarProps) {
    const year = useFilterIndicatorsStore((s) => s.year);
    const semester = useFilterIndicatorsStore((s) => s.semester);
    const setYear = useFilterIndicatorsStore((s) => s.setYear);
    const setSemester = useFilterIndicatorsStore((s) => s.setSemester);

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear + 1; y >= currentYear - 5; y -= 1) {
            years.push(y);
        }
        return years;
    }, []);

    const semesterValue: string = semester === null ? ALL_SEMESTERS : String(semester);

    const handleYearChange = useCallback((raw: string | number) => setYear(Number(raw)), [setYear]);

    const handleSemesterChange = useCallback(
        (raw: string) => {
            if (raw === ALL_SEMESTERS) {
                setSemester(null);
                return;
            }
            const parsed = Number(raw);
            if (parsed === 1 || parsed === 2) {
                setSemester(parsed as SemesterFilter);
            }
        },
        [setSemester],
    );

    return (
        <Box sx={{ mb: 3 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={2}
            >
                <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                        {title}
                    </Typography>
                    {/* Période au format semestriel compact, aligné sur les subtitles des KPI. */}
                    <Typography variant="body2" color="text.secondary">
                        Période : {formatIndicatorsPeriod(year, semester)} — rattachement par campagne (année +
                        semestre).
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1.5}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel id="indicators-year-label">Année</InputLabel>
                        <Select
                            labelId="indicators-year-label"
                            label="Année"
                            value={year}
                            onChange={(e) => handleYearChange(e.target.value)}
                        >
                            {yearOptions.map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="indicators-semester-label">Semestre</InputLabel>
                        <Select
                            labelId="indicators-semester-label"
                            label="Semestre"
                            value={semesterValue}
                            onChange={(e) => handleSemesterChange(String(e.target.value))}
                        >
                            <MenuItem value={ALL_SEMESTERS}>Année entière</MenuItem>
                            <MenuItem value="1">S1 (janv. — juin)</MenuItem>
                            <MenuItem value="2">S2 (juil. — déc.)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Stack>
        </Box>
    );
});
