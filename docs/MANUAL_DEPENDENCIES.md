# Manual Dependencies

Audit date: 2026-05-12

These items require human action, third-party credentials, legal/accounting decisions, or production operations work.

| Dependency | Why needed | When needed | Owner | Blocking |
| --- | --- | --- | --- | --- |
| ZATCA/FATOORA sandbox access | Required to test real onboarding, CSID, compliance APIs, clearance, and reporting. | Before any real ZATCA integration. | Business/admin with Saudi tax authority access. | Blocking for production ZATCA. |
| FATOORA OTP | Required for real compliance CSID onboarding. | During sandbox onboarding implementation. | Authorized FATOORA portal user. | Blocking for real CSID. |
| Official API endpoint verification | Prevents hardcoding guessed URLs or stale docs. | Before enabling `ZATCA_ENABLE_REAL_NETWORK=true`. | Engineer plus authorized ZATCA user. | Blocking for real network calls. |
| Compliance CSID issuance | Required for compliance checks. | After CSR and OTP verification. | Engineer with sandbox credentials. | Blocking for compliance testing. |
| Production CSID issuance | Required for production submission. | After sandbox compliance success. | Authorized business/admin plus engineer. | Blocking for production. |
| Secure key storage/KMS decision | Real private keys must not live in normal DB fields. | Before real certificate/private-key handling. | Engineering/security owner. | Blocking for production ZATCA. |
| Official SDK/Java runtime decision | SDK validation needs supported Java and reliable invocation. | Before SDK-backed validation/signing tests. | Engineering. | Blocking for official validation automation. |
| Accountant review of COA/VAT workflows | Confirms account codes, VAT receivable/payable, refunds, credit notes, AP/AR behavior. | Before real customer use. | Accountant/domain expert. | Blocking for production accounting confidence. |
| Company legal/tax details | Needed for document templates, ZATCA profile, invoice fields, legal documents. | Before live tenant setup. | Business owner. | Blocking for production tenant. |
| UI branding | Needed for production document templates and app identity. | Before public launch. | Product/business owner. | Non-blocking for technical MVP. |
| Vercel deployment account | Needed to host the `apps/api` API project and `apps/web` frontend project. | Before staging/production deployment. | Engineering/business admin. | Blocking for production deployment. |
| Supabase Postgres project | Persistent production data store for Prisma, including pooled runtime and direct migration connection strings. | Before staging/production. | Engineering/platform owner. | Blocking. |
| S3-compatible storage bucket | Generated document archive should move out of DB base64. | Before production scale. | Engineering/platform owner. | Blocking for scalable document archive. |
| Redis/queue service | Needed if async jobs, PDF generation queues, email sending, or workers are added. | Before background job rollout. | Engineering/platform owner. | Non-blocking for current sync MVP. |
| Email provider credentials | Needed to send invoices, receipts, statements, invites, password reset. | Before communication workflows. | Business/admin plus engineering. | Blocking for email features. |
| WhatsApp provider credentials | Needed for WhatsApp invoice/statement sending. | If WhatsApp becomes product requirement. | Business/admin plus engineering. | Non-blocking unless required. |
| Payment/subscription provider credentials | Needed for SaaS billing and plan enforcement. | Before paid SaaS launch. | Business/admin plus engineering. | Blocking for subscription billing. |
| Domain/DNS | Needed for production URLs, email domain verification, SSL. | Before public launch. | Business/admin or platform owner. | Blocking for launch. |
| SSL/TLS certificates | Required for secure production access. | Before public launch. | Platform provider/engineering. | Blocking for launch. |
| Backup and restore policy | Required to protect accounting data. | Before production. | Engineering/platform owner. | Blocking for production. |
| Security review | Needed for auth, tenancy, secrets, role enforcement, logging, and rate limits. | Before production beta. | Security/engineering. | Blocking for production beta. |
| Bank statement samples | Needed for reconciliation import formats. | Before bank reconciliation module. | Business/accounting user. | Blocking for bank import. |
| Inventory valuation policy | Needed before COGS/stock valuation. | Before inventory module. | Accountant/business owner. | Blocking for inventory accounting. |
| Payroll jurisdiction rules | Needed before payroll implementation. | Before payroll module. | Accountant/legal/HR owner. | Blocking for payroll. |
