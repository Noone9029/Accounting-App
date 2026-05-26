# DEV-08B Debit Note Apply Mutation Evidence

## Purpose And Scope

DEV-08B Part 5 performed the approved local-only purchase debit note apply-to-bill mutation under marker `DEV08B-AP-20260526T060000`.

Approved mutation scope:

- Apply exactly `250.0000` from the single finalized DEV-08B purchase debit note to the single finalized DEV-08B purchase bill.
- Do not create another supplier, bill, debit note, supplier payment, supplier refund, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download record, email, ZATCA artifact, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production/beta/shared/customer-data action, or login/browser flow.
- Do not reverse or void anything.

## Approval Phrase Received

`I approve DEV-08B Part 5 local-only purchase debit note apply-to-bill mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B debit note and purchase bill with amount 250.0000. No production, no beta, no customer data.`

## Latest Commit Inspected

- `cb1fe2d1 Plan DEV-08B debit note application`.
- Local `HEAD` matched `origin/main` at `cb1fe2d1b95ec81638cd9e74070801d710cd24e7` before the mutation evidence changes.
- Branch: `main`.

## Local-Only Target Proof

- Docker engine was available: Docker server `28.5.1`, OS type `linux`.
- Local containers were healthy:
  - `infra-postgres-1`, local port `5432`, healthy.
  - `infra-redis-1`, local port `6379`, healthy.
- `Test-NetConnection localhost:5432` returned `TcpTestSucceeded=True`.
- `Test-NetConnection localhost:6379` returned `TcpTestSucceeded=True`.
- The temporary guarded script classified the database target before importing write-capable service modules:
  - protocol: `postgresql`.
  - host: `localhost`.
  - port: `5432`.
  - database name: `accounting`.
  - accepted local-only target: yes.
- The script rejected hosted/prod/beta/shared/customer-data target patterns before connecting.
- No database URL, credential, token, cookie, auth header, request/response body, customer/vendor data, signed XML, QR payload, document body, or attachment body was printed.

## Preflight Evidence

- Marker confirmed: `DEV08B-AP-20260526T060000`.
- Exact approval phrase confirmed by the temporary script before any write-capable service import or service call.
- Supplier: `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`.
- Organization safe id prefix: `db69e5a8`.
- Active fake local actor membership was found in the same organization; no actor email was printed.
- Purchase bill: `BILL-000008`, safe id prefix `4b8886bb`, status `FINALIZED`, total `1150.0000`, balance due `1150.0000`, reversal journal absent.
- Purchase debit note: `PDN-000003`, safe id prefix `b93f96ee`, status `FINALIZED`, total `460.0000`, unapplied amount `460.0000`, reversal journal absent.
- Existing `PurchaseDebitNoteAllocation` count for the fixture: `0`.
- Existing supplier refund count for the fixture: `0`.
- Fixture-specific supplier payment, purchase order, purchase receipt, stock movement, cash expense, generated document, marker email outbox, and marker email provider event counts were all `0`.

## Mutation Performed

The temporary guarded script under `apps/api/scripts/dev08b-debit-note-apply.tmp.ts` called the current service path exactly once:

```ts
await purchaseDebitNoteService.apply(organizationId, actorUserId, debitNoteId, {
  billId: "<BILL-000008 id>",
  amountApplied: "250.0000",
});
```

No debit note create, debit note reverse, debit note void, supplier refund, supplier payment, purchase bill mutation, purchase order, purchase receipt, cash expense, stock movement, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Debit Note Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Number | `PDN-000003` | `PDN-000003` |
| Safe id prefix | `b93f96ee` | `b93f96ee` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `460.0000` | `460.0000` |
| Unapplied amount | `460.0000` | `210.0000` |
| Reversal journal | absent | absent |

## Bill Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Number | `BILL-000008` | `BILL-000008` |
| Safe id prefix | `4b8886bb` | `4b8886bb` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `1150.0000` | `900.0000` |
| Reversal journal | absent | absent |

## Allocation Evidence

- Exactly one `PurchaseDebitNoteAllocation` now links `PDN-000003` to `BILL-000008`.
- Allocation safe id prefix: `7ec0dfb3`.
- Amount applied: `250.0000`.
- Active/unreversed: yes.
- `reversedAt`: absent.
- `reversedById`: absent.
- `reversalReason`: absent.
- Supplier payment allocations remain `0`.
- Supplier payment unapplied allocations remain `0`.
- Supplier refunds remain `0`.

