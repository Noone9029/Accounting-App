# Tenant Isolation Verification Plan

Status: pre-ASP verification plan
Date: 2026-07-02

## Current Catalog

`corepack pnpm pre-asp:diagnostics` currently reports:

- Total Prisma models: 112
- Direct tenant-scoped models: 109
- Identity/tenant roots: 2
- Global configuration models: 1
- Review-required models: 0

This is schema-shape evidence only. It does not prove every service method enforces tenant filtering.

## Required Verification Families

| Family | Representative data | Required negative proof |
| --- | --- | --- |
| identity/membership | users, organizations, roles, members | User from organization A cannot read/update organization B membership or role data. |
| ledger/accounting | accounts, journals, fiscal periods, tax rates | Cross-tenant account/journal/report reads return not found/forbidden. |
| sales/purchases | invoices, quotes, credit notes, bills, payments, returns | Detail/edit/allocation routes reject foreign organization IDs. |
| banking | bank accounts, imports, statement transactions, rules, reconciliations | Foreign bank account IDs cannot be used for review/reconciliation operations. |
| inventory | items, warehouses, movements, valuation reports | Foreign warehouse/item IDs cannot leak stock or valuation data. |
| documents/storage | generated documents, archive records, attachments | Foreign document metadata and bodies are blocked. |
| compliance | UAE/ZATCA profiles, documents, transmissions, events | Foreign compliance records and readiness previews are blocked. |
| audit/support | audit logs, email outbox, backup evidence | Cross-tenant logs and support artifacts are not visible. |

## Test Pattern

1. Seed or fixture two organizations with one user each.
2. Create one representative record per family in both organizations.
3. Authenticate as organization A.
4. Attempt read/write/detail/export operations against organization B IDs.
5. Assert `403`, `404`, or explicit safe denial.
6. Repeat for API service-level tests and route-load/UI handoffs where applicable.

## Current Safe Diagnostic

The pre-ASP diagnostic is a static schema catalog. It must stay read-only and must not be used as the only tenant-isolation proof.

`SECURITY-EXECUTION-01` expands the static evidence:

- `docs/security/evidence/TENANT_SCOPE_AUDIT.md` catalogs all 112 Prisma models into tenant-scope classifications. Current result: 109 direct tenant-scoped models, 3 indirect tenant-scoped models, and 0 risky unclassified models.
- The same audit flags 55 unique constraints for review because the individual unique constraint does not include tenant scope. This is a review queue, not an automatic defect list.
- `docs/security/evidence/API_TENANCY_AUDIT.md` scans 144 API controller/service files. Current result: 126 tenant-guarded files, 8 review-needed files, 3 webhook files, 1 auth-only file, 1 system/admin file, and 5 public-safe files.

These diagnostics are source-shape evidence only. They do not replace API-level cross-tenant denial tests or hosted read-only proof.

## Remaining Work

- Expand API-level cross-tenant denial tests for all listed families.
- Add route-load verification for high-risk ID handoffs.
- Run hosted read-only checks after runtime-role cutover.

## SECURITY-HARDENING-02 API Diagnostic Review

`SECURITY-HARDENING-02` reviewed the 8 API tenancy audit findings from PR #222 and regenerated `docs/security/evidence/API_TENANCY_AUDIT.md` with status `NO_RISKY_ROUTES_DETECTED`.

The resolved findings were static scanner review items, mostly local `where` variable reuse and parent-source line helper flows. This does not replace API-level cross-tenant denial tests or hosted runtime-role/RLS proof.

## SECURITY-TENANT-ISOLATION-04 Evidence Expansion

`SECURITY-TENANT-ISOLATION-04` adds deeper read-only tenant-isolation evidence after the Arabic UI merge. Arabic RTL frontend support is now baseline and is no longer a blocker for this security lane.

- `corepack pnpm security:tenant-relationship-graph` writes `docs/security/evidence/TENANT_RELATIONSHIP_GRAPH.md` and JSON. Current result: `RELATIONSHIP_GRAPH_READY`, 112 Prisma models cataloged, 102 direct-tenant-key models, 7 join-table models, 1 tenant root, 1 user-scoped model, and 1 global-reference model.
- `corepack pnpm security:tenant-index-review` writes `docs/security/evidence/TENANT_INDEX_REVIEW.md` and JSON. Current result: `TENANT_INDEX_REVIEW_ITEMS`, 784 constraints inventoried, 370 conservative review items, including 43 tenant-sensitive uniqueness items and 327 non-tenant-key index review items.
- `corepack pnpm security:api-query-scope-audit` writes `docs/security/evidence/API_QUERY_SCOPE_AUDIT.md` and JSON. Current result: `QUERY_SCOPE_REVIEW_REQUIRED`, 72 files with Prisma queries scanned, 740 query calls inventoried, 26 tenant-scoped files, 42 review-needed files, 3 webhook files, and 1 public-safe file.
- `docs/security/CROSS_TENANT_TEST_FIXTURE_PLAN.md` now defines the future disposable local/test DB fixture matrix for two-tenant denial tests.
- `docs/security/SUPABASE_RLS_POLICY_READINESS_MATRIX.md` maps every model to a future RLS readiness status without writing executable SQL.
- `docs/security/RUNTIME_DB_ROLE_READINESS_EVIDENCE.md` records runtime, migration/admin, and read-only diagnostic role expectations without creating roles or changing secret stores.

This remains static/source evidence only. It does not enable RLS, change DB roles, run migrations, mutate hosted infrastructure, or prove hosted tenant isolation.
