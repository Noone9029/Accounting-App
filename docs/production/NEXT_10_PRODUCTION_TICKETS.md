# Next 10 Production Foundation Tickets

Planning date: 2026-05-22

This plan orders the first production-foundation tickets by risk reduction. It is planning only. Do not run full smoke, full E2E, migrations, seed/reset/delete, Vercel/Supabase env changes, RLS/runtime role work, real email, real ZATCA, or backups/restores from this document.

Current state: controlled beta/user-testing. Vercel is beta/user-testing only, not final production hosting. LedgerByte is not production-launched. Real ZATCA production compliance is not enabled.

## 2026-06-12 Production Trust Foundation Gate Routing

- The static production-trust audit confirms the next execution lane should begin with object-storage proof planning and safe non-production validation.
- The audit did not change production posture: LedgerByte remains controlled beta/user-testing only, not production-ready, not paid SaaS ready, not official VAT filing ready, and not ZATCA compliant.

## Current PROD-A2 Status

- [ADR-013 API hosting decision](adrs/ADR-013-api-hosting-decision.md) is drafted/proposed.
- Proposed API direction: AWS ECS Fargate for paid SaaS v1, with API and worker hosted as separate services even if they share one image.
- Fallback posture: DigitalOcean App Platform is secondary fallback, Elastic Beanstalk is AWS fallback only, AWS App Runner is not recommended because official AWS docs say it is closed to new customers as of April 30, 2026, and Render/Fly/Railway-style hosting is backup/private-beta only.
- Vercel remains beta/user-testing/staging only, not final API production hosting.
- Implementation has not started: no API provider/service is provisioned, ECS/Fargate is not configured, worker hosting is not configured, no production API deploy was performed, no env vars changed, and no database, Redis, storage, ZATCA, email, accounting logic, or customer data changed.

## 1. Hosting ADR

- Ticket: `PROD-A1 Final hosting ADR`
- Why now: every production path depends on whether web, API, workers, queues, storage, logs, and secrets remain split across providers or move to a new platform.
- Prerequisites: current deployment docs, production roadmap, cost/support expectations, known worker/queue and DB constraints.
- Current status: [ADR-001 final production hosting](adrs/ADR-001-final-production-hosting.md) is drafted/proposed and recommends an AWS production stack for paid SaaS v1. [ADR-013 API hosting decision](adrs/ADR-013-api-hosting-decision.md) is also drafted/proposed and recommends AWS ECS Fargate for the paid SaaS v1 API, with separate API and worker services.
- Expected output: review/handoff for the proposed ADR, then separate approved implementation tickets before any provider, env, DNS, database, storage, queue, email, or ZATCA mutation.
- Safe validation method: docs-only architecture review; no provider mutation; `git diff --check`.
- What not to touch: Vercel projects, DNS, Supabase, env vars, deploy settings, production domains, traffic routing, migrations, backups, app tests, real email, or ZATCA behavior.

## 2. Least-Privilege Runtime DB Role Validation

- Ticket: `PROD-B1 Least-privilege Prisma runtime role`
- Why now: paid SaaS must not run ordinary API traffic with overpowered database credentials.
- Prerequisites: safe environment secret mutation path, staging/user-testing clone approval, rollback plan, credential owner.
- Expected output: grant design, validation runbook, rollback plan, and cutover checklist.
- Safe validation method: planning pass first; future validation only against approved non-production target with metadata-only evidence.
- What not to touch: current Vercel env vars, production DB roles, Supabase RLS, migrations, seed/reset/delete.

## 3. Hosted Backup/PITR Proof

- Ticket: `PROD-C1 Hosted backup/PITR proof`
- Why now: production cannot launch without proof that hosted data can be recovered.
- Prerequisites: database provider decision, non-production environment, RPO/RTO target, redaction rules.
- Expected output: PITR/backup proof plan with evidence format and owner sign-off.
- Safe validation method: future approved non-production proof using counts and metadata only.
- What not to touch: production backups, restores, customer data, destructive reset, DB URLs.

## 4. Object Storage Validation

