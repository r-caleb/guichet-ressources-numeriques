# Backend API

## Configuration PostgreSQL locale

1. Ouvrir pgAdmin4.
2. Créer une base de données nommée `guichet_ressources`.
3. Vérifier que `apps/backend/.env` contient une URL adaptée :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/guichet_ressources?schema=public"
```

Adapter le mot de passe si ton utilisateur PostgreSQL n'utilise pas `postgres`.

## Corriger l'erreur Prisma P1010

Si Prisma affiche :

```txt
Error: P1010: User was denied access on the database `(not available)`
```

cela signifie que PostgreSQL refuse l'accès à la base avec l'utilisateur indiqué dans `DATABASE_URL`.

Vérifier d'abord que le mot de passe dans `apps/backend/.env` est bien le mot de passe réel de l'utilisateur PostgreSQL :

```env
DATABASE_URL="postgresql://postgres:TON_VRAI_MOT_DE_PASSE@localhost:5432/guichet_ressources?schema=public"
```

Dans pgAdmin4, vérifier aussi que la base `guichet_ressources` appartient bien à l'utilisateur utilisé dans l'URL.

Option simple avec l'utilisateur `postgres` :

1. Ouvrir pgAdmin4.
2. Clic droit sur la base `guichet_ressources`.
3. Aller dans `Properties`.
4. Mettre `Owner` à `postgres`.
5. Sauvegarder.

Option SQL, dans le Query Tool connecté avec un superutilisateur :

```sql
ALTER DATABASE guichet_ressources OWNER TO postgres;
GRANT ALL PRIVILEGES ON DATABASE guichet_ressources TO postgres;
```

Puis ouvrir le Query Tool sur la base `guichet_ressources` et lancer :

```sql
ALTER SCHEMA public OWNER TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
```

Après correction, relancer :

```bash
npm --workspace apps/backend run prisma:migrate -- --name init
npm --workspace apps/backend run prisma:seed
```

## Initialiser la base

Depuis la racine du projet :

```bash
npm --workspace apps/backend run prisma:migrate -- --name init
npm --workspace apps/backend run prisma:seed
```

Le seed crée les ministères de départ et un compte administrateur local :

```txt
admin@economienumerique.gouv.cd
Admin12345!
```

Ces valeurs peuvent être changées dans `apps/backend/.env` avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

## Lancer l'API

```bash
npm run dev:backend
```

API : `http://localhost:4000/api`

Swagger : `http://localhost:4000/api/docs`

Si cette URL affiche `Cannot GET /api/docs` ou une page `404`, cela signifie généralement que le port `4000` est occupé par une ancienne instance ou par un autre service. Dans ce cas :

1. arrêter l'ancien serveur backend ;
2. relancer `npm run dev:backend` ;
3. si le port reste occupé, changer `PORT=4001` dans `apps/backend/.env`, puis ouvrir `http://localhost:4001/api/docs`.

## Endpoints principaux

| Méthode | Endpoint | Accès | Rôle |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Connexion agent/admin |
| `GET` | `/api/auth/me` | JWT | Profil connecté |
| `GET` | `/api/ministries` | Public | Liste des ministères actifs |
| `POST` | `/api/ministries` | JWT admin | Créer un ministère |
| `GET` | `/api/admin/ministries` | JWT admin | Lister tous les ministères |
| `GET` | `/api/admin/ministries/:id` | JWT admin | Détail d'un ministère |
| `PATCH` | `/api/admin/ministries/:id` | JWT admin | Modifier un ministère |
| `PATCH` | `/api/admin/ministries/:id/status` | JWT admin | Activer ou désactiver un ministère |
| `GET` | `/api/admin/users` | JWT admin | Lister les utilisateurs |
| `GET` | `/api/admin/users/:id` | JWT admin | Détail d'un utilisateur |
| `POST` | `/api/admin/users` | JWT admin | Créer un agent ou administrateur |
| `PATCH` | `/api/admin/users/:id` | JWT admin | Modifier un utilisateur |
| `PATCH` | `/api/admin/users/:id/status` | JWT admin | Activer ou désactiver un utilisateur |
| `PATCH` | `/api/admin/users/:id/password` | JWT admin | Réinitialiser un mot de passe |
| `GET` | `/api/requests/domain-availability?prefix=economie` | Public | Vérifier `economie.gouv.cd` |
| `POST` | `/api/requests` | Public | Soumettre une demande avec fichiers |
| `POST` | `/api/requests/track` | Public | Suivre un dossier |
| `POST` | `/api/requests/additional-documents` | Public sécurisé | Transmettre des documents complémentaires demandés |
| `POST` | `/api/requests/receipt.pdf` | Public sécurisé | Télécharger l'accusé de réception PDF |
| `GET` | `/api/requests/admin` | JWT agent/admin | Lister les demandes avec pagination |
| `GET` | `/api/requests/admin/:id` | JWT agent/admin | Détail d'une demande |
| `PATCH` | `/api/requests/admin/:id/status` | JWT agent/admin | Changer le statut |
| `GET` | `/api/admin/stats` | JWT agent/admin | Statistiques back-office |
| `GET` | `/api/admin/documents/:id/download` | JWT agent/admin | Télécharger un document |

