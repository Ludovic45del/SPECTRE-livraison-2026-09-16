# SPECTRE — Backend (Django REST API)

API REST du projet SPECTRE. Python 3.11 · Django 5.1 · Django REST Framework 3.15 ·
authentification JWT · architecture Clean Architecture stricte.

> **Première prise en main du projet ?** Lire d'abord
> [`GUIDE_REPRISE.md`](GUIDE_REPRISE.md) : installation pas à pas, concepts
> Django/DRF, « où modifier quoi », tâches d'exploitation courantes.
> Ce README-ci est la **référence technique** (API, RBAC, erreurs, tests).
>
> Interface web du projet : [`../frontend/README.md`](../frontend/README.md).

---

## Installation

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # runtime
pip install -r requirements-dev.txt      # + tests, lint, seeding (pandas/sqlalchemy)

cp .env.example .env                     # puis éditer (cf. section suivante)
python manage.py migrate
python manage.py initdb                  # référentiels + groupes RBAC
python manage.py runserver 8000
```

L'API est alors sur `http://localhost:8000/api/v1/`.

### Configuration (`.env`)

[`.env.example`](.env.example) est la **référence exhaustive** : chaque variable
lue par `config/settings.py` y est documentée avec sa valeur par défaut. Les
essentiels :

| Variable | Rôle |
|----------|------|
| `DJANGO_SECRET_KEY` | Obligatoire hors `DEBUG` (le démarrage échoue sinon) |
| `DEBUG` | `true` en dev uniquement. Monte `/admin/`, active `SessionAuthentication`, sert les médias par Django |
| `USE_SQLITE` | `True` → SQLite (air-gap, dev sans serveur) · `False` → PostgreSQL (`DB_*` obligatoires) |
| `ALLOWED_HOSTS` | Liste séparée par des virgules |
| `CORS_ALLOWED_ORIGINS` | Origines navigateur autorisées |

Les booléens sont **stricts** : `USE_SQLITE=Tru` lève une `ValueError` au
démarrage plutôt que de retomber silencieusement sur PostgreSQL.

Chaque requête HTTP est enveloppée dans une transaction
(`ATOMIC_REQUESTS=True` par défaut, réglable via `DB_ATOMIC_REQUESTS`).

---

## Commandes de management

| Commande | Effet |
|----------|-------|
| `python manage.py initdb` | Crée les groupes RBAC (`admin`/`operateur`/`lecteur`) et charge les référentiels CSV de [`app/data/`](app/data). **Idempotent.** |
| `python manage.py demo` | Wrapper tolérant aux erreurs autour d'`initdb` (ne charge **pas** de jeu de données de démonstration) |
| `python manage.py createadmin <username> [--first-name X] [--last-name Y] [--password P]` | Crée le premier compte chef de laboratoire. Sans `--password`, un mot de passe temporaire est généré et affiché une fois. |
| `python manage.py generate_fsecs` | Supprime toutes les FSECs et en génère 100 pour les tests de charge |

> Utiliser `createadmin`, **pas** `createsuperuser` : l'admin Django n'est monté
> qu'en `DEBUG` et un superuser ne porte pas de profil applicatif SPECTRE.
> Les groupes RBAC sont aussi créés par la migration `0085_seed_rbac_groups`,
> donc `migrate` seul suffit à rendre la création de comptes fonctionnelle.

---

## Architecture — Clean Architecture

```
API Controllers  ──>  Domain Services  ──>  Repository Interfaces
  (app/api/)          (app/domain/*/         (app/domain/*/
                       services/)             interface/)
      │                     │                       │
 Serializers           Beans (DTOs)          Repository Impls
 (validation           (app/domain/*/        (app/repository/*/
  d'entrée)             models/)              repositories/)
      │                     │                       │
      └────── Mappers ──────┴───── ORM Entities ────┘
            (app/mapper/)        (app/repository/*/models/)
```

### Règles de dépendance

