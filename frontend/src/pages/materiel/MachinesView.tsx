/**
 * MachinesView — tableau récapitulatif global du parc machines.
 * @module pages/materiel
 *
 * Une seule route (`/materiel`) affiche toutes les machines de toutes salles.
 * Le filtrage par salle se fait via le popover de la toolbar.
 *
 * Pattern aligné sur `pages/fsecs` / `pages/embases` :
 *  - Toolbar (recherche + filtres + bouton "Ajouter") en haut
 *  - Header de table dans son propre Paper outlined (colonnes triables)
 *  - Body de table dans un second Paper avec mt:3, tableLayout: fixed + colgroup
 *  - Pagination intégrée dans le Paper du body
 */

import { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Chip,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TablePagination,
    TableRow,
    TableSortLabel,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import {
    MACHINE_STATUS,
    MACHINE_STATUS_LABELS,
    type MachineStatus,
    useMachineRooms,
    useMachines,
} from '@entities/material';
import { MachineModal } from '@features/material/manage-machine';
import { MachineDetailModal } from '@features/material/view-machine';
import { FilterToolbar } from '@widgets/filter-toolbar';
import { ROWS_PER_PAGE_OPTIONS, useEntityList } from '@shared/lib';
import { MACHINE_COLUMNS, MACHINE_COLUMN_WIDTHS } from './constants';
import { filterMachines, sortMachines, type MachineSortColumn, type MachinesFilters } from './machines-list-utils';
import { MachineTableRow } from './components/MachineTableRow';

const STATUS_VALUES: MachineStatus[] = [
    MACHINE_STATUS.IN_SERVICE,
    MACHINE_STATUS.OUT_OF_SERVICE,
    MACHINE_STATUS.UNDER_MAINTENANCE,
];

export default function MaterielMachinesView() {
    const theme = useTheme();

    const [modalOpen, setModalOpen] = useState(false);
    const [detailUuid, setDetailUuid] = useState<string | null>(null);
    const [filters, setFilters] = useState<MachinesFilters>({
        search: '',
        status: null,
        roomId: null,
    });

    const { data: rooms = [] } = useMachineRooms();
    const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

    const { data: machines, isLoading, error } = useMachines(null);

    const {
        sortColumn,
        sortDirection,
        page,
        rowsPerPage,
        handleSort,
        handleChangePage,
        handleChangeRowsPerPage,
        paginate,
    } = useEntityList<MachineSortColumn>({ defaultSortColumn: 'room' });

    const processedMachines = useMemo(() => {
        if (!machines) return [];
        const filtered = filterMachines(machines, filters);
        return sortMachines(filtered, sortColumn, sortDirection, rooms);
    }, [machines, rooms, filters, sortColumn, sortDirection]);

    const paginatedMachines = useMemo(() => paginate(processedMachines), [paginate, processedMachines]);

    const handleOpenDetail = useCallback((uuid: string) => setDetailUuid(uuid), []);
    const handleCloseDetail = useCallback(() => setDetailUuid(null), []);

    const activeFilterCount = (filters.status !== null ? 1 : 0) + (filters.roomId !== null ? 1 : 0);

    const handleSearchChange = useCallback((value: string) => setFilters((prev) => ({ ...prev, search: value })), []);
    const handleResetFilters = useCallback(() => setFilters({ search: '', status: null, roomId: null }), []);

    const renderPopoverContent = useCallback(
        () => (
            <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                    <InputLabel id="machines-filter-room">Salle</InputLabel>
                    <Select
                        labelId="machines-filter-room"
                        label="Salle"
                        value={filters.roomId ?? ''}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                roomId: e.target.value === '' ? null : Number(e.target.value),
                            }))
                        }
                    >
                        <MenuItem value="">— Toutes —</MenuItem>
                        {rooms.map((room) => (
                            <MenuItem key={room.id} value={room.id}>
                                {room.code} — {room.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                    <InputLabel id="machines-filter-status">Statut</InputLabel>
                    <Select
                        labelId="machines-filter-status"
                        label="Statut"
                        value={filters.status ?? ''}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                status: e.target.value === '' ? null : (e.target.value as MachineStatus),
                            }))
                        }
                    >
                        <MenuItem value="">— Tous —</MenuItem>
                        {STATUS_VALUES.map((status) => (
                            <MenuItem key={status} value={status}>
                                {MACHINE_STATUS_LABELS[status]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Stack>
        ),
        [filters.status, filters.roomId, rooms],
    );

    const renderFilterChips = useCallback(() => {
        const chips: React.ReactNode[] = [];
        if (filters.roomId !== null) {
            const room = roomById.get(filters.roomId);
            chips.push(
                <Chip
                    key="room"
                    label={`Salle: ${room?.code ?? filters.roomId}`}
                    onDelete={() => setFilters((prev) => ({ ...prev, roomId: null }))}
                    color="primary"
                    size="small"
                />,
            );
        }
        if (filters.status !== null) {
            chips.push(
                <Chip
                    key="status"
                    label={`Statut: ${MACHINE_STATUS_LABELS[filters.status]}`}
                    onDelete={() => setFilters((prev) => ({ ...prev, status: null }))}
                    color="primary"
                    size="small"
                />,
            );
        }
        return chips.length > 0 ? <>{chips}</> : null;
    }, [filters.roomId, filters.status, roomById]);

    if (error) {
        return (
            <Container maxWidth={false} sx={{ py: 4 }}>
                <Alert severity="error">
                    Erreur lors du chargement des machines : {error instanceof Error ? error.message : 'inconnue'}
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            {/* Toolbar */}
            <FilterToolbar
                searchPlaceholder="Rechercher une machine…"
                filterName={filters.search}
                onFilterNameChange={handleSearchChange}
                onResetFilters={handleResetFilters}
                activeFilterCount={activeFilterCount}
                onAdd={() => setModalOpen(true)}
                renderPopoverContent={renderPopoverContent}
                renderFilterChips={renderFilterChips}
            />

            {/* Table Header */}
            <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', py: 1.25 }}>
                    {MACHINE_COLUMNS.map((col) => (
                        <Box key={col.key} sx={{ width: col.width, pl: 2 }}>
                            <TableSortLabel
                                active={sortColumn === col.key}
                                direction={sortColumn === col.key ? sortDirection : 'asc'}
                                onClick={() => handleSort(col.key)}
                                sx={{ fontWeight: 500, fontSize: '0.95rem' }}
                            >
                                {col.label}
                            </TableSortLabel>
                        </Box>
                    ))}
                    <Box sx={{ width: MACHINE_COLUMN_WIDTHS.actions }} />
                </Box>
            </Paper>

            {/* Table Body */}
            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderColor: 'divider', borderRadius: 1, mt: 3 }}
            >
                <Table sx={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        {Object.values(MACHINE_COLUMN_WIDTHS).map((width, i) => (
                            <col key={i} style={{ width }} />
                        ))}
                    </colgroup>
                    <TableBody>
                        {isLoading &&
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow
                                    key={i}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                        },
                                    }}
                                >
                                    <TableCell colSpan={MACHINE_COLUMNS.length + 1}>
                                        <Skeleton variant="text" height={32} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        {!isLoading &&
                            paginatedMachines.map((machine) => (
                                <MachineTableRow
                                    key={machine.uuid}
                                    machine={machine}
                                    room={roomById.get(machine.roomId)}
                                    onNavigate={handleOpenDetail}
                                />
                            ))}
                        {!isLoading && paginatedMachines.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={MACHINE_COLUMNS.length + 1} align="center">
                                    <Typography color="text.secondary" sx={{ py: 4 }}>
                                        {activeFilterCount > 0 || filters.search
                                            ? 'Aucune machine ne correspond aux filtres.'
                                            : "Aucune machine enregistrée pour l'instant."}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={processedMachines.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                    labelRowsPerPage="Lignes par page:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
                />
            </TableContainer>

            {modalOpen && <MachineModal open={modalOpen} onClose={() => setModalOpen(false)} />}
            {detailUuid && (
                <MachineDetailModal open={Boolean(detailUuid)} onClose={handleCloseDetail} machineUuid={detailUuid} />
            )}
        </Container>
    );
}
