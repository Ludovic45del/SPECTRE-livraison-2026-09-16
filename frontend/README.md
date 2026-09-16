# SPECTRE — Frontend (React SPA)

SPA React du projet SPECTRE. React 18.3 · TypeScript 5.5 (strict) · Vite 5.3 ·
MUI 6 · TanStack Query · Zustand · Zod. Architecture **Feature-Sliced Design**.

> **Première prise en main du projet ?** Lire d'abord
> [`GUIDE_REPRISE.md`](GUIDE_REPRISE.md) : installation pas à pas, concepts
> React/TypeScript, « où modifier quoi », recettes de modification courantes.
> Ce README-ci est la **référence technique** (FSD, client API, routing, tests).
>
> API consommée : [`../backend/README.md`](../backend/README.md).

---

## Installation

```bash
cd frontend
npm ci
npm run dev        # http://localhost:3000 — /api est proxifié vers :8000
```

Le backend doit tourner sur le port 8000 (cf. [`../backend/README.md`](../backend/README.md)).

### Scripts

| Script | Effet |
|--------|-------|
| `npm run dev` | Serveur de dev Vite (port 3000, proxy `/api` → `http://localhost:8000`) |
| `npm run build` | `tsc -b` puis build Vite de production |
| `npm run preview` | Sert le build (port 3000, même proxy) |
| `npm run lint` | ESLint sur tout le projet |
| `npm run test` | Vitest en mode watch |
| `npm run test:ui` | Vitest avec interface |
| `npm run test:coverage` | Vitest one-shot + couverture (échoue sous les seuils) |

### Variables d'environnement

Centralisées et typées dans [`src/shared/config/env.ts`](src/shared/config/env.ts) —
c'est le **seul** endroit où `import.meta.env` est lu.

| Variable | Défaut | Rôle |
|----------|--------|------|
| `VITE_PHOTO_FOLDER_ROOT` | `\\serveur\photos` | Racine UNC du partage réseau des photos FSEC |
| `VITE_ENABLE_MSW` | *(non défini)* | `true` active le worker MSW — utilisé par le build `--mode lighthouse` |

`.env.lighthouse` déclare aussi `VITE_API_BASE_URL`, mais **aucun code ne la
lit** : la base `/api/v1` est en dur dans `src/shared/api/client.ts`. Ne pas
compter dessus pour changer l'URL de l'API.

---

## Architecture — Feature-Sliced Design

### Couches et alias

| Alias | Chemin | Responsabilité | Peut importer |
|-------|--------|----------------|---------------|
| `@app` | `src/app` | Providers, router, layouts | pages, features, entities, widgets, shared |
| `@pages` | `src/pages` | Composants de route | features, entities, widgets, shared |
| `@features` | `src/features` | Logique métier (formulaires, modales, filtres) | entities, widgets, shared |
| `@entities` | `src/entities` | Modèles, hooks API, schémas Zod | shared |
| `@widgets` | `src/widgets` | Composants UI réutilisables | shared |
| `@shared` | `src/shared` | Client API, thème, utilitaires, constantes | *(rien)* |
| `@test` | `src/test` | Setup, utilitaires de test, mocks MSW | *(exclu des règles)* |

Ces règles ne sont pas déclaratives : elles sont **appliquées par ESLint**
(`eslint-plugin-boundaries`, règle `boundaries/element-types` en niveau
`error`). Une violation fait échouer `npm run lint` et donc la CI. Les alias
sont déclarés en double dans [`vite.config.ts`](vite.config.ts) (résolution) et
[`tsconfig.json`](tsconfig.json) (types) — ajouter un alias impose de toucher
les deux.

### Structure d'une entité

Une entité se découpe en **slices** métier, chacune avec ses segments
`api/` · `model/` · `lib/`, et un barrel `index.ts` qui en constitue l'API
publique :

```
src/entities/campaign/
├── index.ts                    # export * from './core' | './document' | './team'
├── core/
│   ├── index.ts
│   ├── model/campaign.schema.ts        # Zod : *ApiSchema, *Schema, *CreateSchema, *PatchSchema
│   ├── api/campaign.keys.ts            # fabrique de query keys
│   ├── api/campaign.queries.ts         # hooks TanStack Query
│   └── lib/referential.ts              # hydratation des référentiels
├── document/  (api/ · model/)
└── team/      (api/ · model/ · lib/)
```

Importer depuis le barrel (`@entities/campaign`), pas depuis un fichier interne.

### Client API

[`src/shared/api/client.ts`](src/shared/api/client.ts) — wrapper `fetch` qui :

- préfixe toutes les URLs par `/api/v1` → les hooks passent des chemins **relatifs** (`api.get('/campaigns/')`, jamais `/api/v1/campaigns/`) ;
- injecte le JWT et rejoue la requête après un refresh sur `401` (mutex anti-rafale), puis déconnecte si le refresh échoue ;
- valide la réponse avec le schéma Zod fourni ;
- applique un timeout de 30 s par requête ;
- expose `get(url, schema?, signal?)`, `post/put/patch(url, body, schema?)`, `delete(url, schema?)` et `postBlob(url, body, signal?)` pour les réponses binaires (PDF).

