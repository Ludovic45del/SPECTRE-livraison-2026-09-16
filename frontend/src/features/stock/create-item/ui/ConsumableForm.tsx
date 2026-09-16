/**
 * Étape 2 — formulaire kind=consumable (cf. CDC §8.1 Modal kind=consumable).
 */

import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { CATEGORIES_BY_KIND, CATEGORY_LABELS, ITEM_KIND, type ConsumableFormValues } from '@entities/stock-item';

interface ConsumableFormProps {
    control: Control<ConsumableFormValues>;
    errors: FieldErrors<ConsumableFormValues>;
}

export function ConsumableForm({ control, errors }: ConsumableFormProps) {
    const consumableCategories = CATEGORIES_BY_KIND[ITEM_KIND.CONSUMABLE];
    return (
        <Stack spacing={2}>
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
                            error={!!errors.name}
                            helperText={errors.name?.message}
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
                            error={!!errors.reference}
                            helperText={errors.reference?.message}
                        />
                    )}
                />
            </Stack>

            <Controller
                name="category"
                control={control}
                render={({ field }) => (
                    <FormControl size="small" fullWidth required error={!!errors.category}>
                        <InputLabel id="consumable-category-label">Rubrique</InputLabel>
                        <Select
                            {...field}
                            value={field.value ?? ''}
                            labelId="consumable-category-label"
                            label="Rubrique"
                        >
                            {consumableCategories.map((cat) => (
                                <MenuItem key={cat} value={cat}>
                                    {CATEGORY_LABELS[cat]}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>{errors.category?.message ?? 'Catégorie métier du consommable'}</FormHelperText>
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
                        error={!!errors.caracteristique}
                        helperText={errors.caracteristique?.message}
                    />
                )}
            />

            <Controller
                name="typeDeColle"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Type de colle / nature"
                        fullWidth
                        size="small"
                        placeholder="ex. Époxy, cyanoacrylate, silicone…"
                        error={!!errors.typeDeColle}
                        helperText={errors.typeDeColle?.message}
                    />
                )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                    name="quantite"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                            label="Quantité initiale"
                            required
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0 }}
                            error={!!errors.quantite}
                            helperText={errors.quantite?.message}
                        />
                    )}
                />
                <Controller
                    name="unite"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            label="Unité"
                            required
                            fullWidth
                            size="small"
                            placeholder="ex. tubes, L, kg…"
                            error={!!errors.unite}
                            helperText={errors.unite?.message}
                        />
                    )}
                />
                <Controller
                    name="seuilAlerte"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            label="Seuil d'alerte"
                            fullWidth
                            size="small"
                            type="number"
                            inputProps={{ min: 0 }}
                            error={!!errors.seuilAlerte}
                            helperText={errors.seuilAlerte?.message ?? 'Alerte si stock ≤ seuil'}
                        />
                    )}
                />
            </Stack>

            <Controller
                name="typeDAchat"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        value={field.value ?? ''}
                        label="Type d'achat"
                        fullWidth
                        size="small"
                        error={!!errors.typeDAchat}
                        helperText={errors.typeDAchat?.message}
                    />
                )}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                <Controller
                    name="datePeremption"
                    control={control}
                    render={({ field }) => (
                        <DatePicker
                            label="Date de péremption"
                            value={field.value ? dayjs(field.value) : null}
                            onChange={(value) => field.onChange(value ? value.toDate() : null)}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    error: !!errors.datePeremption,
                                    helperText:
                                        (errors.datePeremption?.message as string | undefined) ??
                                        'Alerte 30 jours avant',
                                },
                            }}
                        />
                    )}
                />
            </Stack>

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
                        placeholder="Conditions de stockage, particularités..."
                        error={!!errors.remarques}
                        helperText={errors.remarques?.message}
                    />
                )}
            />
        </Stack>
    );
}
