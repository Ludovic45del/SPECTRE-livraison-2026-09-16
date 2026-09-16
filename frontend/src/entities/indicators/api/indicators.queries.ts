/**
 * Indicators API Service - TanStack Query Hooks
 * @module entities/indicators/api
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/api';
import { QUERY_CACHE_CONFIG } from '@shared/lib';
import { IndicatorsSchema, type Indicators } from '../model';
import { indicatorsKeys } from './indicators.keys';

/**
 * Fetch the indicators bundle for a given period.
 *
 * @param year - année cible
 * @param semester - 1 (S1), 2 (S2), ou null pour l'année entière
 */
export function useIndicators(year: number, semester: number | null = null) {
    return useQuery({
        queryKey: indicatorsKeys.byPeriod(year, semester),
        queryFn: async ({ signal }): Promise<Indicators> => {
            const url =
                semester === null ? `/indicators/?year=${year}` : `/indicators/?year=${year}&semester=${semester}`;
            return api.get(url, IndicatorsSchema, signal);
        },
        ...QUERY_CACHE_CONFIG,
    });
}
