# DEV-08 AP Fixture Creation Mutation Evidence

## Scope

DEV-08 Part 2 performed the approved local-only AP fixture creation mutation under marker `DEV08-AP-20260525T230000`.

Approved mutation scope:

- Create one fake local supplier.
- Create one finalized direct-mode purchase bill.
- Use one service/direct expense-or-asset style bill line.
- Do not create supplier payments, supplier refunds, purchase debit notes, purchase orders, cash expenses, purchase receipts, inventory-clearing bills, generated documents, PDF/archive records, email, ZATCA artifacts, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, or login/browser flows.

## Approval Phrase Received

`I approve DEV-08 Part 2 local-only AP fixture creation mutation under marker DEV08-AP-20260525T230000. No production, no beta, no customer data.`

## Latest Commit Inspected

- `6e61b6e7` - `Plan DEV-08 AP state-machine QA`.

Local `HEAD` and `origin/main` both resolved to `6e61b6e7498c1ba4db9fcee3f4d292c2bac0b6ae` before mutation.

## Local-Only Target Proof

- Docker Desktop/Linux engine was available: Docker server `28.5.1`, OS type `linux`.
- Local compose services started from `infra/docker-compose.yml`.
- Local Postgres container: `infra-postgres-1`, service `postgres`, status `running`, health `healthy`.
- Local Redis container: `infra-redis-1`, service `redis`, status `running`, health `healthy`.
- Database target classification in the guarded script:
  - source: `DATABASE_URL`.
  - host: `localhost`.
  - database: `accounting`.
  - localOnly: `true`.
  - blocked hosted/prod/beta pattern: `false`.
- No database URL, credential, token, cookie, auth header, request/response body, document body, signed XML, QR payload, or attachment body was printed.

## Preflight Evidence

- `git status --short` before mutation showed only pre-existing unrelated untracked web/marketing and graphify paths.
- `git log -1 --oneline` returned `6e61b6e7 Plan DEV-08 AP state-machine QA`.
- Marker confirmed: `DEV08-AP-20260525T230000`.
- Family confirmed: `ap`.
- Exact approval phrase confirmed by the guarded script before any write-capable service call.
- The first script execution stopped before mutation because the DEV-07 AR fixture organization was found but lacked postable AP account `210`.
- A read-only local prerequisite inventory then showed the exact DEV-07 organization had no AP account `210`, no VAT receivable account `230`, and no purchase VAT rate, while existing fake local `SDK Hash Validation ...` organizations had AP prerequisites.
- The script selection was narrowed to an AP-ready fake local organization instead of creating chart accounts outside the approved scope.
- Selected fixture organization safe id prefix: `db69e5a8`.
- Selected organization label: `SDK Hash Validation 20260516075413`.
- Selection reason: existing fake local SDK validation organization with AP prerequisites.
- Skipped organization reason: the DEV-07 invoice-linked local fixture organization existed but lacked AP account `210` or another AP posting prerequisite.
- Actor safe id prefix: `09f892d4`.
- Actor email domain: `example.com`.
- Active organization membership: yes.
- Branch count: `1`.
- Fiscal period count: `2`; the script called `FiscalPeriodGuardService.assertPostingDateAllowed(...)` for `2026-05-25` before mutation.
- Existing marker-scoped DEV-08 supplier count: `0`.
- Existing marker-scoped DEV-08 purchase bill count: `0`.

## Mutation Performed

The guarded temporary script under `apps/api/scripts/dev08-ap-fixture-create.tmp.ts` was used, then removed after execution.

Service calls performed during the successful execution:

- `ContactService.create(...)`: once.
- `PurchaseBillService.create(...)`: once.
- `PurchaseBillService.finalize(...)`: once.

The failed first execution stopped before those service calls and created no supplier or bill.

## Supplier Created

- Supplier display label: `DEV08-AP-20260525T230000 Supplier`.
- Supplier safe id prefix: `0e36df97`.
- Type: `SUPPLIER`.
- Active: yes.
- Organization safe id prefix: `db69e5a8`.
- Supplier is marker-bearing and fake local-only.

## Purchase Bill Created And Finalized

