# DEV-11 Inventory Fixture Mutation Evidence

Date: 2026-05-30

Latest commit inspected before mutation: `655dbbac Preflight DEV-11 inventory valuation COGS`

Marker: `DEV11-INV-20260530T000000`

## 1. Approval Text Used

`I approve DEV-11 Part 2 local-only inventory valuation fixture creation under marker DEV11-INV-20260530T000000. No production, no beta, no customer data.`

## 2. Local Target Proof

| Check | Result |
| --- | --- |
| `git status --short` | Only unrelated untracked marketing/graphify files were present before mutation; no tracked code was dirty. |
| `git log -1 --oneline` | `655dbbac Preflight DEV-11 inventory valuation COGS` |
| Root `.env` database target | Scheme `postgresql`; host `localhost`; port `5432`; database `accounting`; classification `local-only accepted`. |
| API `.env` database target | Scheme `postgresql`; host `localhost`; port `5432`; database `accounting`; classification `local-only accepted`. |
| Local Postgres/Redis | Docker containers `infra-postgres-1` and `infra-redis-1` were running and healthy on local ports `5432` and `6379`. |

The target was accepted because the database host was local and the database name did not contain production, beta, live, user-testing, or hosted-provider markers.

## 3. Mutation Script/Helper Summary

A temporary runner was created at `apps/api/scripts/dev11-part2-fixture.temp.ts`, executed once with `corepack pnpm --dir apps/api exec tsx scripts/dev11-part2-fixture.temp.ts`, and removed before commit.

The runner:

- Loaded only local `.env` values.
- Rejected non-local or production/beta-looking database targets.
- Created or reused deterministic marker-scoped synthetic records only.
- Printed safe ID prefixes and counts only.
- Printed no DB URL, secret, token, auth header, cookie, customer/vendor payload body, inventory payload body, CSV body, PDF body, base64, or attachment body.

## 4. Fixture Marker

`DEV11-INV-20260530T000000`

## 5. Safe Fixture IDs

| Component | Safe ID prefix |
| --- | --- |
| Organization | `837b9c13` |
| User | `e08ad608` |
| Item | `27398986` |
| Warehouse | `0b519fab` |
| Purchase bill | `6d84a149` |
| Purchase receipt | `a413ac33` |
| Sales stock issue | `c3d25519` |
| Bill clearing journal | `6befd661` |

## 6. Fixture Components Created/Reused

The marker organization did not already exist, so the runner created the synthetic fixture dataset.

| Component | Fixture shape |
| --- | --- |
| Organization/user/role | Marker organization, fake local user email `dev11.inv.20260530t000000@ledgerbyte.local.test`, active marker accountant role, and active membership. |
| Accounts | Marker-labeled Inventory Asset, Inventory Clearing, COGS, adjustment gain, adjustment loss, revenue, AP, AR, and VAT Receivable accounts. |
| Fiscal period | Open May 2026 fixture period. |
| Inventory settings | `enableInventoryAccounting=true`, `MOVING_AVERAGE`, `purchaseReceiptPostingMode=PREVIEW_ONLY`, and mapped inventory asset/COGS/clearing/adjustment accounts. |
| Operational inventory | One active marker item, one active marker warehouse, opening stock movement, purchase receipt inbound movement, and sales issue outbound movement. |
| Purchase source | One finalized `INVENTORY_CLEARING` purchase bill with a posted clearing journal. |
| Receipt source | One posted purchase receipt linked to the clearing-mode bill and receipt line. |
| Sales source | One finalized marker sales invoice and one posted sales stock issue linked to the invoice line. |
| Variance candidate | No proposal was created in Part 2; the bill/receipt values intentionally support a later clearing variance proposal. |

## 7. Before/After Marker Counts