Il ne connaît pas `@features` : le store d'auth s'y injecte via
`initApiClient(provider)` depuis `app/providers` — c'est ce qui garde la
règle FSD `shared → rien`.

### État

| Type | Technologie | Emplacement |
|------|-------------|-------------|
| Serveur | TanStack Query | `@entities/*/api/*.queries.ts` |
| Client | Zustand | `@features/*/model/*.store.ts` |
| Formulaires | React Hook Form + Zod | dans les composants `@features` |

Query keys hiérarchiques (`all` → `lists()` → `details()` → `detail(uuid)`)
pour des invalidations ciblées ; config de cache partagée via
`QUERY_CACHE_CONFIG` (`@shared/lib`).

### Routing

React Router v6, routes déclarées dans
[`src/app/router/index.tsx`](src/app/router/index.tsx). Chaque page est chargée
en lazy via `lazyWithRetry(pageImports.x)` (rechargement propre après un déploiement
qui invalide les chunks) et enveloppée dans un `QuerySafeErrorBoundary`.

Routes : `/login`, `/auth/set-initial-password`, `/` (accueil), `/campagnes`,
`/campagne-details/:campaignSlug/*`, `/fsecs`, `/fsec-details/:fsecSlug/*`,
`/fas`, `/fa-details/:faSlug/*`, `/embases`, `/embase-details/:embaseSlug/*`,
`/planning`, `/indicateurs/{fa,fsec,campagne}`, `/stock/*`, `/materiel`,
`/equipe/{annuaire,carte,laboratoires}`, `/messagerie/:conversationUuid?`
(messagerie interne : liste + fil, polling 5 s ; un message peut référencer des
FSEC / campagnes / FA — chips cliquables, `@` dans le composer ;
pièces jointes (5 max, 10 Mo), édition et suppression logique de ses messages,
recherche plein-texte dans ses conversations), `/changer-mot-de-passe`.

### Style

MUI `sx` + Emotion, thème dans [`src/shared/ui/theme.ts`](src/shared/ui/theme.ts).
**Aucun fichier CSS.** Composants mémoïsés (`memo`) et handlers stabilisés
(`useCallback`) sur les vues à forte densité de données.

### Build

Le découpage manuel des chunks (`manualChunks` dans `vite.config.ts`) isole
`react-vendor`, `mui-vendor`, `charts-vendor`, `query-vendor`, `forms-vendor`,
`date-vendor` et `dayjs-vendor`. Les commentaires du fichier expliquent les
regroupements non évidents (le shim `use-sync-external-store` est forcé dans
`react-vendor` pour éviter de précharger `recharts` au boot) — les relire avant
d'y toucher.

---

## Tests

Vitest + Testing Library + MSW, environnement `jsdom`.

```bash
npm run test              # watch
npm run test -- --run     # one-shot
npm run test:coverage     # + couverture
```

Seuils (échec en dessous) : **80 %** lignes · **75 %** branches ·
**85 %** fonctions · 80 % statements.

Utilitaires ([`src/test/test-utils.tsx`](src/test/test-utils.tsx)) :

| Helper | Usage |
|--------|-------|
| `renderWithProviders(ui)` | Rend avec QueryClient, Router et provider de localisation |
| `setup(ui)` | `renderWithProviders` + instance `userEvent` |
| `createQueryWrapper()` | Wrapper pour `renderHook` sur les hooks de query |
| `createTestQueryClient()` | QueryClient sans retry ni cache |
| `server`, `errorHandlers`, `emptyHandlers` | Serveur MSW et jeux de handlers |
| `axe` | Assertions d'accessibilité (`vitest-axe`) |

Le module réexporte `@testing-library/react` et `userEvent` : un seul import
suffit dans les tests.

Handlers MSW dans `src/test/mocks/` (`handlers.ts`, plus des fichiers dédiés
pour planning, stock, tasklist).

> Ne pas confondre `src/test/mocks/` (mocks **de test**, serveur Node) et
> `src/mocks/` (worker **navigateur**, utilisé uniquement par le build
> Lighthouse pour auditer le front sans backend).

---

## Qualité

```bash
npm run lint                                                    # ESLint (dont boundaries FSD)
npx tsc --noEmit                                                # types (strict)
npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css}"        # format
npx knip                                                        # code/exports morts (indicatif)

# Audit Lighthouse local (backend mocké par MSW)
npm run build -- --mode lighthouse
npx vite preview --port 4173 --host 127.0.0.1     # dans un autre terminal
npx -y @lhci/cli@latest collect --config=.lighthouserc.json
```

TypeScript est en mode strict complet, **`noUnusedLocals` et
`noUnusedParameters` inclus** : un import laissé après un refactor casse le
build. Préfixer un paramètre par `_` pour le neutraliser volontairement.

Prettier est configuré par [`.prettierrc.json`](.prettierrc.json) : 4 espaces,
guillemets simples, 120 colonnes, virgules finales.

> ⚠️ Ne jamais lancer `prettier --write` sur `src/` entier : une partie des
> fichiers existants n'est pas conforme à cette configuration et serait
> reformatée d'un bloc, noyant le vrai diff. Ne formater que les fichiers
> effectivement modifiés.
