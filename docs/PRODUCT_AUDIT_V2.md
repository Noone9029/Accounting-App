# LedgerByte Product Audit v2

Audit date: 2026-05-15

Latest commit audited: `6100714` (`Add dashboard KPI overview`)

## Executive Summary

LedgerByte is now a broad accounting SaaS MVP with working local workflows for core AR/AP, banking, reports, documents, inventory controls, manual inventory accounting postings, audit visibility, team/security administration, mock email onboarding, browser smoke coverage, deployment runbooks, and a useful business dashboard.

The product is credible as a local demo and internal accountant-review sandbox. It is not yet production SaaS, and it is not Saudi/ZATCA production-ready. The most important remaining gap is not one missing screen; it is production hardening: real email, real object storage, backups, monitoring, security controls, formal approval workflows, official tax/compliance validation, and operations.

## Maturity Estimate

| Readiness area | Estimate | Verdict |
| --- | ---: | --- |
| Local demo MVP | 88% | Strong enough for guided demos and internal workflow review. |
| Private beta | 62% | Possible only with carefully selected testers, clear limitations, non-production data, and hands-on support. |
| Production SaaS | 38% | Blocked by operations, storage, email, billing, security hardening, backups, monitoring, and legal/compliance review. |
| Saudi/ZATCA production readiness | 18% | ZATCA remains local/mock/scaffold; official XML/signing/CSID/clearance/reporting/PDF-A3 are not implemented. |
| Xero/Wafeq competitor readiness | 45% | Breadth is now meaningful, but production trust, compliance depth, integrations, onboarding, and polish are still behind mature products. |

## Completed Modules

- Auth foundation: register, login, JWT, `/auth/me`, organization membership context.
- Team and role management: role permissions, member invite/status/role changes, permission-aware frontend.
- Dashboard: read-only business overview with KPIs, lightweight trend/aging charts, permission-aware drill-down links, attention items, and quick actions.
- Core accounting: chart of accounts, manual journals, posting/reversal, fiscal-period guard.
- Sales/AR: invoices, payments, unapplied payment application, credit notes, refunds, customer ledgers/statements, PDFs.
- Purchases/AP: purchase orders, bills, supplier payments, debit notes, refunds, cash expenses, supplier ledgers/statements, PDFs.
- Banking: bank account profiles, bank transfers, opening balances, statement import preview/import, matching, categorization, reconciliation lifecycle, reconciliation reports.
- Reports: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, CSV/PDF exports.
- Inventory operations: warehouses, stock movements, adjustments, transfers, purchase receipts, sales stock issues, balances, valuation/movement/low-stock reports.
- Inventory accounting manual flows: manual COGS posting/reversal, inventory-clearing bill finalization, compatible receipt asset posting/reversal, clearing reconciliation/variance reports, variance proposal workflow.
- Documents: generated document archive and uploaded attachment groundwork with linked panels.
- Audit: standardized high-risk event names, metadata redaction, audit UI, CSV export, retention settings, dry-run preview.
- Numbering: number sequence settings UI/API with safe future-only changes.
- Email groundwork: mock/local outbox, invites, invite acceptance, password reset, provider readiness, DB-backed rate limits.
- Storage groundwork: database storage default, feature-flagged S3-compatible storage for new uploaded attachments, migration-plan dry run, storage settings UI.
- QA: backend/frontend/ZATCA unit tests, deep API smoke script, Playwright browser E2E smoke suite, deployed E2E GitHub Actions workflow.
- Deployment documentation: Vercel/Supabase setup, API root/health/readiness docs, CI database readiness, Supabase security review, deployed E2E runbook.

## Partial Modules

- Dashboard analytics: useful read-only snapshot with lightweight charts and drill-down links, but no customization, saved widgets, advanced charting, or accountant-approved KPI definitions.
- Banking: strong manual reconciliation, but no OFX/CAMT/MT940 parser, live feeds, auto-match, payment gateway, transfer fees, or FX handling.
- Inventory accounting: safe manual posting exists, but no automatic posting, no landed cost, no FIFO cost layers, no serial/batch tracking, no inventory returns workflow, and no historical direct-mode migration.
- Reports: broad operational reports exist, but official VAT return, filing exports, scheduled delivery, report pack controls, and accountant sign-off remain.
- Attachments/storage: upload/download/soft-delete works, new uploaded attachments can use S3-compatible storage when explicitly configured, but database/base64 remains the default and there is no migration executor, generated-document S3 path, scanning, OCR, or retention policy.
- Email: mock/local flow works with rate limits, but no real provider delivery, retries, bounces, domain authentication, MFA, or session invalidation.
- ZATCA: extensive local groundwork and docs exist, but official production path is not implemented.
- Browser QA: route smoke exists and deployed E2E has run, but no visual regression, no full accounting assertions in browser, and no scheduled CI.

