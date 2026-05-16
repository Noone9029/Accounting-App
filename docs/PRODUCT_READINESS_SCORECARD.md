# LedgerByte Product Readiness Scorecard

Audit date: 2026-05-16

Latest commit audited: `35a5358` (`Fix ZATCA XML structure against SDK gaps`) plus the current ZATCA supply-date and PIH/hash groundwork pass.

Scoring uses a 0-100 practical readiness scale for the current codebase. A high score means the area is usable in the current MVP; it does not imply production legal/compliance readiness.

| Category | Score | Current evidence | Biggest gaps | Next priority |
| --- | ---: | --- | --- | --- |
| Core accounting | 78 | Chart of accounts, manual journals, fiscal-period guard, posting/reversal, balanced reports, smoke coverage. | Year-end close, retained earnings, approval workflow, concurrency/load testing, accountant sign-off. | Add fiscal year close and accountant-reviewed report definitions. |
| Sales/AR | 82 | Invoices, payments, unapplied payments, credit notes, refunds, customer ledgers/statements, PDFs, attachments, smoke coverage. | Recurring invoices, quotes/proformas, delivery notes, payment gateway, collection workflow. | Add recurring invoices or quote/proforma workflow after UX QA. |
| Purchases/AP | 78 | Purchase orders, bills, clearing mode, supplier payments, debit notes, refunds, cash expenses, AP ledgers/statements, PDFs. | Partial billing, multi-PO matching, remittance email, OCR/import, supplier statement PDF parity. | Harden purchase matching and supplier statement/payment UX. |
| Banking/reconciliation | 64 | Bank profiles, transfers, opening balances, statement import, matching, categorization, reconciliation approval/close/void, reports. | No live feeds, auto-match, OFX/CAMT/MT940 parser, transfer fees, FX handling, production file storage workflow. | Add bank file upload/parser groundwork and approval queue polish. |
| Reports | 74 | GL, Trial Balance, P&L, Balance Sheet, VAT Summary, AR/AP aging, CSV/PDF exports, generated archive. | Official VAT return, scheduled/email delivery, report packs, accountant layout review. | Accountant-review report definitions and add official VAT return design. |
| Inventory | 70 | Warehouses, movements, adjustments, transfers, receipts, issues, valuation reports, manual COGS, receipt asset posting, clearing reports, variance proposals. | No landed cost, FIFO, serial/batch, automatic postings, returns workflow, historical direct-mode migration. | Review variance proposal outputs and design landed-cost/direct-mode policy. |
| Documents/attachments | 62 | Generated PDFs, archive, attachment upload/list/download/soft-delete, linked panels, storage readiness/migration dry run, feature-flagged S3-compatible storage for new uploaded attachments. | DB/base64 remains default, no migration executor, no generated-document S3 path, no virus scanning, no OCR, no retention policy. | Validate S3 mode with a non-production bucket and implement migration executor. |
| Roles/permissions/security | 70 | Shared permission strings, backend guards, frontend gating, team/role UI, invite onboarding, rate limits. | No MFA, advanced sessions, dual control, security review, production identity controls. | Add MFA/session plan and maker-checker policy for high-risk actions. |
| Audit/compliance visibility | 78 | Standard events, metadata redaction, audit UI, filters, CSV export, retention settings, dry-run preview, smoke checks. | No immutable store, scheduled export, purge executor, alerting, anomaly detection, tamper evidence. | Add scheduled export/immutable storage design and sensitive-action alerts. |
| ZATCA | 32 | Profile, EGS, CSR groundwork, mock CSID, local XML/QR/hash, SDK readiness docs, disabled-by-default local SDK validation endpoints, official fixture registry/results doc, official sample validation pass under Java 11, local standard fixture SDK global pass, simplified fixture XSD/EN/PIH pass, blocked real network behavior. | Signing, Phase 2 QR, CSID, clearance, reporting, PDF/A-3, generated-invoice SDK validation, SDK hash integration, and KMS key custody remain missing. | Validate generated XML and add SDK hash comparison before signing/certificate work. |
| Email/communications | 50 | Mock email outbox default, invites, password reset, readiness API/UI, opt-in SMTP adapter, test-send, DB-backed rate limits. | No queue/retries, bounces/webhooks, domain-auth validation, polished templates, invoice/statement sending, or MFA/session invalidation. | Validate SMTP with a non-production relay and add deliverability/queue controls. |
| Storage/scalability | 45 | Storage config/readiness, feature-flagged S3-compatible attachment upload/download, migration plan counts, database default works locally. | No DB-to-S3 migration executor, signed URLs, object lifecycle, generated-document S3 path, scanning, backup policy, or real-bucket validation evidence. | Test S3 mode against a non-production bucket and build migration rollback plan. |
| Browser QA/E2E | 64 | 11 Playwright specs for critical routes, deployed E2E workflow/docs, API smoke remains deep accounting check. | No visual regression, no scheduled browser CI, browser tests are smoke-level, no data reset strategy. | Schedule non-production deployed E2E and expand broken-route coverage. |
| Deployment readiness | 46 | Vercel/Supabase docs, API health/root/readiness, deployed E2E runbook/workflow, CI DB checklist, Supabase security review. | No production IaC, backups, monitoring, RLS/private-network decision, environment promotion policy. | Add production readiness runbook and backup/restore drill plan. |
| UX/product polish | 58 | Broad route coverage, dashboard KPI cards, lightweight charts/drill-downs, settings pages, panels, helper tests, permission-aware nav. | List filters, bulk actions, customizable dashboards, onboarding wizard, empty/error states, mobile polish, visual consistency. | Run route QA and add deeper dashboard/accounting review polish. |
| Production operations | 25 | Some readiness docs and manual smoke/E2E workflows. | No incident response, observability, background jobs, data retention executors, support tools, billing, SLAs. | Define operations baseline: monitoring, alerts, backups, restore drills, runbooks. |

## Overall Readiness Interpretation

- Local MVP: strong enough to demonstrate serious accounting workflows.
- Private beta: possible only with limited users and explicit non-production limitations.
- Production: blocked by operations, security, compliance, storage, email, and SaaS-business gaps.
- Compliance: ZATCA and official tax filing remain the largest domain-specific blockers.

## Highest Leverage Improvements

1. Real-bucket object-storage validation and file migration.
2. Email queue/retry, provider webhooks, and domain-auth validation around the opt-in SMTP adapter.
3. Production backup/restore and monitoring plan.
4. Remaining LedgerByte ZATCA generated XML SDK validation, SDK hash comparison, signing/certificate, and Phase 2 QR work.
5. Dashboard/report accountant review.
6. UX route QA and E2E expansion.
7. Audit immutable export/alerting.
8. Advanced inventory policy: landed cost, FIFO, historical direct-mode handling.
