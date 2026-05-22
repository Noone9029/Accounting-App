# LedgerByte Codex Handoff

## Latest Commit Inspected

- `f1e3e69 Prepare PROD-A1 handoff baseline`

## Current PROD-A1 Objective

- Prepare `PROD-A1 Final hosting ADR` by inventorying final production hosting requirements before drafting the ADR.
- The next pass should compare final production hosting options separately from the current Vercel user-testing deployment.
- Keep the first PROD-A1 pass docs-only: requirements inventory, constraints, open questions, and ADR inputs only.

## Current Vercel Posture

- Vercel is the current beta/user-testing and staging path only.
- Do not treat Vercel as accepted final production hosting.
- Current user-testing targets are `ledgerbyte-api-test` and `ledgerbyte-web-test`, backed by Supabase Postgres for testing.
- Any final production hosting decision must account for API runtime fit, background workers, queues, logs, rollback, secrets, storage, database connectivity, cost, support, and operational load.

## PROD-A1 Part 1 - Hosting Requirements Inventory

- Web app hosting needs: host `apps/web` as a Next.js 16/React 19 pnpm workspace app with `experimental.externalDir`, per-environment `NEXT_PUBLIC_API_URL`, domain/cert planning, caching/asset delivery, error monitoring, and a strict beta-to-production boundary.
- API hosting needs: host the NestJS/Express/Prisma API on a predictable Node runtime with connection pooling budget, request/memory/timeouts, cold-start posture, CORS/JWT config, health/readiness checks, logs, rollback, and handoff for long-running work.
- Worker/queue needs: production workers are not wired yet; final hosting needs a separate worker runtime for email retries, reports/exports, cleanup, future ZATCA jobs, graceful shutdown, retries, dead-letter handling, heartbeats, and no serverless request coupling.
- Redis/BullMQ needs: repo has `REDIS_URL` and a Redis/BullMQ target posture only; choose managed Redis or equivalent with queue naming, lock timeouts, retry/dead-letter policy, dashboards, alerts, data retention, and worker connectivity.
- PostgreSQL needs: Prisma uses PostgreSQL with `DATABASE_URL` runtime access and `DIRECT_URL` migration access; production needs pooling, PITR/restore, migration/admin credential split, least-privilege runtime role, tenant isolation/RLS/Data API decision, auditability, support, region, and cost review.
- Object storage/document needs: attachments default to DB/base64 and S3 is feature-flagged for new uploads; generated documents remain DB-backed, so production needs private object storage, signed access, lifecycle/retention, backup/restore, scanning, migration executor, and metadata-only evidence.
- PDF/document generation needs: `@ledgerbyte/pdf-core` renders operational PDFs in process with PDFKit and archives generated PDFs in DB today; production needs CPU/memory sizing, archival storage policy, accountant/PDF review, and a separate PDF/A-3 path only after ZATCA signing is stable.
- Backups/PITR needs: current backup readiness is metadata/planning plus local drill only; production needs hosted DB backup/PITR proof, hosted restore drill, object-storage restore proof, generated-doc/attachment backup evidence, RPO/RTO approval, and no customer-content exposure in evidence.
- Monitoring/logging needs: health/readiness exist but the production monitoring stack is undecided; needs uptime, API error, worker/queue, email, backup, storage, and ZATCA job monitoring with alert routing, redaction, and no request/response body logging.
- Secrets needs: production must manage DB URLs, JWT, SMTP/provider secrets, S3 credentials, queue credentials, hosting tokens, and future ZATCA key/CSID material in secrets manager/KMS with access control, rotation, audit, and emergency revoke.
- Rollback/deployment safety needs: final hosting must document deploy rollback, migration rollback decision tree, env rollback, queue pause/drain, worker shutdown, status/support communication, promotion gates, and approved non-production smoke/E2E target policy.
- Region/data residency considerations: hosting comparison must include Saudi-first customer expectations, provider region choices, database/object-storage data location, support/data-processing notes, backups/replicas, subprocessors, and separation for local, user-testing, paid private beta, production, and ZATCA environments.
- ZATCA integration needs: production compliance remains blocked; future hosting must support no-network mock defaults, optional local SDK Java 11-14 validation/CI wrapper, sandbox OTP/CSID, signing, clearance/reporting, PDF/A-3, retry queue, audit evidence, specialist signoff, and KMS/secrets custody before any claim.
- Email provider needs: default remains mock/SMTP-disabled; production needs provider decision, domain/SPF/DKIM/DMARC evidence, allowlisted non-production relay proof, signed provider webhooks, suppression/bounce handling, retry scheduler/worker, monitoring/alerts, and invoice/statement send policy.
- Billing integration needs: no billing integration exists; hosting plan must leave room for manual billing or a payment provider, subscription/tenant limits, billing webhooks/jobs, receipts/invoices for LedgerByte itself, cancellation/refund policy, and legal/privacy review before paid launch.

## Known Blockers

- `ADR-001 Final production hosting provider` is still pending.
- Production database provider and least-privilege Prisma runtime role decisions remain unresolved.
- Supabase RLS/Data API strategy remains unresolved; current user-testing mitigation is not a production launch posture.
- Backup/PITR proof, restore drill, object storage policy, monitoring stack, secrets management, incident/support process, billing/legal ownership, and ZATCA production strategy remain open production-foundation work.
- Full deployed smoke and full deployed E2E are not current production launch gates until a safe approved non-production target and credential/data policy are defined.
- Real ZATCA production compliance is not enabled; CSID, signing, clearance/reporting, PDF/A-3, real ZATCA network calls, production credentials, and production compliance claims remain blocked.

## Forbidden Actions For Next PROD-A1 Thread

- Do not change app code.
- Do not deploy, provision, migrate, seed, reset, delete, or change environment variables.
- Do not change Supabase RLS, runtime DB roles, Vercel settings, ZATCA behavior, emails, accounting logic, or customer data.
- Do not create the ADR until the hosting requirements inventory is complete.
- Do not research the web unless the user explicitly widens scope.
- Do not touch unrelated web/marketing worktree changes.

## Next Thread Prompt

`PROD-A1 Part 2: official provider research.`
