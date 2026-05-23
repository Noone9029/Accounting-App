# DEV-04 Local Disposable Fixture Plan

## 1. Purpose And Scope

This document plans how LedgerByte should add local disposable fixture support for future approved state-machine QA. It follows the DEV-03 final triage and safe fixture/login/audit policy, but does not implement fixture scripts, create fixture data, run login, or execute any mutation.

The goal is to define a safe path for later local-only QA of AR, AP, banking/reconciliation, inventory, journals, reports, documents, and audit/output gates using clearly marked disposable data.

## DEV-04 Part 2 Design Note

DEV-04 Part 2 created [DEV_04_FIXTURE_SCRIPT_DESIGN.md](DEV_04_FIXTURE_SCRIPT_DESIGN.md). It keeps the fixture runner local-only and dry-run-first, proposes `apps/api/scripts/dev04-fixture-runner.ts`, documents guard, CLI, module, test, cleanup-plan, and evidence boundaries, and records that no fixture script, login, fixture data creation, or runtime mutation was performed.

## 2. Non-Goals

- Do not implement fixture scripts in this part.
- Do not create fixture records.
- Do not login or run flows that write audit logs.
- Do not run migrations, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, exports, downloads, PDF generation, generated-document archiving, deployment, or environment changes.
- Do not change app behavior, Prisma schema, business logic, provider settings, Vercel/Supabase settings, production docs, or customer data.
- Do not turn demo, smoke, or E2E helpers into a default DEV-04 runner without a later approval gate.

## 3. Safety Boundaries

- Local disposable only: fixture support must target a local developer database and local API/web runtime unless a later prompt explicitly approves another isolated non-production target.
- No production: fixture tooling must reject production URLs and must not call production services.
- No beta/user-testing by default: the Vercel/Supabase beta path remains staging/user-testing only and is not a default fixture target.
- No shared or customer data: fixtures must use fake names, fake emails, fake references, and fake business values only.
- No seed/reset/delete by default: fixture creation must not depend on broad seed, reset, delete, truncate, or purge commands.
- No login until separately approved: any login or token creation path must be explicitly approved because login writes audit logs.
- No output generation until separately approved: report exports, downloads, PDFs, generated-document archive records, attachments, ZATCA artifacts, email, backup evidence, and storage mutations stay out of the default fixture path.

## 4. Fixture Design Principles

- Every fixture record that exposes a human-readable name, code, memo, reference, description, email, filename, or document number should include a `DEV03-...` or `DEV04-...` marker.
- Fixture creation should be deterministic enough to rerun safely, using an explicit `runId` plus idempotent lookup rules where the model has stable unique keys.
- Fixture data should be isolated by organization/tenant so later cleanup and evidence gathering can be marker-scoped.
- Cleanup must be planned before mutation execution starts. Cleanup must prefer normal application transitions, such as void/reverse/archive, over raw deletes.
- Test data must avoid secrets, real customer or vendor names, real tax identifiers, real bank data, real email addresses, real attachment bodies, real statement files, signed XML, QR payloads, and production-like credentials.
- The first implementation should support dry-run/plan mode that prints intended records and target checks without writing data.
- Fixture tooling should produce sanitized evidence only: target classification, marker prefix, planned entity counts, created/reused counts, and ids only when safe for local docs.

## 5. Fixture Families Needed

| Family | Marker prefix | Primary use |
| --- | --- | --- |
| Sales/AR | `DEV03-AR-` | Invoices, payments, refunds, credit notes, AR documents, and AR output gates. |
| Purchases/AP | `DEV03-AP-` | Purchase orders, bills, supplier payments/refunds, debit notes, cash expenses, AP documents, and AP output gates. |
| Banking/Reconciliation | `DEV03-BANK-` | Bank profiles, transfers, statement imports/transactions, matching, categorization, ignore flows, and reconciliations. |
| Inventory | `DEV03-INV-` | Items, warehouses, opening stock, adjustments, transfers, receipts, sales stock issues, valuation, and variance proposals. |
| Journals/Reports/Documents | `DEV03-JRD-` | Manual journals, fiscal periods, accounts, tax rates, report filters, generated documents, audit/output gates, and storage readiness metadata. |
| Fixture infrastructure | `DEV04-` | Fixture runner organization, user, roles, run metadata, and dry-run/cleanup planning records if a later implementation needs them. |

