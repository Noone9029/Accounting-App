# DEV-08 AP Fixture Evidence Verification

## Purpose And Scope

DEV-08 Part 3 performed a read-only verification pass for the DEV-08 Part 2 AP fixture creation evidence.

No supplier, bill, supplier payment, allocation, refund, debit note, purchase order, purchase receipt, cash expense, generated document, email, ZATCA artifact, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.

## Latest Commit Inspected

- Branch: `main`.
- Local `HEAD`: `230122c3ce0a63bb82eb08d7eff4c7aa8e84a132`.
- `origin/main`: `230122c3ce0a63bb82eb08d7eff4c7aa8e84a132`.
- Latest commit: `230122c3 Create DEV-08 AP fixture`.
- Existing unrelated untracked files remained limited to web/marketing and graphify paths and were not staged or modified by this verification.

## Local-Only Target Proof

- Docker engine reported Linux mode and server version `28.5.1`.
- Local compose services were healthy:
  - `infra-postgres-1` on local port `5432`.
  - `infra-redis-1` on local port `6379`.
- Verification used only read-only SQL through the local compose Postgres container.
- No hosted database target, production, beta/user-testing, shared, or customer-data target was used.
- No database URL, token, cookie, auth header, request/response body, generated document body, signed XML, QR payload, or attachment body is recorded in this evidence.

## Temporary Script Absence Proof

- `Test-Path apps/api/scripts/dev08-ap-fixture-create.tmp.ts` returned `False`.
- `git ls-files --stage apps/api/scripts/dev08-ap-fixture-create.tmp.ts` returned no index entry.
- The Part 2 temporary script is absent, unstaged, and untracked.

## Supplier Verification

Marker: `DEV08-AP-20260525T230000`.

Read-only SQL confirmed:

- Exactly one supplier matched `DEV08-AP-20260525T230000 Supplier`.
- Supplier safe id prefix: `0e36df97`.
- Supplier display label: `DEV08-AP-20260525T230000 Supplier`.
- Supplier type: `SUPPLIER`.
- Supplier active: `true`.
- Supplier belongs to exactly one fake local AP-ready organization.
- Organization safe id prefix: `db69e5a8`.

## Purchase Bill Verification

Read-only SQL confirmed:

- Exactly one purchase bill exists for the DEV-08 supplier.
- Bill number: `BILL-000007`.
- Bill safe id prefix: `d81ddd60`.
- Status: `FINALIZED`.
- Inventory posting mode: `DIRECT_EXPENSE_OR_ASSET`.
- Subtotal: `1000.0000`.
- Tax total: `150.0000`.
- Total: `1150.0000`.
- Balance due: `1150.0000`.
- Purchase order link: absent.
- Reversal journal: absent.
- Supplier payment allocations: `0`.
- Supplier payment unapplied allocations: `0`.
- Purchase debit note allocations: `0`.
- Generated documents for the bill: `0`.

## Tax Path Verification

The VAT path remains confirmed:

- Zero-tax fallback was not used.
- Bill line account: `111 Cash`.
- Purchase tax rate: `VAT on Purchases 15%`.
- Tax rate: `15.0000`.
- Taxable amount: `1000.0000`.
- Tax amount: `150.0000`.
- Line total: `1150.0000`.

Note: account `111 Cash` is a postable direct expense-or-asset account in the selected fake local organization. This matches Part 2 evidence, but a later AP setup hardening ticket should prefer a clearer dedicated expense account when new AP base dependencies are explicitly approved.

## Journal And Accounting Verification

Read-only SQL confirmed:

- Journal number: `JE-000049`.
- Journal safe id prefix: `3dfa0a86`.
- Status: `POSTED`.
- Reference: `BILL-000007`.
- Total debit: `1150.0000`.
- Total credit: `1150.0000`.
- Balance check: balanced.
- Journal line 1: debit `1000.0000` to account `111 Cash`.
- Journal line 2: debit `150.0000` to account `230 VAT Receivable`.
- Journal line 3: credit `1150.0000` to account `210 Accounts Payable`.
- No supplier payment journal exists for the DEV-08 supplier.
- No reversal journal exists for the DEV-08 bill.

## Audit Verification

