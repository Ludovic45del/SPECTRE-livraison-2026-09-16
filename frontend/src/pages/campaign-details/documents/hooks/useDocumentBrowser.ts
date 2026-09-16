import { useState, useMemo, useCallback } from 'react';
import { useCampaignDocuments } from '@entities/campaign/document';
import { CampaignWithRelations } from '@entities/campaign/core/model';
import { CAMPAIGN_DOCUMENT_TYPES, CAMPAIGN_DOCUMENT_SUBTYPES, CAMPAIGN_FILE_TYPES } from '@entities/campaign/core/lib';
import { Level3Item, SearchResults } from '../lib/documents.types';

export function useDocumentBrowser(campaign: CampaignWithRelations) {
    const { data: documents, isLoading } = useCampaignDocuments(campaign.uuid);

    // Navigation State
    const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
    const [activeSubtypeId, setActiveSubtypeId] = useState<number | null>(null);
    const [activeFileTypeId, setActiveFileTypeId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');

    // Common navigation info for paths
    const drive = 'P:';
    const installation = campaign.installation?.label ?? 'INCONNU';
    const year = campaign.year.toString();
    const name = campaign.name;
    const baseCampaignPath = [drive, installation, year, name].join('\\');

    // Derived references
    const activeType = activeTypeId !== null ? CAMPAIGN_DOCUMENT_TYPES[activeTypeId] : null;
    const activeSubtype = activeSubtypeId !== null ? CAMPAIGN_DOCUMENT_SUBTYPES[activeSubtypeId] : null;
    const activeFileType = activeFileTypeId !== null ? CAMPAIGN_FILE_TYPES[activeFileTypeId] : null;

    // Filtered types at root level
    const filteredTypes = useMemo(() => {
        const types = Object.values(CAMPAIGN_DOCUMENT_TYPES);
        if (!searchQuery) return types;
        return types.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery]);

    // Global Search Results
    const allSearchResults = useMemo((): SearchResults | 'empty' | null => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase();

        const types = Object.values(CAMPAIGN_DOCUMENT_TYPES).filter((t) => t.label.toLowerCase().includes(query));
        const subtypes = Object.values(CAMPAIGN_DOCUMENT_SUBTYPES).filter((st) =>
            st.label.toLowerCase().includes(query),
        );

        const ftMatches = Object.values(CAMPAIGN_FILE_TYPES).filter((ft) => ft.label.toLowerCase().includes(query));
        const pureFileTypes = ftMatches.filter((ft) => !ft.label.includes('.'));
        const pseudoFiles = ftMatches.filter((ft) => ft.label.includes('.'));

        const docMatches = documents?.filter((doc) => doc.name.toLowerCase().includes(query)) || [];

        const combinedFiles = [
            ...pseudoFiles.map((ft) => {
                const st = CAMPAIGN_DOCUMENT_SUBTYPES[ft.subtypeId];
                const t = CAMPAIGN_DOCUMENT_TYPES[st.typeId];
                return {
                    uuid: String(ft.id),
                    name: ft.label,
                    type: 'fileType',
                    parentLabel: st.label,
                    path: [baseCampaignPath, t.label, st.label, ft.label].join('\\'),
                };
            }),
            ...docMatches.map((doc) => ({
                uuid: String(doc.uuid),
                name: doc.name,
                type: 'document',
                parentLabel: doc.fileType?.label || doc.subtype?.label,
                path: doc.path,
            })),
        ];

        const totalCount = types.length + subtypes.length + pureFileTypes.length + combinedFiles.length;

        return totalCount > 0 ? { types, subtypes, fileTypes: pureFileTypes, files: combinedFiles } : 'empty';
    }, [searchQuery, documents, baseCampaignPath]);

    // Subtypes for active type
    const currentSubtypes = useMemo(() => {
        if (activeTypeId === null) return [];
        const subtypes = Object.values(CAMPAIGN_DOCUMENT_SUBTYPES).filter((st) => st.typeId === activeTypeId);
        if (!searchQuery) return subtypes;
        return subtypes.filter((st) => st.label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeTypeId, searchQuery]);

    // Level 3 Items (Mixed Folders and Files)
    const level3Items = useMemo((): Level3Item[] => {
        if (activeSubtypeId === null || !documents) return [];

        const typeLabel = activeType?.label ?? '';
        const subtypeLabel = activeSubtype?.label ?? '';
        const folderBasePath = [baseCampaignPath, typeLabel, subtypeLabel].join('\\');

        const fileTypes = Object.values(CAMPAIGN_FILE_TYPES).filter((ft) => ft.subtypeId === activeSubtypeId);
        const pseudoFiles = fileTypes.filter((ft) => ft.label.includes('.'));
        const realFolders = fileTypes.filter((ft) => !ft.label.includes('.'));

        const allDocs = documents.filter((doc) => doc.subtype?.id === activeSubtypeId);

        const items: Level3Item[] = [
            ...realFolders.map((ft) => ({
                id: `folder-${ft.id}`,
                realId: ft.id,
                type: 'folder' as const,
                name: ft.label,
                subtype: activeSubtype,
                fileType: ft,
                path: `${folderBasePath}\\${ft.label}`,
                date: null,
            })),
            ...pseudoFiles.map((ft) => ({
                id: `pseudo-${ft.id}`,
                realId: ft.id,
                type: 'file' as const,
                name: ft.label,
                subtype: activeSubtype,
                fileType: ft,
                path: `${folderBasePath}\\${ft.label}`,
                date: null,
            })),
            ...allDocs.map((doc) => ({
                id: doc.uuid,
                realId: doc.uuid,
                type: 'file' as const,
                name: doc.name,
                subtype: doc.subtype,
                fileType: doc.fileType,
                path: doc.path,
                date: doc.date,
            })),
        ];

        if (!searchQuery) return items;
        return items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [activeSubtypeId, documents, activeSubtype, activeType, searchQuery, baseCampaignPath]);

    // Navigation Handlers
    const handleTypeClick = useCallback((typeId: number) => {
        setActiveTypeId(typeId);
        setActiveSubtypeId(null);
        setActiveFileTypeId(null);
    }, []);

    const handleSubtypeClick = useCallback((subtypeId: number) => {
        setActiveSubtypeId(subtypeId);
        setActiveFileTypeId(null);
    }, []);

    const handleSearchResultClick = useCallback(
        (type: string, id: string | number) => {
            setSearchQuery('');
            if (type === 'type') {
                setActiveTypeId(id as number);
                setActiveSubtypeId(null);
                setActiveFileTypeId(null);
            } else if (type === 'subtype') {
                const st = CAMPAIGN_DOCUMENT_SUBTYPES[id as number];
                setActiveTypeId(st.typeId);
                setActiveSubtypeId(id as number);
                setActiveFileTypeId(null);
            } else if (type === 'fileType') {
                const ft = CAMPAIGN_FILE_TYPES[id as number];
                const st = CAMPAIGN_DOCUMENT_SUBTYPES[ft.subtypeId];
                setActiveTypeId(st.typeId);
                setActiveSubtypeId(ft.subtypeId);
                setActiveFileTypeId(null);
            } else if (type === 'document') {
                const doc = documents?.find((d) => d.uuid === id);
                if (doc) {
                    setActiveTypeId(doc.type?.id ?? null);
                    setActiveSubtypeId(doc.subtype?.id ?? null);
                    setActiveFileTypeId(null);
                }
            }
        },
        [documents],
    );

    const handleBack = useCallback(() => {
        if (activeSubtypeId !== null) {
            setActiveSubtypeId(null);
            setActiveFileTypeId(null);
        } else if (activeTypeId !== null) {
            setActiveTypeId(null);
        }
    }, [activeSubtypeId, activeTypeId]);

    const handleResetNavigation = useCallback(() => {
        setActiveTypeId(null);
        setActiveSubtypeId(null);
        setActiveFileTypeId(null);
        setSearchQuery('');
    }, []);

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'));
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
    }, []);

    // Derived navigation state
    const isRoot = activeTypeId === null;
    const isTypeLevel = activeTypeId !== null && activeSubtypeId === null;
    const isSubtypeLevel = activeSubtypeId !== null;
    const isSearching = allSearchResults !== null;

    const level3Folders = level3Items.filter((item) => item.type === 'folder');
    const level3Files = level3Items.filter((item) => item.type === 'file');

    return {
        isLoading,
        viewMode,
        searchQuery,
        baseCampaignPath,
        activeTypeId,
        activeType,
        activeSubtype,
        activeFileType,
        activeFileTypeId,
        activeSubtypeId,
        filteredTypes,
        allSearchResults,
        currentSubtypes,
        level3Items,
        level3Folders,
        level3Files,
        isRoot,
        isTypeLevel,
        isSubtypeLevel,
        isSearching,
        handleTypeClick,
        handleSubtypeClick,
        handleSearchResultClick,
        handleBack,
        handleResetNavigation,
        handleToggleViewMode,
        handleSearchChange,
        handleClearSearch,
    };
}
