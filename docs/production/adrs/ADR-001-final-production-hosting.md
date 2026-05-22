# ADR-001: Final Production Hosting

status: proposed
date: 2026-05-22

## Context

LedgerByte is currently in controlled beta/user-testing. The current Vercel and Supabase path is useful for beta validation, but it is not accepted final production hosting.

The repo needs a paid SaaS v1 production target that can run the Next.js web app, NestJS/Prisma API, background workers, Redis/BullMQ-style queues, PostgreSQL, object storage, secrets, monitoring, rollback, and future ZATCA-related jobs without relying on the current beta Vercel/Supabase posture. This ADR is planning-only: it does not approve deployment, provisioning, data migration, DNS changes, env-var changes, RLS changes, runtime DB role changes, customer data movement, email sending, or ZATCA production cutover.

## Decision Drivers

- Production reliability.
- Database safety.
- Backup/PITR support.
- Object storage maturity.
- Worker/queue support.
- Monitoring/alerting.
- Secrets management.
- Rollback/deployment safety.
- Cost predictability.
- Operational complexity.
- Saudi/GCC customer trust.
- ZATCA integration readiness.
- Small-team maintainability.

## Options Considered

### Option A - AWS Production Stack

AWS would host the production stack using AWS-native managed services: container or managed app hosting for web/API/workers, Amazon RDS for PostgreSQL, Amazon ElastiCache for Redis/Valkey, Amazon S3 for object storage, AWS Secrets Manager or SSM Parameter Store for secrets/configuration, CloudWatch for logs/metrics/alarms, and RDS/S3 backup controls.

### Option B - DigitalOcean Production Stack

DigitalOcean would host web/API/workers through App Platform or, if needed, Droplets/Kubernetes, with Managed PostgreSQL, Managed Valkey/Redis-compatible caching, Spaces object storage, App Platform logs/alerts, and Managed Database PITR for PostgreSQL.

### Option C - Render/Fly/Railway-Style Managed App Hosting

This option uses a developer-friendly managed app platform such as Render, Fly.io, or Railway for web/API/workers, with each provider's managed or partner Postgres, Redis-compatible queue, object storage, logs, and backup capabilities.

### Option D - Hybrid Vercel Web Plus Production Backend

This option keeps a Vercel-hosted web frontend while moving API, workers, database, Redis, object storage, secrets, and monitoring to a production provider such as AWS or DigitalOcean. Under current project policy, Vercel remains beta/user-testing/staging only unless a later ADR or explicit approval changes that.

## Comparison Table

| Option | Strengths | Risks for LedgerByte | Fit for paid SaaS v1 |
| --- | --- | --- | --- |
| AWS production stack | Strongest first-party coverage for API/workers, RDS PostgreSQL PITR, ElastiCache Redis/Valkey, S3, Secrets Manager/KMS path, CloudWatch, IAM, VPC isolation, and backup evidence. | Higher operational complexity, higher configuration burden, cost needs active management, and web hosting needs explicit validation because the repo currently uses Next.js 16 while Amplify docs trail that version. | Best fit if LedgerByte accepts a container/API-worker architecture and assigns AWS operations ownership. |
| DigitalOcean production stack | Simpler operations, App Platform workers, Managed PostgreSQL with PITR, Spaces S3-compatible storage, VPC/logs/metrics, and a smaller cloud surface for a small team. | DigitalOcean Valkey documentation lists no backups/PITR and no connection pooling; secrets/KMS, alerting depth, and rollback evidence need more proof; Droplets/Kubernetes increase ops load. | Plausible paid private beta option if queue state is treated as rebuildable or a stronger Redis provider is added. |
| Render/Fly/Railway-style platform | Fastest app/worker setup, good developer ergonomics, managed app primitives, and enough services for controlled private beta if evidence is proven. | Data-service maturity varies; Render has an object-storage gap without MinIO/external storage; Fly uses partner services and has Managed Postgres feature gaps; Railway Redis/database templates require stronger production proof. | Weaker default for paid SaaS v1; better as a private-beta or prototype path unless restore, storage, logs, and queue evidence are proven. |
| Hybrid Vercel web plus production backend | Preserves current web workflow and preview ergonomics while moving backend risk to a stronger production provider. | Cross-provider incident response, CORS, DNS, secrets, logs, deploy ordering, and rollback are harder; Vercel must not silently become final production hosting. | Transitional only. Requires separate approval before using Vercel for production web. |

