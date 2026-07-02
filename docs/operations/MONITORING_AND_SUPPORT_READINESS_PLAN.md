# Monitoring and Support Readiness Plan

Status: pre-provider plan
Date: 2026-07-02

## Goal

Prepare the operational signals and support process needed for controlled beta expansion and later paid beta, without selecting a production monitoring provider in this PR.

## Required Signals

- API health and readiness.
- Web availability.
- Database connectivity and migration head.
- Redis/queue readiness when queues are active.
- Email outbox backlog and failure rate.
- Backup readiness and restore evidence age.
- Storage provider readiness.
- ZATCA disabled/no-network status.
- UAE ASP disabled/no-network status.
- Queue lag and failures.
- Server error logs.
- Uptime checks.
- Support inbox and triage ownership.

## Readiness Levels

| Level | Criteria |
| --- | --- |
| local/dev | local health checks and targeted tests pass. |
| controlled beta | preview/test stack has health/readiness, support owner, incident runbook, and issue log. |
| paid private beta | monitoring provider/log drain, alerting, backup evidence, support SLA, and escalation path are active. |
| production | on-call, incident review process, retention/legal controls, uptime checks, and customer comms process are proven. |

## Current Boundaries

- No monitoring vendor selected.
- No production alerts created.
- No customer-support automation or real email sending enabled.

## Local Diagnostics Added

- Command: `corepack pnpm monitoring:support-readiness`
- Test: `corepack pnpm test:monitoring-support-readiness`
- Evidence: `docs/operations/evidence/MONITORING_SUPPORT_READINESS.md`
- JSON evidence: `docs/operations/evidence/MONITORING_SUPPORT_READINESS.json`

Current diagnostic status: `MONITORING_SUPPORT_PARTIAL_READY`.

The diagnostic is deterministic and source/docs-only. It does not start the app server, connect to a database, call a network endpoint, send email, call providers, run storage/signed-URL operations, print secrets, print customer data, or mutate hosted infrastructure.

## Current Partial Areas

- Web route monitoring remains documented smoke coverage, not production uptime monitoring.
- Email outbox monitoring exists as readiness/metadata surfaces, but provider-backed alerting is blocked.
- Queue/worker readiness is limited to email retry-worker planning; generic queue monitoring is future work.
- Object storage proof remains blocked until approved non-production bucket credentials and proof execution exist.
- UAE ASP readiness remains provider-blocked; no real ASP access or network behavior is active.
