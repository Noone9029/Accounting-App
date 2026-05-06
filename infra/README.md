# Local Infrastructure

This folder contains local development infrastructure.

```bash
docker compose -f infra/docker-compose.yml up
```

Services:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- NestJS API on `localhost:4000`
- Next.js web app on `localhost:3000`

Run migrations and seed data from the repo root after dependencies are installed:

```bash
pnpm db:migrate
pnpm db:seed
```
