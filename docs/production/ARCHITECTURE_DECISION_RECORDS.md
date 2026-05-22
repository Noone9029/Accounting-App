# LedgerByte Production Architecture Decision Records

Planning date: 2026-05-22

This index tracks production ADRs required before LedgerByte moves from controlled beta/user-testing toward paid Saudi-first SaaS v1. It is planning only. No provider, infrastructure, database, billing, email, or ZATCA change is made by this document.

Status values: `proposed`, `pending`, `accepted`, `rejected`.

## ADR Index

| ADR | Decision needed | Options | Criteria | Current recommendation if any | Owner | Due stage | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ADR-001 Final production hosting provider](adrs/ADR-001-final-production-hosting.md) | Choose final production hosting separate from current Vercel beta/user-testing deployment. | AWS production stack; DigitalOcean production stack; Render/Fly/Railway-style managed app hosting; hybrid Vercel/static web plus production API/workers/DB provider. | API runtime fit, worker support, rollback, logs, secrets, DB connectivity, cost, support maturity, operational load, Saudi/GCC customer trust, ZATCA readiness. | Proposed: AWS production stack for paid SaaS v1. Vercel remains beta/user-testing/staging only; implementation has not started, no provider is provisioned, and no production deploy was performed. | infra/product/security | paid private beta | proposed |
| ADR-002 Production database provider | Decide production-intended database provider and operating model. | Supabase Postgres; managed Postgres elsewhere; cloud-native Postgres; self-managed Postgres. | PITR, restore, connection pooling, least privilege, auditability, support, region, cost, migration path. | Pending. Current Supabase user-testing database is not enough proof for production launch. | infra/backend/security | paid private beta | pending |
| ADR-003 Object storage provider | Choose provider for attachments, generated documents, exports, and future ZATCA artifacts. | S3-compatible storage; Supabase Storage; cloud object storage; provider bundled with hosting. | Private buckets, signed access, lifecycle, backup/restore, scanning path, SDK support, audit logs, cost. | Pending. Validate a real non-production bucket before migration work. | infra/backend/security/product | paid private beta | pending |
| ADR-004 Queue/worker hosting | Decide queue and worker hosting for email, exports, cleanup, reports, and future ZATCA jobs. | Managed Redis/BullMQ workers; platform-native queues; container workers; managed job service. | Retry control, dead-letter support, observability, worker isolation, secrets, cost, failure recovery. | Pending. Keep production workers disabled until queue operations and monitoring are defined. | backend/infra/ops | public production | pending |
| ADR-005 Email provider | Choose production email provider and event monitoring model. | Resend; SendGrid; Postmark; SES; SMTP provider; manual/no production email for private beta. | Domain validation, webhook signing, bounce/suppression handling, deliverability, API fit, support, cost. | Pending. Mock/default email remains the safe baseline until non-production relay evidence exists. | backend/ops/support/product | paid private beta | pending |
| ADR-006 Billing provider | Decide billing provider or manual invoicing path. | Stripe; manual invoices and bank transfer; local payment provider; deferred billing for private beta. | Saudi customer fit, receipts/invoices, refund handling, webhook complexity, support workflow, legal/tax review. | Pending. Paid private beta can choose manual invoicing only if legal/support process is explicit. | product/finance/legal/backend | paid private beta | pending |
| ADR-007 Monitoring stack | Choose monitoring stack for uptime, API errors, workers, queues, email, backups, and ZATCA jobs. | Sentry plus uptime provider; Datadog; Better Stack; Grafana/Prometheus; hosting-provider monitoring. | Error grouping, redaction, alert routing, uptime regions, worker metrics, cost, on-call fit. | Pending. Select before paid tenants are onboarded. | ops/infra/backend/security | paid private beta | pending |
| ADR-008 Secrets management | Choose secrets/KMS and rotation strategy. | Hosting provider env manager; cloud secrets manager; Doppler/1Password; KMS-backed provider; hybrid. | Access control, rotation, audit logs, emergency revoke, ZATCA key custody, developer ergonomics, cost. | Pending. ZATCA key and CSID custody should drive the stricter side of the decision. | security/infra/backend | paid private beta | pending |
| ADR-009 ZATCA production integration strategy | Decide sandbox-to-production ZATCA integration approach and claim gate. | Sandbox-first direct integration; specialist-guided implementation; approved third-party e-invoicing provider; defer production ZATCA claim. | Official SDK validation, key custody, CSID lifecycle, clearance/reporting, retry/audit evidence, specialist sign-off. | Pending. Current recommendation is to keep production compliance claim blocked until sandbox evidence and specialist review exist. | backend/accounting/security/legal | ZATCA gate | pending |
| ADR-010 Raw bank statement archive policy | Decide whether raw imported bank statement files are retained, redacted, encrypted, or discarded. | Do not retain raw files; retain encrypted originals; retain normalized rows only; retain redacted archive. | Privacy, audit value, parser debugging, customer export, retention law review, storage cost, deletion workflow. | Pending. Do not store raw customer bank files by default until policy is accepted. | product/legal/security/backend | paid private beta | pending |
| ADR-011 RLS/Data API strategy | Decide Supabase Data API and RLS posture. | Disable exposed Data API; enable RLS on public tables; move to locked schemas; hybrid API-only plus selected RLS. | Tenant isolation, operational complexity, Prisma compatibility, support burden, security review, future integrations. | Pending. User-testing grants were mitigated, but broad RLS remains unresolved. | security/backend/infra | public production | pending |
| ADR-012 Least-privilege runtime DB role | Decide runtime DB role grants, migration/admin separation, and cutover sequence. | Dedicated Prisma runtime role; schema-scoped role; read/write split; current role until safe mutation path. | Least privilege, Prisma compatibility, migration safety, rollback, secret rotation, Vercel env mutation safety. | Proposed: validate a dedicated Prisma runtime role in staging/user-testing clone before production. | backend/security/infra | paid private beta | proposed |

## ADR Template

Use this structure when expanding an ADR:

```markdown
# ADR-000: Title

Status: pending
Owner: discipline/name
Due stage: paid private beta
Date opened: YYYY-MM-DD

## Decision Needed

State the production decision in one paragraph.

## Context

Describe the current controlled-beta posture and why this must be decided before paid/public launch.

## Options

| Option | Pros | Cons | Unknowns |
| --- | --- | --- | --- |

## Criteria

- Runtime fit
- Security and tenancy impact
- Operations and rollback
- Cost and support
- Compliance/legal/accounting impact

## Recommendation

Record the current recommendation, or state that no recommendation is ready.

## Acceptance Criteria

- Decision is reviewed by the named owner disciplines.
- Production and rollback implications are documented.
- Follow-up implementation tickets are linked.
- No secrets, customer data, request/response bodies, signed XML, QR payloads, or attachment bodies are copied into the ADR.
```

## Decision Discipline

- ADR acceptance does not itself approve production mutations.
- ADR-001 is drafted/proposed only; it did not perform Supabase/Vercel env changes, migrations, backups, app tests, real email, ZATCA actions, provider provisioning, or production deploys.
- Implementation tickets must still include target environment, rollback, validation, and redaction plans.
- ADRs touching ZATCA, retention, privacy, billing, or accounting claims require specialist, legal, or accountant review as appropriate.