| Couche | Peut importer | Ne doit PAS importer |
|--------|---------------|----------------------|
| Controller (`app/api/`) | Service, Mapper, Repository, Serializer, permissions | Entity directement |
| Service (`app/domain/*/services/`) | Interface repository, Bean, exceptions | Django ORM, HTTP/DRF, Serializer |
| Bean (`app/domain/*/models/`) | stdlib Python | Tout framework |
| Interface (`app/domain/*/interface/`) | Bean | Django ORM |
| Repository (`app/repository/*/repositories/`) | Interface, Bean, Entity, Mapper | Service, Controller |
| Mapper (`app/mapper/`) | Bean, Entity | Service, Controller |
| Entity (`app/repository/*/models/`) | Django `models` | Service, Bean |

Le parcours complet d'une requête à travers ces couches, avec un module réel
pris comme fil rouge, est détaillé dans
[`GUIDE_REPRISE.md`](GUIDE_REPRISE.md) (sections « Le trajet d'une requête »
et « Ajouter une fonctionnalité de bout en bout »).

### Arborescence

```
backend/
├── config/            # settings.py, urls.py (racine), wsgi.py
├── app/
│   ├── api/           # ViewSets (*Controller) + serializers d'entrée + urls.py
│   │   └── shared/    # PaginatedControllerMixin, LazyRepositoryList, contrôleurs de base
│   ├── core/          # middlewares, logging structuré, permissions RBAC, JWT, images
│   ├── domain/        # métier pur : models/ (Beans), interface/, services/
│   │   └── shared/    # interface repo enfant, génération de slug
│   ├── mapper/        # Entity <-> Bean <-> API
│   ├── repository/    # models/ (*Entity Django) + repositories/ (implémentations)
│   ├── management/    # commandes Django
│   ├── data/          # CSV des référentiels (campaign/, fsec/)
│   ├── migrations/    # historique du schéma (jusqu'à 0099_…)
│   └── tests/         # unit/ · integration/ · service/ · template/ (CSV de test)
├── requirements.txt        # runtime (PostgreSQL + WeasyPrint + Pillow)
├── requirements-dev.txt    # + pytest, black, isort, flake8, mutmut, pandas
├── requirements-prod.txt   # runtime minimal air-gap SQLite (installation offline)
├── pytest.ini · .coveragerc · setup.cfg · mypy.ini · mutmut_config.py
```

### Modules du domaine