- Ticket: `PROD-C3 Object storage backup proof` and `PROD-C4 Generated document storage policy`
- Why now: attachments and generated documents are a production data-risk area, and DB/base64 is not the final storage posture.
- Prerequisites: object storage ADR, non-production bucket, retention policy draft, generated document inventory.
- Expected output: bucket validation plan, backup/restore proof format, generated document storage policy.
- Safe validation method: future non-production bucket test with synthetic files and metadata-only evidence.
- What not to touch: customer attachments, generated PDF bodies, bucket lifecycle on production, file migration executor.

## 5. Monitoring Stack Selection

- Ticket: `PROD-D1 Uptime checks`, `PROD-D2 API error monitoring`, and `ADR-007 Monitoring stack`
- Why now: paid tenants need visible failure detection before workers, billing, email, or ZATCA jobs go live.
- Prerequisites: hosting ADR direction, support owner, redaction policy, expected alert recipients.
- Expected output: monitoring ADR plus endpoint/error/alert matrix.
- Safe validation method: docs review and future synthetic non-production monitor only.
- What not to touch: production monitors, app SDK code, request/response body logging, provider secrets.

## 6. Incident/Support Runbook

- Ticket: `PROD-D7 Incident response process` and `PROD-D8 Support process`
- Why now: production issues need owners, severity definitions, customer messaging, and privacy-safe support handling before paid users arrive.
- Prerequisites: support channel decision, monitoring draft, rollback plan, privacy policy draft.
- Expected output: incident response runbook, support process, severity matrix, escalation map, postmortem template.
- Safe validation method: tabletop scenario with synthetic data only.
- What not to touch: real customer accounts, production alerts, support tool integrations, customer data.

## 7. Email Provider Production Validation Plan

- Ticket: `PROD-D5 Email delivery monitoring` and `ADR-005 Email provider`
- Why now: invites, password resets, invoices, statements, and support messages need reliable provider evidence before paid use.
- Prerequisites: provider shortlist, domain ownership plan, signed webhook policy, suppression handling, support owner.
- Expected output: email provider ADR, non-production relay test plan, webhook validation plan, monitoring evidence plan.
- Safe validation method: future allowlisted non-production test-send only after explicit approval.
- What not to touch: real email sends, production DNS, provider live keys, customer recipients.

## 8. Billing/Legal Ownership Plan

- Ticket: `PROD-E1 Subscription plans`, `PROD-E2 Payment provider decision`, `PROD-F1 Terms of Service`, and `PROD-F2 Privacy Policy`
- Why now: pricing, payment, trial, refund, privacy, and ToS choices shape tenant provisioning, support, and public launch wording.
- Prerequisites: product packaging direction, legal owner, finance owner, support model, ZATCA limitation wording.
- Expected output: owner map, billing/legal decision schedule, first drafts/outlines, and blocked-decision list.
- Safe validation method: docs-only review with legal/finance owners.
- What not to touch: billing provider accounts, payment keys, pricing page code, customer contracts.

## 9. ZATCA Production Onboarding Plan

- Ticket: `PROD-G1 Sandbox OTP/onboarding`, `PROD-G2 CSID flow`, and `ADR-009 ZATCA production integration strategy`
- Why now: ZATCA production claims are the largest Saudi-first domain blocker and need sandbox/specialist sequencing before implementation.
- Prerequisites: official docs, ZATCA specialist availability, secrets/KMS plan, sandbox access owner, accountant review.
- Expected output: sandbox onboarding runbook, CSID lifecycle design, compliance claim gate, evidence/redaction rules.
- Safe validation method: docs-only review until sandbox OTP and explicit approval exist.
- What not to touch: real OTP, CSID request, signing, clearance/reporting, PDF/A-3, real network calls, signed XML, QR payloads.

## 10. Full Smoke/E2E Controlled Rerun Plan

- Ticket: `PROD-H3 Full smoke` and `PROD-H4 Full deployed E2E`
- Why now: full verification is pending, but it must be run only against a safe target with known data and credentials.
- Prerequisites: approved non-production target, test account, reset policy, data boundaries, credential owner, artifact retention plan.
- Expected output: safe execution runbook with commands, pass/fail criteria, cleanup, and reporting format.
- Safe validation method: planning only now; future approved `corepack pnpm smoke:accounting` and deployed E2E run when target is ready.
- What not to touch: full smoke now, full E2E now, migrations, seed/reset/delete, production data, production credentials.

## Next Ticket Recommendation

`Production trust implementation ticket 1: object storage proof plan and safe non-production validation`
