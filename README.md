# Guichet des ressources numeriques gouvernementales

Plateforme de demande, d'instruction et de suivi des ressources numeriques gouvernementales sous `.gouv.cd`.

## Architecture

```text
apps/
  frontend/  Next.js - pages publiques et back-office
  backend/   NestJS - API, Prisma, stockage S3 privé des documents
docs/        Notes d'architecture et charte RGPNE
```

## Choix techniques

- Frontend : Next.js avec App Router.
- Backend : NestJS, DTOs, guards, services et modules comme le projet covoiturage.
- Base de donnees : PostgreSQL avec Prisma.
- Fichiers : bucket S3 prive, jamais expose directement en public.
- Charte : RGPNE, palette officielle RDC et structure institutionnelle.

## Scripts

```bash
npm install
npm run dev:frontend
npm run dev:backend
```

Chaque app garde aussi ses propres scripts dans son `package.json`.
