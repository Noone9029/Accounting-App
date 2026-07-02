# API Tenancy Review 02

Date: 2026-07-02
Goal ID: SECURITY-HARDENING-02

Status: reviewed diagnostic queue; no runtime behavior changed

## Safety Contract

- Source review only.
- No app server started.
- No database connection.
- No network calls.
- No migration, seed, reset, delete, or hosted mutation.
- No backend API, Prisma schema, accounting, VAT, report, inventory valuation, banking, provider, storage, or compliance behavior changed.

## Result

`corepack pnpm security:api-route-tenancy-audit` now reports `NO_RISKY_ROUTES_DETECTED`.

Reviewed classifications added by the scanner:

- `reviewed-tenant-safe`: 7
- `reviewed-local-provider-surface`: 1

The review does not prove hosted RLS or database-role isolation. It only resolves the static API tenancy diagnostic queue from PR #222.

## Reviewed Files

| File | Prior marker | Review conclusion |
| --- | --- | --- |
| `apps/api/src/collections/collection.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by direct `organizationId` filters and local `where` variable reuse. |
| `apps/api/src/compliance-core/compliance-core.service.ts` | `webhook-without-obvious-signature-or-replay-wording` | Local disabled/mock ASP provider surface. It returns `noNetwork`, `noRealAspCalls`, and `productionCompliance: false`; real webhook handling remains future provider work. |
| `apps/api/src/purchase-receipts/purchase-receipt.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by organization-scoped purchase order/bill parent source flow plus direct organization-scoped stock queries. |
| `apps/api/src/purchase-returns/purchase-return.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by direct `organizationId` filters and local `where` variable reuse. |
| `apps/api/src/recurring-invoices/recurring-invoice.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by direct `organizationId` filters and local `where` variable reuse. |
| `apps/api/src/sales-inventory-returns/sales-inventory-return.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by direct `organizationId` filters, local `where` variable reuse, and organization-scoped source-line lookups. |
| `apps/api/src/sales-quotes/sales-quote.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by direct `organizationId` filters and local `where` variable reuse. |
| `apps/api/src/sales-stock-issues/sales-stock-issue.service.ts` | `findMany-without-obvious-tenant-scope` | Tenant-safe by organization-scoped sales invoice parent flow plus direct organization-scoped stock queries. |

## Remaining Follow-Up

- Hosted runtime-role and RLS proof remain separate future work.
- API-level cross-tenant denial tests remain required for production readiness.
- Future real ASP/provider webhooks must add signature, replay, custody, and provider-contract tests before any production claim.