## Recommendation

Recommended for paid SaaS v1: AWS production stack, using managed container/app hosting for the API and worker processes, managed PostgreSQL with PITR, managed Redis/Valkey, S3 object storage with backup/versioning/lifecycle policy, centralized secrets management, and CloudWatch-based monitoring/alerting from day one.

- Keep Vercel as beta/user-testing/staging only until separately approved.
- Use managed PostgreSQL with PITR for production data.
- Use managed Redis for queue coordination and cache-like workloads.
- Use object storage with a defined backup, lifecycle, versioning, and restore policy for attachments, generated documents, exports, and future ZATCA artifacts.
- Use a separate worker process for queues instead of coupling long-running work to web/API request lifecycles.
- Use centralized secrets management for database URLs, JWT, object storage, Redis, email provider secrets, and future ZATCA key/CSID material.
- Use monitoring/alerting from day one for web, API, workers, queues, PostgreSQL, Redis, object storage, backups, email, and future ZATCA jobs.

The recommendation is proposed, not accepted. It must be reviewed by infra, backend, security, product, and operations before any production-affecting implementation ticket mutates providers or credentials.

## Phased Migration Path

1. Confirm environment separation for local, user-testing, paid private beta, production, and ZATCA-gated environments.
2. Select AWS region, account structure, IAM ownership, cost guardrails, and support plan.
3. Define production web hosting approach for the current Next.js 16 app, including whether it is container-hosted, statically exported where possible, or handled by a later approved web-specific provider decision.
4. Define production API runtime, connection pooling budget, health/readiness endpoints, logs, and timeout behavior.
5. Create a production-intended PostgreSQL environment only after approval, with PITR enabled, migration/admin credentials separated from runtime credentials, and restore-drill expectations documented.
6. Prepare migration strategy from beta/user-testing data to production data with rehearsal, validation counts, rollback decision points, and no customer data migration until separately approved.
7. Configure object storage policy for attachments, generated documents, exports, and future ZATCA artifacts with private access, signed URLs/proxying, lifecycle, versioning, scanning path, backup, and restore proof.
8. Configure managed Redis and separate worker process topology for email retries, exports/reports, cleanup, and future ZATCA jobs.
9. Configure centralized secrets management and rotation/emergency revoke process before any production credential is introduced.
10. Define domain/DNS and certificate plan, including beta domain separation and no production domain cutover until approved.
11. Define CI/CD plan with separate web/API/worker deploys, migration gates, smoke gates, and rollback steps.
12. Run smoke/health validation only against an approved non-production target before any production cutover.
13. Prove rollback for app deploys, failed migrations, env/secrets, queues/workers, DNS, and customer communication.
14. Keep all ZATCA production behavior blocked until a separate ZATCA gate passes.

## From beta Vercel/Supabase to production

- Environment separation: document allowed data, credentials, domains, email mode, ZATCA mode, backup mode, and promotion gates for local, user-testing, paid private beta, production, and ZATCA environments.
- Production database creation: create production PostgreSQL only after explicit approval, with PITR, backup window, admin/migration/runtime credential separation, and least-privilege runtime role design.
- Migration strategy: rehearse migrations on an approved non-production target first, use metadata/count validation, define rollback points, and do not migrate customer data until approved.
- Object storage setup: create private production-intended object storage only after approval, then validate synthetic attachment/generated-document storage, backup, restore, versioning/lifecycle, and access logging.
- Redis/worker setup: provision managed Redis and workers only after approval, then validate synthetic queue jobs, retry/dead-letter behavior, worker shutdown, and monitoring.
- Secrets setup: move production-intended secrets into the selected centralized secrets manager, with access control, rotation plan, auditability, and emergency revoke before live use.
- Domain/DNS plan: keep beta and production domains separate; no DNS or production traffic cutover occurs in this ADR.
- CI/CD plan: require isolated deploy targets for web, API, and workers, with staged promotion, build artifacts, health checks, smoke checks, and rollback commands.
- Smoke/health validation: validate web, API health/readiness, database connectivity, Redis connectivity, worker heartbeat, object storage synthetic access, and no secret leakage before launch.
- Rollback plan: define rollback for deployments, migrations, env/secrets, worker queues, DNS, and customer messaging before production cutover.
- No customer data migration until approved.
- No ZATCA production cutover until separate ZATCA gate passes.

