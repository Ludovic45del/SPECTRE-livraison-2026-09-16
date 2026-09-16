# Guide de reprise — Frontend SPECTRE

Ce guide s'adresse à la personne qui **reprend l'interface web** sans l'avoir
écrite. Il explique les concepts React/TypeScript au fil de l'eau, puis montre
**où intervenir** pour les modifications les plus fréquentes.

- Ce guide = comment l'interface fonctionne et comment la modifier.
- [`README.md`](README.md) = la référence technique exhaustive (architecture
  FSD, client API, routing, tests).
- L'API consommée est dans le dossier voisin : [`../backend/`](../backend/)
  (elle a son propre guide de reprise).

---

## 1. Ce que contient la livraison

```
frontend/
├── src/                  # tout le code de l'interface
├── public/               # fichiers servis tels quels (favicon…)
├── index.html            # page hôte unique de l'application
├── package.json          # dépendances et scripts npm
├── vite.config.ts        # serveur de développement, alias, découpage du build
├── tsconfig.json         # configuration TypeScript (mode strict)
├── .eslintrc.cjs         # règles de lint, dont les frontières d'architecture
└── .prettierrc.json      # règles de formatage
```

Ce qui **n'est pas** livré, parce que ça se régénère :

| Absent | Comment le retrouver |
|--------|----------------------|
| `node_modules/` | `npm ci` (étape 2) |
| `dist/` | `npm run build` |
| `coverage/` | `npm run test:coverage` |
| `vite.config.js`, `*.tsbuildinfo` | Régénérés par `tsc -b` |

### Mettre le code sous contrôle de version

Les deux dossiers sont livrés **sans historique Git**. Le réflexe à avoir dès la
première modification :

```bash
cd <le dossier parent des deux dossiers>
git init
git add backend frontend
git commit -m "Reprise du projet SPECTRE"
```

Les fichiers `.gitignore` fournis dans chaque dossier écartent déjà ce qui ne
doit jamais être versionné (secrets, base de données, fichiers déposés par les
utilisateurs, dépendances, artefacts de build).

---

## 2. Démarrer en dix minutes

### Prérequis

- **Node.js 20** (la version utilisée en développement et en intégration continue).
- Le **backend doit tourner** sur le port 8000 : sans lui, l'interface s'affiche
  mais aucune donnée ne se charge. Voir [`../backend/GUIDE_REPRISE.md`](../backend/GUIDE_REPRISE.md).

### Installation

```bash
cd frontend
npm ci              # installe exactement les versions de package-lock.json
npm run dev         # http://localhost:3000
```

> `npm ci` plutôt que `npm install` : il installe **exactement** les versions
> verrouillées dans `package-lock.json`. `npm install` peut monter des versions
> et introduire des différences invisibles avec ce qui a été testé.

Le serveur de développement recharge la page à chaque sauvegarde. Les appels à
`/api` sont automatiquement redirigés vers `http://localhost:8000` (réglé dans
`vite.config.ts`) : il n'y a pas d'URL d'API à configurer en développement.

### Les commandes du quotidien

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Vérifie les types puis produit le site dans `dist/` |
| `npm run preview` | Sert le résultat du build, comme en production |
| `npm run lint` | Vérifie les règles de code et d'architecture |
| `npx tsc --noEmit` | Vérifie **uniquement** les types (rapide) |
| `npm run test -- --run` | Lance les tests une fois |
| `npm run test` | Lance les tests et les relance à chaque sauvegarde |

---

## 3. Les concepts utiles ici

| Notion | En une phrase | Où ça vit |
|--------|---------------|-----------|
| **Composant React** | Une fonction qui renvoie du balisage (JSX) : c'est l'unité d'interface | `*.tsx` |
| **Hook** | Une fonction réutilisable qui porte de la logique (`useXxx`) | `use*.ts` |
| **TanStack Query** | Gère les données **venant du serveur** : chargement, cache, rafraîchissement | `*/api/*.queries.ts` |
| **Zustand** | Gère l'état **local** à l'application (filtres, dialogues ouverts) | `*/model/*.store.ts` |
| **Zod** | Décrit la forme attendue d'une réponse d'API et la vérifie à l'exécution | `*/model/*.schema.ts` |
| **MUI** | La bibliothèque de composants visuels (tableaux, boutons, dialogues) | partout, via la propriété `sx` |
| **Vite** | L'outil qui sert l'application en développement et la compile | `vite.config.ts` |

