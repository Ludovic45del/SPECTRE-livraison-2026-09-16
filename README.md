# SPECTRE

Application web de suivi d'un laboratoire : campagnes industrielles, FSECs,
analyses de défaillance, étapes process, planning, stock, matériel, messagerie
interne et indicateurs.

Deux dossiers, deux applications indépendantes qui communiquent par une API REST :

| Dossier | Rôle | Stack |
|---------|------|-------|
| [`backend/`](backend/) | API REST, métier, base de données | Python 3.11 · Django 5.1 · Django REST Framework 3.15 · PostgreSQL 16 · JWT |
| [`frontend/`](frontend/) | Interface web (SPA) | React 18 · TypeScript 5 · Vite 5 · MUI 6 · TanStack Query |

## Par où commencer

Chaque dossier contient deux documents :

- **`GUIDE_REPRISE.md`** : installation pas à pas, concepts, « où modifier quoi ».
  À lire en premier si tu reprends le projet.
- **`README.md`** : référence technique (API, architecture, tests, qualité).

Ordre conseillé : [backend/GUIDE_REPRISE.md](backend/GUIDE_REPRISE.md) puis
[frontend/GUIDE_REPRISE.md](frontend/GUIDE_REPRISE.md).

## Démarrage rapide

Prérequis : Python 3.11, Node.js 20, PostgreSQL 16.

```bash
# Base PostgreSQL (une seule fois)
sudo -u postgres psql -c "CREATE USER spectre WITH PASSWORD 'motdepasse';"
sudo -u postgres psql -c "CREATE DATABASE spectre OWNER spectre;"

# Backend — terminal 1
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # mettre USE_SQLITE=False et renseigner DB_*
python manage.py migrate
python manage.py initdb
python manage.py createadmin monlogin --first-name Prénom --last-name Nom
python manage.py runserver 8000

# Frontend — terminal 2
cd frontend
npm ci
npm run dev                     # http://localhost:3000, /api proxifié vers :8000
```

## Tests

```bash
cd backend && pytest            # Python
cd frontend && npm run test     # Vitest
```

## Ce qui n'est pas versionné

Ne jamais ajouter au dépôt : `backend/.env` (secrets), `backend/media/`
(fichiers déposés par les utilisateurs), `.venv/`, `node_modules/`, `dist/`.
Vérifier `git status` avant chaque `git add`.
