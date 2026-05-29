# DEV-08M AP Cleanup Retention Preflight

## Purpose And Scope

- Task: `DEV-08M Part 1: AP cleanup retention and fixture cleanup policy preflight`.
- Latest commit inspected: `c326d491 Close DEV-08L AP fiscal permission evidence`.
- Remote baseline inspected: `origin/main` at `c326d491998e9b2f8c9dacca48f067ff422559c4`.
- Proposed marker for this cleanup policy arc: `DEV08M-AP-20260529T000000`.
- Runtime mutation performed: no.
- Cleanup/delete/archive/revoke action performed: no.
- Production, beta, hosted/shared, or customer data used: no.

This preflight is documentation and code-inspection only. It does not open AP output bodies, send email, call ZATCA, run cleanup executors, run seed/reset/delete, change environment variables, deploy, migrate, or touch local fixture data.

## Evidence Reviewed

- [CODEX_HANDOFF.md](../../CODEX_HANDOFF.md)
- [DEV_08L_AP_FISCAL_PERMISSION_EDGE_CLOSURE.md](DEV_08L_AP_FISCAL_PERMISSION_EDGE_CLOSURE.md)
- [DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md](DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md)
- [DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md](DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md)
- [DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md](DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md)
- [DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md](DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md)
- [DEV_08_AP_STATE_MACHINE_CLOSURE.md](DEV_08_AP_STATE_MACHINE_CLOSURE.md)
- [DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md)
- [DEV_02_VERIFICATION_GATE_RUNBOOK.md](DEV_02_VERIFICATION_GATE_RUNBOOK.md)
- [USER_TESTING_ENVIRONMENT_CLEANUP.md](../deployment/USER_TESTING_ENVIRONMENT_CLEANUP.md)
- `apps/api/prisma/schema.prisma`
- `scripts/user-testing-cleanup-plan.cjs`
- `apps/api/src/generated-documents/generated-document.service.ts`
- `apps/api/src/email/*`
- `apps/api/src/audit-log/*`
- AP purchase order, purchase bill, purchase receipt, purchase debit note, supplier payment, supplier refund, and cash expense service surfaces as needed.

## DEV-08 Marker Inventory

| Arc | Marker | Evidence family |
| --- | --- | --- |
| DEV-08 | `DEV08-AP-20260525T230000` | core purchase bill and supplier payment chain |
| DEV-08B | `DEV08B-AP-20260526T060000` | purchase debit note and refund from debit note |
| DEV-08C | `DEV08C-AP-20260526T000000` | purchase order lifecycle and conversion |
| DEV-08D | `DEV08D-AP-20260526T000000` | supplier refund from supplier payment |
| DEV-08E | `DEV08E-AP-20260526T000000` | cash expense lifecycle |
| DEV-08F | `DEV08F-AP-20260527T000000` | inventory-clearing purchase bill and receipt |
| DEV-08G | `DEV08G-AP-20260527T000000` | purchase receipt and inventory integration |
| DEV-08H | `DEV08H-AP-20260528T000000` | AP output PDF archive, download integrity, email boundary |
| DEV-08I | `DEV08I-AP-20260528T000000` | AP output permissions and authenticated UI QA |
| DEV-08J | `DEV08J-AP-20260528T000000` | repeated/idempotency/blocker behavior and duplicate output sweep |
| DEV-08K | `DEV08K-AP-20260528T000000` | AP generated-document email outbox |
| DEV-08L | `DEV08L-AP-20260529T000000` | fiscal-period blockers and permission edges |

These markers identify local disposable evidence families. They are not an approval to delete records.

## Data Classification

