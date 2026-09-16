/**
 * Test Setup - Vitest & RTL Configuration
 *
 * This file is loaded before each test file runs.
 * It sets up:
 * - Jest DOM matchers for Testing Library
 * - MSW server for API mocking
 * - Global test utilities
 */

import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import './blob-polyfill';
import { server } from './mocks/server';
import * as axeMatchers from 'vitest-axe/matchers';

// Extend Vitest expect with axe matchers for accessibility testing
expect.extend(axeMatchers);

// ============================================================================
// MSW SERVER SETUP
// ============================================================================

// Start MSW server before all tests
beforeAll(() => {
    server.listen({
        onUnhandledRequest: 'warn', // Warn about unhandled requests
    });
});

// Reset handlers after each test (clears any runtime handlers)
afterEach(() => {
    server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
    server.close();
});

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock window.matchMedia (required by some MUI components)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});

// Mock ResizeObserver (required by some components)
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];

    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
} as unknown as typeof IntersectionObserver;
