# Remaining Roadmap

Audit date: 2026-05-14

## Phase 1: Stabilize Current MVP

Objective: make the current AR/AP MVP reliable enough for structured user QA.

Tasks:

- Run guided QA through every implemented frontend route.
- Fix UX inconsistencies, especially supplier AP balance labels.
- Add browser E2E tests for sales invoice, customer payment, credit note, customer refund, purchase order, purchase bill, supplier payment, document archive, and ZATCA settings flows.
- Connect email-backed invites, password reset/onboarding, and audit visibility for role/member administration.
- Harden fiscal period UX with period templates, optional reversal-date selection, and admin unlock approval design.
- Add accountant review pass for report layouts and exported report formats.
- Move Prisma seed config to `prisma.config.ts` before Prisma 7.

Manual dependencies:

- Accountant review of chart of accounts and posting rules.
- Product review of current UX flows.

Risk level: Medium.

Recommended next prompt:

> Add email-backed invite delivery and invited-user onboarding/password reset for the existing team management UI.

## Phase 2: Finish Wafeq Core Accounting Modules

Objective: complete core accounting modules expected in a serious SME accounting SaaS.

Tasks:

- Supplier debit notes hardening and UI polish.
- Purchase receiving QA, partial bill matching, and purchase matching hardening.
- Expense receipt attachments and cash expense import/OCR groundwork.
- Bank account profile, transfer, opening-balance, statement import preview, and reconciliation UX polish.
- Bank statement file-format samples, upload storage design, and approval queue polish.
- Transfer fees and multi-currency FX transfer handling.
- Inventory adjustment/transfer UX polish and approval queue hardening.
- Official VAT return report.
- Scheduled/email report delivery.
- Customer and supplier statement PDF parity.

Manual dependencies:

- Accountant validation of report formats and VAT return requirements.
- Bank statement file format samples.

Risk level: High.

Recommended next prompt:

> Add bank statement file upload storage and OFX/CAMT/MT940 parser groundwork without live bank feeds or automatic matching.

## Phase 3: Inventory And Payroll Basics

Objective: add operational modules that affect accounting but require careful scope control.

Tasks:

- Purchase receiving and sales stock issue UX polish, delivery document groundwork, and operational status hardening.
- Inventory adjustment approval inbox, attachments, and reason-code catalog.
- Warehouse in-transit transfer, shipping document, and bin/location support.
- Accountant review of the current moving-average operational valuation estimate and FIFO placeholder policy.
- Review inventory accounting settings, purchase receipt clearing previews/posting, purchase bill direct-vs-clearing finalization behavior, bill/receipt matching visibility, manual sales issue COGS posting, and clearing account balances with an accountant.
- Use `docs/inventory/PURCHASE_RECEIPT_POSTING_READINESS_AUDIT.md` as the go/no-go gate before automatic receipt GL posting or direct-mode migration.
- Harden manual COGS and receipt asset review/audit UX after first QA pass.
- Accountant review of inventory clearing reconciliation/variance reports, followed by variance posting policy and historical direct-mode exclusion/migration planning.
- Accounting-grade inventory valuation reports after GL posting design.
- Employee master data.
- Payroll shell with draft runs, pay items, and accounting posting plan.

Manual dependencies:

- Inventory valuation accounting policy, inventory clearing account treatment, bill/receipt matching/variance policy, receipt asset posting review policy, and COGS cost-flow approval.
- Payroll jurisdiction requirements.
- Accountant review of COGS/payroll postings.

Risk level: High.

Recommended next prompt:

> Design accountant-approved inventory variance posting and correction journals without enabling automatic variance posting.

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
- Approval workflows and dual-control policies for high-risk accounting actions.
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
