# Sales/AR Local Schema Readiness Preflight

Date: 2026-06-05

Sprint: Local-Only Schema Readiness and Sales/AR Fixture Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Target And Safety Confirmation

This preflight is local-only.

Confirmed before any schema change:

- Docker engine is available.
- Local Postgres is listening on port `5432`.
- Local Redis is listening on port `6379`.
- Local API is reachable on `http://localhost:4000`.
- Local web is reachable on `http://localhost:3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Local seed/demo login and `/auth/me` succeeded with password, token, cookies, and auth headers suppressed.
- Inspected target env keys classified as local-only without printing values.
- No Supabase, Vercel, production, staging, beta, user-testing, hosted, shared, or unknown remote target was used.

## Migration Status Summary

Command:

```powershell
corepack pnpm exec prisma migrate status
```

Working directory:

```text
apps/api
```

Result:

- Prisma detected `63` migrations.
- Exit code was `1` because pending migrations exist.
- The target database was reported as local Postgres on `localhost:5432`.
- No database URL, credentials, or secrets were printed into this document.

Pending migrations:

| Migration | Purpose | Local readiness relevance |
| --- | --- | --- |
| `20260521193000_add_supplier_statement_document_type` | Adds supplier statement generated-document classification. | Pending local enum parity migration. |
| `20260603090000_accountant_workflow_sprint` | Adds `SalesInvoice.taxMode`. | Required by current Sales invoice code and fixture dry-run. |
| `20260603110000_sales_quotes_proformas_sprint` | Adds Sales Quote tables/status and quote numbering scope. | Required by Sales quote walkthrough data. |
| `20260604100000_quote_pdf_archive_sprint` | Adds generated-document `SALES_QUOTE` type. | Required for quote PDF/archive metadata readiness. |
| `20260604140000_recurring_invoices_sprint` | Adds recurring template tables, run table, and recurring invoice linkage. | Required by recurring template walkthrough data. |
| `20260604170000_delivery_notes_sprint` | Adds delivery note tables/status and generated-document/numbering scopes. | Required by delivery note walkthrough data. |
| `20260604190000_collections_workflow_sprint` | Adds collection case/activity tables/statuses and numbering scope. | Required by collections walkthrough data. |

## Required Sales/AR Structures

The current local database is missing the Sales/AR structures needed by the hardened fixture:

| Structure | Current readiness |
| --- | --- |
| `SalesInvoice.taxMode` | Missing before migration. |
| `SalesQuote` | Missing before migration. |
| `SalesQuoteLine` | Missing before migration. |
| `SalesQuoteStatus` | Missing before migration. |
| `RecurringInvoiceTemplate` | Missing before migration. |
| `RecurringInvoiceTemplateLine` | Missing before migration. |
| `RecurringInvoiceRun` | Missing before migration. |
| `DeliveryNote` | Missing before migration. |
| `DeliveryNoteLine` | Missing before migration. |
| `CollectionCase` | Missing before migration. |
| `CollectionActivity` | Missing before migration. |
| `DocumentType.SALES_QUOTE` | Missing before migration. |
| `DocumentType.DELIVERY_NOTE` | Missing before migration. |
| `NumberSequenceScope.SALES_QUOTE` | Missing before migration. |
| `NumberSequenceScope.RECURRING_INVOICE_TEMPLATE` | Missing before migration. |
| `NumberSequenceScope.DELIVERY_NOTE` | Missing before migration. |
| `NumberSequenceScope.COLLECTION_CASE` | Missing before migration. |

## Destructive Migration Review

Reviewed pending migration SQL for destructive statements.

No destructive migration requirement was identified:

- No `DROP TABLE`.
- No `DROP COLUMN`.
- No `TRUNCATE`.
- No data `DELETE`.
- No reset requirement.
- No seed requirement.

Observed `ON DELETE` clauses are foreign-key referential actions on newly added relationships, not cleanup commands.

The pending Sales/AR migrations are additive for the local readiness need:

- add enums
- add enum values
- add tables
- add columns
- add indexes
- add foreign keys

## Local-only Migration Decision

Allowed command per sprint:

```powershell
corepack pnpm db:migrate
```

The repo maps this to:

```text
corepack pnpm --filter @ledgerbyte/api db:migrate
```

The API package maps that to:

```text
prisma migrate deploy
```

Decision:

- Proceed with local migration only.
- Do not run `prisma migrate reset`.
- Do not run seed.
- Do not run cleanup/delete.
- Do not touch hosted, beta, production, shared, or customer data.

## Recommendation

Proceed with `corepack pnpm db:migrate` against the proven local Postgres target, then run `corepack pnpm db:generate`.

After migration and generation, recheck local health/readiness, local login, Sales/AR endpoint status, and the hardened fixture dry-run before any execute attempt.
