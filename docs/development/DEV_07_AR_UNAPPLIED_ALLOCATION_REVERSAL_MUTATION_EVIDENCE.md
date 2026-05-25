# DEV-07 Part 11: AR Unapplied Allocation Reversal Mutation Evidence

## Scope

DEV-07 Part 11 performed the approved local-only reversal of the one active `CustomerPaymentUnappliedAllocation` for `200.0000` linked to:

- `PAYMENT-000001`
- `INVOICE-000002`
- marker `DEV03-AR-20260524T130000`
- family `ar`

Approval phrase received:

```text
I approve DEV-07 Part 11 local-only AR unapplied allocation reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001, invoice INVOICE-000002, and the active 200.0000 unapplied allocation. No production, no beta, no customer data.
```

## Local-Only Target Proof

- Latest commit inspected before mutation: `12e61e93 Redirect root to login page`.
- `HEAD` matched `origin/main` at `12e61e93a9ad5c65c9c3405a6ae1fc5786567eea`.
- Docker Desktop/Linux engine was available: `linux 28.5.1`.
- Local dependency containers used: `infra-postgres-1` and `infra-redis-1`.
- Container health before mutation: both local containers healthy.
- Database target proof, redacted: scheme `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Database host accepted by guard: `localhost`.
- Hosted/prod/beta/shared target patterns were refused by the temporary script guard before dynamic service imports.
- No production, beta/user-testing, hosted, shared, or customer-data target was used.

## Mutation Performed

Temporary script:

- `apps/api/scripts/dev07-part11-reverse-unapplied-allocation.ts`
- Added for this run only.
- Removed after successful execution.
- Remained unstaged and untracked after removal.

Service call:

```ts
CustomerPaymentService.reverseUnappliedAllocation(
  organizationId,
  actorUserId,
  paymentId,
  allocationId,
  { reason: "DEV-07 local-only reversal QA for unapplied allocation" },
);
```

The temporary script asserted `serviceCallCount: 1`.

## Preflight Evidence

- Fixture organization count: `1`.
- Active fixture actor membership count: `1`.
- Fixture customer count: `1`, type `CUSTOMER`, active `true`.
- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Payment safe id prefix: `b39f4d38`.
- Payment status: `POSTED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `0.0000`.
- Payment journal: `JOURNAL_ENTRY-000004`.
- Payment void reversal journal present: `false`.
- Invoice safe id prefix: `ddadfdd7`.
- Invoice status: `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice balance due: `650.0000`.
- Invoice reversal journal present: `false`.
- Payment and invoice same customer: `true`.
- Direct `CustomerPaymentAllocation` count: `1`.
- Direct allocation amount: `300.0000`.
- `CustomerPaymentUnappliedAllocation` count: `1`.
- Active unapplied allocation count: `1`.
- Active unapplied allocation safe id prefix: `8bc99925`.
- Active unapplied allocation amount: `200.0000`.
- Active unapplied allocation `reversedAt` present: `false`.
- Active unapplied allocation `reversedById` present: `false`.
- Active unapplied allocation `reversalReason`: `null`.
- Fixture organization journal count: `4`.
- `JOURNAL_ENTRY-000004` status: `POSTED`.
- `JOURNAL_ENTRY-000004` reference: `PAYMENT-000001`.
- `JOURNAL_ENTRY-000004` debit/credit: `500.0000` / `500.0000`.
- `JOURNAL_ENTRY` sequence next: `5`.
- `PAYMENT` sequence next: `2`.
- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- Raw `APPLY_UNAPPLIED`: `0`.
- Generated documents: `0`.
- Customer payment receipt generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA metadata XML present: `false`.
- ZATCA metadata QR present: `false`.
- ZATCA status: `NOT_SUBMITTED`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.

## Payment Before And After

Before:

- `PAYMENT-000001`
- safe id prefix `b39f4d38`
- status `POSTED`
- amount received `500.0000`
- unapplied amount `0.0000`
- journal `JOURNAL_ENTRY-000004`
- void reversal journal absent

After:

- `PAYMENT-000001`
- safe id prefix `b39f4d38`
- status `POSTED`
- amount received `500.0000`
- unapplied amount `200.0000`
- journal `JOURNAL_ENTRY-000004`
- void reversal journal absent

## Invoice Before And After

Before:

- `INVOICE-000002`
- safe id prefix `ddadfdd7`
- status `FINALIZED`
- total `1150.0000`
- balance due `650.0000`
- reversal journal absent

After:

- `INVOICE-000002`
- safe id prefix `ddadfdd7`
- status `FINALIZED`
- total `1150.0000`
- balance due `850.0000`
- reversal journal absent

## Allocation Before And After

Before:

- Direct `CustomerPaymentAllocation`: one record for `300.0000`.
- Active `CustomerPaymentUnappliedAllocation`: one record for `200.0000`.
- Active unapplied allocation safe prefix: `8bc99925`.
- `reversedAt` present: `false`.
- `reversedById` present: `false`.
- `reversalReason`: `null`.

After:

- Direct `CustomerPaymentAllocation`: still one record for `300.0000`.
- `CustomerPaymentUnappliedAllocation`: still one record for `200.0000`.
- Active unapplied allocation count: `0`.
- Unapplied allocation safe prefix: `8bc99925`.
- `reversedAt` present: `true`.
- `reversedById` present: `true`.
- `reversedById` matched the fixture actor: `true`.
- `reversalReason`: `DEV-07 local-only reversal QA for unapplied allocation`.
- No new direct allocation was created.
- No credit-note allocation was created.

## Journal And Accounting Non-Effect

- No new `JournalEntry` was created.
- Fixture organization journal count remained `4`.
- `JOURNAL_ENTRY-000004` remained `POSTED`.
- `JOURNAL_ENTRY-000004` reference remained `PAYMENT-000001`.
- `JOURNAL_ENTRY-000004` debit/credit remained `500.0000` / `500.0000`.
- `JOURNAL_ENTRY-000004` `updatedAt` remained unchanged at `2026-05-24T23:43:52.361Z`.
- `JOURNAL_ENTRY` sequence next remained `5`.
- `PAYMENT` sequence next remained `2`.
- The original payment journal remained valid and unchanged.

## Audit Effect

Before:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `0`.
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- Legacy raw `CustomerPayment:REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.

After:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `1`.
- Reverse audit entity type: `CustomerPaymentUnappliedAllocation`.
- Reverse audit entity id: the `8bc99925` unapplied allocation.
- Raw `REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- Legacy raw `CustomerPayment:REVERSE_UNAPPLIED_ALLOCATION`: `0`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- No login/auth browser audit-writing flow occurred.

## Forbidden Side-Effect Evidence

These counts remained unchanged:

- Generated documents: `0`.
- Customer payment receipt generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA XML body present: `false`.
- ZATCA QR body present: `false`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Payment void: no.
- Invoice void: no.
- Cleanup deletion: no.
- Migration: no.
- Seed/reset/delete: no.
- Deploy: no.
- Environment/provider/schema change: no.
- Production/beta/shared/customer-data action: no.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- Required documentation and code reads.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- `docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'`.
- Local `.env` database target check with redacted output.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- `docker compose -f infra/docker-compose.yml ps postgres redis`.
- `corepack pnpm --filter @ledgerbyte/api db:generate`.
- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev07-part11-reverse-unapplied-allocation.ts`.

## Commands Skipped And Why

- `CustomerPaymentService.create`: forbidden and out of scope.
- `CustomerPaymentService.applyUnapplied`: forbidden; Part 11 reverses only the active unapplied allocation.
- `CustomerPaymentService.void`: forbidden and out of scope.
- Direct allocation reversal: forbidden and out of scope.
- Refund and credit-note workflows: forbidden and out of scope.
- Invoice mutation paths: forbidden and out of scope.
- Receipt/PDF/archive/generated-document paths: forbidden and out of scope.
- Email paths: forbidden and out of scope.
- ZATCA paths: forbidden and out of scope.
- Cleanup/migration/seed/reset/delete paths: forbidden and out of scope.
- `verify:repo`, `verify:ci:local`, full tests, full build, smoke, E2E, deploys, env changes, exports/downloads, backup/restore, and production-hosting research: explicitly excluded by the prompt.
- Targeted customer-payment tests: skipped because no production code or test code changed.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev07-part11-reverse-unapplied-allocation.ts`.
- Script was deleted after successful execution.
- It is absent from `git status --short`.
- It was not staged or committed.

## Remaining Blockers

No blocker remains for DEV-07 Part 11. The next local-only safety step should be a read-only preflight for customer payment void/reversal behavior now that the unapplied allocation has been reversed.

## Next Recommended Thread

```text
DEV-07 Part 12: AR customer payment void/reversal preflight
```