| Module | Périmètre |
|--------|-----------|
| `campaign` | Campagnes industrielles, équipes, documents |
| `fsec` | FSECs (versionnées), équipes, documents, livraison & fiche PDF |
| `fa` | Analyses de défaillance (workflow ouverture → avancement → clôture) |
| `steps` | Étapes process : assemblage, métrologie, étanchéité, photos, et 6 étapes gaz |
| `planning` | Planning labo : semaines, périodes membres, annotations, événements |
| `embase` | Embases et étalonnages |
| `material` | Salles, machines, maintenances |
| `stock` | Catalogue, mouvements, alertes, éléments d'assemblage FSEC |
| `tasklist` | Listes de tâches partagées (widget d'accueil) : listes, tâches, commentaires |
| `labcontact` | Annuaire des laboratoires (contacts / numéros utiles, éditable par l'équipe) |
| `messaging` | Messagerie interne : conversations privées et de groupe, membres, messages (références, pièces jointes, édition, suppression logique, recherche), non-lus |
| `indicators` | KPI agrégés (page Indicateurs) — lecture seule |
| `dashboard` | Agrégation légère pour la page d'accueil — lecture seule |
| `user` | Comptes, rôles, profil, préférences dashboard |
| `shared` | Briques transverses (repository enfant générique, slugs) |

---

## API

Base : `/api/v1/`. Tous les lookups REST se font par **UUID**.

### Authentification

| Endpoint | Méthode | Note |
|----------|---------|------|
| `/auth/token/` | POST | Login. Corps : `{"username", "password"}`. Throttle **5/min**. Renvoie `access`, `refresh`, `roles` (liste), `permission_group`, `force_password_change`, `first_name` |
| `/auth/token/refresh/` | POST | Throttle **10/min**. Rotation + blacklist de l'ancien refresh |
| `/auth/token/verify/` | POST | |
| `/auth/token/blacklist/` | POST | Logout |
| `/auth/me/` | GET, PUT `update`, … | Profil courant (`IsAuthenticated`) |
| `/auth/change-password/` | POST | |
| `/auth/set-initial-password/` | POST | `AllowAny` (jeton d'activation) |
| `/auth/dashboard-preferences/` | GET/PUT | |

Jetons : accès **30 min**, refresh **24 h**, `ROTATE_REFRESH_TOKENS` +
`BLACKLIST_AFTER_ROTATION`. En-tête `Authorization: Bearer <access>`.

Tant que `force_password_change` est vrai, `ForcePasswordChangeMiddleware`
renvoie `403 FORCE_PASSWORD_CHANGE` sur les autres endpoints.

### Ressources

| Domaine | Endpoints |
|---------|-----------|
| Campagnes | `/campaigns/`, `/campaign-teams/`, `/campaign-documents/` |
| FSECs | `/fsecs/`, `/fsec-teams/`, `/fsec-documents/` |
| FA | `/fas/` |
| Embases | `/embases/`, `/etalonnages/` |
| Matériel | `/material/rooms/`, `/material/machines/`, `/material/maintenances/` |
| Stock | `/stock/catalog/`, `/stock/movements/`, `/stock/alerts/`, `/fsec-assembly-items/` |
| Étapes | `/assembly-steps/`, `/metrology-steps/`, `/sealing-steps/`, `/pictures-steps/`, `/photo-views/` |
| Étapes gaz | `/airtightness-test-lp-steps/`, `/gas-filling-bp-steps/`, `/gas-filling-hp-steps/`, `/permeation-steps/`, `/depressurization-steps/`, `/repressurization-steps/`, `/all-gas-steps/` (agrégé : 6 requêtes → 1) |
| Tâches | `/task-lists/` |
| Annuaire labos | `/lab-contacts/` |
| Messagerie | `/conversations/` (sous-routes `unread-count/`, `mentions/`, `search/`, `members/`, `read/`, `messages/`, `messages/{message_uuid}/` ; annuaire des membres : `/users/lookup/`) |
| Lecture seule | `/dashboard/`, `/indicators/` |
| Utilisateurs | `/users/` (admin), `/users/lookup/` (tout authentifié) |
| Planning | `/planning/week-states/`, `/member-periods/`, `/cell-annotations/`, `/fsec-cell-links/`, `/campaign-steps/`, `/planning-steps/`, `/lab-events/` |

Nom complet des FSEC : chaque FSEC sérialisée expose, en plus de `name` (nom
court persisté), un champ calculé `display_name` =
`{année}-{installation}_{campagne}_{name}` (ex. `2026-LMJ_gorfou_2`, helper
`app/domain/shared/naming.py`). C'est ce libellé qui est affiché partout ; il
est aussi porté par `fsec_display_name` sur les FA, `assigned_fsec_name` sur
les éléments de stock, les libellés des références de la messagerie, l'activité
récente du tableau de bord, l'historique FSEC des embases et les fiches de
livraison. Une FSEC sans campagne retombe sur son nom court.

Sous-routes récurrentes (via `@action`) :
`by-slug/<slug>/` (campagnes, FSECs, FA, embases) ·
`fsec/<id>/` (étapes, documents, équipes, FA) ·
`versions/<uuid>/`, `active/<uuid>/`, `version/<uuid>/` (versionnement FSEC) ·
`delivery-info/`, `delivery-validation/`, `delivery-sheet/` (livraison FSEC) ·
`validate-open/`, `validate-progress/`, `close/` (workflow FA) ·
`toggle/`, `reset-password/` (administration des comptes).

Particularités de la messagerie (`/conversations/`) :

- `POST /conversations/` renvoie **201** si la conversation est créée, **200** si la
  conversation privée (`direct`) entre les deux mêmes personnes existait déjà
  (création idempotente). Une privée est immuable : `PATCH`, `DELETE` et la gestion
  des membres renvoient 400.
- `DELETE /conversations/{uuid}/members/{member_uuid}/` renvoie **200** avec la
  conversation à jour quand le propriétaire retire un tiers, **204** quand le
  demandeur quitte lui-même le groupe (le départ du propriétaire transfère la
  propriété au plus ancien membre actif ; le départ du dernier membre supprime le groupe).
- Une conversation dont le demandeur n'est pas membre est traitée comme inexistante
  (**404**, jamais 403), y compris pour un uuid malformé. Un uuid de *membre*
  malformé dans le corps ou l'URL est une erreur de validation (**400**).
- `PUT` n'est pas exposé (405) ; seul `PATCH` (renommage d'un groupe par son
  propriétaire) modifie une conversation.
- **Références d'entités** : `POST /conversations/{uuid}/messages/` accepte
  `entity_refs: [{"entity_type": "fsec"|"campaign"|"fa", "entity_uuid": "…"}]`
  (10 max, dédoublonnées, corps `body` toujours requis). Une FSEC est désignée par
  son `fsec_uuid` (stable entre versions ; libellé et slug lus sur la version
  active), une campagne ou une FA par son `uuid`. Chaque cible doit exister à la
  publication (**400** sinon). Chaque message expose ensuite
  `entity_refs: [{entity_type, entity_uuid, label, slug, exists}]` : le slug est
  recalculé à la lecture avec les mêmes règles que les fiches ; si l'entité a été
  supprimée, `exists` vaut `false`, `slug` est `null` et `label` est l'instantané
  pris à la création. L'aperçu `last_message` porte `entity_ref_count`.
- `GET /conversations/mentions/?entity_type=fsec&entity_uuid=<uuid>&limit=20`
  (1 ≤ limit ≤ 50) renvoie `{"results": [{"message": …, "conversation": {uuid, kind,
  name, members}}]}` : les messages mentionnant l'entité dans les conversations
  dont le demandeur est membre, du plus récent au plus ancien. Une cible inconnue
  ou supprimée renvoie une liste vide (**200**, jamais 404) ; des paramètres
  invalides renvoient **400**. Route hors du scope `messaging_poll` (non pollée).
- **Pièces jointes** : `POST /conversations/{uuid}/messages/` accepte aussi le
  `multipart/form-data` — champs `body` (chaîne, vide toléré si au moins un fichier),
  `entity_refs` (chaîne JSON encodant la liste, **400** si invalide) et `attachments`
  (fichier répété). Limites : 5 fichiers par message, 10 Mo par fichier, extensions
  `jpg jpeg png gif webp pdf txt csv doc docx xls xlsx ppt pptx zip` (insensible à
  la casse) ; toute violation renvoie **400** sans rien écrire. Chaque message expose
  `attachments: [{uuid, original_name, content_type, size, url, is_image}]` ; l'aperçu
  `last_message` porte `attachment_count` (annoté, fichiers jamais chargés). Les
  fichiers sont stockés sous `MEDIA_ROOT/messaging/attachments/<uuid4 hex>/<nom
  nettoyé>` et servis par le reverse proxy sous `MEDIA_URL` (`/api/media/`) **sans
  contrôle d'accès applicatif**, comme les avatars et photos FSEC : c'est un
  compromis assumé (réseau fermé), l'aléa du chemin empêche seulement l'énumération.
  Les fichiers sont effacés du disque à la suppression du message, d'une pièce
  jointe ou de la conversation.
- **Édition / suppression logique** : `PATCH /conversations/{uuid}/messages/{message_uuid}/`
  (`{"body"}`) modifie le corps d'un message texte — auteur uniquement (**403** sinon),
  message système ou déjà supprimé ⇒ **400**, corps identique ⇒ aucune écriture ;
  renvoie **200** le message avec `edited_at` (et `updated_at` avancé).
  `DELETE …/messages/{message_uuid}/` supprime logiquement un message texte — par
  son auteur, ou par le propriétaire d'un **groupe** (jamais par l'autre membre d'une
  privée : **403**) ; message système ⇒ **400** ; idempotent. Renvoie **200** le
  message avec `is_deleted: true`, `deleted_at`, corps `""`, `entity_refs: []` et
  `attachments: []` ; la ligne subsiste (historique et curseurs stables) et reste
  listée dans les pages. `conversation.last_message_at` ne change pas, mais l'aperçu
  `last_message` reflète le nouveau corps / `is_deleted`. Un message inconnu, malformé
  ou d'une autre conversation renvoie **404** ; `PUT` renvoie 405.
- **Polling des modifications** : `GET /conversations/{uuid}/messages/?after=<uuid>&updated_since=<ISO 8601>`
  renvoie `{"results", "has_more", "updated"}` où `updated` liste les messages situés
  au plus tard au curseur dont `updated_at > updated_since` (éditions et suppressions
  d'anciens messages ; `[]` sans `updated_since`). `updated_since` s'utilise seul ou
  avec `after`, jamais avec `before` (**400**) ; une date naïve est interprétée dans
  le fuseau du serveur. La borne est alignée sur la fin de sa milliseconde : un
  client qui renvoie `max(updated_at)` tronqué à la milliseconde ne revoit pas
  indéfiniment le même message.
- `GET /conversations/search/?q=<terme>&limit=20` (2 ≤ len(q) ≤ 100, 1 ≤ limit ≤ 50,
  **400** sinon) renvoie `{"results": [mention…]}` (même forme que `mentions/`) : les
  messages texte non supprimés des conversations du demandeur dont le corps contient
  le terme (`icontains` ; sur SQLite l'insensibilité à la casse ne couvre que
  l'ASCII), du plus récent au plus ancien. Débit par défaut (route non pollée).

### Pagination

**Opt-in** : une liste n'est paginée que si la requête porte `?page=N`
(`PaginatedControllerMixin`). Sans ce paramètre, l'endpoint renvoie le tableau
complet. `?page_size=` est accepté, plafonné par `max_page_size` du contrôleur
(20 par défaut sur les campagnes, 100 max).

**Par curseur** (messagerie) : `GET /conversations/{uuid}/messages/` renvoie une
enveloppe `{results, has_more, updated}` en ordre chronologique croissant. Sans paramètre :
les `limit` plus récents (50 par défaut, 100 max). `?before=<uuid>` charge
l'historique antérieur au message désigné, `?after=<uuid>` les messages postérieurs
(polling). Les deux curseurs sont exclusifs (400) et doivent désigner un message de
cette conversation (404 sinon).

### RBAC

Un membre peut porter **plusieurs rôles métier** (`UserProfileEntity.roles`,
JSONField ordonné par hiérarchie). Trois **groupes de permission** Django en
sont dérivés (`ROLE_TO_PERMISSION_GROUP` dans
`app/domain/user/models/user_bean.py`) ; en cas de cumul, c'est le groupe **le
plus permissif** qui s'applique (`permission_group_for_roles`) :

| Groupe | Rôles métier | Droits |
|--------|--------------|--------|
| `admin` | `chef_labo` | CRUD complet, administration des comptes |
| `operateur` | `iec`, `rce`, `assembleur`, `metrologue`, `cryogenie` | Lecture + écriture |
| `lecteur` | `stagiaire`, `alternant` | Lecture seule |

Ainsi `chef_labo` + `stagiaire` donne le groupe `admin`. L'API expose `roles`
(liste complète, source de vérité) **et** `role` (rôle principal dérivé — le
plus haut dans la hiérarchie — pratique pour l'affichage compact et le tri).
Le filtre `/users/lookup/?role=…` matche un membre dès qu'il porte **au moins
un** des rôles demandés.

Classes de permission (`app/core/permissions.py`) :

- `IsReadOnlyOrOperateur` — **défaut global** (`DEFAULT_PERMISSION_CLASSES`) : lecture pour tout authentifié, écriture pour opérateur/admin.
- `IsReadOnlyOrAdmin` — écriture réservée aux admins. Appliqué via `get_permissions()` sur `destroy` des campagnes et des FSECs.
- `IsAdmin` — administration des comptes (`/users/`).
- `IsAuthenticated` — endpoints personnels ou partagés par l'équipe (`/auth/me/`, préférences, `/task-lists/`, `/material/*`, `/lab-contacts/`, `/conversations/`).

Un superuser Django satisfait tous les rôles.

### Débit (throttling)

`anon` 100/h · `user` 1000/h · `login` 5/min · `refresh` 10/min ·
`password_reset` 20/h (création de compte, reset, changement de mot de passe) ·
`messaging_poll` 5000/h (endpoints pollés par la messagerie : liste des
conversations, `unread-count/`, `GET messages/` — hors du budget `user`).

### Erreurs

`ErrorHandlerMiddleware` convertit les exceptions du domaine
(`app/domain/exceptions.py`) en JSON :

```json
{ "error": "…", "type": "NotFoundException", "code": "CAMPAIGN_NOT_FOUND", "status": 404 }
```

| Exception | Statut | Code générique |
|-----------|--------|----------------|
| `NotFoundException` | 404 | `NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `ValidationException` | 400 | `VALIDATION_ERROR` |
| `InvalidDataException` | 400 | `INVALID_DATA` |
| `ForbiddenException` | 403 | `FORBIDDEN` |
| `json.JSONDecodeError` | 400 | `INVALID_JSON` |
| *(non gérée)* | 500 | `INTERNAL_SERVER_ERROR` |

⚠️ Les codes **enrichis** (`CAMPAIGN_NOT_FOUND`, `CONFLICT_NAME_YEAR`,
`VALIDATION_ERROR_EMAIL`) ne sont émis qu'en `DEBUG`. En production le code
générique est renvoyé, pour ne pas exposer le schéma. Un client ne doit donc
pas dépendre du suffixe.

### Traçabilité

`RequestIDMiddleware` attribue un identifiant à chaque requête (réutilise
`X-Request-ID` s'il vient d'un proxy), l'injecte dans le contexte de logging et
le renvoie en en-tête `X-Request-ID`. Les logs sont structurés hors `DEBUG`
(`app/core/logging.py`).

---

## Tests

```bash
pytest                                        # tout
pytest app/tests/unit        -m unit          # rapide, sans DB
pytest app/tests/integration -m integration   # DB réelle
pytest app/tests/service     -m service       # workflows, repositories mockés
```

| Palier | Emplacement | Couverture exigée en CI |
|--------|-------------|-------------------------|
| `unit` | `app/tests/unit/` | **80 %** sur `app/domain` + `app/mapper` |
| `integration` | `app/tests/integration/` | **70 %** sur `app` |
| `service` | `app/tests/service/` | — |

```bash
# Reproduction exacte des commandes CI
pytest app/tests/unit -m unit \
  --cov=app/domain --cov=app/mapper --cov-report=term-missing --cov-fail-under=80
pytest app/tests/integration -m integration \
  --cov=app --cov-report=term-missing --cov-fail-under=70
```

Fixtures partagées dans `app/tests/conftest.py`, factories Factory Boy dans
`app/tests/factories.py`, CSV de test dans `app/tests/template/`.

---

## Qualité

```bash
black .                                              # format
isort --profile=black --line-length=120 .            # imports
flake8 app --max-line-length=120 --exclude=migrations

# Outils avancés — non inclus dans requirements-dev.txt, à installer à la demande
pip install mypy==1.13.0 django-stubs[compatible-mypy]==5.1.1 djangorestframework-stubs==3.15.1
mypy app                # baseline permissive (mypy.ini) + allowlist stricte

pip install vulture==2.13
vulture                 # code mort, config dans setup.cfg [vulture]

mutmut run              # tests de mutation sur app/domain (mutmut est dans requirements-dev)
```

Configuration : `setup.cfg` (isort, flake8, mutmut, vulture), `mypy.ini`,
`.coveragerc`, `pytest.ini`.
