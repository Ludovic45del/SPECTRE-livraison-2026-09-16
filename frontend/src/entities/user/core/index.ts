// Public API for User entity (logique uniquement)
export * from './api';
export * from './model';
export * from './lib';

// NOTE: les composants UI (UserSelect) sont exposés via @entities/user/ui
// pour éviter de tirer MUI dans tous les imports `@entities/user/core`.
