/**
 * Shared animations
 * @module shared/lib/animations
 *
 * Common keyframe animations used across components
 */

import { keyframes } from '@mui/material';

/**
 * Step pop animation for workflow steppers
 * Creates a scale + glow effect for step transitions
 */
export const stepPop = keyframes`
    0% {
        transform: scale(1);
        filter: drop-shadow(0 0 0 transparent);
    }
    40% {
        transform: scale(1.3);
        filter: drop-shadow(0 0 12px rgba(25, 118, 210, 0.8));
    }
    70% {
        transform: scale(1.1);
        filter: drop-shadow(0 0 6px rgba(25, 118, 210, 0.4));
    }
    100% {
        transform: scale(1);
        filter: drop-shadow(0 0 0 transparent);
    }
`;
