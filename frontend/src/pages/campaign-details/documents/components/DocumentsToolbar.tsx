/**
 * Documents Toolbar - Search, Breadcrumbs, View Toggle
 * @module pages/campaign-details/documents/components
 */

import { memo } from 'react';
import {
    Typography,
    Paper,
    Stack,
    Button,
    Breadcrumbs,
    Link,
    TextField,
    InputAdornment,
    IconButton,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { motion } from '@shared/ui/motion';

interface DocumentsToolbarProps {
    isRoot: boolean;
    isSearching: boolean;
    searchQuery: string;
    viewMode: 'grid' | 'list';
    activeType: { id: number; label: string } | null;
    activeSubtype: { id: number; label: string; typeId: number } | null;
    activeFileType: { id: number; label: string; subtypeId: number } | null;
    activeSubtypeId: number | null;
    activeFileTypeId: number | null;
    onBack: () => void;
    onClearSearch: () => void;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onResetNavigation: () => void;
    onTypeClick: (typeId: number) => void;
    onSubtypeClick: (subtypeId: number) => void;
    onToggleViewMode: () => void;
}

export const DocumentsToolbar = memo(function DocumentsToolbar({
    isRoot,
    isSearching,
    searchQuery,
    viewMode,
    activeType,
    activeSubtype,
    activeFileType,
    activeSubtypeId,
    activeFileTypeId,
    onBack,
    onClearSearch,
    onSearchChange,
    onResetNavigation,
    onTypeClick,
    onSubtypeClick,
    onToggleViewMode,
}: DocumentsToolbarProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                mt: 0,
                mb: 3,
                p: 1.5,
                px: 2,
                borderRadius: 1,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 64,
                boxSizing: 'border-box',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={2}>
                {!isRoot && (
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={isSearching ? onClearSearch : onBack}
                        variant="contained"
                        size="small"
                        aria-label={isSearching ? 'Annuler la recherche' : 'Retour au dossier parent'}
                        sx={{
                            borderRadius: 1,
                            px: 2,
                            height: 40,
                            textTransform: 'none',
                            fontWeight: 500,
                            boxShadow: 'none',
                            '&:hover': { boxShadow: 'none' },
                        }}
                    >
                        {isSearching ? 'Annuler la recherche' : 'Retour'}
                    </Button>
                )}

                <TextField
                    size="small"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={onSearchChange}
                    aria-label="Rechercher des documents"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 1,
                            bgcolor: 'grey.50',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'primary.main',
                                borderWidth: 1,
                            },
                            height: 40,
                            width: 200,
                            transition: `all ${motion.base}`,
                            '&:focus-within': { width: 300, bgcolor: 'background.paper' },
                        },
                    }}
                />

                <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="Navigation documents">
                    <IconButton
                        size="small"
                        onClick={onResetNavigation}
                        sx={{ p: 0.5, mr: 0.5 }}
                        aria-label="Retour à la racine"
                    >
                        <HomeIcon fontSize="small" />
                    </IconButton>
                    {activeType &&
                        (activeSubtypeId !== null ? (
                            <Link
                                underline="hover"
                                color="inherit"
                                onClick={() => onTypeClick(activeType.id)}
                                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                {activeType.label}
                            </Link>
                        ) : (
                            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
                                {activeType.label}
                            </Typography>
                        ))}
                    {activeSubtype &&
                        (activeFileTypeId !== null ? (
                            <Link
                                underline="hover"
                                color="inherit"
                                onClick={() => onSubtypeClick(activeSubtype.id)}
                                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                {activeSubtype.label}
                            </Link>
                        ) : (
                            <Typography color="text.primary" sx={{ fontWeight: 500 }}>
                                {activeSubtype.label}
                            </Typography>
                        ))}
                    {activeFileType && (
                        <Typography color="text.primary" sx={{ fontWeight: 500 }}>
                            {activeFileType.label}
                        </Typography>
                    )}
                </Breadcrumbs>
            </Stack>

            <Button
                variant="contained"
                size="small"
                onClick={onToggleViewMode}
                disabled={isSearching}
                aria-label={viewMode === 'grid' ? 'Afficher en liste' : 'Afficher en grille'}
                sx={{
                    minWidth: 'auto',
                    p: 1,
                    borderRadius: 1,
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                }}
            >
                {viewMode === 'grid' ? <ViewListIcon fontSize="small" /> : <GridViewIcon fontSize="small" />}
            </Button>
        </Paper>
    );
});
