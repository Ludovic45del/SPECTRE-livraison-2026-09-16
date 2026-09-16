import { type TabItem } from '@widgets/routed-tabs';

export const TABS_1_VOIE: TabItem[] = [
    { path: 'voie-v1', label: 'Voie V1' },
    { path: 'mecanique', label: 'Mécanique' },
    { path: 'etalonnage', label: 'Étalonnage' },
    { path: 'historique-fsec', label: 'Historique FSECs' },
];

export const TABS_2_VOIES: TabItem[] = [
    { path: 'voie-v1', label: 'Voie V1' },
    { path: 'mecanique', label: 'Mécanique' },
    { path: 'voie-v2', label: 'Voie V2' },
    { path: 'etalonnage', label: 'Étalonnage' },
    { path: 'historique-fsec', label: 'Historique FSECs' },
];

export type TabPath = 'voie-v1' | 'mecanique' | 'voie-v2' | 'etalonnage' | 'historique-fsec';

export function getActiveTab(pathname: string): TabPath {
    if (pathname.includes('/mecanique')) return 'mecanique';
    if (pathname.includes('/voie-v2')) return 'voie-v2';
    if (pathname.includes('/etalonnage')) return 'etalonnage';
    if (pathname.includes('/historique-fsec')) return 'historique-fsec';
    return 'voie-v1';
}
