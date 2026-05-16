# Remaining Roadmap

Audit date: 2026-05-15

For the updated Product Audit v2 planning artifacts, see:

- `docs/PRODUCT_AUDIT_V2.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/NEXT_30_PROMPTS_ROADMAP.md`

## Phase 1: Stabilize Current MVP

Objective: make the current AR/AP MVP reliable enough for structured user QA.

Tasks:

- Run guided QA through every implemented frontend route.
- Review dashboard KPI definitions, chart thresholds, attention item thresholds, and quick-action placement with an accountant/product owner.
- Fix UX inconsistencies, especially supplier AP balance labels.
- Wire the new Playwright browser E2E smoke into CI and expand it where user-facing regressions are found.
- Validate the opt-in SMTP provider with a non-production relay, then add domain authentication checks, provider webhooks, retry queue, and audit alerting for role/member administration.
- Harden fiscal period UX with period templates, optional reversal-date selection, and admin unlock approval design.
- Harden number sequence administration with reviewed reset/skip workflow, collision preview, and branch/device numbering policy before production.
- Add accountant review pass for report layouts and exported report formats.
- Add customizable dashboard widgets and saved preferences after KPI definitions are approved.
- Move Prisma seed config to `prisma.config.ts` before Prisma 7.

Manual dependencies:

- Accountant review of chart of accounts and posting rules.
- Product review of current UX flows.

Risk level: Medium.

Recommended next prompt:

> Run a full route QA polish pass across implemented LedgerByte screens, fixing only real loading, empty, error, permission, and responsive UI defects without changing accounting behavior.

## Phase 2: Finish Wafeq Core Accounting Modules

Objective: complete core accounting modules expected in a serious SME accounting SaaS.

Tasks:

- Supplier debit notes hardening and UI polish.
- Purchase receiving QA, partial bill matching, and purchase matching hardening.
- Cash expense import/OCR groundwork and production hardening for uploaded receipt attachments after the S3 adapter is validated against a real non-production bucket.
- Bank account profile, transfer, opening-balance, statement import preview, and reconciliation UX polish.
- Bank statement file-format samples, upload storage design using the storage readiness groundwork, and approval queue polish.
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
- Inventory adjustment approval inbox and reason-code catalog.
- Warehouse in-transit transfer, shipping document, and bin/location support.
- Accountant review of the current moving-average operational valuation estimate and FIFO placeholder policy.
- Review inventory accounting settings, purchase receipt clearing previews/posting, purchase bill direct-vs-clearing finalization behavior, bill/receipt matching visibility, manual sales issue COGS posting, clearing account balances, and variance proposal journals with an accountant.
- Use `docs/inventory/PURCHASE_RECEIPT_POSTING_READINESS_AUDIT.md` as the go/no-go gate before automatic receipt GL posting or direct-mode migration.
- Harden manual COGS and receipt asset review/audit UX after first QA pass.
- Inventory accounting integrity audit is complete for the current manual posting chain, and accountant-reviewed variance proposals now exist. Next inventory accounting work should harden review outputs and define landed-cost, historical direct-mode migration/exclusion, and FIFO cost-layer policy before any automatic posting.
- Accounting-grade inventory valuation reports after GL posting design.
- Employee master data.
- Payroll shell with draft runs, pay items, and accounting posting plan.

Manual dependencies:

- Inventory valuation accounting policy, inventory clearing account treatment, bill/receipt matching/variance policy, receipt asset and variance proposal review policy, and COGS cost-flow approval.
- Payroll jurisdiction requirements.
- Accountant review of COGS/payroll postings.

Risk level: High.

Recommended next prompt:

> Review inventory variance proposal outputs with an accountant and design landed-cost/direct-mode migration policy without enabling automatic posting.

## Phase 4: ZATCA Production Path

Objective: move from local-only ZATCA groundwork to official validated Phase 2 implementation.

Tasks:

- Verify official XML requirements against local `reference/` docs and SDK samples.
- Keep Java 11-14 configured for repeatable local/CI SDK validation; official sample fixtures now pass under Java 11.
- Complete the remaining official XML gaps: standard supply/delivery date, broader invoice scenarios, and generated invoice validation.
- Add SDK-backed canonical hash/PIH comparison tests after the current structural fixtures pass.
- Implement signing and Phase 2 QR only after canonicalization and key custody are designed.
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
- Repeatable Java 11-14 runtime verification for local and CI environments.
- KMS/secrets manager selection.

Risk level: Critical.

Recommended next prompt:

> Add ZATCA supply-date mapping and SDK-verified canonical PIH/hash validation for LedgerByte XML without signing or real API calls.

## Phase 5: Production/SaaS Readiness

Objective: harden LedgerByte for real users, operations, billing, and scale.

Tasks:

- Production deployment target and infrastructure-as-code.
- Managed Postgres, backups, restore drills, and monitoring.
- Validate the uploaded-attachment S3 adapter with a real non-production bucket, then implement generated-document object storage and a resumable DB-to-S3 migration executor.
- Email provider validation, background queue/retries, provider webhooks, and transactional template polish.
- WhatsApp provider integration if product requires it.
- Subscription billing and plan enforcement.
- Domain, DNS, SSL, and environment management.
- Security hardening: CORS, password policy, scheduled audit export/alerting plus immutable storage, secrets rotation, MFA, and session invalidation.
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
