# DEV-08B AP Debit Note Fixture Mutation Evidence

## Scope

DEV-08B Part 2 performed the approved local-only AP debit-note fixture creation mutation under marker `DEV08B-AP-20260526T060000`.

Approved mutation scope:

- Create one fake local supplier.
- Create one finalized direct-mode purchase bill.
- Create one finalized purchase debit note.
- Do not apply the debit note to the bill.
- Do not create supplier payments, supplier refunds, purchase orders, purchase receipts, cash expenses, stock movements, generated documents, PDF/archive/export/download records, email, ZATCA artifacts, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, or login/browser flows.

## Approval Phrase Received

`I approve DEV-08B Part 2 local-only AP debit note fixture creation mutation under marker DEV08B-AP-20260526T060000. No production, no beta, no customer data.`

## Latest Commit Inspected

- `8fde07d5 Plan DEV-08B debit note refund branch`.
- Local `HEAD` matched `origin/main` at `8fde07d563029a58b91ce722a48d9d0cfb8cbc41` before documentation changes.
- Branch: `main`.

## Local-Only Target Proof

- Docker engine: server `28.5.1`, OS type `linux`.
- Local containers:
  - `infra-postgres-1`: `healthy`, listening on localhost port `5432`.
  - `infra-redis-1`: `healthy`, listening on localhost port `6379`.
- Temporary script database target classification:
  - protocol: `postgresql`.
  - host: `localhost`.
  - port: `5432`.
  - local-only target accepted: yes.
- Forbidden hosted/prod/beta/shared/customer-data target patterns were checked before write-capable service imports.
- No database URL, credential, token, cookie, auth header, request/response body, customer/vendor data, document body, signed XML, QR payload, or attachment body was printed.

## Preflight Evidence

- `git status --short` before mutation showed only pre-existing unrelated untracked web/marketing and graphify paths, plus the temporary script before it was removed.
- `git log -1 --oneline` returned `8fde07d5 Plan DEV-08B debit note refund branch`.
- Marker confirmed: `DEV08B-AP-20260526T060000`.
- Family confirmed: `ap`.
- Exact approval phrase confirmed by the temporary script before any write-capable service call.
- Selected local AP-ready fixture organization safe id prefix: `db69e5a8`.
- Actor safe id prefix: `09f892d4`.
- Branch safe id prefix: `8a63efe6`.
- AP account `210` safe id prefix: `883ea9a6`.
- VAT receivable account `230` safe id prefix: `41e36736`.
- Expense/asset line account `111` safe id prefix: `4a8bb6e7`.
- Purchase VAT rate was available and safe: `VAT on Purchases 15%`, safe id prefix `172417be`.
- `FiscalPeriodGuardService.assertPostingDateAllowed(...)` accepted the fixture posting date before mutation.
- Existing marker-scoped records before the first write were `0` suppliers, `0` purchase bills, and `0` purchase debit notes.

## Mutation Performed

The temporary guarded script under `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` performed the approved service-layer calls once:

- `ContactService.create(...)`: once.
- `PurchaseBillService.create(...)`: once.
- `PurchaseBillService.finalize(...)`: once.
- `PurchaseDebitNoteService.create(...)`: once.
- `PurchaseDebitNoteService.finalize(...)`: once.

No debit note apply, debit note reverse, debit note void, supplier refund, supplier payment, purchase order, purchase receipt, cash expense, stock movement, output/PDF/archive, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data path was called.

## Supplier Created

- Supplier display label: `DEV08B-AP-20260526T060000 Supplier`.
- Supplier safe id prefix: `d11c76db`.
- Type: `SUPPLIER`.
- Active: yes.
- Organization safe id prefix: `db69e5a8`.
- Supplier is marker-bearing and fake local-only.

## Purchase Bill Created And Finalized

- Bill number: `BILL-000008`.
- Bill safe id prefix: `4b8886bb`.
- Status: `FINALIZED`.
- Inventory posting mode: direct expense/asset.
- Purchase order link: absent.
- Reversal journal link: absent.
- Supplier payment allocation count for the bill: `0`.
- Supplier payment unapplied allocation count for the bill: `0`.
- Purchase debit-note allocation count for the bill: `0`.
- Generated document count for the bill: `0`.

Bill totals:

| Field | Amount |
| --- | ---: |
| Subtotal | `1000.0000` |
| VAT | `150.0000` |
| Total | `1150.0000` |
| Balance due | `1150.0000` |

## Purchase Debit Note Created And Finalized

- Debit note number: `PDN-000003`.
- Debit note safe id prefix: `b93f96ee`.
- Status: `FINALIZED`.
- Linked original bill: `BILL-000008`.
- Reversal journal link: absent.
- Allocation count: `0`.
- Supplier refund count: `0`.
- Generated document count: `0`.

Debit note totals:

| Field | Amount |
| --- | ---: |
| Subtotal | `400.0000` |
| VAT | `60.0000` |
| Total | `460.0000` |
| Unapplied amount | `460.0000` |

## Tax Path

VAT path was safe and used.

- Bill VAT path: `1000.0000` subtotal plus `150.0000` VAT, total `1150.0000`.
- Debit note VAT path: `400.0000` subtotal plus `60.0000` VAT, total `460.0000`.
- Zero-tax fallback used: no.
- This follows the Part 2 prompt economics. It intentionally differs from the Part 1 preflight's earlier candidate note of a VAT-inclusive `400.0000` debit-note total.