## Risks

- AWS operational overhead can outpace the team unless ownership, runbooks, and cost guardrails are explicit.
- Next.js 16 web hosting requires validation because AWS Amplify's official Next.js support docs trail the repo's current version.
- RDS connection pooling, Prisma transaction behavior, and worker concurrency must be sized before paid tenants are onboarded.
- Redis-backed queues require policy for retry, dead-letter, idempotency, data retention, and whether queue state is recoverable or rebuildable.
- S3 storage policy must cover private access, backups, lifecycle, restore, malware scanning path, and evidence redaction.
- Monitoring and alert fatigue can become operational risk without severity routing and support ownership.
- ZATCA key custody, signing, clearance/reporting, PDF/A-3, and sandbox/production evidence remain blocked outside this ADR.
- Cross-provider use of Vercel for production web would add operational complexity and needs a separate approval gate.

## Open Questions

- Which AWS production region best balances Saudi/GCC customer trust, latency, service availability, support, and data-processing notes?
- Which AWS hosting service should run the Next.js 16 web app: containerized web runtime, separate static/SSR approach, or another approved frontend host?
- Which AWS service should run the NestJS API and workers: App Runner, ECS/Fargate, EKS, EC2, or another managed container path?
- What RPO/RTO targets should paid SaaS v1 commit to for PostgreSQL and object storage?
- What production cost ceiling and support plan are acceptable for paid private beta?
- Which observability stack is sufficient: CloudWatch-only first, CloudWatch plus Sentry, or a third-party monitoring stack?
- Who owns day-two operations, incident response, AWS account administration, and customer support escalation?
- What data-processing, subprocessor, and retention wording will legal approve for Saudi/GCC customers?

## What Is Explicitly Not Decided

- This ADR does not accept or implement the production database provider ADR, runtime DB role, Supabase RLS/Data API posture, or credential cutover.
- This ADR does not approve Vercel as final production hosting.
- This ADR does not choose exact AWS service tiers, instance sizes, regions, account layout, IAM policies, VPC topology, or support plan.
- This ADR does not choose the final web hosting implementation for Next.js 16.
- This ADR does not choose an email provider, billing provider, legal terms, privacy policy, retention period, accountant signoff, or support tooling.
- This ADR does not approve production ZATCA signing, CSID, clearance/reporting, PDF/A-3, QR payloads, real ZATCA network calls, or production compliance claims.
- This ADR does not approve customer data migration, production deployment, DNS changes, backups/restores, seed/reset/delete, env-var changes, or provider provisioning.

## Follow-up Tickets

- `PROD-A2 API hosting decision`: choose API runtime, connection pooling, timeouts, logs, rollback, and worker handoff.
- `PROD-A3 Web hosting decision`: validate the production web path for the current Next.js 16 app.
- `PROD-A4 Worker/queue hosting decision`: define worker deployment, scaling, shutdown, retry, and dead-letter model.
- `PROD-A5 Redis/BullMQ production plan`: define managed Redis, queue naming, lock timeout, dashboards, alerts, and retention.
- `PROD-A6 Environment separation`: document environment boundaries and promotion gates.
- `PROD-A7 Rollback plan`: write deploy, migration, env, queue, DNS, and customer-communication rollback runbook.
- `PROD-B1 Least-privilege Prisma runtime role` and `PROD-B2 DIRECT_URL/admin/migration separation`: design production credential separation.
- `PROD-B6 Secrets management plan`: choose production secrets/KMS and rotation/custody policy.
- `PROD-C1 Hosted backup/PITR proof` and `PROD-C2 Restore drill in hosted environment`: prove database recovery with metadata-only evidence.
- `PROD-C3 Object storage backup proof` and `PROD-C4 Generated document storage policy`: validate storage and retention for attachments and generated documents.
- `PROD-D1` through `PROD-D8`: select monitoring, alerting, worker/queue/email/ZATCA job monitoring, incident response, and support process.
- `PROD-G1` through `PROD-G8`: keep ZATCA production onboarding, CSID, signing, clearance/reporting, PDF/A-3, SDK CI, retry queue, and audit evidence behind the separate ZATCA gate.
