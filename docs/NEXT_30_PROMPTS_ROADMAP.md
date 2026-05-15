# Next 30 Codex Prompts Roadmap

Audit date: 2026-05-15

Latest commit audited: `6100714` (`Add dashboard KPI overview`)

Each prompt is intentionally scoped so it can be executed as a safe Codex implementation/audit task. Prompts that need credentials say so explicitly.

## Phase 1: Stabilization And UX Polish

### 1. Run a full route QA polish pass

- Objective: Inspect every implemented route for loading, empty, error, and permission states; fix only real UI defects.
- Why it matters: The app is wide enough that route-level polish matters before beta.
- Dependencies: Browser E2E suite and seeded data.
- Risk level: Medium.
- Manual credentials needed: No.

### 2. Add dashboard customization and accountant-reviewed KPI definitions

- Objective: Review dashboard KPI definitions with an accountant/product owner, then add saved widget preferences only after definitions are approved.
- Why it matters: The dashboard now has charts and drill-downs, but production reliance needs reviewed definitions and configurable presentation.
- Dependencies: Existing `/dashboard/summary`, report routes, accountant/product input.
- Risk level: Medium.
- Manual credentials needed: Accountant/product input.

### 3. Expand browser E2E for critical create/detail flows

- Objective: Add smoke-level UI create/detail assertions for invoice, bill, payment, receipt, and dashboard routes.
- Why it matters: API smoke is deep, but UI regressions need earlier detection.
- Dependencies: Existing Playwright helpers.
- Risk level: Medium.
- Manual credentials needed: No.

### 4. Polish audit log export and retention UX

- Objective: Add better filter summaries, CSV export status, retention warnings, and dry-run explanations.
- Why it matters: Audit tools are admin-critical and must be clear.
- Dependencies: Existing audit APIs/UI.
- Risk level: Low.
- Manual credentials needed: No.

### 5. Add global empty/error state components

- Objective: Standardize empty, loading, error, and retry panels across major pages.
- Why it matters: UX trust improves without changing accounting behavior.
- Dependencies: Existing frontend components.
- Risk level: Low.
- Manual credentials needed: No.

### 6. Fix supplier AP balance wording and ledger labels

- Objective: Replace generic Dr/Cr display where supplier payable wording is clearer.
- Why it matters: Avoids accountant confusion in AP views.
- Dependencies: Supplier ledger UI helpers.
- Risk level: Low.
- Manual credentials needed: No.

## Phase 2: Production Foundations

### 7. Validate S3-compatible attachment storage adapter

- Objective: Exercise the feature-flagged S3-compatible attachment adapter against a real non-production bucket and document provider-specific caveats.
- Why it matters: Unit-mocked S3 behavior is not enough for production confidence.
- Dependencies: S3 attachment adapter and storage readiness groundwork.
- Risk level: High.
- Manual credentials needed: Optional test bucket credentials for live verification.

### 8. Add attachment/generated document migration executor

- Objective: Add resumable migration planning/execution from DB storage to object storage with rollback notes.
- Why it matters: Existing DB-stored files need a safe migration path.
- Dependencies: Validated S3-compatible adapter.
- Risk level: High.
- Manual credentials needed: Optional test bucket credentials.

### 9. Validate SMTP provider with non-production relay

- Objective: Exercise the opt-in SMTP adapter against Mailtrap/Resend SMTP or another non-production relay and document provider caveats.
- Why it matters: The adapter exists, but production use needs credential/domain validation outside smoke tests.
- Dependencies: SMTP provider adapter and email readiness/test-send UI.
- Risk level: Medium.
- Manual credentials needed: Provider sandbox SMTP credentials.

### 10. Add email provider webhooks and retry queue groundwork

- Objective: Track delivery, bounce, failure, and retry states without blocking requests.
- Why it matters: Production email needs observability and retries.
- Dependencies: SMTP validation and queue decision.
- Risk level: Medium.
- Manual credentials needed: Provider test credentials.

### 11. Add background job queue foundation

- Objective: Wire Redis/BullMQ or equivalent for email, exports, cleanup, and scheduled report jobs.
- Why it matters: Long-running tasks should not run in request paths.
- Dependencies: Existing Redis-ready infra.
- Risk level: High.
- Manual credentials needed: No for local; managed Redis later.

### 12. Add backup and restore runbooks

- Objective: Document and script non-production backup/restore drills for Supabase/Postgres and stored files.
- Why it matters: Production trust depends on restore, not just backup.
- Dependencies: Deployment docs and storage plan.
- Risk level: Medium.
- Manual credentials needed: Supabase/project access for live drill.

### 13. Harden CI pipelines for typecheck/test/build/smoke

- Objective: Add CI gates for typecheck, unit tests, build, API smoke where safe, and deployed E2E.
- Why it matters: Regression control is now essential.
- Dependencies: Existing scripts and workflow.
- Risk level: Medium.
- Manual credentials needed: GitHub secrets for deployed E2E only.

## Phase 3: ZATCA Production Path

### 14. Add test-only official ZATCA SDK XML/hash validation