| Area | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Organizations | 0 | 1 | +1 |
| Users | 0 | 1 | +1 |
| Accounts | 0 | 9 | +9 |
| Inventory settings | 0 | 1 | +1 |
| Items | 0 | 1 | +1 |
| Warehouses | 0 | 1 | +1 |
| Stock movements | 0 | 3 | +3 |
| Purchase bills | 0 | 1 | +1 |
| Purchase receipts | 0 | 1 | +1 |
| Sales stock issues | 0 | 1 | +1 |
| Inventory adjustments | 0 | 1 | +1 |
| Transfers | 0 | 0 | 0 |
| Variance proposals | 0 | 0 | 0 |
| Journal entries | 0 | 1 | +1 |
| Journal lines | 0 | 2 | +2 |
| Generated documents | 0 | 0 | 0 |
| Audit logs | 0 | 0 | 0 |

## 8. Expected Inventory Quantity/Value Math

| Metric | Expected value |
| --- | ---: |
| Opening quantity | `20.0000` |
| Opening value | `200.0000` |
| Receipt quantity | `10.0000` |
| Receipt value | `100.0000` |
| Sales issue quantity | `5.0000` |
| Moving-average unit cost | `10.0000` |
| Operational quantity on hand after issue | `25.0000` |
| Operational inventory value after issue | `250.0000` |

## 9. Expected COGS Preview Math

The marker sales stock issue quantity is `5.0000`. With expected moving-average unit cost `10.0000`, the expected COGS preview amount is `50.0000`.

Expected later COGS post journal:

- Dr COGS `50.0000`
- Cr Inventory Asset `50.0000`

## 10. Expected Purchase Receipt Asset Posting Math

The marker purchase receipt quantity is `10.0000` at unit cost `10.0000`, so the expected receipt asset posting amount is `100.0000`.

Expected later receipt asset post journal:

- Dr Inventory Asset `100.0000`
- Cr Inventory Clearing `100.0000`

## 11. Expected Clearing Variance Setup

The finalized clearing-mode purchase bill posts Inventory Clearing debit `90.0000`. Before receipt asset posting, expected open clearing difference is `90.0000`.

After the later receipt asset post, expected active receipt clearing credit is `100.0000`, so expected net clearing difference is `-10.0000`. That difference supports later clearing variance proposal checks.

## 12. Expected Financial Statement Impact Before Later Postings

Before later DEV-11 COGS, receipt asset, and variance proposal postings:

- Inventory Clearing has debit `90.0000` from the finalized clearing-mode purchase bill.
- Accounts Payable has credit `90.0000` from the same bill journal.
- Inventory Asset has no DEV-11 receipt asset posting yet.
- COGS has no DEV-11 COGS posting yet.
- No generated-document, CSV, PDF, download, archive, email, ZATCA, backup, or restore output exists for the marker.

## 13. No-Production/No-Beta/No-Customer-Data Guarantee

The fixture was created only on `localhost:5432/accounting`. All organization, contact, item, warehouse, account, document, and user labels are synthetic and marker-scoped. No production, beta, hosted/shared, or customer data target was used.

## 14. No-Body/No-Secret Guarantee

The evidence and runner output contain counts, safe ID prefixes, statuses, and deterministic amounts only. They do not contain DB URLs, credentials, auth headers, cookies, tokens, request/response bodies, customer/vendor payload bodies, inventory payload bodies, CSV bodies, PDF bodies, generated-document base64, or attachment bodies.

## 15. Commands Run

- `git status --short`
- `git log -1 --oneline`
- Local `.env` target classification command with redacted output.
- `Get-NetTCPConnection -State Listen -LocalPort 5432,6379`
- `docker ps --format "{{.Names}} {{.Status}} {{.Ports}}"`
- `corepack pnpm --dir apps/api exec tsx scripts/dev11-part2-fixture.temp.ts`

## 16. Commands Skipped

- `verify:repo`
- `verify:ci:local` actual
- Full tests
- Full build
- E2E
- Smoke
- Migrations
- Seed/reset/delete
- Deploys
- Environment changes
- Non-local DB access
- Login/browser flows
- COGS posting
- Inventory asset posting
- Variance proposal posting
- Report queries
- CSV/PDF/download/archive generation
- ZATCA
- Email
- Backup/restore
- Production-hosting research

## 17. Recommended Next Thread

`DEV-11 Part 3: inventory fixture evidence verification`
