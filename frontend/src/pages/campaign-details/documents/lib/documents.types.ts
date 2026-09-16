/**
 * Document Browser Types & Constants
 * @module pages/campaign-details/documents/lib
 */

export interface Level3Item {
    id: string;
    realId: number | string;
    type: 'folder' | 'file';
    name: string;
    subtype: { id: number; label: string; typeId: number } | null;
    fileType: { id: number; label: string; subtypeId: number } | null;
    path: string;
    date: Date | null;
}

export interface SearchResults {
    types: { id: number; label: string }[];
    subtypes: { id: number; label: string; typeId: number }[];
    fileTypes: { id: number; label: string; subtypeId: number }[];
    files: { uuid: string; name: string; type: string; parentLabel?: string; path: string }[];
}

export const TYPE_COLORS: Record<number, string> = {
    0: '#64748B', // DOCUMENTAIRE
    1: '#3B82F6', // CAO
    2: '#10B981', // ASSEMBLAGE
    3: '#F59E0B', // METROLOGIE
    4: '#8B5CF6', // TRANSPORT
    5: '#EC4899', // FICHIERS_PALS
};
