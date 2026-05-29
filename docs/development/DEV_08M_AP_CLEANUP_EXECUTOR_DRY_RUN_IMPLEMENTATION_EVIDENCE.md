# DEV-08M AP Cleanup Executor Dry-Run Implementation Evidence

## Scope

- Task: `DEV-08M Part 8: approved local AP cleanup executor dry-run script implementation`.
- Latest commit inspected: `390f094b Plan DEV-08M AP cleanup executor`.
- Marker: `DEV08M-AP-20260529T000000`.
- Approval phrase status: received exactly from the user in the up-front DEV-08M approval bundle.
- Runtime mutation performed: no.
- Deletion/update/archive/revoke performed: no.
- Production/beta/customer data used: no.
- Body/base64/secret/database URL printed: no.

## Implementation Summary

- Added `apps/api/scripts/dev08m-ap-cleanup-planner.ts`.
- Added `apps/api/scripts/dev08m-ap-cleanup-planner.spec.ts`.
- Added API package script `cleanup:dev08m:ap`.
- Added root package helpers:
  - `cleanup:dev08m:ap:plan`
  - `cleanup:dev08m:ap:dry-run`
- The planner requires the exact marker `DEV08M-AP-20260529T000000`.
- The planner accepts a database URL only from explicit `--database-url` or dedicated `LEDGERBYTE_DEV08M_DATABASE_URL`.
- Generic `DATABASE_URL` is ignored by default.
- Hosted, production, beta, staging, live, user-testing, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, and Neon targets are refused before connection.
- Destructive arguments such as execute/delete/purge/truncate/drop/archive/revoke/apply are refused.
- No deletion function, delete package script, execute package script, archive path, or revoke path was implemented.
- Output is count-only: safe marker count, category counts, dependency-order labels, preserve-by-default labels, and no-deletion flags.

## Test-Driven Evidence

- Red step: targeted Jest initially failed because `scripts/dev08m-ap-cleanup-planner.ts` did not exist.
- Green step: targeted Jest passed after implementation.
- Tests cover:
  - exact marker requirement.
  - local database target classification.
  - hosted/forbidden target refusal.
  - generic `DATABASE_URL` avoidance.
  - destructive flag refusal.
  - dry-run-only and no-deletion flags.
  - count-only injected collector output.
  - package scripts with no execute/delete helpers.

## Local Dry-Run Result

The committed planner was run against the local database by loading the local `.env` URL into `LEDGERBYTE_DEV08M_DATABASE_URL` without printing the URL.

| Count | Value |
| --- | ---: |
| Markers detected | `11` |
| AP source documents | `65` |
| Source lines | `46` |
| Journals and journal lines | `199` |
| Allocations | `9` |
| Receipts and stock movements | `26` |
| Generated documents by source | `24` |
| Email outbox rows by source/document | `2` |
| Provider events for generated-document emails | `0` |
| Audit logs for source ids | `112` |
| ZATCA marker hits | `0` |
| Users/roles/memberships marker hits | `9` |

The committed planner is intentionally conservative and source-linked. It is a repeatable planning tool, not a delete candidate list. All evidence families remain preserve-by-default.

## Dry-Run Safety Flags

- `dryRun`: `true`.
- `readOnly`: `true`.
- `noMutation`: `true`.
- `noDeletion`: `true`.
- `deletionPathImplemented`: `false`.
- `cleanupExecuted`: `false`.
- `deletionApproved`: `false`.
- `bodyOrSecretOutputPrinted`: `false`.

## Commands Run

- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev08m-ap-cleanup-planner.spec.ts` initially to prove the red test.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath scripts/dev08m-ap-cleanup-planner.spec.ts`.
- `corepack pnpm --filter @ledgerbyte/api cleanup:dev08m:ap -- --plan --marker DEV08M-AP-20260529T000000`.
- `corepack pnpm --filter @ledgerbyte/api cleanup:dev08m:ap -- --plan --marker DEV08M-AP-20260529T000000 --json-summary`.
- Local dry-run through `LEDGERBYTE_DEV08M_DATABASE_URL` loaded from `apps/api/.env`; the value was not printed.

## Commands Skipped

- Delete/update/archive/revoke/cleanup execution.
- Any execute/delete package helper.
- Login/browser/API endpoint mutation, generated-document downloads, attachment downloads, report exports, body/base64 output, request/response body output, and customer-data inspection.
- Migrations, seed/reset/delete, full tests, full build, full E2E, full smoke, deploys, environment/provider/schema changes, backup/restore, and production-hosting research.
- Real email, provider calls, SMTP, retry workers, webhooks, diagnostics sends, real AP delivery, real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling.
- Production, beta, hosted/shared, or customer-data actions.

## Exact Next Prompt Title

`DEV-08M Part 9: AP cleanup executor dry-run evidence verification`