## 6. Proposed Implementation Options

### Option A: Script-Only Local Fixture Creator Using API Service Layer

Create a dedicated local-only runner that uses application services or API-shaped helpers for fixture creation. The script would run in dry-run mode by default and only write records after explicit local-disposable approval.

- Safety: strong if the runner has hard local-target guards, dry-run default, explicit write flag, and marker validation.
- Data isolation: strong when it creates a dedicated fixture organization and uses marker-prefixed records.
- Audit-log behavior: can preserve service-level audit behavior if executed with an approved fixture user context; login can stay separate until approved.
- Repeatability: good with `runId`, idempotent lookups, and created/reused summaries.
- Cleanup ability: good if the same runner can later produce a marker-scoped cleanup plan.
- Effort: medium to high because service dependencies and user/org context must be wired carefully.
- Risk: medium; high fan-out service dependencies can accidentally run business side effects unless the runner scope is narrow.

### Option B: Prisma/Local DB Direct Fixture Creator

Create records directly with Prisma in a local database, bypassing API endpoints and service-layer transitions.

- Safety: strong only if target guards are strict and writes are limited to base bootstrap data.
- Data isolation: strong for org/user/role/bootstrap records with unique markers.
- Audit-log behavior: weak by default because direct inserts bypass normal audit hooks unless audit rows are explicitly created.
- Repeatability: strong for upserts against unique keys.
- Cleanup ability: strong for marker inventory and base data, but risky for business records with ledger/state dependencies.
- Effort: low to medium.
- Risk: medium to high if used for business workflows because it can bypass validation, status transitions, balances, journal creation, and audit behavior.

### Option C: Playwright/E2E-Style Fixture Setup

Reuse the current E2E pattern that logs in by API, seeds demo workflows when local, and drives UI/API setup flows.

- Safety: weak by default for DEV-04 because current E2E global setup can seed workflow records and login writes audit logs.
- Data isolation: mixed; existing defaults use the demo organization unless overridden.
- Audit-log behavior: realistic but not contained unless the run is explicitly approved.
- Repeatability: mixed; current helpers use generated names and demo helper reuse patterns.
- Cleanup ability: weak unless a marker-scoped cleanup plan is added first.
- Effort: low for browser-like coverage, but high to make safe enough for DEV-04 defaults.
- Risk: high for default gates because it can mutate workflow data and depends on login, API/web runtime, and Playwright behavior.

### Option D: Reuse/Extend Existing Demo/Smoke Helpers

Borrow patterns from `apps/api/scripts/seed-demo-workflows.ts`, smoke scripts, and E2E helpers without running them as default fixture commands.

- Safety: useful patterns exist, including local-target checks and created/reused summaries, but existing helpers are mutation-oriented.
- Data isolation: weak to mixed because existing demo helpers use the demo org and `LEDGERBYTE_DEMO_WORKFLOW_SEED` marker.
- Audit-log behavior: realistic because login/API flows write audit records, but that requires future approval.
- Repeatability: good in places because helpers search and reuse records.
- Cleanup ability: weak until marker inventory and cleanup planning are added.
- Effort: low to mine patterns; medium to refactor into a safe dedicated fixture runner.
- Risk: medium to high if reused directly because demo/smoke helpers create business records and output-adjacent evidence.

## 7. Option Comparison

| Option | Safety | Data isolation | Audit-log behavior | Repeatability | Cleanup ability | Effort | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A: service/API-layer runner | High with local guards and dry-run default | High | Preserved when approved fixture user context is used | High | High if cleanup plan is paired | Medium/high | Medium |
| B: direct Prisma runner | High for bootstrap only; lower for business records | High | Bypassed unless explicitly modeled | High | High for marker inventory, risky for state records | Low/medium | Medium/high |
| C: Playwright/E2E setup | Low as default; medium after approval gates | Mixed | Realistic but audit-writing | Mixed | Low until cleanup exists | Low/high to harden | High |
| D: demo/smoke helper reuse | Medium as reference only; low as default command | Mixed | Realistic but audit-writing | Medium/high | Low until redesigned | Low/medium | Medium/high |

