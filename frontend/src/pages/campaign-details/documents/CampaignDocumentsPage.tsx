/**
 * Campaign Documents Page - File Browser Interface
 * @module pages/campaign-details/documents
 *
 * Orchestrates the document browser: toolbar, search, 3-level folder navigation.
 */

import { memo } from 'react';
import { Box } from '@mui/material';
import { CampaignWithRelations } from '@entities/campaign/core/model';
import { useDocumentBrowser } from './hooks/useDocumentBrowser';
import { DocumentsSkeleton } from './components/DocumentsSkeleton';
import { DocumentsToolbar } from './components/DocumentsToolbar';
import { SearchResultsView } from './components/SearchResultsView';
import { TypesGridView } from './components/TypesGridView';
import { SubtypesGridView } from './components/SubtypesGridView';
import { Level3ContentView } from './components/Level3ContentView';

interface CampaignDocumentsPageProps {
    campaign: CampaignWithRelations;
}

function CampaignDocumentsPageComponent({ campaign }: CampaignDocumentsPageProps) {
    const browser = useDocumentBrowser(campaign);

    // Loading state
    if (browser.isLoading && browser.isRoot) {
        return <DocumentsSkeleton />;
    }

    return (
        <Box>
            <DocumentsToolbar
                isRoot={browser.isRoot}
                isSearching={browser.isSearching}
                searchQuery={browser.searchQuery}
                viewMode={browser.viewMode}
                activeType={browser.activeType}
                activeSubtype={browser.activeSubtype}
                activeFileType={browser.activeFileType}
                activeSubtypeId={browser.activeSubtypeId}
                activeFileTypeId={browser.activeFileTypeId}
                onBack={browser.handleBack}
                onClearSearch={browser.handleClearSearch}
                onSearchChange={browser.handleSearchChange}
                onResetNavigation={browser.handleResetNavigation}
                onTypeClick={browser.handleTypeClick}
                onSubtypeClick={browser.handleSubtypeClick}
                onToggleViewMode={browser.handleToggleViewMode}
            />

            {/* Search Results */}
            {browser.isSearching && browser.allSearchResults !== null && (
                <SearchResultsView
                    searchQuery={browser.searchQuery}
                    results={browser.allSearchResults}
                    baseCampaignPath={browser.baseCampaignPath}
                    onResultClick={browser.handleSearchResultClick}
                />
            )}

            {/* Level 1: Root Types */}
            {!browser.isSearching && browser.isRoot && (
                <TypesGridView
                    types={browser.filteredTypes}
                    baseCampaignPath={browser.baseCampaignPath}
                    viewMode={browser.viewMode}
                    onTypeClick={browser.handleTypeClick}
                />
            )}

            {/* Level 2: Subtypes */}
            {!browser.isSearching && browser.isTypeLevel && (
                <SubtypesGridView
                    subtypes={browser.currentSubtypes}
                    activeTypeId={browser.activeTypeId}
                    activeTypeLabel={browser.activeType?.label ?? ''}
                    baseCampaignPath={browser.baseCampaignPath}
                    viewMode={browser.viewMode}
                    onSubtypeClick={browser.handleSubtypeClick}
                />
            )}

            {/* Level 3: File Types & Files */}
            {!browser.isSearching && browser.isSubtypeLevel && (
                <Level3ContentView
                    folders={browser.level3Folders}
                    files={browser.level3Files}
                    activeTypeId={browser.activeTypeId}
                    viewMode={browser.viewMode}
                    isLoading={browser.isLoading}
                />
            )}
        </Box>
    );
}

export const CampaignDocumentsPage = memo(CampaignDocumentsPageComponent);
