# DEV-08B Debit Note Allocation Reversal Mutation Evidence

## Purpose And Scope

DEV-08B Part 8 performed the approved local-only purchase debit note allocation reversal mutation under marker `DEV08B-AP-20260526T060000`.

Approved mutation scope:

- Reverse exactly the active `PurchaseDebitNoteAllocation` for `250.0000` created in DEV-08B Part 5.
- Use reversal reason `DEV-08B local-only debit note allocation reversal QA`.
- Do not create another supplier, bill, debit note, supplier payment, supplier refund, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download record, email, ZATCA artifact, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production/beta/shared/customer-data action, or login/browser flow.
- Do not apply another allocation.
- Do not void the debit note or bill.

## Approval Phrase Received

`I approve DEV-08B Part 8 local-only purchase debit note allocation reversal mutation under marker DEV08B-AP-20260526T060000 for the active 250.0000 debit note allocation. No production, no beta, no customer data.`

## Latest Commit Inspected

- `650ff74f Plan DEV-08B debit note allocation reversal`.
- Local `HEAD` matched `origin/main` at `650ff74f8f6246323ac798ec7907b783ff1e088d` before the mutation evidence changes.
- Branch: `main`.

## Local-Only Target Proof

- Docker engine was available: Docker server `28.5.1`, OS type `linux`.
- Local containers were healthy:
  - `infra-postgres-1`, local port `5432`, healthy.
  - `infra-redis-1`, local port `6379`, healthy.
- `Test-NetConnection localhost:5432` returned `TcpTestSucceeded=True`.
- `Test-NetConnection localhost:6379` returned `TcpTestSucceeded=True`.
- The read-only preflight query and the temporary guarded mutation script classified the database target before importing Prisma write-capable services:
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
- Supplier: `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`, fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill: `BILL-000008`, safe id prefix `4b8886bb`, status `FINALIZED`, total `1150.0000`, balance due `900.0000`, reversal journal absent.
- Purchase debit note: `PDN-000003`, safe id prefix `b93f96ee`, status `FINALIZED`, total `460.0000`, unapplied amount `210.0000`, reversal journal absent.
- Active allocation: safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`, `reversedAt`, `reversedById`, and `reversalReason` absent.
- Existing supplier refund count for the fixture: `0`.
- Fixture-specific supplier payment, purchase order, purchase receipt, stock movement, cash expense, generated document, marker email outbox, marker email provider event, marker auth token, and cleanup/delete audit counts were all `0`.
- Fixture-specific `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` audit count was `0`.

## Mutation Performed

The temporary guarded script under `apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts` called the current service path exactly once:

```ts
await purchaseDebitNoteService.reverseAllocation(
  organizationId,
  actorUserId,
  "<PDN-000003 id>",
  "<allocation 7ec0dfb3 id>",
  { reason: "DEV-08B local-only debit note allocation reversal QA" },
);
```

No debit note create, debit note apply, debit note void, supplier refund, supplier payment, bill mutation, purchase order, purchase receipt, cash expense, stock movement, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Debit Note Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Number | `PDN-000003` | `PDN-000003` |
| Safe id prefix | `b93f96ee` | `b93f96ee` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `460.0000` | `460.0000` |
| Unapplied amount | `210.0000` | `460.0000` |
| Reversal journal | absent | absent |
| Supplier refunds | `0` | `0` |

## Bill Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Number | `BILL-000008` | `BILL-000008` |
| Safe id prefix | `4b8886bb` | `4b8886bb` |
| Status | `FINALIZED` | `FINALIZED` |
| Total | `1150.0000` | `1150.0000` |
| Balance due | `900.0000` | `1150.0000` |
| Reversal journal | absent | absent |

## Allocation Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Allocation safe id prefix | `7ec0dfb3` | `7ec0dfb3` |
| Amount applied | `250.0000` | `250.0000` |
| Active/unreversed | yes | no |
| `reversedAt` | absent | set |
| `reversedById` | absent | set |
| `reversalReason` | absent | `DEV-08B local-only debit note allocation reversal QA` |

No new `PurchaseDebitNoteAllocation` was created. No supplier payment allocation was created.

## Journal And Accounting Non-Effect

Current code treats debit-note allocation reversal as matching-only.

- Journal count before: `54`.
- Journal count after: `54`.
- `JOURNAL_ENTRY` sequence before: `JE-000055`.
- `JOURNAL_ENTRY` sequence after: `JE-000055`.
- No new journal entry was created.
- Purchase bill journal `JE-000053` remained posted and unchanged:
  - debit account `111` for `1000.0000`.
  - debit account `230` for `150.0000`.
  - credit account `210` for `1150.0000`.
- Purchase debit note journal `JE-000054` remained posted and unchanged:
  - debit account `210` for `460.0000`.
  - credit account `111` for `400.0000`.
  - credit account `230` for `60.0000`.
- No debit-note reversal journal, supplier refund journal, supplier payment journal, or purchase bill reversal journal was created.

## Audit Effect

Fixture audit actions after the mutation:

- `Contact:CREATE`.
- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.
- `PurchaseDebitNote:APPLY`.
- `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`.

The reverse-allocation audit action is raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`; current audit standardization does not map this event.

Confirmed absent for this fixture:

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
| Supplier refunds | `0` |
| Supplier payments | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Generated documents | `0` |
| Marker email outbox rows | `0` |
| Marker email provider events | `0` |
| Marker auth tokens | `0` |
| Fixture cleanup/delete audits | `0` |

Organization-level local ZATCA baseline counts remained unchanged:

| Area | Before | After |
| --- | ---: | ---: |
| ZATCA signed artifact drafts | `1` | `1` |
| ZATCA submission logs | `7` | `7` |

Confirmed no PDF/archive/export/download, email send, ZATCA XML/signing/QR/submission artifact for this fixture, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts`.
- The script was removed with `apply_patch` after the mutation.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08b*'` returned no files.
- `git status --short` showed no staged, unstaged, or untracked Part 8 temporary script.
- The temporary script was not staged.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08B evidence/preflight, purchase debit note service/controller/DTO/spec, purchase bill service, Prisma schema, README, and BUG_AUDIT paths.
- `docker info --format "DockerServer={{.ServerVersion}} OSType={{.OSType}}"`.
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- Read-only inline Prisma preflight query from `apps/api`.
- `corepack pnpm exec tsx scripts/dev08b-debit-note-allocation-reversal.tmp.ts --marker=DEV08B-AP-20260526T060000 --approval=...`.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'`.
- Read-only inline Prisma post-mutation evidence query from `apps/api`.

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
- No database target, secret, token, vendor/customer data, signed XML, QR payload, document body, attachment body, or email body was printed.
- The audit action remains raw/unstandardized: `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`.

## Next Recommended Thread

`DEV-08B Part 9: supplier refund from debit note preflight`