## 8. Recommended Approach

Use a hybrid of Option A, limited Option B, and Option D patterns:

1. Build a dedicated local-only fixture runner in a later DEV-04 part, with dry-run/plan mode as the default behavior.
2. Add strict target guards before any write path: local URL or local database only, explicit write flag, marker prefix validation, no production/beta URLs, and no seed/reset/delete.
3. Use limited direct Prisma writes only for low-level bootstrap records that are hard to create without an authenticated context, such as fixture organization, fixture user, base roles, role permissions, active membership, and foundation settings. This still requires a later approved implementation prompt.
4. Use API/service-layer paths for business fixture records where validations, balances, journals, inventory movements, and audit behavior matter.
5. Keep login separate until a later prompt approves login/audit writes. The fixture runner should be able to plan bootstrap and service-context needs without authenticating by default.
6. Mine existing demo/smoke helpers for local-target checks, idempotent `ensure*` patterns, redacted summaries, and created/reused counters, but do not run existing demo/smoke commands as the DEV-04 default.

This approach gives the safest path to realistic mutation QA: direct DB only for controlled bootstrap, service/API behavior for workflow-sensitive records, and dry-run evidence before any write.

## 9. Proposed Fixture Schema And Records

### Organization, User, And Roles

- Organization: `DEV04-ORG-<runId>` with fake legal name, fake VAT/tax marker, base currency `SAR`, and local-only notes where available.
- User: `dev04.fixture.<runId>@ledgerbyte.local.test` with fake display name `DEV04-USER-<runId>`.
- Roles: fixture owner/admin role with required permissions for later approved batch, plus restricted role variants for permission QA if later approved.
- Membership: active membership between fixture user and fixture organization.
- Optional run metadata: if no table exists, record run metadata in the fixture plan output rather than adding schema.

### Chart Of Accounts And Taxes

- Cash/bank account: `DEV04-ACCT-CASH-<runId>`.
- Accounts receivable: `DEV04-ACCT-AR-<runId>`.
- Accounts payable: `DEV04-ACCT-AP-<runId>`.
- Revenue: `DEV04-ACCT-REV-<runId>`.
- Expense: `DEV04-ACCT-EXP-<runId>`.
- VAT payable/receivable: `DEV04-ACCT-VAT-SALES-<runId>` and `DEV04-ACCT-VAT-PURCHASE-<runId>`.
- Inventory asset, clearing, COGS, and variance accounts: `DEV04-ACCT-INV-*`.
- Tax rates: fake non-official local rates with names such as `DEV04-TAX-SALES-<runId>` and `DEV04-TAX-PURCHASE-<runId>`.

### Contacts, Customers, And Suppliers

- Customer: `DEV03-AR-CUSTOMER-<runId>`.
- Supplier: `DEV03-AP-SUPPLIER-<runId>`.
- Combined contact edge case only when explicitly needed: `DEV04-CONTACT-BOTH-<runId>`.
- Use fake addresses, fake phone numbers, and fake non-real tax values only.

### Items, Services, And Inventory Items

- Service item for AR/AP non-inventory flows: `DEV04-SVC-<runId>`.
- Inventory-tracked item: `DEV03-INV-ITEM-<runId>`.
- Purchase-only or sales-only item variants only if a later batch needs form dependency coverage.
- SKUs must include the marker and run id to avoid collision.

### Bank And Cash Accounts

- Main cash/bank profile: `DEV03-BANK-CASH-<runId>`.
- Transfer destination bank profile: `DEV03-BANK-DEST-<runId>`.
- Linked ledger accounts must be active posting asset accounts.
- Opening-balance posting fixtures should be separate from profile-only fixtures because posting mutates journals.

### Fiscal Periods

- Open period covering the planned QA date: `DEV03-JRD-FY-OPEN-<runId>`.
- Closed period fixture: `DEV03-JRD-FY-CLOSED-<runId>`, only when lock/blocked-posting QA is approved.
- Locked period fixture: `DEV03-JRD-FY-LOCKED-<runId>`, only when irreversible lock behavior is explicitly approved.

