# DEV-05 Execute-Gated Fixture Skeleton

## 1. Purpose And Scope

This document records the DEV-05 Part 2 fixture-runner change. The runner can now model a future execute request and its approval gates, but it still does not create fixture data, connect to a database for writes, login, write audit logs, or mutate records.

The change prepares structure for a later explicitly approved local-only Sales/AR fixture creation run. It remains non-mutating by design.

## 2. What Was Implemented

- `apps/api/scripts/dev04-fixture-runner.ts` now parses `--execute` as an execute skeleton instead of treating it as an unknown future path.
- Execute requests must pass the existing local target guards before approval checks.
- Execute requests require one explicit fixture family; `all` remains plan-only.
- The only modeled first future execute family is Sales/AR (`--family ar`).
- Approval-gate flags are modeled:
  - `--allow-local-mutation`
  - `--approve-local-disposable-db`
  - `--approve-fixture-creation`
  - `--approve-cleanup-retention`
  - `--approve-no-production-no-beta`
  - `--approve-no-customer-data`
- Even when every gate is present, the runner prints the plan, exits nonzero, and states that fixture creation is still disabled.
- Sales/AR plans now list planned bootstrap/base records for a future approved run.
- JSON summaries now include execute-request and non-mutating flags, including `executeRequested`, `executeRefused`, and `writesPerformed: false`.

## 3. What Remains Disabled

- Actual fixture creation.
- Database writes.
- Database write-capable client construction.
- Login and audit-writing flows.
- Cleanup deletion.
- AR mutation QA.
- Output actions such as export, download, PDF generation, generated-document archive creation, email, ZATCA, backup, and restore.

## 4. Approval Gates Modeled

The execute skeleton requires all approval flags before it will even render the future execute plan. Missing flags stop the command before any write-capable path exists.

Required modeled approvals:

- Local disposable database approval.
- Fixture creation approval.
- Cleanup/retention approval.
- No-production/no-beta/no-user-testing boundary approval.
- No-customer-data approval.
- Explicit local mutation flag.

These flags are a model only. They do not authorize writes in this implementation.

## 5. Why Execute Is Still Refused

DEV-05 Part 2 is intentionally a skeleton. It proves the guard sequence, approval-surface shape, JSON evidence, and AR fixture plan without introducing any mutation behavior.

The runner still exits nonzero for `--execute` with:

```text
DEV-05 execute mode skeleton is present but fixture creation is still disabled until a later approved task.
```

No root execute package script was added.

## 6. First Future Fixture Family: Sales/AR

The first modeled future fixture family is Sales/AR because DEV-03 identified AR posting, allocation, refund, credit-note, and output gates as high-risk ledger workflows, and DEV-05 Part 1 selected AR as the first local disposable target.

Future execute remains limited to one family at a time until cleanup evidence is proven.

## 7. Proposed AR Fixture Records

The runner now prints planned Sales/AR records with `planned-only` write behavior:

- `DEV03-AR-ORG-<runId>` organization.
- `DEV03-AR-USER-ROLE-<runId>` user, role, and membership.
- `DEV03-AR-CUSTOMER-<runId>` customer.
- `DEV03-AR-SERVICE-<runId>` service item.
- `DEV03-AR-TAX-ACCOUNT-<runId>` tax and account dependencies.
- `DEV03-AR-CASH-<runId>` bank/cash dependency.
- `DEV03-AR-DRAFT-SCAFFOLDS-<runId>` draft invoice, credit-note, payment, and refund labels only.

These are not created by the runner. They are future plan output only.

## 8. Test Coverage

`apps/api/scripts/dev04-fixture-runner.spec.ts` now covers:

- execute without approval is refused.
- execute with partial approval is refused.
- execute with all modeled approval flags still exits refused.
- execute skeleton requires an explicit local database target.
- hosted/deployed database targets are rejected before execute approval checks.
- AR plans list future bootstrap/base records without writing.
- JSON summaries show `executeRequested: true`, `executeRefused: true`, and `writesPerformed: false`.
- no root `fixture:dev04:execute` script exists.
- existing plan/dry-run/cleanup-plan, marker, target, redaction, destructive-arg, and JSON non-mutating coverage remains in place.

## 9. Safe Commands Verified

DEV-05 Part 2 verification used only non-mutating commands:

```powershell
corepack pnpm --filter @ledgerbyte/api test --runTestsByPath scripts/dev04-fixture-runner.spec.ts
corepack pnpm fixture:dev04:plan -- --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://localhost:5432/ledgerbyte_dev04
corepack pnpm fixture:dev04:dry-run -- --family ar --marker DEV03-AR-20260524T130000
corepack pnpm fixture:dev04:cleanup-plan -- --family ar --marker DEV03-AR-20260524T130000
corepack pnpm --filter @ledgerbyte/api fixture:dev04 -- --execute --allow-local-mutation --approve-local-disposable-db --approve-fixture-creation --approve-cleanup-retention --approve-no-production-no-beta --approve-no-customer-data --family ar --marker DEV03-AR-20260524T130000 --database-url postgresql://localhost:5432/ledgerbyte_dev04
corepack pnpm verify:diff
git diff --check
git diff --cached --check
```

The execute command above is a refusal check only. It exits nonzero before any write behavior and does not create fixtures.

## 10. Required Approval Before Any Future Real Fixture Creation

Before any real fixture creation, a later prompt must explicitly approve:

- the exact local disposable database boundary.
- fixture creation method and family.
- marker and run id.
- login/audit-write behavior, if needed.
- cleanup and retention policy.
- no production, beta, user-testing, Supabase hosted, Vercel deployed, or customer-data target.

## 11. Recommended Next Step

Proceed with `DEV-05 Part 3: approve and run local AR fixture creation` only if the future prompt explicitly approves a real local disposable fixture creation run.

Without that approval, keep the runner in plan/dry-run/cleanup-plan or execute-refusal mode only.
