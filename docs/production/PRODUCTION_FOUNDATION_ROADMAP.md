# LedgerByte Production Foundation Roadmap

Planning date: 2026-05-22

This roadmap documents what remains to move LedgerByte from controlled beta/user-testing toward a paid Saudi-first SaaS v1. It is planning only. It does not change app code, database schema, deployment configuration, ZATCA behavior, billing, email, or infrastructure.

## Current Stage

LedgerByte is currently a serious accounting MVP and controlled-beta candidate. The current Vercel/Supabase deployment is a beta/user-testing environment only, not final production hosting. Paid production SaaS v1 is blocked until the production foundations below are implemented, tested, reviewed, and operated with real support ownership.

Do not treat the current system as:

- A production-launched SaaS.
- A production ZATCA-compliant e-invoicing system.
- A final hosting architecture.
- A replacement for accountant, tax, legal, security, or ZATCA specialist review.

## Non-Goals For This Roadmap

- No full smoke, full E2E, migrations, seed/reset/delete, backup execution, restore execution, RLS/runtime-role changes, Vercel/Supabase environment changes, real email, real ZATCA network calls, CSID execution, clearance/reporting, or PDF/A-3 work is part of this planning pass.
- No secrets, tokens, database URLs, auth headers, request/response bodies, customer/vendor data, signed XML, QR payloads, PDF bodies, or attachment bodies should be copied into roadmap evidence.

## A. Hosting And Infrastructure

### Current State

- Vercel hosts the current beta/user-testing web and API surfaces.
- Supabase Postgres backs the user-testing deployment.
- [ADR-001 final production hosting](adrs/ADR-001-final-production-hosting.md) is drafted/proposed and recommends an AWS production stack for paid SaaS v1, but implementation has not started, no provider is provisioned, and no production deploy was performed.
- [ADR-013 API hosting decision](adrs/ADR-013-api-hosting-decision.md) is drafted/proposed and recommends AWS ECS Fargate for the paid SaaS v1 API, with API and worker hosted as separate services even if they share one image. Implementation has not started: the API provider/service is not provisioned, ECS/Fargate is not configured, worker hosting is not configured, no production API deploy was performed, no env vars changed, and no database, Redis, storage, ZATCA, email, accounting logic, or customer data changed.
- The API is a NestJS app wrapped for Vercel Node serverless execution.
- Redis-ready local infrastructure exists, but production workers and queues are not wired.
- Database/base64 storage remains the default for generated documents and existing attachments; S3-compatible storage exists only as feature-flagged groundwork for new uploads.

### Paid v1 Requirements

- Reviewed, accepted, and implemented final production hosting decision that is separate from the current Vercel beta posture.
- API hosting that supports predictable NestJS runtime behavior, Prisma connection pooling, long-running worker separation, safe deploy rollback, and production logs.
- Web hosting that supports Next.js production delivery, static asset caching, observability, and environment separation from the API.
- Background worker platform for email retries, report exports, cleanup jobs, ZATCA submission/retry jobs, and future scheduled tasks.
- Production Redis/BullMQ or equivalent managed queue runtime with retry, dead-letter, lock, and visibility tooling.
- Object storage for generated documents and uploaded attachments with private buckets, signed/download policies, lifecycle controls, deletion workflow, malware scanning path, and restore evidence.
- Secrets manager or KMS-backed custody for database credentials, JWT secrets, email provider secrets, object-storage credentials, and future ZATCA keys/CSID material.
- Explicit environment separation: local, user-testing, paid private beta, production, and ZATCA sandbox/simulation/production.
- Rollback playbook covering app deploy rollback, database migration rollback decision, queue drain/pause, env rollback, and customer communication.

### Recommended Next Tasks

1. Verify and hand off the proposed ADR-013 API hosting decision; keep Vercel beta/user-testing/staging only and do not treat the ADR as API deployment or infrastructure setup.
2. Open separate implementation tickets before any ECS/Fargate configuration, API/worker provisioning, Supabase/Vercel env changes, production deploy, migrations, backups, DNS, traffic, ZATCA, email, customer data, or app-test activity.
3. Validate object-storage mode against a real non-production bucket only after explicit approval and provider setup.
4. Define deployment rollback gates before adding production traffic.

## B. Database And Security

### Current State

