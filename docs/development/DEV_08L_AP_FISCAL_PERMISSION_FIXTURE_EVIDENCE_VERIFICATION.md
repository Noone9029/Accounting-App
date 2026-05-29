# DEV-08L AP Fiscal Permission Fixture Evidence Verification

## Purpose And Scope

- Task: `DEV-08L Part 3: AP fiscal-period and permission fixture evidence verification`.
- Latest commit inspected: `6301d9ff Create DEV-08L AP fiscal permission fixtures`.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation performed: no.
- Login/browser, AP service mutation, fiscal-period mutation, output/download, email/provider, ZATCA, migration, seed/reset/delete, deploy, env/provider change, full E2E, full smoke, or full build performed: no.

This was read-only verification of the Part 2 fixture evidence.

## Local Target Verification

- Database target classification: local-only.
- Protocol: `postgresql`.
- Host: `localhost`.
- Port: `5432`.
- Database: `accounting`.
- Fixture organization safe prefix: `cdc2c778`.

## Fiscal Period Verification

| Safe prefix | Status | Start | End | Result |
| --- | --- | --- | --- | --- |
| `6cb54c20` | `CLOSED` | `2026-05-01` | `2026-05-31` | matches Part 2 |
| `ee20b288` | `OPEN` | `2026-06-01` | `2026-06-30` | matches Part 2 |

The closed period covers current-date reversal guard checks. The open control period supports valid posted/finalized fixture records without changing existing seed/demo periods.

## AP Fixture Verification

### Purchase Bills

| Safe prefix | Number | Status | Date | Journal | Mode |
| --- | --- | --- | --- | --- | --- |
| `81912f0b` | `DEV08L-PB-CLOSED-FINALIZE` | `DRAFT` | `2026-05-12` | no | `DIRECT_EXPENSE_OR_ASSET` |
| `a4ab2c11` | `DEV08L-PB-VOID-OPEN` | `FINALIZED` | `2026-06-12` | yes | `DIRECT_EXPENSE_OR_ASSET` |
| `adb1a4f1` | `DEV08L-PB-CLEARING-CLOSED-RECEIPT` | `FINALIZED` | `2026-06-12` | yes | `INVENTORY_CLEARING` |
| `a845d7c7` | `DEV08L-PB-CLEARING-REVERSE-RECEIPT` | `FINALIZED` | `2026-06-12` | yes | `INVENTORY_CLEARING` |

### Supplier Payments And Refunds

| Safe prefix | Number | Type | Status | Date | Journal | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `59c3a992` | `DEV08L-SP-VOID` | supplier payment | `POSTED` | `2026-06-12` | yes | void fixture |
| `6fa2b089` | `DEV08L-SP-REFUND-CREATE-SOURCE` | supplier payment | `POSTED` | `2026-06-12` | yes | refund-create source |
| `908f37de` | `DEV08L-SP-REFUND-VOID-SOURCE` | supplier payment | `POSTED` | `2026-06-12` | yes | refund-void source |
| `67a8f011` | `DEV08L-SRF-VOID` | supplier refund | `POSTED` | `2026-06-12` | yes | source payment prefix `908f37de` |

### Purchase Debit Notes, Cash Expenses, Receipts, Orders

| Safe prefix | Number | Type | Status | Date | Journal state |
| --- | --- | --- | --- | --- | --- |
| `c04b06e9` | `DEV08L-PDN-CLOSED-FINALIZE` | purchase debit note | `DRAFT` | `2026-05-12` | no journal |
| `5153102f` | `DEV08L-PDN-VOID-OPEN` | purchase debit note | `FINALIZED` | `2026-06-12` | journal present |
| `ec4b1e2c` | `DEV08L-CE-VOID` | cash expense | `POSTED` | `2026-06-12` | journal present |
| `515854c6` | `DEV08L-PR-ASSET-CLOSED` | purchase receipt | `POSTED` | `2026-05-12` | no asset journal |
| `34123df3` | `DEV08L-PR-REVERSE-OPEN` | purchase receipt | `POSTED` | `2026-06-12` | asset journal present, no reversal |
| `512d41a7` | `DEV08L-PO-PERMISSION` | purchase order | `DRAFT` | `2026-06-12` | no posting journal expected |

## Restricted Role/User Verification

- Role count: `11`.
- Organization-member/user count: `11`.
- Role families present: full access control, source viewer, output-without-download, email-without-outbox, purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, purchase receipt, and purchase order restricted roles.
- Login was not performed.

## Baseline Count Verification

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

These match the Part 2 evidence.

## Temporary Script Verification

- `apps/api/scripts` contained no `dev08l` temporary scripts.
- Part 3 used a piped read-only verifier and created no disposable script file.

## Exposure Controls

- No database URL, password, token, cookie, auth header, request body, response body, customer/vendor data, email body, PDF body, attachment body, base64, provider payload, signed XML, QR payload, private key, or CSID was printed.

## Commands Run

- Piped read-only `tsx` verifier through `corepack pnpm --filter @ledgerbyte/api exec tsx -`.

## Commands Skipped

- Runtime mutations and blocker calls.
- Login/browser.
- Output/PDF generation or download.
- AP email endpoint calls, provider calls, real email, retry workers, diagnostics, SMTP.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 4: purchase bill fiscal-period blocker preflight`
