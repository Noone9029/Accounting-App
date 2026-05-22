# ADR-013: API Hosting Decision

status: proposed
date: 2026-05-23

## Context

LedgerByte is in controlled beta/user-testing. Vercel remains the beta/user-testing/staging path only and is not accepted as final API production hosting. This ADR narrows the API runtime decision from [ADR-001 final production hosting](ADR-001-final-production-hosting.md) and from the `PROD-A2` handoff research.

The production API target must run the NestJS/Express/Prisma API on a predictable Node/container runtime, support a separate worker process, connect safely to PostgreSQL and Redis/queue infrastructure, expose health/readiness checks, centralize secrets, produce useful logs/metrics, and support rollback without mutating current beta infrastructure.

This ADR is planning-only. It does not deploy, provision, migrate, seed, reset, delete, change environment variables, change Supabase RLS, change runtime database roles, change Vercel settings, change ZATCA behavior, change email behavior, change accounting logic, or move customer data.

## Relationship To ADR-001 Final Production Hosting

[ADR-001](ADR-001-final-production-hosting.md) proposes an AWS production stack for paid SaaS v1 while keeping Vercel beta/user-testing/staging only. This ADR accepts that direction for the API slice and recommends an AWS container runtime for the NestJS API and future worker services.

This ADR does not accept or implement ADR-001. It documents the proposed API hosting decision that future implementation tickets must still validate through approved non-production provisioning, cost review, security review, rollback planning, smoke checks, and owner signoff.

## Current API Runtime Summary From PROD-A2 Part 1

- `apps/api` is a NestJS 11 API on Express 5, TypeScript/CommonJS, Prisma, and a Node-oriented runtime.
- API scripts include `build`, `start`, `dev`, Prisma generation/migration commands, and smoke commands; current Vercel beta deployment uses wrapper/serverless files and is not final production hosting.
- Runtime environment categories include `DATABASE_URL`, `DIRECT_URL`, Prisma tuning, JWT, CORS/web URL, API port, email gates, ZATCA gates, storage provider settings, S3-compatible settings, and deployment target flags.
- Prisma uses PostgreSQL through `DATABASE_URL` plus a separate `DIRECT_URL`; `/readiness` depends on a safe database connectivity check.
- `REDIS_URL` exists in examples/local Compose, but active BullMQ production workflows are not yet implemented; Redis/queue remains production groundwork.
- Attachments default to database/base64 with optional S3-compatible storage for new uploads; generated documents are currently database-backed.
- PDF generation runs in process, so API hosting must budget CPU, memory, and request duration for synchronous PDF endpoints.
- ZATCA and email production behavior remain gated/disabled by default and require separate approval before live use.
- `/health` is lightweight and DB-free; `/readiness` checks database connectivity and returns safe JSON on failure.
- No production Dockerfile was found; future implementation must create an approved production image/run-command plan.

## Official Research Summary From PROD-A2 Part 2

- AWS ECS Fargate official docs show container task/service support, `awsvpc` networking, load balancer health checks, Secrets Manager injection into container environment variables, CloudWatch logging, Service Auto Scaling, and deployment circuit breaker rollback.
- AWS App Runner official docs show source/image service hosting, health checks, VPC connectors, Secrets Manager/SSM references, and CloudWatch logs, but also state App Runner is closed to new customers starting April 30, 2026. It is not suitable as a fresh production target.
- AWS Elastic Beanstalk official docs show Node.js and Docker support, environment secrets from Secrets Manager/SSM, health monitoring, deployment policies, and deployment logs, but it gives less explicit control than ECS for separate API and worker services.
- DigitalOcean App Platform official docs show Git/container services, workers, jobs, encrypted env vars, health checks, log destinations, rollback to recent successful deployments, and managed PostgreSQL; its Valkey/Redis-compatible offering has a backup/PITR gap for queue durability.
- Render/Fly/Railway-style official docs show managed web services, background workers or process groups, secrets/env vars, logs, rollbacks, PostgreSQL/Redis-like services, and storage options, but their production evidence varies by data service, backup/restore model, support tier, and region/data-residency posture.

## Decision Drivers

- Production reliability.
- NestJS/Express runtime compatibility.
- Container support.
- Worker separation.
- PostgreSQL/RDS connectivity.
- Redis/queue connectivity.
- Secrets management.
- Health checks.
- Deployment rollback.
- Monitoring/logging.
- Operational complexity.
- Cost predictability.
- Small-team maintainability.
- ZATCA/email readiness.
- Paid SaaS v1 suitability.

