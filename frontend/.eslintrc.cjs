module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
    ignorePatterns: ['dist', '.eslintrc.cjs', 'public'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['react-refresh', 'boundaries'],
    settings: {
        'boundaries/elements': [
            { type: 'app', pattern: ['src/app/*'] },
            { type: 'pages', pattern: ['src/pages/*'] },
            { type: 'widgets', pattern: ['src/widgets/*'] },
            { type: 'features', pattern: ['src/features/*'] },
            { type: 'entities', pattern: ['src/entities/*'] },
            { type: 'shared', pattern: ['src/shared/*'] },
        ],
        'boundaries/ignore': ['src/test/**'],
    },
    rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'boundaries/element-types': [
            2,
            {
                default: 'disallow',
                rules: [
                    { from: 'app', allow: ['pages', 'features', 'entities', 'widgets', 'shared'] },
                    { from: 'pages', allow: ['features', 'entities', 'widgets', 'shared'] },
                    { from: 'features', allow: ['entities', 'widgets', 'shared'] },
                    { from: 'entities', allow: ['shared'] },
                    { from: 'widgets', allow: ['shared'] },
                    { from: 'shared', allow: [] },
                ],
            },
        ],
    },
};
