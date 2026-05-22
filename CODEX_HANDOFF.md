# LedgerByte Codex Handoff

## Latest Commit Inspected

- `4c8fa2c Document PROD-A3 web hosting inventory`

## Current Development Objective

- Production hosting research is paused.
- AWS remains the known future production direction from proposed ADR-001/ADR-013.
- Vercel remains beta/user-testing/staging only, not final production hosting.
- Next work is product development completion before more production-hosting research.
- Development completion plan: [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md).
- Exact next recommended development ticket: `DEV-01 Full route QA and blocker triage`.

## Current PROD-A1 Objective

- `PROD-A1 Final hosting ADR` is complete through final verification/handoff.
- The ADR is drafted/proposed only, not accepted or implemented.
- Keep follow-up work docs-only unless a future ticket explicitly approves production-affecting provider, credential, data, DNS, deployment, backup, email, or ZATCA actions.

## Current Vercel Posture

- Vercel is the current beta/user-testing and staging path only.
- Do not treat Vercel as accepted final production hosting.
- [ADR-001](docs/production/adrs/ADR-001-final-production-hosting.md) recommends an AWS production stack for paid SaaS v1, but Vercel remains beta/user-testing/staging only until separately approved.
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

- `ADR-001 Final production hosting provider` is drafted/proposed, but not accepted or implemented.
- AWS is recommended for paid SaaS v1, but no provider has been provisioned and no production deployment has occurred.
- Production database provider and least-privilege Prisma runtime role decisions remain unresolved.
- Supabase RLS/Data API strategy remains unresolved; current user-testing mitigation is not a production launch posture.
- Backup/PITR proof, restore drill, object storage policy, monitoring stack, secrets management, incident/support process, billing/legal ownership, and ZATCA production strategy remain open production-foundation work.
- Full deployed smoke and full deployed E2E are not current production launch gates until a safe approved non-production target and credential/data policy are defined.
- Real ZATCA production compliance is not enabled; CSID, signing, clearance/reporting, PDF/A-3, real ZATCA network calls, production credentials, and production compliance claims remain blocked.

## PROD-A1 Part 5 - Final Verification And Handoff

### PROD-A1 Result

- Hosting requirements were inventoried from the repo.
- Official provider research notes were captured for AWS, DigitalOcean, Render/Fly/Railway-style managed hosting, and a hybrid Vercel-web/backend-provider option.
- [ADR-001 final production hosting](docs/production/adrs/ADR-001-final-production-hosting.md) was created with status `proposed`.
- Production docs now reference ADR-001 and state that implementation has not started, the provider is not provisioned, and no production deploy was performed.

### Files Changed Across PROD-A1