## Options Considered

### Option A - AWS ECS Fargate

Run the API and worker as separate ECS services on Fargate, behind an Application Load Balancer for the API, with private VPC connectivity to RDS PostgreSQL, ElastiCache/managed Redis, S3/object storage, centralized secrets, and CloudWatch-compatible logs/metrics.

### Option B - AWS Elastic Beanstalk

Run the API on Elastic Beanstalk using either the Node.js platform or a Docker deployment, then model workers through a separate Beanstalk environment or another AWS service.

### Option C - DigitalOcean App Platform

Run API and worker components on App Platform, using managed PostgreSQL, Redis-compatible Valkey or another Redis provider, encrypted environment variables, health checks, logs, and App Platform rollback.

### Option D - AWS App Runner

Run the API as an App Runner service with container/source deployment, health checks, VPC connector, Secrets Manager/SSM references, and CloudWatch logs.

### Option E - Render/Fly/Railway-Style Managed API Hosting

Use a developer-friendly managed app platform for API and worker processes with provider-managed or partner PostgreSQL/Redis/object-storage services.

### Option F - Vercel API Functions

Continue using the current Vercel wrapper/serverless pattern for the API.

## Comparison Table

| Option | Fit | Strengths | Risks | Suitability |
| --- | --- | --- | --- | --- |
| AWS ECS Fargate | Best fit for API plus separate worker services. | Strong container model, VPC/RDS/ElastiCache connectivity, task-level sizing, ALB health checks, Secrets Manager, CloudWatch, scaling, and rollback controls. | More setup: Dockerfile, ECR, ECS services, ALB, IAM, VPC, cost guardrails, CI/CD, and runbooks. | Strong candidate. |
| AWS Elastic Beanstalk | Reasonable AWS fallback for API hosting. | Node.js/Docker support, environment health, deployment policies, and easier AWS onboarding than ECS. | Less explicit service/task control for workers and queue operations; still needs platform ownership and rollback proof. | Backup option. |
| DigitalOcean App Platform | Practical secondary fallback. | Simple services/workers, encrypted env vars, health checks, rollback, managed PostgreSQL, logs, and lower operational surface. | Weaker AWS-style IAM/KMS/VPC depth; Valkey backup/PITR gap; needs stronger restore, alerting, support, and region evidence. | Possible candidate. |
| AWS App Runner | Technically close to the API shape. | Managed container/source services, health checks, VPC connector, secrets references, and CloudWatch logs. | Official docs say closed to new customers from April 30, 2026; no-new-features posture is a production foundation risk. | Not recommended for now. |
| Render/Fly/Railway-style hosting | Fast private-beta path. | Good developer ergonomics, web/worker patterns, secrets, logs, rollbacks, and managed/partner data services. | Production maturity varies across backups, Redis/queue durability, object storage, support, regions, and restore evidence. | Backup/private-beta only. |
| Vercel API Functions | Current beta path only. | Existing user-testing workflow and wrapper already exist. | Not final production API hosting; request/runtime model is a poor fit for workers, queues, Prisma pooling, and long-running jobs. | Not recommended for production API. |

## Recommendation

Primary recommendation for paid SaaS v1: AWS ECS Fargate for the API.

Host the API and worker as separate services, even if they share one container image. Use RDS PostgreSQL, managed Redis/ElastiCache, centralized secrets, and CloudWatch-compatible logging/monitoring per ADR-001.

Keep DigitalOcean App Platform as the secondary fallback if AWS is delayed by day-two ownership, cost, or implementation timeline. Keep Elastic Beanstalk as an AWS fallback only. Do not recommend AWS App Runner because PROD-A2 Part 2 recorded that official AWS docs say it is closed to new customers as of April 30, 2026. Keep Render/Fly/Railway-style hosting as backup/private-beta only, not the default paid SaaS v1 path. Keep Vercel beta/user-testing/staging only and not final API production hosting.

## Proposed API Hosting Architecture

