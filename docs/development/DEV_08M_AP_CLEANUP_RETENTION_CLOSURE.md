# DEV-08M AP Cleanup Retention Closure

## Scope

- Task: `DEV-08M Part 10: AP cleanup retention closure`.
- Latest commit inspected: `6a444112 Verify DEV-08M cleanup dry-run planner`.
- Marker: `DEV08M-AP-20260529T000000`.
- Runtime cleanup performed: no.
- Deletion/update/archive/revoke performed: no.
- Production/beta/customer data used: no.
- Real email/ZATCA/provider/deploy/migration/seed/reset/delete action performed: no.
- Body/base64/secret/database URL printed: no.

## Cleanup And Retention Policy

- DEV-08 through DEV-08L local AP evidence fixtures are preserve-by-default.
- Hard deletion is forbidden by default.
- Generated-document archive rows, email outbox/provider rows, audit logs, auth/role/user evidence, journals, allocations, AP source documents, receipts, stock movements, and ZATCA metadata/logs remain evidence, not cleanup targets.
- Any future destructive cleanup requires a separate product/legal/audit design and a new exact approval phrase. DEV-08M does not approve it.
- Cleanup planning is local-only and count-only.

## Dry-Run Inventory Summary

DEV-08M Part 2 created the local count-only inventory, and Part 3 reverified the same counts without mutation.

| Evidence family | Count |
| --- | ---: |
| DEV-08 through DEV-08L markers detected | `12` |
| AP source documents | `64` |
| Source lines | `25` |
| Journals and journal lines | `67` |
| Allocations/reversals | `2` |
| Receipts and stock movements | `9` |
| Generated documents by source | `24` |
| Email outbox rows by source/document | `4` |
| Provider events for generated-document emails | `0` |
| Audit logs by AP source ids | `110` |
| ZATCA marker hits | `0` |
| Users/roles/memberships marker hits | `6` |

Deletion candidates remained `0`; deletion approved remained `false`.

## Duplicate Output Policy

- DEV-08H and DEV-08J proved repeated AP PDF generation creates additional generated-document archive rows.
- DEV-08M Part 4 classified this as append-only versioned archive behavior for paid v1.
- Part 5 and Part 6 were skipped because no narrow code change was recommended.
- Future UX can add explicit version labels, latest filtering, or supersession semantics only after legal/audit retention, email references, and document-list behavior are designed together.

## Cleanup Planner Status

- DEV-08M Part 8 implemented `apps/api/scripts/dev08m-ap-cleanup-planner.ts`.
- DEV-08M Part 9 verified the planner.
- Available scripts:
  - API: `cleanup:dev08m:ap`
  - root: `cleanup:dev08m:ap:plan`
  - root: `cleanup:dev08m:ap:dry-run`
- The planner requires exact marker `DEV08M-AP-20260529T000000`.
- The planner requires explicit local DB target for dry-run and ignores generic `DATABASE_URL`.
- The planner refuses hosted/non-local/production/beta/user-testing targets.
- The planner refuses destructive arguments.
- The planner prints counts and policy labels only.
- No execute/delete package helper exists.
- No delete/update/archive/revoke code path exists.

## Final No-Cleanup Confirmation

Across DEV-08M, no real cleanup/delete occurred.

No runtime mutation was performed except local read-only queries and script verification. No source AP records, journals, allocations, receipts, stock movements, generated documents, email rows, audit logs, users, roles, memberships, ZATCA rows, or local evidence rows were deleted, updated, archived, revoked, or purged.

## Remaining AP Gaps

- Linked PO-to-bill receipt reconciliation.
- Valuation variance booking.
- Landed cost.
- Purchase returns.
- Serial/batch/bin/location behavior.
- Real provider email delivery, retry scheduling, webhook handling, sender-domain policy, and production email readiness.
- Broad E2E/smoke/full build/full test coverage.
- Production/beta/customer-data behavior.
- Final AP evidence map and production-gap handoff.

## Commands Run

- `git status --short --branch`
- `git log --oneline -6`
- `rg -n "DEV-08M|DEV-08L|cleanup|duplicate-output|remaining AP gaps|Recommended next" docs/development/DEVELOPMENT_COMPLETION_PLAN.md BUG_AUDIT.md CODEX_HANDOFF.md`
- `Get-ChildItem docs/development -Filter 'DEV_08M*'`
- `Get-Content` inspections for current DEV-08M handoff, `DEVELOPMENT_COMPLETION_PLAN.md`, and `BUG_AUDIT.md`.

## Commands Skipped

- Cleanup/delete/update/archive/revoke execution.
- Login/browser/API endpoint mutation, generated-document downloads, attachment downloads, report exports, body/base64 output, request/response body output, and customer-data inspection.
- Migrations, seed/reset/delete, full tests, full build, full E2E, full smoke, deploys, environment/provider/schema changes, backup/restore, and production-hosting research.
- Real email, provider calls, SMTP, retry workers, webhooks, diagnostics sends, real AP delivery, real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, and QR payload handling.
- Production, beta, hosted/shared, or customer-data actions.

## Next Branch

`DEV-08Z Part 1: AP local evidence final closure and production-gap handoff`

Reason: DEV-08M closes cleanup/retention policy, duplicate-output policy, and the dry-run planner. DEV-08Z should consolidate DEV-08 local AP evidence into a final evidence map and production-gap handoff.
