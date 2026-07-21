# OpenBook Collection Reminder Candidates Evidence

## Scope

This slice adds `GET /collections/reminder-candidates` as a read-only Sales/AR review endpoint inspired by OpenBook reminder workflows.

The endpoint surfaces overdue finalized LedgerByte sales invoices with outstanding balances, customer contact context, aging bucket, and any existing open collection case. It is intended for accountant or operator review before a human creates or updates a LedgerByte collection case.

## Source Posture

- OpenBook source reuse: none.
- Adopted idea: review overdue invoices as reminder candidates before follow-up.
- LedgerByte sources of truth: existing `SalesInvoice`, `Contact`, and `CollectionCase` models.
- Attribution impact: no copied OpenBook code or assets were introduced.

## Guardrails

- Read-only endpoint only.
- Tenant-scoped by `organizationId`.
- Permission-gated with `salesInvoices.view`, matching existing collection read routes.
- No email, reminder, notification, or provider call is sent.
- No customer payment, payment link, allocation, credit note, or journal entry is created.
- No VAT, ZATCA, UAE, Peppol, storage, backup, or production-readiness action or claim is made.
- Existing open collection cases are shown as review context so duplicate follow-up can be avoided manually.

## Verification

- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- collections`
