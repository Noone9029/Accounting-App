# OpenBook Project And Time Tracking Adoption Design

Date: 2026-06-21

OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`

## Scope

Design only

This slice records a LedgerByte-native adoption design for project and time tracking. Project and time tracking are optional domains. They are useful for service firms, agencies, and implementation teams, but they must not change LedgerByte accounting behavior until a future implementation proves tenant scope, permissions, review workflow, fiscal locks, and audit logging.

No Prisma schema, migration, API endpoint, UI route, billing automation, payroll behavior, revenue recognition, invoice mutation, hosted mutation, provider call, or compliance claim is added by this design.

## Source Use

- No OpenBook source copied.
- No OpenBook schema, action, component, SQL, route, text, or file structure is copied, translated, vendored, or imported.
- The source repo was inspected only to identify product concepts: client-linked projects, time entries, billable flags, billed flags, summaries, exports, custom fields, and chat as optional domains.
- OpenBook is MIT licensed at the inspected commit, but this slice uses behavior-level inspiration only.

## LedgerByte Product Fit

LedgerByte should treat project and time tracking as operational evidence first, not as accounting truth.

Recommended first-class concepts for a future design:

- Project: tenant-scoped work container linked optionally to a customer/contact, currency, status, budget, and default rate.
- Time entry: tenant-scoped work log linked to a project, user, date, duration, description, billable flag, approval status, and billed status.
- Time approval event: append-only review history for submission, approval, rejection, reopening, and billing lock.
- Time invoice candidate: read-only grouped preview of approved unbilled time that can later feed an explicit invoice workflow.
- Project summary: read-only totals for hours, approved hours, billable hours, unbilled amount, billed amount, budget usage, and aging of unbilled approved time.

LedgerByte journal lines remain the accounting source of truth.

## Required Guardrails

- Future implementation must prove tenant isolation, permissions, audit logging, and fiscal-lock behavior before any time entry can affect billing or accounting.
- Projects and time entries must stay operational until an authorized user explicitly creates or updates a LedgerByte invoice through existing invoice services.
- Time entry approval must not post revenue, recognize income, create receivables, create payroll liabilities, trigger provider sends, or mutate generated documents.
- Invoice candidate previews must be recomputed server-side and must not mark time as billed until the invoice mutation succeeds.
- Invoice mutation must be explicit, permission-checked, tenant-scoped, idempotent, and audited.
- Locked accounting periods must block invoice creation or invoice changes according to existing LedgerByte fiscal lock rules.
- Exports must be metadata/business-data exports only and must respect existing role permissions and tenant boundaries.
- Custom fields and chat remain separate optional domains; they should not be smuggled into the project/time schema foundation.

## Future Interfaces

Future API contracts should be LedgerByte-native and should avoid importing OpenBook naming or model structure.

Recommended read models:

- `ProjectSummary`: project identity, customer summary, status, budget, currency, default rate, time totals, and billing preview totals.
- `TimeEntrySummary`: time entry identity, project summary, user summary, date, duration, billable flag, approval status, billed status, and redacted notes preview.
- `TimeInvoiceCandidate`: project, customer, date range, approved unbilled time entry ids, quantity, rate policy, amount preview, blockers, warnings, and source evidence.
- `ProjectTimeReadiness`: feature disabled/enabled state, required permissions, blocked mutation reasons, and implementation evidence status.

Recommended mutation boundaries:

- Create/update/archive project: operational only, audited, tenant-scoped.
- Create/update/delete time entry: operational only until approved and unbilled; audited.
- Submit/approve/reject/reopen time entry: workflow state only; audited.
- Generate invoice candidate: read-only preview only.
- Create invoice from candidate: future explicit mutation only after invoice-service, fiscal-lock, permission, duplicate, and audit checks pass.

## Implementation Sequence

1. Schema design PR: define Project, TimeEntry, and approval event fields without applying a migration.
2. Schema foundation PR: add additive Prisma schema and local migration only after design review.
3. Read-only API PR: list projects, time entries, summaries, and invoice candidates without mutations.
4. Operational mutation PR: project and time entry create/update/archive with audit logging and permissions.
5. Approval workflow PR: submit/approve/reject/reopen with audit events and tenant-isolation tests.
6. Invoice candidate PR: read-only candidate preview from approved unbilled time.
7. Invoice creation PR: explicit invoice mutation through existing LedgerByte invoice services; no automatic billing.
8. UI PRs: project list/detail, time entry table, approval queue, candidate preview, and invoice handoff.

## Test Plan For Future PRs

- API tests for tenant isolation across project, time entry, approval event, and invoice candidate queries.
- Permission tests for view, create, approve, reopen, export, and invoice-candidate access.
- Audit tests for every mutation and workflow transition.
- Fiscal-lock tests for invoice creation from time entries.
- Idempotency tests for invoice candidate creation and billed-state marking.
- Web tests for empty, loading, error, filtered, approval, and candidate-preview states.
- Clean-room validation for every OpenBook adoption PR.

## Current Slice Evidence

- Runtime behavior changed: no.
- Source copied: no.
- Hosted mutation: no.
- Provider call: no.
- Storage behavior changed: no.
- Accounting behavior changed: no.
- Compliance or authority workflow changed: no.

## Next Recommended Slice

Add a custom-fields adoption design PR that keeps extensible metadata separate from accounting postings, generated documents, compliance data, and provider payloads.
