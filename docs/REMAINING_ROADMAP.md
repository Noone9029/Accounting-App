# Remaining Roadmap

Audit date: 2026-05-12

## Phase 1: Stabilize Current MVP

Objective: make the current AR/AP MVP reliable enough for structured user QA.

Tasks:

- Run guided QA through every implemented frontend route.
- Fix UX inconsistencies, especially supplier AP balance labels.
- Add browser E2E tests for sales invoice, customer payment, credit note, customer refund, purchase bill, supplier payment, document archive, and ZATCA settings flows.
- Enforce role/permission checks in API guards and UI navigation.
- Add fiscal period API/UI and posting date guards.
- Add report skeleton routes and API contracts.
- Move Prisma seed config to `prisma.config.ts` before Prisma 7.

Manual dependencies:

- Accountant review of chart of accounts and posting rules.
- Product review of current UX flows.

Risk level: Medium.

Recommended next prompt:

> Audit and harden current AR/AP MVP browser flows, including role permission enforcement plan and Playwright smoke coverage.

## Phase 2: Finish Wafeq Core Accounting Modules

Objective: complete core accounting modules expected in a serious SME accounting SaaS.

Tasks:

- Supplier debit notes.
- Purchase orders and bill matching.
- Cash expenses and expense receipts.
- Bank accounts and cash/bank account management.
- Bank statement import and reconciliation.
- General ledger report.
- Trial balance.
- Profit and loss.
- Balance sheet.
- VAT return report.
- AR aging and AP aging.
- Customer and supplier statement PDF parity.

Manual dependencies:

- Accountant validation of report formats and VAT return requirements.
- Bank statement file format samples.

Risk level: High.

Recommended next prompt:

> Implement supplier debit notes MVP with AP reversal posting, allocation behavior, supplier ledger rows, PDFs, tests, and smoke coverage.

## Phase 3: Inventory And Payroll Basics

Objective: add operational modules that affect accounting but require careful scope control.

Tasks:

- Warehouses.
- Stock movements.
- Purchase receiving and sales issue hooks.
- Inventory adjustments.
- Inventory valuation method decision.
- COGS posting.
- Stock ledger and inventory valuation report.
- Employee master data.
- Payroll shell with draft runs, pay items, and accounting posting plan.

Manual dependencies:

- Inventory valuation policy.
- Payroll jurisdiction requirements.
- Accountant review of COGS/payroll postings.

Risk level: High.

Recommended next prompt:

> Design inventory schema and accounting posting plan for warehouses, stock movements, adjustments, and COGS without implementing payroll yet.

## Phase 4: ZATCA Production Path

Objective: move from local-only ZATCA groundwork to official validated Phase 2 implementation.

Tasks:

- Verify official XML requirements against local `reference/` docs and SDK samples.
- Create SDK-backed XML/hash validation tests.
- Implement official XML mapping for standard and simplified tax invoices.
- Implement signing and canonicalization through SDK-verified tests.
- Implement compliance CSID onboarding with real FATOORA sandbox OTP.
- Implement compliance invoice API tests.
- Implement production CSID request after sandbox success.
- Implement standard invoice clearance and simplified invoice reporting.
- Implement PDF/A-3 XML embedding.
- Move private keys and certificates to KMS/secrets manager.
- Add robust error/retry/status handling.

Manual dependencies:

- ZATCA/FATOORA sandbox access.
- FATOORA OTP.
- Official endpoint/auth verification.
- Java/SDK runtime verification.
- KMS/secrets manager selection.

Risk level: Critical.

Recommended next prompt:

> Implement test-only official ZATCA SDK XML/hash validation for generated local XML fixtures without signing or real API calls.

## Phase 5: Production/SaaS Readiness

Objective: harden LedgerByte for real users, operations, billing, and scale.

Tasks:

- Production deployment target and infrastructure-as-code.
- Managed Postgres, backups, restore drills, and monitoring.
- Object storage for generated documents.
- Email provider and transactional templates.
- WhatsApp provider integration if product requires it.
- Subscription billing and plan enforcement.
- Domain, DNS, SSL, and environment management.
- Security hardening: rate limits, CORS, password policy, audit coverage, secrets rotation.
- Observability: logs, metrics, tracing, alerts.
- Multi-language polish, Arabic/English layout review, and regional formatting.
- Data import/export and admin support tooling.

Manual dependencies:

- Cloud provider account.
- Domain/DNS access.
- Email/WhatsApp/payment provider credentials.
- Legal/tax company details.
- Security review.

Risk level: High.

Recommended next prompt:

> Create a production readiness plan for LedgerByte covering deployment, storage, backups, monitoring, secrets, email, billing, and security controls.