### Sales/AR Base Records

- Draft invoice: `DEV03-AR-INV-DRAFT-<runId>`.
- Finalizable invoice candidate: `DEV03-AR-INV-FINALIZE-<runId>`.
- Payment allocation candidate: `DEV03-AR-PAY-<runId>`.
- Refund candidate: `DEV03-AR-REFUND-<runId>`.
- Credit note candidate: `DEV03-AR-CN-<runId>`.
- Output fixtures for AR PDFs/receipts must stay planned until output gates are approved.

### Purchases/AP Base Records

- Draft purchase order: `DEV03-AP-PO-DRAFT-<runId>`.
- Approval/close/void purchase order candidate: `DEV03-AP-PO-LIFECYCLE-<runId>`.
- Draft/finalizable bill: `DEV03-AP-BILL-<runId>`.
- Supplier payment candidate: `DEV03-AP-PAY-<runId>`.
- Supplier refund candidate: `DEV03-AP-REFUND-<runId>`.
- Debit note candidate: `DEV03-AP-DN-<runId>`.
- Cash expense candidate: `DEV03-AP-CASH-EXP-<runId>`.

### Banking/Reconciliation Base Records

- Bank transfer candidate: `DEV03-BANK-TRANSFER-<runId>`.
- Statement import marker and fake filename: `DEV03-BANK-STMT-<runId>.csv`.
- Statement transaction marker in description: `DEV03-BANK-TXN-<runId>`.
- Reconciliation draft candidate: `DEV03-BANK-RECON-<runId>`.
- Preview-import content must be synthetic and must never include real bank data.

### Inventory Base Records

- Warehouse source: `DEV03-INV-WH-SRC-<runId>`.
- Warehouse destination: `DEV03-INV-WH-DST-<runId>`.
- Opening stock movement marker: `DEV03-INV-OPENING-<runId>`.
- Adjustment candidate: `DEV03-INV-ADJ-<runId>`.
- Warehouse transfer candidate: `DEV03-INV-XFER-<runId>`.
- Purchase receipt candidate: `DEV03-INV-RECEIPT-<runId>`.
- Sales stock issue candidate: `DEV03-INV-ISSUE-<runId>`.
- Variance proposal candidate: `DEV03-INV-VAR-<runId>`.

### Journals And Report/Output Base Records

- Draft manual journal: `DEV03-JRD-JE-DRAFT-<runId>`.
- Post/reverse candidate journal: `DEV03-JRD-JE-POST-<runId>`.
- Report filter/evidence label: `DEV03-JRD-REPORT-<runId>`.
- Generated-document marker: `DEV03-JRD-DOC-<runId>`, only after output generation approval.
- Audit filter marker: `DEV03-JRD-AUDIT-<runId>`.
- Storage or backup evidence marker: `DEV03-JRD-STORAGE-<runId>`, only for metadata-only future checks.

## 10. Cleanup And Retention Strategy

- Identify fixture data by marker prefixes in organization name, user email, role name, contact name, item SKU, account name/code, warehouse code, references, descriptions, notes, filenames, and document numbers.
- The first cleanup capability should be a read-only cleanup inventory that counts marker-bearing records by table and state.
- Cleanup must distinguish draft, posted/finalized, voided, reversed, archived, generated-document, attachment, audit, and fiscal-period records.
- Posted/finalized accounting and inventory records must not be raw-deleted casually. Prefer normal reversal, void, archive, or terminal-state evidence where the app supports it.
- Audit logs should be retained as expected evidence for approved login/mutation runs; do not delete audit logs by default.
- Generated documents, attachments, report exports, PDFs, and CSV bodies must not be downloaded or logged during cleanup planning.
- Broad reset/delete/truncate/purge remains forbidden by default because it can hide ledger, inventory, bank reconciliation, audit, and output side effects.

## 11. Login And Audit Strategy

