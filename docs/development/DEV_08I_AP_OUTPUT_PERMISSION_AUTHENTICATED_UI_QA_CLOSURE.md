# DEV-08I AP Output Permission And Authenticated UI QA Closure

## Purpose And Scope

- Task: `DEV-08I Part 17: AP output permission and authenticated UI QA closure`.
- Latest commit inspected: `cfbc75f1 Plan DEV-08I AP output audit cleanup`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed by this closure: no.
- Login/API/browser/output/download performed by this closure: no.
- Cleanup/delete performed by this closure: no.
- Temporary scripts created by this closure: none.

This closure reviewed the full DEV-08I evidence chain and ran a final read-only local metadata snapshot. It did not log in, open a browser, call AP output routes, call generated-document download routes, generate documents, download generated documents, read PDF bodies/base64, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Evidence Set Reviewed

DEV-08I evidence is recorded across:

- [DEV_08I_AP_OUTPUT_PERMISSION_UI_QA_PREFLIGHT.md](DEV_08I_AP_OUTPUT_PERMISSION_UI_QA_PREFLIGHT.md)
- [DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md](DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md)
- [DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_PREFLIGHT.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_PREFLIGHT.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE_VERIFICATION.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE_VERIFICATION.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_PREFLIGHT.md](DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_PREFLIGHT.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md](DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE_VERIFICATION.md](DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE_VERIFICATION.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_PREFLIGHT.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_PREFLIGHT.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE.md)
- [DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE_VERIFICATION.md](DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE_VERIFICATION.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_PREFLIGHT.md](DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_PREFLIGHT.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE.md](DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE.md)
- [DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE_VERIFICATION.md](DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE_VERIFICATION.md)
- [DEV_08I_AP_OUTPUT_PERMISSION_AUDIT_CLEANUP_PREFLIGHT.md](DEV_08I_AP_OUTPUT_PERMISSION_AUDIT_CLEANUP_PREFLIGHT.md)

Required background docs from DEV-08H, DEV-08G, DEV-08F, DEV-08, DEV-03, DEV-02, DEV-01, `BUG_AUDIT.md`, and `README.md` were also reviewed for boundaries, verification gates, and deferred scope.

## Final Local Target And Fixture State

- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Marker-scoped disposable role count: `3`.
- Marker-scoped disposable user count: `3`.
- Marker-scoped disposable membership count: `3`.
- `apps/api/scripts` `*dev08i*` files: none.

| Fixture | User prefix | Membership prefix | Role prefix | Status | Permission count |
| --- | --- | --- | --- | --- | ---: |
| Full output QA | `5281dfc0` | `b7f0b3d4` | `a0c6ece9` | `ACTIVE` | `136` |
| Restricted archive-only | `16d72d2a` | `2de5260b` | `83dc203f` | `ACTIVE` | `4` |
| Restricted AP viewer/no archive download | `41b031e2` | `78a4a87c` | `b167ef15` | `ACTIVE` | `10` |

## What DEV-08I Proved

Permission and fixture setup:

- Mapped the AP output and generated-document permission boundary across backend guards and web UI surfaces.
- Created local disposable marker fixtures only: one full output QA user, one restricted archive-only user, and one restricted AP viewer/no archive-download user.
- Verified fixture setup did not create generated documents, marker emails, ZATCA rows, or marker audit rows.

Full-permission API QA:

- Authenticated the local fake full output QA user through `/auth/login` without printing token/body material.
- Verified selected AP output data endpoints and explicit generation endpoints for purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, and cash expense.
- Created one local generated-document row per selected AP source in Part 5 and verified generated-document metadata/download integrity by hash and byte size only.
- Verified six matching `GENERATED_DOCUMENT_CREATED` audit rows for Part 5.

Restricted-user API QA:

- Authenticated the local restricted archive-only user through `/auth/login` without printing token/body material.
- Verified generated-document list/detail metadata remained allowed through `generatedDocuments.view`.
- Verified archive download, AP data, and AP generation routes returned `403` for all six selected sources.
- Verified no generated-document rows were created by restricted API checks.

Full-permission UI QA:

- Verified `/documents` showed the six selected archive rows and enabled archive downloads for the full output QA user.
- Verified all six AP detail routes showed source PDF buttons for the full output QA user.
- Clicked each source PDF UI action once, creating one additional local generated-document row per selected source.
- Verified six matching `GENERATED_DOCUMENT_CREATED` audit rows for Part 11.
- The successful UI session used a local JWT for the existing fake user after a password candidate mismatch; `/auth/login` was not called in Part 11.

Restricted-user UI QA:

