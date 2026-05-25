# DEV-07 Part 13: AR Customer Payment Void/Reversal Mutation Evidence

## Scope

DEV-07 Part 13 performed the approved local-only void/reversal of `PAYMENT-000001` under marker `DEV03-AR-20260524T130000`, family `ar`.

Approval phrase received:

```text
I approve DEV-07 Part 13 local-only AR customer payment void/reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001. No production, no beta, no customer data.
```

## Local-Only Target Proof

- Latest commit inspected before mutation: `cdc3557d Plan DEV-07 customer payment void`.
- `HEAD` matched `origin/main` at `cdc3557de3992704e1939eaffb74be10101d2a7f`.
- Docker Desktop/Linux engine was available: `linux 28.5.1`.
- Local dependency containers used: `infra-postgres-1` and `infra-redis-1`.
- Container health before mutation: both local containers healthy.
- Database target proof, redacted: scheme `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Database host accepted by guard: `localhost`.
- Hosted/prod/beta/shared target patterns were refused by the temporary script guard before dynamic service imports.
- No production, beta/user-testing, hosted, shared, or customer-data target was used.

## Preflight Evidence

Read-only preflight matched the Part 12 expected starting state:

- Marker: `DEV03-AR-20260524T130000`.
- Family: `ar`.
- Fixture context rows: `1`.
- Fixture organization safe id prefix: `bceae558`.
- Fixture customer safe id prefix: `76fb1dcb`.
- Fixture actor safe id prefix: `11ef6aa9`.
- Active fixture actor membership count: `1`.
- Payment and invoice belonged to the same fixture organization and customer.
- `PAYMENT-000001` safe id prefix: `b39f4d38`.
- Payment status: `POSTED`.
- Payment amount received: `500.0000`.
- Payment unapplied amount: `200.0000`.
- Payment journal: `JOURNAL_ENTRY-000004`.
- Payment journal status: `POSTED`.
- Payment `voidReversalJournalEntryId` present: `false`.
- Payment `voidedAt` present: `false`.
- `INVOICE-000002` safe id prefix: `ddadfdd7`.
- Invoice status: `FINALIZED`.
- Invoice total: `1150.0000`.
- Invoice balance due: `850.0000`.
- Invoice `reversalJournalEntryId` present: `false`.
- Direct `CustomerPaymentAllocation` count: `1`.
- Direct allocation amount: `300.0000`.
- `CustomerPaymentUnappliedAllocation` count: `1`.
- Active unapplied allocation count: `0`.
- Reversed unapplied allocation count: `1`.
- Reversed unapplied allocation safe id prefix: `8bc99925`.
- Reversed unapplied allocation amount: `200.0000`.
- Reversed unapplied allocation reason: `DEV-07 local-only reversal QA for unapplied allocation`.
- Posted refunds sourced from the payment: `0`.
- Fiscal period count: `0`.
- Fixture organization journal count: `4`.
- `JOURNAL_ENTRY` sequence next: `5`.
- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `1`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- Generated documents: `0`.
- Customer payment generated documents: `0`.
- Email outbox records: `0`.
- Email provider events: `0`.
- ZATCA signed artifact drafts: `0`.
- ZATCA submission logs: `0`.
- Customer refunds: `0`.
- Credit notes: `0`.
- Cleanup/delete audit actions: `0`.

## Mutation Performed

Temporary script:

- `apps/api/scripts/dev07-part13-void-customer-payment.ts`
- Added for this run only.
- Removed after execution.
- Remained unstaged and untracked after removal.

Service call:

```ts
await customerPaymentService.void(organizationId, actorUserId, paymentId);
```

The temporary script incremented `serviceCallCount` immediately before the service call and contained no loop or second call path. After the service call completed, the script failed while building its final JSON summary because of an evidence variable-name bug. The service was not rerun. Read-only SQL verification then proved the mutation completed exactly once: one void audit action, one reversal journal, one payment void state, and one restored invoice balance result.

No payment creation, apply-unapplied, reverse-unapplied allocation, refund, credit-note, invoice mutation, receipt/PDF/archive/generated-document, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, or environment/provider path was called.

## Payment Before And After

Before:

- `PAYMENT-000001`
- safe id prefix `b39f4d38`
- status `POSTED`
- amount received `500.0000`
- unapplied amount `200.0000`
- journal `JOURNAL_ENTRY-000004`
- journal status `POSTED`
- void reversal journal absent
- `voidedAt` absent

After:

- `PAYMENT-000001`
- safe id prefix `b39f4d38`
- status `VOIDED`
- amount received `500.0000`
- unapplied amount `200.0000`
- journal `JOURNAL_ENTRY-000004`
- original journal status `REVERSED`
- void reversal journal `JOURNAL_ENTRY-000005`
- void reversal journal status `POSTED`
- `voidedAt` present

The unapplied amount remained `200.0000` as expected from Part 12 because current service code does not change `unappliedAmount` during void.

## Invoice Before And After

Before:

- `INVOICE-000002`
- safe id prefix `ddadfdd7`
- status `FINALIZED`
- total `1150.0000`
- balance due `850.0000`
- reversal journal absent

After:

- `INVOICE-000002`
- safe id prefix `ddadfdd7`
- status `FINALIZED`
- total `1150.0000`
- balance due `1150.0000`
- reversal journal absent

The invoice balance due increased by the active direct allocation amount `300.0000`, from `850.0000` to `1150.0000`.

## Allocation Before And After

Before:

- Direct `CustomerPaymentAllocation`: one record for `300.0000`.
- `CustomerPaymentUnappliedAllocation`: one record for `200.0000`.
- Active unapplied allocation count: `0`.
- Reversed unapplied allocation count: `1`.
- Reversed unapplied allocation safe prefix: `8bc99925`.
- Reversal reason: `DEV-07 local-only reversal QA for unapplied allocation`.

After:

- Direct `CustomerPaymentAllocation`: still one historical record for `300.0000`.
- Direct allocation row was not deleted or changed.
- `CustomerPaymentUnappliedAllocation`: still one record for `200.0000`.
- Active unapplied allocation count remains `0`.
- Reversed unapplied allocation count remains `1`.
- Reversed unapplied allocation safe prefix remains `8bc99925`.
- Reversal reason remains `DEV-07 local-only reversal QA for unapplied allocation`.
- No new direct allocation was created.
- No new unapplied allocation was created.
- No credit-note allocation was created.

## Journal And Accounting Result

Before:

- Fixture organization journal count: `4`.
- Original payment journal: `JOURNAL_ENTRY-000004`.
- Original journal status: `POSTED`.
- Original journal reference: `PAYMENT-000001`.
- Original journal debit/credit: `500.0000` / `500.0000`.
- Original journal had no `reversedBy`.
- `JOURNAL_ENTRY` sequence next: `5`.

After:

- Fixture organization journal count: `5`.
- Original payment journal remains `JOURNAL_ENTRY-000004`.
- Original journal reference remains `PAYMENT-000001`.
- Original journal debit/credit remains `500.0000` / `500.0000`.
- Original journal status changed to `REVERSED`.
- Reversal journal created: `JOURNAL_ENTRY-000005`.
- Reversal journal status: `POSTED`.
- Reversal journal reference: `PAYMENT-000001`.
- Reversal journal debit/credit: `500.0000` / `500.0000`.
- Reversal journal `reversalOf` points to `JOURNAL_ENTRY-000004`.
- `JOURNAL_ENTRY` sequence next changed from `5` to `6`.
- No invoice reversal journal was created.

## Audit Result

Before:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `1`.
- `CUSTOMER_PAYMENT_VOIDED`: `0`.
- Cleanup/delete audit actions: `0`.

After:

- `CUSTOMER_PAYMENT_CREATED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`: `1`.
- `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`: `1`.
- `CUSTOMER_PAYMENT_VOIDED`: `1`.
- Cleanup/delete audit actions: `0`.
- No login/auth browser audit-writing flow occurred.

## Output, Email, ZATCA, Refund, Credit Note, And Cleanup Non-Effects

These counts remained `0` after the mutation:

- Generated documents.
- Customer payment generated documents.
- Email outbox records.
- Email provider events.
- ZATCA signed artifact drafts.
- ZATCA submission logs.
- Customer refunds.
- Credit notes.
- Cleanup/delete audit actions.

ZATCA metadata for `INVOICE-000002` remained present as local invoice metadata only:

- Metadata count: `1`.
- XML body present: `false`.
- QR body present: `false`.

No receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, invoice void, cleanup deletion, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser audit-writing flow occurred.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- Required documentation and code reads.
- `docker version --format '{{.Server.Os}} {{.Server.Version}}'`.
- Redacted local database target check.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- `docker compose -f infra/docker-compose.yml ps postgres redis`.
- Read-only preflight SQL query wrapped in `BEGIN READ ONLY` and `ROLLBACK`.
- Temporary local script execution for the one service call.
- Read-only post-mutation SQL verification wrapped in `BEGIN READ ONLY` and `ROLLBACK`.

## Commands Skipped And Why

- Payment creation: forbidden and out of scope.
- Apply-unapplied and reverse-unapplied allocation mutations: forbidden and out of scope.
- Refund and credit-note workflows: forbidden and out of scope.
- Direct invoice mutation and invoice void: forbidden and out of scope.
- Receipt/PDF/archive/generated-document routes: forbidden output-producing paths.
- Email and ZATCA paths: forbidden and out of scope.
- Cleanup/migration/seed/reset/delete/deploy/env/provider paths: forbidden by prompt.
- Smoke, E2E, full tests, full build, login/browser flows, and production-hosting research: explicitly excluded.
- Targeted customer-payment tests: skipped because no production code or test code changed.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev07-part13-void-customer-payment.ts`.
- Script was deleted after execution and post-mutation verification.
- It is absent from `git status --short`.
- It was not staged or committed.

## Blockers Or Deviations

No accounting blocker remains for Part 13. The approved local void/reversal mutation completed and post-mutation evidence matched Part 12 expectations.

Deviation: the temporary script exited non-zero after the service call while building its final JSON output because the local evidence object referenced `actorMembershipCount` instead of the local variable name. The service call was not rerun. Post-mutation read-only verification showed exactly one `CUSTOMER_PAYMENT_VOIDED` audit action and exactly one reversal journal, confirming the mutation was completed once.

The command wrapper also reported a recursive `tsx` launcher failure line. No second launcher attempt was made after the post-mutation state proved the service call had completed.

## Next Recommended Thread

```text
DEV-07 Part 14: AR state-machine closure and evidence consolidation
```
