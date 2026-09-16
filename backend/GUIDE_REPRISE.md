# Guide de reprise — Backend SPECTRE

Ce guide s'adresse à la personne qui **reprend l'application** sans l'avoir
écrite. Il part du principe que Django et l'API REST ne sont pas ton quotidien :
il explique les concepts au fur et à mesure, puis montre **où intervenir** pour
les modifications les plus fréquentes.

- Ce guide = comment le projet fonctionne et comment le modifier.
- [`README.md`](README.md) = la référence technique exhaustive (liste des
  endpoints, RBAC, codes d'erreur, seuils de tests). On y revient une fois le
  fonctionnement général compris.
- L'interface web est dans le dossier voisin : [`../frontend/`](../frontend/)
  (elle a son propre guide de reprise).

---

## 1. Ce que contient la livraison

```
backend/                      ← l'API : tout le métier et la base de données
├── config/                   # configuration Django (settings, urls racine, wsgi)
├── app/                      # le code de l'application
├── manage.py                 # point d'entrée de toutes les commandes Django
├── requirements*.txt         # dépendances Python
├── .env.example              # modèle de configuration (à copier en .env)
└── pytest.ini, setup.cfg…    # configuration des outils (tests, lint)
```

Ce qui **n'est pas** livré, parce que ça se régénère ou que ça ne doit jamais
circuler :

| Absent | Pourquoi | Comment le retrouver |
|--------|----------|----------------------|
| `.env` | Contient la clé secrète et les identifiants de base | `cp .env.example .env` puis remplir |
| `db.sqlite3` | Base de données locale (données de dev) | `python manage.py migrate` la recrée vide |
| `media/` | Fichiers déposés par les utilisateurs (avatars, photos, pièces jointes) | Recréé automatiquement au premier upload |
| `.venv/`, `venv/` | Environnement Python local | Recréé à l'installation (étape 2) |

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

## 2. Démarrer en quinze minutes

### Prérequis

- **Python 3.11** (la version utilisée en développement et en intégration continue).
- Aucune base de données à installer pour commencer : le projet tourne sur
  **SQLite** (un simple fichier) en développement.

### Installation

```bash
cd backend
python3.11 -m venv .venv          # crée un environnement Python isolé
source .venv/bin/activate         # à refaire à chaque nouveau terminal
pip install -r requirements.txt       # dépendances de l'application
pip install -r requirements-dev.txt   # + outils de test et de qualité

cp .env.example .env              # configuration locale
python manage.py migrate          # crée la base et son schéma
python manage.py initdb           # charge les référentiels + les groupes de droits
python manage.py createadmin monlogin --first-name Prénom --last-name Nom
python manage.py runserver 8000
```

L'API répond alors sur `http://localhost:8000/api/v1/`.

> **`source .venv/bin/activate`** : sans cette ligne, `python` et `pip` désignent
> le Python du système et les dépendances du projet sont introuvables. Le prompt
> du terminal affiche `(.venv)` quand l'environnement est actif.

`createadmin` affiche **une seule fois** un mot de passe temporaire si tu n'as
pas passé `--password`. Note-le : il est demandé à la première connexion, et
l'API refuse toute autre requête tant qu'il n'a pas été changé
(`ForcePasswordChangeMiddleware`).

> Utiliser `createadmin`, **jamais** `createsuperuser` : un superuser Django n'a
> pas de profil applicatif SPECTRE (rôle métier, préférences) et l'application
> ne saura pas quoi en faire.

### Vérifier que tout est sain

```bash
pytest app/tests/unit -m unit      # ~ rapide, sans base de données
```

Si cette commande passe, l'installation est bonne.

### Configuration (`.env`)

[`.env.example`](.env.example) liste **toutes** les variables lues par le code,
avec leur rôle et leur valeur par défaut. Les quatre à connaître :

| Variable | Rôle |
|----------|------|
| `DJANGO_SECRET_KEY` | Clé de signature des jetons. Obligatoire dès que `DEBUG` est faux |
| `DEBUG` | `true` **en développement uniquement**. Expose l'admin Django et des messages d'erreur détaillés |
| `USE_SQLITE` | `True` → base fichier SQLite · `False` → PostgreSQL (renseigner alors les `DB_*`) |
| `ALLOWED_HOSTS` | Noms de domaine / IP autorisés à servir l'application |

⚠️ Les booléens sont **stricts** : écrire `USE_SQLITE=Tru` fait échouer le
démarrage avec une erreur explicite, plutôt que de basculer silencieusement sur
PostgreSQL. C'est voulu : une faute de frappe ne doit pas envoyer l'application
sur la mauvaise base.

---

## 3. Les concepts Django utiles ici

Cinq notions suffisent pour se repérer.

| Notion | En une phrase | Dans ce projet |
|--------|---------------|----------------|
| **Modèle (ORM)** | Une classe Python qui décrit une table ; Django génère le SQL | `app/repository/*/models/*_entity.py` |
| **Migration** | Un fichier qui décrit un changement de schéma de base, appliqué dans l'ordre | `app/migrations/0001…0099` |
| **Vue / ViewSet** | Le code qui reçoit une requête HTTP et renvoie une réponse | `app/api/*/`*_controller.py* |
| **Serializer** | Valide les données **entrantes** (types, longueurs, obligatoires) | `app/api/*/serializers.py` |
| **Middleware** | Du code qui enveloppe **chaque** requête (avant/après la vue) | `app/core/middleware.py` |
| **Commande de management** | Un script lancé par `python manage.py <nom>` | `app/management/commands/` |

Deux comportements globaux, posés par les middlewares, expliquent beaucoup de
choses :

- **Chaque requête HTTP est une transaction** (`ATOMIC_REQUESTS`). Si une
  exception remonte, **tout** ce que la requête a écrit est annulé. On ne trouve
  donc jamais de demi-enregistrement en base.
- **Les exceptions métier deviennent des réponses JSON.** Lever
  `NotFoundException` dans un service produit un `404` propre ; on n'écrit
  jamais `return Response(status=404)` à la main dans le service.

---

## 4. Comment le code est organisé (et pourquoi)

Le projet suit une **Clean Architecture** : le métier (les règles) est isolé du
framework (Django) et de la base. Concrètement, un même concept métier existe
sous trois formes, dans trois couches différentes :

```
        HTTP                                    Base de données
          │                                            │
   ┌──────▼──────┐    ┌────────────┐    ┌──────────────▼──────────────┐
   │ Controller  │───▶│  Service   │───▶│ Repository (interface + impl)│
   │  app/api/   │    │ app/domain │    │      app/repository/         │
   └──────┬──────┘    └─────┬──────┘    └──────────────┬──────────────┘
          │                 │                          │
    Serializer          Bean (dataclass)          Entity (modèle Django)
   (valide l'entrée)   (objet métier pur)        (la table SQL)
          │                 │                          │
          └──────── Mapper : traduit d'une forme à l'autre ─────────┘
                          app/mapper/
```

| Couche | Rôle | Règle absolue |
|--------|------|---------------|
| **Controller** (`app/api/`) | Reçoit la requête, valide l'entrée, appelle le service, renvoie du JSON | Ne touche jamais l'ORM directement |
| **Service** (`app/domain/*/services/`) | **Les règles métier.** Fonctions simples, repository passé en premier argument | Aucun import Django/DRF : pas de `models`, pas de `Response` |
| **Bean** (`app/domain/*/models/`) | L'objet métier : une `@dataclass` Python pure | Bibliothèque standard uniquement |
| **Interface** (`app/domain/*/interface/`) | Le contrat que le service attend d'un repository (`I*Repository`) | Permet de tester le service sans base |
| **Repository** (`app/repository/*/repositories/`) | La seule couche qui parle à la base | Écritures en `@transaction.atomic` |
| **Entity** (`app/repository/*/models/`) | Le modèle Django = la table | Clés étrangères en `PROTECT` |
| **Mapper** (`app/mapper/`) | Traduit Entity ↔ Bean ↔ JSON d'API | Ne contient aucune règle métier |

**Pourquoi cette gymnastique ?** Parce que les règles métier peuvent alors être
testées en une milliseconde, sans base de données : on remplace le repository
par un faux objet. C'est ce qui permet à la suite de tests unitaires de tourner en
quelques secondes, et donc de la lancer à chaque modification.

**Comment s'y retrouver :** les noms sont systématiques. Pour un concept `X`, on
trouve `XBean`, `IXRepository`, `XRepository`, `XEntity`, `XController`,
`x_service.py`, `x_mapper.py`. Un `grep -r "LabContact" app` donne la liste
complète des fichiers d'un module.

### Les modules du domaine

`campaign` (campagnes) · `fsec` (FSECs, versions, livraison) · `fa` (analyses de
défaillance) · `steps` (étapes de process) · `planning` · `embase` (+
étalonnages) · `material` · `stock` · `tasklist` · `labcontact` (annuaire) ·
`messaging` (messagerie interne) · `indicators` et `dashboard` (lecture seule) ·
`user` · `shared` (briques transverses).

---

## 5. Le trajet d'une requête, pas à pas

Prenons `GET /api/v1/lab-contacts/` — l'annuaire des laboratoires, le module le
plus simple du projet (une poignée de fichiers). C'est **le module à lire en
premier** pour
comprendre le patron ; tous les autres le reproduisent en plus gros.

1. **Route** — `app/api/urls.py` associe `lab-contacts` à `LabContactController`.
2. **Middlewares** — identifiant de requête (`X-Request-ID`), authentification
   JWT, ouverture de la transaction.
3. **Controller** — `app/api/labcontact/lab_contact_controller.py` : la méthode
   `list()` appelle le service en lui passant son repository, puis renvoie le
   résultat du mapper en `JsonResponse`.
4. **Service** — `app/domain/labcontact/services/lab_contact_service.py` :
   `get_all_contacts(repository)`. Ici, simple délégation ; sur un `POST`, c'est
   lui qui nettoie les champs et lève `ValidationException` si le nom est vide.
5. **Repository** — `app/repository/labcontact/repositories/…` : la requête ORM
   (`LabContactEntity.objects.order_by(...)`), puis conversion de chaque ligne
   en bean par le mapper.
6. **Mapper** — `app/mapper/labcontact/lab_contact_mapper.py` : `entity_to_bean`
   à l'aller, `bean_to_api` au retour (c'est là que `created_at` devient une
   chaîne de date, et que le `snake_case` de l'API est figé).
7. **Réponse** — JSON, transaction validée, `X-Request-ID` renvoyé.

Si une exception métier est levée à l'étape 4, tout s'arrête : le middleware
d'erreurs la transforme en JSON (`{"error", "type", "code", "status"}`) et la
transaction est annulée.

---

## 6. Où modifier quoi

| Je veux… | Je touche… |
|----------|------------|
| Changer une **règle métier** (validation, calcul, workflow) | `app/domain/<module>/services/*_service.py` |
| Ajouter/modifier un **champ** en base | l'`*_entity.py`, le `*_bean.py`, le mapper, le serializer + **une migration** |
| Changer ce que **renvoie** l'API | la fonction `*_bean_to_api` du mapper |
| Changer ce que l'API **accepte** | `app/api/<module>/serializers.py` |
| Ajouter une **route** ou une sous-route | le controller (méthode ou `@action`) + `app/api/urls.py` |
| Changer **qui a le droit** de faire quoi | `permission_classes` du controller, classes dans `app/core/permissions.py` |
| Changer une **requête SQL** (tri, filtre, performance) | le repository du module |
| Changer un **message d'erreur** | l'exception levée dans le service |
| Changer un **réglage global** (durée des jetons, limites de débit, CORS) | `config/settings.py` (et `.env` pour ce qui est configurable) |
| Ajouter une **donnée de référence** (liste déroulante figée) | les CSV de `app/data/` + `initdb` |

Règle d'or pour ne jamais se tromper de couche : **une règle métier se code dans
un service**. Si tu écris une condition métier dans un controller ou un
repository, elle échappera aux tests unitaires et sera oubliée au prochain
endpoint qui touche la même donnée.

---

## 7. Recettes

### 7.1 Ajouter un champ à une ressource existante

Exemple : ajouter un champ `email` aux contacts de l'annuaire. Il y a **six
fichiers** à toucher, toujours dans cet ordre (du métier vers la base, puis vers
l'extérieur) :

1. **Bean** — `app/domain/labcontact/models/lab_contact_bean.py` :
   ```python
   email: str = ""
   ```
2. **Entity** — `app/repository/labcontact/models/lab_contact_entity.py` :
   ```python
   email = models.CharField(max_length=254, blank=True, default="")
   ```
   Toujours prévoir un `default` : sans lui, la migration ne peut pas remplir
   les lignes existantes.
3. **Migration** :
   ```bash
   python manage.py makemigrations   # génère app/migrations/0100_….py
   python manage.py migrate          # l'applique
   ```
   **Relire le fichier généré avant de l'appliquer** (cf. §8).
4. **Mapper** — `app/mapper/labcontact/lab_contact_mapper.py` : ajouter le champ
   dans `entity_to_bean`, `bean_to_entity`, `update_entity_from_bean`,
   `api_to_bean` et `bean_to_api`. Un champ oublié dans l'une de ces fonctions
   se traduit par une valeur qui « ne se sauvegarde pas » ou « n'apparaît pas ».
5. **Serializer** — `app/api/labcontact/serializers.py` : déclarer le champ dans
   le serializer de création **et** dans celui de PATCH, sinon l'API ignorera
   silencieusement la valeur envoyée.
6. **Service** — si le champ a une règle (format, obligatoire, unicité), la
   coder dans `_validate()` et lever `ValidationException("email", "…")`.
7. **Tests** — ajouter le champ dans les tests de mapper et un test de
   validation dans les tests de service (§9).

Côté interface : le schéma Zod correspondant côté frontend doit être mis à jour,
sinon la réponse sera rejetée par la validation. Voir le guide du frontend.

### 7.2 Ajouter une règle de validation

Tout se passe dans le service du module :

```python
if len(bean.name) > LAB_CONTACT_NAME_MAX_LENGTH:
    raise ValidationException("name", f"Le nom ne doit pas dépasser {LAB_CONTACT_NAME_MAX_LENGTH} caractères")
```

`ValidationException` devient automatiquement un `400` avec le nom du champ. Les
autres exceptions disponibles (`app/domain/exceptions.py`) :
`NotFoundException` → 404, `ConflictException` → 409 (doublon),
`ForbiddenException` → 403, `InvalidDataException` → 400.

Ajouter aussi la contrainte dans le serializer quand elle est purement
syntaxique (longueur, type) : l'entrée est alors rejetée avant même d'atteindre
le métier.

### 7.3 Ajouter une ressource complète

Suivre l'ordre du module `labcontact`, en copiant ses sept fichiers :

```
bean → interface → service → entity → repository → mapper → serializer
     → controller → route dans app/api/urls.py → migration → tests
```

Ce sens n'est pas arbitraire : on décrit d'abord **ce que la chose est** (bean),
puis **ce qu'on peut en faire** (interface, service), et seulement ensuite
**comment on la stocke et l'expose**. Chaque étape ne dépend que des
précédentes.

### 7.4 Changer les droits d'accès

Trois classes dans `app/core/permissions.py`, à poser sur le controller :

```python
permission_classes = [IsReadOnlyOrOperateur]   # défaut global du projet
```

- `IsReadOnlyOrOperateur` — lecture pour tout compte connecté, écriture pour
  opérateur et admin. C'est le **défaut** : ne rien déclarer revient à ça.
- `IsReadOnlyOrAdmin` — écriture réservée au chef de laboratoire (utilisé pour
  la suppression des campagnes et des FSECs).
- `IsAdmin` — administration des comptes.
- `IsAuthenticated` — tout compte connecté, y compris en écriture (annuaire,
  listes de tâches, matériel, messagerie).

Pour n'appliquer une règle stricte qu'à **une** action, surcharger
`get_permissions()` dans le controller (voir le controller des campagnes).

Les trois groupes (`admin`, `operateur`, `lecteur`) sont dérivés des rôles
métier de l'utilisateur ; un compte qui cumule des rôles obtient le groupe le
plus permissif. La table de correspondance est dans
`app/domain/user/models/user_bean.py`.

---

## 8. Les migrations, sans se faire peur

Une migration est un fichier Python numéroté qui décrit un changement de schéma.
Django retient celles qui ont été appliquées : `migrate` n'exécute que les
nouvelles.

```bash
python manage.py makemigrations       # génère le fichier à partir des modèles
python manage.py migrate              # applique
python manage.py showmigrations       # liste, avec [X] pour celles appliquées
python manage.py migrate app 0098     # revient en arrière (si réversible)
```

**Les précautions qui comptent :**

1. **Relire le fichier généré.** Django devine ; il se trompe parfois de
   direction (renommage vu comme une suppression + un ajout ⇒ perte de données).
2. **Un champ ajouté doit avoir une valeur par défaut**, sinon la migration
   demande quoi mettre dans les lignes existantes.
3. **Ne jamais modifier une migration déjà appliquée en production.** On en
   ajoute une nouvelle par-dessus.
4. **Le code doit fonctionner sur SQLite *et* PostgreSQL** : le déploiement du
   laboratoire utilise SQLite, le développement peut utiliser PostgreSQL. Éviter
   tout SQL brut spécifique à un moteur.
5. **Sauvegarder avant d'appliquer en production** (§10).

---

## 9. Tests

```bash
pytest app/tests/unit        -m unit          # rapide, sans base
pytest app/tests/integration -m integration   # avec une vraie base
pytest app/tests/service     -m service       # workflows complets
pytest app/tests/unit/labcontact -m unit -v   # un seul module
```

| Palier | Ce qu'il vérifie | Couverture attendue |
|--------|------------------|---------------------|
| `unit` | Les règles métier (services, mappers), repository simulé | 80 % sur `app/domain` + `app/mapper` |
| `integration` | L'API bout en bout via un client HTTP de test | 70 % sur `app` |
| `service` | Les enchaînements métier (workflows) | — |

**Écrire un test de service** — le patron est toujours le même : on remplace le
repository par un faux objet conforme à l'interface, donc aucune base n'est
nécessaire.

```python
from unittest.mock import create_autospec
import pytest
from app.domain.exceptions import ValidationException
from app.domain.labcontact.interface.lab_contact_repository import ILabContactRepository
from app.domain.labcontact.models.lab_contact_bean import LabContactBean
from app.domain.labcontact.services import lab_contact_service as svc


@pytest.fixture
def repo():
    return create_autospec(ILabContactRepository, instance=True)


@pytest.mark.unit
def test_nom_vide_refuse(repo):
    with pytest.raises(ValidationException):
        svc.create_contact(repo, LabContactBean(name="   "))
```

`create_autospec` sur l'**interface** garantit que le test casse si la signature
du repository change : c'est le filet de sécurité de l'architecture.

Les tests d'intégration utilisent les fixtures de `app/tests/conftest.py`
(client authentifié, utilisateurs de chaque rôle) et les factories de
`app/tests/factories.py` (création rapide d'objets en base).

**Réflexe à garder :** modifier une règle métier, c'est modifier son test dans
la foulée. Un test qui casse après un changement volontaire se met à jour ; un
test qu'on supprime laisse un trou.

---

## 10. Exploitation courante

```bash
# Créer un compte chef de laboratoire (mot de passe temporaire affiché)
python manage.py createadmin prenom.nom --first-name Prénom --last-name Nom

# Recharger les référentiels et les groupes de droits (sans risque, idempotent)
python manage.py initdb

# Sauvegarder la base SQLite (à faire avant toute migration en production)
cp db.sqlite3 "sauvegarde-$(date +%F).sqlite3"

# Ouvrir une console Python avec l'application chargée (lecture, dépannage)
python manage.py shell
```

Les autres comptes se créent depuis l'interface web (page Équipe), par un chef
de laboratoire. Le mot de passe oublié se réinitialise au même endroit.

**Les fichiers déposés par les utilisateurs** (avatars, signatures, photos,
pièces jointes de la messagerie) vivent dans `media/`. Ce dossier n'est pas dans
la livraison et n'est pas versionné : **c'est une donnée de production, à
sauvegarder au même titre que la base.**

---

## 11. Pièges à connaître

Ces comportements sont volontaires mais surprennent quand on les découvre en
lisant le code.

1. **Pagination à la demande.** Une liste ne renvoie une enveloppe
   `{count, next, previous, results}` que si la requête contient `?page=N`.
   Sans ce paramètre, c'est le tableau complet. Ajouter `?page=` quelque part
   oblige donc à adapter le client.
2. **Nom des FSEC.** `name` est le nom court stocké ; l'API expose en plus
   `display_name` (`2026-LMJ_gorfou_2`), calculé par
   `app/domain/shared/naming.py`. C'est **toujours** `display_name` qu'on
   affiche ; `name` sert aux formulaires et à la persistance.
3. **Codes d'erreur détaillés seulement en développement.** `CAMPAIGN_NOT_FOUND`
   n'apparaît qu'avec `DEBUG=true` ; en production c'est `NOT_FOUND`. Ne jamais
   faire dépendre un traitement du suffixe.
4. **Limites de débit.** 5 connexions/minute, 10 rafraîchissements de jeton par
   minute. Une boucle de tests manuels peut se faire bloquer temporairement :
   c'est normal, attendre une minute.
5. **Changement de mot de passe forcé.** Tant qu'un compte n'a pas changé son
   mot de passe initial, toutes ses requêtes renvoient `403
   FORCE_PASSWORD_CHANGE`.
6. **Formatage.** Lancer `black .` ou `isort .` **sans option** : la
   configuration est dans `setup.cfg`. Passer une largeur de ligne différente
   reformaterait des centaines de fichiers d'un coup et rendrait le diff
   illisible. Ne formater que les fichiers réellement modifiés :
   ```bash
   black app/domain/labcontact/services/lab_contact_service.py
   flake8 app --max-line-length=120 --exclude=migrations
   ```

---

## 12. Quand quelque chose casse

| Symptôme | Où regarder |
|----------|-------------|
| `500` sur un endpoint | La console du serveur : la trace complète y est. Chaque log porte l'identifiant de requête (`X-Request-ID`) qui permet de relier la trace à l'appel du navigateur |
| `403 FORCE_PASSWORD_CHANGE` | Le compte doit changer son mot de passe initial |
| `401` en boucle côté interface | Jeton expiré et rafraîchissement en échec : se reconnecter |
| `no such table` / `column` | Migrations non appliquées : `python manage.py migrate` |
| Le serveur refuse de démarrer | Lire le message : clé secrète absente hors `DEBUG`, ou booléen mal orthographié dans `.env` |
| Un champ « ne se sauvegarde pas » | Champ oublié dans le mapper ou dans le serializer (§7.1) |
| Un test d'intégration échoue seul | Vérifier les fixtures de `conftest.py` : le rôle du compte de test conditionne les droits |

Méthode qui marche à tous les coups pour comprendre un comportement : partir de
la route dans `app/api/urls.py`, ouvrir le controller, puis suivre le service.
Trois fichiers suffisent presque toujours.