- API service: one ECS Fargate service running the NestJS/Express API behind an Application Load Balancer.
- Runtime command: future implementation should build the API and run the compiled Node entrypoint, matching the current `start` posture without relying on the Vercel wrapper.
- Shared image or separate build decision: start with one production container image for API and worker if dependencies and build artifacts are shared; run different ECS task definitions or commands for API and worker. Split into separate images only if dependency size, security boundaries, release cadence, or operational ownership justify it.
- Environment variable categories without exposing values: database runtime URL, migration/direct URL, Prisma pooling/transaction tuning, JWT/auth, CORS/web URL, API port, deployment target, email provider/gates, ZATCA adapter/gates, object storage provider, S3-compatible bucket/endpoint/region/credential references, Redis/queue URL, logging/monitoring, and feature flags.
- Database connection path: ECS tasks should connect privately through the VPC to RDS PostgreSQL or the approved PostgreSQL provider. Prisma connection limits, transaction behavior, runtime role grants, and migration/admin credential separation remain follow-up decisions.
- Redis/queue path: workers and API should connect privately to ElastiCache/managed Redis or the approved queue backend. Redis queue naming, retry/dead-letter policy, lock timeouts, dashboards, and alerts are not decided here.
- Storage/PDF dependency assumptions: API continues to support current database-backed generated document behavior until object storage policy and migration tickets are approved; synchronous PDF endpoints need explicit CPU/memory/request-timeout sizing.
- Health check endpoint expectations: ALB should use the lightweight `/health` endpoint for service liveness. `/readiness` should be monitored separately for database dependency health and alerting, not blindly used to terminate healthy API containers during transient database incidents until the runbook defines that behavior.
- Deployment promotion path: build image in CI, push to approved registry, deploy to an approved non-production ECS service, run health/readiness and smoke checks against synthetic data, then promote only through an approved production gate.
- Rollback path: use ECS deployment circuit breaker and/or a runbooked rollback to the last known-good task definition/image. Migration rollback, env rollback, queue pause/drain, DNS, and customer communication must be documented before production cutover.
- No customer data migration until separately approved.
- No ZATCA production cutover until a separate ZATCA gate passes.

## Proposed Worker Hosting Architecture

- Worker service: one or more ECS Fargate services without public ingress.
- Runtime scope: email retries, reports/exports, cleanup, future queue-backed tasks, and future ZATCA work only after each feature has explicit approval.
- Scaling: worker desired count and concurrency should be independent from API request scaling.
- Shutdown: workers need graceful shutdown, queue drain/pause behavior, idempotency, and retry/dead-letter policy before live queue processing.
- Connectivity: workers need private access to PostgreSQL, Redis/queue backend, object storage, secrets, email provider secrets only after email approval, and future ZATCA secrets only after ZATCA approval.
- Observability: worker heartbeat, crash, queue lag, failed job, retry exhaustion, and dead-letter growth should be monitored before paid production use.

## Environment And Secrets Approach

- Use centralized secrets management aligned with ADR-001, preferably AWS Secrets Manager and/or SSM Parameter Store for AWS-hosted API and worker tasks.
- Store only secret references in task definitions where possible; do not commit secrets, copy secret values into docs, or expose secrets in logs.
- Keep runtime database credentials separate from migration/admin credentials.
- Keep local, user-testing, paid private beta, production, and ZATCA-gated environments separated by credentials, domains, data policy, email mode, ZATCA mode, backup mode, and promotion gates.
- Secret rotation must include redeploy/restart behavior for API and worker tasks, plus an emergency revoke path.

## Health And Readiness Checks

- `/health` should remain lightweight, DB-free, and safe for load balancer health checks.
- `/readiness` should remain dependency-aware and safe for monitoring database connectivity.
- Future non-production validation should verify API root metadata, `/health`, `/readiness`, database connectivity failure behavior, and no secret leakage.
- Worker readiness should be represented separately through worker heartbeat/metrics, not through the public API health endpoint.

## Deployment And Rollback Expectations

- Future implementation must define production Dockerfile, image registry, task definitions, service definitions, IAM roles, VPC/subnet/security groups, ALB target groups, log groups, and promotion gates.
- Deployments should be staged through approved non-production targets before production.
- Rollback must cover application task definition/image rollback, failed deployment detection, environment/secret rollback, worker pause/drain, queue behavior, migration decision tree, and support/status messaging.
- No production deployment, DNS change, provider provisioning, customer data migration, or production smoke is approved by this ADR.

## Monitoring And Logging Expectations