Deux principes structurent tout le reste :

- **Les données du serveur ne sont jamais copiées dans un état local.** On
  appelle un hook (`useLabContacts()`), il renvoie `{ data, isLoading, error }`.
  Après une modification, on « invalide » la donnée et TanStack Query la
  recharge tout seul. Ne pas réintroduire de `useState` pour stocker une liste
  venant de l'API : les deux copies divergeraient.
- **Toute réponse d'API est validée par Zod.** Si le backend renvoie un champ
  d'un type inattendu, l'erreur apparaît immédiatement, à l'endroit exact du
  problème, plutôt qu'en `undefined` trois écrans plus loin.

---

## 4. Comment le code est organisé (et pourquoi)

Le projet suit le **Feature-Sliced Design** : les dossiers sont empilés en
couches, et une couche ne peut importer que celles situées **en dessous**.

```
  @app        providers, routeur, mise en page générale
     │
  @pages      un composant par écran (une route = une page)
     │
  @features   la logique métier d'un écran : formulaires, dialogues, filtres
     │
  @entities   une donnée métier : son schéma Zod, ses hooks d'API
     │
  @widgets    composants visuels réutilisables (tableau, barre de filtres…)
     │
  @shared     socle technique : client API, thème, utilitaires — n'importe rien
```

Un import qui remonte la pile (par exemple `@shared` important `@features`) fait
**échouer `npm run lint`**. Ce n'est pas une convention de style : c'est une
règle outillée, qui garantit qu'on peut modifier un écran sans casser les
autres.

