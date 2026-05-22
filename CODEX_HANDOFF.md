# LedgerByte Codex Handoff

## Latest Commit Inspected

- `d7f623f Document PROD-A1 hosting requirements`

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

## PROD-A1 Part 2 - Official Provider Research

### Option A - AWS Production Stack

- Official docs consulted: [Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [App Runner](https://docs.aws.amazon.com/en_us/apprunner/), [RDS automated backups/PITR](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html), [ElastiCache snapshot/restore](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html), [Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/), [Secrets Manager](https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html), [SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html), and [CloudWatch alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Alarms.html).
- Facts: App Runner is a managed source/container path for scalable web/API services; Amplify Hosting compute officially supports Next.js 12-15 SSR while this repo currently uses Next.js 16; RDS automated backups support PITR within the configured retention period and manual snapshots; ElastiCache Valkey/Redis OSS supports snapshot/restore; S3 supports private object storage patterns with versioning/lifecycle controls; Secrets Manager supports managed secret storage/rotation and CloudWatch supports metric/composite alarms.
- Pros for LedgerByte: most complete first-party fit for API, workers, PostgreSQL, Redis, object storage, secrets, monitoring, and backup proof; strongest path for least-privilege IAM, VPC isolation, PITR evidence, restore drills, S3 document storage, and future ZATCA secret custody.
- Cons/risks for LedgerByte: highest operational complexity and cost surface; needs explicit web choice because Amplify's documented Next.js support trails the repo's Next.js 16; requires careful IAM/VPC/egress/log-retention design and an owner for AWS operations.
- Suitability for paid SaaS v1: strong candidate if LedgerByte accepts AWS operational overhead and uses a container/API-worker architecture rather than assuming Amplify can host the current Next.js app unchanged.

### Option B - DigitalOcean Production Stack

- Official docs consulted: [App Platform monorepos](https://docs.digitalocean.com/products/app-platform/how-to/deploy-from-monorepo/), [App Platform workers](https://docs.digitalocean.com/products/app-platform/how-to/manage-workers/), [App Platform logs](https://docs.digitalocean.com/products/app-platform/how-to/view-logs/index.html), [Managed Databases](https://docs.digitalocean.com/products/databases/), [Valkey limits](https://docs.digitalocean.com/products/databases/valkey/details/limits/), and [Spaces features](https://docs.digitalocean.com/products/spaces/details/features/).
- Facts: App Platform supports monorepo deployment and non-routable workers; App Platform exposes activity/build/deploy/runtime/crash logs and log forwarding; Managed Databases include PostgreSQL with daily backups, PITR, standby nodes, SSL, VPC, logs, and metrics; DigitalOcean Valkey is Redis-compatible but its limits page says no backups/PITR, connection pooling, read-only nodes, or query statistics; Spaces is S3-compatible object storage with HTTPS and CDN options.
- Pros for LedgerByte: simpler than AWS while covering web/API workers, managed Postgres, S3-compatible storage, logs, and a Redis-compatible queue endpoint; likely faster to operate for paid SaaS v1 if the team wants a smaller cloud surface.
- Cons/risks for LedgerByte: Valkey backup/PITR gap is material for queue durability evidence; secrets/KMS, audit, alerting, and rollback maturity need explicit proof; Droplets/Kubernetes fallback would increase ops burden and should not be selected without a named operator.
- Suitability for paid SaaS v1: plausible candidate if the ADR accepts App Platform workers and managed Postgres, and either treats Redis as rebuildable queue state or uses another Redis provider with stronger backup/monitoring evidence.

### Option C - Render/Fly/Railway-Style Managed App Hosting

- Official docs consulted: Render [service types](https://render.com/docs/service-types/), [background workers](https://render.com/docs/background-workers/), [Postgres recovery/backups](https://render.com/docs/postgresql-backups), [Key Value](https://render.com/docs/key-value), and [logs](https://render.com/docs/logging); Fly.io [process groups](https://fly.io/docs/launch/processes/), [Managed Postgres](https://fly.io/docs/mpg/), [Upstash Redis](https://fly.io/docs/upstash/redis/), [Tigris object storage](https://fly.io/docs/tigris/), and [monitoring](https://fly.io/docs/monitoring/); Railway [storage buckets](https://docs.railway.com/storage-buckets), [Redis](https://docs.railway.com/guides/redis), [volume backups](https://docs.railway.com/volumes/backups), and [data/storage overview](https://docs.railway.com/data-storage).
- Facts: Render supports web services, static sites, private services, background workers, cron jobs, Redis-compatible Key Value, and paid Postgres PITR, but general object storage appears to require MinIO-on-disk or an external/partner object store; Fly supports Dockerized apps with independently scalable process groups, Managed Postgres with HA/backups/pooling, Upstash Redis, Tigris S3-compatible storage, logs, and metrics, while some Managed Postgres features remain under development; Railway supports services, private networking, volumes/backups, Redis/Postgres templates, and private S3-compatible Buckets, but its Redis guide describes the template as unmanaged.
- Pros for LedgerByte: fastest app/worker path, low platform-management burden, straightforward private-beta ergonomics, and enough primitives to model web/API/worker/Postgres/Redis/storage if restore evidence is proven.
- Cons/risks for LedgerByte: provider maturity varies by data component; Render has an object-storage gap for LedgerByte documents; Fly relies on partner services for Redis/object storage and has Managed Postgres feature gaps; Railway database/Redis templates and volume backups need stronger production proof than a regulated accounting SaaS should assume.
- Suitability for paid SaaS v1: usable for controlled paid private beta only after restore drills, queue behavior, log retention, alerting, object storage, and region/data-residency evidence are proven; weaker default for final paid SaaS v1 than AWS unless simplicity is prioritized over platform depth.

### Option D - Hybrid Vercel Web Plus Production Backend

- Official docs consulted: Vercel [Next.js on Vercel](https://vercel.com/docs/concepts/next.js/overview), [Environments](https://vercel.com/docs/deployments/production-env), [Functions limits](https://vercel.com/docs/functions/limitations/), [Function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Logs](https://vercel.com/docs/observability/logs), and [rollback CLI](https://vercel.com/docs/cli/rollback), plus the production-provider docs listed above for API/workers/DB/Redis/storage.
- Facts: Vercel provides first-class Next.js hosting, preview URLs, environment separation, function limits/duration controls, logs, and rollback tooling; the current LedgerByte posture keeps Vercel beta/user-testing/staging only; a hybrid could put only the web/static frontend on Vercel and move API/workers/Postgres/Redis/object storage to AWS, DigitalOcean, or another approved production provider; this requires strict `NEXT_PUBLIC_API_URL`, CORS, secrets, observability, and rollback coordination across providers.
- Pros for LedgerByte: minimizes frontend migration, preserves current user-testing workflow, and can pair Vercel's web/deploy preview strengths with a backend provider better suited to long-running workers, Prisma pooling, Redis queues, backups, and object storage.
- Cons/risks for LedgerByte: cross-provider incident response, logs, secrets, deploy ordering, CORS, latency, domains, and rollback are harder; Vercel must remain non-production unless separately approved, and Vercel Functions should not become the final API/worker runtime by accident.
- Suitability for paid SaaS v1: transitional candidate for web-only hosting after explicit approval; not the default final production posture for LedgerByte until the ADR proves the backend provider, split-ops model, and Vercel production approval gates.

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

`PROD-A1 Part 3: draft ADR.`
