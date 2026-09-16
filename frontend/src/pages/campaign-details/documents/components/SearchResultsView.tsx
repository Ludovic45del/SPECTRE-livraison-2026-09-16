/**
 * Search Results View - Displays search results across all document levels
 * @module pages/campaign-details/documents/components
 */

import { memo } from 'react';
import { Box, Typography, Grid, Paper, Stack } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import { Column, DataTable } from '@widgets/data-table';
import { CAMPAIGN_DOCUMENT_TYPES, CAMPAIGN_DOCUMENT_SUBTYPES } from '@entities/campaign/core/lib';
import { SearchResults, TYPE_COLORS } from '../lib/documents.types';
import { getFileIcon, getFolderIcon, CopyPathButton } from '../lib/documents.helpers';

interface SearchResultsViewProps {
    searchQuery: string;
    results: SearchResults | 'empty';
    baseCampaignPath: string;
    onResultClick: (type: string, id: string | number) => void;
}

const searchFileColumns: Column<SearchResults['files'][number]>[] = [
    {
        id: 'name',
        label: 'Documents',
        render: (row) => (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    {getFileIcon(row.name)}
                    <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Dans {row.parentLabel}
                        </Typography>
                    </Box>
                </Stack>
                {row.path && <CopyPathButton path={row.path} />}
            </Stack>
        ),
    },
];

export const SearchResultsView = memo(function SearchResultsView({
    searchQuery,
    results,
    baseCampaignPath,
    onResultClick,
}: SearchResultsViewProps) {
    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Résultats de recherche pour &quot;{searchQuery}&quot;
            </Typography>

            {results === 'empty' ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
                    <Typography color="text.secondary">Aucun résultat trouvé.</Typography>
                </Paper>
            ) : (
                <Stack spacing={3}>
                    {/* Types */}
                    {results.types.length > 0 && (
                        <ResultSection title="Dossiers principaux">
                            <Grid container spacing={2}>
                                {results.types.map((type) => {
                                    const path = `${baseCampaignPath}\\${type.label}`;
                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={`res-type-${type.id}`}>
                                            <FolderResultCard
                                                label={type.label}
                                                icon={<FolderIcon sx={{ color: TYPE_COLORS[type.id] }} />}
                                                path={path}
                                                onClick={() => onResultClick('type', type.id)}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </ResultSection>
                    )}

                    {/* Subtypes */}
                    {results.subtypes.length > 0 && (
                        <ResultSection title="Sous-dossiers">
                            <Grid container spacing={2}>
                                {results.subtypes.map((st) => {
                                    const type = CAMPAIGN_DOCUMENT_TYPES[st.typeId];
                                    const path = `${baseCampaignPath}\\${type.label}\\${st.label}`;
                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={`res-st-${st.id}`}>
                                            <FolderResultCard
                                                label={st.label}
                                                subtitle={`Dans ${type?.label}`}
                                                icon={<FolderIcon sx={{ color: TYPE_COLORS[st.typeId] }} />}
                                                path={path}
                                                onClick={() => onResultClick('subtype', st.id)}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </ResultSection>
                    )}

                    {/* File Types */}
                    {results.fileTypes.length > 0 && (
                        <ResultSection title="Catégories">
                            <Grid container spacing={2}>
                                {results.fileTypes.map((ft) => {
                                    const st = CAMPAIGN_DOCUMENT_SUBTYPES[ft.subtypeId];
                                    const t = CAMPAIGN_DOCUMENT_TYPES[st.typeId];
                                    const path = `${baseCampaignPath}\\${t.label}\\${st.label}\\${ft.label}`;
                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={`res-ft-${ft.id}`}>
                                            <FolderResultCard
                                                label={ft.label}
                                                subtitle={`Dans ${st?.label}`}
                                                icon={getFolderIcon(ft.label, 24, '#999')}
                                                path={path}
                                                onClick={() => onResultClick('fileType', ft.id)}
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </ResultSection>
                    )}

                    {/* Files */}
                    {results.files.length > 0 && (
                        <ResultSection title="Fichiers">
                            <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
                                <DataTable
                                    columns={searchFileColumns}
                                    data={results.files}
                                    isLoading={false}
                                    onRowClick={(row) => onResultClick(row.type, row.uuid)}
                                />
                            </Paper>
                        </ResultSection>
                    )}
                </Stack>
            )}
        </Box>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Internal sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                {title}
            </Typography>
            {children}
        </Box>
    );
}

interface FolderResultCardProps {
    label: string;
    subtitle?: string;
    icon: React.ReactNode;
    path: string;
    onClick: () => void;
}

function FolderResultCard({ label, subtitle, icon, path, onClick }: FolderResultCardProps) {
    return (
        <Paper
            variant="outlined"
            onClick={onClick}
            sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.50', borderColor: 'primary.main' },
            }}
        >
            {icon}
            <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>{label}</Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <CopyPathButton path={path} />
        </Paper>
    );
}