- Tenant isolation is enforced primarily in the Nest API through JWT auth, organization context, membership checks, and route permissions.
- User-testing Supabase `anon` and `authenticated` grants were revoked from public tables/sequences/functions, but broad RLS is still not enabled.
- A least-privilege Prisma runtime DB role is planned but not created because a safe Vercel API environment mutation path was not available.
- `DATABASE_URL` and `DIRECT_URL` separation exists conceptually; migration/direct/admin credential separation still needs final implementation and proof.
- A local non-production Postgres restore-count drill exists; hosted Supabase PITR and object-storage restore proof remain missing.

### Paid v1 Requirements

- Dedicated least-privilege runtime DB role with no superuser, createdb, createrole, replication, or bypassrls privileges.
- Separate migration/direct/admin credential that is never used by ordinary API runtime traffic.
- Clear Supabase Data API strategy: disable exposed REST/GraphQL schemas if unused, or design RLS policies compatible with LedgerByte's identity model.
- Tenant isolation verification suite that checks cross-organization denial across high-risk tables and workflows.
- Hosted backup/PITR proof for the production-intended database provider.
- Restore drill proof using non-production data and metadata-only evidence before production launch.
- Object-storage backup and restore proof for generated documents and attachments.
- Audit log retention policy, export/archival plan, immutable/tamper-evident storage decision, and purge executor approval.
- Data retention and deletion policy covering beta data, inactive tenants, legal/accounting records, uploaded files, generated PDFs, audit logs, ZATCA artifacts, and support records.

### Recommended Next Tasks

1. Establish a safe production-intended environment secret mutation path.
2. Create and validate the least-privilege runtime role in user-testing or a staging clone before production.
3. Decide Data API/RLS posture before public launch.
4. Execute hosted database restore and object-storage restore drills in non-production.

## C. Monitoring And Operations

### Current State

- API root, health, and readiness endpoints exist.
- Manual smoke and deployed E2E runbooks exist, but full smoke and full E2E remain pending.
- Email retry, monitoring evidence, and worker planning surfaces exist, but production scheduler/monitoring is not live.
- Backup/restore readiness endpoints and evidence records exist, but production operations are not yet implemented.

### Paid v1 Requirements

- Uptime checks for web, API root, API health, API readiness, login path, dashboard summary, and selected read-only authenticated flows.
- API error monitoring with request correlation, tenant-safe metadata, redaction, alert routing, and service-level thresholds.
- Background worker monitoring for queue depth, retry count, dead-letter count, stalled jobs, long-running jobs, and worker heartbeats.
- Email delivery monitoring for provider failures, bounces, complaints, suppression trends, retry throughput, and alert thresholds.
- ZATCA job monitoring once sandbox/production flows exist: CSID state, signing failures, clearance/reporting retries, rejected invoices, expired certificates, and safe escalation.
- Backup monitoring for backup success, PITR availability, object-storage replication/backup status, restore-drill cadence, RPO/RTO evidence, and failed backups.
- Incident response runbook covering severity levels, triage owner, customer communication, rollback, data integrity checks, and post-incident review.
- On-call/support process for beta and paid customers, including business-hours coverage expectations and escalation paths.
- Status page decision: external hosted status page, internal beta status notes, or no public page until paid launch.

### Recommended Next Tasks

1. Pick observability stack for API/web/workers/database/object storage.
2. Define alert severities and ownership.
3. Add operational runbooks before adding paid tenants.
4. Require monitoring proof before public launch.

## D. Billing And SaaS Operations

### Current State

- No subscription billing, tenant limits, plan model, customer lifecycle, or paid onboarding flow exists.
- LedgerByte itself does not yet issue invoices/receipts for subscriptions.
- Support workflow is documentation-only.

### Paid v1 Requirements

- Subscription plan model with feature limits, user limits, storage limits, organization limits, and trial behavior.
- Payment provider decision: Stripe test/live path, local/regional alternatives, manual invoicing, or phased manual billing first.
- Trial policy covering length, data retention after trial, conversion, suspension, and extension.
- LedgerByte's own billing workflow: customer invoice, receipt, VAT handling, refund/cancellation notes, and internal reconciliation process.
- Cancellation and refund policy reviewed legally and operationally.
- Tenant provisioning workflow for paid private beta and public production.
- Support workflow with intake channels, severity labels, response-time targets, customer data handling, and escalation.

### Recommended Next Tasks

1. Define v1 plans and usage limits without integrating payment collection.
2. Decide whether paid private beta starts with manual invoicing or test-mode Stripe first.
3. Create support intake and tenant provisioning runbooks.

## E. Compliance And Legal

