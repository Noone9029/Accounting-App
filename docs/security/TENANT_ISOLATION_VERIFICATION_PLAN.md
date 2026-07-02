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

## Remaining Work

- Expand API-level cross-tenant denial tests for all listed families.
- Add route-load verification for high-risk ID handoffs.
- Run hosted read-only checks after runtime-role cutover.
