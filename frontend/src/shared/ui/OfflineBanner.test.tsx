/**
 * Tests for the OfflineBanner component (Axe 4).
 *
 * Surfaces network-offline state to the user since TanStack Query silently
 * pauses mutations when offline — without a banner the UI looks broken.
 */

import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';

import { OfflineBanner } from './OfflineBanner';

function setNavigatorOnline(value: boolean) {
    Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => value,
    });
}

function fireConnectivityEvent(name: 'online' | 'offline') {
    act(() => {
        window.dispatchEvent(new Event(name));
    });
}

describe('<OfflineBanner />', () => {
    it('hides when the browser reports online', () => {
        setNavigatorOnline(true);
        render(<OfflineBanner />);
        expect(screen.queryByText(/Connexion réseau perdue/i)).toBeNull();
    });

    it('appears on the offline event', () => {
        setNavigatorOnline(true);
        render(<OfflineBanner />);
        fireConnectivityEvent('offline');
        expect(screen.getByText(/Connexion réseau perdue/i)).toBeInTheDocument();
    });

    it('disappears when the browser comes back online', () => {
        setNavigatorOnline(false);
        render(<OfflineBanner />);
        expect(screen.getByText(/Connexion réseau perdue/i)).toBeInTheDocument();
        fireConnectivityEvent('online');
        expect(screen.queryByText(/Connexion réseau perdue/i)).toBeNull();
    });
});