- Bill number: `BILL-000007`.
- Bill safe id prefix: `d81ddd60`.
- Status: `FINALIZED`.
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`.
- Purchase order link: absent.
- Reversal journal link: absent.
- Line count: `1`.
- Line account code: `111`.
- Line account type: `ASSET`.
- Line item link: absent.
- Supplier payment allocation count for the bill: `0`.
- Supplier payment unapplied allocation count for the bill: `0`.
- Purchase debit-note allocation count for the bill: `0`.
- Purchase receipt count for the bill: `0`.
- Generated document count for the bill: `0`.

## Bill Totals And Balance Due

VAT path was used.

- Subtotal: `1000.0000`.
- Tax: `150.0000`.
- Total: `1150.0000`.
- Balance due: `1150.0000`.
- Balance due equals total: yes.

## Tax Path

VAT path was safe and used.

- AP account: code `210`, safe id prefix `883ea9a6`.
- VAT receivable account: code `230`, safe id prefix `41e36736`.
- Purchase tax rate: `VAT on Purchases 15%`, rate `15.0000`, safe id prefix `172417be`.
- Zero-tax fallback used: no.

## Journal And Accounting Result

One purchase bill finalization journal was created.

- Journal entry number: `JE-000049`.
- Journal safe id prefix: `3dfa0a86`.
- Status: `POSTED`.
- Total debit: `1150.0000`.
- Total credit: `1150.0000`.
- Organization journal count: `48 -> 49`.
- `BILL` sequence next number: `7 -> 8`.
- `JOURNAL_ENTRY` sequence next number: `49 -> 50`.

Journal lines:

| Account | Name | Debit | Credit |
| --- | --- | ---: | ---: |
| `111` | Cash | `1000.0000` | `0.0000` |
| `230` | VAT Receivable | `150.0000` | `0.0000` |
| `210` | Accounts Payable | `0.0000` | `1150.0000` |

No supplier payment journal and no reversal journal was created.

## Audit Result

Organization audit count changed `177 -> 180`.

Created audit actions:

- `Contact:CREATE`.
- `PurchaseBill:PURCHASE_BILL_CREATED`.
- `PurchaseBill:PURCHASE_BILL_FINALIZED`.

No supplier payment, supplier refund, purchase debit note, payment void, bill void, allocation reverse, or login/browser audit-writing flow was created by this mutation.

The selected organization already had baseline AP/ZATCA/output data from earlier local work. The guarded script verified that the forbidden side-effect counts below did not change.

## Forbidden Side-Effect Counts

| Area | Before | After |
| --- | ---: | ---: |
| Supplier payments | `2` | `2` |
| Supplier refunds | `2` | `2` |
| Purchase debit notes | `2` | `2` |
| Purchase orders | `2` | `2` |
| Purchase receipts | `3` | `3` |
| Stock movements | `15` | `15` |
| Cash expenses | `1` | `1` |
| Generated documents | `13` | `13` |
| Email outbox | `3` | `3` |
| Email provider events | `0` | `0` |
| ZATCA signed artifact drafts | `1` | `1` |
| ZATCA submission logs | `7` | `7` |
| Auth tokens | `2` | `2` |
| Cleanup/delete audit actions | `1` | `1` |

Confirmed unchanged or absent for this mutation:

- no supplier payment.
- no supplier refund.
- no purchase debit note.
- no purchase order conversion.
- no purchase receipt.
- no inventory clearing movement.
- no cash expense.
- no generated document for the bill.
- no PDF/archive/export/download.
- no email outbox/provider event.
- no ZATCA XML/signing/QR/submission artifact.
- no cleanup deletion.
- no migration.
- no seed/reset/delete.
- no deploy.
- no environment/provider/schema change.
- no production/beta/shared/customer-data action.

## Temporary Script Cleanup Proof

- Temporary script path: `apps/api/scripts/dev08-ap-fixture-create.tmp.ts`.
- `Test-Path apps/api/scripts/dev08-ap-fixture-create.tmp.ts` returned `False` after execution.
- `git status --short` after removal showed no temp script staged or untracked.
- The temp script was never staged.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- Targeted `Get-Content` and `rg` reads for the requested DEV-08, DEV-07, DEV-04, DEV-05, DEV-03 AP, development completion, README, BUG_AUDIT, purchase bill, supplier payment, contact, Prisma schema, audit, and package script paths.
- `docker info --format ...`.
- `docker ps --format ...`.
- `Test-NetConnection -ComputerName localhost -Port 5432`.
- `Test-NetConnection -ComputerName localhost -Port 6379`.
- `docker compose -f infra/docker-compose.yml up -d postgres redis`.
- `docker compose -f infra/docker-compose.yml ps`.
- A local compose health wait for Postgres and Redis.
- Read-only Docker/Postgres prerequisite inventory for local organization AP account/tax readiness.
- `corepack pnpm exec tsx scripts/dev08-ap-fixture-create.tmp.ts --marker ... --family ap --approval ...`.
- `Remove-Item -LiteralPath apps/api/scripts/dev08-ap-fixture-create.tmp.ts`.
- `Test-Path apps/api/scripts/dev08-ap-fixture-create.tmp.ts`.

One Docker/Postgres inventory command had a quoting error and exited before producing usable evidence. It was corrected with a stdin SQL command. No mutation was performed by the failed inventory command.

## Commands Skipped And Why

- AP fixture runner execute mode: skipped because Part 1 found the DEV-04 runner is not execute-ready for DEV-08 AP.
- Migrations, seed/reset/delete, deploys, environment changes, login/browser flows, exports/downloads/PDF generation, generated-document archive creation, ZATCA, email, backup/restore, production-hosting research, full tests, full build, smoke, E2E, `verify:repo`, and `verify:ci:local`: explicitly out of scope.
- Targeted purchase-bill/contact tests: skipped because no production code or tests were changed; only the local approved mutation and evidence docs changed.

## Remaining Blockers

- The DEV-07 AR fixture organization is not suitable for AP bill finalization because it lacks AP account `210` and purchase VAT dependencies.
- The first DEV-08 AP fixture uses an existing fake local AP-ready organization with baseline local AP/ZATCA/output data; future evidence should continue to compare before/after side-effect counts instead of assuming a zero baseline.
- The bill uses a direct asset account line (`111 Cash`) because it is an allowed postable direct expense-or-asset account in the selected org. A future AP setup hardening ticket should prefer a clearer dedicated expense account when creating new AP-specific base dependencies is explicitly approved.
- Supplier payment creation/allocation has not been run yet.
- Purchase bill void/reversal has not been run yet.
- Purchase debit note, supplier refund, purchase order conversion, cash expense, purchase receipt, inventory-clearing, output/PDF/archive, email, and ZATCA paths remain untested in DEV-08.

## Next Recommended Thread

`DEV-08 Part 3: AP fixture evidence verification`

## Part 3 Verification Note

DEV-08 Part 3 completed a read-only verification pass for this fixture evidence. Verification is recorded in [DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md).

Part 3 confirmed the supplier, finalized purchase bill, VAT path, posted journal, audit rows, temporary script cleanup, and fixture-specific absence of supplier payments, refunds, debit notes, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, email rows, ZATCA rows linked to the fixture, and cleanup/delete actions.
