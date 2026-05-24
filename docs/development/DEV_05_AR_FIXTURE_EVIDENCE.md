# DEV-05 AR Fixture Evidence

## 1. Purpose And Scope

This document records read-only evidence verification for the local-only Sales/AR base fixtures created in `DEV-05 Part 3C`.

Scope was limited to safe, local, marker-scoped evidence checks. No fixture creation, record update, record deletion, login flow, audit-writing flow, AR lifecycle mutation, export, download, PDF generation, archive generation, email, ZATCA, backup/restore, migration, seed/reset/delete, smoke, E2E, deploy, environment change, production check, beta check, or customer-data check was run in Part 4.

## 2. Source Run

- Source run: `DEV-05 Part 3C: approved local AR fixture creation retry after DB readiness`.
- Source run doc: [DEV_05_AR_FIXTURE_CREATION_RETRY.md](DEV_05_AR_FIXTURE_CREATION_RETRY.md).
- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Local target summary: explicit local Docker PostgreSQL on `localhost:5432`.
- Database URL: not recorded.

## 3. Read-Only Verification Method

Evidence verification used a one-off Node/Prisma read-only query from `apps/api` against the explicit local target.

The query:

- validated the database target host as local before querying.
- selected only marker-scoped fixture labels, fixture categories, truncated fixture-only ids, and safe status fields.
- counted AR lifecycle, journal, generated-document, and audit-log records in the fixture organization.
- printed no database URL, tokens, cookies, auth headers, request/response bodies, real customer/vendor data, signed XML, QR payloads, attachment bodies, or PDF bodies.
- performed no writes.

## 4. Fixture Evidence Summary

Expected record labels:

- `DEV03-AR-ORG-20260524T130000`
- `DEV03-AR-USER-20260524T130000`
- `DEV03-AR-ROLE-20260524T130000`
- `DEV03-AR-USER-ROLE-20260524T130000`
- `DEV03-AR-ACCT-AR-20260524T130000`
- `DEV03-AR-ACCT-REV-20260524T130000`
- `DEV03-AR-ACCT-VAT-20260524T130000`
- `DEV03-AR-ACCT-CASH-20260524T130000`
- `DEV03-AR-TAX-20260524T130000`
- `DEV03-AR-CASH-20260524T130000`
- `DEV03-AR-CUSTOMER-20260524T130000`
- `DEV03-AR-SERVICE-20260524T130000`

Actual result:

- Expected record count: `12`.
- Actual record count: `12`.
- Missing labels: none.
- Extra labels: none.
- All discovered evidence labels matched the `DEV03-AR-` marker prefix.

Record categories found:

- organization: `1`
- user: `1`
- role: `1`
- organization membership: `1`
- accounts: `4`
- tax rate: `1`
- bank/cash profile: `1`
- customer: `1`
- service item: `1`

Safe status summary:

- Organization uses the local fixture country/currency posture `SA/SAR`.
- Fixture organization membership is `ACTIVE`.
- Fixture role is custom, not system.
- Fixture accounts are active: AR asset, cash asset, revenue, and VAT liability.
- Fixture tax rate is active, sales scoped, standard category.
- Fixture bank/cash profile is active and type `CASH`.
- Fixture customer is active and type `CUSTOMER`.
- Fixture service item is active, type `SERVICE`, and not inventory-tracked.

AR lifecycle and output side-effect counts in the fixture organization:

- sales invoices: `0`
- customer payments: `0`
- customer payment allocations: `0`
- customer payment unapplied allocations: `0`
- customer refunds: `0`
- credit notes: `0`
- credit note allocations: `0`
- journal entries: `0`
- generated documents: `0`
- audit logs: `0`

## 5. What Was Not Verified

Part 4 did not verify:

- app login behavior.
- browser runtime behavior.
- API service-layer mutation behavior.
- AR invoice finalize, void, allocation, refund, or reversal behavior.
- generated PDF/archive/download behavior.
- email behavior.
- ZATCA behavior.
- cleanup deletion behavior.
- deployed, beta, production, or customer-data behavior.

## 6. What Was Not Executed

Part 4 did not execute:

- fixture creation.
- database writes.
- database deletes.
- login.
- audit-writing flows.
- AR lifecycle mutations.
- exports.
- downloads.
- PDF generation.
- generated-document archive creation.
- email.
- ZATCA.
- backup/restore.
- migrations.
- seed/reset/delete.
- smoke.
- E2E.
- deploys.
- environment changes.
- production-hosting research.

## 7. Evidence Policy Followed

Evidence was limited to safe summaries:

- marker and family.
- local target summary without database URL.
- expected and actual fixture counts.
- marker-scoped labels.
- record categories.
- safe status fields.
- truncated fixture-only ids in terminal evidence only.
- lifecycle/output/audit counts.

No tokens, cookies, auth headers, database URLs, request/response bodies, real customer/vendor/accounting bodies, signed XML, QR payloads, attachment bodies, PDF bodies, or generated output contents were recorded.

## 8. Blockers Or Mismatches

No evidence blockers or mismatches were found.

The read-only evidence check found all 12 expected marker-scoped Sales/AR base fixture records and found no AR lifecycle, journal, generated-document, or audit-log side-effect records in the fixture organization.

## 9. Cleanup And Retention Status

The 12 local marker-scoped fixture records remain in the disposable local database for the next cleanup-plan validation step.

No cleanup deletion was run. Cleanup execution remains unimplemented and unapproved.

## 10. Recommended Next Step

Proceed with `DEV-05 Part 5: local AR fixture cleanup-plan validation`.
