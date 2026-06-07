# Sales/AR Local Services Bring-up Preflight

Date: 2026-06-04

Sprint: Local Services Bring-up and Sales/AR Walkthrough Dry-run Sprint

## 1. Git Branch And Working Tree

Current branch:

`codex/dev-12-generated-documents-storage-retention`

Working tree summary:

- The repository is already dirty from prior LedgerByte development sprints.
- Sales/AR, dashboard, generated-document, accountant-review, and development docs remain in progress.
- Untracked marketing work remains unrelated and outside this sprint, including `apps/web/src/app/marketing.test.tsx`.
- No marketing files were deleted, modified, staged, or mixed into this sprint.

## 2. Docker Availability

Docker client is installed, but the Docker Desktop Linux engine is not reachable in this session.

Observed metadata-only result:

- Docker client context: `desktop-linux`.
- Docker server: unavailable.
- Docker engine pipe: missing.

Result: Docker-dependent local bring-up is blocked.

## 3. Local Postgres Reachability

Port check:

- `localhost:5432`: not listening.

Result: local Postgres is not reachable.

## 4. Local Redis Reachability

Port check:

- `localhost:6379`: not listening.

Result: local Redis is not reachable.

## 5. API Port

Port checks:

- `localhost:4000`: not listening.
- `localhost:4001`: not listening.

HTTP checks:

- `GET http://localhost:4000/health`: unreachable.
- `GET http://localhost:4000/readiness`: unreachable.

Result: local API is not reachable.

## 6. Web Port

Port checks:

- `localhost:3000`: not listening.
- `localhost:3001`: not listening.

HTTP check:

- `GET http://localhost:3000`: unreachable.

Result: local web app is not reachable.

## 7. Environment Files

Environment files inspected without printing secret values:

| File | Status | Relevant safe metadata |
| --- | --- | --- |
| `.env` | exists | Contains local-classified database, direct, Redis, and web API target keys. |
| `apps/api/.env` | exists | Contains local-classified database, direct, and Redis target keys. |
| `apps/web/.env.local` | exists | Contains local-classified web API target key. |
| `.env.local` | missing | Not required for this preflight. |
| `apps/api/.env.local` | missing | Not required for this preflight. |

No full URLs, passwords, tokens, auth headers, cookies, or secret values are recorded here.

## 8. Local Target Guard

Target classification:

| Key | Source file | Classification | Host metadata |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env` | local | `localhost` |
| `DIRECT_URL` | `.env` | local | `localhost` |
| `REDIS_URL` | `.env` | local | `localhost` |
| `NEXT_PUBLIC_API_URL` | `.env` | local | `localhost` |
| `DATABASE_URL` | `apps/api/.env` | local | `localhost` |
| `DIRECT_URL` | `apps/api/.env` | local | `localhost` |
| `REDIS_URL` | `apps/api/.env` | local | `localhost` |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | local | `localhost` |

No Supabase, Vercel, production, staging, beta, user-testing, hosted Postgres, or unknown remote target was found in the inspected target keys.

Result: the configuration target is local, but runtime services are unavailable.

## 9. API Health Endpoint

`GET http://localhost:4000/health` is not reachable because the API listener is not running.

Result: API health cannot be proven.

## 10. Web App Response

`GET http://localhost:3000` is not reachable because the web listener is not running.

Result: web app response cannot be proven.

## 11. Seeded Login

Repo docs and local demo scripts describe seed/demo login behavior, but login was not verified in this sprint.

Reasons:

- Local API is not running.
- Local database is not reachable.
- Seed/reset/delete commands are out of scope by default.
- No token or password should be printed or stored in repo docs.

Result: safe local login remains unverified.

## 12. Safe Login Verification

No login request was sent.

No token, cookie, auth header, password, or session value was printed, stored, or written to disk.

Result: login verification is blocked until the local API and database are reachable.

## 13. Fixture Dry-run Safety

Fixture execution is blocked.

Dry-run planning is safe because it is documentation-only and does not connect to the database or API.

A fixture script was not added in this sprint because the local runtime gates failed. The next safe step is to bring up local Postgres, Redis, API, and web first, then add or run a dry-run-only fixture helper against the proven local target.

## Bring-up Outcome

Local services are not running and could not be started through Docker because the Docker engine is unavailable.

No database migration, seed, reset, delete, smoke, E2E, fixture execute, login, PDF generation, email, payment, VAT filing, ZATCA, backup/restore, hosted check, or customer-data workflow was run.