### Current State

- Accountant review packet exists, but completed accountant findings are still pending.
- Beta testing guidance warns against production reliance.
- ZATCA documentation is extensive but real production compliance is not enabled.
- No Terms of Service, Privacy Policy, Data Processing Addendum, retention policy, or customer contract package exists in the repo.

### Paid v1 Requirements

- Terms of Service covering acceptable use, service limits, beta limitations if applicable, liability, termination, payment, and support scope.
- Privacy Policy covering collected data, processing purposes, storage, subprocessors, retention, security, and user rights.
- Data processing notes for Saudi-first customers, including where data is hosted, how backups are handled, and how support accesses customer data.
- Retention policy for accounting records, audit logs, attachments, generated documents, support tickets, email metadata, and future ZATCA artifacts. Do not guess legal retention periods; use legal/accounting review.
- Clear Saudi/ZATCA limitations until the production compliance gate is passed.
- Completed accountant review of chart of accounts, posting flows, reports, statements, VAT summary, inventory accounting policy, and document wording.
- ZATCA specialist review before any production compliance claim.

### Recommended Next Tasks

1. Prepare legal document templates for external counsel review.
2. Complete accountant review packet and record findings.
3. Keep all ZATCA compliance wording conservative until specialist sign-off.

## F. ZATCA Production Path

### Current State

- Local XML/QR/hash, SDK validation, readiness checks, CSR/CSID planning, signing planning, and custody planning exist.
- Real ZATCA production compliance is not enabled.
- No real CSID request, signing, clearance, reporting, PDF/A-3, or real network submission is enabled.
- Production key custody remains blocked until a secrets-manager/KMS decision is made.

### Paid v1 Requirements

- FATOORA sandbox access and authorized OTP process.
- Compliance CSID sandbox onboarding flow behind explicit sandbox flags.
- Secure key/certificate/CSID custody with secrets manager or KMS-style control before handling real materials.
- Invoice signing implementation validated against the official SDK and reference samples.
- Phase 2 QR generation with cryptographic tags derived from signing/certificate output.
- Standard invoice clearance and simplified invoice reporting in sandbox before any production flow.
- PDF/A-3 archive pipeline with signed XML embedding after XML/signing is verified.
- Official SDK validation in local/CI-compatible environment using Java 11-14 or an approved equivalent.
- Error/retry queue for CSID, signing, clearance, reporting, rejected invoices, temporary ZATCA outages, and certificate expiry.
- Audit evidence for each compliance lifecycle action without exposing tokens, secrets, signed XML bodies, QR payload bodies, auth headers, or customer-sensitive payloads.
- Production compliance claim gate requiring sandbox evidence, ZATCA specialist review, security/key custody review, accountant/tax review, and product wording review.

### Recommended Next Tasks

1. Keep current ZATCA behavior local/mock until OTP/sandbox access exists.
2. Complete key-custody provider decision before real CSID material is persisted.
3. Implement sandbox-only CSID/signing/clearance/reporting in staged phases with explicit flags and rollback.

## G. Product Readiness

### Current State

- Broad accounting workflows exist across AR, AP, banking, inventory, documents, reports, statements, roles, audit logs, and beta testing docs.
- Manual bank statement import supports CSV/JSON/text plus limited OFX/CAMT/MT940 groundwork.
- Visual regression coverage exists for selected polished beta workflows.
- Real beta feedback and completed accountant review findings are still pending.
- Full smoke and full E2E remain pending.

### Paid v1 Requirements

- Beta feedback from selected testers, triaged into blocker/high/medium/low with safe redaction.
- Accountant findings recorded and closed for reports, statements, PDFs, VAT wording, inventory valuation wording, and bank reconciliation terminology.
- UX blockers closed: route loading/error/empty states, mobile layout, bulk/list filters where needed, and high-risk action clarity.
- Full API smoke run against a suitable non-production environment with bounded timeout and secret-store credentials.
- Full browser E2E against a non-production environment with reset/fixture policy.
- Mobile/responsive QA across high-traffic workflows.
- Document/PDF review for invoice, receipt, credit/debit note, statements, reports, and archive behavior.
- Bank parser validation using real sanitized target-bank samples before claiming bank-specific support.

### Recommended Next Tasks

1. Collect real sanitized beta and accountant findings.
2. Fix only concrete blocker/high findings before expanding beta scope.
3. Run full smoke and full E2E only when the target environment and credentials are approved for that validation.