Les alias (`@entities/...`) sont déclarés **en double**, dans `vite.config.ts`
(pour l'exécution) et `tsconfig.json` (pour les types). En ajouter un impose de
modifier les deux fichiers.

### Anatomie d'une entité

Une entité regroupe tout ce qui concerne une donnée métier :

```
src/entities/lab-contact/
├── index.ts                         # ce que les autres couches ont le droit d'utiliser
├── model/lab-contact.schema.ts      # la forme des données (Zod) + types TypeScript
└── api/
    ├── lab-contact.keys.ts          # identifiants de cache
    └── lab-contact.queries.ts       # les hooks : useLabContacts, useCreateLabContact…
```

On importe **toujours** depuis le barrel (`@entities/lab-contact`), jamais un
fichier interne : c'est ce qui permet de réorganiser l'intérieur d'une entité
sans toucher aux écrans qui s'en servent.

Les grosses entités (`campaign`, `fsec`, `fa`) sont découpées en tranches
(`core/`, `document/`, `team/`…) suivant le même schéma.

---

## 5. Le trajet d'une donnée, pas à pas

Prenons la page « Laboratoires » (l'annuaire) — le cas le plus simple du projet,
à lire en premier.

1. **Schéma** — `entities/lab-contact/model/lab-contact.schema.ts` décrit ce que
   l'API renvoie (`LabContactApiSchema`, en `snake_case`) puis le transforme en
   objet utilisable côté interface (`LabContactSchema`, en `camelCase`).
   **C'est le seul endroit où cohabitent les deux conventions de nommage.**
2. **Hook** — `entities/lab-contact/api/lab-contact.queries.ts` :
   ```ts
   export function useLabContacts() {
       return useQuery({
           queryKey: labContactKeys.lists(),
           queryFn: ({ signal }) => api.get('/lab-contacts/', LabContactListSchema, signal),
           ...QUERY_CACHE_CONFIG,
       });
   }
   ```
   Noter le chemin **relatif** : le client API ajoute `/api/v1` lui-même.
3. **Client API** — `shared/api/client.ts` ajoute le préfixe et le jeton
   d'authentification, valide la réponse avec le schéma, et rejoue la requête
   après avoir rafraîchi le jeton en cas de `401`.
4. **Page** — `pages/equipe/laboratoires.tsx` appelle le hook et affiche
   `isLoading` / `error` / les données.
5. **Modification** — un hook de mutation (`useCreateLabContact`) envoie le
   `POST`, puis **invalide** la clé de liste ; TanStack Query recharge la liste
   automatiquement. C'est pour cela qu'aucun écran ne recharge la page à la main
   après un enregistrement.

---

## 6. Où modifier quoi

| Je veux… | Je touche… |
|----------|------------|
| Changer un **libellé**, un bouton, la mise en page d'un écran | le composant dans `src/pages/<écran>/` ou `src/features/<domaine>/ui/` |
| Afficher un **nouveau champ** venu de l'API | le schéma Zod de l'entité, **puis** le composant |
| Changer une **règle de saisie** d'un formulaire | le schéma `*InputSchema` de l'entité (message d'erreur compris) |
| Modifier un **appel API** (URL, méthode, invalidation) | `entities/<entité>/api/*.queries.ts` |
| Ajouter une **page** | `src/pages/<nom>/`, puis `app/router/index.tsx` et `app/router/page-loaders.ts` |
| Changer le **menu** de navigation | `src/widgets/sidebar/` |
| Changer les **couleurs**, la typographie, les espacements | `src/shared/ui/theme.ts` |
| Changer le **comportement du tableau** (tri, colonnes, virtualisation) | `src/widgets/data-table/` |
| Changer ce qui se passe à l'**expiration de session** | `src/shared/api/client.ts` |

Règle d'or : **la donnée se décrit dans l'entité, l'affichage se code dans la
page ou la feature**. Si tu écris un `fetch` dans un composant, il échappera à
la validation Zod, au cache et à la gestion du rafraîchissement de jeton.

---

## 7. Recettes

### 7.1 Afficher un champ ajouté côté backend

Le backend expose désormais `email` sur `/lab-contacts/`. Deux fichiers :

1. **Le schéma** — `entities/lab-contact/model/lab-contact.schema.ts` :
   ```ts
   export const LabContactApiSchema = z.object({
       // …
       email: z.string().nullable().default(''),
   });

   export const LabContactSchema = LabContactApiSchema.transform((api) => ({
       // …
       email: api.email ?? '',
   }));
   ```
2. **Le composant** qui affiche la donnée (`contact.email`).

> Tant que le champ n'est pas déclaré dans le schéma, il est **absent** de
> l'objet même si l'API l'envoie : Zod ne conserve que ce qui est décrit. C'est
> volontaire, et c'est la première chose à vérifier quand « la donnée n'arrive
> pas ».

### 7.2 Ajouter un champ à un formulaire

Les formulaires utilisent React Hook Form + Zod. Le schéma de saisie
(`*InputSchema`) porte à la fois la validation **et** les messages d'erreur, en
français :

```ts
export const LabContactInputSchema = z.object({
    name: z.string().trim().min(1, 'Le nom est requis').max(150, 'Le nom ne doit pas dépasser 150 caractères'),
});
```

Puis ajouter le champ dans le composant de formulaire, et — si le nom diffère
côté API — dans la fonction `*InputToApi` qui traduit `camelCase` →
`snake_case`.

Les limites (longueurs maximales) sont **volontairement dupliquées** avec celles
du backend, sous forme de constantes exportées en haut du schéma : l'utilisateur
a un message immédiat, le backend reste l'autorité finale. Modifier une limite
suppose donc de la modifier des deux côtés.

### 7.3 Ajouter une page

1. Créer `src/pages/ma-page/index.tsx` (un composant exporté par défaut).
2. Déclarer le chargement différé dans `src/app/router/page-loaders.ts`.
3. Ajouter la route dans `src/app/router/index.tsx`.
4. Ajouter l'entrée de menu dans `src/widgets/sidebar/` si la page doit être
   accessible depuis la navigation.

Les pages sont chargées à la demande (« lazy ») : le navigateur ne télécharge
le code d'un écran que lorsqu'on s'y rend.

### 7.4 Changer l'apparence

Tout passe par le thème (`src/shared/ui/theme.ts`) et la propriété `sx` des
composants MUI :

```tsx
<Box sx={{ display: 'flex', gap: 2, p: 2 }}>
```

**Il n'y a aucun fichier CSS dans le projet, et il ne faut pas en introduire** :
les styles vivraient alors à deux endroits, avec des règles de priorité
difficiles à démêler. Une valeur utilisée à plusieurs endroits (couleur,
espacement) se déclare dans le thème.

---

## 8. Tests

```bash
npm run test -- --run                       # tout, une fois
npm run test -- --run src/entities/lab-contact   # un dossier
npm run test                                # mode surveillance (pendant le développement)
npm run test:coverage                       # + rapport de couverture
```

Les tests rendent réellement les composants dans un navigateur simulé et
cliquent dessus. Les appels réseau sont interceptés par MSW : **aucun backend
n'est nécessaire** pour lancer les tests.

```tsx
import { setup, screen } from '@test/test-utils';

it('affiche les contacts', async () => {
    setup(<LaboratoiresPage />);
    expect(await screen.findByText('Labo 426')).toBeInTheDocument();
});
```

`@test/test-utils` fournit `renderWithProviders`, `setup` (rendu + simulation de
clavier/souris), `createQueryWrapper` (pour tester un hook seul) et réexporte
Testing Library : un seul import suffit.

Les réponses simulées sont dans `src/test/mocks/`. Ajouter un endpoint côté
backend suppose d'ajouter son handler ici, sinon les tests des écrans qui
l'utilisent échoueront sur une requête non gérée.

> Ne pas confondre `src/test/mocks/` (simulations **de test**) et `src/mocks/`
> (simulation **navigateur**, utilisée uniquement par l'audit de performance).

Les seuils de couverture sont exigeants (80 % des lignes) : un écran ajouté sans
test fait baisser la couverture sous le seuil et échouer `npm run test:coverage`.

---

## 9. Pièges à connaître

1. **Un import inutilisé casse le build.** TypeScript est en mode strict avec
   `noUnusedLocals` et `noUnusedParameters` : une variable laissée après un
   remaniement fait échouer `npm run build`. Préfixer par `_` ce qu'on veut
   garder volontairement inutilisé.
2. **Les frontières d'architecture sont bloquantes.** Un import de `@features`
   depuis `@entities` fait échouer le lint. La solution n'est jamais de
   contourner la règle, mais de déplacer le code dans la bonne couche (souvent
   vers `@shared` ou `@widgets`).
3. **Nom des FSEC.** Toujours afficher `fsec.displayName`
   (`2026-LMJ_gorfou_2`), jamais `fsec.name` qui est le nom court réservé aux
   formulaires et aux identifiants.
4. **Pagination à la demande.** Ajouter `?page=` à une requête change la forme
   de la réponse (`{count, next, previous, results}` au lieu d'un tableau) : le
   schéma Zod doit suivre, sinon la validation échoue.
5. **Chemins relatifs dans les appels API.** Écrire `api.get('/campaigns/')`, et
   non `/api/v1/campaigns/` : le préfixe est ajouté par le client.
6. **Formatage.** Ne jamais lancer `prettier --write` sur `src/` entier : une
   partie des fichiers existants n'est pas conforme à la configuration et serait
   reformatée d'un bloc, noyant le vrai diff. Formater uniquement les fichiers
   modifiés :
   ```bash
   npx prettier --write src/pages/equipe/laboratoires.tsx
   ```

---

## 10. Quand quelque chose casse

| Symptôme | Où regarder |
|----------|-------------|
| Page blanche | La console du navigateur (F12, onglet Console) : l'erreur y est, avec le fichier et la ligne |
| « Aucune donnée » alors que l'API répond | Le champ manque dans le schéma Zod (§7.1), ou la validation a échoué : l'erreur est dans la console |
| Erreur de validation Zod | Le backend a changé la forme de sa réponse : aligner le schéma |
| `401` / déconnexion en boucle | Jeton expiré et rafraîchissement en échec ; vérifier que le backend tourne et que l'heure du poste est correcte |
| Requêtes vers `/api` en échec en développement | Le backend n'est pas démarré sur le port 8000 |
| `npm run build` échoue, `npm run dev` fonctionne | Une erreur de types : `npx tsc --noEmit` donne la liste (le serveur de développement, lui, ne vérifie pas les types) |
| Le lint échoue sur `boundaries/element-types` | Un import remonte la pile des couches (§9.2) |

Méthode qui marche à tous les coups : partir de l'URL affichée dans le
navigateur, retrouver la route dans `src/app/router/index.tsx`, ouvrir la page
correspondante, puis suivre les hooks qu'elle appelle. Trois fichiers suffisent
presque toujours.