## Not Started

- Real ZATCA signing, official XML validation, CSID onboarding, clearance, reporting, and PDF/A-3.
- Real-bucket S3 validation, generated-document object storage, and database-to-S3 migration executor.
- Real email provider delivery, bounce/retry worker, provider webhooks, and domain authentication.
- Subscription billing, plans, tenant limits, and customer billing.
- MFA, refresh-token rotation, advanced session invalidation, anomaly alerts.
- Live bank feeds, payment gateway integration, bank auto-matching.
- Recurring invoices, quotes/proformas, delivery notes, fixed assets, payroll, project/job costing.
- Background job queue workers for email, exports, cleanup, and scheduled reports.
- Production observability, backups, restore drills, incident runbooks, uptime/error alerting.

## Production Blockers

1. No production email provider or deliverability setup.
2. Uploaded/generated documents still default to database/base64 storage unless the attachment S3 provider is explicitly configured.
3. No production backup/restore and monitoring runbooks proven against hosted infrastructure.
4. No subscription billing, tenant limits, or SaaS account lifecycle.
5. No MFA, advanced session controls, or formal security review.
6. No immutable external audit store, scheduled audit export, tamper-evident chain, or alerting.
7. No broad maker-checker approval workflow for high-risk accounting changes.
8. No official VAT return filing workflow.
9. No production-grade bank file parser or live bank integration.
10. Supabase RLS remains disabled in the documented test posture; tenant isolation is currently API-layer enforced.

## Compliance Blockers

- ZATCA official XML mapping is incomplete.
- ZATCA invoice hash/canonicalization is local-only and not SDK-verified.
- ZATCA signing and certificate/key custody are not implemented.
- Compliance CSID and production CSID onboarding are not implemented.
- Clearance/reporting endpoints are intentionally blocked for real network behavior.
- PDF/A-3 invoice archive is not implemented.
- VAT Summary is not an official VAT filing export.
- Audit logs are useful but not immutable or tamper-evident.

## Security Blockers

- No MFA.
- No refresh-token rotation or advanced session invalidation.
- No production email provider security controls or domain authentication.
- No virus scanning for uploaded attachments.
- No signed URL policy, generated-document object-storage path, or object lifecycle/retention enforcement.
- No external immutable audit retention.
- No anomaly detection or admin alerting for sensitive changes.
- No production secrets/key custody design for ZATCA private keys.
- Deployment security review still needs RLS/private networking/least-privilege decisions.

## UX Blockers

- Dashboard has lightweight drill-downs and trend context, but still needs advanced charting, saved preferences, and accountant-approved KPI definitions.
- Many list pages need filters, saved views, bulk actions, and clearer empty states.
- Supplier AP balance wording should be accountant-reviewed.
- Error recovery and validation messages need a product-wide pass.
- No onboarding wizard or setup checklist for new organizations.
- No guided approval inbox for reconciliations, inventory variances, or high-risk actions.
- Attachment upload is functional but not polished for drag/drop, previews, or OCR.

## Accounting-Review Blockers

- Chart of accounts template needs accountant sign-off.
- Report definitions and layouts need accountant sign-off.
- Dashboard KPI definitions need accountant/product sign-off.
- VAT return design needs tax advisor review.
- Fiscal year close and retained earnings workflow is missing.
- Inventory valuation policy needs sign-off before FIFO/landed cost/automatic posting.
- Inventory variance proposal debit/credit policy needs accountant review.
- Direct-mode historical purchase bill policy needs review before any migration or automatic receipt posting.
- Approval thresholds and maker-checker rules are not defined.

## Go/No-Go

| Target | Recommendation |
| --- | --- |
| Local guided demo | GO |
| Internal accountant review | GO |
| Private beta with non-production data | CONDITIONAL GO |
| Paid production SaaS | NO-GO |
| Saudi/ZATCA compliant invoicing | NO-GO |
| Inventory accounting automation | NO-GO until landed cost/FIFO/direct-mode policy is approved |

## Recommended Next Development Focus

1. Stabilize current UX: dashboard chart polish, error/empty states, route QA, and browser smoke expansion.
2. Turn production groundwork into real infrastructure: S3 migration/generated-document storage, email provider, backup/restore, monitoring, and CI gates.
3. Advance ZATCA through official SDK validation before signing or network calls.
4. Add accountant-reviewed advanced accounting only after current report/dashboard/inventory policies are signed off.
5. Add SaaS business layer after operational foundations are reliable.