## Journal And Accounting Non-Effect

Current code treats debit-note apply as matching-only.

- Journal count before: `54`.
- Journal count after: `54`.
- `JOURNAL_ENTRY` sequence before: `JE-000055`.
- `JOURNAL_ENTRY` sequence after: `JE-000055`.
- No new journal entry was created.
- Purchase bill journal `JE-000053` remained posted and unchanged.
- Purchase debit note journal `JE-000054` remained posted and unchanged.
- No debit-note reversal journal, supplier refund journal, supplier payment journal, or purchase bill reversal journal was created.

## Audit Effect

Fixture debit-note audit actions after the mutation:

- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.
- `PurchaseDebitNote:APPLY`.

The apply audit action remains raw `APPLY`; current audit standardization does not map `PurchaseDebitNote:APPLY`.

Confirmed absent for this fixture:

- debit note reverse-allocation audit.
- debit note void audit.
- supplier refund audit.
- supplier payment audit.
- purchase bill void audit.
- cleanup/delete audit.
- login/browser audit-writing flow.

## Forbidden Side-Effect Verification

Fixture-specific forbidden counts after the mutation:

| Area | Count |
| --- | ---: |
| Supplier payments | `0` |
| Supplier refunds | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Generated documents | `0` |
| Marker email outbox rows | `0` |
| Marker email provider events | `0` |

Organization-level local ZATCA baseline counts remained unchanged:

| Area | Before | After |
| --- | ---: | ---: |
| ZATCA signed artifact drafts | `1` | `1` |
| ZATCA submission logs | `7` | `7` |

Confirmed no PDF/archive/export/download, email send, ZATCA XML/signing/QR/submission artifact for this fixture, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08b-debit-note-apply.tmp.ts`.
- `Remove-Item -LiteralPath apps/api/scripts/dev08b-debit-note-apply.tmp.ts` completed after the mutation.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-apply.tmp.ts` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08b*'` returned no files.
- `git status --short` showed no staged, unstaged, or untracked Part 5 temporary script.
- The temporary script was not staged.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08B preflight/evidence, purchase debit note service/controller/DTO/spec, purchase bill service, Prisma schema, README, and BUG_AUDIT paths.
- `docker info --format "DockerServer={{.ServerVersion}} OSType={{.OSType}}"`.
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- `corepack pnpm exec tsx scripts/dev08b-debit-note-apply.tmp.ts --marker=DEV08B-AP-20260526T060000 --approval=...`.
- `Remove-Item -LiteralPath apps/api/scripts/dev08b-debit-note-apply.tmp.ts`.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-apply.tmp.ts`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'`.

## Commands Skipped

- `verify:repo`.
- `verify:ci:local` actual.
- Full tests.
- Full build.
- E2E.
- Smoke.
- Migrations.
- Seed/reset/delete.
- Deploys.
- Environment changes.
- Login/browser flows.
- PDF/archive/export/download.
- ZATCA.
- Email.
- Backup/restore.
- Production-hosting research.
- Targeted purchase-debit-note tests were skipped because no production code remained changed; the temporary script was removed and only documentation was committed.

## Deviations Or Blockers

- No mutation blocker was found.
- No retry mutation was run.
- One `git status --short` command was executed in parallel with script removal and briefly still showed the temporary script; a follow-up `Test-Path`, `Get-ChildItem`, and `git status --short` confirmed the temporary script was absent, unstaged, and untracked.

## Part 6 Verification Note

- DEV-08B Part 6 read-only verification is recorded in [DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md](DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md).
- Mutation performed in Part 6: no.
- The verification confirmed `PDN-000003` remains `FINALIZED` with unapplied amount `210.0000`.
- The verification confirmed `BILL-000008` remains `FINALIZED` with balance due `900.0000`.
- The verification confirmed active `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains applied for `250.0000`.
- Journal count remained `54` and `JOURNAL_ENTRY` sequence remained `JE-000055`.
- Raw `PurchaseDebitNote:APPLY` remains present, with no debit-note reverse/void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action found.

## Next Recommended Thread

`DEV-08B Part 7: debit note allocation reversal preflight`
