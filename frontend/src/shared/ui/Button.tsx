/**
 * Reusable Button Component
 * @module shared/ui
 *
 * Standardized button component with primary/secondary variants.
 * Used across all dialogs and forms for consistent styling.
 */

import { memo, forwardRef } from 'react';
import { Button as MuiButton, CircularProgress, type ButtonProps as MuiButtonProps } from '@mui/material';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'text';

export interface ButtonProps {
    /** Button variant */
    variant?: ButtonVariant;
    /** Button content */
    children: React.ReactNode;
    /** Disabled state */
    disabled?: boolean;
    /** Button type */
    type?: 'button' | 'submit' | 'reset';
    /** Click handler */
    onClick?: () => void;
    /** Loading state - shows spinner and disables button */
    loading?: boolean;
    /** Start icon */
    startIcon?: React.ReactNode;
    /** End icon */
    endIcon?: React.ReactNode;
    /** Button size */
    size?: 'small' | 'medium' | 'large';
    /** Full width */
    fullWidth?: boolean;
    /** Additional class name */
    className?: string;
}

const variantMapping: Record<ButtonVariant, { variant: MuiButtonProps['variant']; color: MuiButtonProps['color'] }> = {
    primary: { variant: 'contained', color: 'primary' },
    secondary: { variant: 'outlined', color: 'primary' },
    danger: { variant: 'contained', color: 'error' },
    text: { variant: 'text', color: 'inherit' },
};

/**
 * Reusable Button component with standardized variants
 *
 * @example
 * // Primary button
 * <Button variant="primary" onClick={handleSave}>Sauvegarder</Button>
 *
 * // Secondary button
 * <Button variant="secondary" onClick={handleCancel}>Annuler</Button>
 *
 * // Loading state
 * <Button variant="primary" loading={isPending}>Enregistrement...</Button>
 *
 * // Submit button
 * <Button variant="primary" type="submit">Soumettre</Button>
 */
export const Button = memo(
    forwardRef<HTMLButtonElement, ButtonProps>(function Button(
        {
            variant = 'primary',
            children,
            disabled = false,
            type = 'button',
            onClick,
            loading = false,
            startIcon,
            endIcon,
            size = 'medium',
            fullWidth = false,
            className,
        },
        ref,
    ) {
        const { variant: muiVariant, color } = variantMapping[variant];

        return (
            <MuiButton
                ref={ref}
                variant={muiVariant}
                color={color}
                disabled={disabled || loading}
                type={type}
                onClick={onClick}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
                endIcon={endIcon}
                size={size}
                fullWidth={fullWidth}
                className={className}
            >
                {children}
            </MuiButton>
        );
    }),
);
