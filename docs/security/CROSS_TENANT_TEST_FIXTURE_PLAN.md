# Cross-Tenant Test Fixture Plan

Status: future disposable local/test DB plan only
Date: 2026-07-03

This plan defines the fixture shape needed to prove cross-tenant denial behavior later. It does not seed data, connect to a database, run migrations, reset data, or execute against production.

## Safety Contract

- Never run these fixtures against production or shared customer data.
- Run only against a disposable local/test database created for the test run.
- Use synthetic organization, user, customer, supplier, document, bank, inventory, and compliance identifiers.
- Do not use real credentials, provider endpoints, payment methods, email addresses, tax identifiers, invoices, or document bodies.
- Test setup and teardown must be explicit, idempotent, and blocked unless the target database is proven disposable.

## Future Fixture Model

Create two organizations with parallel records:

| Fixture area | Organization A | Organization B |
| --- | --- | --- |
| identity | `user-a@example.test`, owner/member role | `user-b@example.test`, owner/member role |
| ledger | chart account, fiscal period, journal entry | matching account/fiscal/journal records |
| sales | customer, invoice, credit note, customer payment | matching AR records |
| purchases | supplier, bill, debit note, supplier payment | matching AP records |
| banking | bank account, statement import, statement transaction, reconciliation | matching banking records |
| inventory | warehouse, item, stock movement, valuation inputs | matching inventory records |
| documents | generated document, archive record, attachment metadata | matching document/archive records |
| compliance/settings | compliance profile, compliance document/event, settings rows | matching compliance/settings rows |
| audit/support | audit log, email outbox/suppression/evidence, backup evidence | matching support/evidence rows |

## Expected Access-Denied Matrix

| Actor | Target | Expected result |
| --- | --- | --- |
| user A in organization A | organization A list/detail/form/export records | allowed when permission exists |
| user A in organization A | organization B list/detail/form/export records | `403`, `404`, or explicit safe denial |
| user B in organization B | organization A records | `403`, `404`, or explicit safe denial |
| organization admin A | organization B membership/role/settings | denied |
| system/admin diagnostic role | cross-tenant data | blocked unless a reviewed diagnostic endpoint explicitly aggregates redacted metadata |

## Workflow Cases

### Reports, Lists, Details, And Forms

- List endpoints must only show active organization records.
- Detail endpoints must reject foreign IDs even when the ID is valid.
- Create/edit forms must reject foreign customer/supplier/account/item/warehouse IDs.
- Exports must use the same tenant filters as list/report views.

### Documents And Archive

- Generated-document metadata and body download must require the active organization.
- Archive records and attachments must reject foreign source IDs.
- Object-key or storage adapters must never accept user-supplied tenant prefixes.

### Banking And Reconciliation

- Bank accounts, imports, transactions, match suggestions, rules, deposits, cheques, card settlements, and reconciliations must reject foreign IDs.
- Match/categorize/reconcile operations must validate both the primary record and every related account/document/statement row against the active organization.
- Live bank feed, payment initiation, and provider callbacks remain out of scope unless separately approved.

### Inventory

- Items, warehouses, stock movements, return lines, valuation reports, and variance proposals must reject foreign warehouse/item/source document IDs.
- Valuation math must not be changed by this test fixture work; tests assert access boundaries only.

### Compliance And Settings

- Compliance profiles, provider metadata, documents, transmissions, event logs, ZATCA/UAE readiness surfaces, roles, and settings must reject foreign organization records.
- Provider calls, Peppol/ZATCA/UAE submission, and production compliance behavior must remain disabled.

### Destructive Actions

- Delete, void, reverse, post, reconcile, archive, restore, resend, retry, submit, and approve actions must reject foreign records before side effects.
- Future tests must prefer dry-run or rollback-safe local fixtures for destructive workflow coverage.

## Disposable Execution Requirements

Before implementing DB-backed tests:

1. Prove the database URL points to a disposable local/test target, without printing secret values.
2. Refuse production-looking hosts, names, or protected environment markers.
3. Generate Prisma Client locally if required; do not run migrations unless a future goal explicitly approves a disposable DB setup.
4. Seed only synthetic records.
5. Run the denial matrix.
6. Delete or reset the disposable database only inside the approved local/test target.
7. Store evidence with redacted connection metadata and exact command output.

## Blockers

- No disposable cross-tenant DB fixture is approved in this goal.
- No hosted runtime role, RLS, Supabase grant, or Data API proof exists yet.
- The new diagnostics are static/source evidence and must be paired with API-level denial tests in a later goal.
