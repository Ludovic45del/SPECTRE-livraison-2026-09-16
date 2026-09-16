/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
            '@pages': fileURLToPath(new URL('./src/pages', import.meta.url)),
            '@widgets': fileURLToPath(new URL('./src/widgets', import.meta.url)),
            '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
            '@entities': fileURLToPath(new URL('./src/entities', import.meta.url)),
            '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
            '@test': fileURLToPath(new URL('./src/test', import.meta.url)),
        },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    // `use-sync-external-store` : shim React partagé par zustand
                    // (eager, app-wide) ET recharts (lazy). Sans cette clause,
                    // Rollup le range avec recharts → l'entrée tire charts-vendor
                    // (~115K gzip) au boot juste pour ce shim. On le force avec le
                    // runtime React, déjà préchargé.
                    if (id.includes('use-sync-external-store') || id.includes('/zustand/')) {
                        return 'react-vendor';
                    }
                    if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor';
                    // dayjs (eager, léger — utilisé dans main.tsx) séparé de
                    // @mui/x-date-pickers (lourd, désormais lazy) pour que les
                    // date-pickers ne soient plus préchargés au boot via dayjs.
                    if (id.includes('@mui/x-date-pickers')) return 'date-vendor';
                    if (id.includes('dayjs')) return 'dayjs-vendor';
                    if (
                        id.includes('@mui/material') ||
                        id.includes('@mui/system') ||
                        id.includes('@mui/icons-material') ||
                        id.includes('@mui/base') ||
                        id.includes('@mui/utils') ||
                        id.includes('@emotion')
                    ) {
                        return 'mui-vendor';
                    }
                    if (id.includes('@tanstack')) return 'query-vendor';
                    if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
                        return 'forms-vendor';
                    }
                    if (
                        id.includes('/react-dom/') ||
                        id.includes('/react-router') ||
                        id.includes('/react/') ||
                        id.includes('/scheduler/')
                    ) {
                        return 'react-vendor';
                    }
                    return undefined;
                },
            },
        },
    },
    preview: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: true,
        include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
        server: {
            deps: {
                inline: [/@mui\/x-date-pickers/],
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                '**/index.ts',
                'src/main.tsx',
                'src/vite-env.d.ts',
            ],
            thresholds: {
                global: {
                    lines: 80,
                    branches: 75,
                    functions: 85,
                    statements: 80,
                },
            },
        },
    },
});
