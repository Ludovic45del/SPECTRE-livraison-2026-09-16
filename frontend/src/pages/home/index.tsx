/**
 * Home Page — Customizable Dashboard
 * @module pages/home
 *
 * Orchestrates the widget grid with user preferences.
 */

import { Container } from '@mui/material';

import WelcomeHeader from './components/WelcomeHeader';
import { DashboardGrid } from '@features/dashboard';

// ============================================================================
// Page Component
// ============================================================================

export default function HomePage() {
    return (
        <Container maxWidth={false} sx={{ py: 4 }}>
            <WelcomeHeader />
            <DashboardGrid />
        </Container>
    );
}
