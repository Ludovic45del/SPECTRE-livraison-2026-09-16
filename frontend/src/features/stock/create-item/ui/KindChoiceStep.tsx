/**
 * Étape 1 : choix du kind (élément sérialisé / consommable).
 */

import { memo } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { ITEM_KIND, type ItemKind } from '@entities/stock-item';
import { motion } from '@shared/ui/motion';

interface KindChoiceStepProps {
    selectedKind: ItemKind;
    onSelect: (kind: ItemKind) => void;
}

interface ChoiceCardProps {
    kind: ItemKind;
    title: string;
    description: string;
    color: { bg: string; text: string };
    icon: React.ReactElement;
    isSelected: boolean;
    onClick: () => void;
}

const ChoiceCard = memo(function ChoiceCard({ title, description, color, icon, isSelected, onClick }: ChoiceCardProps) {
    return (
        <Paper
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            variant="outlined"
            sx={{
                p: 2.5,
                cursor: 'pointer',
                borderRadius: 1.5,
                borderWidth: 2,
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.50' : 'background.paper',
                transition: `all ${motion.fast}`,
                '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.25,
                    bgcolor: color.bg,
                    color: color.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                }}
            >
                {icon}
            </Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.5 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {description}
            </Typography>
        </Paper>
    );
});

export function KindChoiceStep({ selectedKind, onSelect }: KindChoiceStepProps) {
    return (
        <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
                Quel type d'élément souhaitez-vous ajouter au catalogue ?
            </Typography>
            <Box
                role="radiogroup"
                aria-label="Type d'item à créer"
                sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}
            >
                <ChoiceCard
                    kind={ITEM_KIND.ELEMENT}
                    title="Élément sérialisé"
                    description="Instance unique tracée par numéro de série. Exemples : cible, structuration, plaque, cône."
                    color={{ bg: '#f3e8ff', text: '#8b5cf6' }}
                    icon={<GpsFixedIcon />}
                    isSelected={selectedKind === ITEM_KIND.ELEMENT}
                    onClick={() => onSelect(ITEM_KIND.ELEMENT)}
                />
                <ChoiceCard
                    kind={ITEM_KIND.CONSUMABLE}
                    title="Consommable"
                    description="Type avec quantité et unité. Exemples : colle, solvant, fil, adhésif."
                    color={{ bg: '#cffafe', text: '#0e7490' }}
                    icon={<Inventory2Icon />}
                    isSelected={selectedKind === ITEM_KIND.CONSUMABLE}
                    onClick={() => onSelect(ITEM_KIND.CONSUMABLE)}
                />
            </Box>
        </Stack>
    );
}
