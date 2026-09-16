/**
 * Étape 2 — formulaire kind=element (cf. CDC §8.1 Modal kind=element).
 */

import { useMemo } from 'react';
import { Controller, useWatch, type Control, type FieldErrors } from 'react-hook-form';
import {
    Box,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import {
    CATEGORIES_BY_KIND,
    CATEGORY_LABELS,
    INSTALLATION_LABELS,
    INSTALLATION_VALUES,
    ITEM_KIND,
    STRUCTURATION_BATCH_MAX,
    STRUCTURATION_TYPE_LABELS,
    STRUCTURATION_TYPE_VALUES,
    type ElementFormValues,
} from '@entities/stock-item';
import { FsecAutocomplete, useFsecs, type Fsec } from '@entities/fsec';

/**
 * ID du statut FSEC "Tirée" (cf. backend `FSEC_STATUS_ID_TIREE`).
 * Un élément sérialisé ne peut être rattaché qu'à une FSEC non tirée.
 */
const FSEC_STATUS_ID_TIREE = 7;

interface ElementFormProps {
    control: Control<ElementFormValues>;
    errors: FieldErrors<ElementFormValues>;
    /** Si la rubrique sélectionnée est `structuration`, on affiche le select "Type". */
    showStructurationType: boolean;
    /** Si le type de structuration est `speciale`, on affiche le champ "Matériaux". */
    showMateriaux: boolean;
    /**
     * Mode « paquet » : à la création d'une structuration, on saisit un libellé
     * + une quantité, et la numérotation (nom = n° de série) est automatique.
     * Hors structuration ou en édition, ce mode est inactif.
     */
    batchMode?: boolean;
    /** Prochain numéro de série global (aperçu de la plage en mode paquet). */
    nextNumber?: number | null;
}

/**
 * Retrouve l'objet FSEC correspondant au `fsec_name` persisté (texte).
 *
 * NB : deux FSEC de campagnes différentes peuvent partager le même nom
 * (unicité backend campagne+nom) ; le premier match est retenu. La recherche
 * porte sur TOUTES les FSEC (y compris tirées) pour continuer d'afficher une
 * destination héritée, même si elle n'est plus proposée dans les options.
 */
function resolveFsecByName(fsecs: readonly Fsec[] | undefined, name: string | null | undefined): Fsec | null {
    if (!fsecs || !name) return null;
    return fsecs.find((f) => f.name === name) ?? null;
}

export function ElementForm({
    control,
    errors,
    showStructurationType,
    showMateriaux,
    batchMode = false,
    nextNumber = null,
}: ElementFormProps) {
    const elementCategories = CATEGORIES_BY_KIND[ITEM_KIND.ELEMENT];

    // Mode paquet effectif : actif uniquement à la création d'une structuration.
    const isBatch = batchMode && showStructurationType;
    const batchQuantity = useWatch({ control, name: 'batchQuantity' });
    const previewCount = typeof batchQuantity === 'number' && batchQuantity >= 1 ? batchQuantity : null;

    const { data: fsecs, isLoading: fsecsLoading } = useFsecs();

    // Options triées sur le nom complet (celui affiché dans le sélecteur).
    const fsecOptions = useMemo<Fsec[]>(() => {
        if (!fsecs) return [];
        return fsecs
            .filter((f) => f.statusId !== FSEC_STATUS_ID_TIREE)
            .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
    }, [fsecs]);

    return (
        <Stack spacing={2}>
            {isBatch ? (
                <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                        <Controller
                            name="batchQuantity"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) =>
                                        field.onChange(e.target.value === '' ? null : Number(e.target.value))
                                    }
                                    label="Quantité"
                                    required
                                    size="small"
                                    type="number"
                                    inputProps={{ min: 1, max: STRUCTURATION_BATCH_MAX }}
                                    sx={{ width: { xs: '100%', sm: 200 } }}
                                    error={!!errors.batchQuantity}
                                    helperText={errors.batchQuantity?.message ?? 'Nombre de pièces à créer'}
                                />
                            )}
                        />
                        <Box
                            sx={{
                                flex: 1,
                                px: 1.5,
                                py: 1,
                                borderRadius: 1,
                                bgcolor: 'action.hover',
                                minHeight: 40,
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                {nextNumber == null
                                    ? 'Numérotation automatique…'
                                    : previewCount == null
                                      ? `Démarre au n° ${nextNumber}`
                                      : previewCount === 1
                                        ? `Numéro attribué : n° ${nextNumber}`
                                        : `Numéros attribués : n° ${nextNumber} → n° ${nextNumber + previewCount - 1}`}
                            </Typography>
                        </Box>
                    </Stack>
                </>
            ) : (
                <>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Nom"
                                    required
                                    fullWidth
                                    size="small"
                                    placeholder={showStructurationType ? 'ex. 12' : 'ex. Cible D2, Cône Gorfou'}
                                    error={!!errors.name}
                                    helperText={
                                        errors.name?.message ??
                                        (showStructurationType ? 'N° de série de la pièce' : "Nom de l'élément")
                                    }
                                />
                            )}
                        />
                        <Controller
                            name="reference"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    value={field.value ?? ''}
                                    label="Référence"
                                    fullWidth
                                    size="small"
                                    placeholder="Identifiant unique de l'instance"
                                    error={!!errors.reference}
                                    helperText={errors.reference?.message ?? "Identifiant unique de l'instance"}
                                />
                            )}
                        />
                    </Stack>
                </>
            )}

            <Controller
                name="fsecName"
                control={control}
                render={({ field }) => {
                    // Le formulaire persiste `fsec.name` (texte, cf. backend fsec_name),
                    // JAMAIS le libellé complet : on résout l'objet pour l'affichage.
                    const selected = resolveFsecByName(fsecs, field.value);
                    // Destination héritée hors options (FSEC tirée) : on l'ajoute en
                    // tête pour que la valeur reste affichée sans avertissement MUI.
                    const options =
                        selected && !fsecOptions.includes(selected) ? [selected, ...fsecOptions] : fsecOptions;
                    return (
                        <FsecAutocomplete
                            options={options}
                            value={selected}
                            onChange={(fsec) => field.onChange(fsec?.name ?? null)}
                            onBlur={field.onBlur}
                            loading={fsecsLoading}
                            size="small"
                            noOptionsText="Aucune FSEC disponible (toutes tirées ou aucune créée)"
                            error={!!errors.fsecName}
                            helperText={errors.fsecName?.message ?? 'FSEC de destination (optionnelle, non tirée)'}
                        />
                    );
                }}
            />

            <Controller
                name="category"
                control={control}
                render={({ field }) => (
                    <FormControl size="small" fullWidth required error={!!errors.category}>
                        <InputLabel id="element-category-label">Rubrique</InputLabel>
                        <Select {...field} value={field.value ?? ''} labelId="element-category-label" label="Rubrique">
                            {elementCategories.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                    {CATEGORY_LABELS[cat]}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>{errors.category?.message ?? "Catégorie métier de l'élément"}</FormHelperText>
                    </FormControl>
                )}
            />

            {showStructurationType && (
                <Controller
                    name="structurationType"
                    control={control}
                    render={({ field }) => (
                        <FormControl size="small" fullWidth required error={!!errors.structurationType}>
                            <InputLabel id="element-structuration-type-label">Type</InputLabel>
                            <Select
                                {...field}
                                value={field.value ?? ''}
                                labelId="element-structuration-type-label"
                                label="Type"
                            >
                                {STRUCTURATION_TYPE_VALUES.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {STRUCTURATION_TYPE_LABELS[t]}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText>
                                {errors.structurationType?.message ?? 'Type de structuration'}
                            </FormHelperText>
                        </FormControl>
                    )}
                />
            )}

            <Controller
                name="installation"
                control={control}
                render={({ field }) => (
                    <FormControl error={!!errors.installation} required>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5, color: 'text.secondary' }}>
                            Installation *
                        </Typography>
                        <RadioGroup row {...field} value={field.value ?? ''}>
                            {INSTALLATION_VALUES.map((i) => (
                                <FormControlLabel
                                    key={i}
                                    value={i}
                                    control={<Radio size="small" />}
                                    label={INSTALLATION_LABELS[i]}
                                />
                            ))}
                        </RadioGroup>
                        {errors.installation && <FormHelperText>{errors.installation.message}</FormHelperText>}
                    </FormControl>
                )}
            />

            <Controller
                name="caracteristique"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Caractéristique"
                        fullWidth
                        size="small"
                        placeholder="ex. Épaisseur 50µm, Al pur 99.999%"
                        error={!!errors.caracteristique}
                        helperText={errors.caracteristique?.message}
                    />
                )}
            />

            {/* Matière / Masse (R03) — remontées dans FSEC > Assemblage > éléments. */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="matiere"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Matière"
                            fullWidth
                            size="small"
                            placeholder="ex. Or, CH, Al"
                            error={!!errors.matiere}
                            helperText={errors.matiere?.message ?? "Matière de l'élément"}
                        />
                    )}
                />
                <Controller
                    name="masseMg"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            label="Masse [mg]"
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 'any' }}
                            error={!!errors.masseMg}
                            helperText={errors.masseMg?.message ?? 'Masse en milligrammes'}
                        />
                    )}
                />
            </Stack>

            <Controller
                name="typeDeColle"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Type de colle"
                        fullWidth
                        size="small"
                        placeholder="ex. UV, 3090"
                        error={!!errors.typeDeColle}
                        helperText={errors.typeDeColle?.message}
                    />
                )}
            />

            {showMateriaux && (
                <Controller
                    name="materiauxMat"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Matériaux"
                            fullWidth
                            size="small"
                            placeholder="ex. Cu/Au"
                            error={!!errors.materiauxMat}
                            helperText={errors.materiauxMat?.message ?? 'Spécifique à la structuration spéciale'}
                        />
                    )}
                />
            )}

            <Controller
                name="fournisseur"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Fournisseur"
                        fullWidth
                        size="small"
                        error={!!errors.fournisseur}
                        helperText={errors.fournisseur?.message}
                    />
                )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="boite"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Boîte"
                            fullWidth
                            size="small"
                            placeholder="ex. A12"
                            error={!!errors.boite}
                            helperText={errors.boite?.message}
                        />
                    )}
                />
                <Controller
                    name="emplacement"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Emplacement"
                            fullWidth
                            size="small"
                            placeholder="ex. Étagère 3"
                            error={!!errors.emplacement}
                            helperText={errors.emplacement?.message}
                        />
                    )}
                />
            </Stack>

            <Controller
                name="remarques"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Observations"
                        fullWidth
                        multiline
                        minRows={3}
                        size="small"
                        placeholder="Notes internes, particularités..."
                        error={!!errors.remarques}
                        helperText={errors.remarques?.message}
                    />
                )}
            />
        </Stack>
    );
}
