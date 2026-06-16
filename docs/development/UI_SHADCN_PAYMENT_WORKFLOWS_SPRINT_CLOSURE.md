# UI shadcn payment workflows sprint closure

Date: 2026-06-16

## Summary

- PR `#52` was reverified green and merged into `main` before this branch began.
- Completed frontend-only shadcn/LedgerByte migration for customer and supplier payment workflows.
- Migrated list, create, and detail routes for:
  - `/sales/customer-payments`
  - `/sales/customer-payments/new`
  - `/sales/customer-payments/[id]`
  - `/purchases/supplier-payments`
  - `/purchases/supplier-payments/new`
  - `/purchases/supplier-payments/[id]`

## Components added

- `apps/web/src/components/ui-ledger/allocation-table.tsx`
- `apps/web/src/components/ui-ledger/payment-method-badge.tsx`
- `apps/web/src/components/ui-ledger/payment-summary-card.tsx`

## Safety boundaries

- Frontend-only.
- No backend, API, Prisma schema, migration, seed/reset/delete, payment posting, payment allocation, AR/AP state-machine, UAE PINT-AE, ZATCA, provider integration, hosted data, Vercel, Supabase, production infrastructure, or production compliance behavior changed.
- Existing permissions, route URLs, invoice and bill links, explicit receipt/PDF actions, void actions, and unapplied apply/reverse flows were preserved.
- No fake bank feed, auto-match, autopay, provider, certification, or production compliance claim was added.

## Verification

- Targeted payment tests cover customer and supplier payment routes, allocation table rendering, payment summary rendering, status badge mapping, permission-filtered actions, and absence of fake automation/provider claims.
- Browser verification should use local mocked/read-only responses if an authenticated local API session is unavailable.

## Remaining UI migration scope

- Customer and supplier refunds.
- Generated-document archive/detail surfaces.
- Bank statement import/reconciliation review routes.
- Reports/settings table surfaces.
- Remaining legacy AP/AR guidance panels not yet using LedgerByte/shadcn primitives.

## Provider evidence status

Provider evidence remains unavailable: no sandbox docs, no credentials, no provider response, and no commercial terms.
