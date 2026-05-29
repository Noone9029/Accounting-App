# DEV-08M AP Cleanup Executor Preflight

## Scope

- Task: `DEV-08M Part 7: AP cleanup executor preflight`.
- Latest commit inspected: `74c31221 Plan DEV-08M duplicate output policy`.
- Marker for this arc: `DEV08M-AP-20260529T000000`.
- Runtime cleanup performed: no.
- Code implementation performed in this preflight: no.
- Deletion/update/archive/revoke, migration, seed/reset/delete, deploy, environment/provider change, real email, real ZATCA, backup/restore, production, beta, or customer-data action performed: no.

## Inspection Summary

- DEV-08M Part 1 set the cleanup strategy: refuse non-local targets, require an explicit marker, default to dry-run, print counts only, avoid body/secret/customer data output, and require a later separate approval before any destructive delete/update/archive/revoke behavior exists.
- DEV-08M Part 2 and Part 3 proved the local marker-scoped count-only inventory is useful and repeatable, but both steps required temporary scripts that were deleted after evidence capture.
- Existing `DEV-04` fixture runner patterns provide tested examples for explicit local target classification, marker validation, hosted-target refusal, generic `DATABASE_URL` avoidance, JSON summaries, and package-script guardrails.
- `scripts/user-testing-cleanup-plan.cjs` is remote/user-testing oriented and performs authenticated API reads. It is not an appropriate base for DEV-08M AP local fixture cleanup because DEV-08M forbids production/beta/customer data and does not need login or hosted API behavior.

## Decision

Implement a committed DEV-08M AP cleanup planner in Part 8.

The selected scope is a local-only, dry-run-only planner script. It should make the DEV-08M Part 2/3 inventory repeatable without creating any delete, update, archive, revoke, email, ZATCA, login, export, download, or body-reading path.

## Part 8 Recommended Scope

- Add `apps/api/scripts/dev08m-ap-cleanup-planner.ts`.
- Add `apps/api/scripts/dev08m-ap-cleanup-planner.spec.ts`.
- Add an API package script, for example `cleanup:dev08m:ap`, and optional root helper scripts for plan/dry-run only.
- Require the exact marker `DEV08M-AP-20260529T000000`.
- Accept a database URL only from an explicit `--database-url` flag or a dedicated `LEDGERBYTE_DEV08M_DATABASE_URL` environment variable.
- Ignore generic `DATABASE_URL` by default so a hosted/shared target is not inherited accidentally.
- Refuse non-local database hosts and forbidden target patterns before opening a Prisma connection.
- Default to dry-run mode and reject `--execute`, `--delete`, `--purge`, `--truncate`, `--drop`, `--archive`, `--revoke`, and similar destructive terms.
- Print only count summaries, dependency-order labels, dry-run flags, and sanitized local target classification.
- Do not print IDs, names, emails, PDF/base64/content bodies, request/response bodies, database URLs, tokens, cookies, secrets, signed XML, QR payloads, or attachment bodies.
- Preserve by default: generated documents, email outbox/provider evidence, audit logs, auth/role/user evidence, ZATCA metadata/logs, AP source fixtures, journals, allocations, receipts, and stock movement evidence.
- Include tests proving local-target refusal logic, dry-run-only behavior, destructive flag refusal, generic `DATABASE_URL` avoidance, count-only output shape, and absence of package scripts for execute/delete behavior.

## Deletion Policy

No deletion executor should be implemented in DEV-08M Part 8.

If deletion is ever considered later, it needs a separate product/legal/audit policy and a new exact approval phrase. That later design would need dependency-order deletion, preserve/legal-hold rules, backup/restore readiness, audit evidence, and an isolated disposable target. None of that is approved in DEV-08M.

## Required Approval For Part 8

The following exact approval phrase is required before implementing the dry-run script:

```text
I approve DEV-08M Part 8 local-only AP cleanup executor dry-run script implementation under marker DEV08M-AP-20260529T000000. No production, no beta, no customer data, no deletion.
```

Status: already received exactly from the user in the up-front DEV-08M approval bundle.

## Commands Run

- `git status --short --branch`
- `git log --oneline -5`
- `rg -n "fixture:dev04|cleanup-plan|cleanup|dry-run|local" package.json apps/api/package.json apps/api/scripts scripts docs/development/DEV_04*.md docs/development/DEV_08M_AP_CLEANUP_RETENTION_PREFLIGHT.md docs/development/DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE.md -g "*.json" -g "*.ts" -g "*.js" -g "*.md"`
- `Get-Content` inspections for `apps/api/scripts/dev04-fixture-runner.ts`, `apps/api/scripts/dev04-fixture-runner.spec.ts`, `scripts/user-testing-cleanup-plan.cjs`, `scripts/user-testing-cleanup-plan.test.cjs`, root `package.json`, and `apps/api/package.json`.

## Commands Skipped

- Part 8 implementation in this preflight step.
- Runtime cleanup/delete/update/archive/revoke execution.
- Login/browser/API endpoint mutation, PDF generation, generated-document downloads, attachment downloads, report exports, body/base64 reads, request/response body output, and customer-data inspection.
- Migrations, seed/reset/delete, full tests, full build, full E2E, full smoke, deploys, environment/provider/schema changes, backup/restore, and production-hosting research.
- Real email, provider calls, SMTP, retry workers, webhooks, diagnostics sends, real AP delivery, real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling.
- Production, beta, hosted/shared, or customer-data actions.

## Exact Next Prompt Title

`DEV-08M Part 8: approved local AP cleanup executor dry-run script implementation`

## Part 8 Note

- DEV-08M Part 8 implementation evidence is recorded in [DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_IMPLEMENTATION_EVIDENCE.md](DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_IMPLEMENTATION_EVIDENCE.md).
- The selected dry-run-only local planner was implemented with tests and package scripts.
- No deletion/update/archive/revoke path was implemented.
- Exact next prompt title: `DEV-08M Part 9: AP cleanup executor dry-run evidence verification`.