- Verified `/documents` loaded for the restricted archive-only user with selected archive rows visible.
- Verified archive download actions were absent and permission-required fallbacks were visible.
- Verified purchase navigation was hidden.
- Verified all six AP detail routes rendered `Access denied` and had source PDF button count `0`.
- Verified no AP source PDF route, generated-document download route, AP data route, or generation route was called.
- Verified no generated-document rows were created by restricted UI checks.

Audit and cleanup posture:

- Inventoried all DEV-08I fixture, generated-document, login-audit, generated-document-audit, marker email, and ZATCA side-effect counts.
- Decided closure should preserve fixtures and generated-document/audit evidence, with cleanup deferred to a later explicitly approved local cleanup branch.

## Final Count Snapshot

| Count | Final result |
| --- | ---: |
| Selected-source generated documents | `19` |
| DEV-08I generated documents by full output QA user | `12` |
| Generated documents by restricted archive-only user | `0` |
| Generated documents by restricted AP viewer/no archive-download user | `0` |
| `GENERATED_DOCUMENT_CREATED` audit rows for DEV-08I full-user generated docs | `12` |
| Full output QA `AUTH_LOGIN` audit rows | `1` |
| Restricted archive-only `AUTH_LOGIN` audit rows | `1` |
| Restricted AP viewer/no archive-download `AUTH_LOGIN` audit rows | `0` |
| Marker email outbox rows | `0` |
| Organization ZATCA submission logs | `331` |
| Organization ZATCA signed artifact drafts | `33` |

Selected source states stayed:

| Source | Source prefix | Final status |
| --- | --- | --- |
| `PO-000144` | `8f42caf7` | `APPROVED` |
| `BILL-000423` | `16e6f021` | `FINALIZED` |
| `PAY-000318` | `7efa0003` | `POSTED` |
| `SRF-000127` | `e7eed3c7` | `POSTED` |
| `PDN-000127` | `7c07411c` | `FINALIZED` |
| `EXP-000065` | `bd4d1330` | `POSTED` |

## Forbidden Side Effects

DEV-08I did not use production, beta, hosted/shared, or customer-data targets. It did not run real email/provider calls, real ZATCA network/CSID/clearance/reporting/signing/PDF-A3, migrations, seed/reset/delete, deploys, env/provider/schema changes, backup/restore, production-hosting research, full E2E, full smoke, full build, or full test suites.

No secret, password, token, cookie, auth header, request body, response body, raw audit metadata, database URL, customer/vendor details, PDF body, base64, signed XML, QR payload, private key, CSID, email body, or attachment body was printed.

## Remaining Gaps

- Repeated generation/idempotency behavior remains unresolved; DEV-08H already proved duplicate output rows can be created, and DEV-08I intentionally did not convert that into a product decision.
- Restricted AP viewer/no archive-download behavior remains a policy edge: the user shape has AP source view permissions and lacks `generatedDocuments.download`; DEV-08I did not click source PDF actions for that user because current source routes can create output.
- AP generated-document email remains blocked until a safe AP-specific outbox-only or dry-run path exists.
- UI full-permission checks used a local JWT because the stored fixture password did not match the candidate; API login behavior was still covered in Parts 5 and 8.
- Production, beta, customer-data, real ZATCA, real email, full E2E, full smoke, and production-hosting behavior remain out of scope.
- Cleanup remains deferred; local evidence fixtures should be preserved until a later approved cleanup plan defines retention and deletion rules.

## Recommended Next Branch

`DEV-08J Part 1: AP repeated idempotency and blocker paths preflight`

Recommended focus:

- Repeated AP output generation and archive row idempotency/reuse/supersession policy.
- Source PDF route permission policy for AP viewers who lack `generatedDocuments.download`.
- Blocker paths for invalid source states, missing source records, and restricted actor shapes without creating unintended output.
- Continued local-only metadata/hash/count evidence, with no PDF body/base64 exposure.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- `rg` review across all `docs/development/DEV_08I_*.md`.
- Read previous DEV-08I preflight/evidence/verification documents and `CODEX_HANDOFF.md`.
- Read required background docs from DEV-08H, DEV-08G, DEV-08F, DEV-08, DEV-03, DEV-02, DEV-01, `BUG_AUDIT.md`, and `README.md`.
- Read-only local Prisma metadata closure snapshot with `node -e` from `apps/api`.

## Commands Skipped

- Login, browser/UI flow, Playwright, API generation, generated-document download, AP source data routes, AP source PDF streaming, and AP source generation routes.
- Cleanup/delete, fixture mutation, generated-document mutation, and audit mutation.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08J Part 1: AP repeated idempotency and blocker paths preflight`