Read-only SQL against the DEV-08 supplier and bill entity IDs confirmed:

| Entity type | Action | Count |
| --- | --- | ---: |
| `Contact` | `CREATE` | `1` |
| `PurchaseBill` | `PURCHASE_BILL_CREATED` | `1` |
| `PurchaseBill` | `PURCHASE_BILL_FINALIZED` | `1` |

No supplier payment, supplier refund, purchase debit note, purchase bill void/reversal, or browser/login audit-writing action was linked to this fixture.

## Forbidden Side-Effect Verification

Fixture-specific read-only counts:

| Check | Count |
| --- | ---: |
| Supplier payments for supplier | `0` |
| Supplier payment allocations for bill | `0` |
| Supplier payment unapplied allocations for bill | `0` |
| Supplier refunds for supplier | `0` |
| Purchase debit notes for supplier or bill | `0` |
| Purchase debit note allocations for bill | `0` |
| Purchase orders for supplier | `0` |
| Purchase receipts for supplier or bill | `0` |
| Stock movements for bill marker or id | `0` |
| Cash expenses for supplier | `0` |
| Generated documents for bill | `0` |
| Email outbox rows for marker or bill | `0` |
| Cleanup/delete audit actions for fixture | `0` |

Current organization-level baseline counts still match the Part 2 after-mutation evidence:

| Entity | Current count |
| --- | ---: |
| Supplier payments | `2` |
| Supplier refunds | `2` |
| Purchase debit notes | `2` |
| Purchase orders | `2` |
| Purchase receipts | `3` |
| Stock movements | `15` |
| Cash expenses | `1` |
| Generated documents | `13` |
| Email outbox | `3` |
| Email provider events | `0` |
| ZATCA signed artifact drafts | `1` |
| ZATCA submission logs | `7` |
| Auth tokens | `2` |
| Cleanup/delete audit actions | `1` |

The AP-ready fake local organization has existing local baseline AP/ZATCA/output records. Part 3 verified that the DEV-08 supplier and bill have no linked forbidden side effects and that the current organization-level baseline still matches the Part 2 recorded after counts.

## Commands Run

- `git fetch origin main`.
- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `git branch --show-current`.
- `Test-Path apps/api/scripts/dev08-ap-fixture-create.tmp.ts`.
- `git ls-files --stage apps/api/scripts/dev08-ap-fixture-create.tmp.ts`.
- Targeted `Get-Content` and `rg` reads for the requested handoff, DEV-08, DEV-07, DEV-04, DEV-05, DEV-03 AP, README, BUG_AUDIT, purchase bill, supplier payment, contact, and Prisma schema paths.
- `docker info --format ...`.
- `docker compose -f infra/docker-compose.yml ps`.
- Local compose Postgres read-only SQL verification through `psql`.

## Commands Skipped And Why

- AP fixture creation, supplier payment creation, supplier payment allocation, purchase bill mutation, purchase bill void, supplier refund/debit-note workflows, PDF/archive/export/download routes, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, browser/login flows, backup/restore, and production-hosting research: explicitly out of scope.
- Full tests, full build, smoke, and E2E: explicitly out of scope for this read-only evidence verification.
- API/package typecheck and targeted tests: skipped because no production code or tests changed.

## Deviations Or Blockers

- No verification blocker was found.
- The selected fake local organization still has pre-existing AP/ZATCA/output baseline rows, so future DEV-08 mutation evidence must continue comparing fixture-specific rows plus before/after organization baseline counts.
- The bill line uses account `111 Cash`, which is acceptable under the current direct expense-or-asset posting path but is not ideal AP fixture semantics. A later approved setup-hardening task should use a dedicated expense account.

## Remaining DEV-08 Risks

- Supplier payment creation and direct allocation have not been run.
- Supplier payment unapplied amount, apply-unapplied allocation, reversal, and void/reversal have not been run.
- Purchase bill void/reversal has not been run.
- Supplier refunds, purchase debit notes, purchase order conversion, cash expenses, purchase receipts, inventory-clearing bills, output/PDF/archive, email, and ZATCA paths remain untested in DEV-08.

## Next Recommended Thread

`DEV-08 Part 4: supplier payment creation and allocation preflight`