- Login may be allowed only in a later approved local-disposable mutation QA prompt.
- The fixture user should be the only actor used for DEV-04/DEV-03 mutation QA.
- Login audit writes should become expected evidence, not accidental noise, once approved.
- Evidence may record that an auth/audit event exists, with action/entity/id/timestamp when safe; it must not record tokens, cookies, authorization headers, password values, request bodies, response bodies, or DB URLs.
- If a service-context runner can create business records without login, it still needs an explicit fixture actor id so audit logs remain attributable and tenant-scoped.

## 12. Verification Strategy

Current non-mutating gates that can support fixture work:

- `corepack pnpm verify:diff` for docs-only planning and staged diff checks.
- `corepack pnpm verify:local:api -- <target>` for future API fixture-runner tests after script implementation.
- `corepack pnpm verify:local:web -- <target>` only if future UI helper changes are made.
- `corepack pnpm verify:repo` only when broader non-mutating checks are explicitly reasonable for the change.

Manual/local-approved only:

- Login or token generation.
- Fixture creation.
- Any state-machine mutation.
- Smoke or E2E.
- Report/export/download/PDF/generated-document archive checks.
- ZATCA, email, backup/restore, storage mutation, provider setting, deployment, migration, seed/reset/delete, or production/beta/customer-data checks.

## 13. Proposed DEV-04 Execution Batches

1. `DEV-04 Part 2: fixture script design`: specify runner contract, target guards, marker validation, dry-run output, write approval flags, and cleanup inventory contract.
2. `DEV-04 Part 3: implement fixture runner dry-run skeleton`: implement the runner in no-write mode with tests for command planning, forbidden targets, marker rules, blocked execute/login behavior, and redacted evidence.
3. `DEV-04 Part 4: guard tests and package scripts`: harden target guards, marker-family matching, redaction, cleanup-plan output, and safe package script wiring.
4. `DEV-04 Part 5: approved local fixture creation run`: after explicit approval, run local-only fixture creation against a disposable database and record created/reused counts.
5. Later approved batches: AR mutation QA first, then AP, Banking/Reconciliation, Inventory, Journals/Reports/Documents output gate QA, then final regression/verification.

## 14. Risks And Blockers

- Current login writes audit logs, so login cannot be treated as a harmless setup step.
- Existing E2E global setup can seed demo workflows locally, which is too broad for default DEV-04 fixture support.
- Direct Prisma writes can bypass service validations, balance updates, journal creation, no-negative-stock checks, and audit logs.
- Service-layer execution may require careful user/org context to avoid bypassing permission, audit, and tenant boundaries.
- Cleanup is more complex than creation because posted, reversed, voided, archived, generated-document, and audit states should not be raw-deleted by default.
- Fiscal period lock behavior can be irreversible in normal workflows; locked-period fixtures need extra approval.
- Output-producing workflows can persist generated-document rows and expose document bodies, so they need a separate output gate.
- The current development plan still names DEV-04 as auth/session hardening in older backlog wording; this thread uses DEV-04 for local disposable fixture planning as the active next step after DEV-03.

## 15. Open Questions

- Should fixture bootstrap use direct Prisma only for org/user/role/membership, or should all records go through service-layer APIs after an approved fixture login?
- Should DEV-04 introduce a fixture run id format such as `YYYYMMDD-HHMMSS` or require user-provided run ids?
- Should cleanup inventory be implemented before any write path, or alongside the first dry-run runner?
- Which permission set should the first fixture user receive: Owner-equivalent, area-specific admin roles, or both owner and restricted-role fixtures?
- Should audit logs for fixture setup be explicitly created for direct Prisma bootstrap, or should bootstrap remain audit-neutral until service-layer mutation starts?
- How should fiscal period locked fixtures be retained when lock cannot be reversed?
- Should generated-document/archive output gates use separate `DEV03-JRD-` fixture orgs to keep document payload risk away from ledger mutation QA?

## 16. Recommended Next Step

Proceed with `DEV-04 Part 3: implement fixture runner dry-run skeleton`. The next part should implement only non-mutating runner scaffolding, guard tests, marker validation, redacted summaries, blocked execute/login behavior, and dry-run family plans before any fixture creation or mutation is approved.