- API and worker logs should go to CloudWatch-compatible logging with retention, redaction, and no request/response body logging by default.
- Monitor API uptime, API errors, `/health`, `/readiness`, worker heartbeat, worker crashes, queue lag, failed jobs, database connectivity, Redis connectivity, object storage synthetic access, email job health, and future ZATCA job health.
- Alert routing, severity definitions, escalation owners, and support response expectations remain follow-up work.
- Production monitoring must use synthetic/sanitized evidence and must not expose customer data, signed XML, QR payloads, email contents, attachment bodies, or generated PDF bodies.

## Risks

- ECS/Fargate has higher initial setup and day-two operational complexity than App Platform-style hosting.
- No production Dockerfile or ECS image pipeline exists yet.
- Prisma connection pooling, RDS sizing, API task count, and worker concurrency are not sized.
- Worker/queue code is not fully production-wired, so Redis/queue operations require separate design.
- Object storage and generated document migration are unresolved; current DB/base64 behavior may not scale.
- ZATCA and email readiness depend on future gates and must not be enabled as part of API hosting.
- Cost can drift without budgets, alarms, instance/task sizing, log retention, and owner review.
- Region/data-processing and Saudi/GCC customer trust questions remain open.

## Open Questions

- Which AWS region, account layout, VPC topology, support plan, and cost ceiling should be used?
- What ECS task CPU/memory and autoscaling policy are appropriate for synchronous PDF generation and normal API traffic?
- What Prisma connection budget should be assigned per task, and what RDS/pooler configuration is acceptable?
- Should the first worker service use the same image and different command, or should it split into a separate worker image?
- What non-production target will prove health/readiness, rollback, queue, object storage, and smoke behavior?
- Which monitoring stack is enough: CloudWatch-only first, CloudWatch plus Sentry, or another provider?
- What RPO/RTO, backup/PITR, restore-drill, and object-storage evidence will paid SaaS v1 require?
- Who owns day-two AWS operations, incident response, cost monitoring, and customer support escalation?

## What Is Explicitly Not Decided

- This ADR does not provision ECS, Fargate, RDS, ElastiCache, S3, Secrets Manager, ALB, DNS, certificates, monitors, or log drains.
- This ADR does not create a production Dockerfile, CI/CD pipeline, task definition, service definition, IAM policy, VPC, subnet, or security group.
- This ADR does not choose exact AWS region, service tiers, task sizes, autoscaling thresholds, cost budgets, or support plan.
- This ADR does not decide production database provider details, least-privilege runtime role, `DIRECT_URL`/admin/migration separation, Supabase RLS, or Data API posture.
- This ADR does not decide the production web hosting implementation for Next.js 16.
- This ADR does not decide object storage provider, generated document storage policy, backup/PITR proof, or restore drill.
- This ADR does not enable email sending, select an email provider, or configure provider webhooks.
- This ADR does not approve production ZATCA signing, CSID, clearance/reporting, PDF/A-3, QR payloads, real ZATCA network calls, or production compliance claims.
- This ADR does not approve customer data migration, production deployment, DNS cutover, env-var mutation, migrations, seed/reset/delete, backups/restores, or app tests against production.

## Follow-Up Tickets

- `PROD-A2 Part 4: update production docs for API hosting decision` should link this ADR from the allowed production index/ticket docs.
- `PROD-A3 Web hosting decision` should decide the production web path separately from the API decision.
- `PROD-A4 Worker/queue hosting decision` should define worker deployment, scaling, shutdown, retry, dead-letter handling, and queue ownership.
- `PROD-A5 Redis/BullMQ production plan` should decide managed Redis/queue operations, naming, lock timeouts, dashboards, alerts, and retention.
- `PROD-A6 Environment separation` should formalize local, user-testing, paid private beta, production, and ZATCA-gated boundaries.
- `PROD-A7 Rollback plan` should write the deploy, migration, env, queue, DNS, and customer-communication rollback runbook.
- `PROD-B1 Least-privilege Prisma runtime role` and `PROD-B2 DIRECT_URL/admin/migration separation` should design database credential safety before production use.
- `PROD-B6 Secrets management plan` should choose final secrets/KMS and rotation/custody policy.
- `PROD-C1 Hosted backup/PITR proof`, `PROD-C2 Restore drill in hosted environment`, `PROD-C3 Object storage backup proof`, and `PROD-C4 Generated document storage policy` should prove data recovery and storage safety.
- `PROD-D1` through `PROD-D8` should define uptime, API error, worker, queue, email, ZATCA job monitoring, incident response, and support process.
- `PROD-G1` through `PROD-G8` should keep ZATCA production behavior behind the separate ZATCA gate.
