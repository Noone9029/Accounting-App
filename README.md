# LedgerByte

LedgerByte accounting SaaS foundation with a Next.js frontend, NestJS API, Prisma/PostgreSQL persistence, Redis-ready queue infrastructure, and package boundaries for accounting, ZATCA, PDF, shared types, and UI.

This is an original implementation inspired by common accounting workflows. It does not copy Wafeq branding, proprietary text, logos, UI assets, or copyrighted material.

## Stack

- Monorepo: pnpm workspaces
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL + Prisma
- Auth: JWT bearer auth
- Queue target: BullMQ + Redis ready infrastructure
- File storage target: S3-compatible storage env placeholders
- Testing: Jest

## Setup

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Docker infrastructure:

```bash
docker compose -f infra/docker-compose.yml up
```

Useful commands:

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm db:migrate
pnpm db:seed
```

Seed login:

- Email: `admin@example.com`
- Password: `Password123!`
- Demo organization id: `00000000-0000-0000-0000-000000000001`

Tenant-scoped API calls require:

```http
Authorization: Bearer <token>
x-organization-id: <organizationId>
```

## Implemented API

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Organizations:

- `POST /organizations`
- `GET /organizations`
- `GET /organizations/:id`

Accounts:

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`

Tax rates:

- `GET /tax-rates`
- `POST /tax-rates`
- `PATCH /tax-rates/:id`

Manual journals:

- `GET /journal-entries`
- `POST /journal-entries`
- `GET /journal-entries/:id`
- `PATCH /journal-entries/:id`
- `POST /journal-entries/:id/post`
- `POST /journal-entries/:id/reverse`

Contacts:

- `GET /contacts`
- `POST /contacts`
- `PATCH /contacts/:id`
- `GET /contacts/:id`

Branches:

- `GET /branches`
- `POST /branches`
- `PATCH /branches/:id`

Audit logs:

- `GET /audit-logs`

## Accounting Rules

- Every tenant business record is scoped by `organizationId`.
- Tenant endpoints validate active organization membership through `x-organization-id`.
- Journal entries are `DRAFT`, `POSTED`, `VOIDED`, or `REVERSED`.
- Posted entries cannot be edited.
- Journal entries must balance using decimal-safe values.
- Reversal creates a new posted opposite journal entry and marks the original as reversed.
- Draft-only void behavior is reserved for a future endpoint.
- Mutating services create audit log records.
- Controllers stay thin; accounting rules live in service/domain layers.

## Current Package Boundaries

- `packages/accounting-core`: decimal-safe journal rules
- `packages/zatca-core`: placeholder interfaces for future ZATCA Phase 2 integration
- `packages/pdf-core`: placeholder interfaces for server-side PDF generation
- `packages/shared`: shared tenant/API types
- `packages/ui`: small UI utility package placeholder

## Known Limitations

- ZATCA Phase 2 XML, QR, CSID, clearance, reporting, PDF/A-3, and hash-chain logic are not implemented yet.
- BullMQ workers and S3 upload adapters are not wired yet.
- Frontend pages are scaffolded; most data tables use placeholders until API data fetching is connected.
- The manual journal form needs live account selection from `GET /accounts` before it can submit real account ids.
- Authorization is role-ready but currently only enforces active organization membership.