## Rôles de gestion

`SUPER_ADMIN` peut gérer tous les comptes, y compris les administrateurs.

`ADMIN` peut créer et gérer les comptes `AGENT`, mais ne peut pas créer, modifier ou désactiver un compte `ADMIN` ou `SUPER_ADMIN`.

`AGENT` peut traiter les dossiers, mais ne peut pas gérer les ministères ni les utilisateurs.

## Instruction administrative

L'endpoint `PATCH /api/requests/admin/:id/status` permet de mettre à jour :

- le statut du dossier ;
- le domaine attribué ;
- le mode de transmission des accès ;
- les notes administratives internes ;
- l'observation publique visible par le Point Focal ;
- le motif de rejet.

Règles métier appliquées :

- `ADDITIONAL_DOCUMENTS_REQUESTED` exige une observation publique ;
- `RESOURCES_ASSIGNED` exige un domaine attribué ;
- `REJECTED` exige une observation publique ou un motif de rejet.

Les notes administratives internes ne sont pas exposées dans le suivi public.

Quand le statut est `ADDITIONAL_DOCUMENTS_REQUESTED`, le Point Focal peut transmettre les pièces demandées depuis le suivi public :

```http
POST /api/requests/additional-documents
Content-Type: multipart/form-data

number=DNRN-2026-0007
focalEmail=point.focal@example.com
additionalDocuments[]=piece.pdf
```

Après transmission, le dossier repasse automatiquement au statut `UNDER_REVIEW` et l'historique conserve l'ajout des documents.

## Pagination administrative

`GET /api/requests/admin` accepte `page` et `limit` :

```http
GET /api/requests/admin?page=1&limit=20&status=UNDER_REVIEW
```

Réponse :

```json
{
  "items": [],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

## Accusé de réception PDF

Après soumission, le backend génère un accusé de réception officiel au format PDF. Le document contient le logo du ministère, le numéro du dossier, le résumé de la demande, les domaines proposés, la liste des documents transmis et une ligne d'état en bas de page.

Téléchargement sécurisé :

```http
POST /api/requests/receipt.pdf
Content-Type: application/json

{
  "number": "DNRN-2026-0007",
  "focalEmail": "point.focal@example.com"
}
```

## Stockage des documents

Les documents sont stockés exclusivement dans un bucket S3 privé. Configurer `apps/backend/.env` :

```env
AWS_REGION="eu-central-1"
AWS_S3_BUCKET="guichet-ressources-documents-prod-006600132933-eu-central-1-an"
AWS_S3_PREFIX="requests"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
```

Le bucket S3 doit rester privé avec le blocage de l'accès public activé. Le frontend ne télécharge jamais directement depuis S3 : l'admin passe par `GET /api/admin/documents/:id/download`, le backend vérifie le JWT puis récupère le fichier.

Si un document ancien pointe encore vers un chemin local, le backend refuse son téléchargement : les documents de test doivent être soumis à nouveau après configuration S3.

Formats acceptés : PDF, Word, JPG, PNG.

Taille maximale : 10 Mo par fichier.
