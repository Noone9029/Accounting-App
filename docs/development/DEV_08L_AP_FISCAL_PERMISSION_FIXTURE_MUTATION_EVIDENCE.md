# DEV-08L AP Fiscal Permission Fixture Mutation Evidence

## Purpose And Scope

- Task: `DEV-08L Part 2: approved local AP fiscal-period and permission fixture mutation`.
- Latest commit inspected: `99e1a009 Plan DEV-08L AP fiscal permission edges`.
- Marker: `DEV08L-AP-20260529T000000`.
- Approval phrase received exactly: yes.
- Runtime mutation performed: yes, local disposable fixture creation only.
- Production, beta, hosted/shared target, or customer data touched: no.
- Login/browser, real email, provider calls, output/PDF generation or download, ZATCA, migrations, seed/reset/delete, deploys, env/provider changes, backup/restore, full E2E, or full smoke performed: no.

Exact approval phrase used before mutation:

```text
I approve DEV-08L Part 2 local-only AP fiscal-period and permission fixture mutation under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.
```

## Local Target Guard

- Database target classification: local-only.
- Protocol: `postgresql`.
- Host: `localhost`.
- Port: `5432`.
- Database: `accounting`.
- Docker services observed before mutation: local Postgres and Redis listeners were present on `5432` and `6379`; `infra-postgres-1` and `infra-redis-1` were healthy.
- The script refused non-local host, non-Postgres protocol, non-`5432` port, or non-`accounting` database before opening a Prisma client.

## Fixture Organization

- Dedicated local disposable organization safe prefix: `cdc2c778`.
- Owner actor safe prefix: `dda4ee99`.
- Synthetic emails used only `.local.test` addresses.
- No login was performed, so no auth-token or login-audit path was triggered.

## Fiscal Period Fixtures

| Safe prefix | Status | Date range |
| --- | --- | --- |
| `6cb54c20` | `CLOSED` | `2026-05-01..2026-05-31` |
| `ee20b288` | `OPEN` | `2026-06-01..2026-06-30` |

Selection rationale:

- Closed May 2026 covers the current execution date and closed-document test date, so `new Date()` reversal guards and closed document-date posting guards can be tested in the dedicated fixture organization.
- Open June 2026 is the control period used to create valid posted/finalized source records needed for void/reversal blocker checks.
- No existing seed/demo organization fiscal periods were changed.

## Fixture Accounts

| Account purpose | Safe prefix |
| --- | --- |
| Cash/bank asset | `61155360` |
| Inventory asset | `db48b426` |
| Inventory clearing | `6ea3c06d` |
| Accounts payable | `5ea348a4` |
| VAT receivable | `4ff711de` |
| Expense | `b3e32c5c` |

Inventory accounting was enabled only inside the disposable fixture organization with moving-average valuation and preview-only purchase receipt posting so receipt asset posting fixtures can be evaluated later.

## AP Source Fixtures

| Fixture | Safe prefix | Status | Number | Date |
| --- | --- | --- | --- | --- |
| Purchase bill finalize closed-period draft | `81912f0b` | `DRAFT` | `DEV08L-PB-CLOSED-FINALIZE` | `2026-05-12` |
| Purchase bill void open-period finalized | `a4ab2c11` | `FINALIZED` | `DEV08L-PB-VOID-OPEN` | `2026-06-12` |
| Supplier payment void source | `59c3a992` | `POSTED` | `DEV08L-SP-VOID` | `2026-06-12` |
| Supplier payment refund-create source | `6fa2b089` | `POSTED` | `DEV08L-SP-REFUND-CREATE-SOURCE` | `2026-06-12` |
| Supplier refund void fixture | `67a8f011` | `POSTED` | `DEV08L-SRF-VOID` | `2026-06-12` |
| Purchase debit note finalize closed-period draft | `c04b06e9` | `DRAFT` | `DEV08L-PDN-CLOSED-FINALIZE` | `2026-05-12` |
| Purchase debit note void open-period finalized | `5153102f` | `FINALIZED` | `DEV08L-PDN-VOID-OPEN` | `2026-06-12` |
| Cash expense void fixture | `ec4b1e2c` | `POSTED` | `DEV08L-CE-VOID` | `2026-06-12` |
| Purchase receipt asset-post closed-period fixture | `515854c6` | `POSTED` | `DEV08L-PR-ASSET-CLOSED` | `2026-05-12` |
| Purchase receipt reverse open-period fixture | `34123df3` | `POSTED` | `DEV08L-PR-REVERSE-OPEN` | `2026-06-12` |
| Purchase order permission fixture | `512d41a7` | `DRAFT` | `DEV08L-PO-PERMISSION` | `2026-06-12` |

Additional internal support records were created inside the same organization:

- One synthetic supplier contact.
- One inventory-tracked item.
- One active warehouse.
- Two finalized inventory-clearing purchase bills used only as receipt-accounting sources.
- Ten posted journal entries for open-control source state.

## Restricted Role/User Fixtures

- Marker-scoped roles/users created: `11`.
- Role coverage:
  - admin full access control.
  - AP source viewer without mutation permissions.
  - output viewer without `generatedDocuments.download`.
  - AP email user without `emailOutbox.view`.
  - purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, purchase receipt, and purchase order restricted mutation roles.
- No role was created in another organization.
- No user login was performed.

## Baseline Counts

| Count | Value |
| --- | ---: |
| Fiscal periods | `2` |
| Roles | `11` |
| Organization members/users | `11` |
| Purchase bills | `4` |
| Supplier payments | `3` |
| Supplier refunds | `1` |
| Purchase debit notes | `2` |
| Cash expenses | `1` |
| Purchase receipts | `2` |
| Purchase orders | `1` |
| Journal entries | `10` |
| Audit logs | `0` |
| Email outbox rows | `0` |
| Generated documents | `0` |
| Email provider events | `0` |
| ZATCA invoice metadata rows | `0` |
| ZATCA submission logs | `0` |

## Temporary Script Cleanup

- Temporary runner path: `apps/api/scripts/dev08l-part2-fixture-mutation.temp.ts`.
- Cleanup result: deleted after execution.
- Post-cleanup check: path returned `False`.

## Side-Effect Boundary

- Real email sent: no.
- Provider call performed: no.
- Output/PDF generated or downloaded: no.
- ZATCA called: no.
- Login performed: no.
- Production or beta touched: no.
- Request/response bodies, passwords, tokens, cookies, auth headers, database URLs, customer/vendor data, email bodies, PDF bodies, attachment bodies, base64, provider payloads, signed XML, QR payloads, private keys, and CSIDs printed: no.

## Commands Run

- `git status --short --branch`
- `git log -1 --oneline --decorate`
- `Get-NetTCPConnection -State Listen -LocalPort 5432,6379`
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`
- `corepack pnpm --filter @ledgerbyte/api exec tsx --version`
- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08l-part2-fixture-mutation.temp.ts`
- `Remove-Item -LiteralPath 'apps/api/scripts/dev08l-part2-fixture-mutation.temp.ts'`
- `Test-Path -LiteralPath 'apps/api/scripts/dev08l-part2-fixture-mutation.temp.ts'`

## Commands Skipped

- Fixture cleanup/delete.
- Actual fiscal blocker service calls.
- Permission negative checks.
- Login/browser.
- Output/PDF generation or download.
- AP email endpoint calls, retry workers, diagnostics, SMTP, provider calls, and real email.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 3: AP fiscal-period and permission fixture evidence verification`