- Objective: Run official SDK validation against local XML fixtures without signing or network calls.
- Why it matters: The current XML/hash flow is local-only and unverified.
- Dependencies: Java/SDK runtime and local references.
- Risk level: High.
- Manual credentials needed: No.

### 15. Implement official XML field mapping incrementally

- Objective: Replace local XML skeleton pieces with official UBL/ZATCA structures under fixture tests.
- Why it matters: Official XML is the foundation for every ZATCA production step.
- Dependencies: SDK validation wrapper.
- Risk level: Critical.
- Manual credentials needed: No.

### 16. Add XML canonicalization and invoice hash verification

- Objective: Match official canonicalization/hash behavior against SDK output.
- Why it matters: Signing and reporting depend on correct hashes.
- Dependencies: Official XML mapping and SDK validation.
- Risk level: Critical.
- Manual credentials needed: No.

### 17. Design ZATCA signing and key custody

- Objective: Add a security design for private keys, certificates, KMS/secrets storage, rotation, and audit.
- Why it matters: Production signing cannot store real keys like dev scaffolding.
- Dependencies: Security/storage decision.
- Risk level: Critical.
- Manual credentials needed: Cloud/KMS decision later.

### 18. Implement sandbox compliance CSID onboarding

- Objective: Add real sandbox-only CSID request flow behind explicit flags and OTP input.
- Why it matters: CSID is required before compliance invoice testing.
- Dependencies: Official XML/hash/signing groundwork.
- Risk level: Critical.
- Manual credentials needed: FATOORA sandbox access and OTP.

### 19. Implement clearance/reporting sandbox flows

- Objective: Add standard invoice clearance and simplified invoice reporting in sandbox-only mode.
- Why it matters: Real submission behavior is the legal-compliance path.
- Dependencies: CSID, signing, official XML.
- Risk level: Critical.
- Manual credentials needed: FATOORA sandbox credentials.

### 20. Add PDF/A-3 invoice archive groundwork

- Objective: Embed signed XML in PDF/A-3-compatible archives after official XML/signing exists.
- Why it matters: Production e-invoice archive requirements may require embedded XML.
- Dependencies: Official signed XML.
- Risk level: High.
- Manual credentials needed: No.

## Phase 4: Advanced Accounting

### 21. Design landed cost without posting automation

- Objective: Add landed-cost allocation design, settings, previews, and docs without creating journals automatically.
- Why it matters: Inventory valuation cannot mature without freight/duty allocation policy.
- Dependencies: Current inventory clearing and receipt asset flows.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 22. Add FIFO cost-layer groundwork

- Objective: Add FIFO layer model/design and valuation preview while keeping moving average active.
- Why it matters: FIFO is currently placeholder-only.
- Dependencies: Inventory valuation policy.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 23. Add inventory returns design

- Objective: Design sales returns and supplier returns interaction with stock, COGS, receipt asset postings, and variances.
- Why it matters: Returns are a core inventory/accounting gap.
- Dependencies: COGS and receipt asset posting rules.
- Risk level: High.
- Manual credentials needed: Accountant review.

### 24. Add recurring invoices

- Objective: Add recurring invoice templates, schedule preview, and explicit generation controls.
- Why it matters: Common SME subscription/service workflow.
- Dependencies: Existing invoice flow.
- Risk level: Medium.
- Manual credentials needed: No.

### 25. Add quotes/proformas

- Objective: Add non-posting sales quote/proforma workflow and conversion to invoice.
- Why it matters: Needed for sales pipeline before invoicing.
- Dependencies: Sales invoice form.
- Risk level: Medium.
- Manual credentials needed: No.

### 26. Add delivery notes

- Objective: Add non-accounting delivery note groundwork tied to sales invoices and stock issues.
- Why it matters: Operational sales fulfillment is missing.
- Dependencies: Sales stock issue flow.
- Risk level: Medium.
- Manual credentials needed: No.

### 27. Add fixed assets shell

- Objective: Add asset register design, acquisition links, depreciation preview, and docs without automatic posting initially.
- Why it matters: Fixed assets are a common accounting module.
- Dependencies: Chart of accounts and purchase bills.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 28. Add payroll shell

- Objective: Add employee master data and payroll run design without payroll posting or statutory filing.
- Why it matters: Payroll is important but jurisdiction-sensitive.
- Dependencies: HR/payroll jurisdiction requirements.
- Risk level: High.
- Manual credentials needed: Payroll policy input.

## Phase 5: SaaS Business Layer

### 29. Add subscription plans and tenant limits groundwork

- Objective: Add plan model, feature limits, usage counters, and admin visibility without billing collection.
- Why it matters: SaaS needs product packaging before paid rollout.
- Dependencies: Product/pricing decisions.
- Risk level: Medium.
- Manual credentials needed: No.

### 30. Add Stripe billing integration plan and test-mode checkout

- Objective: Add test-mode billing for plans/subscriptions with webhook safety and no production charges.
- Why it matters: Converts product into an actual SaaS business.
- Dependencies: Plan/tenant limit model.
- Risk level: High.
- Manual credentials needed: Stripe test keys and webhook secret.
