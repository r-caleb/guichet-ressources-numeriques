# Architecture fonctionnelle

## Espaces publics

- `/` : depot d'une demande par un Point Focal.
- `/suivi` : consultation publique limitee de l'etat d'un dossier.

Le suivi demande le numero de dossier et l'adresse email du Point Focal.

## Back-office

- `/admin/login` : connexion des agents.
- `/admin/dashboard` : indicateurs.
- `/admin/dossiers` : liste, filtres et recherche.
- `/admin/dossiers/:id` : instruction, documents, statut, observations et historique.
- `/admin/ministeres` : referentiel des ministeres et institutions.
- `/admin/utilisateurs` : agents et roles.

Le back-office n'est pas un onglet public. Il est protege par authentification et roles.

## Backend NestJS

Modules prevus :

- `auth` : connexion, JWT, roles.
- `users` : agents administratifs.
- `ministries` : ministeres et institutions.
- `requests` : dossiers administratifs.
- `documents` : stockage local et telechargement securise.
- `audit` : journal des actions.
- `admin` : routes agregees de back-office.
- `prisma` : acces base de donnees.

## Stockage local

Les fichiers sont ranges par dossier :

```text
uploads/
  requests/
    DNRN-2026-0001/
      official-letter.pdf
      focal-point-designation.pdf
```

La base de donnees conserve les metadonnees : nom original, type, taille, chemin local, dossier associe et date.