| Data type | Examples | Retention classification |
| --- | --- | --- |
| Accounting source documents | purchase orders, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, purchase receipts | preserve by default; use normal void/reversal states as evidence rather than deleting |
| Journals and journal lines | original and reversal entries from AP state changes | preserve by default; these are accounting evidence and should not be hard-deleted |
| Allocations and reversals | supplier payment allocations, unapplied allocations, debit note allocations | preserve by default; reversed rows remain evidence |
| Receipts and stock movements | purchase receipts, stock movements, inventory asset posting/reversal evidence | preserve by default; terminal void/reversal states are the cleanup boundary |
| Generated documents | PDF archive metadata and database-backed content rows | preserve by default; bodies/base64 must not be printed; duplicate policy needs separate product decision |
| Email outbox/provider events | AP generated-document mock/no-send rows and provider metadata | preserve by default; real provider behavior remains out of scope |
| Audit/auth logs | audit logs, auth tokens, login/write evidence | audit logs are evidence and retention preview is dry-run only; auth-token cleanup is unrelated to DEV-08 AP fixture cleanup |
| Users, roles, memberships | local fixture actors and permission roles | preserve by default; disabling or membership cleanup needs a separate reviewed policy |
| ZATCA metadata/logs | invoice metadata, submission logs, signed artifact planning rows | preserve by default; no real ZATCA cleanup or body exposure is allowed in DEV-08M |

## Retention Policy Decision

- Preserve DEV-08 through DEV-08L evidence fixtures by default.
- Treat hard deletion as forbidden by default for accounting source documents, journals, allocations, generated documents, email rows, audit logs, users, roles, memberships, and ZATCA metadata.
- Prefer terminal application states such as `VOIDED`, reversal journals, reversed allocations, and documented blockers over record deletion.
- Allow a local-only dry-run inventory to identify cleanup candidates by explicit marker only.
- Require count-only output from any cleanup planner. Do not print customer/vendor data, PDF bodies, base64, email bodies, attachment bodies, signed XML, QR payloads, secrets, tokens, cookies, auth headers, request bodies, response bodies, or database URLs.
- Treat generated-document duplicate rows as evidence until Part 4 decides whether versioned duplicates are product behavior or a code gap.
- Treat DEV-08K AP email outbox rows as metadata-only local mock evidence; no real email provider cleanup is in scope.
- Treat audit-log retention endpoints as preview/dry-run only; automatic purge execution is not implemented and should not be inferred.

## Cleanup Executor Strategy

Any future cleanup executor must be designed as a separate explicit implementation step. The minimum safe strategy is:

1. Refuse non-local database targets before connecting or importing write-capable services.
2. Require an exact marker argument such as `DEV08M-AP-20260529T000000`.
3. Default to dry-run and count-only output.
4. Scope candidate discovery to DEV-08 through DEV-08L markers and known local fixture organizations only.
5. Print dependency order and blockers, not row bodies or private fields.
6. Preserve source documents, journals, audit logs, generated documents, email outbox, provider events, users, roles, memberships, and ZATCA rows unless a later prompt explicitly approves a destructive design.
7. Require a second, separate approval before any future destructive delete/update/archive/revoke path exists.

## Part 2 Approval Gate

Part 2 is approved only if this exact phrase is present:

```text
I approve DEV-08M Part 2 local-only AP cleanup inventory dry-run under marker DEV08M-AP-20260529T000000. No production, no beta, no customer data, no deletion.
```

The approval allows read-only local DB queries and marker-scoped counts only. It does not allow deletion, update, archive, revoke, cleanup execution, real email, ZATCA, seed/reset/delete, migration, deploy, environment changes, or production/beta/customer-data actions.

## Commands Run

- `git fetch origin`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git log -1 --oneline`
- `git status --short --branch`
- Targeted `Get-Content` and `rg` reads for the required handoff, DEV-08 closure docs, cleanup runbook, Prisma schema, generated-document service, email module, audit-log module, package scripts, `README.md`, and `BUG_AUDIT.md`.

## Commands Skipped

- Cleanup executors.
- Delete/update/archive/revoke operations.
- Local DB mutation.
- Login/browser.
- PDF generation, PDF download, generated-document body/base64 reads, report exports, and attachment downloads.
- Email sends, provider calls, retry workers, webhooks, diagnostics, SMTP, or real AP email delivery.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths, signed XML, or QR payload handling.
- Migrations, seed/reset/delete, deploys, environment/provider/schema changes, backups/restores, full E2E, full smoke, full build, full tests, production-hosting research, and production/beta/customer-data checks.

## Exact Next Prompt Title

`DEV-08M Part 2: approved local AP cleanup inventory dry-run`