- `CODEX_HANDOFF.md`
- `docs/production/adrs/ADR-001-final-production-hosting.md`
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`
- `README.md`
- `BUG_AUDIT.md`

### Checks Run

- `git status --short`
- `git log -1 --oneline`
- `git diff --check`
- `git diff --cached --check` was conditionally checked; it was skipped before this handoff update because no files were staged.
- Safety wording search with `rg` for beta/user-testing, proposed/not implemented, no provider provisioning, no production deploy, no Supabase/Vercel env changes, migrations, backups, ZATCA, email, and app-test guard wording.
- Existing package-script search for link/markdown checks found no dedicated link-check script.
- Lightweight `Test-Path` check passed for the PROD-A1 handoff, ADR, production planning docs, README, and audit paths.

### Skipped Commands And Why

- Full smoke: skipped because no app code changed and no approved safe runtime target was requested.
- Full E2E: skipped because no app code changed and deployed/runtime verification was out of scope.
- Migrations: skipped because schema/data mutation was forbidden.
- Seed/reset/delete: skipped because data mutation/destructive operations were forbidden.
- RLS/runtime-role work: skipped because Supabase RLS and runtime DB role changes were forbidden.
- Vercel/Supabase env changes: skipped because env mutations and provider settings changes were forbidden.
- Real ZATCA: skipped because ZATCA behavior, credentials, network calls, and production cutover were forbidden.
- Real email: skipped because email behavior and real sends were forbidden.
- Backups/restores: skipped because backup/restore execution was forbidden.
- App tests: skipped because no app code changed.

### Remaining Blockers

- ADR-001 still needs owner review and acceptance before any implementation ticket mutates production-intended providers or credentials.
- Exact AWS region, account structure, IAM/VPC topology, service tiers, support plan, cost guardrails, and day-two owner are undecided.
- Next.js 16 production web hosting path needs validation.
- Database runtime role, migration credential separation, RLS/Data API strategy, backup/PITR proof, restore drills, object storage backup/restore, monitoring, secrets/KMS, incident/support, legal/accountant, billing, and ZATCA gates remain unresolved.

### Recommended Next Implementation Ticket

- `PROD-A2 API hosting decision`: define the production NestJS/Prisma API runtime, connection pooling, timeouts, logs, rollback, and worker handoff against the proposed AWS direction without deploying or mutating infrastructure.

## PROD-A2 Part 1 - API Hosting Inventory

- API framework/runtime: `apps/api` is a NestJS 11 API on Express 5, TypeScript/CommonJS, Node-oriented runtime, with `ConfigModule.forRoot({ isGlobal: true })`, global validation pipes, CORS from config, and Prisma in the main module.
- API start/build commands: root `build` runs workspace builds; API scripts are `dev` (`nest start --watch --entryFile apps/api/src/main`), `build` (`nest build`), `start` (`node dist/apps/api/src/main.js`), `db:generate`, `db:migrate`, and smoke commands; Vercel beta API uses root `vercel.json`, `api/index.js`, `apps/api/api/index.ts`, and `scripts/vercel-postinstall.cjs`.
- Required environment categories: runtime DB and migration DB URLs, Prisma connection/transaction tuning, JWT auth, CORS/web URL, API port, email provider/SMTP/webhook/retry-worker gates, ZATCA adapter/SDK/custody gates, attachment/generated-document storage provider, S3-compatible object storage settings, and deployment target flags; do not expose values.
- Database dependency: Prisma PostgreSQL datasource uses `DATABASE_URL` plus `DIRECT_URL`; `PrismaService` connects on module init, disconnects on shutdown, normalizes Supabase pooler URLs for Vercel, applies `connection_limit`, and `/readiness` depends on a safe `SELECT 1`.
- Redis/queue dependency: `REDIS_URL` exists in env examples and local Docker Compose, but no BullMQ dependency or active Redis queue integration was found in `apps/api`; current docs say Redis/BullMQ is infrastructure groundwork and not required by current workflows.
- Worker separation needs: long-running background workers are not implemented; email retry worker paths are API/admin-controlled and disabled by default, so production hosting needs a separate worker process for retries, exports/reports, cleanup, and future ZATCA work instead of tying jobs to request handling or Vercel functions.
- Storage/document dependency: attachments default to database/base64 storage with optional S3-compatible provider selected by env and requiring bucket/endpoint/credential config; generated documents currently archive PDF buffers as database-backed base64, so production needs object-storage policy and migration planning before scale.
- PDF generation/runtime needs: invoices, purchase bills, and reports render PDFs in-process through `@ledgerbyte/pdf-core`, return `application/pdf`, and archive generated PDFs; API hosting must budget CPU/memory/timeouts for synchronous PDF generation and avoid assuming PDF/A-3/ZATCA artifact storage is complete.
- ZATCA/network dependency: default posture is mock/no real network; sandbox HTTP paths are gated and production CSID/signing/clearance/reporting/PDF/A-3 remain blocked; API hosting must support future outbound network, Java/SDK paths, temp files, and secrets custody only after separate ZATCA approval.
- Email dependency: default provider is mock or SMTP-disabled; SMTP sends, diagnostics, retry processor, retry worker, and provider webhooks are guarded by env gates, so production needs provider secrets, webhook verification, scheduling/worker separation, monitoring evidence, and no real sending until explicitly approved.
- Health check readiness: API root returns safe service metadata, `/health` is lightweight and DB-free, and `/readiness` checks database connectivity and returns safe `503` JSON on DB failure; production hosting should wire health, readiness, logging, and alerting separately.
- Containerization readiness: no production Dockerfile was found; local `infra/docker-compose.yml` uses `node:22-alpine` with Postgres and Redis for development, while current beta deployment is Vercel serverless wrapper only; PROD-A2 must decide an AWS container/app runtime and produce a production image/run command plan later.
- Known blockers/risks for API production hosting: Vercel remains beta/user-testing/staging only; current Vercel max duration/memory wrapper is not final production API hosting; exact AWS API runtime is undecided; Next.js 16 web hosting remains separate; least-privilege DB role, RLS/Data API strategy, backup/PITR proof, object storage, secrets/KMS, worker/queue operations, monitoring, rollback, email provider, and ZATCA gates remain unresolved.

## PROD-A2 Part 2 - Official API Hosting Research

### Option A - AWS App Runner

- Official docs consulted: [App Runner availability change](https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html), [App Runner architecture and concepts](https://docs.aws.amazon.com/apprunner/latest/dg/architecture.html), [source image services](https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html), [environment variables and secrets](https://docs.aws.amazon.com/apprunner/latest/dg/env-variable-manage.html), [health checks](https://docs.aws.amazon.com/apprunner/latest/dg/manage-configure-healthcheck.html), [VPC access](https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html), and [CloudWatch logs](https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cwl.html).
- Facts:
  - AWS says App Runner is closed to new customers starting April 30, 2026; existing customers can continue, but AWS does not plan new features.
  - App Runner can run source-code or ECR/ECR Public image services and manages service startup, scaling, and load balancing.
  - It supports plain environment variables plus references to AWS Secrets Manager and SSM Parameter Store.
  - Health checks can be TCP or HTTP with configurable path, interval, timeout, and thresholds.
  - VPC connectors allow outbound access to private VPC resources such as RDS and ElastiCache, with documented one-time connector startup latency.
  - Deployment and application logs stream to CloudWatch Logs.
- Pros for LedgerByte API:
  - Operationally simple managed container path for a NestJS/Express API if the AWS account is already eligible.
  - Direct HTTP health-check fit for `/health`; VPC connector could reach private RDS/ElastiCache.
  - Secrets Manager/SSM references fit the future secrets-management direction.
- Cons/risks for LedgerByte API:
  - Closure to new customers makes it unsafe as a fresh paid SaaS v1 target.
  - No-new-features posture is a strategic risk for a production foundation.
  - Less clean than ECS for explicit API/worker service topology, day-two control, and rollback runbooks; the consulted docs did not identify an ECS-style automatic failed-deploy rollback primitive.
  - Production Dockerfile, image pipeline, VPC, secrets, logs, and rollback still need separate implementation tickets.
- Suitability rating for paid SaaS v1: Not recommended for now.

### Option B - AWS ECS Fargate

- Official docs consulted: [ECS Linux task for Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/getting-started-fargate.html), [Fargate task networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html), [load balancer health checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/load-balancer-healthcheck.html), [Secrets Manager environment variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html), [CloudWatch logs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html), [service auto scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html), and [deployment circuit breaker rollback](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html).
- Facts:
  - ECS runs containers as tasks and services; Fargate provides serverless infrastructure for those tasks.
  - Fargate tasks use `awsvpc` networking with task ENIs, security groups, and VPC placement suitable for private RDS/ElastiCache access.
  - Fargate services support Application Load Balancer or Network Load Balancer; target groups perform health checks and ECS monitors the target health.
  - Task definitions can inject Secrets Manager secrets into container environment variables, with platform-version requirements and redeploy needed after secret rotation.
  - Fargate tasks can send container stdout/stderr to CloudWatch Logs through the `awslogs` driver.
  - ECS Service Auto Scaling uses CloudWatch metrics; the deployment circuit breaker can mark failed deployments and roll back to the last completed deployment.
- Pros for LedgerByte API:
  - Strongest API fit under the proposed AWS direction: predictable container runtime, explicit CPU/memory, VPC isolation, RDS/ElastiCache/S3/secrets alignment, and CloudWatch/EventBridge hooks.
  - Cleanly supports separate API and worker services, either sharing one image with different commands or using separate task definitions.
  - Best fit for future worker queues, PDF CPU/memory sizing, graceful shutdown, rolling deploys, and rollback controls.
- Cons/risks for LedgerByte API:
  - Highest implementation workload among the API-hosting options.
  - Requires production Dockerfile, image registry, CI/CD, IAM roles, VPC/subnet/security-group design, ALB target groups, log retention, and cost guardrails.
  - Prisma connection budget, task concurrency, RDS pooling, worker scaling, and migration/admin credential separation remain undecided.
- Suitability rating for paid SaaS v1: Strong candidate.

### Option C - AWS Elastic Beanstalk

- Official docs consulted: [Node.js applications on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs.html), [Docker containers on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.html), [environment secrets](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/AWSHowTo.secrets.env-vars.html), [health monitoring](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-health.html), [deployment policies](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html), and [deployment logs](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-deployment-logs.html).
- Facts:
  - Elastic Beanstalk supports Node.js web applications and Docker container deployment.
  - It can fetch Secrets Manager and SSM Parameter Store values into environment variables on supported platform versions, but rotated secrets require a manual refresh/restart path.
  - Health monitoring can track environment status and drive alarms.
  - Deployment policies include all-at-once, rolling, rolling with additional batch, immutable, and traffic splitting; traffic splitting can shift back if new instances fail health checks or deployment is aborted.
  - Deployment logs are available for recent platform versions and are uploaded to S3 for console viewing when permissions and VPC access allow it.
- Pros for LedgerByte API:
  - Lower AWS learning curve than ECS while still keeping API hosting inside AWS.
  - Native Node.js or Docker support can run a NestJS/Express API with conventional environment variables.
  - Built-in health, deployment policy, and deployment log surfaces are useful for a small team.
- Cons/risks for LedgerByte API:
  - Less explicit control than ECS over API and worker services, task-level networking, and queue-worker operations.
  - Still creates AWS resources that need ownership: EC2/Auto Scaling, load balancer, instance profiles, security groups, logs, platform updates, and S3 log permissions.
  - Secret rotation, platform lifecycle, worker topology, and rollback runbooks need more proof before paid SaaS use.
- Suitability rating for paid SaaS v1: Backup option.

### Option D - DigitalOcean App Platform

- Official docs consulted: [App Platform app spec](https://docs.digitalocean.com/products/app-platform/reference/app-spec/), [App Platform workers](https://docs.digitalocean.com/products/app-platform/how-to/manage-workers/), [App Platform deployments and rollback](https://docs.digitalocean.com/products/app-platform/how-to/manage-deployments/), and [DigitalOcean Managed Databases](https://docs.digitalocean.com/products/databases).
- Facts:
  - App Platform is a managed PaaS that deploys from Git repositories or container images and automatically builds, deploys, scales, and handles underlying infrastructure.
  - App specs support public services, workers, jobs, app-level environment variables, encrypted secret variables, alerts, instance counts, autoscaling, VPC, health checks, liveness health checks, and log destinations.
  - Workers are not externally routable; they are intended for background application code separate from web services.
  - App Platform rollback can restore one of the ten most recent successful deployments and restores code, configuration, and app spec, not database data.
  - DigitalOcean Managed Databases include PostgreSQL with daily backups/PITR, standby nodes, SSL, VPC, logs, and metrics; the same feature table shows Valkey is Redis-compatible but lacks daily point-in-time backups.
- Pros for LedgerByte API:
  - Faster operational path than AWS if AWS ownership, cost, or setup timing delays PROD-A2.
  - Supports separate web/API service and worker components with encrypted env vars and rollback ergonomics.
  - Managed PostgreSQL and Valkey can cover the current API dependency and future Redis-like queue endpoint, subject to queue durability policy.
- Cons/risks for LedgerByte API:
  - Weaker first-party depth than AWS for IAM/KMS-style custody, VPC design, observability, and regulated accounting SaaS evidence.
  - Valkey backup/PITR gap is material if queue state must be recoverable rather than rebuildable.
  - Need proof for private networking, log retention/export, alerting, object storage, restore drills, support tier, and production region/data-processing expectations.
- Suitability rating for paid SaaS v1: Possible candidate.

### Option E - Render/Fly/Railway-Style Managed API Hosting

- Official docs consulted: Render [service types](https://render.com/docs/service-types/), [web services](https://render.com/docs/web-services), [background workers](https://render.com/docs/background-workers), [Postgres recovery/backups](https://render.com/docs/postgresql-backups), [Key Value](https://render.com/docs/key-value), and [rollbacks](https://render.com/docs/rollbacks); Fly.io [process groups](https://fly.io/docs/launch/processes/), [secrets](https://fly.io/docs/apps/secrets/), [databases and storage](https://fly.io/docs/database-storage-guides/), and [Tigris object storage](https://fly.io/docs/tigris/); Railway [services](https://docs.railway.com/services), [deployments](https://docs.railway.com/deployments/reference), [variables](https://docs.railway.com/variables/reference), [logs](https://docs.railway.com/observability/logs), [data/storage](https://docs.railway.com/data-storage), and [storage buckets](https://docs.railway.com/guides/storage-buckets).
- Facts:
  - Render supports web services, private services, background workers, cron jobs, Postgres, Redis-compatible Key Value, service env vars, private networking, logs, and service rollbacks.
  - Render paid Postgres supports PITR with plan-dependent recovery windows; Render Key Value is Redis-compatible and paid instances have disk-backed persistence.
  - Fly apps ship as Docker images and can define multiple process groups for separate web/worker commands; secrets are encrypted and injected into Machines at boot.
  - Fly positions Managed Postgres as production-ready and lists Upstash Redis plus Tigris S3-compatible object storage as storage options.
  - Railway services deploy from GitHub, local source, or Docker images; it supports persistent services, scheduled jobs, private networking, variables, deployment logs, rollback, Postgres/Redis templates, volumes/backups, and S3-compatible storage buckets.
- Pros for LedgerByte API:
  - Fastest developer experience for a controlled private-beta API and worker deployment.
  - Render and Fly both map naturally to separate API/worker processes; Railway can host persistent API services and scheduled jobs.
  - Useful fallback family if AWS is delayed and the team prioritizes speed over platform depth for a limited paid private beta.
- Cons/risks for LedgerByte API:
  - Provider maturity varies across database, Redis/queue, object storage, backup, log retention, alerting, and rollback semantics.
  - Railway database/Redis templates, Render object-storage strategy, and Fly partner-service dependencies need stronger paid-SaaS evidence than the current repo has.
  - Region/data-residency, support plans, incident response, restore drills, secret custody, and queue failure handling need explicit proof before production launch.
- Suitability rating for paid SaaS v1: Backup option.

### Preliminary API Hosting Shortlist

- Recommended shortlist for PROD-A2 Part 3:
  - Primary: AWS ECS Fargate for separate API and worker services.
  - Secondary fallback: DigitalOcean App Platform if AWS day-two ownership, cost, or implementation time blocks the first production API path.
  - AWS fallback: Elastic Beanstalk only if the team wants an AWS-managed app platform and accepts less explicit worker/queue control than ECS.
  - Exclude for now: AWS App Runner as a fresh target because it is closed to new customers; Render/Fly/Railway remain backup/private-beta options until production evidence is stronger.
- Key decision criteria still needed:
  - Production Dockerfile/image strategy, build pipeline, deploy promotion, and rollback owner.
  - API CPU/memory/timeout budget for synchronous PDF generation and Prisma request patterns.
  - VPC/private-network path to PostgreSQL, Redis/queue, object storage, and secrets manager.
  - Prisma connection pooling budget, runtime DB role, migration/admin credential separation, and RLS/Data API decision.
  - Log retention/redaction, health/readiness routing, alerting, support plan, cost guardrails, and region/data-processing posture.
- API and workers should be hosted as separate services, not one combined runtime. They may share a container image later, but API request handling, retries, reports/exports, cleanup, future email work, and future ZATCA jobs need separate scaling, health, shutdown, logs, queue credentials, and deploy controls.
- Production blockers that must stay unresolved until actual provisioning tickets: provider accounts/resources, production Docker image, RDS/PostgreSQL, ElastiCache/Valkey/Redis, object storage buckets, Secrets Manager/KMS/SSM values, ALB/DNS/certificates, live monitors, production env vars, migrations, backups/restores, RLS/runtime DB roles, email sending, ZATCA credentials/network calls, and customer-data movement.

## PROD-A2 Part 5 - Final Verification And Handoff

### Latest Commit Inspected

- `bf7a6dc Update production docs for API hosting decision`
- `HEAD` and `origin/main` both resolved to `bf7a6dcdc1422339edf1649e9343923dc83f9261` before this handoff update.

### PROD-A2 Result

- PROD-A2 is complete as planning/decision documentation only.
- Current API runtime inventory was captured from the repo.
- Official API hosting research was captured in this handoff using official provider docs only.
- [ADR-013 API hosting decision](docs/production/adrs/ADR-013-api-hosting-decision.md) is drafted/proposed; ADR-013 was used because ADR-002 is reserved for the production database provider.
- Production docs were updated to reference ADR-013 and to state that API hosting is proposed, not implemented.
- Implementation has not started: no API provider/service is provisioned, ECS/Fargate is not configured, worker hosting is not configured, no production API deploy was performed, no env vars changed, and no database, Redis, storage, ZATCA, email, accounting logic, or customer data changed.

### ADR-013 Recommendation Summary

- Primary paid SaaS v1 API recommendation: AWS ECS Fargate.
- Host the API and worker as separate ECS Fargate services, even if they share one container image.
- Align with ADR-001: use RDS PostgreSQL, managed Redis/ElastiCache, centralized secrets, and CloudWatch-compatible logging/monitoring.
- Keep DigitalOcean App Platform as secondary fallback if AWS is delayed.
- Keep Elastic Beanstalk as AWS fallback only.
- Do not recommend AWS App Runner for a fresh target because official AWS docs say it is closed to new customers as of April 30, 2026.
- Keep Render/Fly/Railway-style hosting as backup/private-beta only.
- Keep Vercel beta/user-testing/staging only, not final API production hosting.

### Files Changed Across PROD-A2

- `CODEX_HANDOFF.md`
- `docs/production/adrs/ADR-013-api-hosting-decision.md`
- `docs/production/ARCHITECTURE_DECISION_RECORDS.md`
- `docs/production/NEXT_10_PRODUCTION_TICKETS.md`
- `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md`
- `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md`
- `docs/production/PAID_SAAS_V1_GAP_MATRIX.md`
- `README.md`
- `BUG_AUDIT.md`
- No app code changed for PROD-A2. Unrelated web/marketing worktree changes were left untouched and unstaged.

### Checks Run

- `git status --short`
- `git log -1 --oneline`
- `git show --stat --oneline --name-only HEAD`
- `git diff --check`
- `git diff --cached --check` when staged changes existed for this handoff commit.
- Safety wording search with `rg` for accidental claims that production API hosting is implemented, ECS/Fargate is provisioned, production API deploy was performed, Vercel is final production hosting, ZATCA production is enabled, customer data migration happened, or paid SaaS v1 is production-ready.
- Package-script search for link/markdown/docs checks; no dedicated lightweight link-check script was found.
- Lightweight `Test-Path` check passed for the handoff, ADR-013, production planning docs, README, and audit paths.

### Safety Wording Result

- No accidental affirmative claim was found that LedgerByte production API hosting is implemented, ECS/Fargate is provisioned, a production API deploy was performed, Vercel is final production hosting, ZATCA production is enabled, customer data migration happened, or paid SaaS v1 is production-ready.
- Matches found during the safety search were expected negative/proposed wording, plus one provider-summary statement saying Fly positions Managed Postgres as production-ready; that line describes Fly's official service posture, not LedgerByte production readiness.

### Skipped Commands And Why

- Full smoke: skipped because no app code changed and no approved runtime target was requested.
- Full E2E: skipped because no app code changed and deployed/runtime verification was out of scope.
- Migrations: skipped because schema/data mutation was forbidden.
- Seed/reset/delete: skipped because data mutation and destructive operations were forbidden.
- RLS/runtime-role work: skipped because Supabase RLS and runtime DB role changes were forbidden.
- Vercel/Supabase env changes: skipped because env/provider settings changes were forbidden.
- Real ZATCA: skipped because ZATCA behavior, credentials, network calls, and production cutover were forbidden.
- Real email: skipped because email behavior and real sends were forbidden.
- Backups/restores: skipped because backup/restore execution was forbidden.
- App tests: skipped because no app code changed.
- Cloud provisioning/deployment: skipped because provider provisioning and deployment were forbidden.
- Web research: skipped because this thread explicitly forbade new web research.

### Remaining Blockers

- ADR-013 remains proposed only; it is not accepted or implemented.
- API provider/service is not provisioned.
- ECS/Fargate is not configured.
- Worker hosting is not configured.
- No production Dockerfile/image pipeline, task definitions, ALB, VPC, IAM, log groups, cost guardrails, or runbooks exist yet for the production API path.
- Database provider/runtime role, `DIRECT_URL` separation, Supabase RLS/Data API posture, Prisma connection budget, and migration/admin credential split remain unresolved.
- Redis/queue production plan, worker/queue monitoring, retry/dead-letter policy, and queue durability posture remain unresolved.
- Object storage/generated document storage policy, hosted backup/PITR proof, restore drills, monitoring/alerting, incident/support process, email provider gates, and ZATCA production gates remain unresolved.
- No customer data migration or production deploy is approved until a separate future ticket explicitly allows it.

### Recommended Next Implementation Ticket

- `NEXT_10_PRODUCTION_TICKETS.md` currently states that `PROD-A2 API hosting decision` is drafted/proposed at ADR-013, not implemented, and that separate implementation tickets must be opened with explicit approval before any ECS/Fargate configuration, API/worker provisioning, env change, production deploy, database/Redis/storage mutation, migration, backup, ZATCA action, email send, customer-data movement, or app test against production.
- Next numbered planning ticket in `PRODUCTION_IMPLEMENTATION_TICKETS.md`: `PROD-A3 Web hosting decision`.

## PROD-A3 Part 1 - Web Hosting Inventory

- Web framework/runtime: `apps/web` is a Next.js 16.0.0 / React 19.2.4 App Router app in a pnpm workspace; `next.config.ts` enables `reactStrictMode` and `experimental.externalDir` for monorepo workspace access.
- Build/start/export commands: root `build` runs recursive workspace builds; web scripts are `dev` (`next dev --port 3000`), `build` (`next build`), `start` (`next start --port 3000`), `typecheck`/`lint` (`tsc --noEmit`), and Jest tests. No `next export` or static `output: "export"` setting is configured.
- Static vs SSR/server runtime needs: the app uses App Router layouts/pages with no committed `route.ts` handlers under `apps/web`; the root page redirects to `/dashboard`, while authenticated app pages are mostly `"use client"` and fetch data in the browser. Final hosting should assume a normal Next runtime unless PROD-A3 proves static export is safe.
- Required environment variable categories: public API base URL (`NEXT_PUBLIC_API_URL`) for browser/API calls; deployment/e2e URL variables are test-runner inputs, not web runtime secrets. Web should not receive database URLs, SMTP secrets, ZATCA secrets, Supabase service keys, or provider credentials.
- API connectivity assumptions: browser requests call `${NEXT_PUBLIC_API_URL}` and send bearer auth plus `x-organization-id`; API CORS must include every allowed web origin. PDF/document downloads also call the API directly and create browser object URLs.
- Auth/session/browser storage assumptions: access token and active organization id are stored in `localStorage` under `ledgerbyte.*` keys with legacy key fallback; org changes are coordinated through a custom browser event plus `storage` events. There is no committed cookie/session middleware path in the web app.
- Routing behavior: route groups split `(auth)` login/register/password/invite flows from `(app)` authenticated workflows; many dynamic App Router pages use client-side `useRouter`, `useParams`, and `<Link>` navigation. There is a committed catch-all placeholder page under `(app)/[...placeholder]`.
- Asset/static file needs: no committed `apps/web/public` static asset files were found; current frontend assets are primarily Next JS/CSS chunks, Tailwind-generated CSS, lucide icons, and runtime-downloaded PDFs/CSVs from the API.
- CDN/caching considerations: static Next chunks can use host/CDN immutable caching, but authenticated pages and API responses should not be treated as public-cacheable. The shared API client sets request `cache-control: no-store`, `pragma: no-cache`, and `fetch` cache `no-store` by default.
- Preview/staging needs: current Vercel user-testing web project is `ledgerbyte-web-test`, root directory `apps/web`, framework Next.js, source outside root enabled, build command `corepack pnpm --filter @ledgerbyte/web build`, and `NEXT_PUBLIC_API_URL=https://ledgerbyte-api-test.vercel.app`. It remains beta/user-testing/staging only.
- Rollback needs: current Vercel runbook rolls/promotes API first and web second; final web hosting needs independent web rollback, API compatibility checks, asset-cache invalidation expectations, and promotion gates tied to the chosen API target.
- Domain/DNS/TLS needs: production web domain, TLS certificate, DNS ownership, beta-vs-production domain separation, API production URL, and API `CORS_ORIGIN` must be planned together. No production domain binding or DNS/TLS change was performed.
- Current Vercel beta/staging posture: Vercel is useful for the existing beta/user-testing workflow and preview ergonomics, but ADR-001 keeps Vercel beta/user-testing/staging only until a separate production web decision is proposed, accepted, and implemented.
- Known blockers/risks for final web production hosting: Next.js 16 hosting support must be validated against official provider docs in Part 2; final web provider is undecided; static export safety is unproven; `NEXT_PUBLIC_API_URL` is build/runtime-provider sensitive; environment separation, error monitoring, cache policy, security headers, domain/TLS, rollback, support ownership, and deployed E2E/smoke gates remain unresolved; no app code, Vercel settings, env vars, DNS, production deploy, customer data, email, ZATCA, Supabase RLS, or runtime DB roles changed.

