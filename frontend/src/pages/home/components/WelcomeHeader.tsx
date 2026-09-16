/**
 * Welcome header — greeting, date, and dashboard actions.
 * @module pages/home/components/WelcomeHeader
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, Paper } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

import { useMe, formatRoles } from '@entities/user';
import {
    useDashboardPreferences,
    useUpdateDashboardPreferences,
    DEFAULT_PREFERENCES,
} from '@entities/dashboard-preferences';
import { Button } from '@shared/ui/Button';
import { useDashboardStore, WIDGET_REGISTRY } from '@features/dashboard';
import UserAvatarSection from './UserAvatarSection';

dayjs.locale('fr');

function getGreeting(): string {
    const hour = dayjs().hour();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

interface AddWidgetMenuProps {
    hiddenWidgets: [string, (typeof WIDGET_REGISTRY)[string]][];
    onAddWidget: (widgetId: string) => void;
}

const AddWidgetMenu = memo<AddWidgetMenuProps>(function AddWidgetMenu({ hiddenWidgets, onAddWidget }) {
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);

    const handleOpen = useCallback(() => setMenuOpen(true), []);
    const handleClose = useCallback(() => setMenuOpen(false), []);

    const handleSelect = useCallback(
        (id: string) => {
            onAddWidget(id);
            setMenuOpen(false);
        },
        [onAddWidget],
    );

    return (
        <>
            <Button
                variant="primary"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={handleOpen}
                ref={addBtnRef}
            >
                Ajouter
            </Button>
            <Menu anchorEl={addBtnRef.current} open={menuOpen} onClose={handleClose}>
                {hiddenWidgets.map(([id, meta]) => {
                    const Icon = meta.icon;
                    return (
                        <MenuItem key={id} onClick={() => handleSelect(id)}>
                            <ListItemIcon>
                                <Icon sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText>{meta.label}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
});

interface EditModeActionsProps {
    onCancel: () => void;
    onSave: () => void;
    isSaving: boolean;
}

function EditModeActions({ onCancel, onSave, isSaving }: EditModeActionsProps) {
    return (
        <>
            <Button variant="text" size="small" startIcon={<CloseIcon sx={{ fontSize: 16 }} />} onClick={onCancel}>
                Annuler
            </Button>
            <Button
                variant="primary"
                size="small"
                startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
                onClick={onSave}
                loading={isSaving}
            >
                Sauvegarder
            </Button>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function WelcomeHeader() {
    const { data: user, isLoading: userLoading } = useMe();
    const { data: prefs } = useDashboardPreferences();
    const updatePrefs = useUpdateDashboardPreferences();
    const { isEditMode, draftPrefs, snapshotPrefs, enterEditMode, exitEditMode, updateDraft } = useDashboardStore();

    const today = dayjs().format('dddd D MMMM YYYY');
    const greeting = getGreeting();
    const displayName = user ? user.firstName || user.username : '';
    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.username[0]?.toUpperCase()
        : '';
    const roleLabel = user?.roles?.length ? formatRoles(user.roles) : '';

    const currentWidgets = isEditMode ? draftPrefs?.widgets : prefs?.widgets;

    const hiddenWidgets = useMemo(
        () => Object.entries(WIDGET_REGISTRY).filter(([id]) => currentWidgets?.[id]?.visible === false),
        [currentWidgets],
    );

    const handleEnterEdit = useCallback(() => {
        if (prefs) enterEditMode(prefs);
    }, [prefs, enterEditMode]);

    const handleCancel = useCallback(() => {
        if (snapshotPrefs) {
            updatePrefs.mutate(snapshotPrefs);
        }
        exitEditMode();
    }, [snapshotPrefs, updatePrefs, exitEditMode]);

    const handleSave = useCallback(() => {
        if (draftPrefs) {
            updatePrefs.mutate(draftPrefs);
        }
        exitEditMode();
    }, [draftPrefs, updatePrefs, exitEditMode]);

    const handleAddWidget = useCallback(
        (widgetId: string) => {
            const defaultItem = DEFAULT_PREFERENCES.layout.find((l) => l.i === widgetId);
            const newItem = defaultItem ?? { i: widgetId, x: 0, y: 999, w: 6, h: 3, minW: 4, minH: 2 };
            updateDraft((draft) => ({
                ...draft,
                widgets: { ...draft.widgets, [widgetId]: { visible: true } },
                layout: [...draft.layout.filter((l) => l.i !== widgetId), newItem],
            }));
        },
        [updateDraft],
    );

    return (
        <Paper
            elevation={0}
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
                p: 3,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <UserAvatarSection
                userLoading={userLoading}
                initials={initials}
                greeting={greeting}
                displayName={displayName}
                today={today}
                roleLabel={roleLabel}
                avatarUrl={user?.avatarUrl}
                user={user ?? null}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {isEditMode && hiddenWidgets.length > 0 && (
                    <AddWidgetMenu hiddenWidgets={hiddenWidgets} onAddWidget={handleAddWidget} />
                )}
                {isEditMode ? (
                    <EditModeActions onCancel={handleCancel} onSave={handleSave} isSaving={updatePrefs.isPending} />
                ) : (
                    <Button
                        variant="primary"
                        size="small"
                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                        onClick={handleEnterEdit}
                    >
                        Personnaliser
                    </Button>
                )}
            </Box>
        </Paper>
    );
}