## Bill Journal And Accounting Result

- Bill journal number: `JE-000053`.
- Bill journal safe id prefix: `950b8a43`.
- Status: `POSTED`.
- Total debit: `1150.0000`.
- Total credit: `1150.0000`.

Journal lines:

| Account | Debit | Credit |
| --- | ---: | ---: |
| `111` | `1000.0000` | `0.0000` |
| `230` | `150.0000` | `0.0000` |
| `210` | `0.0000` | `1150.0000` |

## Debit Note Journal And Accounting Result

- Debit note journal number: `JE-000054`.
- Debit note journal safe id prefix: `670f7dc0`.
- Status: `POSTED`.
- Total debit: `460.0000`.
- Total credit: `460.0000`.

Journal lines:

| Account | Debit | Credit |
| --- | ---: | ---: |
| `210` | `460.0000` | `0.0000` |
| `111` | `0.0000` | `400.0000` |
| `230` | `0.0000` | `60.0000` |

No supplier payment journal, supplier refund journal, or reversal journal was created.

## Audit Result

Created audit actions for the DEV-08B fixture:

- `Contact:CREATE`.
- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`.
- `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`.

No debit-note apply/reverse/void, supplier refund, supplier payment, purchase order, cash expense, cleanup/delete, or login/browser audit-writing action was created by this mutation.

## Forbidden Side-Effect Verification

The AP-ready local organization already contains baseline local AP/ZATCA/output data from earlier fixture work. The verify-existing read-only pass confirmed those organization-level counts were unchanged after the Part 2 mutation evidence check:

| Area | Before | After |
| --- | ---: | ---: |
| Supplier payments | `3` | `3` |
| Supplier refunds | `2` | `2` |
| Debit note allocations | `1` | `1` |
| Purchase orders | `2` | `2` |
| Purchase receipts | `3` | `3` |
| Stock movements | `15` | `15` |
| Cash expenses | `1` | `1` |
| Generated documents | `13` | `13` |
| Email outbox | `3` | `3` |
| Email provider events | `0` | `0` |
| ZATCA signed artifact drafts | `1` | `1` |
| ZATCA submission logs | `7` | `7` |
| Auth login audits | `2` | `2` |
| Cleanup/delete audits | `1` | `1` |

Fixture-specific forbidden counts are all `0`:

- supplier payments.
- supplier refunds.
- debit note allocations.
- purchase orders.
- purchase receipts.
- stock movements.
- cash expenses.
- generated documents.

Confirmed no PDF/archive/export/download, email send, ZATCA XML/signing/QR/submission, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action occurred.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts`.
- `Test-Path apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` returned `False` after removal.
- `Get-ChildItem apps/api/scripts -Filter '*dev08b*'` returned no files.
- `git status --short` after removal showed no temporary script staged or untracked.
- The temporary script was not staged.

## Deviation

The first script run completed the approved service-layer mutation once, then failed during post-mutation verification because a broad fixture stock-movement read filter referenced a non-existent `StockMovement.reference` schema field. The script was patched locally to add an explicit `--verify-existing` path and to use the current `referenceType`, `referenceId`, and `description` fields for the read-only stock movement check. The second script run used `--verify-existing`, refused to create anything, and only verified the already-created marker fixture.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, preflight, closure, service, controller, DTO, spec, schema, README, and BUG_AUDIT paths.
- `docker info --format ...`.
- `docker ps --format ...`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- `corepack pnpm exec tsx scripts/dev08b-ap-debit-note-fixture.tmp.ts --marker=DEV08B-AP-20260526T060000 --family=ap --approval=...`.
- `corepack pnpm exec tsx scripts/dev08b-ap-debit-note-fixture.tmp.ts --verify-existing --marker=DEV08B-AP-20260526T060000 --family=ap --approval=...`.
- `Remove-Item -LiteralPath apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts`.
- `Test-Path -LiteralPath apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts`.
- `Get-ChildItem -Path apps/api/scripts -Filter '*dev08b*'`.

## Commands Skipped

- Migrations, seed/reset/delete, deploys, environment changes, login/browser flows, production-hosting research, full tests, full build, E2E, smoke, `verify:repo`, `verify:ci:local` actual.
- Supplier payment creation, supplier refund creation, purchase order creation, purchase receipt creation, cash expense creation, stock movement creation, debit-note apply, debit-note reverse, debit-note void, purchase bill void, PDF/archive/export/download, generated-document archive creation, ZATCA, email, backup, restore, and cleanup deletion.
- Targeted purchase-debit-note, purchase-bill, and contact tests were skipped because no production code remained changed; only documentation was committed after the temporary script was removed.

## Remaining Blockers

- Debit-note apply/reverse allocation audit actions still appear raw rather than standardized in current code and need confirmation in later DEV-08B parts.
- Supplier refund branch ordering remains unresolved until the dedicated refund preflight.
- Part 3 should perform a read-only evidence verification pass over `BILL-000008` and `PDN-000003`.

## Next Recommended Thread

`DEV-08B Part 3: AP debit note fixture evidence verification`