## Development Completion Pause - 2026-05-23

- Production hosting research is paused after the PROD-A3 Part 1 inventory.
- AWS remains the known future production direction, but no AWS implementation, provider setup, deployment, env change, database/Redis/storage mutation, migration, backup, email send, ZATCA action, or customer-data movement was performed.
- Vercel remains beta/user-testing/staging only and must not be treated as final production hosting.
- The next workstream is development completion, tracked in [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md).
- The current product state is broad controlled-beta MVP, not paid production SaaS: core AR/AP, banking, inventory, reports, documents, audit, roles, storage readiness, email readiness, and ZATCA groundwork exist, but many production-facing and product-completion gaps remain.
- Top development gaps: full route QA and blocker triage, verification gate hardening, high-risk state-machine QA, auth/session hardening, accountant review, sales/purchase completion, banking parser/reconciliation hardening, inventory accounting policy work, admin/audit alerts, and SaaS business readiness.
- Mock/blocked areas remain intentional: real ZATCA, real customer email sending, live bank feeds, payment gateway capture, object-storage migration execution, backup/restore execution, and automatic inventory accounting expansion.
- Exact next recommended development ticket: `DEV-01 Full route QA and blocker triage`.

## Forbidden Actions For Next Production Thread

- Do not change app code.
- Do not deploy, provision, migrate, seed, reset, delete, or change environment variables.
- Do not change Supabase RLS, runtime DB roles, Vercel settings, ZATCA behavior, emails, accounting logic, or customer data.
- Do not accept or implement ADR-001 or ADR-013 without explicit approval.
- Do not research the web unless the user explicitly starts a research thread.
- Do not touch unrelated web/marketing worktree changes.

## Next Thread Prompt

`DEV-01 Full route QA and blocker triage`
