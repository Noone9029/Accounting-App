# LedgerByte Codex Handoff

## Latest Commit Inspected

- `ff74a1ed Harden AP purchase bill creation workflow`

## Current Development Objective

- Current branch: `codex/purchase-bill-seeded-uuid-validation`.
- Current completed lane: AP purchase bill lifecycle QA and merge-readiness pass completed.
- Branch status versus `main`: ahead `3`, behind `0`, and not merged.
- Graphify usage: existing `graphify-out/GRAPH_REPORT.md` and `graphify-out/manifest.json` were used as blast-radius guidance only; the graph was not regenerated and is stale (`25ae0b5b` vs current branch tip).
- Branch content audit:
  - AP purchase bill validation/workflow files: `apps/api/src/purchase-bills/dto/create-purchase-bill.dto.ts`, `apps/api/src/purchase-bills/dto/purchase-bill-line.dto.ts`, `apps/api/src/purchase-bills/dto/postgres-uuid.decorator.ts`, and `apps/web/src/components/forms/purchase-bill-form.tsx`.
  - AP tests: `apps/api/src/purchase-bills/purchase-bill-dto.spec.ts`, `apps/web/src/components/forms/purchase-bill-form.test.tsx`, and `apps/web/src/app/(app)/purchases/bills/[id]/page.test.tsx`.
  - Handoff/audit docs: `CODEX_HANDOFF.md` and `BUG_AUDIT.md`.
  - Included but unrelated-to-AP docs in this branch: `docs/development/ZATCA_SANDBOX_ACCESS_CONFIRMATION_CHECKLIST_SPRINT_CLOSURE.md` and `docs/zatca/SANDBOX_ACCESS_CONFIRMATION_CHECKLIST.md` from commit `815ff4f9`.
- AP lifecycle QA result:
  - New bill route, edit bill route, bill detail guidance, DTO validation, frontend submit payload, and safe `returnTo` behavior were code-reviewed.
  - `PurchaseBillForm` preserves safe `returnTo` routing during edit flows, so cancel/save can return to supplier-context routes instead of always falling back to `/purchases/bills` or the bill detail page.
  - Purchase bill dropdowns still submit ids, not visible labels, for supplier, branch, account, and tax references.
  - Seeded deterministic PostgreSQL UUIDs and normal UUIDs are accepted.
  - Visible labels and empty-string optional id references are rejected by DTO validation coverage.
- Merge-readiness verdict:
  - AP purchase bill code/tests are ready for PR review after targeted local verification.
  - The branch is not clean as a single-theme PR because it also contains the unrelated ZATCA sandbox access checklist docs.
  - Recommended action: split the ZATCA checklist docs into a separate docs PR/branch before opening the AP purchase bill hardening PR.
- Checks run:
  - `corepack pnpm --filter @ledgerbyte/api test -- purchase-bill-dto`
  - `corepack pnpm --filter @ledgerbyte/web test -- purchase-bill-form`
  - `node E:\Accounting App\apps\web\node_modules\jest\bin\jest.js --config jest.config.cjs --runTestsByPath "src/app/(app)/purchases/bills/[id]/page.test.tsx"` (used because the Windows `pnpm test -- --runTestsByPath ...[id]...` wrapper misparsed the literal route path)
  - `corepack pnpm --filter @ledgerbyte/api typecheck`
  - `corepack pnpm --filter @ledgerbyte/web typecheck`
  - `corepack pnpm verify:diff`
  - `git diff --check`
- Deployment verification: skipped in this run. No beta deploy or remote route-load verification was performed.
- Skipped commands and why:
  - `corepack pnpm --filter @ledgerbyte/web test -- --runTestsByPath 'src/app/(app)/purchases/bills/[id]/page.test.tsx'`: Windows command parsing treated the literal `[id]` route path as shell syntax, so the equivalent direct Jest invocation was used instead.
  - Beta deploy / remote route-load verification: optional only and skipped to keep this pass non-deploying.
  - Migrations, seed/reset/delete, E2E, smoke, ZATCA, email, backup/restore, and production deploy commands: explicitly out of scope for this lane.
- Remaining blockers:
  - The AP branch still contains unrelated ZATCA checklist docs and should be split before PR if the goal is an AP-only review.
  - Existing unrelated dirty files remain outside this arc: `apps/api/scripts/smoke-accounting.ts`, `apps/web/src/app/(app)/settings/zatca/page.tsx`, `.codex-logs/`, and `AGENTS.md`.
  - Vercel beta route-load verification still needs a separate safe pass if remote confirmation is required.
- Production/ZATCA/customer-data behavior changed: no. This arc remains DTO/frontend/test/doc hardening only and does not change schema, accounting posting, ZATCA runtime behavior, email, or production posture.
- Exact next recommended prompt title: `Open or merge AP purchase bill hardening PR`.

## Prior Development Objective

- Current branch: `codex/zatca-sandbox-access-otp-runbook`.
- Latest completed lane: PR #5 `ZATCA sandbox CSID execution approval gate`, merge commit `2f40904929081271b150eb2189928d0490e20507`.
- Current lane: human-operated sandbox access and manual OTP capture runbook only.
- New runbook: `docs/zatca/SANDBOX_ACCESS_AND_MANUAL_OTP_RUNBOOK.md`.
- New sprint closure doc: `docs/development/ZATCA_SANDBOX_ACCESS_OTP_RUNBOOK_SPRINT_CLOSURE.md`.
- New static guard: `scripts/zatca-sandbox-access-otp-runbook-guard.cjs`.
- Safety status: documentation/static guard only; no sandbox portal login, OTP capture, CSID request, ZATCA network call, request/response body creation or processing, private-key generation/storage, raw certificate/CSR storage, signing, clearance/reporting, PDF-A-3, provider/env change, deploy, migration execution, or production compliance claim is authorized.
- Real ZATCA production compliance remains disabled and not claimed.
- Remaining blockers: manual sandbox access confirmation, manual OTP capture approval, OTP entry approval, real custody provider approval, KMS/HSM or managed-secret boundary, request-body creation approval, real sandbox network request approval, response-body processing approval, response custody approval, sandbox CSID storage by approved custody provider, legacy PEM/payload-capable fields, signing and Phase 2 QR, clearance/reporting, PDF-A-3, production CSID lifecycle, and official/legal/accounting/ZATCA specialist review.
- Exact next prompt title: `LedgerByte approve and merge ZATCA sandbox access OTP runbook PR`.

## Prior Development Objective

- ZATCA sandbox adapter no-network contract tests completed: yes.
- 2026-06-07 reconciliation: latest pushed commit `a084fff0 Plan ZATCA adapter boundary tests` was inspected; required baseline ZATCA docs/scripts existed; sandbox adapter no-network contract docs/scripts did not exist and were created.
- No-network contract test plan created: `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md`.
- No-network contract result doc created: `docs/zatca/SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`.
- No-network contract script added: `scripts/zatca-sandbox-adapter-no-network-contract.cjs`.
- No-network contract test added: `scripts/zatca-sandbox-adapter-no-network-contract.test.cjs`.
- Package scripts added: `zatca:sandbox-adapter-no-network-contract` and `test:zatca-sandbox-adapter-no-network-contract`.
- Contract status: `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`.
- Network interception result: local no-network trap installed in the contract guard; accidental calls through the trap throw `NO_NETWORK_CONTRACT_INTERCEPTED`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Mock adapter executed: no.
- Disabled adapter executed: no.
- Request body created: no.
- Response body processed: no.
- DB connection attempted: no.
- DB write attempted: no.
- Env values exposed: no.
- Secrets/bodies exposed: no.
- Evidence policy: metadata-only.
- Adapter contract findings: sandbox adapter source found but not executed; disabled adapter fail-closed contract detected; mock adapter source found and labeled mock-only; sandbox risk paths detected by keyword counts only.
- Custody dependency finding: CSID response custody provider source found but disabled; metadata-only custody model found; legacy raw PEM-capable fields remain blockers.
- Code/readiness metadata changed: standalone static guard script, guard tests, package scripts, and docs only; no API/UI/schema/migration/runtime execution changes.
- Current blockers: sandbox CSID dry-run request body schema planning, CSID response custody provider implementation/approval, legacy raw PEM-capable fields, request body creation approval, response body processing approval, env gate approval, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production CSID lifecycle, production signing and Phase 2 QR, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.
- Exact next prompt title: `ZATCA sandbox CSID dry-run request body schema plan`.

## Prior ZATCA Sandbox Adapter Boundary Trail

- ZATCA sandbox adapter mock-to-real boundary test plan completed: yes.
- Boundary test plan created: `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`.
- Boundary runbook created: `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`.
- Boundary result doc created: `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`.
- Boundary check script added: `scripts/zatca-sandbox-adapter-boundary-check.cjs`.
- Boundary check test added: `scripts/zatca-sandbox-adapter-boundary-check.test.cjs`.
- Package scripts added: `zatca:sandbox-adapter-boundary-check` and `test:zatca-sandbox-adapter-boundary-check`.
- Boundary check status: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Mock adapter executed: no.
- Request body created: no.
- Response body processed: no.
- DB connection attempted: no.
- DB write attempted: no.
- Env values exposed: no.
- Secrets/bodies exposed: no.
- Evidence policy: metadata-only.
- Adapter boundary findings: sandbox adapter source found but not executed; disabled adapter fail-closed path detected; mock adapter source found and labeled mock-only; sandbox risk paths detected by keyword counts only.
- Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

## Prior ZATCA Sandbox Adapter Approval Trail

- ZATCA sandbox adapter execution approval plan completed: yes.
- 2026-06-07 reconciliation: latest pushed commit `1e7aa3bc Plan ZATCA CSID response custody` was inspected; required baseline ZATCA docs/scripts existed; sandbox adapter approval docs/scripts did not exist and were created.
- Adapter approval plan created: `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`.
- Adapter approval runbook created: `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`.
- Adapter approval result doc created: `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`.
- Adapter approval guard script added: `scripts/zatca-sandbox-adapter-execution-approval.cjs`.
- Adapter approval guard test added: `scripts/zatca-sandbox-adapter-execution-approval.test.cjs`.
- Package scripts added: `zatca:sandbox-adapter-execution-approval` and `test:zatca-sandbox-adapter-execution-approval`.
- Adapter approval phrase: `I approve ZATCA sandbox adapter execution planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no request/response body exposure, no secret exposure, and metadata-only evidence.`
- Base adapter approval status without phrase: `ADAPTER_EXECUTION_APPROVAL_BLOCKED_PHRASE_REQUIRED`.
- Adapter approval status with exact phrase and `--adapter-execution-approval`: `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`.
- Execute-adapter status with exact phrase and `--execute-adapter`: `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Request body created: no.
- Response body processed: no.
- DB connection attempted: no.
- DB write attempted: no.
- Env values exposed: no.
- Secrets/bodies exposed: no.
- Evidence policy: metadata-only.
- Adapter model finding: sandbox adapter source found but not executed; disabled adapter source found; mock adapter source found and labeled mock-only.
- Custody dependency finding: CSID response custody provider source found but disabled; metadata-only custody model found; legacy raw PEM-capable fields remain blockers.
- Code/readiness metadata changed: standalone guard script, guard tests, package scripts, and docs only; no API/UI/schema/migration/runtime execution changes.
- Current blockers: CSID response custody provider implementation/approval, legacy raw PEM-capable fields, request body creation approval, response body processing approval, env gate approval, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production CSID lifecycle, production signing and Phase 2 QR, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## Prior ZATCA CSID Custody Trail

- ZATCA CSID response custody implementation plan completed: yes.
- 2026-06-07 reconciliation: latest pushed commit `1c854585 Guard ZATCA sandbox CSID execution` was inspected; required baseline ZATCA docs/scripts existed; CSID response custody guard docs/scripts did not exist and were created.
- Custody implementation plan created: `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`.
- Custody guard doc created: `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`.
- Custody result doc created: `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`.
- Custody guard script added: `scripts/zatca-csid-response-custody-guard.cjs`.
- Custody guard test added: `scripts/zatca-csid-response-custody-guard.test.cjs`.
- Package scripts added: `zatca:csid-response-custody-guard` and `test:zatca-csid-response-custody-guard`.
- Custody guard approval phrase: `I approve ZATCA CSID response custody metadata-only planning. No real OTP, no real CSID, no real ZATCA network, no real response body, no secret storage, no body exposure, and metadata-only evidence.`
- Base custody status without phrase: `CUSTODY_GUARD_BLOCKED_APPROVAL_REQUIRED`.
- Custody guard status with exact phrase and `--simulate-metadata-only-response`: `CUSTODY_METADATA_SIMULATION_BLOCKED`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Real response body processed: no.
- DB connection attempted: no.
- DB write attempted: no.
- Token/secret/certificate body persisted: no.
- Env values exposed: no.
- Secrets/bodies exposed: no.
- Evidence policy: metadata-only.
- Provider/custody model finding: custody provider source found and metadata-only custody model found; provider remains disabled/unapproved.
- Legacy PEM field finding: `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` remain raw PEM-capable blockers.
- Code/readiness metadata changed: standalone guard script, guard tests, package scripts, and docs only; no API/UI/schema/migration/runtime execution changes.
- Current blockers: custody provider implementation/approval, legacy raw PEM-capable fields, real response-body processing approval, DB write approval, CSID request approval, sandbox adapter execution approval, OTP capture approval, production CSID lifecycle, production signing and Phase 2 QR, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, and repeatable SDK CI.
- Completed follow-up: `ZATCA sandbox adapter execution approval plan`.
- Exact next prompt title: `ZATCA sandbox adapter mock-to-real boundary test plan`.

## Prior ZATCA/Dummy Signing Trail

- ZATCA approved local dummy signing execution plan completed: yes.
- SDK signing was executed: no.
- SDK QR was executed: no.
- Signed XML validation was executed: no.
- Approval gate was added: yes.
- Exact approval phrase: `I approve ZATCA local dummy signing execution against sanitized local fixtures only. No production, no beta, no customer data, no ZATCA network, no CSID, no OTP, no clearance, no reporting, no PDF-A3, and metadata-only evidence.`
- Docs added: `docs/zatca/APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md`.
- Guard behavior updated: `--approval-phrase <text>` recognizes the exact phrase as `PLAN_ONLY_APPROVAL_RECOGNIZED`; `--execute-approved-plan` returns `BLOCKED_EXECUTION_NOT_IMPLEMENTED_IN_THIS_SPRINT`; all execution flags remain false.
- Current blockers: future execution implementation, Java 11-14 runtime for SDK execution, SDK reference/acquisition policy for CI, key custody, sandbox OTP/CSID, real signing credentials, Phase 2 QR proof, clearance/reporting, PDF/A-3, secure signed artifact storage, official/legal/accounting reviews, and production operations gates.
- Exact next prompt title: `ZATCA approved local dummy signing execution`.
- ZATCA local dummy signing dry-run guard completed: yes.
- SDK signing was executed: no.
- SDK QR was executed: no.
- Signed XML validation was executed: no.
- Private keys/certificates were exposed: no.
- Scripts added: `scripts/zatca-local-dummy-signing-dry-run.cjs`, `scripts/zatca-local-dummy-signing-dry-run.test.cjs`.
- Docs added: `docs/zatca/LOCAL_DUMMY_SIGNING_DRY_RUN_GUARD.md`.
- Current dummy signing guard status: blocked; `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json` is metadata-only and keeps signing execution disabled, dummy signing disallowed, QR execution disabled, signed validation disabled, no-network true, production compliance false, and evidence body policy metadata-only.
- Current blockers: explicit future local dummy signing execution approval, Java 11-14 runtime for any SDK execution, SDK reference/acquisition policy for CI, key custody, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, secure signed artifact storage, official reviews, and production operations gates.
- Exact next prompt title: `ZATCA approved local dummy signing execution`.
- Local signed XML validation plan completed: yes.
- Signing executed: no.
- CSID/OTP/network used: no.
- Private keys/certificates were exposed: no.
- Scripts added: `scripts/zatca-local-signed-xml-plan.cjs`, `scripts/zatca-local-signed-xml-plan.test.cjs`.
- Docs added: `docs/zatca/LOCAL_SIGNED_XML_VALIDATION_PLAN.md`.
- Current local signed XML status: blocked/planning-only; `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json` is metadata-only and keeps signing execution disabled, dummy signing disallowed, no-network true, production compliance false, and evidence body policy metadata-only.
- Current blockers: explicit future local dummy signing approval, Java 11-14 runtime for any SDK execution, SDK reference/acquisition policy for CI, key custody, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, secure signed artifact storage, official reviews, and production operations gates.
- Real network/signing/CSID/clearance/PDF-A3 status remains disabled.
- Latest sprint completed: ZATCA local generated XML fixture validation.
- Latest commit inspected before the sprint: `704aa1d5 feat: add Sales AR and purchase matching workflows`.
- Generated fixtures added: `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note`.
- Evidence added: `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`, metadata-only, no XML bodies or secrets.
- Java/SDK status: default Java 17 is unsupported and safely blocks; Java 11.0.26 via `ZATCA_SDK_JAVA_BIN` passed local/no-network SDK validation for both generated fixtures.
- Production hosting research is paused.
- AWS remains the known future production direction from proposed ADR-001/ADR-013.
- Vercel remains beta/user-testing/staging only, not final production hosting.
- Next work is product development completion before more production-hosting research.
- Development completion plan: [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md).
- `DEV-01 Full route QA and blocker triage` is completed through final placeholder triage.
- DEV-01 Part 1 route inventory is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 2 auth, dashboard, setup, and navigation QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 3 sales and AR route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 3.5 local QA runtime blocker triage is completed and refreshed in [docs/development/DEV_01_LOCAL_QA_RUNBOOK.md](docs/development/DEV_01_LOCAL_QA_RUNBOOK.md).
- DEV-01 Part 4 purchases and AP route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 5 banking and reconciliation route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 6 inventory route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 7 reports, documents, settings, admin, and audit route QA is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 Part 8 placeholder unimplemented route QA and final triage is completed in [docs/development/DEV_01_ROUTE_QA_LOG.md](docs/development/DEV_01_ROUTE_QA_LOG.md).
- DEV-01 final triage is created in [docs/development/DEV_01_FINAL_TRIAGE.md](docs/development/DEV_01_FINAL_TRIAGE.md).
- DEV-02 Part 1 verification gate inventory is completed in [docs/development/DEV_02_VERIFICATION_GATE_INVENTORY.md](docs/development/DEV_02_VERIFICATION_GATE_INVENTORY.md).
- DEV-02 Part 2 verification gate design is completed in [docs/development/DEV_02_VERIFICATION_GATE_DESIGN.md](docs/development/DEV_02_VERIFICATION_GATE_DESIGN.md).
- DEV-02 Part 3 verification gate scripts are implemented in `scripts/verify-gate.cjs`, tested by `scripts/verify-gate.test.cjs`, and documented in [docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md](docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md).
- DEV-02 Part 4 documentation wiring is completed: README points to the verification runbook, and [docs/development/DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md](docs/development/DEV_02_LIGHTWEIGHT_CI_PROPOSAL.md) captures the CI proposal without workflow implementation.
- DEV-02 Part 5 PR CI workflow is implemented at `.github/workflows/pr-verification.yml`; it is separate from `.github/workflows/deployed-e2e.yml`.
- DEV-02 is completed. Final handoff: [docs/development/DEV_02_FINAL_HANDOFF.md](docs/development/DEV_02_FINAL_HANDOFF.md).
- DEV-02 Part 6 verified the PR workflow locally as far as safe: runner tests passed, `verify:diff` passed, `verify:ci:local -- --plan` passed, package JSON parsed, and lightweight workflow inspection confirmed PR CI has no secrets, URLs, services, migrations, seed/reset/delete, E2E, smoke, ZATCA, email, backup/restore, deploys, or login/audit-writing steps.
- Routes browser-QA'd or code-reviewed in Part 2: `/`, `/login`, `/register`, `/password-reset`, `/password-reset/confirm`, `/invite/accept`, `/dashboard`, `/setup`, `/organization/setup`, `/sales/quotes`, and `/fixed-assets`.
- Routes fixed in Part 2: `/setup`, `/organization/setup`, and unmatched app-shell placeholder routes such as `/sales/quotes` and `/fixed-assets`.
- Main blocker from Part 2: local API health was not reachable at `http://localhost:4000/health`, so authenticated dashboard/setup/organization and auth-submit success flows remain deferred.
- Routes code-reviewed in Part 3: `/contacts`, `/contacts/[id]`, `/sales/invoices`, `/sales/invoices/new`, `/sales/invoices/[id]`, `/sales/invoices/[id]/edit`, `/sales/customer-payments`, `/sales/customer-payments/new`, `/sales/customer-payments/[id]`, `/sales/customer-refunds`, `/sales/customer-refunds/new`, `/sales/customer-refunds/[id]`, `/sales/credit-notes`, `/sales/credit-notes/new`, `/sales/credit-notes/[id]`, and `/sales/credit-notes/[id]/edit`.
- Routes fixed in Part 3: `/sales/invoices/new` now honors `?customerId=...` from contact-ledger invoice links.
- Main blockers from Part 3: in-app browser route visits were blocked by the browser URL policy, and local API health was not reachable at `http://localhost:4000/health`; authenticated Sales/AR runtime QA remains deferred.
- Part 3.5 refresh: local Docker Postgres and Redis are healthy on `localhost:5432` and `localhost:6379`; `@ledgerbyte/api` starts on `localhost:4000`; `/health` and `/readiness` return `200`; `@ledgerbyte/web` serves `/login` and `/dashboard` on `localhost:3000`.
- Part 3.5 remaining blocker: the in-app Browser local route visits are blocked by Browser Use URL policy in this Codex session. Future DEV-01 route QA should use mixed code review, shell HTTP, and API readiness checks unless an allowed local browser/runtime path is available. Login-dependent QA was not run because login writes an audit log.
- Part 4 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 21 Purchases/AP routes using synthetic ids for dynamic routes.
- Graphify in Part 4: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `cfbddc0`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 4: `/purchases/purchase-orders`, `/purchases/purchase-orders/new`, `/purchases/purchase-orders/[id]`, `/purchases/purchase-orders/[id]/edit`, `/purchases/bills`, `/purchases/bills/new`, `/purchases/bills/[id]`, `/purchases/bills/[id]/edit`, `/purchases/supplier-payments`, `/purchases/supplier-payments/new`, `/purchases/supplier-payments/[id]`, `/purchases/supplier-refunds`, `/purchases/supplier-refunds/new`, `/purchases/supplier-refunds/[id]`, `/purchases/cash-expenses`, `/purchases/cash-expenses/new`, `/purchases/cash-expenses/[id]`, `/purchases/debit-notes`, `/purchases/debit-notes/new`, `/purchases/debit-notes/[id]`, and `/purchases/debit-notes/[id]/edit`.
- Routes fixed in Part 4: `/purchases/bills/new` now honors `?supplierId=...`; `/purchases/supplier-payments/new` now honors `?supplierId=...&billId=...` and preselects the target open-bill amount.
- Part 4 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, AP state-changing actions, PDF/archive generation, and attachment workflows remain deferred. Debit-note edit/update/delete permission naming should be confirmed because it uses `purchaseDebitNotes.create` rather than a dedicated update permission.
- Part 5 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 14 Banking/Reconciliation routes using synthetic ids for dynamic routes.
- Graphify in Part 5: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `58227ed`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 5: `/bank-accounts`, `/bank-accounts/new`, `/bank-accounts/[id]`, `/bank-accounts/[id]/edit`, `/bank-accounts/[id]/reconciliation`, `/bank-accounts/[id]/reconciliations`, `/bank-accounts/[id]/reconciliations/new`, `/bank-accounts/[id]/statement-imports`, `/bank-accounts/[id]/statement-transactions`, `/bank-reconciliations/[id]`, `/bank-statement-transactions/[id]`, `/bank-transfers`, `/bank-transfers/new`, and `/bank-transfers/[id]`.
- Routes fixed in Part 5: `/bank-accounts/[id]` now hides transfer creation links unless `bankTransfers.create` is present; `/bank-accounts/[id]/reconciliation` now hides import/create/account links unless matching permissions are present; `/bank-accounts/[id]/reconciliations/new` now requires `bankReconciliations.create`; `/bank-reconciliations/[id]` now hides CSV/PDF report downloads unless `reports.export` or `generatedDocuments.download` is present.
- Part 5 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, bank profile mutations, statement imports, matching/categorization, reconciliation lifecycle mutations, bank transfer posting/voiding, report download/archive generation, and attachment workflows remain deferred.
- Part 6 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 28 Inventory routes using synthetic ids for dynamic routes.
- Graphify in Part 6: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `0f1a112`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 6: `/items`, `/inventory/warehouses`, `/inventory/warehouses/[id]`, `/inventory/stock-movements`, `/inventory/stock-movements/new`, `/inventory/adjustments`, `/inventory/adjustments/new`, `/inventory/adjustments/[id]`, `/inventory/adjustments/[id]/edit`, `/inventory/transfers`, `/inventory/transfers/new`, `/inventory/transfers/[id]`, `/inventory/purchase-receipts`, `/inventory/purchase-receipts/new`, `/inventory/purchase-receipts/[id]`, `/inventory/sales-stock-issues`, `/inventory/sales-stock-issues/new`, `/inventory/sales-stock-issues/[id]`, `/inventory/balances`, `/inventory/settings`, `/inventory/reports/stock-valuation`, `/inventory/reports/movement-summary`, `/inventory/reports/low-stock`, `/inventory/reports/clearing-reconciliation`, `/inventory/reports/clearing-variance`, `/inventory/variance-proposals`, `/inventory/variance-proposals/new`, and `/inventory/variance-proposals/[id]`.
- Routes fixed in Part 6: `/items` now avoids management-only account/tax-rate fetches for viewers; `/inventory/stock-movements` now honors query filters and hides adjustment/transfer links unless matching create permissions exist; `/inventory/reports/clearing-reconciliation` and `/inventory/reports/clearing-variance` now hide CSV download buttons unless report export or generated-document download permission exists.
- Part 6 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, inventory create/approve/void/transfer/adjust/receive/issue/post/reverse/propose-variance workflows, report downloads, attachment workflows, inventory clearing CSV API permission policy, variance proposal account dependency, and inventory update/void permission naming remain deferred.
- Part 7 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, and all 24 Reports/Documents/Settings/Admin/Audit routes using a synthetic role id for `/settings/roles/[id]`.
- Graphify in Part 7: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `58a846a`) and was not treated as runtime proof or staged.
- Routes code-reviewed in Part 7: `/reports`, `/reports/general-ledger`, `/reports/trial-balance`, `/reports/profit-and-loss`, `/reports/balance-sheet`, `/reports/vat-summary`, `/reports/aged-receivables`, `/reports/aged-payables`, `/documents`, `/accounts`, `/journal-entries`, `/journal-entries/new`, `/tax-rates`, `/fiscal-periods`, `/branches`, `/settings/team`, `/settings/roles`, `/settings/roles/[id]`, `/settings/documents`, `/settings/storage`, `/settings/email-outbox`, `/settings/audit-logs`, `/settings/number-sequences`, and `/settings/zatca`.
- Routes fixed in Part 7: shared core report CSV/PDF buttons now require `reports.export` or `generatedDocuments.download`; `/documents` archived PDF download buttons now require `generatedDocuments.download`.
- Part 7 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, report/document/audit exports and downloads, journal/account/tax/fiscal/branch/team/role/storage/email/ZATCA mutations, `/settings/team` role-list permission dependency, `/settings/storage` backup-evidence permission policy, and `/settings/email-outbox` email-admin permission policy remain deferred.
- Part 8 local health refresh: `/health` and `/readiness` returned `200`; web shell HTTP checks returned `200` for `/login`, `/dashboard`, all 31 known placeholder/titleMap paths, and 5 real-route shadow checks.
- Graphify in Part 8: untracked `graphify-out/GRAPH_REPORT.md`, `graphify-out/manifest.json`, and `graphify-out/graph.json` were available and used only as QA planning/blast-radius aids. The graph was stale (`edaec451` vs current `996a2ca`) and was not treated as runtime proof or staged.
- Placeholder/unimplemented routes code-reviewed in Part 8: `/get-started`, `/inbox`, `/sales`, `/sales/quotes`, `/sales/recurring-invoices`, `/sales/cash-invoices`, `/sales/delivery-notes`, `/sales/api-invoices`, `/purchases`, `/beneficiaries`, `/payroll`, `/products`, `/accounting`, `/fixed-assets`, `/cost-centers`, `/projects`, `/developer`, `/developer/api-keys`, `/integrations`, and `/document-templates`.
- Routes fixed in Part 8: known future-module placeholders now map to nearest existing route permissions instead of falling through to generic `dashboard.view`; placeholder wording now states no live integration, payroll, bank-feed, billing, ZATCA, email, posting, or production workflow runs from placeholders.
- Part 8 remaining blockers: in-app Browser route visits, authenticated browser-runtime QA, login-dependent QA, dedicated future-module permissions, and future-module implementation remain deferred. Placeholder roots/synonyms such as `/products`, `/accounting`, `/sales`, and `/purchases` need a later UX decision to redirect, become real index pages, or remain direct-only placeholders.
- DEV-02 Part 1 safest current commands found: `git diff --check`, `git diff --cached --check`, targeted workspace typecheck, targeted Jest suites, full non-mutating `corepack pnpm typecheck`, full `corepack pnpm test`, `corepack pnpm build`, `corepack pnpm test:visual`, `node scripts/check-deployed-e2e-env.cjs`, and local API/web health/readiness shell checks when services are already approved and running.
- DEV-02 Part 1 riskiest or blocked verification areas: migrations, seed/reset/delete, API smoke phases, Playwright E2E with login/seeded workflows, deployed beta E2E, output/export/download/PDF checks, ZATCA SDK/CSR/signing commands, user-testing cleanup-plan login, and any browser-runtime authenticated QA without an approved audit-log/fixture policy.
- DEV-02 Part 2 recommended default local gate: `git diff --check`, targeted changed-workspace `typecheck`, targeted changed-area Jest/package tests, and `git diff --cached --check` after staging.
- DEV-02 Part 2 recommended PR/CI gate: install with `corepack pnpm install --frozen-lockfile`, then run `git diff --check`, `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, `node --test scripts/test-credential-env.test.cjs`, and `corepack pnpm test:user-testing-cleanup-plan`.
- DEV-02 Part 2 manual/nightly gate summary: `corepack pnpm test:visual` plus local API/web health/readiness shell checks first; E2E and smoke slices remain manual only with explicit disposable-data, credential, login/audit, and cleanup approval.
- DEV-02 Part 2 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, and production targets.
- DEV-02 Part 3 safe scripts now available: `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`. The runner prints command plans, supports `--plan`/`--dry-run`, supports targeted web/API test args, and fails fast on command failure.
- DEV-02 Part 3 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, and production targets.
- DEV-02 Part 4 CI proposal status: proposed PR workflow would run checkout, setup Node/Corepack, install with frozen lockfile, `verify:diff`, and `verify:ci:local`; `.github/workflows/*` was not edited.
- DEV-02 Part 4 README verification section status: README now links to the runbook and lists `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`.
- DEV-02 Part 4 commands still forbidden or manual-only: migrations, seed/reset/delete, demo seeding, smoke, full E2E, deployed beta E2E, login/audit-writing browser QA, visual snapshot updates, real ZATCA, real email, backup/restore, deploys, provider setting changes, environment changes, production targets, and customer-data mutation.
- DEV-02 Part 5 CI commands: checkout, setup Node 22, enable Corepack, `corepack pnpm install --frozen-lockfile`, `corepack pnpm verify:diff`, and `corepack pnpm verify:ci:local`.
- DEV-02 Part 5 CI exclusions: no secrets, no production URLs, no deployed beta checks, no Vercel/Supabase setting changes, no databases/services, no migrations, no seed/reset/delete, no login/audit-writing flows, no E2E, no smoke, no real ZATCA, no real email, no backup/restore, and no customer-data mutation.
- DEV-02 Part 6 commands run: `node --test scripts/verify-gate.test.cjs`, `corepack pnpm verify:diff`, `corepack pnpm verify:ci:local -- --plan`, package JSON parse, lightweight workflow YAML inspection, `git diff --check`, and `git diff --cached --check` after staging.
- DEV-02 Part 6 commands skipped: actual `corepack pnpm verify:ci:local`, actual `corepack pnpm verify:repo`, full tests, full build, full E2E, full smoke, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup/restore, production-hosting research, and login/audit-writing flows.
- DEV-02 remaining blockers: authenticated browser/runtime route QA, actual login/audit-writing approval for disposable QA, mutation/state-machine QA, output-producing export/PDF/download/archive checks, real ZATCA/email/storage/backup checks, service-container E2E/smoke design, docs/link checking, and observing the workflow in an actual GitHub-hosted PR run.
- DEV-03 Part 1 state-machine QA inventory is completed in [docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md](docs/development/DEV_03_STATE_MACHINE_QA_INVENTORY.md).
- Highest-risk workflows found: invoice/bill finalization and voiding, AR/AP payment allocation and reversal, credit/debit note allocation and voiding, bank transfer posting/voiding, statement transaction match/categorize/ignore, reconciliation submit/approve/close/void, inventory adjustment/transfer/receipt/issue/variance proposal post/reverse/void flows, manual journal post/reverse, fiscal period posting locks, and report/document/audit export or PDF/archive gates.
- DEV-03 Part 1 performed no runtime mutations: no login, create, finalize, approve, close, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 2 safe fixture/login/audit policy is completed in [docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md).
- DEV-03 Part 2 key policy decisions: future mutation QA is local-disposable only by default; production is forbidden; beta/user-testing requires separate approval; login is allowed only in future explicitly approved batches; audit writes become expected evidence; fixture records require `DEV03-...` markers; seed/reset/delete, real customer data, exports/downloads/PDF, ZATCA, email, backup/restore, deploys, env changes, and provider changes remain forbidden by default.
- DEV-03 Part 2 performed no login and no runtime mutation: no create, finalize, approve, close, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 3 AR state-machine QA dry-run plan is completed in [docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk AR transitions: sales invoice finalize/void with payment and credit allocation blockers; customer payment allocation, unapplied allocation reversal, refund blocker, and void behavior; customer refund source-claim and void restoration; credit note finalize/apply/reverse/void with allocation and refund blockers; AR PDF/archive endpoints that create generated-document records.
- DEV-03 Part 3 performed no login, fixture creation, or runtime mutation: no create, edit, finalize, void, reverse, allocate, refund, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 4 AP state-machine QA dry-run plan is completed in [docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk AP transitions: purchase order approve/mark-sent/close/void/convert-to-bill; purchase bill finalize/void with inventory-clearing readiness and supplier payment/debit-note/unapplied allocation blockers; supplier payment direct allocation, unapplied allocation, allocation reversal, refund blocker, and void behavior; supplier refund source claim and void restoration; purchase debit note finalize/apply/reverse/void with allocation and refund blockers; cash expense immediate posting/void; AP PDF/archive endpoints that create generated-document records.
- DEV-03 Part 4 performed no login, fixture creation, or runtime mutation: no create, edit, approve, close, finalize, void, reverse, allocate, refund, receive, post, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 5 banking/reconciliation state-machine QA dry-run plan is completed in [docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk banking/reconciliation transitions: bank opening-balance posting; bank transfer create/void reversal; statement import persistence and import void blockers; statement transaction match/categorize/ignore, especially categorization journal posting; closed reconciliation period locks; reconciliation submit/approve/reopen/close/void lifecycle; and reconciliation CSV/PDF/archive output gates.
- DEV-03 Part 5 performed no login, fixture creation, or runtime mutation: no create, edit, import, preview-import, reconcile, submit, approve, close, void, reverse, match, categorize, ignore, transfer, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 6 inventory state-machine QA dry-run plan is completed in [docs/development/DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md](docs/development/DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md).
- Highest-risk inventory transitions: item inventory-tracking and warehouse archive gates; direct opening-balance stock movement boundary; inventory adjustment approve/void with no-negative-stock checks; warehouse transfer create/void with paired movement reversals; purchase receipt create/void and explicit receipt asset post/reverse; sales stock issue create/void and explicit COGS post/reverse; inventory settings/accounting readiness changes; clearing report output gates; and variance proposal create/submit/approve/post/reverse/void.
- DEV-03 Part 6 performed no login, fixture creation, or runtime mutation: no create, edit, approve, void, transfer, receive, issue, post, reverse, propose variance, approve variance, export, download, upload, delete, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research was run.
- DEV-03 Part 7 journals/reports/documents/output-gate dry-run plan is completed in [docs/development/DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md](docs/development/DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md).
- Highest-risk journals/reports/documents/output transitions: manual journal post/reverse with fiscal-period lock enforcement, fiscal period close/reopen/lock behavior, account/tax/number-sequence admin changes affecting future postings and outputs, report CSV/PDF permission and generated-document archive gates, generated-document download exposure, audit CSV export and retention settings, document settings output changes, and backup/storage metadata evidence gates.
- DEV-03 Part 7 performed no login, fixture creation, runtime mutation, export, download, PDF generation, generated-document archive creation, audit CSV export, backup/storage evidence mutation, migration, seed/reset/delete, smoke, E2E, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-03 Part 8 final state-machine QA triage is completed in [docs/development/DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md](docs/development/DEV_03_FINAL_STATE_MACHINE_QA_TRIAGE.md).
- DEV-03 is completed as planning/triage only. No login, fixture creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, ZATCA, email, backup/restore, deploy, env change, production-hosting research, production check, beta check, or customer-data check was performed.
- Highest-risk consolidated areas: AR/AP lifecycle posting and allocation, bank transfer/statement/reconciliation state, inventory quantity/cost and posting lifecycles, manual journals/fiscal-period locks, report/document/audit output gates, and admin/audit side effects.
- DEV-04 Part 1 local disposable fixture implementation plan is completed in [docs/development/DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md](docs/development/DEV_04_LOCAL_DISPOSABLE_FIXTURE_PLAN.md).
- DEV-04 Part 1 performed no fixture script creation, login, fixture data creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- Recommended fixture implementation approach: a dedicated local-only dry-run-first fixture runner that uses guarded direct Prisma only for base org/user/role/bootstrap setup after approval, then service/API-layer fixture creation for business records so validations and audit behavior are preserved. Demo/smoke helpers should be mined for target guards and idempotent patterns, not reused as default commands.
- DEV-04 Part 2 fixture script design is completed in [docs/development/DEV_04_FIXTURE_SCRIPT_DESIGN.md](docs/development/DEV_04_FIXTURE_SCRIPT_DESIGN.md).
- DEV-04 Part 2 performed no fixture script creation, login, fixture data creation, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- Proposed runner path and commands: `apps/api/scripts/dev04-fixture-runner.ts`; future API script `fixture:dev04`; future root helpers `fixture:dev04:plan`, `fixture:dev04:dry-run`, `fixture:dev04:cleanup-plan`, and manual-only `fixture:dev04:execute`.
- DEV-04 Part 3 dry-run skeleton is implemented in `apps/api/scripts/dev04-fixture-runner.ts` with tests in `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- DEV-04 Part 3 package scripts added: API `fixture:dev04`; root `fixture:dev04:plan`, `fixture:dev04:dry-run`, and `fixture:dev04:cleanup-plan`. A root execute script was intentionally not added.
- DEV-04 Part 3 runner behavior: supports `--plan`, `--dry-run`, `--cleanup-plan`, `--family ar|ap|bank|inv|jrd|all`, `--marker DEV03-...|DEV04-...`, `--database-url`, `--api-url`, and `--json-summary`; refuses `--execute`, `--allow-local-mutation`, `--allow-login`, invalid markers, destructive operation terms, and production/beta/user-testing/hosted targets.
- DEV-04 Part 3 performed no login, fixture data creation, database connection, Prisma write, service-layer write, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-04 Part 4 fixture runner guard hardening is completed in `apps/api/scripts/dev04-fixture-runner.ts` with expanded tests in `apps/api/scripts/dev04-fixture-runner.spec.ts`.
- DEV-04 Part 4 guard behavior: generic `DATABASE_URL` is ignored by the dry-run runner; explicit `--database-url` or `LEDGERBYTE_DEV04_DATABASE_URL` can be validated only as local plan targets. Hosted/deployed target denylist coverage now includes Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, production, prod, and live target patterns.
- DEV-04 Part 4 output behavior: plan/dry-run/cleanup-plan output now states `NO DATA CREATED`, `NO DATABASE WRITES`, selected mode/family/marker, disabled execute/fixture/mutation/login status, cleanup-plan-only status, and the next manual approval needed before write behavior can be implemented. JSON summaries include explicit non-mutating flags.
- DEV-04 Part 4 tests added/updated: hosted URL variants, local URL variants, missing/generic database target behavior, marker edge cases, execute refusal, cleanup-plan no-delete wording, JSON non-mutating flags, and secret redaction coverage.
- DEV-04 Part 4 performed no execute run, login, fixture data creation, database connection, Prisma write, service-layer write, runtime mutation, export, download, PDF generation, generated-document archive creation, smoke, E2E, migration, seed/reset/delete, ZATCA, email, backup/restore, deployment, env change, or production-hosting research.
- DEV-04 fixture runner is finalized in [docs/development/DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md](docs/development/DEV_04_FINAL_FIXTURE_RUNNER_HANDOFF.md).
- DEV-04 safe commands available: root `fixture:dev04:plan`, `fixture:dev04:dry-run`, and `fixture:dev04:cleanup-plan`; API `fixture:dev04`. A root execute script still does not exist.
- DEV-04 Part 5 finalization status: execute mode is not enabled; fixture creation was not performed; database writes were not performed; login/audit-writing flows were not performed; runtime mutations were not performed.
- DEV-05 Part 1 approved local fixture creation plan is completed in [docs/development/DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md](docs/development/DEV_05_LOCAL_FIXTURE_CREATION_APPROVAL_PLAN.md).
- DEV-05 Part 1 approval checklist summary: future fixture creation requires explicit local disposable DB approval, fixture creation method/family/marker approval, login/audit-write approval if needed, cleanup/retention approval, and explicit no-production/no-beta/no-customer-data boundary approval.
- DEV-05 Part 1 proposed first target: Sales/AR local disposable fixtures with `DEV03-AR-...` markers, fake local data only, and bootstrap/base AR records only unless a later prompt expands scope.
- DEV-05 Part 1 status: execute mode was not enabled; no execute package script was added; no fixture data was created; no database connection or write was performed; no login/audit-writing flow was run; no runtime mutation was performed.
- DEV-05 Part 2 execute-gated fixture skeleton is completed in [docs/development/DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md](docs/development/DEV_05_EXECUTE_GATED_FIXTURE_SKELETON.md).
- DEV-05 Part 2 runner behavior: `--execute` now models future local-only approval gates and Sales/AR proposed records, but still exits refused with `executeEnabled=false`, `writesPerformed=false`, `NO DATA CREATED`, and `NO DATABASE WRITES`.
- DEV-05 Part 2 first future fixture family: Sales/AR with `DEV03-AR-...` markers.
- DEV-05 Part 2 status: execute mode did not actually run, no fixture data was created, no database connection/write occurred, no login/audit-writing flow ran, and no runtime mutation happened. A root execute package script still does not exist.
- DEV-05 Part 3A AR fixture creation preflight is completed in [docs/development/DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md](docs/development/DEV_05_AR_FIXTURE_CREATION_PREFLIGHT.md).
- DEV-05 Part 3A status: no execute mode actually ran, no login/audit-writing flow ran, no fixture data was created, no database connection/write occurred, and no runtime mutation happened.
- DEV-05 Part 3A exact future approval phrase before any local fixture write: `I approve DEV-05 Part 3B local-only AR fixture creation against a disposable local database. No production, no beta, no customer data.`
- DEV-05 Part 3B approved local AR fixture creation run is documented in [docs/development/DEV_05_AR_FIXTURE_CREATION_RUN.md](docs/development/DEV_05_AR_FIXTURE_CREATION_RUN.md).
- DEV-05 Part 3B approval was confirmed for local disposable Sales/AR base fixtures only, family `ar`, marker `DEV03-AR-20260524T130000`, fake local data only, and no production/beta/customer data.
- DEV-05 Part 3B runner update: the API runner now has a guarded approved local Sales/AR base-fixture execute path; no root execute package script was added.
- DEV-05 Part 3B result: fixture creation was blocked because the explicit local PostgreSQL target on `localhost:5432` was not reachable. Fixtures created: no. Database writes occurred: no. Successful database connection opened: no. Login/audit-writing occurred: no. AR lifecycle mutation occurred: no.
- DEV-05 Part 3C approved local AR fixture creation retry is documented in [docs/development/DEV_05_AR_FIXTURE_CREATION_RETRY.md](docs/development/DEV_05_AR_FIXTURE_CREATION_RETRY.md).
- DEV-05 Part 3C readiness result: local Docker Postgres `infra-postgres-1` was running and healthy; `localhost:5432` was listening and reachable. No Docker service was started, and no migration, seed, reset, delete, or environment change was run.
- DEV-05 Part 3C result: fixture creation completed for family `ar` with marker `DEV03-AR-20260524T130000`. Fixtures created: 12 base records. Database writes occurred: yes, only against the approved local target and only for marker-scoped Sales/AR base records. Login/audit-writing occurred: no. AR lifecycle mutation occurred: no. Output actions occurred: no.
- DEV-05 Part 3C created local fixture labels: `DEV03-AR-ORG-20260524T130000`, `DEV03-AR-USER-20260524T130000`, `DEV03-AR-ROLE-20260524T130000`, `DEV03-AR-USER-ROLE-20260524T130000`, `DEV03-AR-ACCT-AR-20260524T130000`, `DEV03-AR-ACCT-REV-20260524T130000`, `DEV03-AR-ACCT-VAT-20260524T130000`, `DEV03-AR-ACCT-CASH-20260524T130000`, `DEV03-AR-TAX-20260524T130000`, `DEV03-AR-CASH-20260524T130000`, `DEV03-AR-CUSTOMER-20260524T130000`, and `DEV03-AR-SERVICE-20260524T130000`.
- DEV-05 Part 4 local AR fixture evidence verification is completed in [docs/development/DEV_05_AR_FIXTURE_EVIDENCE.md](docs/development/DEV_05_AR_FIXTURE_EVIDENCE.md).
- DEV-05 Part 4 evidence result: read-only verification succeeded for family `ar` and marker `DEV03-AR-20260524T130000`; expected fixture count was 12 and actual fixture count was 12; all discovered labels matched the marker prefix; zero AR lifecycle, journal, generated-document, or audit-log side-effect records were found in the fixture organization.
- DEV-05 Part 4 status: no new fixture data was created, no database writes occurred in Part 4, no login/audit-writing flow ran, and no AR lifecycle mutation, export, download, PDF generation, archive generation, email, ZATCA, backup/restore, migration, seed/reset/delete, smoke, E2E, deploy, env change, production check, beta check, or customer-data check was run.
- DEV-05 Part 5 local AR fixture cleanup-plan validation is completed in [docs/development/DEV_05_AR_FIXTURE_CLEANUP_PLAN_VALIDATION.md](docs/development/DEV_05_AR_FIXTURE_CLEANUP_PLAN_VALIDATION.md).
- DEV-05 Part 5 cleanup-plan result: the cleanup-plan command remained plan-only, stated deletion is not implemented, printed `NO DATA CREATED` and `NO DATABASE WRITES`, and identified the Sales/AR cleanup inventory for family `ar` with marker `DEV03-AR-20260524T130000`. A read-only local inventory query found all 12 expected marker-scoped records and no non-marker records in the cleanup validation summary.
- DEV-05 Part 5 status: deletion occurred: no; database writes occurred in Part 5: no; login/audit-writing occurred: no; AR lifecycle mutation occurred: no; fixture creation, export, download, PDF generation, archive generation, email, ZATCA, backup/restore, migration, seed/reset/delete, smoke, E2E, deploy, env change, production check, beta check, and customer-data check were not run.
- DEV-06 Part 1 AR state-machine QA plan is completed in [docs/development/DEV_06_AR_STATE_MACHINE_QA_PLAN.md](docs/development/DEV_06_AR_STATE_MACHINE_QA_PLAN.md).
- DEV-06 Part 1 status: AR mutations were performed: no; fixture creation occurred: no; cleanup deletion occurred: no; DB writes occurred: no; login/audit-writing flows, exports/downloads/PDF/archive generation, ZATCA, email, backup/restore, smoke, E2E, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 1 recommended first AR mutation slice: local-only creation and edit of one draft sales invoice against marker `DEV03-AR-20260524T130000`, with no finalize, void, payment allocation, refund, credit note, export, download, PDF, archive, email, ZATCA, cleanup deletion, production, beta, or customer data.
- DEV-06 Part 1 exact approval phrase before mutation: `I approve DEV-06 Part 2 local-only AR draft invoice create/edit mutation against disposable local fixtures. No production, no beta, no customer data.`
- DEV-06 Part 2 approved local AR draft invoice create/edit mutation is completed in [docs/development/DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md](docs/development/DEV_06_AR_DRAFT_INVOICE_MUTATION_RUN.md).
- DEV-06 Part 2 local readiness result: local Docker Postgres was running and healthy, `localhost:5432` was reachable, and the target was accepted only as an explicit local disposable database target.
- DEV-06 Part 2 mutation result: one draft sales invoice was created and edited against family `ar`, marker `DEV03-AR-20260524T130000`, with invoice number `INVOICE-000001`; status remained `DRAFT` after edit.
- DEV-06 Part 2 side effects: journal entries `0`; generated documents `0`; customer payments/refunds/credit notes/allocations `0`; finalized invoices `0`; voided invoices `0`; SalesInvoice audit logs `2` with actions `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; invoice number sequence advanced as expected for local draft invoice creation.
- DEV-06 Part 2 status: finalize/void/allocation/refund/credit-note mutation/PDF/archive/email/ZATCA did not occur; login/audit-writing browser flows did not run; cleanup deletion, fixture creation, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 3 read-only AR draft invoice evidence verification is completed in [docs/development/DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_DRAFT_INVOICE_EVIDENCE_VERIFICATION.md).
- DEV-06 Part 3 evidence result: local Docker Postgres was running and healthy, `localhost:5432` was reachable, marker `DEV03-AR-20260524T130000` and family `ar` were verified, the base fixture count remained `12`, `INVOICE-000001` matched safe id prefix `6ebb2d71`, and invoice status remained `DRAFT`.
- DEV-06 Part 3 side-effect result: finalized invoices `0`; voided invoices `0`; journal entries `0`; generated documents `0`; customer payments/refunds/credit notes/allocations `0`; ZATCA metadata/artifacts/submission logs `0`; email outbox/provider events `0`; SalesInvoice audit logs `2` with actions `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; auth/login audit logs `0`; invoice sequence next number remained `2`.
- DEV-06 Part 3 status: no mutation was performed, no new fixture data was created, no database write occurred, no cleanup deletion ran, no login/browser audit-writing flow ran, and no finalize/void/allocation/refund/credit-note mutation/export/download/PDF/archive/email/ZATCA action occurred.
- DEV-06 Part 4 local AR invoice finalize mutation plan is completed in [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_PLAN.md).
- DEV-06 Part 4 expected finalization side effects from inspected code: `INVOICE-000001` should transition `DRAFT -> FINALIZED`, one posted journal entry should be created, balance due should remain equal to the invoice total until payment/credit allocation, one `SALES_INVOICE_FINALIZED` audit log should be written, and local `ZatcaInvoiceMetadata` should be upserted for `STANDARD_TAX_INVOICE`.
- DEV-06 Part 4 expected non-effects from inspected code: finalization does not call generated-document archive/PDF routes, does not send email, does not run ZATCA XML/signing/submission, does not create payments/refunds/credit notes/allocations, does not create reversal journals, and does not delete fixtures.
- DEV-06 Part 4 status: mutation performed: no; invoice finalization did not run; database writes occurred: no; fixture creation, cleanup deletion, login/browser audit-writing flows, export/download/PDF/archive, email, ZATCA XML/signing/submission, migrations, seed/reset/delete, deploys, env changes, production checks, beta checks, and customer-data checks were not run.
- DEV-06 Part 4 exact approval phrase before Part 5: `I approve DEV-06 Part 5 local-only AR invoice finalize mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-06 Part 5: approved local AR invoice finalize mutation`.

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
- DEV-06 Part 5 attempted the approved local-only AR invoice finalize preflight and stopped before mutation because the fixture organization was missing the finalize service's required active posting account codes `120` and `220`.
- DEV-06 Part 5B resolved the local fixture blocker by adding active posting account codes `120` and `220` to the DEV03-AR fixture organization and updating the fixture runner so future AR fixtures include those service-required dependencies.
- DEV-06 Part 5C retried the approved local-only AR invoice finalize mutation and finalized `INVOICE-000001` locally.
- DEV-06 Part 6 verified the finalized invoice evidence with read-only local checks and performed no mutation.
- DEV-06 Part 7 created the local-only void mutation plan and performed no mutation.
- DEV-06 Part 8 executed the approved local-only invoice void mutation and voided `INVOICE-000001` locally.
- DEV-06 Part 9 verified the void evidence with read-only local checks and performed no mutation.
- DEV-06 Part 10 completed the AR invoice lifecycle final triage as documentation/read-only work.
- DEV-07 Part 1 completed the AR customer payment allocation state-machine plan as documentation/read-only work.
- DEV-07 Part 2 completed the AR payment allocation fixture plan as documentation/read-only work.
- Exact next recommended development ticket: `DEV-07 Part 3E: approved local AR payment-allocation invoice fixture mutation`.

## DEV-06 Part 5 - Invoice Finalize Preflight Blocked

- Approval phrase was received for one local-only finalize mutation for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the target was the local Docker PostgreSQL database label `accounting`.
- Non-mutating checks passed before the blocker: targeted AR Jest suites (`4` suites, `84` tests), `fixture:dev04:cleanup-plan` in plan-only/no-write mode, and `corepack pnpm verify:diff`.
- A temporary script under `apps/api/scripts` guarded the exact marker, family, invoice number, safe id prefix, and local target, then stopped before service use because account code `120` was missing; code `220` was also absent.
- Existing fixture accounts are marker-scoped (`DEV03-AR-ACCT-AR`, `REV`, `VAT`, `CASH`) under `D3AR-...` codes, while `SalesInvoiceService.finalize(...)` currently requires posting account codes `120` and `220`.
- No finalize mutation was performed: `SalesInvoiceService.finalize(...)` was not called.
- `INVOICE-000001` remains `DRAFT`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain absent; total and balance due remain `287.5000`.
- Journal entries remain `0`; SalesInvoice audit actions remain `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; auth/login audit logs remain `0`; ZATCA metadata remains `0`.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA XML/signing/submission artifacts, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RUN.md).
- The temporary script was removed and was not staged or tracked.
- Do not proceed to `DEV-06 Part 6: verify AR invoice finalize evidence` until a future approved run actually finalizes the invoice.

## DEV-06 Part 5B - Posting Account Blocker Resolved

- Root cause: `SalesInvoiceService.finalize(...)` resolves accounts receivable and VAT payable through active posting account codes `120` and `220`; the existing DEV03-AR fixture accounts used marker-scoped `D3AR-...` codes only.
- Decision: fixture repair plus fixture runner improvement. The service behavior was left unchanged because `120` and `220` are defined default chart accounts, and changing finalization account resolution would be broader production accounting behavior.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and only the local Docker PostgreSQL target was used.
- Local repair created or repaired exactly two accounts in the fixture organization: `DEV03-AR-ACCT-120-20260524T130000` (`120`, `ASSET`, active, posting allowed) and `DEV03-AR-ACCT-220-20260524T130000` (`220`, `LIABILITY`, active, posting allowed).
- Fixture runner improvement: future AR fixture creation now includes service-required posting account codes `120` and `220`; the runner test expects the posting-account dependency in the dry-run plan.
- Invoice finalization did not run: `SalesInvoiceService.finalize(...)` was not called.
- `INVOICE-000001` remains `DRAFT`; total and balance due remain `287.5000`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain absent.
- Journal entries, finalized invoices, generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA metadata/signed drafts/submission logs, and cleanup deletion remain `0`.
- SalesInvoice audit logs remain `2` with `SALES_INVOICE_CREATED` and `SALES_INVOICE_UPDATED`; `SALES_INVOICE_FINALIZED` remains `0`; fixture org login audit logs remain `0`.
- Evidence doc: [docs/development/DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md](docs/development/DEV_06_AR_FINALIZE_POSTING_ACCOUNT_BLOCKER_RESOLUTION.md).
- The temporary repair script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 5C: approved local AR invoice finalize mutation retry`.

## DEV-06 Part 5C - Invoice Finalize Mutation Retry Completed

- Approval phrase was received for the local-only retry finalization of `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Preflight passed: targeted AR Jest suites (`4` suites, `84` tests), fixture-runner test (`1` suite, `41` tests), cleanup-plan in plan-only/no-write mode, `corepack pnpm verify:diff`, local Docker Postgres/Redis readiness, local target guard, and read-only invoice/account side-effect checks.
- Account dependencies were present: code `120` active/posting `ASSET`, and code `220` active/posting `LIABILITY`.
- Mutation performed: `SalesInvoiceService.finalize(...)` was called exactly once by a guarded temporary script.
- `INVOICE-000001` is now `FINALIZED`; `finalizedAt` and `journalEntryId` are present; `reversalJournalEntryId` remains absent; total and balance due remain `287.5000`.
- Journal result: one posted journal entry `JOURNAL_ENTRY-000001`, reference `INVOICE-000001`, total debit `287.5000`, total credit `287.5000`.
- Journal lines: debit account `120` for `287.5000`, credit fixture revenue account for `250.0000`, and credit account `220` for `37.5000`.
- Audit result: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`; fixture org login audit logs remain `0`.
- ZATCA result: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_MUTATION_RETRY_RUN.md).
- The temporary retry script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 6: verify AR invoice finalize evidence`.

## DEV-06 Part 6 - Invoice Finalize Evidence Verified

- Part 6 performed read-only local verification for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the explicit database target parsed as local PostgreSQL on `localhost:5432`.
- Account dependencies remain present: account code `120` is active/posting `ASSET`, and account code `220` is active/posting `LIABILITY`; the original marker-coded fixture accounts also remain present.
- `INVOICE-000001` remains `FINALIZED`; `finalizedAt` and `journalEntryId` remain present; `reversalJournalEntryId` remains absent; total and balance due remain `287.5000`.
- Journal evidence remains valid: one posted journal entry `JOURNAL_ENTRY-000001`, reference `INVOICE-000001`, total debit `287.5000`, total credit `287.5000`, with lines debit account `120` `287.5000`, credit fixture revenue `250.0000`, and credit account `220` `37.5000`.
- Audit evidence remains valid: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, and `SALES_INVOICE_FINALIZED`; `SALES_INVOICE_FINALIZED` count is `1`; fixture org login/auth audit logs remain `0`.
- ZATCA evidence remains valid: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; ZATCA signed drafts/submission logs remain `0`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects remain `0`: generated documents, payments, refunds, credit notes, allocations, voids, reversal journals, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- No mutation was performed in Part 6.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_INVOICE_FINALIZE_EVIDENCE_VERIFICATION.md).
- Exact next prompt title: `DEV-06 Part 7: plan local AR invoice void mutation`.

## DEV-06 Part 7 - Invoice Void Mutation Plan Completed

- Part 7 inspected the sales invoice void controller, service, reversal journal helper, accounting-core reversal helper, fiscal-period guard, audit mapping, permission constants, schema relations, README/BUG_AUDIT lifecycle notes, and targeted unit/smoke references.
- Mutation performed: no. `SalesInvoiceService.void(...)` was not called, no invoice was voided, and no journal/reversal journal was created.
- Planned route for normal API use: `POST /sales-invoices/:id/void`, guarded by JWT auth, organization context, permission guard, and `salesInvoices.void`.
- Planned Part 8 service call for the local-only script: `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once after local target, marker, invoice, status, journal, account, allocation, output, ZATCA, email, and fiscal-period preflight checks pass.
- Expected status transition: `FINALIZED -> VOIDED`.
- Expected invoice effects from inspected code: balance due becomes `0.0000`; `finalizedAt` remains present; `journalEntryId` remains linked to the original journal; `reversalJournalEntryId` becomes present; total remains `287.5000`; invoice sequence does not advance.
- Expected accounting effect from inspected code: one posted reversal journal is created or reused, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, total debit and credit `287.5000`, with reversal lines debit fixture revenue `250.0000`, debit VAT account `220` `37.5000`, and credit AR account `120` `287.5000`. The original journal remains present and changes status from `POSTED` to `REVERSED`.
- Expected audit effect: one new `SALES_INVOICE_VOIDED` audit event, making the SalesInvoice audit action set `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`.
- Expected ZATCA/document/email behavior: existing local `ZatcaInvoiceMetadata` remains present; voiding does not call generated-document/PDF/archive, email, ZATCA XML/signing/QR/submission/clearance/reporting, payment, refund, credit-note, allocation, or cleanup deletion paths.
- Evidence/plan doc: [docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md](docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_PLAN.md).
- Required approval phrase before Part 8: `I approve DEV-06 Part 8 local-only AR invoice void mutation for fixture invoice INVOICE-000001 under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-06 Part 8: approved local AR invoice void mutation`.

## DEV-06 Part 8 - Invoice Void Mutation Completed

- Approval phrase was received for exactly one local-only void mutation for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the API database target parsed as local PostgreSQL on `localhost:5432` with no forbidden production/beta/shared-host pattern.
- Preflight passed: targeted AR Jest suites (`4` suites, `84` tests), fixture-runner test (`1` suite, `41` tests), cleanup-plan in plan-only/no-write mode, `corepack pnpm verify:diff`, local target guard, and read-only invoice/account/journal/side-effect checks.
- Mutation performed: a guarded temporary script called `SalesInvoiceService.void(organizationId, actorUserId, invoiceId)` exactly once.
- `INVOICE-000001` is now `VOIDED`; total remains `287.5000`; balance due is `0.0000`; `finalizedAt` and `journalEntryId` remain present; `reversalJournalEntryId` is present.
- Original journal `JOURNAL_ENTRY-000001` remains present and changed from `POSTED` to `REVERSED`.
- Reversal journal `JOURNAL_ENTRY-000002` is `POSTED`, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, total debit `287.5000`, total credit `287.5000`, and reverses the original journal.
- Reversal lines: debit account `220` VAT `37.5000`, debit fixture revenue `250.0000`, and credit account `120` AR `287.5000`.
- Audit result: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; `SALES_INVOICE_VOIDED` exists exactly once; fixture org login/auth audit logs remain `0`.
- ZATCA result: existing local `ZatcaInvoiceMetadata` remains present with type `STANDARD_TAX_INVOICE`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects stayed `0`: generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md](docs/development/DEV_06_AR_INVOICE_VOID_MUTATION_RUN.md).
- The temporary void script was removed and was not staged or tracked.
- Exact next prompt title: `DEV-06 Part 9: verify AR invoice void evidence`.

## DEV-06 Part 9 - Invoice Void Evidence Verified

- Part 9 performed read-only local verification for `INVOICE-000001` under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Postgres/Redis were healthy, `localhost:5432` was reachable, and the explicit database target parsed as local PostgreSQL on `localhost:5432`.
- Mutation performed: no. No invoice create, edit, finalize, void, repeated void, payment, refund, credit-note, allocation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, or environment change ran.
- `INVOICE-000001` remains `VOIDED`; total remains `287.5000`; balance due remains `0.0000`; `finalizedAt`, `journalEntryId`, and `reversalJournalEntryId` remain present.
- Original journal `JOURNAL_ENTRY-000001` remains `REVERSED`, reference `INVOICE-000001`, debit `287.5000`, credit `287.5000`.
- Reversal journal `JOURNAL_ENTRY-000002` remains `POSTED`, reference `INVOICE-000001`, description `Reversal of JOURNAL_ENTRY-000001`, debit `287.5000`, credit `287.5000`, and points to the original journal.
- Reversal lines remain debit account `220` VAT `37.5000`, debit fixture revenue `250.0000`, and credit account `120` AR `287.5000`.
- Audit evidence remains valid: SalesInvoice audit actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; `SALES_INVOICE_VOIDED` exists exactly once; fixture org login/auth audit logs remain `0`.
- ZATCA evidence remains valid: existing local `ZatcaInvoiceMetadata` remains present with type `STANDARD_TAX_INVOICE`; ZATCA signed drafts/submission logs remain `0`; ZATCA XML/signing/QR/submission/clearance/reporting did not run.
- Forbidden side effects remain `0`: generated documents, payments, refunds, credit notes, allocations, email outbox/provider events, ZATCA signed drafts/submission logs, and cleanup deletion.
- Evidence doc: [docs/development/DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_06_AR_INVOICE_VOID_EVIDENCE_VERIFICATION.md).
- Temporary void script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-06 Part 10: AR state-machine final triage`.

## DEV-06 Part 10 - AR State-Machine Final Triage Completed

- DEV-06 completed the local-only Sales/AR invoice lifecycle slice for marker `DEV03-AR-20260524T130000`.
- Final triage was documentation/read-only only. No invoice create, edit, finalize, void, repeated void, payment, refund, credit-note, allocation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, persisted environment configuration, schema, or provider-setting action was run.
- Final fixture state: `INVOICE-000001` remains `VOIDED`; safe id prefix `6ebb2d71`; total `287.5000`; balance due `0.0000`.
- Accounting evidence remains: original journal `JOURNAL_ENTRY-000001` is `REVERSED`; reversal journal `JOURNAL_ENTRY-000002` is `POSTED` and balanced.
- Audit evidence remains: SalesInvoice actions are `SALES_INVOICE_CREATED`, `SALES_INVOICE_UPDATED`, `SALES_INVOICE_FINALIZED`, and `SALES_INVOICE_VOIDED`; fixture login/auth audit logs remain `0`.
- ZATCA/output/email boundaries remain: one local `ZatcaInvoiceMetadata` row exists with type `STANDARD_TAX_INVOICE`; generated documents, payments, refunds, credit notes, allocations, email, ZATCA signed drafts/submission logs, and cleanup deletion remain `0`.
- Final triage doc: [docs/development/DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md](docs/development/DEV_06_AR_STATE_MACHINE_FINAL_TRIAGE.md).
- Remaining AR gaps include payment allocation/void/reversal, refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, cleanup policy, idempotency/repeat paths, allocation blockers, and fiscal-period locks.
- Recommended next workstream: `DEV-07 Part 1: AR payment allocation state-machine plan`.

## DEV-07 Part 1 - AR Payment Allocation Plan Completed

- DEV-07 Part 1 created the local-only AR payment allocation state-machine plan in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_STATE_MACHINE_PLAN.md).
- Part 1 was documentation/read-only only. No invoice create, edit, finalize, void, payment creation, payment allocation, refund, credit-note, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, schema, or provider-setting action was run.
- Inspected code paths include `CustomerPaymentController`, `CustomerPaymentService.create`, `applyUnapplied`, `reverseUnappliedAllocation`, `void`, payment accounting helpers, SalesInvoice invoice-void allocation blockers, CustomerRefund payment-source blockers, audit event mapping, Prisma payment/allocation models, and customer payment receipt/PDF output boundaries.
- Payment lifecycle finding: `CustomerPaymentService.create` posts immediately to `POSTED`, requires at least one allocation, creates one posted payment journal, debits the paid-through asset account, credits AR account code `120`, creates direct `CustomerPaymentAllocation` rows, decrements invoice `balanceDue`, and leaves `unappliedAmount` when `amountReceived` exceeds direct allocations.
- Allocation lifecycle finding: `applyUnapplied` creates `CustomerPaymentUnappliedAllocation`, decrements payment `unappliedAmount` and invoice `balanceDue`, and creates no journal entry; `reverseUnappliedAllocation` restores matching state and also creates no journal entry.
- Fixture strategy chosen: reuse the existing local DEV03-AR fixture organization and dependencies, but do not reuse `INVOICE-000001` because it is `VOIDED`; future approved parts should create a new DEV-07-specific finalized, non-voided invoice fixture under the same local marker/family unless Part 2 chooses a safer new marker.
- Expected output/ZATCA/email boundary: payment create/allocation/reversal/void paths do not call receipt PDF/archive, email, or ZATCA; receipt PDF/archive routes exist and must remain out of scope unless separately approved.
- Exact next prompt title: `DEV-07 Part 2: AR payment allocation fixture plan`.

## DEV-07 Part 2 - AR Payment Allocation Fixture Plan Completed

- DEV-07 Part 2 created the local-only fixture plan in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_FIXTURE_PLAN.md).
- Part 2 was planning/read-only only. No invoice create, edit, finalize, void, payment creation, payment allocation, unapplied allocation, refund, credit-note, fixture creation, output, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment, schema, provider-setting, or login/audit-writing browser action was run.
- Local DB dependency inspection was blocked because Docker Desktop's Linux engine was unavailable and `127.0.0.1:5432` / `127.0.0.1:6379` were not reachable; the configured database target guard parsed as local `localhost:5432` without forbidden hosted patterns.
- Fixture strategy chosen: reuse marker `DEV03-AR-20260524T130000` and the existing local DEV03-AR fixture organization/dependencies, create exactly one new DEV-07-specific finalized invoice in a later approved part, and continue excluding voided `INVOICE-000001` from the happy path.
- Planned future invoice/payment/allocation shape: invoice total `1150.0000` from quantity `10.0000` at unit price `100.0000` with `15.0000` VAT; future payment amount `500.0000`; direct allocation `300.0000`; unapplied amount `200.0000`; later same-invoice unapplied allocation `200.0000`; final planned invoice balance `650.0000`.
- Expected accounting: invoice finalization posts Dr `120` AR `1150.0000`, Cr fixture revenue `1000.0000`, Cr `220` VAT `150.0000`; payment creation posts Dr fixture paid-through asset `500.0000`, Cr `120` AR `500.0000`; applying unapplied amount posts no journal.
- Expected audit/output/ZATCA boundary: invoice fixture creation/finalization should create SalesInvoice audit actions and local invoice ZATCA metadata only; payment create should create `CUSTOMER_PAYMENT_CREATED`; unapplied allocation should log raw `APPLY_UNAPPLIED`; receipt PDF/archive, email, ZATCA XML/signing/submission, and generated documents remain out of scope.
- Exact next prompt title: `DEV-07 Part 3: approved local AR payment-allocation invoice fixture mutation`.

## DEV-07 Part 3 - AR Payment Allocation Invoice Fixture Mutation Blocked

- DEV-07 Part 3 received the exact approval phrase for one local-only AR payment-allocation invoice fixture mutation under marker `DEV03-AR-20260524T130000`.
- The run stopped before mutation because Docker Desktop's Linux engine was unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` were closed, and the required local read-only fixture dependency preflight could not query Postgres.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence doc: [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3B: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3B - AR Payment Allocation Fixture Preflight Retry Blocked

- DEV-07 Part 3B retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop's Linux engine remained unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` remained closed, and fixture dependency queries could not run.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: blocked before DB queries. Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3C: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3C - AR Payment Allocation Fixture Preflight Retry Blocked

- DEV-07 Part 3C retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop's Linux engine remained unavailable, `127.0.0.1:5432` and `127.0.0.1:6379` remained closed, and fixture dependency queries could not run.
- The configured API database target guard still parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: blocked before DB queries. Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3D: retry AR payment allocation invoice fixture mutation preflight`.

## DEV-07 Part 3D - AR Payment Allocation Fixture Preflight Verified

- DEV-07 Part 3D retried only local Docker/Postgres readiness and read-only fixture dependency preflight; it did not carry mutation approval forward.
- Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy, and `127.0.0.1:5432` / `127.0.0.1:6379` were reachable.
- The configured API database target guard parsed as local `localhost:5432` and did not match forbidden production, beta, hosted, shared, Supabase, Vercel, RDS/AWS, Railway, Render, Fly, DigitalOcean, Neon, or user-testing patterns.
- Fixture dependency preflight result: passed. Verified marker `DEV03-AR-20260524T130000`, family `ar`, fixture organization, active actor membership, active customer, active service item, active/posting revenue account, active `15.0000` sales tax, active/posting account `120`, active/posting account `220`, active/posting paid-through cash account, and posting-date guard.
- Invoice preflight result: `INVOICE-000001` remained `VOIDED` and excluded from happy-path allocation; no `DEV07-AR-PAYALLOC` invoice fixture existed; the fixture organization had only `INVOICE-000001:VOIDED`.
- Forbidden side-effect counts stayed `0`: customer payments, customer payment allocations, customer payment unapplied allocations, customer refunds, credit notes, credit-note allocations, generated documents, email outbox, email provider events, ZATCA signed drafts, and ZATCA submission logs.
- Invoice fixture created/finalized: no. Customer payment/allocation performed: no. Temporary mutation script created: no.
- Checks run: targeted AR Jest suites passed (`4` suites, `84` tests), fixture-runner Jest passed (`1` suite, `41` tests), `fixture:dev04:cleanup-plan` stayed plan-only with no DB connection or writes, and `corepack pnpm verify:diff` passed with the existing unrelated `apps/web/src/app/page.tsx` CRLF warning.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 3E: approved local AR payment-allocation invoice fixture mutation`.
- Required approval phrase before Part 3E mutation: `I approve DEV-07 Part 3E local-only AR payment-allocation invoice fixture mutation under marker DEV03-AR-20260524T130000. No production, no beta, no customer data.`

## DEV-07 Part 3E - AR Payment Allocation Invoice Fixture Created

- DEV-07 Part 3E received the exact approval phrase for one local-only AR payment-allocation invoice fixture mutation under marker `DEV03-AR-20260524T130000`.
- Local target safety passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy, `127.0.0.1:5432` / `127.0.0.1:6379` were reachable, and the API database target guard parsed as local `localhost:5432` without forbidden hosted, production, beta, shared, or customer-data target patterns.
- Preflight passed: marker/family, fixture organization, active actor membership, active customer, active service item, active/posting revenue account, active `15.0000` sales tax, active/posting account `120`, active/posting account `220`, active/posting paid-through cash account, `INVOICE-000001:VOIDED`, absent `INVOICE-000002`, absent `DEV07-AR-PAYALLOC` fixture, clean side-effect counts, and posting-date guard were verified before mutation.
- Mutation performed: a guarded temporary local script called `SalesInvoiceService.create(...)` exactly once and `SalesInvoiceService.finalize(...)` exactly once for the new DEV-07 invoice fixture.
- New invoice fixture: `INVOICE-000002`, safe id prefix `ddadfdd7`, status `FINALIZED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, line count `1`.
- Accounting result: one posted journal `JOURNAL_ENTRY-000003`, reference `INVOICE-000002`, debit account `120` AR `1150.0000`, credit fixture revenue `1000.0000`, credit account `220` VAT `150.0000`; invoice sequence advanced to next `3`, journal sequence advanced to next `4`.
- Audit/ZATCA result: SalesInvoice audit actions for `INVOICE-000002` are `SALES_INVOICE_CREATED` and `SALES_INVOICE_FINALIZED`; local `ZatcaInvoiceMetadata` count for the invoice is `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`.
- DEV-06 non-interference: `INVOICE-000001` remains `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`, with reversal journal present.
- No customer payment, customer payment allocation, customer payment unapplied allocation, refund, credit note, generated document, email outbox/provider event, ZATCA signed draft/submission log, ZATCA XML/signing/QR/submission, invoice void, cleanup deletion, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data mutation occurred.
- Temporary Part 3E script was removed and is not staged or tracked.
- Evidence was appended to [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_MUTATION_RUN.md).
- Exact next prompt title: `DEV-07 Part 4: verify AR payment allocation invoice fixture evidence`.

## DEV-07 Part 4 - AR Payment Allocation Invoice Fixture Evidence Verified

- DEV-07 Part 4 performed read-only local verification for the payment-allocation invoice fixture in [docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_07_AR_PAYMENT_ALLOCATION_INVOICE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No invoice create, edit, finalize, void, payment creation, payment allocation, unapplied allocation, refund, credit-note, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety passed: Docker Desktop Linux engine was available, local Postgres/Redis were healthy and reachable, and the API database target guard accepted only local `localhost:5432`.
- Fixture dependency evidence remained valid for marker `DEV03-AR-20260524T130000`: fixture organization, active actor membership, active customer, service item, revenue account, `15.0000` sales tax, account `120`, account `220`, and paid-through cash account were verified.
- `INVOICE-000002` remains the single DEV-07 payment-allocation invoice fixture; safe id prefix `ddadfdd7`; status `FINALIZED`; subtotal `1000.0000`; tax `150.0000`; total `1150.0000`; balance due `1150.0000`; line count `1`.
- Journal evidence remains valid: `JOURNAL_ENTRY-000003` is `POSTED`, reference `INVOICE-000002`, balanced at debit `1150.0000` and credit `1150.0000`, with Dr account `120` AR `1150.0000`, Cr fixture revenue `1000.0000`, and Cr account `220` VAT `150.0000`.
- Audit/ZATCA evidence remains valid: SalesInvoice actions are `SALES_INVOICE_CREATED` and `SALES_INVOICE_FINALIZED`; local `ZatcaInvoiceMetadata` count is `1`, type `STANDARD_TAX_INVOICE`, status `NOT_SUBMITTED`; auth/login and payment-related audit counts remain `0`.
- DEV-06 non-interference remains valid: `INVOICE-000001` is still `VOIDED`, safe id prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`, with original/reversal journals intact.
- Forbidden side-effect counts remain `0`: customer payments, customer payment allocations, unapplied allocations, customer refunds, credit notes, credit-note allocations, generated documents, email outbox/provider events, ZATCA signed drafts, and ZATCA submission logs.
- The Part 3E temporary script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-07 Part 5: customer payment creation mutation plan`.

## DEV-07 Part 5 - Customer Payment Creation Mutation Plan Completed

- DEV-07 Part 5 created the local-only customer payment creation mutation plan in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_PLAN.md).
- Mutation performed: no. No customer payment, payment allocation, unapplied allocation, refund, credit-note, invoice create/edit/finalize/void, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety and read-only fixture checks passed: Docker Desktop Linux engine was available, local Postgres/Redis were healthy and reachable, and the API database target guard accepted only local `localhost:5432`.
- Current fixture evidence remains valid: `INVOICE-000002` is `FINALIZED`, safe id prefix `ddadfdd7`, total and balance due `1150.0000`, with posted invoice journal `JOURNAL_ENTRY-000003`.
- Planned Part 6 payment shape: create one customer payment for `500.0000`, direct allocation `300.0000` to `INVOICE-000002`, expected `unappliedAmount` `200.0000`.
- Expected invoice balance impact: `INVOICE-000002` balance due decreases from `1150.0000` to `850.0000`; the later unapplied allocation remains out of scope for Part 6.
- Expected accounting: one posted payment journal, expected `JOURNAL_ENTRY-000004`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`; the currently absent `PAYMENT` sequence should upsert and issue `PAYMENT-000001`.
- Expected audit/output/ZATCA boundary: `CUSTOMER_PAYMENT_CREATED` only; no receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit flow.
- Exact next prompt title: `DEV-07 Part 6: approved local AR customer payment creation mutation`.
- Required approval phrase before Part 6 mutation: `I approve DEV-07 Part 6 local-only AR customer payment creation mutation under marker DEV03-AR-20260524T130000 for invoice INVOICE-000002. No production, no beta, no customer data.`

## DEV-07 Part 6 - AR Customer Payment Created

- DEV-07 Part 6 received the exact approval phrase for one local-only AR customer payment creation mutation under marker `DEV03-AR-20260524T130000` for `INVOICE-000002`.
- Evidence doc: [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_MUTATION_RUN.md).
- Local target safety and preflight passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, the API database target guard accepted local `localhost:5432`, and read-only fixture checks matched the planned state.
- Mutation performed: a guarded temporary local script called `CustomerPaymentService.create(...)` exactly once.
- Payment result: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`, amount received `500.0000`, direct allocation `300.0000`, unapplied amount `200.0000`.
- Invoice balance result: `INVOICE-000002` remains `FINALIZED`; balance due decreased from `1150.0000` to `850.0000`; `reversalJournalEntryId` remains absent.
- Accounting result: one posted journal `JOURNAL_ENTRY-000004`, reference `PAYMENT-000001`, Dr paid-through cash/asset `500.0000`, Cr account `120` AR `500.0000`; `PAYMENT` sequence next `2`, `JOURNAL_ENTRY` sequence next `5`.
- Audit/output/ZATCA result: `CUSTOMER_PAYMENT_CREATED` exists exactly once; no `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `CUSTOMER_PAYMENT_VOIDED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow occurred.
- DEV-06 non-interference: `INVOICE-000001` remains `VOIDED`, safe prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.
- Temporary Part 6 script was removed and is not staged or tracked.
- Exact next prompt title: `DEV-07 Part 7: verify AR customer payment creation evidence`.

## DEV-07 Part 7 - AR Customer Payment Evidence Verified

- DEV-07 Part 7 performed read-only local verification for the Part 6 customer payment creation evidence in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_CREATION_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No customer payment creation, payment allocation mutation, unapplied allocation, refund, credit-note, invoice mutation, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, or login/browser audit-writing action ran.
- Local target safety passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, and the API database target guard accepted only local `localhost:5432`.
- Fixture/invoice evidence remained valid: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`, and no reversal journal.
- Payment evidence remained valid: `PAYMENT-000001`, safe id prefix `b39f4d38`, status `POSTED`, amount received `500.0000`, unapplied amount `200.0000`, posted journal present, and no void reversal journal.
- Direct allocation evidence remained valid: exactly one `CustomerPaymentAllocation` links `PAYMENT-000001` to `INVOICE-000002` for `300.0000`; no `CustomerPaymentUnappliedAllocation` exists yet.
- Accounting result remained valid: `JOURNAL_ENTRY-000004` is `POSTED`, reference `PAYMENT-000001`, balanced at debit `500.0000` and credit `500.0000`, with Dr paid-through cash/asset `500.0000` and Cr account `120` AR `500.0000`.
- Audit/output/ZATCA result remained valid: `CUSTOMER_PAYMENT_CREATED` exists exactly once; no `APPLY_UNAPPLIED`, `REVERSE_UNAPPLIED_ALLOCATION`, `CUSTOMER_PAYMENT_VOIDED`, receipt PDF/archive, generated document, email, ZATCA XML/signing/QR/submission, refund, credit note, cleanup deletion, or login/browser audit-writing flow occurred.
- DEV-06 non-interference remained valid: `INVOICE-000001` remains `VOIDED`, safe prefix `6ebb2d71`, total `287.5000`, balance due `0.0000`.
- Temporary Part 6 script remains absent, unstaged, and untracked.
- Exact next prompt title: `DEV-07 Part 8: unapplied payment allocation mutation plan`.

## DEV-07 Part 8 - Unapplied Payment Allocation Mutation Plan Completed

- DEV-07 Part 8 created the local-only unapplied payment allocation mutation plan in [docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md](docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_MUTATION_PLAN.md).
- Mutation performed: no. No unapplied payment allocation, customer payment creation, direct allocation, allocation reversal, payment void, invoice mutation, refund, credit note, output, email, ZATCA XML/signing/submission, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, customer-data, or login/browser audit-writing action ran.
- Local target safety and read-only fixture checks passed: Docker Desktop Linux engine was available, `infra-postgres-1` and `infra-redis-1` were healthy/reachable, and the API database target guard accepted only local `localhost:5432`.
- Current evidence remains valid: `PAYMENT-000001` is `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`; `INVOICE-000002` is `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`.
- Planned Part 9 mutation: apply exactly `200.0000` from `PAYMENT-000001` to `INVOICE-000002` through `CustomerPaymentService.applyUnapplied(...)`.
- Expected state impact: payment `unappliedAmount` changes `200.0000 -> 0.0000`; invoice balance due changes `850.0000 -> 650.0000`; one `CustomerPaymentUnappliedAllocation` is created; the existing direct allocation of `300.0000` remains unchanged.
- Expected accounting/audit/output boundary: no new journal entry; `JOURNAL_ENTRY-000004` and `JOURNAL_ENTRY` sequence next `5` remain unchanged; one raw `APPLY_UNAPPLIED` audit action is expected; no receipt PDF/archive, generated document, email, ZATCA XML/signing/submission, refund, credit note, invoice void, cleanup deletion, or login/browser audit-writing flow should occur.
- Exact next prompt title: `DEV-07 Part 9: approved local AR unapplied customer payment allocation mutation`.
- Required approval phrase before Part 9 mutation: `I approve DEV-07 Part 9 local-only AR unapplied customer payment allocation mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001 and invoice INVOICE-000002. No production, no beta, no customer data.`

## Forbidden Actions For Next Production Thread

- Do not change app code.
- Do not deploy, provision, migrate, seed, reset, delete, or change environment variables.
- Do not change Supabase RLS, runtime DB roles, Vercel settings, ZATCA behavior, emails, accounting logic, or customer data.
- Do not accept or implement ADR-001 or ADR-013 without explicit approval.
- Do not research the web unless the user explicitly starts a research thread.
- Do not touch unrelated web/marketing worktree changes.

## Next Thread Prompt

`DEV-07 Part 9: approved local AR unapplied customer payment allocation mutation`

## DEV-07 Part 9 - AR Unapplied Payment Allocation Evidence Completed

- DEV-07 Part 9 evidence is recorded in [docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md](docs/development/DEV_07_AR_UNAPPLIED_PAYMENT_ALLOCATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR unapplied customer payment allocation mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001` and `INVOICE-000002`.
- Current local state shows the approved allocation outcome: `PAYMENT-000001` remains `POSTED`, amount received remains `500.0000`, and unapplied amount is `0.0000`.
- `INVOICE-000002` remains `FINALIZED`, total remains `1150.0000`, and balance due is `650.0000`.
- Direct allocation evidence remains one `CustomerPaymentAllocation` for `300.0000`; one active `CustomerPaymentUnappliedAllocation` exists for `200.0000`.
- Accounting result: no new journal entry exists; `JOURNAL_ENTRY-000004` remains `POSTED`, reference `PAYMENT-000001`, debit `500.0000`, and credit `500.0000`; `JOURNAL_ENTRY` sequence next remains `5`.
- Audit result follows the current standardized audit behavior: `CUSTOMER_PAYMENT_CREATED` exists exactly once, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` exists exactly once, and raw `APPLY_UNAPPLIED` remains `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, reverse allocation, and cleanup deletion remained absent.
- No second `CustomerPaymentService.applyUnapplied(...)` call was run in the evidence continuation because read-only preflight found the one approved allocation result already present; a second call would violate the exactly-once boundary.
- Exact next prompt title: `DEV-07 Part 10: AR unapplied allocation reversal preflight`.

## Next Thread Prompt

`DEV-07 Part 10: AR unapplied allocation reversal preflight`

## DEV-07 Part 10 - AR Unapplied Allocation Reversal Preflight Completed

- DEV-07 Part 10 read-only preflight is recorded in [docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md](docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `CustomerPaymentService.reverseUnappliedAllocation(...)` was not called.
- Current payment state: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `0.0000`, journal `JOURNAL_ENTRY-000004`, and no void reversal journal.
- Current invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `650.0000`, and no reversal journal.
- Current allocation state: direct allocation remains one `CustomerPaymentAllocation` for `300.0000`; active unapplied allocation safe prefix `8bc99925` remains unreversed for `200.0000` with no reversedAt, reversedById, or reversalReason.
- Expected future reversal effects: payment unapplied amount `0.0000 -> 200.0000`; invoice balance due `650.0000 -> 850.0000`; active unapplied allocation marked reversed with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Expected accounting/audit result: no new journal entry; `JOURNAL_ENTRY-000004` remains unchanged; `JOURNAL_ENTRY` sequence next remains `5`; future audit action should be standardized `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` on entity type `CustomerPaymentUnappliedAllocation`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, and cleanup deletion remain absent.
- Required approval phrase for Part 11: `I approve DEV-07 Part 11 local-only AR unapplied allocation reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001, invoice INVOICE-000002, and the active 200.0000 unapplied allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-07 Part 11: approved local AR unapplied allocation reversal mutation`.

## Next Thread Prompt

`DEV-07 Part 11: approved local AR unapplied allocation reversal mutation`

## DEV-07 Part 11 - AR Unapplied Allocation Reversal Mutation Completed

- DEV-07 Part 11 local-only mutation evidence is recorded in [docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_07_AR_UNAPPLIED_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR unapplied allocation reversal mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001`, `INVOICE-000002`, and the active `200.0000` unapplied allocation.
- Mutation performed: yes. `CustomerPaymentService.reverseUnappliedAllocation(...)` was called exactly once with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Payment evidence: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, and unapplied amount changed `0.0000 -> 200.0000`; journal remains `JOURNAL_ENTRY-000004`; no void reversal journal exists.
- Invoice evidence: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, and balance due changed `650.0000 -> 850.0000`; no reversal journal exists.
- Allocation evidence: the direct `CustomerPaymentAllocation` remains exactly one record for `300.0000`; the `8bc99925` `CustomerPaymentUnappliedAllocation` remains one record for `200.0000` and is now reversed with `reversedAt`, `reversedById`, and the approved reversal reason set.
- Accounting result: no new journal entry was created; fixture organization journal count remained `4`; `JOURNAL_ENTRY-000004` stayed `POSTED`, reference `PAYMENT-000001`, debit `500.0000`, credit `500.0000`, and unchanged `updatedAt`; `JOURNAL_ENTRY` sequence next remained `5`.
- Audit result: `CUSTOMER_PAYMENT_CREATED` remains exactly once, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED` remains exactly once, and standardized `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` now exists exactly once for entity type `CustomerPaymentUnappliedAllocation`; raw reverse actions remain `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, payment void, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Exact next prompt title: `DEV-07 Part 12: AR customer payment void/reversal preflight`.

## Next Thread Prompt

`DEV-07 Part 12: AR customer payment void/reversal preflight`

## DEV-07 Part 12 - AR Customer Payment Void/Reversal Preflight Completed

- DEV-07 Part 12 read-only preflight is recorded in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_PREFLIGHT.md).
- Mutation performed: no. `CustomerPaymentService.void(...)` was not called.
- Current payment state: `PAYMENT-000001` remains `POSTED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`, journal `JOURNAL_ENTRY-000004`, no void reversal journal, and no `voidedAt`.
- Current invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `850.0000`, and no reversal journal.
- Current allocation state: direct allocation remains one historical `CustomerPaymentAllocation` for `300.0000`; the `8bc99925` unapplied allocation remains reversed for `200.0000` with the Part 11 reversal reason; active unapplied allocation count is `0`.
- Void safety result: safe if the state still matches at mutation time. Current code blocks posted refunds and active unapplied allocations, but it does not block direct allocations; it uses direct allocations to restore finalized invoice balances. Current posted refund count is `0`, active unapplied allocation count is `0`, and fiscal period count is `0`.
- Expected future void effects: payment becomes `VOIDED`; amount received remains `500.0000`; unapplied amount remains `200.0000` by current service design; invoice balance due increases `850.0000 -> 1150.0000`; direct allocation row remains as historical data; reversed unapplied allocation remains reversed.
- Expected accounting/audit result: create reversal journal `JOURNAL_ENTRY-000005`, mark original `JOURNAL_ENTRY-000004` as `REVERSED`, set `voidReversalJournalEntryId`, journal count `4 -> 5`, journal sequence next `5 -> 6`, and create one `CUSTOMER_PAYMENT_VOIDED` audit action.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Required approval phrase for Part 13: `I approve DEV-07 Part 13 local-only AR customer payment void/reversal mutation under marker DEV03-AR-20260524T130000 for payment PAYMENT-000001. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-07 Part 13: approved local AR customer payment void/reversal mutation`.

## Next Thread Prompt

`DEV-07 Part 13: approved local AR customer payment void/reversal mutation`

## DEV-07 Part 13 - AR Customer Payment Void/Reversal Mutation Completed

- DEV-07 Part 13 local-only mutation evidence is recorded in [docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_07_AR_CUSTOMER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AR customer payment void/reversal mutation under marker `DEV03-AR-20260524T130000` for `PAYMENT-000001`.
- Mutation performed: yes. `CustomerPaymentService.void(...)` was called once for `PAYMENT-000001`.
- Payment evidence: `PAYMENT-000001` changed from `POSTED` to `VOIDED`, safe id prefix `b39f4d38`, amount received remained `500.0000`, unapplied amount remained `200.0000`, and `voidedAt` is set.
- Invoice evidence: `INVOICE-000002` remained `FINALIZED`, safe id prefix `ddadfdd7`, total remained `1150.0000`, and balance due changed `850.0000 -> 1150.0000`; no invoice reversal journal exists.
- Allocation evidence: the direct `CustomerPaymentAllocation` remains exactly one historical record for `300.0000`; the `8bc99925` unapplied allocation remains reversed for `200.0000`; no new allocation or credit-note allocation was created.
- Accounting result: reversal journal `JOURNAL_ENTRY-000005` was created with status `POSTED`, reference `PAYMENT-000001`, and `reversalOf` `JOURNAL_ENTRY-000004`; original payment journal `JOURNAL_ENTRY-000004` is now `REVERSED`; journal count changed `4 -> 5`; `JOURNAL_ENTRY` sequence next changed `5 -> 6`.
- Audit result: `CUSTOMER_PAYMENT_CREATED`, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`, and `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED` remain exactly once; `CUSTOMER_PAYMENT_VOIDED` now exists exactly once.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, cleanup deletion, migrations, seed/reset/delete, deploys, environment/provider/schema changes, production/beta/shared/customer-data actions, and login/browser audit-writing flows remained absent.
- Exact next prompt title: `DEV-07 Part 14: AR state-machine closure and evidence consolidation`.

## Next Thread Prompt

`DEV-07 Part 14: AR state-machine closure and evidence consolidation`

## DEV-07 Part 14 - AR State-Machine Closure Completed

- DEV-07 Part 14 closure is recorded in [docs/development/DEV_07_AR_STATE_MACHINE_CLOSURE.md](docs/development/DEV_07_AR_STATE_MACHINE_CLOSURE.md).
- Mutation performed: no. No database write, invoice/payment/allocation/refund/credit-note mutation, output/PDF/archive, email, ZATCA, cleanup deletion, migration, seed/reset/delete, deploy, environment/provider change, production, beta, shared-target, customer-data, or login/browser flow ran.
- DEV-07 proved the local AR customer payment allocation chain: finalized invoice fixture `INVOICE-000002`, posted customer payment `PAYMENT-000001`, one direct allocation for `300.0000`, unapplied amount `200.0000`, apply-unapplied allocation for `200.0000`, reversal of that unapplied allocation, and customer payment void/reversal.
- Final payment state: `PAYMENT-000001` is `VOIDED`, safe id prefix `b39f4d38`, amount received `500.0000`, unapplied amount `200.0000`, original journal `JOURNAL_ENTRY-000004`, and void reversal journal `JOURNAL_ENTRY-000005`.
- Final invoice state: `INVOICE-000002` remains `FINALIZED`, safe id prefix `ddadfdd7`, total `1150.0000`, balance due `1150.0000`, and no invoice reversal journal.
- Final allocation state: one historical direct `CustomerPaymentAllocation` remains for `300.0000`; the `8bc99925` `CustomerPaymentUnappliedAllocation` remains reversed for `200.0000` with reason `DEV-07 local-only reversal QA for unapplied allocation`.
- Final accounting result: `JOURNAL_ENTRY-000004` is `REVERSED`; `JOURNAL_ENTRY-000005` is `POSTED`, references `PAYMENT-000001`, and reverses `JOURNAL_ENTRY-000004`; `JOURNAL_ENTRY` sequence next is `6`.
- Final audit result: `CUSTOMER_PAYMENT_CREATED`, `CUSTOMER_PAYMENT_UNAPPLIED_APPLIED`, `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSED`, and `CUSTOMER_PAYMENT_VOIDED` each exist exactly once; cleanup/delete audit actions remain `0`.
- Output/email/ZATCA/refund/credit-note/cleanup occurred: no. Generated documents, receipt/PDF/archive records, email outbox/provider events, ZATCA XML/signing/QR/submission artifacts, refunds, credit notes, invoice void, and cleanup deletion remained absent.
- Remaining AR gaps: customer refunds, credit notes, output/PDF/archive, email, ZATCA XML/signing/submission, authenticated UI/API QA, repeated/idempotency paths, allocation blockers beyond this chain, fiscal-period locks, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08 Part 1: AP state-machine fixture and mutation preflight`.

## Next Thread Prompt

`DEV-08 Part 1: AP state-machine fixture and mutation preflight`

## DEV-08 Part 1 - AP State-Machine Fixture And Mutation Preflight Completed

- DEV-08 Part 1 read-only AP preflight is recorded in [docs/development/DEV_08_AP_STATE_MACHINE_PREFLIGHT.md](docs/development/DEV_08_AP_STATE_MACHINE_PREFLIGHT.md).
- Mutation performed: no. No database write, AP fixture creation, supplier, purchase bill, supplier payment, refund, debit note, cash expense, purchase order, journal, inventory receipt, generated document, PDF/archive, email, ZATCA, migration, seed/reset/delete, deploy, environment change, production, beta, shared-target, hosted-database, customer-data, or login/browser flow ran.
- Recommended first AP fixture target: one fake local supplier and one direct-mode finalized purchase bill under marker `DEV08-AP-20260525T230000`, using an expense/asset line, AP account `210`, VAT receivable account `230` if a safe purchase tax dependency is available, and no purchase order conversion, inventory clearing, supplier payment, debit note, refund, or output route.
- Fixture runner finding: the existing DEV-04 runner can inspect AP family plans, but execute mode is explicitly restricted to the approved AR skeleton, AP proposed records are not defined, and marker validation does not currently accept `DEV08-AP-*`. Part 2 should use a tightly guarded temporary AP fixture script unless runner support is intentionally extended first.
- Proposed DEV-08 sequence: AP fixture creation and evidence verification; supplier payment creation with direct allocation and unapplied amount; supplier payment unapplied allocation; reversal; supplier payment void/reversal; purchase bill void/reversal; closure, with purchase debit notes, supplier refunds, purchase orders, cash expenses, and inventory clearing deferred to later AP branches.
- Expected accounting areas: purchase bill finalization posts expense/asset and VAT receivable debits against AP credit; supplier payment creation posts AP debit against cash/bank credit; supplier payment apply/reverse unapplied allocation creates no journal; supplier payment and purchase bill void paths create reversal journals after blockers are cleared.
- Expected audit areas: purchase bill, supplier payment, supplier refund, purchase debit note, purchase order, and cash expense create/finalize/void events have standardized mappings where listed in `audit-events.ts`; supplier payment apply/reverse and debit-note allocation apply/reverse currently appear to use raw allocation action strings unless a later hardening task adds mappings.
- Output/email/ZATCA boundary: AP state-machine mutations must not call purchase bill, supplier payment, supplier refund, debit note, purchase order, or cash expense PDF/output routes and must keep generated documents, email, and ZATCA artifacts absent.
- Blockers and unknowns: local disposable DB target and fixture org/account/tax dependencies must be reverified before mutation; fiscal period locks can block posting; inventory-clearing bill mode has extra prerequisites and should be deferred; AP allocation audit standardization and permission granularity need later review.
- Required approval phrase for Part 2: `I approve DEV-08 Part 2 local-only AP fixture creation mutation under marker DEV08-AP-20260525T230000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 2: approved local AP fixture creation mutation`.

## Next Thread Prompt

`DEV-08 Part 2: approved local AP fixture creation mutation`

## DEV-08 Part 2 - AP Fixture Creation Mutation Completed

- DEV-08 Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_AP_FIXTURE_CREATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AP fixture creation mutation under marker `DEV08-AP-20260525T230000`.
- Mutation performed: yes. The successful guarded script execution called `ContactService.create(...)` once, `PurchaseBillService.create(...)` once, and `PurchaseBillService.finalize(...)` once.
- Supplier evidence: one active fake local `SUPPLIER` contact was created with display label `DEV08-AP-20260525T230000 Supplier`, safe id prefix `0e36df97`, in fake local organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, status `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, no purchase order link, no reversal journal, and no supplier payment/debit-note allocations.
- Tax path: VAT path was used with AP account `210`, VAT receivable account `230`, and purchase tax rate `VAT on Purchases 15%`; zero-tax fallback was not used.
- Journal/accounting evidence: posted journal `JE-000049`, safe id prefix `3dfa0a86`, total debit `1150.0000`, total credit `1150.0000`, with debit `1000.0000` to account `111`, debit `150.0000` to account `230`, and credit `1150.0000` to account `210`; organization journal count changed `48 -> 49`.
- Audit evidence: created `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, and `PurchaseBill:PURCHASE_BILL_FINALIZED`; no supplier payment, supplier refund, debit note, void, reverse, or login/browser audit-writing action was created by this mutation.
- Output/email/ZATCA/payment/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. The guarded script verified supplier payment, supplier refund, purchase debit note, purchase order, purchase receipt, stock movement, cash expense, generated document, email, ZATCA signed artifact/submission, auth token, and cleanup/delete audit counts were unchanged.
- Note: the exact DEV-07 AR fixture organization exists but lacks AP account `210`, so Part 2 used an existing fake local AP-ready SDK validation organization. Future DEV-08 evidence should keep comparing before/after side-effect counts because that organization has baseline local AP/ZATCA/output data.
- Exact next prompt title: `DEV-08 Part 3: AP fixture evidence verification`.

## Next Thread Prompt

`DEV-08 Part 3: AP fixture evidence verification`

## DEV-08 Part 3 - AP Fixture Evidence Verification Completed

- DEV-08 Part 3 read-only verification is recorded in [docs/development/DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08_AP_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No supplier, purchase bill, supplier payment, allocation, refund, debit note, purchase order, purchase receipt, cash expense, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.
- Supplier evidence: exactly one active fake local `SUPPLIER` contact exists with display label `DEV08-AP-20260525T230000 Supplier`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, no purchase order link, no reversal journal, no supplier payment allocations, no supplier payment unapplied allocations, and no purchase debit note allocations.
- Tax path evidence: VAT path remains in use with purchase tax rate `VAT on Purchases 15%`, account `230 VAT Receivable`, and zero-tax fallback was not used.
- Journal/accounting evidence: posted journal `JE-000049`, safe id prefix `3dfa0a86`, remains balanced with debit `1000.0000` to account `111`, debit `150.0000` to account `230`, and credit `1150.0000` to account `210`; no supplier payment journal or reversal journal exists for this fixture.
- Audit evidence: `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, and `PurchaseBill:PURCHASE_BILL_FINALIZED` each exist once for the fixture entities; no supplier payment, refund, debit-note, void/reversal, or login/browser audit-writing action was linked to this fixture.
- Forbidden side effects checked: fixture-specific supplier payments, supplier payment allocations, supplier payment unapplied allocations, supplier refunds, purchase debit notes, debit-note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, email rows, and cleanup/delete audit actions are all `0`; organization-level baseline counts still match Part 2 after counts for existing local AP/ZATCA/output data.
- Exact next prompt title: `DEV-08 Part 4: supplier payment creation and allocation preflight`.

## Next Thread Prompt

`DEV-08 Part 4: supplier payment creation and allocation preflight`

## DEV-08 Part 4 - Supplier Payment Creation And Allocation Preflight Completed

- DEV-08 Part 4 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.create(...)` was not called, and no supplier payment, allocation, refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment change, or browser/login flow was created or mutated.
- Current fixture state: supplier `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe prefix `0e36df97`; `BILL-000007` remains `FINALIZED`, safe prefix `d81ddd60`, total `1150.0000`, balance due `1150.0000`, no reversal journal, and no supplier payment/debit-note allocations.
- Planned payment: amount paid `500.0000`, direct allocation `300.0000` to `BILL-000007`, expected unapplied amount `200.0000`, payment date `2026-05-25`, currency `SAR`, marker-bearing description.
- Selected paid-through account: account `112 Bank Account`, safe prefix `32ab6f4d`, active posting `ASSET`, active bank profile, SAR, in the same fake local AP-ready organization; required AP account `210 Accounts Payable` safe prefix `883ea9a6` is active and posting.
- Sequence/precondition evidence: fiscal period covering `2026-05-25` is `OPEN`; `PAYMENT` sequence is `PAY-` next `6` so expected payment number is `PAY-000006` if unchanged; `JOURNAL_ENTRY` sequence is `JE-` next `50` so expected payment journal is `JE-000050` if unchanged.
- Expected bill/accounting result: `BILL-000007` balance due should change `1150.0000 -> 850.0000`; one direct `SupplierPaymentAllocation` for `300.0000` should exist; one posted supplier payment journal should debit AP `210` for `500.0000` and credit bank account `112` for `500.0000`; no bill reversal, payment void reversal, stock movement, or output journal should be created.
- Expected audit result: one standardized `SUPPLIER_PAYMENT_CREATED` audit action; no supplier payment void, supplier refund, debit note, purchase bill void, or login/browser audit-writing action.
- Blockers: none found. Part 5 must still stop if the supplier, bill, balance, paid-through account, fiscal period, sequence, or side-effect baseline differs at mutation time.
- Required approval phrase for Part 5: `I approve DEV-08 Part 5 local-only supplier payment creation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 with payment amount 500.0000 and direct allocation 300.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 5: approved local supplier payment creation mutation`.

## Next Thread Prompt

`DEV-08 Part 5: approved local supplier payment creation mutation`

## DEV-08 Part 5 - Approved Local Supplier Payment Creation Mutation Completed

- DEV-08 Part 5 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_CREATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment creation mutation under marker `DEV08-AP-20260525T230000`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.create(...)` exactly once.
- Supplier evidence: `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, status `POSTED`, amount paid `500.0000`, direct allocation `300.0000` to `BILL-000007`, unapplied amount `200.0000`, and no void reversal journal.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due changed `1150.0000 -> 850.0000`, reversal journal absent, and one direct supplier payment allocation exists for `300.0000`.
- Journal/accounting evidence: posted journal `JE-000050`, safe id prefix `b77bd6f7`, total debit `500.0000`, total credit `500.0000`, with debit `500.0000` to AP account `210` and credit `500.0000` to paid-through account `112`; no purchase bill reversal journal or supplier payment void reversal journal was created.
- Audit evidence: one `SUPPLIER_PAYMENT_CREATED` audit action exists for `PAY-000006`; no supplier payment void audit, supplier refund audit, purchase debit note audit, purchase bill void audit, or login/browser audit-writing flow occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-create.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 6: supplier payment evidence verification`.

## Next Thread Prompt

`DEV-08 Part 6: supplier payment evidence verification`

## DEV-08 Part 6 - Supplier Payment Evidence Verification Completed

- DEV-08 Part 6 read-only verification is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08_SUPPLIER_PAYMENT_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No supplier payment creation, supplier payment unapplied allocation, allocation reversal, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Supplier evidence: `DEV08-AP-20260525T230000 Supplier` remains active `SUPPLIER`, safe id prefix `0e36df97`, in fake local AP-ready organization safe prefix `db69e5a8`.
- Supplier payment evidence: exactly one fixture payment exists, `PAY-000006`, safe id prefix `622ad0b6`, status `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112` safe prefix `32ab6f4d`, journal present, void reversal journal absent, and supplier refund source claims `0`.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, reversal journal absent, generated document links `0`, and purchase debit-note allocations `0`.
- Allocation evidence: exactly one direct `SupplierPaymentAllocation` links `PAY-000006` to `BILL-000007`, safe id prefix `6ec44d14`, amount `300.0000`; no `SupplierPaymentUnappliedAllocation` exists yet for this fixture.
- Journal/accounting evidence: purchase bill journal `JE-000049` remains `POSTED` and balanced with debit `111` `1000.0000`, debit `230` `150.0000`, credit `210` `1150.0000`; supplier payment journal `JE-000050` remains `POSTED` and balanced with debit `210` `500.0000`, credit `112` `500.0000`; no bill or supplier payment reversal journal exists.
- Audit evidence: `Contact` `CREATE`, `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `SUPPLIER_PAYMENT_CREATED` each exist once for the fixture entities; supplier payment void, supplier payment apply/reverse, supplier refund, purchase debit note, purchase bill void, cleanup/delete, and login/browser audit-writing actions remain absent for this fixture.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Exact next prompt title: `DEV-08 Part 7: supplier payment unapplied allocation preflight`.

## Next Thread Prompt

`DEV-08 Part 7: supplier payment unapplied allocation preflight`

## DEV-08 Part 7 - Supplier Payment Unapplied Allocation Preflight Completed

- DEV-08 Part 7 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.applyUnapplied(...)` was not called, and no supplier payment unapplied allocation, supplier payment creation, allocation reversal, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112` safe prefix `32ab6f4d`, journal `JE-000050`, and no void reversal journal.
- Current bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, no reversal journal, and no purchase debit-note allocation.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; no `SupplierPaymentUnappliedAllocation` exists yet for this fixture.
- Planned Part 8 allocation: apply exactly `200.0000` from `PAY-000006` to `BILL-000007` with DTO `{ billId, amountApplied: "200.0000" }`.
- Expected payment/bill/allocation effects: supplier payment remains `POSTED`, unapplied amount changes `200.0000 -> 0.0000`, bill remains `FINALIZED`, balance due changes `850.0000 -> 650.0000`, direct allocation remains unchanged, and one active `SupplierPaymentUnappliedAllocation` is created for `200.0000`.
- Expected accounting result: no new journal entry; `JE-000049` and `JE-000050` remain posted and unchanged; `JOURNAL_ENTRY` sequence should remain next `51` if safely checkable.
- Expected audit result: one raw `APPLY_UNAPPLIED` audit action for `SupplierPayment` because `audit-events.ts` does not currently standardize `SupplierPayment:APPLY_UNAPPLIED`; no supplier payment void, reverse-unapplied, supplier refund, purchase debit note, or purchase bill void audit is expected.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remain non-zero and must be compared before/after in Part 8.
- Required approval phrase for Part 8: `I approve DEV-08 Part 8 local-only supplier payment unapplied allocation mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active supplier payment unapplied amount 200.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 8: approved local supplier payment unapplied allocation mutation`.

## Next Thread Prompt

`DEV-08 Part 8: approved local supplier payment unapplied allocation mutation`

## DEV-08 Part 8 - Approved Local Supplier Payment Unapplied Allocation Mutation Completed

- DEV-08 Part 8 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment unapplied allocation mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` and the active supplier payment unapplied amount `200.0000`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.applyUnapplied(...)` exactly once.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `POSTED`, amount paid remained `500.0000`, unapplied amount changed `200.0000 -> 0.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`, total remained `1150.0000`, balance due changed `850.0000 -> 650.0000`, and reversal journal remained absent.
- Allocation evidence: the direct `SupplierPaymentAllocation` remained exactly one historical record for `300.0000`; one `SupplierPaymentUnappliedAllocation` was created for `200.0000`, safe id prefix `a8ee4e23`, with `reversedAt`, `reversedById`, and `reversalReason` absent.
- Journal/accounting result: no new journal entry was created; organization journal count remained `50`, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: `SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`; raw `APPLY_UNAPPLIED` now exists once for `PAY-000006`; no supplier payment void, fixture unapplied reverse, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-apply-unapplied.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`.

## Next Thread Prompt

`DEV-08 Part 9: supplier payment unapplied allocation reversal preflight`

## DEV-08 Part 9 - Supplier Payment Unapplied Allocation Reversal Preflight Completed

- DEV-08 Part 9 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.reverseUnappliedAllocation(...)` was not called, and no supplier payment creation, supplier payment apply-unapplied, supplier payment void, purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Local-only safety result: Docker Linux engine was available, local Postgres/Redis containers were healthy, read-only SQL ran inside local `infra-postgres-1`, and no hosted/prod/beta/shared/customer-data target was used or printed.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `0.0000`, journal `JE-000050`, and no void reversal journal.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `650.0000`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, and no reversal journal.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; exactly one active `SupplierPaymentUnappliedAllocation` exists for `200.0000`, safe id prefix `a8ee4e23`, with no `reversedAt`, `reversedById`, or `reversalReason`.
- Expected Part 10 reversal effects: payment unapplied amount changes `0.0000 -> 200.0000`; bill balance due changes `650.0000 -> 850.0000`; direct allocation remains unchanged; active unapplied allocation is marked reversed with reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Expected accounting result: no new journal entry; `JE-000049` and `JE-000050` remain posted and unchanged; organization journal count should remain `50`; `JOURNAL_ENTRY` sequence should remain next `51`.
- Expected audit result: one raw `REVERSE_UNAPPLIED_ALLOCATION` audit action for `SupplierPaymentUnappliedAllocation`, because `audit-events.ts` does not currently standardize the supplier payment unapplied reverse action; no supplier payment void, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action is expected.
- Forbidden side effects checked: fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions are all `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 10: `I approve DEV-08 Part 10 local-only supplier payment unapplied allocation reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 and the active 200.0000 supplier payment unapplied allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 10: approved local supplier payment unapplied allocation reversal mutation`

## DEV-08 Part 10 - Approved Local Supplier Payment Unapplied Allocation Reversal Mutation Completed

- DEV-08 Part 10 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_UNAPPLIED_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment unapplied allocation reversal mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` and active supplier payment unapplied allocation `a8ee4e23`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.reverseUnappliedAllocation(...)` exactly once.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `POSTED`, amount paid remained `500.0000`, unapplied amount changed `0.0000 -> 200.0000`, journal remained `JE-000050`, and void reversal journal remained absent.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`, total remained `1150.0000`, balance due changed `650.0000 -> 850.0000`, and reversal journal remained absent.
- Allocation evidence: the direct `SupplierPaymentAllocation` remained exactly one historical record for `300.0000`; the `SupplierPaymentUnappliedAllocation` safe id prefix `a8ee4e23` was marked reversed for `200.0000` with `reversedAt` set, `reversedById` safe prefix `09f892d4`, and reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`.
- Journal/accounting result: no new journal entry was created; organization journal count remained `50`, `JE-000049` and `JE-000050` remained posted and unchanged, `JOURNAL_ENTRY` sequence remained next `51`, and `PAYMENT` sequence remained next `7`.
- Audit result: `SUPPLIER_PAYMENT_CREATED` remains once for `PAY-000006`; raw `APPLY_UNAPPLIED` remains once for `PAY-000006`; raw `REVERSE_UNAPPLIED_ALLOCATION` now exists once for allocation `a8ee4e23`; no supplier payment void, supplier refund, purchase debit note, purchase bill void, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and cleanup/delete audit actions remain `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-reverse-unapplied.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 11: supplier payment void/reversal preflight`.

## Next Thread Prompt

`DEV-08 Part 11: supplier payment void/reversal preflight`

## DEV-08 Part 11 - Supplier Payment Void/Reversal Preflight Completed

- DEV-08 Part 11 read-only preflight is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md](docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_PREFLIGHT.md).
- Mutation performed: no. `SupplierPaymentService.void(...)` was not called, and no supplier payment creation, supplier payment apply/reverse-unapplied, purchase bill mutation, purchase bill void, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `POSTED`, amount paid `500.0000`, unapplied amount `200.0000`, paid-through account `112 Bank Account`, journal `JE-000050`, and no void reversal journal.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, total `1150.0000`, balance due `850.0000`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, and no reversal journal.
- Current allocation state: exactly one direct `SupplierPaymentAllocation` remains for `300.0000`, safe id prefix `6ec44d14`; the one `200.0000` `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` is reversed with reason `DEV-08 local-only reversal QA for supplier payment unapplied allocation`; active unapplied allocations are `0`.
- Void safety result: safe to plan for Part 12 if preflight remains unchanged. The service blocks active unapplied allocations and posted supplier refunds, both are absent, and the remaining direct allocation is handled by restoring `BILL-000007` balance due.
- Expected payment effect if approved: `PAY-000006` becomes `VOIDED`, amount paid remains `500.0000`, unapplied amount is expected to remain `200.0000` under current code, `voidedAt` is set, `journalEntryId` remains `JE-000050`, and `voidReversalJournalEntryId` is set to a new reversal journal.
- Expected bill/allocation effect if approved: `BILL-000007` balance due changes `850.0000 -> 1150.0000`; direct allocation `6ec44d14` remains a historical `300.0000` allocation; reversed unapplied allocation `a8ee4e23` remains reversed; no new allocations or debit-note allocations are expected.
- Expected journal/accounting effect if approved: original supplier payment journal `JE-000050` is marked `REVERSED`; expected reversal journal is `JE-000051` if the sequence remains unchanged, debiting account `112` for `500.0000` and crediting AP account `210` for `500.0000`; purchase bill journal `JE-000049` remains unchanged.
- Expected audit effect if approved: one standardized `SUPPLIER_PAYMENT_VOIDED` audit action for `PAY-000006`; no supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, and auth tokens since payment remain `0`; organization-level ZATCA baselines remain existing local data (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 12: `I approve DEV-08 Part 12 local-only supplier payment void/reversal mutation under marker DEV08-AP-20260525T230000 for the DEV-08 supplier payment linked to BILL-000007. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 12: approved local supplier payment void/reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 12: approved local supplier payment void/reversal mutation`

## DEV-08 Part 12 - Approved Local Supplier Payment Void/Reversal Mutation Completed

- DEV-08 Part 12 local-only mutation evidence is recorded in [docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08_SUPPLIER_PAYMENT_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier payment void/reversal mutation under marker `DEV08-AP-20260525T230000` for the DEV-08 supplier payment linked to `BILL-000007`.
- Mutation performed: yes. The successful guarded script execution called `SupplierPaymentService.void(...)` exactly once for `PAY-000006`.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, changed from `POSTED` to `VOIDED`; amount paid remained `500.0000`; unapplied amount remained `200.0000`; `voidedAt` was set; original journal remained `JE-000050`; void reversal journal `JE-000051` was created.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `850.0000 -> 1150.0000`; purchase bill journal `JE-000049` remained `POSTED`; purchase bill reversal journal remained absent.
- Allocation evidence: direct `SupplierPaymentAllocation` `6ec44d14` remained one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` `a8ee4e23` remained reversed for `200.0000`; no new supplier payment allocation, unapplied allocation, or purchase debit-note allocation was created.
- Journal/accounting evidence: original supplier payment journal `JE-000050` changed from `POSTED` to `REVERSED`; supplier payment reversal journal `JE-000051`, safe id prefix `ebc58c26`, posted with debit `112 Bank Account` for `500.0000` and credit `210 Accounts Payable` for `500.0000`; organization journal count changed `50 -> 51`; `JOURNAL_ENTRY` sequence changed next `51 -> 52`; `PAYMENT` sequence stayed next `7`.
- Audit evidence: `SUPPLIER_PAYMENT_CREATED` remains once, `APPLY_UNAPPLIED` remains once, raw `REVERSE_UNAPPLIED_ALLOCATION` remains once on allocation `a8ee4e23`, and standardized `SUPPLIER_PAYMENT_VOIDED` now exists once for `PAY-000006`; no supplier refund, purchase debit note, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/purchase-bill-void/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, auth tokens since payment, and purchase bill void audit remained `0`; organization-level ZATCA baselines remained unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-supplier-payment-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 13: purchase bill void/reversal preflight after supplier payment void`.

## Next Thread Prompt

`DEV-08 Part 13: purchase bill void/reversal preflight after supplier payment void`

## DEV-08 Part 13 - Purchase Bill Void/Reversal Preflight Completed

- DEV-08 Part 13 read-only preflight is recorded in [docs/development/DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md](docs/development/DEV_08_PURCHASE_BILL_VOID_PREFLIGHT.md).
- Mutation performed: no. `PurchaseBillService.void(...)` was not called, and no purchase bill mutation, supplier payment void, supplier payment creation, supplier payment apply/reverse-unapplied, supplier refund, purchase debit note, purchase order, purchase receipt, cash expense, stock movement, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deployment, environment/provider/schema change, production, beta, shared-target, customer-data, or login/browser flow ran.
- Local-only safety result: Docker Linux engine was available, local Postgres/Redis containers were healthy, read-only SQL ran inside local `infra-postgres-1`, and no hosted/prod/beta/shared/customer-data target was used or printed.
- Current purchase bill state: `BILL-000007`, safe id prefix `d81ddd60`, remains `FINALIZED`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, balance due `1150.0000`, purchase order link absent, and purchase bill reversal journal absent.
- Current supplier payment state: `PAY-000006`, safe id prefix `622ad0b6`, remains `VOIDED`, amount paid `500.0000`, unapplied amount `200.0000`, original journal `JE-000050` is `REVERSED`, and supplier payment void reversal journal `JE-000051` is `POSTED`.
- Current allocation state: direct `SupplierPaymentAllocation` `6ec44d14` remains one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` `a8ee4e23` remains reversed for `200.0000`; active direct allocation blocker count, active unapplied allocation blocker count, and active purchase debit note allocation blocker count are all `0`.
- Purchase bill void safety result: safe to plan for Part 14 if preflight remains unchanged. Current code blocks direct allocations only when the linked supplier payment is not `VOIDED`, so the historical direct allocation from `PAY-000006` does not block `BILL-000007`.
- Expected bill effect if approved: `BILL-000007` changes from `FINALIZED` to `VOIDED`, balance due changes `1150.0000 -> 0.0000`, total remains historically `1150.0000`, and `reversalJournalEntryId` is linked to a new purchase bill reversal journal. Current schema does not store purchase bill `voidedAt`, `voidedById`, or void reason.
- Expected allocation effect if approved: no new supplier payment allocation, supplier payment unapplied allocation, or purchase debit-note allocation is created; historical direct allocation `6ec44d14` and reversed unapplied allocation `a8ee4e23` remain as-is.
- Expected journal/accounting effect if approved: original purchase bill journal `JE-000049` is marked `REVERSED`; expected new reversal journal is `JE-000052` if sequence next `52` remains unchanged, debiting `210 Accounts Payable` for `1150.0000` and crediting `111 Cash` for `1000.0000` plus `230 VAT Receivable` for `150.0000`; supplier payment journals `JE-000050` and `JE-000051` are not changed.
- Expected audit effect if approved: one standardized `PURCHASE_BILL_VOIDED` audit action for `BILL-000007`; no additional `SUPPLIER_PAYMENT_VOIDED`, supplier refund, purchase debit note, cash expense, purchase order, cleanup/delete, or login/browser audit-writing action.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, email outbox rows, email provider events, supplier refunds, purchase debit notes, purchase orders, purchase receipts, linked stock movements, cash expenses, inventory variance proposals, cleanup/delete audit actions, and purchase bill void audit remain `0`; organization-level ZATCA baselines remain unchanged local data (`1` signed artifact draft and `7` submission logs).
- Required approval phrase for Part 14: `I approve DEV-08 Part 14 local-only purchase bill void/reversal mutation under marker DEV08-AP-20260525T230000 for BILL-000007 after supplier payment void/reversal completed. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08 Part 14: approved local purchase bill void/reversal mutation`.

## Next Thread Prompt

`DEV-08 Part 14: approved local purchase bill void/reversal mutation`

## DEV-08 Part 14 - Approved Local Purchase Bill Void/Reversal Mutation Completed

- DEV-08 Part 14 local-only mutation evidence is recorded in [docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase bill void/reversal mutation under marker `DEV08-AP-20260525T230000` for `BILL-000007` after supplier payment void/reversal completed.
- Mutation performed: yes. The guarded temporary script called `PurchaseBillService.void(...)` exactly once for `BILL-000007`; the script was not rerun after a post-mutation broad baseline assertion failed.
- Purchase bill evidence: `BILL-000007`, safe id prefix `d81ddd60`, changed from `FINALIZED` to `VOIDED`; subtotal remained `1000.0000`, tax remained `150.0000`, total remained `1150.0000`, balance due changed `1150.0000 -> 0.0000`, and reversal journal `JE-000052` was linked.
- Supplier payment evidence: `PAY-000006`, safe id prefix `622ad0b6`, remained `VOIDED`; amount paid remained `500.0000`; unapplied amount remained `200.0000`; original payment journal `JE-000050` remained `REVERSED`; payment void reversal journal `JE-000051` remained `POSTED`.
- Allocation evidence: direct `SupplierPaymentAllocation` safe prefix `6ec44d14` remained one historical allocation for `300.0000`; `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` remained reversed for `200.0000`; no new supplier payment allocation, supplier payment unapplied allocation, or purchase debit-note allocation was created.
- Journal/accounting evidence: original purchase bill journal `JE-000049`, safe id prefix `3dfa0a86`, changed from `POSTED` to `REVERSED`; purchase bill reversal journal `JE-000052`, safe id prefix `b243cab0`, posted with debit `210 Accounts Payable` for `1150.0000`, credit `230 VAT Receivable` for `150.0000`, and credit `111 Cash` for `1000.0000`; `JOURNAL_ENTRY` sequence changed next `52 -> 53`.
- Audit evidence: fixture-scoped `PURCHASE_BILL_VOIDED` now exists once for `BILL-000007`; `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` remain once; `SUPPLIER_PAYMENT_VOIDED` remains once; no duplicate purchase bill finalization, duplicate supplier payment void, supplier refund, purchase debit note, purchase order, cash expense, cleanup/delete, or login/browser audit-writing action occurred for this fixture.
- Output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific generated documents, supplier refunds, purchase debit notes, purchase orders, purchase receipts, stock movements, cash expenses, inventory variance proposals, marker email outbox rows, and cleanup/delete audit actions remain `0`; organization-level ZATCA baseline remains unchanged local AP-ready data (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08-purchase-bill-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and the script was not staged or left untracked.
- Exact next prompt title: `DEV-08 Part 15: AP state-machine closure and evidence consolidation`.

## Next Thread Prompt

`DEV-08 Part 15: AP state-machine closure and evidence consolidation`

## DEV-08 Part 15 - AP State-Machine Closure Completed

- DEV-08 Part 15 read-only closure is recorded in [docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md](docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md).
- Mutation performed: no. No database write, login/browser flow, AP mutation, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.
- Latest pushed commit inspected at the start of Part 15: `b99e068b Void DEV-08 purchase bill`; local `HEAD` matched `origin/main`.
- DEV-08 proved areas: fake local supplier fixture, finalized direct-mode purchase bill, AP/VAT/expense purchase bill journal, supplier payment creation/posting, direct bill allocation, unapplied supplier payment amount, apply-unapplied matching, reverse-unapplied matching, supplier payment void/reversal, purchase bill void/reversal after payment void, journal reversal behavior, audit behavior, and fixture-specific output/email/ZATCA/refund/debit-note/purchase-order/inventory/cash-expense/cleanup non-effects.
- Final bill/payment state: supplier `DEV08-AP-20260525T230000 Supplier` safe prefix `0e36df97` remains active `SUPPLIER`; `BILL-000007` safe prefix `d81ddd60` is `VOIDED`, total `1150.0000`, balance due `0.0000`; `PAY-000006` safe prefix `622ad0b6` is `VOIDED`, amount paid `500.0000`, unapplied amount `200.0000`.
- Final journal state: purchase bill journal `JE-000049` is `REVERSED`; purchase bill reversal journal `JE-000052` is `POSTED`; supplier payment journal `JE-000050` is `REVERSED`; supplier payment reversal journal `JE-000051` is `POSTED`.
- Final allocation state: direct `SupplierPaymentAllocation` safe prefix `6ec44d14` remains one historical `300.0000` allocation; `SupplierPaymentUnappliedAllocation` safe prefix `a8ee4e23` remains reversed for `200.0000`; no active unapplied allocation or purchase debit-note allocation remains.
- Remaining AP gaps: purchase debit notes, supplier refunds, purchase orders, cash expenses, inventory-clearing bills, purchase receipts/inventory integration, AP output/PDF/archive routes, AP email delivery, browser-authenticated AP UI flow, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08B Part 1: AP debit note and supplier refund branch preflight`.

## Next Thread Prompt

`DEV-08B Part 1: AP debit note and supplier refund branch preflight`

## DEV-08B Part 1 - AP Debit Note And Supplier Refund Branch Preflight Completed

- DEV-08B Part 1 read-only preflight is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_PREFLIGHT.md](docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_PREFLIGHT.md).
- Mutation performed: no. No database write, DB connection, login/browser flow, AP mutation, debit note creation, supplier refund creation, purchase bill creation, supplier payment creation, output/PDF/archive/export/download, email, ZATCA, cleanup, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, or customer-data action was performed.
- Recommended fixture target: reuse the fake local AP-ready organization from DEV-08 only after Part 2 rechecks it is local/disposable and has the required dependencies; create a new marker-scoped DEV-08B fake supplier, finalized direct-mode purchase bill, and finalized purchase debit note under marker `DEV08B-AP-20260526T060000`.
- Proposed economics: new purchase bill total `1150.0000`; new purchase debit note total candidate `400.0000`, preferably VAT path with taxable `347.8261` and VAT `52.1739`; apply `250.0000` to the bill; use remaining debit-note unapplied amount for supplier refund testing after an explicit Part 9 branch decision.
- Blockers/unknowns: do not reuse voided `BILL-000007`; exact number sequences, fiscal-period state, and account/tax dependencies must be read-only checked before mutation; debit-note apply/reverse allocation audit actions appear raw rather than standardized.
- Required approval phrase for Part 2: `I approve DEV-08B Part 2 local-only AP debit note fixture creation mutation under marker DEV08B-AP-20260526T060000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 2: approved local AP debit note fixture creation mutation`.

## Next Thread Prompt

`DEV-08B Part 2: approved local AP debit note fixture creation mutation`

## DEV-08B Part 2 - Approved Local AP Debit Note Fixture Creation Mutation Completed

- DEV-08B Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only AP debit note fixture creation mutation under marker `DEV08B-AP-20260526T060000`.
- Mutation performed: yes. The guarded temporary script called `ContactService.create(...)`, `PurchaseBillService.create(...)`, `PurchaseBillService.finalize(...)`, `PurchaseDebitNoteService.create(...)`, and `PurchaseDebitNoteService.finalize(...)` once each.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Supplier evidence: `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`, under the fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, direct expense/asset mode, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`, no reversal journal, no supplier payment allocation, no debit note allocation, and no generated document.
- Purchase debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, linked to `BILL-000008`, subtotal `400.0000`, VAT `60.0000`, total and unapplied amount `460.0000`, no allocation, no supplier refund, and no reversal journal.
- Tax path: VAT path was used; zero-tax fallback was not used.
- Journal evidence: bill journal `JE-000053`, safe id prefix `950b8a43`, posted and balanced with debits `111` `1000.0000` and `230` `150.0000`, credit `210` `1150.0000`; debit-note journal `JE-000054`, safe id prefix `670f7dc0`, posted and balanced with debit `210` `460.0000`, credits `111` `400.0000` and `230` `60.0000`.
- Audit evidence: `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, and `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED` were recorded; no debit-note apply/reverse/void, supplier refund, supplier payment, purchase order, cash expense, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/payment/refund/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, and generated documents are all `0`; organization-level generated document, email, ZATCA, and other baseline counts were unchanged in the read-only verification pass.
- Temporary script cleanup: `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Deviation: the first script run completed the mutation once and then failed during a post-mutation broad stock-movement read filter. The temporary script was patched to use a read-only `--verify-existing` path and current schema fields, then rerun only to verify the already-created marker fixture without creating additional records.
- Exact next prompt title: `DEV-08B Part 3: AP debit note fixture evidence verification`.

## Next Thread Prompt

`DEV-08B Part 3: AP debit note fixture evidence verification`

## DEV-08B Part 3 - AP Debit Note Fixture Evidence Verification Completed

- DEV-08B Part 3 read-only verification is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_AP_DEBIT_NOTE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No debit-note apply/reverse/void, supplier refund creation, supplier payment creation, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma script accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Temporary script absence: `apps/api/scripts/dev08b-ap-debit-note-fixture.tmp.ts` is absent, unstaged, and untracked.
- Supplier evidence: exactly one marker supplier exists, `DEV08B-AP-20260526T060000 Supplier`, safe id prefix `d11c76db`, active `SUPPLIER`, under fake local AP-ready organization safe prefix `db69e5a8`.
- Purchase bill evidence: exactly one marker bill exists, `BILL-000008`, safe id prefix `4b8886bb`, `FINALIZED`, `DIRECT_EXPENSE_OR_ASSET`, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`, no reversal journal, no supplier payment allocation, no debit-note allocation, and no generated document.
- Purchase debit note evidence: exactly one marker debit note exists, `PDN-000003`, safe id prefix `b93f96ee`, `FINALIZED`, linked to `BILL-000008`, subtotal `400.0000`, VAT `60.0000`, total and unapplied amount `460.0000`, no allocation, no supplier refund, no reversal journal, and no generated document.
- Journal evidence: bill journal `JE-000053`, safe id prefix `950b8a43`, remains `POSTED` and balanced with debits `111` `1000.0000` and `230` `150.0000`, credit `210` `1150.0000`; debit-note journal `JE-000054`, safe id prefix `670f7dc0`, remains `POSTED` and balanced with debit `210` `460.0000`, credits `111` `400.0000` and `230` `60.0000`.
- Audit evidence: fixture actions are exactly `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, and `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`; no debit-note apply/reverse/void, supplier refund, supplier payment, purchase bill void, or login/browser audit-writing action was found for this fixture.
- Forbidden side effects checked: fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, and marker email provider events are all `0`; organization-level local ZATCA baselines still match `1` signed artifact draft and `7` submission logs.
- Deviation: one read-only verification query initially failed because an audit assertion was too broad and counted unrelated actor-level refund/payment audits; it was rerun with fixture-scoped audit checks and no write path was called.
- Exact next prompt title: `DEV-08B Part 4: debit note apply-to-bill preflight`.

## Next Thread Prompt

`DEV-08B Part 4: debit note apply-to-bill preflight`

## DEV-08B Part 4 - Debit Note Apply-To-Bill Preflight Completed

- DEV-08B Part 4 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.apply(...)` was not called, and no debit-note apply/reverse/void, supplier refund, supplier payment, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `460.0000`, linked to `BILL-000008`, no allocation, no supplier refund, and no reversal journal.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no debit-note allocation, no supplier payment allocation, and no reversal journal.
- Planned application amount: `250.0000`.
- Expected debit-note effect if approved: `PDN-000003` remains `FINALIZED`, total remains `460.0000`, unapplied amount changes `460.0000 -> 210.0000`, and reversal journal remains absent.
- Expected bill effect if approved: `BILL-000008` remains `FINALIZED`, total remains `1150.0000`, balance due changes `1150.0000 -> 900.0000`, and reversal journal remains absent.
- Expected allocation effect if approved: one `PurchaseDebitNoteAllocation` is created for `250.0000`, linked to `PDN-000003` and `BILL-000008`, with `reversedAt`, `reversedById`, and `reversalReason` absent; no supplier payment allocation or supplier refund is created.
- Expected journal/accounting effect if approved: no new journal entry because current code treats apply as matching-only; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted and unchanged; current journal count `54` and `JOURNAL_ENTRY` sequence next `JE-000055` should remain unchanged.
- Expected audit effect if approved: one raw `PurchaseDebitNote:APPLY` audit action for `PDN-000003`; current audit mapping does not standardize `PurchaseDebitNote:APPLY`; no reverse-allocation, debit-note void, supplier refund, supplier payment, purchase bill void, or login/browser audit-writing action expected.
- Forbidden side effects checked: fixture-specific supplier payments, supplier refunds, debit note allocations, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows, and marker email provider events are all `0`; organization-level local ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Required approval phrase for Part 5: `I approve DEV-08B Part 5 local-only purchase debit note apply-to-bill mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B debit note and purchase bill with amount 250.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 5: approved local debit note apply-to-bill mutation`.

## Next Thread Prompt

`DEV-08B Part 5: approved local debit note apply-to-bill mutation`

## DEV-08B Part 5 - Approved Local Debit Note Apply-To-Bill Mutation Completed

- DEV-08B Part 5 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase debit note apply-to-bill mutation under marker `DEV08B-AP-20260526T060000` for the DEV-08B debit note and purchase bill with amount `250.0000`.
- Mutation performed: yes. The guarded temporary script called `PurchaseDebitNoteService.apply(...)` exactly once for `PDN-000003` with `{ billId: BILL-000008, amountApplied: "250.0000" }`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `460.0000 -> 210.0000`; reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `1150.0000 -> 900.0000`; reversal journal remained absent.
- Allocation evidence: exactly one active `PurchaseDebitNoteAllocation` was created, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remained absent.
- Journal/accounting evidence: no new journal entry was created; organization journal count stayed `54`; `JOURNAL_ENTRY` sequence stayed `JE-000055`; purchase bill journal `JE-000053` and purchase debit note journal `JE-000054` remained posted and unchanged.
- Audit evidence: raw `PurchaseDebitNote:APPLY` now exists once for `PDN-000003`; `PURCHASE_DEBIT_NOTE_CREATED` and `PURCHASE_DEBIT_NOTE_FINALIZED` remain; no debit-note reverse/void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, supplier refunds, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, and marker email provider events remain `0`; organization-level ZATCA baselines stayed unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-apply.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 6: debit note apply evidence verification`.

## Next Thread Prompt

`DEV-08B Part 6: debit note apply evidence verification`

## DEV-08B Part 6 - Debit Note Apply Evidence Verification Completed

- DEV-08B Part 6 read-only verification is recorded in [docs/development/DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_DEBIT_NOTE_APPLY_EVIDENCE_VERIFICATION.md).
- Mutation performed: no. No debit-note apply, debit-note reversal, debit-note void, supplier refund workflow, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma verification accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Temporary script absence: `apps/api/scripts/dev08b-debit-note-apply.tmp.ts` is absent, unstaged, and untracked; no `*dev08b*` script remains under `apps/api/scripts`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`; total remains `460.0000`; unapplied amount remains `210.0000`; reversal journal remains absent; supplier refunds remain `0`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; total remains `1150.0000`; balance due remains `900.0000`; reversal journal remains absent; generated document links remain `0`.
- Allocation evidence: exactly one active `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remain absent.
- Journal/accounting evidence: bill journal `JE-000053` and debit-note journal `JE-000054` remain `POSTED` and unchanged; organization journal count remains `54`; `JOURNAL_ENTRY` sequence remains `JE-000055`; no reversal, supplier refund, or supplier payment journal exists for this fixture.
- Audit evidence: fixture actions are `Contact:CREATE`, `PurchaseBill:PURCHASE_BILL_CREATED`, `PurchaseBill:PURCHASE_BILL_FINALIZED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_CREATED`, `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_FINALIZED`, and raw `PurchaseDebitNote:APPLY`; no debit-note reverse/void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action was found.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and fixture cleanup/delete audits are all `0`; organization-level ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Exact next prompt title: `DEV-08B Part 7: debit note allocation reversal preflight`.

## Next Thread Prompt

`DEV-08B Part 7: debit note allocation reversal preflight`

## DEV-08B Part 7 - Debit Note Allocation Reversal Preflight Completed

- DEV-08B Part 7 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.reverseAllocation(...)` was not called, and no debit-note allocation reversal, debit-note apply, debit-note void, supplier refund workflow, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `210.0000`, reversal journal absent, and supplier refunds `0`.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `900.0000`, reversal journal absent, supplier payment allocations `0`, and supplier payment unapplied allocations `0`.
- Current allocation state: exactly one active `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount applied `250.0000`, linked to `PDN-000003` and `BILL-000008`; `reversedAt`, `reversedById`, and `reversalReason` remain absent.
- Expected debit-note effect if approved: `PDN-000003` remains `FINALIZED`, total remains `460.0000`, unapplied amount changes `210.0000 -> 460.0000`, and reversal journal remains absent.
- Expected bill effect if approved: `BILL-000008` remains `FINALIZED`, total remains `1150.0000`, balance due changes `900.0000 -> 1150.0000`, and reversal journal remains absent.
- Expected allocation effect if approved: allocation `7ec0dfb3` is marked reversed with `reversedAt`, `reversedById`, and reversal reason `DEV-08B local-only debit note allocation reversal QA`; no new allocation, supplier payment allocation, or supplier refund is created.
- Expected journal/accounting effect if approved: no new journal entry because current code treats reverse allocation as matching-only; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted and unchanged; current journal count `54` and `JOURNAL_ENTRY` sequence next `JE-000055` should remain unchanged.
- Expected audit effect if approved: one raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` audit action; current audit mapping does not standardize `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION`; no debit-note void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action expected.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and fixture cleanup/delete audits are all `0`; organization-level ZATCA baselines remain `1` signed artifact draft and `7` submission logs.
- Required approval phrase for Part 8: `I approve DEV-08B Part 8 local-only purchase debit note allocation reversal mutation under marker DEV08B-AP-20260526T060000 for the active 250.0000 debit note allocation. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 8: approved local debit note allocation reversal mutation`.

## Next Thread Prompt

`DEV-08B Part 8: approved local debit note allocation reversal mutation`

## DEV-08B Part 8 - Approved Local Debit Note Allocation Reversal Mutation Completed

- DEV-08B Part 8 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_ALLOCATION_REVERSAL_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only purchase debit note allocation reversal mutation under marker `DEV08B-AP-20260526T060000` for the active `250.0000` debit note allocation.
- Mutation performed: yes. The guarded temporary script called `PurchaseDebitNoteService.reverseAllocation(...)` exactly once for allocation safe id prefix `7ec0dfb3` with reason `DEV-08B local-only debit note allocation reversal QA`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `210.0000 -> 460.0000`; reversal journal remained absent; supplier refunds remained `0`.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due changed `900.0000 -> 1150.0000`; reversal journal remained absent.
- Allocation evidence: exactly one `PurchaseDebitNoteAllocation` remains, safe id prefix `7ec0dfb3`, amount applied `250.0000`; it is now reversed with `reversedAt` set, `reversedById` set, and reversal reason `DEV-08B local-only debit note allocation reversal QA`; no new allocation or supplier payment allocation was created.
- Journal/accounting evidence: no new journal entry was created; organization journal count stayed `54`; `JOURNAL_ENTRY` sequence stayed `JE-000055`; purchase bill journal `JE-000053` and purchase debit note journal `JE-000054` remained posted and unchanged.
- Audit evidence: raw `PurchaseDebitNoteAllocation:REVERSE_ALLOCATION` now exists once for allocation `7ec0dfb3`; `PurchaseDebitNote:APPLY`, `PURCHASE_DEBIT_NOTE_CREATED`, and `PURCHASE_DEBIT_NOTE_FINALIZED` remain; no debit-note void, supplier refund, supplier payment, purchase bill void, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/refund/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email outbox rows, marker email provider events, marker auth tokens, and cleanup/delete audits remain `0`; organization-level ZATCA baselines stayed unchanged (`1` signed artifact draft and `7` submission logs).
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-allocation-reversal.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 9: supplier refund from debit note preflight`.

## Next Thread Prompt

`DEV-08B Part 9: supplier refund from debit note preflight`

## DEV-08B Part 9 - Supplier Refund From Debit Note Preflight Completed

- DEV-08B Part 9 read-only preflight is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_PREFLIGHT.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_PREFLIGHT.md).
- Mutation performed: no. `SupplierRefundService.create(...)` was not called, and no supplier refund creation/void, debit-note apply/reverse/void, supplier payment workflow, purchase bill mutation, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, shared-target, customer-data, cleanup deletion, or login/browser flow ran.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the read-only Prisma preflight accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied amount `460.0000`, supplier refund count `0`, and reversal journal absent.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total `1150.0000`, balance due `1150.0000`, no supplier payment allocations, no supplier payment unapplied allocations, and no reversal journal.
- Current allocation state: one historical `PurchaseDebitNoteAllocation` exists, safe id prefix `7ec0dfb3`, amount `250.0000`; it is reversed with `reversedAt` and `reversedById` set and reason `DEV-08B local-only debit note allocation reversal QA`; active allocation count is `0`.
- Selected refund amount: `150.0000`, which is below debit-note unapplied amount `460.0000`; expected debit-note unapplied amount after approved mutation is `310.0000`.
- Selected bank/asset account: account `112` `Bank Account`, safe id prefix `32ab6f4d`, active posting `ASSET`, same fake local AP-ready organization.
- Expected supplier refund effect if approved: exactly one posted supplier refund sourced from `PDN-000003`, amount `150.0000`, with no void reversal journal and no supplier payment.
- Expected journal/accounting effect if approved: one posted balanced supplier refund journal, expected next `JE-000055`, debiting account `112` for `150.0000` and crediting AP account `210` for `150.0000`; bill journal `JE-000053` and debit-note journal `JE-000054` remain unchanged.
- Expected audit effect if approved: standardized `SupplierRefund:SUPPLIER_REFUND_CREATED`; no supplier refund void, debit-note apply/reverse/void, purchase bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Forbidden side effects checked: fixture-specific supplier refunds, supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note are all `0`; existing organization-level local ZATCA submission log baseline remains `7`.
- Required approval phrase for Part 10: `I approve DEV-08B Part 10 local-only supplier refund from debit note mutation under marker DEV08B-AP-20260526T060000 for the DEV-08B purchase debit note with refund amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 10: approved local supplier refund from debit note mutation`.

## Next Thread Prompt

`DEV-08B Part 10: approved local supplier refund from debit note mutation`

## DEV-08B Part 10 - Approved Local Supplier Refund From Debit Note Mutation Completed

- DEV-08B Part 10 local-only mutation evidence is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_MUTATION_EVIDENCE.md).
- Approval phrase was received for the local-only supplier refund from debit note mutation under marker `DEV08B-AP-20260526T060000` for refund amount `150.0000`.
- Mutation performed: yes. The guarded temporary script called `SupplierRefundService.create(...)` exactly once for `PDN-000003` with source type `PURCHASE_DEBIT_NOTE` and amount `150.0000`.
- Local-only target proof: Docker Linux engine was available, local Postgres/Redis containers were healthy, the guarded script accepted only `localhost:5432` database `accounting`, and no hosted/prod/beta/shared/customer-data target or secret was printed.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, `POSTED`, amount `150.0000`, sourced from `PDN-000003`, with journal entry present and void reversal journal absent.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount changed `460.0000 -> 310.0000`; reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; total remained `1150.0000`; balance due stayed `1150.0000`; reversal journal remained absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remains `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: supplier refund journal `JE-000055`, safe id prefix `6cae838d`, posted and balanced with debit account `112` `150.0000` and credit AP account `210` `150.0000`; journal count changed `54 -> 55`; bill journal `JE-000053` and debit-note journal `JE-000054` remained unchanged.
- Audit evidence: standardized `SupplierRefund:SUPPLIER_REFUND_CREATED` was created; no supplier refund void, debit-note void, duplicate debit-note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Output/email/ZATCA/payment/purchase-order/inventory/cash-expense/cleanup occurred: no. Fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remain `0`; organization-level local ZATCA submission logs remain baseline `7`.
- Temporary script cleanup: `apps/api/scripts/dev08b-supplier-refund-from-debit-note.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 11: supplier refund evidence verification`.

## DEV-08B Part 11 - Supplier Refund Evidence Verification Completed

- DEV-08B Part 11 read-only verification is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08B_SUPPLIER_REFUND_FROM_DEBIT_NOTE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no. `SupplierRefundService.create(...)`, supplier refund void, debit-note apply/reverse/void, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Verification conclusion: verified with no evidence discrepancy.
- Local-only target proof: Docker Desktop and the local `postgres`/`redis` compose services were started because they were initially down; `infra-postgres-1` and `infra-redis-1` became healthy, `localhost:5432` and `localhost:6379` were reachable, and the read-only verifier accepted only local database `accounting`.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, remains `POSTED`, amount `150.0000`, source type `PURCHASE_DEBIT_NOTE`, source debit note `PDN-000003`, source supplier payment absent, journal `JE-000055`, and void reversal journal absent.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`; total remains `460.0000`; unapplied amount remains `310.0000`; reversal journal remains absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; total remains `1150.0000`; balance due remains `1150.0000`; reversal journal remains absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remains `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: supplier refund journal `JE-000055`, safe id prefix `6cae838d`, remains `POSTED` and balanced with debit account `112` Bank Account `150.0000` and credit AP account `210` Accounts Payable `150.0000`; bill journal `JE-000053` and debit-note journal `JE-000054` remain posted.
- Audit evidence: expected fixture audit trail is present through `SupplierRefund:SUPPLIER_REFUND_CREATED`; no supplier refund void, debit note void, duplicate debit note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action was found.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remain `0`; organization-level local ZATCA submission logs remain baseline `7`.
- Temporary script cleanup result: `apps/api/scripts/dev08b-supplier-refund-evidence-readonly.tmp.ts` was removed after its single read-only run, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 12: supplier refund void preflight`.

## DEV-08B Part 12 - Supplier Refund Void Preflight Completed

- DEV-08B Part 12 read-only preflight is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08B_SUPPLIER_REFUND_VOID_PREFLIGHT.md).
- Mutation performed: no. `SupplierRefundService.void(...)`, supplier refund creation, debit-note apply/reverse/void, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Current refund state: `SRF-000003`, safe id prefix `39873ae4`, remains `POSTED`, amount `150.0000`, source debit note `PDN-000003`, source payment absent, journal `JE-000055` posted, and void reversal journal absent.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total `460.0000`, unapplied `310.0000`, reversal journal absent.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total and balance due `1150.0000`, reversal journal absent.
- Expected void/reversal effect: supplier refund changes `POSTED -> VOIDED`, `PDN-000003` unapplied restores `310.0000 -> 460.0000`, `BILL-000008` balance stays `1150.0000`, historical allocation `7ec0dfb3` remains reversed, and no supplier payment allocation is created.
- Expected journal/accounting result: create one posted reversal journal for `JE-000055`, mark `JE-000055` `REVERSED`, debit AP account `210` `150.0000`, credit Bank account `112` `150.0000`, and leave bill/debit-note journals unchanged.
- Expected audit result: one standardized `SupplierRefund:SUPPLIER_REFUND_VOIDED`; no debit-note apply/reverse/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Part 13 approval phrase: `I approve DEV-08B Part 13 local-only supplier refund void mutation under marker DEV08B-AP-20260526T060000 for supplier refund SRF-000003 amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 13: approved local supplier refund void mutation`.

## DEV-08B Part 13 - Approved Local Supplier Refund Void Mutation Completed

- DEV-08B Part 13 local-only mutation evidence is recorded in [docs/development/DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08B_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, exactly one supplier refund void/reversal. The guarded temporary script called `SupplierRefundService.void(...)` exactly once for `SRF-000003`.
- Approval phrase was received for the local-only supplier refund void mutation under marker `DEV08B-AP-20260526T060000` for refund `SRF-000003` amount `150.0000`.
- Refund evidence: `SRF-000003`, safe id prefix `39873ae4`, changed `POSTED -> VOIDED`; `voidedAt` is set; original refund journal `JE-000055` changed to `REVERSED`; void reversal journal `JE-000056`, safe id prefix `252c28f9`, is `POSTED`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, remained `FINALIZED`; total remained `460.0000`; unapplied amount restored `310.0000 -> 460.0000`; debit-note reversal journal remained absent.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; balance due stayed `1150.0000`; reversal journal remained absent.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count remained `0`; no new debit-note allocation or supplier payment allocation was created.
- Journal/accounting evidence: reversal journal `JE-000056` debits AP account `210` for `150.0000` and credits Bank account `112` for `150.0000`; journal count changed `55 -> 56`; bill journal `JE-000053` and debit-note journal `JE-000054` remained posted and unchanged.
- Audit evidence: standardized `SupplierRefund:SUPPLIER_REFUND_VOIDED` now exists; no debit-note apply/reverse/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remained `0`.
- Temporary script cleanup: `apps/api/scripts/dev08b-supplier-refund-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 14: debit note void preflight`.

## DEV-08B Part 14 - Debit Note Void Preflight Completed

- DEV-08B Part 14 read-only preflight is recorded in [docs/development/DEV_08B_DEBIT_NOTE_VOID_PREFLIGHT.md](docs/development/DEV_08B_DEBIT_NOTE_VOID_PREFLIGHT.md).
- Mutation performed: no. `PurchaseDebitNoteService.void(...)`, supplier refund mutation, debit-note apply/reverse, purchase bill mutation, supplier payment mutation, output/PDF/archive/export/download, email, ZATCA, migrations, seed/reset/delete, deploys, environment changes, and login/browser flows were not run.
- Current debit note state: `PDN-000003`, safe id prefix `b93f96ee`, remains `FINALIZED`, total and unapplied `460.0000`, journal `JE-000054` posted, no `reversedBy`, and no debit-note reversal journal.
- Current refund state: `SRF-000003`, safe id prefix `39873ae4`, remains `VOIDED`; void reversal journal `JE-000056` is posted; posted supplier refund blocker count for `PDN-000003` is `0`.
- Current allocation state: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count is `0`.
- Current bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`; balance due remains `1150.0000`; reversal journal remains absent.
- Expected void/reversal effect: `PDN-000003` changes `FINALIZED -> VOIDED`, debit-note reversal journal is set, refund/allocation state remains voided/reversed, and bill balance remains `1150.0000`.
- Expected journal/accounting result: create one posted reversal journal for `JE-000054`, mark `JE-000054` `REVERSED`, debit account `111` `400.0000`, debit VAT receivable `230` `60.0000`, credit AP account `210` `460.0000`, and leave bill and supplier-refund journals unchanged.
- Expected audit result: one standardized `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED`; no supplier refund, debit-note apply/reverse, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action.
- Part 15 approval phrase: `I approve DEV-08B Part 15 local-only purchase debit note void mutation under marker DEV08B-AP-20260526T060000 for purchase debit note PDN-000003 total 460.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08B Part 15: approved local debit note void mutation`.

## Next Thread Prompt

`DEV-08B Part 15: approved local debit note void mutation`

## DEV-08B Part 15 - Approved Local Debit Note Void Mutation Completed

- DEV-08B Part 15 local-only mutation evidence is recorded in [docs/development/DEV_08B_DEBIT_NOTE_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08B_DEBIT_NOTE_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, exactly one purchase debit note void/reversal. The guarded temporary script called `PurchaseDebitNoteService.void(...)` exactly once for `PDN-000003`.
- Approval phrase was received for the local-only debit note void mutation under marker `DEV08B-AP-20260526T060000` for debit note `PDN-000003` total `460.0000`.
- Debit note evidence: `PDN-000003`, safe id prefix `b93f96ee`, changed `FINALIZED -> VOIDED`; total remained `460.0000`; unapplied amount stayed `460.0000`; original debit-note journal `JE-000054` changed to `REVERSED`; void reversal journal `JE-000057`, safe id prefix `f1ab6c83`, is `POSTED`.
- Supplier refund evidence: `SRF-000003`, safe id prefix `39873ae4`, remained `VOIDED`; void reversal journal `JE-000056` remained present; original refund journal remained `REVERSED`; posted refund blocker count stayed `0`.
- Allocation evidence: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active allocation count stayed `0`; no new allocation or supplier payment allocation was created.
- Purchase bill evidence: `BILL-000008`, safe id prefix `4b8886bb`, remained `FINALIZED`; balance due stayed `1150.0000`; reversal journal remained absent.
- Journal/accounting evidence: journal count changed `56 -> 57`; debit note void reversal journal `JE-000057` debits VAT receivable `230` for `60.0000`, debits account `111` for `400.0000`, and credits AP account `210` for `460.0000`; bill and supplier-refund journals remained otherwise unchanged.
- Audit evidence: standardized `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED` now exists; no duplicate debit-note apply/reverse, supplier refund create/void, bill void, supplier payment, cleanup/delete, or login/browser audit-writing action occurred.
- Forbidden side-effect result: fixture-specific supplier payments, purchase orders, purchase receipts, stock movements, cash expenses, generated documents, marker email rows/provider events, marker auth tokens, cleanup/delete audits, and ZATCA metadata for bill/debit note remained `0`.
- Temporary script cleanup: `apps/api/scripts/dev08b-debit-note-void.tmp.ts` was removed after execution, `Test-Path` returned `False`, and no `*dev08b*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08B Part 16: AP debit note refund closure`.

## Next Thread Prompt

`DEV-08B Part 16: AP debit note refund closure`

## DEV-08B Part 16 - AP Debit Note Refund Closure Completed

- DEV-08B Part 16 closure is recorded in [docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md](docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md).
- Mutation performed: no. No runtime DB write, mutation script, fixture creation, finalization, apply, reverse, refund, void, cleanup, output/PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, or customer-data action ran.
- Latest commit inspected: `64537439 Void DEV-08B debit note locally`; local `HEAD` matched GitHub remote `origin/main`.
- DEV-08B proved AP debit note fixture creation/finalization, debit-note apply-to-bill, debit-note allocation reversal, supplier refund from debit note, supplier refund void/reversal, debit note void/reversal, journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final bill state: `BILL-000008`, safe id prefix `4b8886bb`, remains `FINALIZED`, total and balance due `1150.0000`, reversal journal absent.
- Final debit note state: `PDN-000003`, safe id prefix `b93f96ee`, is `VOIDED`; total and unapplied amount `460.0000`; original journal `JE-000054` is `REVERSED`; void reversal journal `JE-000057` is `POSTED`.
- Final supplier refund state: `SRF-000003`, safe id prefix `39873ae4`, is `VOIDED`; amount `150.0000`; original journal `JE-000055` is `REVERSED`; void reversal journal `JE-000056` is `POSTED`.
- Final allocation state: historical `PurchaseDebitNoteAllocation` safe id prefix `7ec0dfb3` remains reversed for `250.0000`; active debit-note allocation count is `0`.
- Final accounting finding: debit-note apply/reversal were matching-only; supplier refund and debit-note void paths created balanced posted reversal journals; no supplier payment, purchase order, inventory, cash expense, output, email, or ZATCA journal was created.
- Final audit finding: expected fixture audit trail exists through `PurchaseDebitNote:PURCHASE_DEBIT_NOTE_VOIDED`; debit-note apply and allocation reversal remain raw audit actions; no duplicate apply/reverse/refund/void, supplier payment, cleanup/delete, or login/browser audit-writing action was found.
- Remaining AP gaps: supplier refund from supplier payment source, purchase order conversion/lifecycle, cash expenses, inventory-clearing bills and purchase receipts, AP outputs/PDF/archive/email, browser-authenticated AP UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08C Part 1: purchase order conversion preflight`.

## DEV-08C Part 1 - Purchase Order Conversion Preflight Completed

- DEV-08C Part 1 read-only purchase order conversion preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md).
- Mutation performed: no. No runtime DB write, fixture creation, purchase order create/approve/mark-sent/close/void/convert/delete, purchase bill finalization, purchase receipt, stock movement, generated document, PDF/download/archive, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, or customer-data action ran.
- Latest commit inspected: `b5782526 Close DEV-08B debit note refund evidence`; local `HEAD` matched `origin/main` at `b5782526302fea2465a50dab220037fcc9e55cfc`.
- Purchase order lifecycle summary: create/update keep purchase orders operational and non-posting; approval moves `DRAFT -> APPROVED`; mark-sent moves `APPROVED -> SENT`; close allows `APPROVED|SENT|PARTIALLY_BILLED -> CLOSED`; void allows `DRAFT|APPROVED|SENT -> VOIDED`; delete is draft-only and remains out of the selected fixture arc; PDF/generate-PDF paths are output/archive-producing and deferred.
- Conversion summary: `PurchaseOrderService.convertToBill(...)` allows only `APPROVED` or `SENT`, blocks repeat conversion with `convertedBillId`, requires an active supplier contact and line account or item expense-account fallback, creates a `DRAFT` purchase bill without a journal, copies supplier/branch/currency/notes/terms/totals/line data, and updates the purchase order to `BILLED` with `convertedBillId`.
- Selected Part 2 mutation target: create or reuse one fake local supplier named `DEV08C-AP-20260526T000000 Supplier` and create one draft purchase order only under marker `DEV08C-AP-20260526T000000`, using one service/direct line, planned subtotal `1000.0000`, VAT `150.0000`, total `1150.0000`, and no approval, mark-sent, conversion, bill finalization, PDF/archive, email, ZATCA, receipt, inventory, supplier payment/refund/debit-note, cash expense, cleanup, migration, seed/reset/delete, deploy, environment, provider, schema, production, beta, shared-target, or customer-data action.
- Required approval phrase for Part 2: `I approve DEV-08C Part 2 local-only purchase order fixture creation mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 2: approved local purchase order fixture creation mutation`.

## DEV-08C Part 2 - Purchase Order Fixture Creation Completed

- DEV-08C Part 2 local-only purchase order fixture mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only, under marker `DEV08C-AP-20260526T000000`.
- `PurchaseOrderService.create(...)` was called exactly once.
- Supplier safe id prefix: `5ef871cd`.
- Purchase order: `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`.
- Converted bill: absent.
- Journal: absent.
- Forbidden side effects absent: purchase bill conversion/finalization, purchase receipt, stock movement, generated document/PDF/archive, email, supplier payment, supplier refund, purchase debit note, cash expense, cleanup/delete, ZATCA, login/browser, production, beta, shared-target, and customer-data paths.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-fixture.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 3: purchase order fixture evidence verification`.

## DEV-08C Part 3 - Purchase Order Fixture Evidence Verification Completed

- DEV-08C Part 3 read-only purchase order fixture evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_CREATED` audit count `1`; disallowed PO state/action audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 3 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 4: purchase order approval preflight`.

## DEV-08C Part 4 - Purchase Order Approval Preflight Completed

- DEV-08C Part 4 purchase order approval preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `DRAFT`, total `1150.0000`, one line, supplier safe id prefix `5ef871cd`, converted bill absent, approval audit absent.
- Approval eligibility: current status is `DRAFT`, total is positive, line/account/tax evidence is present, and `PurchaseOrderService.approve(...)` allows `DRAFT -> APPROVED`.
- Expected approval effect: status `APPROVED`, `approvedAt` set, total unchanged, converted bill absent, no purchase bill, no journal, no inventory, no output/email/ZATCA, and one `PURCHASE_ORDER_APPROVED` audit action.
- Required approval phrase: `I approve DEV-08C Part 5 local-only purchase order approval mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 5: approved local purchase order approval mutation`.

## DEV-08C Part 5 - Purchase Order Approval Mutation Completed

- DEV-08C Part 5 approved local purchase order approval mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.approve(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `DRAFT -> APPROVED`; `approvedAt` changed absent -> present; total stayed `1150.0000`; converted bill remained absent.
- Accounting/journal result: purchase bill count linked to PO stayed `0`; marker/PO journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_APPROVED` audit count changed `0 -> 1`; `PURCHASE_ORDER_CREATED` audit count stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-approval.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 6: purchase order approval evidence verification`.

## DEV-08C Part 6 - Purchase Order Approval Evidence Verification Completed

- DEV-08C Part 6 read-only purchase order approval evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_APPROVAL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `APPROVED`, `approvedAt` present, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_APPROVED` audit count `1`; `PURCHASE_ORDER_CREATED` audit count `1`; mark-sent/close/void/convert/delete audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 6 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 7: purchase order mark-sent preflight`.

## DEV-08C Part 7 - Purchase Order Mark-Sent Preflight Completed

- DEV-08C Part 7 purchase order mark-sent preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `APPROVED`, `approvedAt` present, `sentAt` absent, total `1150.0000`, one line, converted bill absent, purchase bill count `0`, marker/PO journal count `0`.
- Mark-sent eligibility: `PurchaseOrderService.markSent(...)` allows current `APPROVED` status, sets status `SENT` and `sentAt`, and logs `MARK_SENT`; audit mapping records `PURCHASE_ORDER_SENT`.
- Expected mark-sent effect: `APPROVED -> SENT`, `sentAt` set, totals and lines unchanged, no bill, no journal, no inventory, no output/email/ZATCA, and one `PURCHASE_ORDER_SENT` audit action.
- Required approval phrase: `I approve DEV-08C Part 8 local-only purchase order mark-sent mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 8: approved local purchase order mark-sent mutation`.

## DEV-08C Part 8 - Purchase Order Mark-Sent Mutation Completed

- DEV-08C Part 8 approved local purchase order mark-sent mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.markSent(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `APPROVED -> SENT`; `sentAt` changed absent -> present; `approvedAt` remained present; total stayed `1150.0000`; converted bill remained absent.
- Accounting/journal result: purchase bill count linked to PO stayed `0`; marker/PO journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_SENT` audit count changed `0 -> 1`; `PURCHASE_ORDER_APPROVED` audit count stayed `1`; `PURCHASE_ORDER_CREATED` audit count stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-mark-sent.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 9: purchase order mark-sent evidence verification`.

## DEV-08C Part 9 - Purchase Order Mark-Sent Evidence Verification Completed

- DEV-08C Part 9 read-only purchase order mark-sent evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_MARK_SENT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: exactly one marker-scoped fixture exists, `PO-000141`, safe id prefix `d6abea75`, status `SENT`, `sentAt` present, total `1150.0000`, supplier safe id prefix `5ef871cd`, converted bill absent.
- Accounting/journal result: no purchase bill linked to the PO and no marker/PO journal entry.
- Audit result: expected `PURCHASE_ORDER_SENT` audit count `1`; `PURCHASE_ORDER_APPROVED` audit count `1`; `PURCHASE_ORDER_CREATED` audit count `1`; close/void/convert/delete audit count `0`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 9 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 10: purchase order convert-to-bill preflight`.

## DEV-08C Part 10 - Purchase Order Convert-To-Bill Preflight Completed

- DEV-08C Part 10 convert-to-bill preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_PREFLIGHT.md).
- Mutation performed: no.
- Current PO state: `PO-000141`, safe id prefix `d6abea75`, status `SENT`, `sentAt` present, total `1150.0000`, one direct-account line using account `111`, supplier active `SUPPLIER`, converted bill absent, purchase bill count `0`, marker/PO journal count `0`.
- Conversion eligibility: `PurchaseOrderService.convertToBill(...)` allows current `SENT` status, requires absent `convertedBillId`, active supplier-capable contact, and line account coverage; all preflight checks passed.
- Expected conversion result: purchase order `SENT -> BILLED`, `convertedBillId` set, one linked `DRAFT` purchase bill created with total and balance due `1150.0000`, no bill journal, no purchase order journal, no inventory/posting, no output/email/ZATCA, and one `PURCHASE_ORDER_CONVERTED_TO_BILL` audit action.
- Required approval phrase: `I approve DEV-08C Part 11 local-only purchase order convert-to-bill mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 11: approved local purchase order convert-to-bill mutation`.

## DEV-08C Part 11 - Purchase Order Convert-To-Bill Mutation Completed

- DEV-08C Part 11 approved local purchase order convert-to-bill mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseOrderService.convertToBill(...)` once.
- Before/after entity state: `PO-000141`, safe id prefix `d6abea75`, changed `SENT -> BILLED`; `convertedBillId` changed absent -> present with bill safe prefix `f37c60b2`; total stayed `1150.0000`.
- Converted bill result: `BILL-000422`, safe id prefix `f37c60b2`, status `DRAFT`, total and balance due `1150.0000`, one line using account `111`, journal absent.
- Accounting/journal result: purchase bill count linked to PO changed `0 -> 1`; marker/PO/bill journal count stayed `0`.
- Audit result: `PURCHASE_ORDER_CONVERTED_TO_BILL` audit count changed `0 -> 1`; `PURCHASE_ORDER_SENT`, `PURCHASE_ORDER_APPROVED`, and `PURCHASE_ORDER_CREATED` audit counts stayed `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-convert-to-bill.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 12: purchase order conversion evidence verification`.

## DEV-08C Part 12 - Purchase Order Conversion Evidence Verification Completed

- DEV-08C Part 12 read-only purchase order conversion evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERT_TO_BILL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: Verified.
- Key entity/status/amount result: `PO-000141`, safe id prefix `d6abea75`, status `BILLED`, converted bill safe prefix `f37c60b2`; exactly one converted bill exists, `BILL-000422`, status `DRAFT`, total and balance due `1150.0000`, supplier/branch/currency/notes/terms/totals/line account/tax/order mappings verified.
- Accounting/journal result: converted bill journal absent, purchase order journal absent, and marker/PO/bill journal count `0`.
- Audit result: expected `PURCHASE_ORDER_CONVERTED_TO_BILL` audit count `1`; `PURCHASE_ORDER_SENT`, `PURCHASE_ORDER_APPROVED`, and `PURCHASE_ORDER_CREATED` audit counts each `1`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent for the fixture.
- Temporary script cleanup result: no `*dev08c*` script exists under `apps/api/scripts`; Part 12 used no temporary script file.
- Exact next prompt title: `DEV-08C Part 13: converted purchase bill finalization preflight`.

## DEV-08C Part 13 - Converted Purchase Bill Finalization Preflight Completed

- DEV-08C Part 13 converted bill finalization preflight is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md).
- Mutation performed: no.
- Current PO/bill state: `PO-000141` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` is `DRAFT`, total and balance due `1150.0000`, `journalEntryId` absent, bill date `2026-05-26`, inventory posting mode `DIRECT_EXPENSE_OR_ASSET`.
- Finalization eligibility: matching fiscal period is `OPEN`; line account `111`, AP account `210`, and VAT receivable account `230` are active posting accounts; marker/PO/bill journal count `0`; purchase bill finalized audit count `0`.
- Expected finalization result: bill `DRAFT -> FINALIZED`, one posted journal with debit `111` `1000.0000`, debit `230` `150.0000`, credit `210` `1150.0000`, balanced debit/credit totals `1150.0000`, balance due remains `1150.0000`, PO remains `BILLED`, no inventory movement, no output/email/ZATCA.
- Required approval phrase: `I approve DEV-08C Part 14 local-only converted purchase bill finalization mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 14: approved local converted purchase bill finalization mutation`.

## DEV-08C Part 14 - Converted Purchase Bill Finalization Mutation Completed

- DEV-08C Part 14 approved local converted purchase bill finalization mutation evidence is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `PurchaseBillService.finalize(...)` once.
- Before/after entity state: `BILL-000422`, safe id prefix `f37c60b2`, changed `DRAFT -> FINALIZED`; `finalizedAt` changed absent -> present; `journalEntryId` changed absent -> present with journal safe prefix `2e82f16b`; total and balance due stayed `1150.0000`; `PO-000141` remained `BILLED`.
- Accounting/journal result: posted journal `JE-003156`, safe prefix `2e82f16b`, reference `BILL-000422`, total debit/credit `1150.0000`; lines Dr `111` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit result: `PURCHASE_BILL_FINALIZED` audit count changed `0 -> 1`; purchase order audit trail remained unchanged through `PURCHASE_ORDER_CONVERTED_TO_BILL`.
- Forbidden side-effect result: generated document/PDF/archive, email, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, ZATCA, production, beta, shared-target, hosted, and customer-data side effects absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-converted-purchase-bill-finalize.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 15: converted purchase bill finalization evidence verification`.

## DEV-08C Part 15 - Converted Purchase Bill Finalization Evidence Verification Completed

- DEV-08C Part 15 converted purchase bill finalization evidence verification is recorded in [docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: `PO-000141` remains `BILLED`; converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`; total and balance due remain `1150.0000`; posted journal `JE-003156` safe prefix `2e82f16b` is balanced at debit/credit `1150.0000`.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-converted-purchase-bill-finalize.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 16: purchase order close branch preflight`.

## DEV-08C Part 16 - Purchase Order Close Branch Preflight Completed

- DEV-08C Part 16 close branch preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_PREFLIGHT.md).
- Mutation performed: no.
- Main conversion PO protected: `PO-000141` safe prefix `d6abea75` remains `BILLED`, linked to converted bill safe prefix `f37c60b2`, and must not be reused for close.
- Planned close-branch mutation: after exact approval, create one separate fake local purchase order under marker `DEV08C-AP-20260526T000000` with suffix `CLOSE`, approve it, mark it sent, and close it; do not convert it to a bill or generate accounting/output side effects.
- Required approval phrase: `I approve DEV-08C Part 17 local-only purchase order close branch mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 17: approved local purchase order close branch mutation`.

## DEV-08C Part 17 - Purchase Order Close Branch Mutation Completed

- DEV-08C Part 17 approved local purchase order close branch mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls made: `PurchaseOrderService.create(...)` once, `PurchaseOrderService.approve(...)` once, `PurchaseOrderService.markSent(...)` once, and `PurchaseOrderService.close(...)` once.
- Before/after entity state: separate close-branch order `PO-000142`, safe prefix `d40b6716`, progressed `DRAFT -> APPROVED -> SENT -> CLOSED`; `approvedAt`, `sentAt`, and `closedAt` are present; total `1150.0000`; converted bill absent.
- Main conversion PO state: `PO-000141` safe prefix `d6abea75` remained `BILLED`, linked to converted bill safe prefix `f37c60b2` with bill status `FINALIZED`.
- Accounting/journal result: close-branch purchase bill count `0`, close-branch journal count `0`, converted bill absent.
- Audit result: close-branch `PURCHASE_ORDER_CREATED`, `PURCHASE_ORDER_APPROVED`, `PURCHASE_ORDER_SENT`, and `PURCHASE_ORDER_CLOSED` counts are each `1`; no conversion audit was created for the close branch.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-close-branch.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 18: purchase order close branch evidence verification`.

## DEV-08C Part 18 - Purchase Order Close Branch Evidence Verification Completed

- DEV-08C Part 18 purchase order close branch evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: main `PO-000141` safe prefix `d6abea75` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`, and close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED` with total `1150.0000`.
- Forbidden side-effect result: close-branch purchase bill, journal, generated document/PDF/archive, email, ZATCA path, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-purchase-order-close-branch.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 19: purchase order void branch preflight`.

## DEV-08C Part 19 - Purchase Order Void Branch Preflight Completed

- DEV-08C Part 19 void branch preflight is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_PREFLIGHT.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_PREFLIGHT.md).
- Mutation performed: no.
- Main/close branch protected: main `PO-000141` safe prefix `d6abea75` remains `BILLED` with converted bill `BILL-000422` `FINALIZED`; close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED`; neither should be reused for void.
- Planned void-branch mutation: after exact approval, create one separate fake local purchase order under marker `DEV08C-AP-20260526T000000` with suffix `VOID`, then void it while still `DRAFT`; do not approve, mark sent, close, convert, or generate accounting/output side effects.
- Required approval phrase: `I approve DEV-08C Part 20 local-only purchase order void branch mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08C Part 20: approved local purchase order void branch mutation`.

## DEV-08C Part 20 - Purchase Order Void Branch Mutation Completed

- DEV-08C Part 20 approved local purchase order void branch mutation evidence is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_MUTATION_EVIDENCE.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls made: `PurchaseOrderService.create(...)` once and `PurchaseOrderService.void(...)` once.
- Before/after entity state: separate void-branch order `PO-000143`, safe prefix `ffd4e3d7`, progressed `DRAFT -> VOIDED`; `voidedAt` is present; `approvedAt`, `sentAt`, and `closedAt` are absent; total `1150.0000`; converted bill absent.
- Protected branch state: main `PO-000141` safe prefix `d6abea75` remained `BILLED` with converted bill `BILL-000422` `FINALIZED`; close-branch `PO-000142` safe prefix `d40b6716` remained `CLOSED`.
- Accounting/journal result: void-branch purchase bill count `0`, void-branch journal count `0`, converted bill absent.
- Audit result: void-branch `PURCHASE_ORDER_CREATED` and `PURCHASE_ORDER_VOIDED` counts are each `1`; approve, mark-sent, close, and conversion audit actions were absent for the void branch.
- Forbidden side-effect result: generated document/PDF/archive, email, ZATCA, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup: `apps/api/scripts/dev08c-purchase-order-void-branch.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08c*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 21: purchase order void branch evidence verification`.

## DEV-08C Part 21 - Purchase Order Void Branch Evidence Verification Completed

- DEV-08C Part 21 purchase order void branch evidence verification is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_EVIDENCE_VERIFICATION.md](docs/development/DEV_08C_PURCHASE_ORDER_VOID_BRANCH_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Key entity/status/amount result: main `PO-000141` safe prefix `d6abea75` remains `BILLED`, converted bill `BILL-000422` safe prefix `f37c60b2` remains `FINALIZED`, close-branch `PO-000142` safe prefix `d40b6716` remains `CLOSED`, and void-branch `PO-000143` safe prefix `ffd4e3d7` remains `VOIDED` with total `1150.0000`.
- Forbidden side-effect result: void-branch purchase bill, journal, generated document/PDF/archive, email, ZATCA path, purchase receipt, stock movement, supplier payment, supplier refund, purchase debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, production, beta, shared-target, hosted, and customer-data side effects were absent.
- Temporary script cleanup result: `apps/api/scripts/dev08c-purchase-order-void-branch.tmp.ts` is absent; no `*dev08c*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08C Part 22: purchase order conversion branch closure`.

## DEV-08C Part 22 - Purchase Order Conversion Branch Closure Completed

- DEV-08C Part 22 purchase order conversion branch closure is recorded in [docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md](docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_CLOSURE.md).
- Mutation performed: no.
- DEV-08C proved purchase order fixture creation, approval, mark-sent, convert-to-bill, converted bill finalization, close branch, void branch, journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final entity state: main `PO-000141` safe prefix `d6abea75` is `BILLED`; converted bill `BILL-000422` safe prefix `f37c60b2` is `FINALIZED` with posted journal `JE-003156`; close-branch `PO-000142` safe prefix `d40b6716` is `CLOSED`; void-branch `PO-000143` safe prefix `ffd4e3d7` is `VOIDED`; supplier safe prefix `5ef871cd` remained the fake local supplier.
- Remaining AP gaps: supplier refund from supplier payment source, cash expenses, inventory-clearing bills and purchase receipt integration, AP output/PDF/archive/email with explicit approvals, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08D Part 1: supplier refund from supplier payment preflight`.

## DEV-08D Part 1 - Supplier Refund From Supplier Payment Preflight Completed

- DEV-08D Part 1 supplier refund from supplier payment preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `10d93efb Close DEV-08C purchase order conversion evidence`; local `HEAD` matched `origin/main`.
- Local-only/read-only proof: `apps/api/.env` database target classified as local `localhost` database `accounting`; local Docker Postgres and Redis were healthy; read-only SQL printed only safe prefixes/counts/statuses/amounts.
- Current source availability: no DEV-08D-marked posted supplier payment with unapplied amount exists; existing local posted unapplied payments are not DEV-08D-safe disposable sources.
- DEV-08 payment reference: `PAY-000006` safe prefix `622ad0b6` is `VOIDED`, amount `500.0000`, unapplied `200.0000`, posted supplier refund count `0`; it must not be reused as an active supplier refund source.
- Selected Part 2 mutation option: Option A, create a fresh local supplier payment refund source fixture only.
- Proposed marker: `DEV08D-AP-20260526T000000`.
- Future Part 2 fixture target: one fake local supplier plus one `POSTED` supplier payment for `500.0000` SAR, fully unapplied, no allocations, no purchase bill required.
- Expected future refund target after source verification: `SupplierRefundService.create(...)` once with `sourceType = SUPPLIER_PAYMENT`, refund amount `150.0000`, source payment unapplied `500.0000 -> 350.0000`, posted balanced refund journal Dr asset `112` / Cr AP `210`.
- Forbidden side-effect baseline for the marker: generated documents, email outbox/provider events, ZATCA metadata/submission logs, purchase receipts, stock movements, and cleanup/delete audits all `0`.
- Required approval phrase: `I approve DEV-08D Part 2 local-only supplier payment refund source fixture mutation under marker DEV08D-AP-20260526T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 2: approved local supplier payment refund source fixture mutation`.

## DEV-08D Part 2 - Supplier Payment Refund Source Fixture Mutation Completed

- DEV-08D Part 2 supplier payment refund source fixture mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service calls: `ContactService.create(...)` once and `SupplierPaymentService.create(...)` once.
- Supplier evidence: safe prefix `a5d3ece3`, active `SUPPLIER`, marker-bearing fake local supplier.
- Supplier payment source: `PAY-000007`, safe prefix `4b9c42b1`, status `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, void reversal journal absent.
- Journal/accounting result: `JE-000058`, safe prefix `da62af82`, `POSTED` and balanced, with Dr AP account `210` `500.0000` and Cr paid-through asset account `112` `500.0000`.
- Allocation/refund result: direct supplier payment allocations `0`, supplier payment unapplied allocations `0`, supplier refunds for source payment `0`.
- Audit result: `Contact:CREATE` count `1`; `SupplierPayment:SUPPLIER_PAYMENT_CREATED` count `1`; supplier payment void and supplier refund audit counts `0`.
- Forbidden side-effect result: marker-scoped supplier refunds, purchase bills, purchase orders, purchase debit notes, purchase receipts, stock movements, cash expenses, generated documents, email outbox rows, email provider events, and cleanup/delete audits all `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-payment-source.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 3: supplier payment refund source fixture evidence verification`.

## DEV-08D Part 3 - Supplier Payment Refund Source Fixture Evidence Verification Completed

- DEV-08D Part 3 read-only evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_REFUND_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Source payment status/amount result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, void reversal journal absent.
- Journal/accounting result: `JE-000058`, safe prefix `da62af82`, remained `POSTED` and balanced at debit/credit `500.0000`, with Dr AP account `210` and Cr paid-through asset account `112`.
- Allocation/refund result: direct supplier payment allocations `0`, supplier payment unapplied allocations `0`, supplier refunds for the source payment `0`.
- Audit result: `Contact:CREATE` count `1`; `SupplierPayment:SUPPLIER_PAYMENT_CREATED` count `1`; supplier refund and supplier payment void audit counts `0`.
- Forbidden side-effect result: generated documents, email outbox rows, email provider events, purchase bills, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits all `0`.
- Temporary script cleanup result: no `*dev08d*` temporary script exists under `apps/api/scripts`; Part 3 used no temporary script file.
- Exact next prompt title: `DEV-08D Part 4: supplier refund from supplier payment preflight`.

## DEV-08D Part 4 - Supplier Refund From Supplier Payment Preflight Completed

- DEV-08D Part 4 read-only supplier refund creation preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CREATION_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CREATION_PREFLIGHT.md).
- Runtime mutation performed: no.
- Source payment eligibility: `PAY-000007`, safe prefix `4b9c42b1`, is `POSTED`, `SAR`, amount paid `500.0000`, unapplied amount `500.0000`, same DEV-08D supplier safe prefix `a5d3ece3`, no void reversal journal, no allocations, and no existing supplier refunds.
- Planned supplier refund amount: `150.0000`; planned source payment unapplied after refund: `350.0000`.
- Planned received-into account: `112`, safe prefix `32ab6f4d`, active posting asset account; AP account `210`, safe prefix `883ea9a6`, active posting liability account.
- Expected accounting result: one posted supplier refund journal balanced at debit/credit `150.0000`, Dr asset `112`, Cr AP `210`; source payment journal `JE-000058` remains posted.
- Expected audit result: one `SupplierRefund:CREATE` audit only; no supplier refund void, supplier payment void, allocation/reversal, cleanup/delete, or login/browser audit path.
- Forbidden side-effect baseline: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits are all `0`.
- Required approval phrase: `I approve DEV-08D Part 5 local-only supplier refund from supplier payment mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source with refund amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 5: approved local supplier refund from supplier payment mutation`.

## DEV-08D Part 5 - Supplier Refund From Supplier Payment Mutation Completed

- DEV-08D Part 5 local-only supplier refund mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierRefundService.create(...)` once; `SupplierRefundService.void(...)`, `SupplierPaymentService.void(...)`, and supplier payment creation were not called.
- Supplier refund result: `SRF-000004`, safe prefix `dc8c4c9a`, `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment `PAY-000007`, source debit note absent.
- Source payment before/after: `PAY-000007` remained `POSTED`; amount paid stayed `500.0000`; unapplied amount decreased `500.0000 -> 350.0000`.
- Allocation result: direct supplier payment allocations `0`; active supplier payment unapplied allocations `0`.
- Journal/accounting result: refund journal `JE-000059`, safe prefix `4439a2ff`, `POSTED` and balanced at debit/credit `150.0000`, with Dr asset account `112` and Cr AP account `210`; source payment journal `JE-000058` remained posted and unreversed.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_CREATED` count `1`; no supplier refund void, supplier payment void, or cleanup/delete audit for the source payment/refund.
- Forbidden side-effect result: generated documents, email outbox rows, email provider events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, and cleanup/delete audits all `0`; ZATCA was not invoked.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-refund-from-payment.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 6: supplier refund from supplier payment evidence verification`.

## DEV-08D Part 6 - Supplier Refund From Supplier Payment Evidence Verification Completed

- DEV-08D Part 6 read-only supplier refund evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Refund status/amount/source: `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment safe prefix `4b9c42b1`, source debit note absent, void reversal journal absent.
- Source payment result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `350.0000`, void reversal journal absent.
- Journal/accounting result: refund journal `JE-000059`, safe prefix `4439a2ff`, remained `POSTED` and balanced at debit/credit `150.0000`, with Dr asset account `112` and Cr AP account `210`; source payment journal `JE-000058` remained posted and unreversed.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_CREATED` count `1`; no supplier refund void, supplier payment void, duplicate supplier refund create, allocation/reversal, cleanup/delete, or login/browser audit path.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts all absent.
- Exact next prompt title: `DEV-08D Part 7: supplier payment void blocker preflight`.

## DEV-08D Part 7 - Supplier Payment Void Blocker Preflight Completed

- DEV-08D Part 7 read-only supplier payment void blocker preflight is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Blocker condition confirmed: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED` with amount paid `500.0000`, unapplied amount `350.0000`, and no void reversal journal; posted supplier refund count for the payment is `1`.
- Posted refund blocker: `SRF-000004`, safe prefix `dc8c4c9a`, remains `POSTED` for `150.0000`, source payment safe prefix `4b9c42b1`, and no refund void reversal journal.
- Code behavior confirmed: `SupplierPaymentService.void(...)` counts posted supplier refunds for the payment and throws `Cannot void supplier payment with posted supplier refunds. Void refunds first.` before payment status update or payment reversal journal creation.
- Expected Part 8 negative check: call `SupplierPaymentService.void(...)` once, expect the posted-refund blocker, and verify no payment/refund status, unapplied amount, journal, allocation, audit void, or forbidden side-effect change.
- Required approval phrase: `I approve DEV-08D Part 8 local-only supplier payment void blocker negative check under marker DEV08D-AP-20260526T000000 while supplier refund remains posted. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 8: approved local supplier payment void blocker negative check`.

## DEV-08D Part 8 - Supplier Payment Void Blocker Negative Check Completed

- DEV-08D Part 8 local-only supplier payment void blocker negative check evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation result: expected blocked call; no state mutation.
- Exact service call made: `SupplierPaymentService.void(...)` once; the call threw the expected posted-refund blocker and was not retried.
- Blocker error observed: `Cannot void supplier payment with posted supplier refunds. Void refunds first.`
- Source payment after check: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, unapplied amount `350.0000`, `voidedAt` absent, and void reversal journal absent.
- Supplier refund after check: `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, and void reversal journal absent.
- Journal/accounting non-effect: payment journal `JE-000058` and refund journal `JE-000059` remained `POSTED`; organization journal count remained `59`; no reversal journal was created.
- Audit/side-effect non-effect: supplier payment void audit `0`, supplier refund void audit `0`, generated documents `0`, email rows/events `0`, purchase orders/receipts `0`, stock movements `0`, cash expenses `0`, purchase debit notes `0`, cleanup/delete audits `0`, and ZATCA was not invoked.
- Temporary script cleanup result: `apps/api/scripts/dev08d-payment-void-blocker.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 9: supplier payment void blocker evidence verification`.

## DEV-08D Part 9 - Supplier Payment Void Blocker Evidence Verification Completed

- DEV-08D Part 9 read-only supplier payment void blocker evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Payment/refund remain posted: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, unapplied amount `350.0000`, void reversal journal absent; `SRF-000004`, safe prefix `dc8c4c9a`, remained `POSTED`, source payment safe prefix `4b9c42b1`, void reversal journal absent.
- No side effects: journal count remained `59`; no payment reversal journal, supplier payment void audit, supplier refund void audit, allocation mutation, generated documents, email rows/events, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, or temporary DEV-08D scripts were found.
- Exact next prompt title: `DEV-08D Part 10: supplier refund void preflight`.

## DEV-08D Part 10 - Supplier Refund Void Preflight Completed

- DEV-08D Part 10 read-only supplier refund void preflight is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current refund state: `SRF-000004`, safe prefix `dc8c4c9a`, remains `POSTED`, amount `150.0000`, source type `SUPPLIER_PAYMENT`, source payment safe prefix `4b9c42b1`, refund journal `JE-000059` `POSTED`, and void reversal journal absent.
- Current source payment state: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED`, amount paid `500.0000`, unapplied amount `350.0000`, and void reversal journal absent.
- Expected refund void effect: `SupplierRefundService.void(...)` once should set refund `VOIDED`, create a posted reversal journal, mark original refund journal `REVERSED`, restore source payment unapplied amount `350.0000 -> 500.0000`, and leave source payment `POSTED`.
- Expected accounting result: reversal journal balanced at debit/credit `150.0000`, reversing Dr asset `112` / Cr AP `210` into Dr AP `210` / Cr asset `112`; journal count should increase by `1`.
- Expected audit/side-effect result: one `SupplierRefund:SUPPLIER_REFUND_VOIDED` audit; no supplier payment void, allocations, generated documents, email, ZATCA, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete, or temporary script side effects.
- Required approval phrase: `I approve DEV-08D Part 11 local-only supplier refund void mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier refund from payment amount 150.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 11: approved local supplier refund void mutation`.

## DEV-08D Part 11 - Supplier Refund Void Mutation Completed

- DEV-08D Part 11 local-only supplier refund void mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierRefundService.void(...)` once; supplier refund creation and supplier payment void were not called.
- Refund before/after: `SRF-000004`, safe prefix `dc8c4c9a`, changed `POSTED -> VOIDED`; `voidedAt` present; original refund journal `JE-000059` changed `POSTED -> REVERSED`.
- Source payment restored: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`; amount paid stayed `500.0000`; unapplied amount restored `350.0000 -> 500.0000`; source payment void reversal journal absent.
- Reversal journal result: `JE-000060`, safe prefix `6360eb40`, `POSTED` and balanced at debit/credit `150.0000`, with Dr AP account `210` and Cr asset account `112`; journal count `59 -> 60`.
- Audit result: `SupplierRefund:SUPPLIER_REFUND_VOIDED` count `1`; supplier payment void audit `0`.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and ZATCA all absent.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-refund-void.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 12: supplier refund void evidence verification`.

## DEV-08D Part 12 - Supplier Refund Void Evidence Verification Completed

- DEV-08D Part 12 read-only supplier refund void evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_REFUND_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Refund void result: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; `voidedAt` present; original refund journal `JE-000059` remained `REVERSED`; refund void reversal journal `JE-000060`, safe prefix `6360eb40`, remained `POSTED` and balanced at debit/credit `150.0000`.
- Source payment restoration result: `PAY-000007`, safe prefix `4b9c42b1`, remained `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, source payment journal `JE-000058` `POSTED`, and source payment void reversal journal absent.
- Journal/audit/side-effect result: reversal journal lines are Dr AP `210` / Cr asset `112`; supplier refund create audit `1`, supplier refund void audit `1`, supplier payment void audit `0`; generated documents, email rows/events, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts absent.
- Exact next prompt title: `DEV-08D Part 13: supplier payment void after refund void preflight`.

## DEV-08D Part 13 - Supplier Payment Void After Refund Void Preflight Completed

- DEV-08D Part 13 read-only supplier payment void after refund void preflight is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_PREFLIGHT.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Payment voidability: `PAY-000007`, safe prefix `4b9c42b1`, remains `POSTED`, amount paid `500.0000`, unapplied amount `500.0000`, payment journal `JE-000058` `POSTED`, and void reversal journal absent.
- Blocker clearance: posted supplier refunds for source payment `0`; direct allocations `0`; active unapplied allocations `0`; allocated non-finalized bills `0`.
- Historical refund state: `SRF-000004`, safe prefix `dc8c4c9a`, remains `VOIDED`; refund void reversal journal `JE-000060` remains `POSTED`.
- Expected payment void effect: `SupplierPaymentService.void(...)` once should set payment `VOIDED`, create a posted reversal journal, mark original payment journal `REVERSED`, leave refund `VOIDED`, and create no bill/allocation changes.
- Expected accounting result: payment void reversal journal balanced at debit/credit `500.0000`, with Dr asset `112` and Cr AP `210`; journal count should increase `60 -> 61`.
- Required approval phrase: `I approve DEV-08D Part 14 local-only supplier payment void mutation after refund void under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source amount 500.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08D Part 14: approved local supplier payment void after refund void mutation`.

## DEV-08D Part 14 - Supplier Payment Void After Refund Void Mutation Completed

- DEV-08D Part 14 local-only supplier payment void after refund void mutation evidence is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Exact service call made: `SupplierPaymentService.void(...)` once; supplier refund create/void was not called.
- Payment before/after: `PAY-000007`, safe prefix `4b9c42b1`, changed `POSTED -> VOIDED`; `voidedAt` present; amount paid and unapplied amount remained `500.0000`; original payment journal `JE-000058` changed `POSTED -> REVERSED`.
- Historical refund remains voided: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; refund void reversal journal `JE-000060` remained `POSTED`; posted supplier refund count for payment remained `0`.
- Reversal journal result: payment void reversal journal `JE-000061`, safe prefix `389e8daf`, `POSTED` and balanced at debit/credit `500.0000`, with Dr asset account `112` and Cr AP account `210`; journal count `60 -> 61`.
- Audit result: `SupplierPayment:SUPPLIER_PAYMENT_VOIDED` count `1`; no new supplier refund audit.
- Forbidden side-effect result: generated documents, email rows/events, purchase orders, purchase receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and ZATCA all absent.
- Temporary script cleanup result: `apps/api/scripts/dev08d-supplier-payment-void-after-refund.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08d*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08D Part 15: supplier payment void after refund void evidence verification`.

## DEV-08D Part 15 - Supplier Payment Void After Refund Void Evidence Verification Completed

- DEV-08D Part 15 read-only supplier payment void evidence verification is recorded in [docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08D_SUPPLIER_PAYMENT_VOID_AFTER_REFUND_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Payment final state: `PAY-000007`, safe prefix `4b9c42b1`, remained `VOIDED`; `voidedAt` present; amount paid and unapplied amount remained `500.0000`; original payment journal `JE-000058` remained `REVERSED`.
- Refund final state: `SRF-000004`, safe prefix `dc8c4c9a`, remained `VOIDED`; original refund journal `JE-000059` remained `REVERSED`; refund void reversal journal `JE-000060` remained `POSTED`; posted supplier refund count for payment remained `0`.
- Journal/audit/side-effect result: payment void reversal journal `JE-000061`, safe prefix `389e8daf`, remained `POSTED` and balanced at debit/credit `500.0000`, with Dr asset account `112` and Cr AP account `210`; supplier payment created/voided and supplier refund created/voided audits each remained exactly `1`; DEV-08D source/marker-scoped generated documents, email rows/events, ZATCA artifacts, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and temporary DEV-08D scripts remained absent.
- Exact next prompt title: `DEV-08D Part 16: supplier refund from supplier payment closure`.

## DEV-08D Part 16 - Supplier Refund From Supplier Payment Closure Completed

- DEV-08D Part 16 supplier refund from supplier payment closure is recorded in [docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md](docs/development/DEV_08D_SUPPLIER_REFUND_FROM_PAYMENT_CLOSURE.md).
- Mutation performed: no.
- DEV-08D proved the local supplier refund from supplier payment branch: source payment fixture creation, supplier refund creation, payment unapplied decrement/restoration, supplier payment void blocker while refund was posted, supplier refund void/reversal, and supplier payment void/reversal after the blocker cleared.
- Final source payment state: `PAY-000007`, safe prefix `4b9c42b1`, `VOIDED`; `voidedAt` present; amount paid and unapplied amount `500.0000`; original payment journal `JE-000058` `REVERSED`; payment void reversal journal `JE-000061` `POSTED`.
- Final supplier refund state: `SRF-000004`, safe prefix `dc8c4c9a`, `VOIDED`; amount `150.0000`; original refund journal `JE-000059` `REVERSED`; refund void reversal journal `JE-000060` `POSTED`; posted supplier refunds for payment `0`.
- Final accounting/audit/side-effect findings: payment void reversal `JE-000061` balanced at debit/credit `500.0000`; refund void reversal `JE-000060` balanced at debit/credit `150.0000`; supplier payment created/voided and supplier refund created/voided audits each `1`; source/marker-scoped generated documents, email rows/events, ZATCA artifacts, purchase orders/receipts, stock movements, cash expenses, purchase debit notes, cleanup/delete audits, and DEV-08D temporary scripts absent.
- Remaining AP gaps: cash expense lifecycle, inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths beyond DEV-08D, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title, recommended: `DEV-08E Part 1: cash expense lifecycle preflight`.

## Next Thread Prompt

`DEV-08E Part 1: cash expense lifecycle preflight`

## DEV-08E Part 1 - Cash Expense Lifecycle Preflight Completed

- DEV-08E Part 1 cash expense lifecycle preflight is recorded in [docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_PREFLIGHT.md](docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `50df109c Close DEV-08D supplier refund payment evidence`; local `HEAD` matched `origin/main`.
- Cash expense lifecycle summary: create immediately posts one `POSTED` cash expense, creates a posted journal, and writes `CashExpense:CREATE`; the schema has `DRAFT`, but the current create/UI path does not reach it; void changes `POSTED -> VOIDED`, creates/reuses one posted reversal journal, marks the original journal `REVERSED`, and writes `CashExpense:VOID`.
- Accounting summary: VAT cash expenses debit the line expense/cost/asset account, debit VAT receivable account `230` when tax applies, and credit the paid-through asset account; void reversal swaps the original debit/credit lines.
- Output/PDF/archive summary: `pdf` and `generate-pdf` can render and archive generated documents; DEV-08E Part 1 did not call PDF-data, PDF, generate-PDF, archive, export, or download paths.
- Selected Part 2 mutation option: Option A, create one posted local cash expense fixture only, no void.
- Proposed marker: `DEV08E-AP-20260526T000000`.
- Proposed local fixture: fake local AP-ready organization safe prefix `db69e5a8`, no contact, no branch, paid-through `112 Bank Account`, expense account `511 General Expenses`, purchase VAT `15%`, planned total `1150.0000`.
- Required approval phrase: `I approve DEV-08E Part 2 local-only cash expense fixture creation mutation under marker DEV08E-AP-20260526T000000. No production, no beta, no customer data.`
- Expected audit result: exactly one `CashExpense:CREATE` / `CASH_EXPENSE_CREATED` audit for the fixture, no void/delete/login audit.
- Expected forbidden side effects: marker-scoped generated documents, email rows/events, ZATCA artifacts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements/inventory entries, cleanup/delete audits, and temporary scripts remain `0` or absent.
- Exact next prompt title: `DEV-08E Part 2: approved local cash expense fixture creation mutation`.

## Next Thread Prompt

`DEV-08E Part 2: approved local cash expense fixture creation mutation`

## DEV-08E Part 2 - Cash Expense Fixture Creation Completed

- DEV-08E Part 2 local-only cash expense fixture creation evidence is recorded in [docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Option A phrase received and checked before mutation.
- Cash expense result: `EXP-000002`, safe prefix `74886497`, `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, contact absent, branch absent, paid-through account `112`.
- Journal result: `JE-000062`, safe prefix `a2aa8290`, `POSTED`, balanced debit/credit `1150.0000`; lines were Dr `511` `1000.0000`, Dr `230` `150.0000`, Cr `112` `1150.0000`.
- Audit result: one `CashExpense:CASH_EXPENSE_CREATED` audit; no cash expense void/delete audit and no login/browser audit-writing flow.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits all remained `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08e-cash-expense-fixture.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`; script was not staged.
- Exact next prompt title: `DEV-08E Part 3: cash expense fixture evidence verification`.

## Next Thread Prompt

`DEV-08E Part 3: cash expense fixture evidence verification`

## DEV-08E Part 3 - Cash Expense Fixture Evidence Verification Completed

- DEV-08E Part 3 read-only cash expense fixture evidence verification is recorded in [docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08E_CASH_EXPENSE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: `Verified`.
- Cash expense result: `EXP-000002`, safe prefix `74886497`, remained `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, paid-through account `112`, contact absent, branch absent, void reversal journal absent.
- Journal/accounting result: `JE-000062`, safe prefix `a2aa8290`, remained `POSTED` and balanced debit/credit `1150.0000`; lines remained Dr `511` `1000.0000`, Dr `230` `150.0000`, Cr `112` `1150.0000`; no reversal journal exists.
- Audit result: cash expense create audit `1`; cash expense void audit `0`; cash expense delete audit `0`; no login/browser audit-writing flow.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: Part 2 mutation script absent; no Part 3 read-only script was created; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08E Part 4: cash expense void preflight`.

## Next Thread Prompt

`DEV-08E Part 4: cash expense void preflight`

## DEV-08E Part 4 - Cash Expense Void Preflight Completed

- DEV-08E Part 4 read-only cash expense void preflight is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_PREFLIGHT.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current cash expense state: `EXP-000002`, safe prefix `74886497`, remains `POSTED`, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`, paid-through account `112`, void reversal journal absent, and `voidedAt` absent.
- Current journal state: `JE-000062`, safe prefix `a2aa8290`, remains `POSTED` and balanced at debit/credit `1150.0000`; no reversed-by journal exists.
- Current fiscal/sequence baseline: fiscal period `2026` is `OPEN` for `2026-05-27`; the `JOURNAL_ENTRY` sequence next number is `63`, so the expected reversal journal is `JE-000063` if no sequence changes before Part 5.
- Expected void effect: one future `CashExpenseService.void(...)` call should change the cash expense `POSTED -> VOIDED`, set `voidedAt`, create a posted reversal journal, and mark original journal `JE-000062` as `REVERSED`.
- Expected reversal accounting: Dr paid-through asset account `112` `1150.0000`, Cr expense account `511` `1000.0000`, and Cr VAT receivable account `230` `150.0000`.
- Expected audit/side-effect result: one `CashExpense:CASH_EXPENSE_VOIDED` audit; no duplicate create, no delete, no login/browser audit path, and no generated-document, email, ZATCA, supplier payment/refund, purchase bill/debit note/order/receipt, stock movement, or cleanup/delete side effect.
- Required exact Part 5 approval phrase: `I approve DEV-08E Part 5 local-only cash expense void mutation under marker DEV08E-AP-20260526T000000 for cash expense EXP-000002 total 1150.0000. No production, no beta, no customer data.`
- Placeholder approval with `<EXPENSE_NUMBER>` and `<TOTAL>` is not sufficient.
- Exact next prompt title: `DEV-08E Part 5: approved local cash expense void mutation`.

## Next Thread Prompt

`DEV-08E Part 5: approved local cash expense void mutation`

## DEV-08E Part 5 - Cash Expense Void Mutation Completed

- DEV-08E Part 5 local-only cash expense void mutation evidence is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 5 phrase received and checked before mutation.
- Exact service call made: `CashExpenseService.void(...)` once; cash expense create/delete, PDF/archive/export/download, email, ZATCA, supplier payment/refund, purchase bill/debit note/order/receipt, inventory/stock, cleanup, login/browser, production, beta, and customer-data paths were not run.
- Cash expense before/after: `EXP-000002`, safe prefix `74886497`, changed `POSTED -> VOIDED`; `voidedAt` is present; subtotal `1000.0000`, tax `150.0000`, total `1150.0000` remained unchanged.
- Journal/accounting result: original journal `JE-000062`, safe prefix `a2aa8290`, changed `POSTED -> REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, is `POSTED` and balanced at debit/credit `1150.0000`; reversal lines are Cr `511` `1000.0000`, Cr `230` `150.0000`, and Dr `112` `1150.0000`.
- Audit result: cash expense create audit remained `1`; cash expense void audit became `1`; cash expense delete audit remained `0`; no login/browser audit-writing flow ran.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08e-cash-expense-void.tmp.ts` was removed; `Test-Path` returned `False`; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`; script was not staged.
- Exact next prompt title: `DEV-08E Part 6: cash expense void evidence verification`.

## Next Thread Prompt

`DEV-08E Part 6: cash expense void evidence verification`

## DEV-08E Part 6 - Cash Expense Void Evidence Verification Completed

- DEV-08E Part 6 read-only cash expense void evidence verification is recorded in [docs/development/DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08E_CASH_EXPENSE_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: `Verified`.
- Cash expense final state: `EXP-000002`, safe prefix `74886497`, remained `VOIDED`; `voidedAt` is present; subtotal `1000.0000`, tax `150.0000`, total `1150.0000` remained unchanged.
- Journal/accounting result: original journal `JE-000062`, safe prefix `a2aa8290`, remained `REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, remained `POSTED` and balanced at debit/credit `1150.0000`; reversal lines exactly reverse the original journal lines.
- Audit result: cash expense create audit `1`, cash expense void audit `1`, cash expense delete audit `0`; no login/browser audit-writing flow ran.
- Forbidden side-effect result: generated documents, email rows/events, ZATCA metadata/submission logs/signed drafts, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, and cleanup/delete audits remained `0`.
- Temporary script cleanup result: Part 5 mutation script absent; no Part 6 read-only script was created; no `*dev08e*`/`*cash-expense*` temp script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08E Part 7: cash expense lifecycle closure`.

## Next Thread Prompt

`DEV-08E Part 7: cash expense lifecycle closure`

## DEV-08E Part 7 - Cash Expense Lifecycle Closure Completed

- DEV-08E Part 7 cash expense lifecycle closure is recorded in [docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md](docs/development/DEV_08E_CASH_EXPENSE_LIFECYCLE_CLOSURE.md).
- Mutation performed: no.
- DEV-08E proved local cash expense creation/posting, original journal behavior, cash expense void/reversal, reversal journal behavior, audit behavior, and forbidden output/email/ZATCA non-effects.
- Final cash expense state: `EXP-000002`, safe prefix `74886497`, `VOIDED`, `voidedAt` present, subtotal `1000.0000`, tax `150.0000`, total `1150.0000`.
- Final journal/accounting state: original journal `JE-000062`, safe prefix `a2aa8290`, `REVERSED`; void reversal journal `JE-000063`, safe prefix `391169e6`, `POSTED`, balanced at debit/credit `1150.0000`; reversal lines exactly reverse original lines.
- Final audit/side-effect state: cash expense create audit `1`, void audit `1`, delete audit `0`; generated documents, PDF/archive/export/download, email, ZATCA, supplier payments/refunds, purchase bills/debit notes/orders/receipts, stock movements, cleanup/delete audits, and DEV-08E temp scripts absent.
- Remaining AP gaps: inventory-clearing purchase bills, purchase receipt/inventory integration, AP output/PDF/archive, AP email, browser-authenticated AP UI/API QA, repeated/idempotency and blocker paths beyond DEV-08E, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08F Part 1: inventory-clearing purchase bill preflight`.

## Next Thread Prompt

`DEV-08F Part 1: inventory-clearing purchase bill preflight`

## DEV-08F Part 1 - Inventory-Clearing Purchase Bill Preflight Completed

- DEV-08F Part 1 read-only inventory-clearing purchase bill preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_PREFLIGHT.md).
- Mutation performed: no.
- Latest commit inspected: `9bae1e3a Close DEV-08E cash expense evidence`; local `HEAD` matched `origin/main`.
- Local-only proof: root `.env` and `apps/api/.env` database targets were classified without printing secrets as local PostgreSQL on port `5432`; read-only Prisma checks used a local-target guard and sanitized output only.
- Repo state: pre-existing untracked marketing/graphify paths remain untouched and unstaged; no DEV-08E/DEV-08F temporary scripts exist under `apps/api/scripts`.
- Purchase bill behavior summary: `INVENTORY_CLEARING` mode is draft-save capable only when inventory accounting is enabled, valuation is `MOVING_AVERAGE`, receipt posting mode is `PREVIEW_ONLY`, at least one tracked item line exists, inventory clearing account is mapped/active/posting, and clearing is separate from AP `210` and inventory asset. Finalization posts Dr clearing for tracked lines, Dr VAT `230` when taxed, and Cr AP `210`; void reverses the bill journal without stock movement mutation.
- Purchase receipt integration summary: receipts can be bill/order/standalone sourced, create `POSTED` operational receipt rows and inbound stock movements, and do not post GL on creation. Asset posting is an explicit manual journal action for posted receipts linked to finalized `INVENTORY_CLEARING` bills; active asset posting blocks receipt void until reversed.
- Selected Part 2 mutation option: Option A, reuse selected fake local AP/inventory-ready org safe prefix `db69e5a8`; create one future draft `INVENTORY_CLEARING` purchase bill only, with no inventory settings mutation.
- Proposed marker: `DEV08F-AP-20260527T000000`.
- Expected future accounting: bill finalization Dr inventory clearing `240` `1000.0000`, Dr VAT receivable `230` `150.0000`, Cr AP `210` `1150.0000`; later receipt asset posting Dr inventory asset `130` `1000.0000`, Cr inventory clearing `240` `1000.0000`.
- Forbidden side-effect baseline: DEV-08F marker purchase bills, receipts, stock movements, contacts, items, warehouses, generated documents, email rows/events, and cleanup/delete audit counts are `0`; no ZATCA command was run.
- Required exact Part 2 approval phrase: `I approve DEV-08F Part 2 local-only inventory-clearing purchase bill fixture creation mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 2: approved local inventory-clearing purchase bill fixture creation mutation`.

## Next Thread Prompt

`DEV-08F Part 2: approved local inventory-clearing purchase bill fixture creation mutation`

## DEV-08F Part 2 - Inventory-Clearing Purchase Bill Fixture Creation Completed

- DEV-08F Part 2 local-only inventory-clearing purchase bill fixture mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 2 phrase received and checked before mutation.
- Purchase bill result: `BILL-000009`, safe prefix `04b3f131`, `DRAFT`, `INVENTORY_CLEARING`, bill date `2026-05-28`, due date `2026-06-27`, subtotal `1000.0000`, VAT `150.0000`, total and balance due `1150.0000`.
- Source result: selected org safe prefix `db69e5a8`, supplier safe prefix `287aec77`, tracked item safe prefix `175a7c7f`, line account `511`, tax rate safe prefix `172417be`.
- Accounting result: no purchase bill journal, reversal journal, purchase receipt, stock movement, or generated document exists for the bill.
- Audit result: one `PURCHASE_BILL_CREATED` audit for the bill.
- Forbidden side-effect result: purchase receipts, stock movements, source-scoped journals, generated documents, purchase orders, purchase debit notes, supplier payment allocations, supplier unapplied allocations, supplier refunds from bill payments, and marker cash expenses are all absent.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`.

## Next Thread Prompt

`DEV-08F Part 3: inventory-clearing purchase bill fixture evidence verification`

## DEV-08F Part 3 - Inventory-Clearing Purchase Bill Fixture Evidence Verification Completed

- DEV-08F Part 3 read-only fixture verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Purchase bill state: `BILL-000009`, safe prefix `04b3f131`, remained `DRAFT`, `INVENTORY_CLEARING`, total and balance due `1150.0000`, with no journal or reversal journal.
- Line state: line safe prefix `cb3d385a`, tracked item safe prefix `175a7c7f`, account `511`, tax rate safe prefix `172417be`, quantity `10.0000`, unit price `100.0000`, VAT `150.0000`.
- Read-only preview result: `canFinalize: true`, no blocking reasons, balanced preview Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit/side-effect result: one `PURCHASE_BILL_CREATED` audit; purchase receipts, stock movements, source-scoped journals, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations remained absent.
- Temporary script cleanup result: no Part 3 temporary script was created; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`.

## Next Thread Prompt

`DEV-08F Part 4: inventory-clearing purchase bill finalization preflight`

## DEV-08F Part 4 - Inventory-Clearing Purchase Bill Finalization Preflight Completed

- DEV-08F Part 4 finalization preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current bill state: `BILL-000009`, safe prefix `04b3f131`, remains `DRAFT`, `INVENTORY_CLEARING`, bill date `2026-05-28`, total `1150.0000`, no journal, no receipt.
- Read-only finalization readiness: `canFinalize: true`, no blocking reasons, balanced preview Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected next journal number is `JE-000064` if no intervening sequence write occurs before Part 5.
- Current side-effect baseline: purchase receipts, stock movements, source-scoped journals, and generated documents for the bill are absent.
- Required exact Part 5 approval phrase: `I approve DEV-08F Part 5 local-only inventory-clearing purchase bill finalization mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 5: approved local inventory-clearing purchase bill finalization mutation`.

## Next Thread Prompt

`DEV-08F Part 5: approved local inventory-clearing purchase bill finalization mutation`

## DEV-08F Part 5 - Inventory-Clearing Purchase Bill Finalization Completed

- DEV-08F Part 5 local-only finalization mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 5 phrase received and checked before mutation.
- Exact service call made: `PurchaseBillService.finalize(...)` once.
- Purchase bill result: `BILL-000009`, safe prefix `04b3f131`, changed `DRAFT -> FINALIZED`; `finalizedAt` present; balance due `1150.0000`; reversal journal absent.
- Journal result: `JE-000064`, safe prefix `3fff12bc`, `POSTED`, balanced debit/credit `1150.0000`; lines are Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit result: `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` are present for the bill.
- Forbidden side-effect result: purchase receipts, stock movements, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations for the bill remain absent.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 6: inventory-clearing purchase bill finalization evidence verification`.

## Next Thread Prompt

`DEV-08F Part 6: inventory-clearing purchase bill finalization evidence verification`

## DEV-08F Part 6 - Inventory-Clearing Purchase Bill Finalization Evidence Verification Completed

- DEV-08F Part 6 read-only finalization verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Purchase bill state: `BILL-000009`, safe prefix `04b3f131`, remained `FINALIZED`, `INVENTORY_CLEARING`, total and balance due `1150.0000`; reversal journal absent; linked receipts `0`.
- Journal state: `JE-000064`, safe prefix `3fff12bc`, remained `POSTED`, unreversed, balanced debit/credit `1150.0000`; lines are Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`.
- Audit/side-effect result: `PURCHASE_BILL_CREATED` and `PURCHASE_BILL_FINALIZED` remain present; purchase receipts, stock movements, generated documents, purchase debit notes, supplier payment allocations, and supplier unapplied allocations remain absent.
- Temporary script cleanup result: no Part 6 temporary script was created; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 7: purchase receipt from inventory-clearing bill preflight`.

## Next Thread Prompt

`DEV-08F Part 7: purchase receipt from inventory-clearing bill preflight`

## DEV-08F Part 7 - Purchase Receipt From Inventory-Clearing Bill Preflight Completed

- DEV-08F Part 7 receipt preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_PREFLIGHT.md).
- Runtime mutation performed: no.
- Source bill state: `BILL-000009`, safe prefix `04b3f131`, remained `FINALIZED`, `INVENTORY_CLEARING`; source line safe prefix `cb3d385a`, item safe prefix `175a7c7f`, quantity `10.0000`, unit price `100.0000`.
- Receiving readiness: `NOT_STARTED`; source line received quantity `0.0000`, remaining quantity `10.0000`, inventory tracking `true`.
- Matching readiness: `NOT_RECEIVED`; receipt count `0`, receipt value `0.0000`.
- Warehouse/sequence baseline: default warehouse safe prefix `197fac56`; expected next receipt number `PRC-000004` if no intervening sequence write occurs before Part 8.
- Required exact Part 8 approval phrase: `I approve DEV-08F Part 8 local-only purchase receipt from inventory-clearing bill mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 8: approved local purchase receipt from inventory-clearing bill mutation`.

## Next Thread Prompt

`DEV-08F Part 8: approved local purchase receipt from inventory-clearing bill mutation`

## DEV-08F Part 8 - Purchase Receipt From Inventory-Clearing Bill Completed

- DEV-08F Part 8 local-only purchase receipt mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 8 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.create(...)` once.
- Purchase receipt result: `PRC-000004`, safe prefix `993adc10`, `POSTED`, linked to purchase bill safe prefix `04b3f131`, supplier safe prefix `287aec77`, warehouse safe prefix `197fac56`, receipt date `2026-05-28`.
- Receipt line result: safe prefix `61b842a9`, item safe prefix `175a7c7f`, purchase bill line safe prefix `cb3d385a`, quantity `10.0000`, unit cost `100.0000`.
- Stock movement result: safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, unit cost `100.0000`, total cost `1000.0000`, reference type `PurchaseReceipt`.
- Accounting/side-effect result: purchase receipt asset journal absent; purchase bill journal count remained `1`; generated documents for the receipt remained `0`.
- Audit result: one `PURCHASE_RECEIPT_CREATED` audit for the receipt.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 9: purchase receipt evidence verification`.

## Next Thread Prompt

`DEV-08F Part 9: purchase receipt evidence verification`

## DEV-08F Part 9 - Purchase Receipt Evidence Verification Completed

- DEV-08F Part 9 read-only receipt verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_FROM_BILL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, linked to purchase bill safe prefix `04b3f131`, with no inventory asset journal or reversal journal.
- Receipt line/stock state: line safe prefix `61b842a9`, item safe prefix `175a7c7f`, quantity `10.0000`, unit cost `100.0000`; stock movement safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, total cost `1000.0000`; void stock movement absent.
- Receiving/matching state: receiving status `COMPLETE`; matching status `FULLY_RECEIVED`; receipt value and matched bill value `1000.0000`; value difference `0.0000`.
- Read-only asset posting preview: `canPost: true`, no blocking reasons, balanced preview Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit/side-effect result: one `PURCHASE_RECEIPT_CREATED` audit; asset journals, asset reversal journals, void stock movements, and generated documents remained absent.
- Exact next prompt title: `DEV-08F Part 10: purchase receipt inventory asset posting preflight`.

## Next Thread Prompt

`DEV-08F Part 10: purchase receipt inventory asset posting preflight`

## DEV-08F Part 10 - Purchase Receipt Inventory Asset Posting Preflight Completed

- DEV-08F Part 10 asset posting preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, with no inventory asset journal or reversal journal.
- Read-only asset posting readiness: `canPost: true`, no blocking reasons, balanced preview Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected next journal number `JE-000065` if no intervening sequence write occurs before Part 11.
- Current side-effect baseline: asset journals `0`, asset reversal journals `0`, stock movements for receipt `1`, void stock movements `0`.
- Required exact Part 11 approval phrase: `I approve DEV-08F Part 11 local-only purchase receipt inventory asset posting mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 11: approved local purchase receipt inventory asset posting mutation`.

## Next Thread Prompt

`DEV-08F Part 11: approved local purchase receipt inventory asset posting mutation`

## DEV-08F Part 11 - Purchase Receipt Inventory Asset Posting Completed

- DEV-08F Part 11 local-only asset posting mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 11 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.postInventoryAsset(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent; `inventoryAssetPostedAt` present.
- Journal result: `JE-000065`, safe prefix `75a6c7c3`, `POSTED`, balanced debit/credit `1000.0000`; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit result: `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED` are present for the receipt.
- Side-effect result: stock movements for the receipt remained `1`; void stock movements `0`; generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 12: purchase receipt inventory asset posting evidence verification`.

## Next Thread Prompt

`DEV-08F Part 12: purchase receipt inventory asset posting evidence verification`

## DEV-08F Part 12 - Purchase Receipt Inventory Asset Posting Evidence Verification Completed

- DEV-08F Part 12 read-only asset posting verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_POSTING_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`, with inventory asset journal safe prefix `75a6c7c3`; reversal journal absent; `inventoryAssetPostedAt` present; `inventoryAssetReversedAt` absent.
- Journal state: `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED`, unreversed, balanced debit/credit `1000.0000`; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Audit/side-effect result: `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED` remain present; asset reversal journals, void stock movements, and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 13: purchase receipt void blocker preflight`.

## Next Thread Prompt

`DEV-08F Part 13: purchase receipt void blocker preflight`

## DEV-08F Part 13 - Purchase Receipt Void Blocker Preflight Completed

- DEV-08F Part 13 receipt void blocker preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`, with active inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remains `POSTED`, unreversed.
- Expected Part 14 blocker: `Reverse inventory asset posting before voiding this purchase receipt.`
- Current side-effect baseline: asset journals `1`, asset reversal journals `0`, void stock movements `0`, receipt void audits `0`.
- Required exact Part 14 approval phrase: `I approve DEV-08F Part 14 local-only purchase receipt void blocker negative check under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 14: approved local purchase receipt void blocker negative check`.

## Next Thread Prompt

`DEV-08F Part 14: approved local purchase receipt void blocker negative check`

## DEV-08F Part 14 - Purchase Receipt Void Blocker Negative Check Completed

- DEV-08F Part 14 void blocker negative check evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Mutation attempted: yes, local-only negative check.
- Approval phrase status: exact Part 14 phrase received and checked before the negative check.
- Exact service call made: `PurchaseReceiptService.void(...)` once.
- Expected blocker observed: `Reverse inventory asset posting before voiding this purchase receipt.`
- State after blocked call: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED` and unreversed; reversal journal absent; `voidedAt` absent.
- Side-effect result: void stock movements `0`, receipt void audits `0`, asset reversal journals `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 15: purchase receipt void blocker evidence verification`.

## Next Thread Prompt

`DEV-08F Part 15: purchase receipt void blocker evidence verification`

## DEV-08F Part 15 - Purchase Receipt Void Blocker Evidence Verification Completed

- DEV-08F Part 15 read-only void blocker verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; `voidedAt` absent; inventory asset journal safe prefix `75a6c7c3`; reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remained `POSTED`, unreversed.
- Audit/side-effect result: receipt audits remain `PURCHASE_RECEIPT_CREATED` and `PURCHASE_RECEIPT_ASSET_POSTED`; void stock movements, receipt void audits, asset reversal journals, and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 16: purchase receipt inventory asset reversal preflight`.

## Next Thread Prompt

`DEV-08F Part 16: purchase receipt inventory asset reversal preflight`

## DEV-08F Part 16 - Purchase Receipt Inventory Asset Reversal Preflight Completed

- DEV-08F Part 16 asset reversal preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`, with active inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal absent.
- Asset journal state: `JE-000065`, safe prefix `75a6c7c3`, remains `POSTED`, unreversed; lines are Dr `130` `1000.0000`, Cr `240` `1000.0000`.
- Expected reversal: `JE-000066` if no intervening sequence write occurs; expected lines Cr `130` `1000.0000`, Dr `240` `1000.0000`.
- Fiscal/side-effect baseline: fiscal period `2026` is `OPEN`; asset reversal journals `0`, void stock movements `0`, receipt void audits `0`.
- Required exact Part 17 approval phrase: `I approve DEV-08F Part 17 local-only purchase receipt inventory asset reversal mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 17: approved local purchase receipt inventory asset reversal mutation`.

## Next Thread Prompt

`DEV-08F Part 17: approved local purchase receipt inventory asset reversal mutation`

## DEV-08F Part 17 - Purchase Receipt Inventory Asset Reversal Completed

- DEV-08F Part 17 local-only asset reversal mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 17 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.reverseInventoryAsset(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal safe prefix `71495866`; `inventoryAssetReversedAt` present.
- Journal result: original asset journal `JE-000065`, safe prefix `75a6c7c3`, changed `POSTED -> REVERSED`; reversal journal `JE-000066`, safe prefix `71495866`, is `POSTED`, reverses `JE-000065`, and is balanced debit/credit `1000.0000` with Cr `130` `1000.0000`, Dr `240` `1000.0000`.
- Audit result: `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, and `PURCHASE_RECEIPT_ASSET_REVERSED` are present for the receipt.
- Side-effect result: void stock movements `0`; generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 18: purchase receipt inventory asset reversal evidence verification`.

## Next Thread Prompt

`DEV-08F Part 18: purchase receipt inventory asset reversal evidence verification`

## DEV-08F Part 18 - Purchase Receipt Inventory Asset Reversal Evidence Verification Completed

- DEV-08F Part 18 read-only asset reversal verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_ASSET_REVERSAL_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `POSTED`; inventory asset journal safe prefix `75a6c7c3`; inventory asset reversal journal safe prefix `71495866`; `inventoryAssetReversedAt` present; `voidedAt` absent.
- Journal state: original `JE-000065`, safe prefix `75a6c7c3`, remained `REVERSED`; reversal `JE-000066`, safe prefix `71495866`, remained `POSTED`, balanced debit/credit `1000.0000`.
- Audit/side-effect result: receipt created/asset-posted/asset-reversed audits remain present; void stock movements and generated documents remain absent.
- Exact next prompt title: `DEV-08F Part 19: purchase receipt void preflight`.

## Next Thread Prompt

`DEV-08F Part 19: purchase receipt void preflight`

## DEV-08F Part 19 - Purchase Receipt Void Preflight Completed

- DEV-08F Part 19 receipt void preflight is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_PREFLIGHT.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current receipt state: `PRC-000004`, safe prefix `993adc10`, remains `POSTED`; asset journal `JE-000065` is `REVERSED`; asset reversal journal `JE-000066` is `POSTED`; `voidedAt` absent.
- Stock sufficiency: item safe prefix `175a7c7f`, warehouse safe prefix `197fac56`, current quantity `23.0000`, required void quantity `10.0000`, sufficient `true`; expected void stock movement type `ADJUSTMENT_OUT`.
- Current side-effect baseline: void stock movements `0`, receipt void audits `0`, generated documents `0`.
- Required exact Part 20 approval phrase: `I approve DEV-08F Part 20 local-only purchase receipt void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 20: approved local purchase receipt void mutation`.

## Next Thread Prompt

`DEV-08F Part 20: approved local purchase receipt void mutation`

## DEV-08F Part 20 - Purchase Receipt Void Completed

- DEV-08F Part 20 local-only purchase receipt void mutation evidence is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 20 phrase received and checked before mutation.
- Exact service call made: `PurchaseReceiptService.void(...)` once.
- Receipt result: `PRC-000004`, safe prefix `993adc10`, changed `POSTED -> VOIDED`; `voidedAt` present; asset journal `JE-000065` remained `REVERSED`; asset reversal journal `JE-000066` remained `POSTED`.
- Void stock movement result: safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, unit cost `100.0000`, total cost `1000.0000`, reference type `PurchaseReceiptVoid`.
- Audit result: `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, `PURCHASE_RECEIPT_ASSET_REVERSED`, and `PURCHASE_RECEIPT_VOIDED` are present for the receipt.
- Side-effect result: generated documents `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 21: purchase receipt void evidence verification`.

## Next Thread Prompt

`DEV-08F Part 21: purchase receipt void evidence verification`

## DEV-08F Part 21 - Purchase Receipt Void Evidence Verification Completed

- DEV-08F Part 21 read-only receipt void verification is recorded in [docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_PURCHASE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Receipt state: `PRC-000004`, safe prefix `993adc10`, remained `VOIDED`; `voidedAt` present; asset journal `JE-000065` remained `REVERSED`; asset reversal journal `JE-000066` remained `POSTED`.
- Void stock movement state: safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, total cost `1000.0000`, linked to receipt line safe prefix `61b842a9`.
- Audit/side-effect result: receipt created/asset-posted/asset-reversed/voided audits remain present; non-voided receipts for bill `0`; generated documents `0`.
- Exact next prompt title: `DEV-08F Part 22: inventory-clearing purchase bill void preflight`.

## Next Thread Prompt

`DEV-08F Part 22: inventory-clearing purchase bill void preflight`

## DEV-08F Part 22 - Inventory-Clearing Purchase Bill Void Preflight Completed

- DEV-08F Part 22 bill void preflight is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_PREFLIGHT.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Current bill state: `BILL-000009`, safe prefix `04b3f131`, remains `FINALIZED`, `INVENTORY_CLEARING`, balance due `1150.0000`; original journal `JE-000064`, safe prefix `3fff12bc`, remains `POSTED`; bill reversal journal absent.
- Receipt state: linked receipt `PRC-000004`, safe prefix `993adc10`, is `VOIDED`; non-voided receipts for bill `0`.
- Void readiness: active supplier payment allocations `0`, active purchase debit note allocations `0`, active supplier unapplied allocations `0`, generated documents for bill `0`.
- Fiscal/sequence baseline: fiscal period `2026` is `OPEN`; expected bill reversal journal `JE-000067` if no intervening sequence write occurs before Part 23.
- Required exact Part 23 approval phrase: `I approve DEV-08F Part 23 local-only inventory-clearing purchase bill void mutation under marker DEV08F-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08F Part 23: approved local inventory-clearing purchase bill void mutation`.

## Next Thread Prompt

`DEV-08F Part 23: approved local inventory-clearing purchase bill void mutation`

## DEV-08F Part 23 - Inventory-Clearing Purchase Bill Void Completed

- DEV-08F Part 23 local-only purchase bill void mutation evidence is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 23 phrase received and checked before mutation.
- Exact service call made: `PurchaseBillService.void(...)` once.
- Bill result: `BILL-000009`, safe prefix `04b3f131`, changed `FINALIZED -> VOIDED`; balance due `0.0000`; linked receipt `PRC-000004` remained `VOIDED`.
- Journal result: original bill journal `JE-000064`, safe prefix `3fff12bc`, changed `POSTED -> REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, is `POSTED`, reverses `JE-000064`, and is balanced debit/credit `1150.0000` with Dr `210` `1150.0000`, Cr `230` `150.0000`, Cr `240` `1000.0000`.
- Audit result: `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `PURCHASE_BILL_VOIDED` are present for the bill.
- Side-effect result: non-voided receipts `0`; generated documents `0`; direct bill stock movements `0`.
- Temporary script cleanup result: no DEV-08F temporary script file was created or staged; no `*dev08f*` script exists under `apps/api/scripts`.
- Exact next prompt title: `DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`.

## Next Thread Prompt

`DEV-08F Part 24: inventory-clearing purchase bill void evidence verification`

## DEV-08F Part 24 - Inventory-Clearing Purchase Bill Void Evidence Verification Completed

- DEV-08F Part 24 read-only bill void verification is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Verification conclusion: verified.
- Bill state: `BILL-000009`, safe prefix `04b3f131`, remained `VOIDED`, balance due `0.0000`; linked receipt `PRC-000004`, safe prefix `993adc10`, remained `VOIDED`.
- Journal state: original bill journal `JE-000064`, safe prefix `3fff12bc`, remained `REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, remained `POSTED`, balanced debit/credit `1150.0000`.
- Audit/side-effect result: bill create/finalize/void audits and receipt create/asset-post/asset-reverse/void audits remain present; non-voided receipts, generated documents, and direct bill stock movements remain absent.
- Exact next prompt title: `DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`.

## Next Thread Prompt

`DEV-08F Part 25: inventory-clearing purchase bill and receipt closure`

## DEV-08F Part 25 - Inventory-Clearing Purchase Bill And Receipt Closure Completed

- DEV-08F Part 25 closure is recorded in [docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md](docs/development/DEV_08F_INVENTORY_CLEARING_PURCHASE_BILL_RECEIPT_CLOSURE.md).
- Mutation performed in Part 25: no.
- Closure conclusion: DEV-08F is closed for the local-only inventory-clearing purchase bill plus linked purchase receipt manual asset posting/reversal/void branch.
- Final bill state: `BILL-000009`, safe prefix `04b3f131`, `VOIDED`, `INVENTORY_CLEARING`, balance due `0.0000`; original bill journal `JE-000064`, safe prefix `3fff12bc`, is `REVERSED`; bill reversal journal `JE-000067`, safe prefix `30f40b4c`, is `POSTED`.
- Final receipt state: `PRC-000004`, safe prefix `993adc10`, `VOIDED`; original receipt asset journal `JE-000065`, safe prefix `75a6c7c3`, is `REVERSED`; asset reversal journal `JE-000066`, safe prefix `71495866`, is `POSTED`.
- Final stock movement result: original receipt movement safe prefix `a7708ad8`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `10.0000`, total cost `1000.0000`; void movement safe prefix `426c6ba0`, type `ADJUSTMENT_OUT`, quantity `10.0000`, total cost `1000.0000`.
- Final accounting findings: bill finalization posted Dr `240` `1000.0000`, Dr `230` `150.0000`, Cr `210` `1150.0000`; bill void reversed that with Dr `210` `1150.0000`, Cr `230` `150.0000`, Cr `240` `1000.0000`; receipt asset posting posted Dr `130` `1000.0000`, Cr `240` `1000.0000`; asset reversal posted Dr `240` `1000.0000`, Cr `130` `1000.0000`.
- Final audit findings: bill audits include `PURCHASE_BILL_CREATED`, `PURCHASE_BILL_FINALIZED`, and `PURCHASE_BILL_VOIDED`; receipt audits include `PURCHASE_RECEIPT_CREATED`, `PURCHASE_RECEIPT_ASSET_POSTED`, `PURCHASE_RECEIPT_ASSET_REVERSED`, and `PURCHASE_RECEIPT_VOIDED`.
- Forbidden side-effect findings: generated documents, direct bill stock movements, non-voided receipts, source-scoped email, ZATCA, PDF/archive/export/download, login/browser, production, beta, hosted/shared-target, and customer-data side effects remained absent in the DEV-08F evidence.
- Remaining AP gaps: purchase-order receipt matching, standalone receipt accounting, over/under receipt and variance handling, AP PDF/archive/output routes, AP email, authenticated UI/API QA, repeated/idempotency paths, fiscal-period blockers, permission edge cases, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`.

## Next Thread Prompt

`DEV-08G Part 1: purchase receipt and inventory integration hardening preflight`

## DEV-08G Part 1 - Purchase Receipt Inventory Hardening Preflight Completed

- DEV-08G Part 1 preflight is recorded in [docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_HARDENING_PREFLIGHT.md](docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_HARDENING_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `218e445c Close DEV-08F inventory clearing purchase bill evidence`; local `HEAD` matched `origin/main` at `218e445c1daec564d88a3a509710d13a31288c9f`.
- Local-only/no-mutation proof: no database connection, service import, Prisma execution, login/browser flow, fixture creation, purchase order/receipt/stock/journal mutation, output, email, ZATCA, deploy, migration, seed/reset/delete, environment/provider/schema change, production, beta, hosted/shared-target, or customer-data action ran.
- Code paths inspected: purchase receipt create/prepare-lines/remaining-quantity/receiving-status/receipt-matching/accounting-preview/post-asset/reverse-asset/void, purchase receiving status controller, receipt DTOs, purchase order create/approve/mark-sent/convert behavior, stock movement rules, Prisma receipt/order schema, and relevant web purchase receipt/order surfaces.
- Selected DEV-08G sequence: PO source fixture, partial receipt `4.0000`, full receipt `6.0000`, over-receipt blocker, PO-only asset-posting blocker, void `6.0000`, void `4.0000`, standalone receipt `3.0000`, standalone asset-posting blocker, standalone void, closure.
- Selected marker: `DEV08G-AP-20260527T000000`.
- Required exact Part 2 approval phrase: `I approve DEV-08G Part 2 local-only purchase order receipt source fixture mutation under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 2: approved local purchase order receipt source fixture mutation`.

## Next Thread Prompt

`DEV-08G Part 2: approved local purchase order receipt source fixture mutation`

## DEV-08G Part 2 - Purchase Order Receipt Source Fixture Completed

- DEV-08G Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Approval phrase status: exact Part 2 phrase received and checked before mutation.
- Local target proof: Docker Postgres/Redis were local and healthy; `apps/api/.env` classified as `localhost:5432/accounting`; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service calls made: `ContactService.create(...)` once, `ItemService.create(...)` once, `PurchaseOrderService.create(...)` once, and `PurchaseOrderService.approve(...)` once. `WarehouseService.create(...)` and `PurchaseOrderService.markSent(...)` were not called.
- Fixture result: supplier safe prefix `f5deec9a`, item safe prefix `3b8d7650`, reused active warehouse safe prefix `197fac56`, and purchase order `PO-000003` safe prefix `a3efc2e4` with final status `APPROVED`.
- PO line result: safe prefix `22f17076`, quantity `10.0000`, unit price `100.0000`, tax rate `15.0000`, total PO amount `1150.0000`.
- Audit result: `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, and `PurchaseOrder:PURCHASE_ORDER_APPROVED` each occurred once for the fixture.
- Forbidden side-effect result: purchase receipts, purchase bills, stock movements, journal entries, generated documents, email outbox/provider rows, supplier payments, supplier refunds, purchase debit notes, and cash expenses remained `0` for the marker/source.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part2-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 3: purchase order receipt source fixture evidence verification`.

## Next Thread Prompt

`DEV-08G Part 3: purchase order receipt source fixture evidence verification`

## DEV-08G Part 3 - Purchase Order Receipt Source Fixture Verification Completed

- DEV-08G Part 3 read-only verification is recorded in [docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PURCHASE_ORDER_RECEIPT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `ce9e202d Create DEV-08G purchase order receipt source fixture`; local `HEAD` matched `origin/main` at `ce9e202decde601db32e73a2738439c0f1161956`.
- Local target proof: Docker Postgres/Redis were local and healthy; `apps/api/.env` classified as `localhost:5432/accounting`; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Purchase order state: marker-scoped `PO-000003` safe prefix `a3efc2e4`, status `APPROVED`, converted bill absent, subtotal `1000.0000`, tax total `150.0000`, total `1150.0000`.
- Fixture state: supplier safe prefix `f5deec9a` active `SUPPLIER`; item safe prefix `3b8d7650` `ACTIVE` with inventory tracking; warehouse safe prefix `197fac56` `ACTIVE`; PO line safe prefix `22f17076` quantity `10.0000`, unit price `100.0000`, purchase tax `15.0000`, asset account code `111`.
- Receiving and matching result: receiving `NOT_STARTED`, received quantity `0.0000`, remaining quantity `10.0000`; receipt matching `NOT_RECEIVED` with the expected no-linked-bill warning.
- Forbidden side-effect result: purchase receipts, purchase receipt lines, stock movements, directly tied journals, generated documents, email outbox/provider rows, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and ZATCA fixture audit actions all remained `0`.
- Audit result: fixture-scoped audit actions remain limited to `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, and `PurchaseOrder:PURCHASE_ORDER_APPROVED`.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`; Part 3 used inline read-only Prisma verification and did not create a script file.
- Exact next prompt title: `DEV-08G Part 4: partial purchase receipt from purchase order preflight`.

## Next Thread Prompt

`DEV-08G Part 4: partial purchase receipt from purchase order preflight`

## DEV-08G Part 4 - Partial Purchase Order Receipt Preflight Completed

- DEV-08G Part 4 read-only preflight is recorded in [docs/development/DEV_08G_PARTIAL_PO_RECEIPT_PREFLIGHT.md](docs/development/DEV_08G_PARTIAL_PO_RECEIPT_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `792c9237 Verify DEV-08G purchase order receipt source fixture`; local `HEAD` matched `origin/main` at `792c9237600f040f64812f704af9221056c495e6`.
- Source purchase order state: marker-scoped `PO-000003` safe prefix `a3efc2e4`, status `APPROVED`, converted bill absent, total `1150.0000`.
- Source line state: line safe prefix `22f17076`, item safe prefix `3b8d7650`, quantity `10.0000`, unit price `100.0000`, purchase tax `15.0000`, asset account code `111`; item remains `ACTIVE` and inventory-tracked.
- Warehouse state: active warehouse safe prefix `197fac56`, code `MAIN`.
- Receiving baseline: purchase receipt count `0`, non-voided receipt line count `0`, received quantity `0.0000`, remaining quantity `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Selected Part 5 quantity: `4.0000`; expected post-mutation received quantity `4.0000`, remaining quantity `6.0000`, receiving `PARTIAL`, matching `PARTIALLY_RECEIVED`.
- Expected Part 5 receipt behavior: receipt status `POSTED`; stock movement type `PURCHASE_RECEIPT_PLACEHOLDER`; no journal or generated output; PO-only asset posting remains blocked because no finalized linked inventory-clearing bill exists.
- Baselines: stock movements `0`, directly tied journals `0`, generated documents/output `0`, email outbox/provider rows `0`, ZATCA fixture audit actions `0`, existing fixture audit actions `4`, purchase receipt audit actions `0`.
- Required exact Part 5 approval phrase: `I approve DEV-08G Part 5 local-only partial purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 4.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 5: approved local partial purchase receipt from purchase order mutation`.

## Next Thread Prompt

`DEV-08G Part 5: approved local partial purchase receipt from purchase order mutation`

## DEV-08G Part 5 - Partial Purchase Order Receipt Mutation Completed

- DEV-08G Part 5 local-only mutation evidence is recorded in [docs/development/DEV_08G_PARTIAL_PO_RECEIPT_MUTATION_EVIDENCE.md](docs/development/DEV_08G_PARTIAL_PO_RECEIPT_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Latest commit inspected: `f7f939d0 Plan DEV-08G partial purchase order receipt`; local `HEAD` matched `origin/main` at `f7f939d01778095db7b21ab2e53043a6d447eaa1`.
- Approval phrase status: exact Part 5 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Local target proof: runner classified `apps/api/.env` as `localhost:5432/accounting` before importing write-capable services; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service call: exactly one `PurchaseReceiptService.create(...)`; no asset posting, reverse, void, purchase bill, document, email, ZATCA, migration, seed/reset/delete, deploy, or login/browser flow ran.
- Receipt result: `PRC-000005` safe prefix `1f412d79`, status `POSTED`, linked to PO safe prefix `a3efc2e4`, no linked bill, no asset journal, no reversal journal.
- Receipt line result: safe prefix `17eecfdc`, quantity `4.0000`, unit cost `100.0000`, source PO line safe prefix `22f17076`.
- Stock movement result: safe prefix `39a7350e`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `4.0000`, reference type `PurchaseReceipt`, reference safe prefix `1f412d79`.
- Receiving and matching result: receiving `PARTIAL`, received `4.0000`, remaining `6.0000`; receipt matching `PARTIALLY_RECEIVED`; expected no-linked-bill warning present.
- Side-effect result: directly tied journals, generated documents/output, email outbox/provider rows, and ZATCA fixture audit actions remained `0`; receipt audit action `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` occurred once.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part5-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 6: partial purchase receipt evidence verification`.

## Next Thread Prompt

`DEV-08G Part 6: partial purchase receipt evidence verification`

## DEV-08G Part 6 - Partial Purchase Order Receipt Verification Completed

- DEV-08G Part 6 read-only verification is recorded in [docs/development/DEV_08G_PARTIAL_PO_RECEIPT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PARTIAL_PO_RECEIPT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `9b73a689 Create DEV-08G partial purchase order receipt`; local `HEAD` matched `origin/main` at `9b73a6897077d8824577ef118a82ea4d589e4c40`.
- Receipt state: `PRC-000005` safe prefix `1f412d79`, status `POSTED`, linked to PO safe prefix `a3efc2e4`, no linked bill, no asset journal, no reversal journal.
- Receipt line and stock movement: line safe prefix `17eecfdc`, quantity `4.0000`, unit cost `100.0000`; stock movement safe prefix `39a7350e`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `4.0000`, no void stock movement.
- Receiving and matching result: service receiving `PARTIAL`, received `4.0000`, remaining `6.0000`; receipt matching `PARTIALLY_RECEIVED`.
- Side-effect result: directly tied journals, generated documents/output, email outbox/provider rows, and ZATCA fixture audit actions remained `0`.
- Audit result: fixture actions are prior `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, `PurchaseOrder:PURCHASE_ORDER_APPROVED`, plus `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` once.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 7: remaining purchase receipt from purchase order preflight`.

## Next Thread Prompt

`DEV-08G Part 7: remaining purchase receipt from purchase order preflight`

## DEV-08G Part 7 - Remaining Purchase Order Receipt Preflight Completed

- DEV-08G Part 7 read-only preflight is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_PREFLIGHT.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `28fd0592 Verify DEV-08G partial purchase order receipt`; local `HEAD` matched `origin/main` at `28fd0592bd77ebfbc9010ba2692605f4f0fa3bcf`.
- Current source state: `PO-000003` safe prefix `a3efc2e4`, status `APPROVED`, source line safe prefix `22f17076`, total source quantity `10.0000`.
- Current partial receipt state: `PRC-000005` safe prefix `1f412d79`, status `POSTED`, quantity `4.0000`, stock movement safe prefix `39a7350e`, no asset journal, no void stock movement.
- Current receiving and matching result: received `4.0000`, remaining `6.0000`, receiving `PARTIAL`, matching `PARTIALLY_RECEIVED`.
- Selected Part 8 quantity: `6.0000`; expected post-mutation received `10.0000`, remaining `0.0000`, receiving `COMPLETE`, matching `FULLY_RECEIVED`.
- Expected Part 8 behavior: receipt status `POSTED`, stock movement type `PURCHASE_RECEIPT_PLACEHOLDER`, no journal on create, no asset posting on create, no generated output/email/ZATCA delta.
- Baselines: purchase receipts `1`, stock movements `1`, directly tied journals `0`, generated documents/output `0`, email rows/events `0`, ZATCA fixture audit actions `0`, fixture audit actions `5`.
- Required exact Part 8 approval phrase: `I approve DEV-08G Part 8 local-only remaining purchase receipt from purchase order mutation under marker DEV08G-AP-20260527T000000 for quantity 6.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 8: approved local remaining purchase receipt from purchase order mutation`.

## Next Thread Prompt

`DEV-08G Part 8: approved local remaining purchase receipt from purchase order mutation`

## DEV-08G Part 8 - Remaining Purchase Order Receipt Mutation Completed

- DEV-08G Part 8 local-only mutation evidence is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_MUTATION_EVIDENCE.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Latest commit inspected: `5aa3bf7f Plan DEV-08G remaining purchase order receipt`; local `HEAD` matched `origin/main` at `5aa3bf7febe11525c287cace0adb168397cfca3f`.
- Approval phrase status: exact Part 8 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Local target proof: runner classified `apps/api/.env` as `localhost:5432/accounting` before importing write-capable services; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service call: exactly one `PurchaseReceiptService.create(...)`; no asset posting, reverse, void, purchase bill, document, email, ZATCA, migration, seed/reset/delete, deploy, or login/browser flow ran.
- Receipt result: `PRC-000006` safe prefix `942e4907`, status `POSTED`, linked to PO safe prefix `a3efc2e4`, no linked bill, no asset journal, no reversal journal.
- Receipt line result: safe prefix `452f75a6`, quantity `6.0000`, unit cost `100.0000`, source PO line safe prefix `22f17076`.
- Stock movement result: safe prefix `e0ffd378`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `6.0000`, reference type `PurchaseReceipt`, reference safe prefix `942e4907`.
- Receiving and matching result: receiving `COMPLETE`, received `10.0000`, remaining `0.0000`; receipt matching `FULLY_RECEIVED`; matching receipt count `2`.
- Side-effect result: directly tied journals, generated documents/output, email outbox/provider rows, and ZATCA fixture audit actions remained `0`; new receipt audit action `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` occurred once.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part8-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 9: remaining purchase receipt evidence verification`.

## Next Thread Prompt

`DEV-08G Part 9: remaining purchase receipt evidence verification`

## DEV-08G Part 9 - Remaining Purchase Order Receipt Verification Completed

- DEV-08G Part 9 read-only verification is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `a3c12b99 Create DEV-08G remaining purchase order receipt`; local `HEAD` matched `origin/main` at `a3c12b990fa1548e748882449e3f31a361230cb2`.
- Receipt states: `PRC-000005` safe prefix `1f412d79` remains `POSTED` quantity `4.0000`; `PRC-000006` safe prefix `942e4907` remains `POSTED` quantity `6.0000`.
- Stock movement states: `39a7350e` quantity `4.0000` and `e0ffd378` quantity `6.0000`, both `PURCHASE_RECEIPT_PLACEHOLDER`, no void stock movements.
- Receiving and matching result: total received `10.0000`, remaining `0.0000`, receiving `COMPLETE`, matching `FULLY_RECEIVED`, matching receipt count `2`.
- Side-effect result: no purchase bill, directly tied journal, generated document/output, email outbox/provider row, or ZATCA fixture audit action exists.
- Audit result: fixture actions are prior `Contact:CREATE`, `Item:CREATE`, `PurchaseOrder:PURCHASE_ORDER_CREATED`, `PurchaseOrder:PURCHASE_ORDER_APPROVED`, plus two `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` actions.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 10: purchase order over-receipt blocker preflight`.

## Next Thread Prompt

`DEV-08G Part 10: purchase order over-receipt blocker preflight`

## DEV-08G Part 10 - Purchase Order Over-Receipt Blocker Preflight Completed

- DEV-08G Part 10 read-only preflight is recorded in [docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_PREFLIGHT.md](docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `55ff99ea Verify DEV-08G remaining purchase order receipt`; local `HEAD` matched `origin/main` at `55ff99ea4e11ae978e7ad62909299b5b6cac5a92`.
- Current PO state: `PO-000003` safe prefix `a3efc2e4`, source line safe prefix `22f17076`, source quantity `10.0000`, received `10.0000`, remaining `0.0000`.
- Current receiving and matching result: receiving `COMPLETE`, matching `FULLY_RECEIVED`.
- Expected negative check: future requested excess quantity `1.0000` should fail with `Receipt quantity cannot exceed the remaining source quantity.` before receipt or stock movement creation.
- Baselines: purchase receipts `2`, stock movements `2`, directly tied journals `0`, generated documents/output `0`, marker receipt audit actions `2`.
- Required exact Part 11 approval phrase: `I approve DEV-08G Part 11 local-only purchase order over-receipt blocker negative check under marker DEV08G-AP-20260527T000000 for excess quantity 1.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 11: approved local purchase order over-receipt blocker negative check`.

## Next Thread Prompt

`DEV-08G Part 11: approved local purchase order over-receipt blocker negative check`

## DEV-08G Part 11 - Purchase Order Over-Receipt Blocker Negative Check Completed

- DEV-08G Part 11 negative-check evidence is recorded in [docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Expected failure performed: yes, local-only.
- Latest commit inspected: `9e883445 Plan DEV-08G purchase order over receipt blocker`; local `HEAD` matched `origin/main` at `9e883445c2602b16dadd2af1ca44cd08090ac58c`.
- Approval phrase status: exact Part 11 phrase received in the up-front DEV-08G approval bundle and checked before the service call.
- Local target proof: runner classified `apps/api/.env` as `localhost:5432/accounting` before importing write-capable services; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service call attempted: exactly one `PurchaseReceiptService.create(...)` for excess quantity `1.0000`.
- Expected blocker observed: `Receipt quantity cannot exceed the remaining source quantity.`
- State unchanged proof: purchase receipts `2 -> 2`, stock movements `2 -> 2`, directly tied journals `0 -> 0`, generated documents `0 -> 0`, organization receipt-create audit count `6 -> 6`, email rows/events `0`, ZATCA fixture audit actions `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part11-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 12: purchase order over-receipt blocker evidence verification`.

## Next Thread Prompt

`DEV-08G Part 12: purchase order over-receipt blocker evidence verification`

## DEV-08G Part 12 - Purchase Order Over-Receipt Blocker Verification Completed

- DEV-08G Part 12 read-only verification is recorded in [docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PO_OVER_RECEIPT_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `2c342c1a Check DEV-08G purchase order over receipt blocker`; local `HEAD` matched `origin/main` at `2c342c1a98e440db5b3acb18f407cecbd6387b73`.
- Verification conclusion: the over-receipt blocker preserved state; no excess Part 11 receipt exists.
- Source state: PO safe prefix `a3efc2e4`, line safe prefix `22f17076`, received `10.0000`, remaining `0.0000`, receiving `COMPLETE`, matching `FULLY_RECEIVED`.
- Receipt state: exactly `PRC-000005` quantity `4.0000` and `PRC-000006` quantity `6.0000` remain posted.
- Unchanged counts: purchase receipts `2`, stock movements `2`, directly tied journals `0`, generated documents/output `0`, email rows/events `0`, ZATCA fixture audit actions `0`, marker receipt-created audit actions `2`.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 13: purchase-order receipt asset-posting blocker preflight`.

## Next Thread Prompt

`DEV-08G Part 13: purchase-order receipt asset-posting blocker preflight`

## DEV-08G Part 13 - Purchase Order Receipt Asset Posting Blocker Preflight Completed

- DEV-08G Part 13 read-only preflight is recorded in [docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_PREFLIGHT.md](docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `9b688f90 Verify DEV-08G purchase order over receipt blocker`; local `HEAD` matched `origin/main` at `9b688f9031d5a0d91afefcf07a77b69513ad6218`.
- Selected receipt: `PRC-000005` safe prefix `1f412d79`, status `POSTED`, linked to PO safe prefix `a3efc2e4`, no linked bill, no asset journal, no reversal journal.
- Read-only accounting preview result: `canPost = false`; expected blocker present: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- Baselines: directly tied journals `0`, selected receipt asset-post audit actions `0`, selected receipt asset-reversal audit actions `0`, generated documents `0`.
- Required exact Part 14 approval phrase: `I approve DEV-08G Part 14 local-only purchase-order receipt asset-posting blocker negative check under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 14: approved local purchase-order receipt asset-posting blocker negative check`.

## Next Thread Prompt

`DEV-08G Part 14: approved local purchase-order receipt asset-posting blocker negative check`

## DEV-08G Part 14 - Purchase Order Receipt Asset Posting Blocker Negative Check Completed

- DEV-08G Part 14 negative-check evidence is recorded in [docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Expected failure performed: yes, local-only.
- Latest commit inspected: `414f8f02 Plan DEV-08G purchase order receipt asset posting blocker`; local `HEAD` matched `origin/main` at `414f8f02cc7e80927d938bdbb3a9f9a72532c6db`.
- Approval phrase status: exact Part 14 phrase received in the up-front DEV-08G approval bundle and checked before the service call.
- Local target proof: runner classified `apps/api/.env` as `localhost:5432/accounting` before importing write-capable services; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service call attempted: exactly one `PurchaseReceiptService.postInventoryAsset(...)` for `PRC-000005`.
- Expected blocker observed: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- State unchanged proof: receipt remained `POSTED`; asset journal and reversal journal remained absent; directly tied journals `0 -> 0`; selected receipt stock movements `1 -> 1`; asset-post audit actions `0 -> 0`; generated documents `0 -> 0`; email rows `0`; ZATCA fixture audit actions `0`.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part14-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 15: purchase-order receipt asset-posting blocker evidence verification`.

## Next Thread Prompt

`DEV-08G Part 15: purchase-order receipt asset-posting blocker evidence verification`

## DEV-08G Part 15 - Purchase Order Receipt Asset Posting Blocker Verification Completed

- DEV-08G Part 15 read-only verification is recorded in [docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PO_RECEIPT_ASSET_POSTING_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `fda5e717 Check DEV-08G purchase order receipt asset posting blocker`; local `HEAD` matched `origin/main` at `fda5e717f6be32ef5ab6af520e937a559c2420f3`.
- Verification result: the asset-posting blocker preserved state for selected receipt `PRC-000005` safe prefix `1f412d79`.
- Unchanged state proof: receipt remains `POSTED`; asset journal and reversal journal absent; directly tied journals `0`; asset-post audit actions `0`; asset-reversal audit actions `0`; selected receipt stock movements `1`; generated documents `0`; email rows `0`; ZATCA fixture audit actions `0`.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 16: purchase-order receipts void preflight`.

## Next Thread Prompt

`DEV-08G Part 16: purchase-order receipts void preflight`

## DEV-08G Part 16 - Purchase Order Receipt Void Preflight Completed

- DEV-08G Part 16 read-only preflight is recorded in [docs/development/DEV_08G_PO_RECEIPT_VOID_PREFLIGHT.md](docs/development/DEV_08G_PO_RECEIPT_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `558e5a59 Verify DEV-08G purchase order receipt asset posting blocker`; local `HEAD` matched `origin/main` at `558e5a59ca8af2b4c9359ff8d8bf8b5d61cf98fb`.
- Current receipt state: `PRC-000005` safe prefix `1f412d79` remains `POSTED` quantity `4.0000`; `PRC-000006` safe prefix `942e4907` remains `POSTED` quantity `6.0000`; neither receipt has asset journal or void movement.
- Selected Part 17 void: `PRC-000006` safe prefix `942e4907`, quantity `6.0000`.
- Stock sufficiency: on hand `10.0000`, expected after void `4.0000`.
- Expected Part 17 result: void stock movement type `ADJUSTMENT_OUT`; receiving `PARTIAL`; matching `PARTIALLY_RECEIVED`; remaining source quantity `6.0000`.
- Baselines: void stock movements `0`, receipt void audit actions `0`, directly tied journals `0`.
- Required exact Part 17 approval phrase: `I approve DEV-08G Part 17 local-only purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 6.0000 receipt. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 17: approved local purchase-order receipt void mutation`.

## Next Thread Prompt

`DEV-08G Part 17: approved local purchase-order receipt void mutation`

## DEV-08G Part 17 - Purchase Order Receipt Void Mutation Completed

- DEV-08G Part 17 local-only mutation evidence is recorded in [docs/development/DEV_08G_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08G_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Mutation performed: yes, local-only.
- Latest commit inspected: `151e3388 Plan DEV-08G purchase order receipt void`; local `HEAD` matched `origin/main` at `151e338819cb5562b346425664b998e5c9a4bddf`.
- Approval phrase status: exact Part 17 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Local target proof: runner classified `apps/api/.env` as `localhost:5432/accounting` before importing write-capable services; no production, beta, hosted/shared-target, provider, or customer-data target was used.
- Service call: exactly one `PurchaseReceiptService.void(...)`; only `PRC-000006` was voided.
- Receipt result: `PRC-000006` safe prefix `942e4907` changed to `VOIDED` with `voidedAt`; `PRC-000005` safe prefix `1f412d79` remained `POSTED`.
- Void stock movement result: safe prefix `3317628d`, type `ADJUSTMENT_OUT`, quantity `6.0000`, reference type `PurchaseReceiptVoid`, reference safe prefix `942e4907`.
- Receiving and matching result: non-voided received `4.0000`, remaining `6.0000`, receiving `PARTIAL`, matching `PARTIALLY_RECEIVED`.
- Side-effect result: directly tied journals remained `0`, generated documents/email/ZATCA remained `0`, and `PurchaseReceipt:PURCHASE_RECEIPT_VOIDED` occurred once.
- Temporary script cleanup result: `apps/api/scripts/dev08g-part17-runner.ts` was removed after execution; no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 18: purchase-order receipt void evidence verification`.

## Next Thread Prompt

`DEV-08G Part 18: purchase-order receipt void evidence verification`

## DEV-08G Part 18 - Purchase Order Receipt Void Verification Completed

- DEV-08G Part 18 read-only verification is recorded in [docs/development/DEV_08G_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `87ed54a9 Void DEV-08G purchase order receipt locally`; local `HEAD` matched `origin/main` at `87ed54a970269622b5ebed26862b94f769321057`.
- Verification result: `PRC-000006` safe prefix `942e4907` remains `VOIDED` with void stock movement `3317628d` quantity `6.0000`; `PRC-000005` safe prefix `1f412d79` remains `POSTED`.
- Receiving and matching result: non-voided received `4.0000`, remaining `6.0000`, receiving `PARTIAL`, matching `PARTIALLY_RECEIVED`.
- Side-effect result: directly tied journals `0`, generated documents `0`, email rows `0`, ZATCA fixture audit actions `0`.
- Audit result: two `PurchaseReceipt:PURCHASE_RECEIPT_CREATED` actions and one `PurchaseReceipt:PURCHASE_RECEIPT_VOIDED` action.
- Temporary script cleanup result: no `*dev08g*` temporary script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 19: remaining purchase-order receipt void preflight`.

## Next Thread Prompt

`DEV-08G Part 19: remaining purchase-order receipt void preflight`

## DEV-08G Part 19 - Remaining Purchase Order Receipt Void Preflight Completed

- DEV-08G Part 19 read-only preflight is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_PREFLIGHT.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `91ccd67a Verify DEV-08G purchase order receipt void`; local `HEAD` matched `origin/main` at `91ccd67aa0b742bc53815f0d98450a4c63fbf25f`.
- Selected receipt: `PRC-000005` safe prefix `1f412d79`, status `POSTED`, quantity `4.0000`, no asset journal, no void movement.
- Stock sufficiency: on hand `4.0000`, selected void quantity `4.0000`, expected after void `0.0000`.
- Expected final PO state: received `0.0000`, remaining `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Baselines: existing DEV-08G PO receipt void movements `1`, existing DEV-08G PO receipt void audits `1`, directly tied journals `0`.
- Required exact Part 20 approval phrase: `I approve DEV-08G Part 20 local-only remaining purchase-order receipt void mutation under marker DEV08G-AP-20260527T000000 for the 4.0000 receipt. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 20: approved local remaining purchase-order receipt void mutation`.

## Next Thread Prompt

`DEV-08G Part 20: approved local remaining purchase-order receipt void mutation`

## DEV-08G Part 20 - Remaining Purchase Order Receipt Void Mutation Completed

- DEV-08G Part 20 local-only mutation evidence is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Latest commit inspected: `90b69e4c Plan DEV-08G remaining purchase order receipt void`.
- Approval phrase status: exact Part 20 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Service call: exactly one `PurchaseReceiptService.void(...)` for `PRC-000005`.
- Receipt result: `PRC-000005` safe prefix `1f412d79`, quantity `4.0000`, changed `POSTED -> VOIDED` with `voidedAt` present.
- Void stock movement: safe prefix `9456b1ca`, type `ADJUSTMENT_OUT`, quantity `4.0000`, reference type `PurchaseReceiptVoid`.
- Already-voided receipt `PRC-000006` safe prefix `942e4907` remained `VOIDED`.
- Final PO state: non-voided receipt count `0`, received `0.0000`, remaining `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Side effects: stock on hand `4.0000 -> 0.0000`; stock movements `3 -> 4`; directly tied journals `0 -> 0`; generated documents `0`; marker email rows `0`; broad existing ZATCA audit count unchanged.
- Cleanup: temporary runner `apps/api/scripts/dev08g-part20-runner.ts` was removed; no `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 21: remaining purchase-order receipt void evidence verification`.

## Next Thread Prompt

`DEV-08G Part 21: remaining purchase-order receipt void evidence verification`

## DEV-08G Part 21 - Remaining Purchase Order Receipt Void Verification Completed

- DEV-08G Part 21 read-only verification is recorded in [docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_REMAINING_PO_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `80e7030f Void DEV-08G remaining purchase order receipt locally`; local `HEAD` matched `origin/main` at `80e7030ffc88b4f30ef35b0021ed84f45c433559`.
- Receipt result: `PRC-000005` safe prefix `1f412d79` and `PRC-000006` safe prefix `942e4907` are both `VOIDED` with `voidedAt` present.
- Stock movement result: original movements `39a7350e` and `e0ffd378` remain `PURCHASE_RECEIPT_PLACEHOLDER` quantities `4.0000` and `6.0000`; void movements `9456b1ca` and `3317628d` are `ADJUSTMENT_OUT` quantities `4.0000` and `6.0000`.
- Final PO state: non-voided receipt count `0`, received `0.0000`, remaining `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Side effects: no asset journal links, directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Audit counts: receipt created `2`, receipt voided `2`, asset-post/reversal `0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 22: standalone purchase receipt preflight`.

## Next Thread Prompt

`DEV-08G Part 22: standalone purchase receipt preflight`

## DEV-08G Part 22 - Standalone Purchase Receipt Preflight Completed

- DEV-08G Part 22 read-only preflight is recorded in [docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_PREFLIGHT.md](docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `9522b098 Verify DEV-08G remaining purchase order receipt void`; local `HEAD` matched `origin/main` at `9522b098d32405e370ce1f888be769ee934b2e4f`.
- Selected standalone inputs: supplier safe prefix `f5deec9a` active `SUPPLIER`; item safe prefix `3b8d7650` active and inventory-tracked; warehouse safe prefix `197fac56`, code `MAIN`, active.
- Planned standalone receipt: quantity `3.0000`, unit cost `90.0000`, expected receipt number `PRC-000007`, no purchase order link, no purchase bill link.
- Expected movement: `PURCHASE_RECEIPT_PLACEHOLDER` quantity `3.0000`; expected stock on hand change `0.0000 -> 3.0000`.
- Expected accounting-preview blocker: standalone receipt remains `DESIGN_ONLY` because purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.
- Baselines: standalone DEV-08G receipt count `0`, selected item/warehouse stock movements `4`, directly tied journals `0`, generated documents `0`, marker email rows `0`, broad existing ZATCA audit count `23`.
- Required exact Part 23 approval phrase: `I approve DEV-08G Part 23 local-only standalone purchase receipt mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 23: approved local standalone purchase receipt mutation`.

## Next Thread Prompt

`DEV-08G Part 23: approved local standalone purchase receipt mutation`

## DEV-08G Part 23 - Standalone Purchase Receipt Mutation Completed

- DEV-08G Part 23 local-only mutation evidence is recorded in [docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_MUTATION_EVIDENCE.md](docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Latest commit inspected: `8fd401ae Plan DEV-08G standalone purchase receipt`; local `HEAD` matched `origin/main` at `8fd401ae0e04b9f1e516b376f37557b49deec55d`.
- Approval phrase status: exact Part 23 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Service call: exactly one `PurchaseReceiptService.create(...)` with no purchase order link and no purchase bill link.
- Standalone receipt result: `PRC-000007` safe prefix `d963e3c6`, status `POSTED`, supplier safe prefix `f5deec9a`, warehouse safe prefix `197fac56`.
- Receipt line: item safe prefix `3b8d7650`, quantity `3.0000`, unit cost `90.0000`.
- Stock movement: safe prefix `2ebd05ff`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `3.0000`, reference type `PurchaseReceipt`.
- Side effects: standalone DEV-08G receipts `0 -> 1`; stock movements for selected item/warehouse `4 -> 5`; directly tied journals `0 -> 0`; generated documents `0`; marker email rows `0`; broad existing ZATCA audit count unchanged.
- Cleanup: temporary runner `apps/api/scripts/dev08g-part23-runner.ts` was removed; no `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 24: standalone purchase receipt evidence verification`.

## Next Thread Prompt

`DEV-08G Part 24: standalone purchase receipt evidence verification`

## DEV-08G Part 24 - Standalone Purchase Receipt Verification Completed

- DEV-08G Part 24 read-only verification is recorded in [docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_STANDALONE_PURCHASE_RECEIPT_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `65ab25bb Create DEV-08G standalone purchase receipt`; local `HEAD` matched `origin/main` at `65ab25bb3a59a542f77dcd6782c17a061d1ec6dd`.
- Standalone receipt state: `PRC-000007` safe prefix `d963e3c6`, status `POSTED`, supplier safe prefix `f5deec9a`, no purchase order link, no purchase bill link, no inventory asset journal links.
- Receipt line: item safe prefix `3b8d7650`, quantity `3.0000`, unit cost `90.0000`.
- Stock movement: safe prefix `2ebd05ff`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `3.0000`, reference type `PurchaseReceipt`.
- Accounting preview: `DESIGN_ONLY`, `canPost=false`, expected blocker present for missing finalized linked inventory-clearing bill.
- Side effects: directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Audit counts for `PRC-000007`: receipt created `1`, receipt voided `0`, asset-post/reversal `0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 25: standalone receipt asset-posting blocker preflight`.

## Next Thread Prompt

`DEV-08G Part 25: standalone receipt asset-posting blocker preflight`

## DEV-08G Part 25 - Standalone Receipt Asset Posting Blocker Preflight Completed

- DEV-08G Part 25 read-only preflight is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_PREFLIGHT.md](docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `3cf93b4a Verify DEV-08G standalone purchase receipt`; local `HEAD` matched `origin/main` at `3cf93b4a943e7f9226fbc50779f7dc10c640c45c`.
- Selected receipt: `PRC-000007` safe prefix `d963e3c6`, status `POSTED`, no purchase bill link, no purchase order link, no inventory asset journal links.
- Preview blocker: `accountingPreview` is `DESIGN_ONLY`, `canPost=false`, because purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.
- Expected Part 26 negative check: exactly one `PurchaseReceiptService.postInventoryAsset(...)` call should throw that blocker without creating a journal or asset audit.
- Baselines: selected item/warehouse stock movements `5`, directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`, selected receipt asset-post/reversal audit rows `0`.
- Required exact Part 26 approval phrase: `I approve DEV-08G Part 26 local-only standalone receipt asset-posting blocker negative check under marker DEV08G-AP-20260527T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 26: approved local standalone receipt asset-posting blocker negative check`.

## Next Thread Prompt

`DEV-08G Part 26: approved local standalone receipt asset-posting blocker negative check`

## DEV-08G Part 26 - Standalone Receipt Asset Posting Blocker Negative Check Completed

- DEV-08G Part 26 negative-check evidence is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation attempted: yes, exactly one expected-to-fail local-only `PurchaseReceiptService.postInventoryAsset(...)` call.
- Persisted mutation result: blocked; no state change.
- Latest commit inspected: `72612e87 Plan DEV-08G standalone receipt asset posting blocker`; local `HEAD` matched `origin/main` at `72612e87751b4f51b5c3fdf15ce05f4df30b6ac5`.
- Approval phrase status: exact Part 26 phrase received in the up-front DEV-08G approval bundle and checked before the service call.
- Blocker observed: `Purchase receipt asset posting requires a finalized linked purchase bill in inventory clearing mode.`
- Selected receipt state: `PRC-000007` safe prefix `d963e3c6`, status `POSTED -> POSTED`, purchase bill link absent, inventory asset journal link absent.
- Unchanged proof: stock movements `5 -> 5`, directly tied journals `0 -> 0`, generated documents `0 -> 0`, marker email rows `0 -> 0`, selected receipt ZATCA audit rows `0 -> 0`, selected receipt asset-post/reversal audit rows `0 -> 0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 27: standalone receipt asset-posting blocker evidence verification`.

## Next Thread Prompt

`DEV-08G Part 27: standalone receipt asset-posting blocker evidence verification`

## DEV-08G Part 27 - Standalone Receipt Asset Posting Blocker Verification Completed

- DEV-08G Part 27 read-only verification is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_STANDALONE_RECEIPT_ASSET_POSTING_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `9314f670 Check DEV-08G standalone receipt asset posting blocker`; local `HEAD` matched `origin/main` at `9314f6702c77ee13d484e70eeb7c6e47c4c8e4b0`.
- Selected receipt state: `PRC-000007` safe prefix `d963e3c6`, status `POSTED`, no inventory asset journal link, no reversal journal link.
- Stock movement: safe prefix `2ebd05ff`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `3.0000`, no void stock movement link.
- Side effects: selected item/warehouse stock movements `5`, directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Audit counts for `PRC-000007`: receipt created `1`, receipt voided `0`, asset-post/reversal `0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 28: standalone receipt void preflight`.

## Next Thread Prompt

`DEV-08G Part 28: standalone receipt void preflight`

## DEV-08G Part 28 - Standalone Receipt Void Preflight Completed

- DEV-08G Part 28 read-only preflight is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_PREFLIGHT.md](docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `a3647be4 Verify DEV-08G standalone receipt asset posting blocker`; local `HEAD` matched `origin/main` at `a3647be42b7141af61d5357bf654e8a4cde4ecd5`.
- Selected receipt: `PRC-000007` safe prefix `d963e3c6`, status `POSTED`, quantity `3.0000`, no inventory asset journal links, no void stock movement.
- Stock sufficiency: on hand `3.0000`, selected void quantity `3.0000`, expected after void `0.0000`.
- Expected void result: `ADJUSTMENT_OUT` stock movement quantity `3.0000`, reference type `PurchaseReceiptVoid`.
- Baselines: selected receipt void stock movements `0`, selected receipt void audits `0`, directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Required exact Part 29 approval phrase: `I approve DEV-08G Part 29 local-only standalone receipt void mutation under marker DEV08G-AP-20260527T000000 for quantity 3.0000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08G Part 29: approved local standalone receipt void mutation`.

## Next Thread Prompt

`DEV-08G Part 29: approved local standalone receipt void mutation`

## DEV-08G Part 29 - Standalone Receipt Void Mutation Completed

- DEV-08G Part 29 local-only mutation evidence is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only.
- Latest commit inspected: `fd93bba7 Plan DEV-08G standalone receipt void`; local `HEAD` matched `origin/main` at `fd93bba71d3cc6ce5549eddc3bb1c41dbccc6293`.
- Approval phrase status: exact Part 29 phrase received in the up-front DEV-08G approval bundle and checked before mutation.
- Service call: exactly one `PurchaseReceiptService.void(...)` for `PRC-000007`.
- Receipt result: `PRC-000007` safe prefix `d963e3c6`, status `POSTED -> VOIDED`, `voidedAt` present, no inventory asset journal link.
- Void stock movement: safe prefix `33ab2606`, type `ADJUSTMENT_OUT`, quantity `3.0000`, reference type `PurchaseReceiptVoid`.
- Side effects: stock on hand `3.0000 -> 0.0000`; stock movements `5 -> 6`; directly tied journals `0 -> 0`; generated documents `0 -> 0`; marker email rows `0 -> 0`; selected receipt ZATCA audit rows `0 -> 0`; selected receipt void audit `0 -> 1`; asset-post/reversal audit `0 -> 0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 30: standalone receipt void evidence verification`.

## Next Thread Prompt

`DEV-08G Part 30: standalone receipt void evidence verification`

## DEV-08G Part 30 - Standalone Receipt Void Verification Completed

- DEV-08G Part 30 read-only verification is recorded in [docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_08G_STANDALONE_RECEIPT_VOID_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `d194173e Void DEV-08G standalone receipt locally`; local `HEAD` matched `origin/main` at `d194173e44a4c2e5b545c38165bdbf695bb73c4f`.
- Receipt result: `PRC-000007` safe prefix `d963e3c6`, status `VOIDED`, `voidedAt` present, no inventory asset journal links.
- Original stock movement: safe prefix `2ebd05ff`, type `PURCHASE_RECEIPT_PLACEHOLDER`, quantity `3.0000`, reference type `PurchaseReceipt`.
- Void stock movement: safe prefix `33ab2606`, type `ADJUSTMENT_OUT`, quantity `3.0000`, reference type `PurchaseReceiptVoid`.
- Side effects: directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Audit counts for `PRC-000007`: receipt created `1`, receipt voided `1`, asset-post/reversal `0`.
- No `*dev08g*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08G Part 31: purchase receipt inventory integration closure`.

## Next Thread Prompt

`DEV-08G Part 31: purchase receipt inventory integration closure`

## DEV-08G Part 31 - Purchase Receipt Inventory Integration Closure Completed

- DEV-08G closure is recorded in [docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_INTEGRATION_CLOSURE.md](docs/development/DEV_08G_PURCHASE_RECEIPT_INVENTORY_INTEGRATION_CLOSURE.md).
- Runtime mutation performed by closure: no.
- Latest commit inspected: `4d9e5b0b Verify DEV-08G standalone receipt void`; local `HEAD` matched `origin/main` at `4d9e5b0b32539b015e571b3b1b87ecab570e073f`.
- Final PO source state: `PO-000003` safe prefix `a3efc2e4`, status `APPROVED`, source quantity `10.0000`, active received `0.0000`, remaining `10.0000`, receiving `NOT_STARTED`, matching `NOT_RECEIVED`.
- Final PO receipts: `PRC-000005` safe prefix `1f412d79` and `PRC-000006` safe prefix `942e4907` are both `VOIDED`, with matching placeholder and `ADJUSTMENT_OUT` movement pairs for quantities `4.0000` and `6.0000`.
- Final standalone receipt: `PRC-000007` safe prefix `d963e3c6` is `VOIDED`, with placeholder movement `2ebd05ff` and void movement `33ab2606` for quantity `3.0000`.
- Side effects: directly tied journals `0`, generated documents `0`, marker email rows `0`, selected receipt ZATCA audit rows `0`.
- Audit counts across DEV-08G receipts: receipt created `3`, receipt voided `3`, asset-post/reversal `0`.
- Remaining gaps: linked PO-to-bill receipt reconciliation, valuation variance, landed cost, returns, serial/batch/bin/location, automatic posting, AP output/email, authenticated UI/API QA, repeated/idempotency/fiscal/permission edges, cleanup policy, and production/beta/customer-data behavior.
- Exact next prompt title: `DEV-08H Part 1: AP output PDF archive email preflight`.

## Next Thread Prompt

`DEV-08H Part 1: AP output PDF archive email preflight`

## DEV-08H Part 1 - AP Output PDF Archive Email Preflight Completed

- DEV-08H Part 1 read-only preflight is recorded in [docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_PREFLIGHT.md](docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_PREFLIGHT.md).
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no generated-document download, no email enqueue/send, and no ZATCA action.
- Latest commit inspected: `88dd99a6 Close DEV-08G purchase receipt inventory evidence`; local `HEAD` matched `origin/main` at `88dd99a6`.
- Route/service families mapped: purchase order, purchase bill, supplier payment receipt, supplier refund, purchase debit note, cash expense, generated-document list/get/download, documents page, and email readiness/outbox boundaries.
- Source strategy: create a fresh local-only fake AP source fixture pack because existing DEV-08G receipt records are voided and outside the DEV-08H AP output family list.
- Marker collision check for `DEV08H-AP-20260528T000000`: source records `0`, generated documents `0`, marker email outbox rows `0`, and marker ZATCA rows `0`.
- Safety boundaries: no PDF/body/base64 printing, local fake data only, hashes/byte counts only for output evidence, no real email provider, and no ZATCA/PDF-A3/production-compliance claim.
- Required exact Part 2 approval phrase: `I approve DEV-08H Part 2 local-only AP output source fixture mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 2: approved local AP output source fixture mutation`.

## Next Thread Prompt

`DEV-08H Part 2: approved local AP output source fixture mutation`

## DEV-08H Part 2 - AP Output Source Fixture Mutation Completed

- DEV-08H Part 2 local-only mutation evidence is recorded in [docs/development/DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local-only source records only.
- Latest commit inspected: `e21ae33b Plan DEV-08H AP output evidence`.
- Approval phrase status: exact Part 2 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source fixtures created: `PO-000144` safe prefix `8f42caf7` `APPROVED`, `BILL-000423` safe prefix `16e6f021` `FINALIZED`, `PAY-000318` safe prefix `7efa0003` `POSTED`, `SRF-000127` safe prefix `e7eed3c7` `POSTED`, `PDN-000127` safe prefix `7c07411c` `FINALIZED`, and `EXP-000065` safe prefix `bd4d1330` `POSTED`.
- Journal safe prefixes for posted/finalized source records: bill `2184df0c`, payment `70443308`, refund `49b59233`, debit note `13ec8afb`, cash expense `c5f37e88`.
- Side effects: generated documents `0`, marker email outbox rows `0`, marker email provider events `0`, marker ZATCA rows `0`.
- Cleanup: temporary runner `apps/api/scripts/dev08h-part2-runner.ts` was removed; no `*dev08h*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08H Part 3: AP output source fixture evidence verification`.

## Next Thread Prompt

`DEV-08H Part 3: AP output source fixture evidence verification`

## DEV-08H Part 3 - AP Output Source Fixture Verification Completed

- DEV-08H Part 3 read-only verification is recorded in [docs/development/DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `06516c68 Create DEV-08H AP output source fixtures`.
- Source fixtures verified: `PO-000144` `APPROVED`, `BILL-000423` `FINALIZED`, `PAY-000318` `POSTED`, `SRF-000127` `POSTED`, `PDN-000127` `FINALIZED`, and `EXP-000065` `POSTED`.
- Live balances verified: bill `BILL-000423` balance due `130.0000`; supplier payment `PAY-000318` unapplied `25.0000` after the `100.0000` payment allocation and `25.0000` refund.
- Side effects: generated documents `0`, marker email outbox rows `0`, marker email provider events `0`, marker ZATCA rows `0`.
- Audit actions matched only expected source lifecycle actions: create/approve/finalize/post source records, with no output/email/ZATCA actions.
- Cleanup: temporary runner `apps/api/scripts/dev08h-part3-runner.ts` was removed; no `*dev08h*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08H Part 4: purchase order PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 4: purchase order PDF archive preflight`

## DEV-08H Part 4 - Purchase Order PDF Archive Preflight Completed

- DEV-08H Part 4 read-only preflight is recorded in [docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `91b4f7d6 Verify DEV-08H AP output source fixtures`.
- Selected source: `PO-000144` safe prefix `8f42caf7`, status `APPROVED`, total `115.0000`.
- Route boundary: `pdf-data` is read-only; `pdf` and `generate-pdf` render/archive one `PURCHASE_ORDER` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: purchase-order generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 5 approval phrase: `I approve DEV-08H Part 5 local-only purchase order PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 5: approved local purchase order PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 5: approved local purchase order PDF archive mutation`

## DEV-08H Part 5 - Purchase Order PDF Archive Mutation Completed

- DEV-08H Part 5 mutation evidence is recorded in [docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `PurchaseOrderService.generatePdf(...)` archive call.
- Latest commit inspected: `48ff7d63 Plan DEV-08H purchase-order PDF archive`.
- Approval phrase status: exact Part 5 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `PO-000144` safe prefix `8f42caf7`, status `APPROVED`.
- Generated document: safe prefix `8797cdeb`, type `PURCHASE_ORDER`, filename `purchase-order-PO-000144.pdf`, hash prefix `ed41181eafb7`, size `3226` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source purchase-order generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 6: purchase order PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 6: purchase order PDF archive evidence verification`

## DEV-08H Part 6 - Purchase Order PDF Archive Verification Completed

- DEV-08H Part 6 read-only verification is recorded in [docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `4e62a1a3 Archive DEV-08H purchase-order PDF locally`.
- Verification result: exactly one purchase-order generated document exists for `PO-000144`, safe prefix `8797cdeb`, filename `purchase-order-PO-000144.pdf`, hash prefix `ed41181eafb7`, size `3226` bytes.
- Source state unchanged: `PO-000144` safe prefix `8f42caf7` remained `APPROVED`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source create/approve actions plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 7: purchase bill PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 7: purchase bill PDF archive preflight`

## DEV-08H Part 7 - Purchase Bill PDF Archive Preflight Completed

- DEV-08H Part 7 read-only preflight is recorded in [docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `0168261a Verify DEV-08H purchase-order PDF archive`.
- Selected source: `BILL-000423` safe prefix `16e6f021`, status `FINALIZED`, total `230.0000`, live balance due `130.0000`.
- Route boundary: `pdf-data` is read-only; `pdf` and `generate-pdf` render/archive one `PURCHASE_BILL` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: purchase-bill generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 8 approval phrase: `I approve DEV-08H Part 8 local-only purchase bill PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 8: approved local purchase bill PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 8: approved local purchase bill PDF archive mutation`

## DEV-08H Part 8 - Purchase Bill PDF Archive Mutation Completed

- DEV-08H Part 8 mutation evidence is recorded in [docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `PurchaseBillService.generatePdf(...)` archive call.
- Latest commit inspected: `a2ea285d Plan DEV-08H purchase-bill PDF archive`.
- Approval phrase status: exact Part 8 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `BILL-000423` safe prefix `16e6f021`, status `FINALIZED`, total `230.0000`, balance due `130.0000`.
- Generated document: safe prefix `27a07429`, type `PURCHASE_BILL`, filename `purchase-bill-BILL-000423.pdf`, hash prefix `47935bce9f75`, size `3417` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source purchase-bill generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 9: purchase bill PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 9: purchase bill PDF archive evidence verification`

## DEV-08H Part 9 - Purchase Bill PDF Archive Verification Completed

- DEV-08H Part 9 read-only verification is recorded in [docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_PURCHASE_BILL_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `d547b749 Archive DEV-08H purchase-bill PDF locally`.
- Verification result: exactly one purchase-bill generated document exists for `BILL-000423`, safe prefix `27a07429`, filename `purchase-bill-BILL-000423.pdf`, hash prefix `47935bce9f75`, size `3417` bytes.
- Source state unchanged: `BILL-000423` safe prefix `16e6f021` remained `FINALIZED`, balance due `130.0000`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source create/finalize actions plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 10: supplier payment receipt PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 10: supplier payment receipt PDF archive preflight`

## DEV-08H Part 10 - Supplier Payment Receipt PDF Archive Preflight Completed

- DEV-08H Part 10 read-only preflight is recorded in [docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `35ab499b Verify DEV-08H purchase-bill PDF archive`.
- Selected source: `PAY-000318` safe prefix `7efa0003`, status `POSTED`, paid `150.0000`, live unapplied `25.0000`.
- Route boundary: receipt data routes are read-only; `receipt.pdf` and `generate-receipt-pdf` render/archive one `SUPPLIER_PAYMENT_RECEIPT` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: supplier-payment receipt generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 11 approval phrase: `I approve DEV-08H Part 11 local-only supplier payment receipt PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 11: approved local supplier payment receipt PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 11: approved local supplier payment receipt PDF archive mutation`

## DEV-08H Part 11 - Supplier Payment Receipt PDF Archive Mutation Completed

- DEV-08H Part 11 mutation evidence is recorded in [docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `SupplierPaymentService.generateReceiptPdf(...)` archive call.
- Latest commit inspected: `b1611682 Plan DEV-08H supplier-payment-receipt PDF archive`.
- Approval phrase status: exact Part 11 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `PAY-000318` safe prefix `7efa0003`, status `POSTED`, paid `150.0000`, live unapplied `25.0000`.
- Generated document: safe prefix `11846c56`, type `SUPPLIER_PAYMENT_RECEIPT`, filename `supplier-payment-PAY-000318.pdf`, hash prefix `4cf43aeb4f19`, size `3137` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source supplier-payment receipt generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 12: supplier payment receipt PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 12: supplier payment receipt PDF archive evidence verification`

## DEV-08H Part 12 - Supplier Payment Receipt PDF Archive Verification Completed

- DEV-08H Part 12 read-only verification is recorded in [docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_SUPPLIER_PAYMENT_RECEIPT_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `49a806e1 Archive DEV-08H supplier-payment-receipt PDF locally`.
- Verification result: exactly one supplier-payment receipt generated document exists for `PAY-000318`, safe prefix `11846c56`, filename `supplier-payment-PAY-000318.pdf`, hash prefix `4cf43aeb4f19`, size `3137` bytes.
- Source state unchanged: `PAY-000318` safe prefix `7efa0003` remained `POSTED`, paid `150.0000`, live unapplied `25.0000`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source creation action plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 13: supplier refund PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 13: supplier refund PDF archive preflight`

## DEV-08H Part 13 - Supplier Refund PDF Archive Preflight Completed

- DEV-08H Part 13 read-only preflight is recorded in [docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `a53f11ce Verify DEV-08H supplier-payment-receipt PDF archive`.
- Selected source: `SRF-000127` safe prefix `e7eed3c7`, status `POSTED`, refunded `25.0000`, source payment safe prefix `7efa0003`.
- Route boundary: `pdf-data` is read-only; `pdf` and `generate-pdf` render/archive one `SUPPLIER_REFUND` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: supplier-refund generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 14 approval phrase: `I approve DEV-08H Part 14 local-only supplier refund PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 14: approved local supplier refund PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 14: approved local supplier refund PDF archive mutation`

## DEV-08H Part 14 - Supplier Refund PDF Archive Mutation Completed

- DEV-08H Part 14 mutation evidence is recorded in [docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `SupplierRefundService.generatePdf(...)` archive call.
- Latest commit inspected: `af2bf112 Plan DEV-08H supplier-refund PDF archive`.
- Approval phrase status: exact Part 14 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `SRF-000127` safe prefix `e7eed3c7`, status `POSTED`, refunded `25.0000`, source payment safe prefix `7efa0003`.
- Generated document: safe prefix `676ceaa6`, type `SUPPLIER_REFUND`, filename `supplier-refund-SRF-000127.pdf`, hash prefix `45a947874e20`, size `3043` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source supplier-refund generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 15: supplier refund PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 15: supplier refund PDF archive evidence verification`

## DEV-08H Part 15 - Supplier Refund PDF Archive Verification Completed

- DEV-08H Part 15 read-only verification is recorded in [docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_SUPPLIER_REFUND_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `5c51c6ee Archive DEV-08H supplier-refund PDF locally`.
- Verification result: exactly one supplier-refund generated document exists for `SRF-000127`, safe prefix `676ceaa6`, filename `supplier-refund-SRF-000127.pdf`, hash prefix `45a947874e20`, size `3043` bytes.
- Source state unchanged: `SRF-000127` safe prefix `e7eed3c7` remained `POSTED`, refunded `25.0000`, source payment safe prefix `7efa0003`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source creation action plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 16: purchase debit note PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 16: purchase debit note PDF archive preflight`

## DEV-08H Part 16 - Purchase Debit Note PDF Archive Preflight Completed

- DEV-08H Part 16 read-only preflight is recorded in [docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `851f0398 Verify DEV-08H supplier-refund PDF archive`.
- Selected source: `PDN-000127` safe prefix `7c07411c`, status `FINALIZED`, total `69.0000`, live unapplied `69.0000`.
- Route boundary: `pdf-data` is read-only; `pdf` and `generate-pdf` render/archive one `PURCHASE_DEBIT_NOTE` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: purchase-debit-note generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 17 approval phrase: `I approve DEV-08H Part 17 local-only purchase debit note PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 17: approved local purchase debit note PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 17: approved local purchase debit note PDF archive mutation`

## DEV-08H Part 17 - Purchase Debit Note PDF Archive Mutation Completed

- DEV-08H Part 17 mutation evidence is recorded in [docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `PurchaseDebitNoteService.generatePdf(...)` archive call.
- Latest commit inspected: `aba99678 Plan DEV-08H purchase-debit-note PDF archive`.
- Approval phrase status: exact Part 17 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `PDN-000127` safe prefix `7c07411c`, status `FINALIZED`, total `69.0000`, live unapplied `69.0000`.
- Generated document: safe prefix `b5626ade`, type `PURCHASE_DEBIT_NOTE`, filename `purchase-debit-note-PDN-000127.pdf`, hash prefix `eb5f03433c0b`, size `3336` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source purchase-debit-note generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 18: purchase debit note PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 18: purchase debit note PDF archive evidence verification`

## DEV-08H Part 18 - Purchase Debit Note PDF Archive Verification Completed

- DEV-08H Part 18 read-only verification is recorded in [docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_PURCHASE_DEBIT_NOTE_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `f41c4625 Archive DEV-08H purchase-debit-note PDF locally`.
- Verification result: exactly one purchase-debit-note generated document exists for `PDN-000127`, safe prefix `b5626ade`, filename `purchase-debit-note-PDN-000127.pdf`, hash prefix `eb5f03433c0b`, size `3336` bytes.
- Source state unchanged: `PDN-000127` safe prefix `7c07411c` remained `FINALIZED`, total `69.0000`, live unapplied `69.0000`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source create/finalize actions plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 19: cash expense PDF archive preflight`.

## Next Thread Prompt

`DEV-08H Part 19: cash expense PDF archive preflight`

## DEV-08H Part 19 - Cash Expense PDF Archive Preflight Completed

- DEV-08H Part 19 read-only preflight is recorded in [docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_PREFLIGHT.md](docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `8642c966 Verify DEV-08H purchase-debit-note PDF archive`.
- Selected source: `EXP-000065` safe prefix `bd4d1330`, status `POSTED`, total `46.0000`, tax total `6.0000`.
- Route boundary: `pdf-data` is read-only; `pdf` and `generate-pdf` render/archive one `CASH_EXPENSE` generated document through `GeneratedDocumentService.archivePdf(...)`.
- Baseline: cash-expense generated documents for selected source `0`, marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 20 approval phrase: `I approve DEV-08H Part 20 local-only cash expense PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 20: approved local cash expense PDF archive mutation`.

## Next Thread Prompt

`DEV-08H Part 20: approved local cash expense PDF archive mutation`

## DEV-08H Part 20 - Cash Expense PDF Archive Mutation Completed

- DEV-08H Part 20 mutation evidence is recorded in [docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_MUTATION_EVIDENCE.md](docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one local `CashExpenseService.generatePdf(...)` archive call.
- Latest commit inspected: `d961bb0a Plan DEV-08H cash-expense PDF archive`.
- Approval phrase status: exact Part 20 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `EXP-000065` safe prefix `bd4d1330`, status `POSTED`, total `46.0000`, tax total `6.0000`.
- Generated document: safe prefix `4b8b7378`, type `CASH_EXPENSE`, filename `cash-expense-EXP-000065.pdf`, hash prefix `3ab2c65a6ac0`, size `3265` bytes, status `GENERATED`, storage `database`.
- Counts: selected-source cash-expense generated documents `0 -> 1`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 21: cash expense PDF archive evidence verification`.

## Next Thread Prompt

`DEV-08H Part 21: cash expense PDF archive evidence verification`

## DEV-08H Part 21 - Cash Expense PDF Archive Verification Completed

- DEV-08H Part 21 read-only verification is recorded in [docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_CASH_EXPENSE_PDF_ARCHIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `54502488 Archive DEV-08H cash-expense PDF locally`.
- Verification result: exactly one cash-expense generated document exists for `EXP-000065`, safe prefix `4b8b7378`, filename `cash-expense-EXP-000065.pdf`, hash prefix `3ab2c65a6ac0`, size `3265` bytes.
- Source state unchanged: `EXP-000065` safe prefix `bd4d1330` remained `POSTED`, total `46.0000`, tax total `6.0000`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Audit actions include expected source creation action plus `GENERATED_DOCUMENT_CREATED = 1`.
- Exact next prompt title: `DEV-08H Part 22: generated document download integrity preflight`.

## Next Thread Prompt

`DEV-08H Part 22: generated document download integrity preflight`

## DEV-08H Part 22 - Generated Document Download Integrity Preflight Completed

- DEV-08H Part 22 read-only preflight is recorded in [docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_PREFLIGHT.md](docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_PREFLIGHT.md).
- Runtime mutation performed: no; download performed: no.
- Latest commit inspected: `cfe3c641 Verify DEV-08H cash-expense PDF archive`.
- Selected generated documents: `PURCHASE_ORDER` `8797cdeb`, `PURCHASE_BILL` `27a07429`, `SUPPLIER_PAYMENT_RECEIPT` `11846c56`, `SUPPLIER_REFUND` `676ceaa6`, `PURCHASE_DEBIT_NOTE` `b5626ade`, and `CASH_EXPENSE` `4b8b7378`.
- Each selected document had `mimeType=application/pdf`, `storageProvider=database`, stored hash/size metadata, and content present; body/base64 was not printed.
- Integrity method for Part 23: call local generated-document download, hash returned buffers, compare hash and byte count, and print only safe prefixes/hash/size/match statuses.
- Required exact Part 23 approval phrase: `I approve DEV-08H Part 23 local-only generated document download integrity check under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 23: approved local generated document download integrity check`.

## Next Thread Prompt

`DEV-08H Part 23: approved local generated document download integrity check`

## DEV-08H Part 23 - Generated Document Download Integrity Check Completed

- DEV-08H Part 23 evidence is recorded in [docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_EVIDENCE.md](docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_EVIDENCE.md).
- Runtime mutation performed: no; local generated-document download buffers were read for integrity verification only.
- Latest commit inspected: `57306e8c Plan DEV-08H generated document download integrity`.
- Approval phrase status: exact Part 23 phrase received in the up-front DEV-08H approval bundle and checked before the download checks.
- Documents checked: `PURCHASE_ORDER`, `PURCHASE_BILL`, `SUPPLIER_PAYMENT_RECEIPT`, `SUPPLIER_REFUND`, `PURCHASE_DEBIT_NOTE`, and `CASH_EXPENSE`.
- Result: returned buffer hashes, byte counts, filenames, and MIME types matched stored metadata for all six documents.
- Counts: total generated documents `839 -> 839`, marker email rows `0`, marker ZATCA rows `0`.
- PDF body/base64 was not printed; no email provider or ZATCA/PDF-A3 action was run.
- Exact next prompt title: `DEV-08H Part 24: generated document download integrity evidence verification`.

## Next Thread Prompt

`DEV-08H Part 24: generated document download integrity evidence verification`

## DEV-08H Part 24 - Generated Document Download Integrity Verification Completed

- DEV-08H Part 24 read-only verification is recorded in [docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_GENERATED_DOCUMENT_DOWNLOAD_INTEGRITY_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `7ba47efa Check DEV-08H generated document download integrity`.
- Verification result: stored generated-document metadata still matched downloaded buffer hash and size for all six selected DEV-08H documents.
- Document count unchanged: total generated documents `839 -> 839`.
- Source states unchanged: `PO-000144` `APPROVED`, `BILL-000423` `FINALIZED`, `PAY-000318` `POSTED`, `SRF-000127` `POSTED`, `PDN-000127` `FINALIZED`, and `EXP-000065` `POSTED`.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Exact next prompt title: `DEV-08H Part 25: AP output duplicate generation preflight`.

## Next Thread Prompt

`DEV-08H Part 25: AP output duplicate generation preflight`

## DEV-08H Part 25 - AP Output Duplicate Generation Preflight Completed

- DEV-08H Part 25 read-only preflight is recorded in [docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_PREFLIGHT.md](docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_PREFLIGHT.md).
- Runtime mutation performed: no.
- Latest commit inspected: `12c4f198 Verify DEV-08H generated document download integrity`.
- Selected source: purchase order `PO-000144`, safe prefix `8f42caf7`, status `APPROVED`.
- Baseline: one existing purchase-order generated document for the selected source, safe prefix `8797cdeb`, filename `purchase-order-PO-000144.pdf`, hash prefix `ed41181eafb7`, size `3226` bytes.
- Expected duplicate behavior: another `PurchaseOrderService.generatePdf(...)` call should create a second `GeneratedDocument` row because archive uses `create(...)` rather than reuse/upsert.
- Side-effect baseline: marker email rows `0`, marker ZATCA rows `0`.
- Required exact Part 26 approval phrase: `I approve DEV-08H Part 26 local-only AP output duplicate generation check under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`
- Exact next prompt title: `DEV-08H Part 26: approved local AP output duplicate generation check`.

## Next Thread Prompt

`DEV-08H Part 26: approved local AP output duplicate generation check`

## DEV-08H Part 26 - AP Output Duplicate Generation Check Completed

- DEV-08H Part 26 evidence is recorded in [docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_EVIDENCE.md](docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_EVIDENCE.md).
- Runtime mutation performed: yes, exactly one additional local `PurchaseOrderService.generatePdf(...)` archive call.
- Latest commit inspected: `45c45ceb Plan DEV-08H AP output duplicate generation check`.
- Approval phrase status: exact Part 26 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- Source: `PO-000144` safe prefix `8f42caf7` remained `APPROVED`, total `115.0000`.
- Duplicate behavior observed: purchase-order generated documents for selected source `1 -> 2`.
- New generated document: safe prefix `b01ee620`, filename `purchase-order-PO-000144.pdf`, hash prefix `6ffd6d911c82`, size `3227` bytes.
- Classification: current service allows duplicate archive rows; future product/idempotency decision needed if reuse/supersede behavior is desired.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Exact next prompt title: `DEV-08H Part 27: AP output duplicate generation evidence verification`.

## Next Thread Prompt

`DEV-08H Part 27: AP output duplicate generation evidence verification`

## DEV-08H Part 27 - AP Output Duplicate Generation Verification Completed

- DEV-08H Part 27 read-only verification is recorded in [docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08H_AP_OUTPUT_DUPLICATE_GENERATION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no.
- Latest commit inspected: `4520ba26 Check DEV-08H AP output duplicate generation`.
- Verification result: exactly two purchase-order generated-document archive rows exist for `PO-000144`.
- Source state unchanged: `PO-000144` safe prefix `8f42caf7` remained `APPROVED`, total `115.0000`.
- Duplicate metadata intact: original `8797cdeb` hash prefix `ed41181eafb7`, size `3226`; duplicate `b01ee620` hash prefix `6ffd6d911c82`, size `3227`.
- Classification: current duplicate generation behavior should be a future product/idempotency decision if reuse/supersede/versioning is desired.
- Side effects: marker email rows `0`, marker ZATCA rows `0`; PDF body/base64 was not printed.
- Exact next prompt title: `DEV-08H Part 28: AP email output boundary preflight`.

## Next Thread Prompt

`DEV-08H Part 28: AP email output boundary preflight`

## DEV-08H Part 28 - AP Email Output Boundary Preflight Completed

- DEV-08H Part 28 read-only preflight is recorded in [docs/development/DEV_08H_AP_EMAIL_OUTPUT_BOUNDARY_PREFLIGHT.md](docs/development/DEV_08H_AP_EMAIL_OUTPUT_BOUNDARY_PREFLIGHT.md).
- Runtime mutation performed: no; email enqueued or sent: no; provider called: no.
- Latest commit inspected: `468df795 Verify DEV-08H AP output duplicate generation`.
- Email modules inspected: API email controller/service/provider, outbox/provider-event schema, mock and SMTP-disabled providers, retry/suppression/readiness surfaces, and the web email outbox settings page.
- AP document email action found: no. AP output controllers/services expose PDF/archive/download paths only, not AP email send/outbox actions.
- Safe outbox-only AP document email path found: blocked. Generic test email/invite/password-reset paths are non-AP and should not be used to invent an AP document email mutation.
- Part 29 should not run despite the up-front approval phrase because Part 28 did not prove a safe AP outbox-only path.
- Side effects: marker email rows `0`, marker provider events `0`; no PDF body/base64 was printed.
- Exact next prompt title: `DEV-08H Part 30: AP output PDF archive email closure`.

## Next Thread Prompt

`DEV-08H Part 30: AP output PDF archive email closure`

## DEV-08H Part 30 - AP Output PDF Archive Email Closure Completed

- DEV-08H closure is recorded in [docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md](docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md).
- Runtime mutation performed in closure: no.
- Latest commit inspected: `218f1fa9 Plan DEV-08H AP email output boundary`.
- Closure conclusion: local-only AP output service boundaries are proven for purchase order, purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense PDF archive paths.
- Final generated-document counts: purchase order `2` after the duplicate check; purchase bill `1`; supplier payment receipt `1`; supplier refund `1`; purchase debit note `1`; cash expense `1`.
- Download integrity: the six initially generated archive rows passed hash/size checks, and verification kept counts unchanged.
- Duplicate finding: repeated purchase-order PDF generation creates another archive row; this needs a future product/idempotency decision if reuse/supersede/versioning is desired.
- Email boundary: no safe AP generated-document outbox-only/dry-run path exists; Part 29 was skipped by prompt condition, with no email provider call and no email/attachment body exposure.
- Forbidden side effects stayed absent: marker email rows `0`, marker provider events `0`, marker ZATCA rows `0`, no real email, no real ZATCA, no secrets/PDF bodies printed.
- Exact next prompt title: `DEV-08I Part 1: AP output permission and authenticated UI QA preflight`.

## Next Thread Prompt

`DEV-08I Part 1: AP output permission and authenticated UI QA preflight`

## DEV-08I Part 1 - AP Output Permission And Authenticated UI QA Preflight Completed

- DEV-08I Part 1 read-only preflight is recorded in [docs/development/DEV_08I_AP_OUTPUT_PERMISSION_UI_QA_PREFLIGHT.md](docs/development/DEV_08I_AP_OUTPUT_PERMISSION_UI_QA_PREFLIGHT.md).
- Runtime mutation performed: no; login/browser flow performed: no; PDF generation/download performed: no.
- Latest commit inspected: `0789fec3 Close DEV-08H AP output evidence`; local `HEAD` matched `origin/main`.
- Permission map: generated-document archive list/detail requires `generatedDocuments.view`, archive download requires `generatedDocuments.download`, and AP source PDF/explicit generation routes currently require each source `*.view` permission.
- API guard map: AP output/archive controllers use `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`, and `RequirePermissions(...)`.
- UI map: `/documents` hides archived-download buttons without `generatedDocuments.download`; AP detail pages expose source PDF buttons to users who can open the source detail page.
- Fixture strategy: reuse the local DEV-08H AP sources where suitable, then create/confirm DEV-08I full-permission and restricted fake users/roles under marker `DEV08I-AP-20260528T000000`.
- Login/audit policy: later approved authenticated API/UI parts may write marker-scoped `AUTH_LOGIN` audit rows only for local fake users; record sanitized counts/statuses/safe prefixes only.
- Exact Part 2 approval phrase already received in the upfront DEV-08I approval bundle.
- Exact next prompt title: `DEV-08I Part 2: approved local AP output permission fixture mutation`.

## Next Thread Prompt

`DEV-08I Part 2: approved local AP output permission fixture mutation`

## DEV-08I Part 2 - AP Output Permission Fixture Mutation Completed

- DEV-08I Part 2 mutation evidence is recorded in [docs/development/DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md).
- Runtime mutation performed: yes, local disposable user/role fixture upsert only.
- Latest commit inspected: `202a7123 Plan DEV-08I AP output permission QA`.
- Approval phrase status: exact Part 2 phrase received in the upfront DEV-08I approval bundle and checked before mutation.
- Local-only proof: sanitized DB target `postgresql`, host `localhost`, port `5432`, database `accounting`; local Postgres and Redis were reachable and Docker containers were healthy.
- Sources confirmed in one local organization: `PO-000144`, `BILL-000423`, `PAY-000318`, `SRF-000127`, `PDN-000127`, and `EXP-000065`.
- Fixture roles/users: full output QA user, restricted archive-only user, and restricted AP viewer/no archive-download user were created or confirmed with safe prefixes documented.
- Side effects unchanged: selected-source generated documents `7 -> 7`, marker email rows `0 -> 0`, organization ZATCA submission logs `331 -> 331`, organization ZATCA signed artifact drafts `33 -> 33`, marker audit logs `0 -> 0`.
- Temporary runner `apps/api/scripts/dev08i-part2-fixtures.ts` was removed after execution and no `*dev08i*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 3: AP output permission fixture evidence verification`.

## Next Thread Prompt

`DEV-08I Part 3: AP output permission fixture evidence verification`

## DEV-08I Part 3 - AP Output Permission Fixture Verification Completed

- DEV-08I Part 3 read-only verification is recorded in [docs/development/DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08I_AP_OUTPUT_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/browser flow performed: no; PDF generation/download performed: no.
- Latest commit inspected: `740e9492 Create DEV-08I AP output permission fixtures`.
- Local target remained `postgresql`, host `localhost`, port `5432`, database `accounting`; source organization safe prefix `00000000`.
- Sources verified unchanged: `PO-000144`, `BILL-000423`, `PAY-000318`, `SRF-000127`, `PDN-000127`, and `EXP-000065`.
- Roles verified active: full output QA role `a0c6ece9`, restricted AP viewer/no archive download role `b167ef15`, and restricted archive-only role `83dc203f`.
- Users verified active: full output QA user `5281dfc0`, restricted AP viewer/no archive-download user `41b031e2`, and restricted archive-only user `16d72d2a`.
- Side effects verified unchanged: selected-source generated documents `7`, marker email rows `0`, organization ZATCA submission logs `331`, organization ZATCA signed artifact drafts `33`, marker audit logs `0`.
- Exact next prompt title: `DEV-08I Part 4: authenticated full-permission AP output API preflight`.

## Next Thread Prompt

`DEV-08I Part 4: authenticated full-permission AP output API preflight`

## DEV-08I Part 4 - Full-Permission AP Output API Preflight Completed

- DEV-08I Part 4 preflight is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_PREFLIGHT.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_PREFLIGHT.md).
- Runtime mutation performed: no; login performed: no; API output generation/download performed: no.
- Latest commit inspected: `0a6134e3 Verify DEV-08I AP output permission fixtures`.
- Part 5 approval phrase status: exact phrase received in the upfront DEV-08I approval bundle.
- API target plan: local `http://localhost:4000` only, backed by sanitized local DB target `localhost:5432/accounting`.
- Fixture subject: full output QA user `5281dfc0`, role `a0c6ece9`, permission count `136`.
- Endpoint plan: login once, `GET /auth/me`, read-only AP `pdf-data`/receipt-data checks, one explicit `generate-pdf` or `generate-receipt-pdf` call per selected AP source, then generated-document metadata/download integrity by hash and size only.
- Expected Part 5 side effects: one fake-user `AUTH_LOGIN` audit row plus six generated-document archive rows/audit rows if all explicit generation calls succeed.
- Source streaming PDF routes are deferred to the UI part to avoid duplicate API generation in Part 5.
- Exact next prompt title: `DEV-08I Part 5: approved local authenticated full-permission AP output API QA`.

## Next Thread Prompt

`DEV-08I Part 5: approved local authenticated full-permission AP output API QA`

## DEV-08I Part 5 - Full-Permission AP Output API QA Completed

- DEV-08I Part 5 evidence is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE.md).
- Runtime mutation performed: yes, only the approved local fake-user login audit row plus one generated-document archive row per selected AP source.
- Latest commit inspected: `4ca68502 Plan DEV-08I full permission AP output API QA`; local `HEAD` matched `origin/main`.
- Approval phrase status: exact Part 5 phrase received in the upfront DEV-08I approval bundle and checked before login/generation.
- Local-only proof: API `http://localhost:4000` returned health `200`, backed by sanitized local DB target `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Full output QA user `5281dfc0` with role `a0c6ece9` and permission count `136` logged in successfully; token, request/response body, cookie, and auth header were not printed.
- API result: all six AP `pdf-data`/receipt-data checks succeeded, all six explicit generation endpoints succeeded, and generated-document list/metadata/download integrity matched by hash and byte size only.
- New generated documents: `d9591705`, `3d817d1e`, `6ad0e7b7`, `eda73f44`, `6bf15f25`, and `42748b57`.
- Side effects: selected-source generated documents `7 -> 13`, full-user `AUTH_LOGIN` audit rows `0 -> 1`, standardized `GENERATED_DOCUMENT_CREATED` audit rows `0 -> 6`, marker email rows `0`, ZATCA submission logs `331`, and signed artifact drafts `33`.
- Temporary runner `apps/api/scripts/dev08i-part5-full-api-qa.ts` was removed after execution and no `*dev08i*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 6: full-permission AP output API evidence verification`.

## Next Thread Prompt

`DEV-08I Part 6: full-permission AP output API evidence verification`

## DEV-08I Part 6 - Full-Permission AP Output API Evidence Verification Completed

- DEV-08I Part 6 read-only verification is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE_VERIFICATION.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_API_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/browser/API generation/download performed: no.
- Latest commit inspected: `b5ab2cfd Check DEV-08I full permission AP output API`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained host `localhost`, port `5432`, database `accounting`.
- Verification result: all six Part 5 generated documents remained present with expected safe prefixes, filenames, MIME type `application/pdf`, status `GENERATED`, hash prefixes, byte sizes, and source statuses.
- Counts stayed stable during verification: selected-source generated documents `13 -> 13`, full-user generated documents `6`, full-user `AUTH_LOGIN` audit rows `1`, and matching `GENERATED_DOCUMENT_CREATED` audit rows `6`.
- Side effects/exposure: marker email rows `0`, ZATCA submission logs `331`, signed artifact drafts `33`, and no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload printed.
- No `*dev08i*` temporary script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 7: restricted AP output API permission preflight`.

## Next Thread Prompt

`DEV-08I Part 7: restricted AP output API permission preflight`

## DEV-08I Part 7 - Restricted AP Output API Permission Preflight Completed

- DEV-08I Part 7 preflight is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_PREFLIGHT.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_PREFLIGHT.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `a7986366 Verify DEV-08I full permission AP output API`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user `16d72d2a` has `generatedDocuments.view`, lacks `generatedDocuments.download`, and lacks all six AP source view permissions; this is the primary Part 8 negative subject.
- Restricted AP viewer/no archive-download user `41b031e2` has all six AP source view permissions and `generatedDocuments.view`, but lacks `generatedDocuments.download`; archive download should 403, but AP generation routes are expected to be allowed by current guards and should not be called in the negative-only Part 8 run.
- Part 8 expected result: archive metadata list/detail allowed, generated-document download blocked with 403, AP `pdf-data` and explicit generation routes blocked with 403 for the archive-only user, and selected-source generated-document counts unchanged.
- Part 8 approval phrase status: exact phrase received in the upfront DEV-08I approval bundle.
- Exact next prompt title: `DEV-08I Part 8: approved local restricted-user AP output API permission negative checks`.

## Next Thread Prompt

`DEV-08I Part 8: approved local restricted-user AP output API permission negative checks`

## DEV-08I Part 8 - Restricted AP Output API Permission Checks Completed

- DEV-08I Part 8 evidence is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE.md).
- Runtime mutation performed: yes, only one approved local fake-user `AUTH_LOGIN` audit row.
- Latest commit inspected: `98c7359e Plan DEV-08I restricted AP output API permission checks`; local `HEAD` matched `origin/main`.
- Approval phrase status: exact Part 8 phrase received in the upfront DEV-08I approval bundle and checked before login.
- Local-only proof: API `http://localhost:4000` returned health `200`, backed by sanitized local DB target host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user `16d72d2a`, membership `2de5260b`, role `83dc203f`, permission count `4`, had `generatedDocuments.view` but lacked `generatedDocuments.download` and all six AP source view permissions.
- Archive metadata view-only checks succeeded for list/detail on all six selected sources; only safe prefixes, filenames, hash prefixes, sizes, and counts were recorded.
- Negative checks passed: all six generated-document downloads returned `403`, all six AP data routes returned `403`, and all six AP explicit generation routes returned `403`.
- Side effects: selected-source generated documents `13 -> 13`, generated documents by restricted user `0 -> 0`, restricted-user `AUTH_LOGIN` audit rows `0 -> 1`, marker email rows `0`, ZATCA submission logs `331`, and signed artifact drafts `33`.
- Temporary runner `apps/api/scripts/dev08i-part8-restricted-api-negative.ts` was removed after execution and no `*dev08i*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 9: restricted AP output API permission evidence verification`.

## Next Thread Prompt

`DEV-08I Part 9: restricted AP output API permission evidence verification`

## DEV-08I Part 9 - Restricted AP Output API Permission Evidence Verification Completed

- DEV-08I Part 9 read-only verification is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_API_PERMISSION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `f8f65d79 Check DEV-08I restricted AP output API permissions`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user `16d72d2a`, membership `2de5260b`, role `83dc203f`, permission count `4`, remained active with `generatedDocuments.view` but without `generatedDocuments.download` or AP source view permissions.
- Part 8 denied-route evidence was verified from the doc: six archive downloads `403`, six AP data routes `403`, and six AP generation routes `403`.
- Current DB verification: selected-source generated documents `13`, generated documents by restricted user `0`, restricted-user `AUTH_LOGIN` audit rows `1`, marker email rows `0`, ZATCA submission logs `331`, and signed artifact drafts `33`.
- Exposure result: no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload printed; no `*dev08i*` temporary script remained.
- Exact next prompt title: `DEV-08I Part 10: AP output UI full-permission preflight`.

## Next Thread Prompt

`DEV-08I Part 10: AP output UI full-permission preflight`

## DEV-08I Part 10 - Full-Permission AP Output UI Preflight Completed

- DEV-08I Part 10 read-only preflight is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_PREFLIGHT.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_PREFLIGHT.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `f3e32c72 Verify DEV-08I restricted AP output API permissions`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; planned API/web targets are `http://localhost:4000` and `http://localhost:3000`.
- Full output QA user `5281dfc0`, membership `b7f0b3d4`, role `a0c6ece9`, permission count `136`, remains the planned Part 11 UI subject.
- UI plan: verify `/documents` archive metadata and `Download archived PDF`, then visit all six AP detail routes and click the source PDF buttons once each with hash/size-only evidence.
- Expected Part 11 side effects: one local full-user login audit row, six generated-document rows, and six generated-document audit rows; expected non-effects are no accounting lifecycle mutation, email, provider call, ZATCA, migration, seed/reset/delete, deploy, env/provider/schema change, production, beta, hosted/shared target, or customer data.
- Part 11 approval phrase status: exact phrase received in the upfront DEV-08I approval bundle.
- Exposure result: no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload printed; no `*dev08i*` temporary script remained.
- Exact next prompt title: `DEV-08I Part 11: approved local authenticated full-permission AP output UI QA`.

## Next Thread Prompt

`DEV-08I Part 11: approved local authenticated full-permission AP output UI QA`

## DEV-08I Part 11 - Full-Permission AP Output UI QA Completed

- DEV-08I Part 11 evidence is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE.md).
- Runtime mutation performed: yes, only the approved local generated-document archive rows created by AP source PDF UI clicks.
- Latest commit inspected: `30b581cd Plan DEV-08I full permission AP output UI QA`; local `HEAD` matched `origin/main`.
- Approval phrase status: exact Part 11 phrase received in the upfront DEV-08I approval bundle and checked before UI/output work.
- Local-only proof: API `http://localhost:4000` returned health `200`, web `http://localhost:3000/login` returned `200`, and the sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Auth setup: the fixture password did not match the seed default, so the successful browser session used a local JWT for fake full user `5281dfc0`; `/auth/login` was not called and full-user `AUTH_LOGIN` audit rows stayed `1 -> 1`.
- UI checks: `/documents` loaded with six selected AP archive rows visible and `Download archived PDF` enabled; all six AP detail routes loaded with status `200` and their source PDF buttons visible/enabled.
- Output evidence: selected-source generated documents `13 -> 19`; six new docs were created by full user `5281dfc0`: `156e0b83`, `069106ca`, `75b2e7ae`, `32e98b3b`, `3a6d6bad`, and `5cfcbed8`; all had status `GENERATED`, verified stored hash prefixes/byte sizes, and matching `GENERATED_DOCUMENT_CREATED` audit rows.
- Side effects/exposure: marker email rows stayed `0`, ZATCA submission logs stayed `331`, signed artifact drafts stayed `33`, browser console/page errors were `0`, and no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed.
- Temporary runner `apps/api/scripts/dev08i-part11-full-ui-qa.ts` was removed after execution and no `*dev08i*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 12: full-permission AP output UI evidence verification`.

## Next Thread Prompt

`DEV-08I Part 12: full-permission AP output UI evidence verification`

## DEV-08I Part 12 - Full-Permission AP Output UI Evidence Verification Completed

- DEV-08I Part 12 read-only verification is recorded in [docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE_VERIFICATION.md](docs/development/DEV_08I_FULL_PERMISSION_AP_OUTPUT_UI_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `792738f2 Check DEV-08I full permission AP output UI`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Full output QA user `5281dfc0`, membership `b7f0b3d4`, role `a0c6ece9`, permission count `136`, remained active with all required archive/AP source permissions.
- Part 11 UI evidence was verified from the committed doc: `/documents` and all six AP detail routes had status `200`, archive rows/source buttons were visible/enabled, and browser console/page errors were `0`.
- Current DB verification: selected-source generated documents stayed `19 -> 19`; latest UI docs remained `156e0b83`, `069106ca`, `75b2e7ae`, `32e98b3b`, `3a6d6bad`, and `5cfcbed8` with expected filenames, statuses, hash prefixes, byte sizes, full-user actor prefix, and six `GENERATED_DOCUMENT_CREATED` audit rows.
- Side effects/exposure: full-user `AUTH_LOGIN` rows stayed `1`, marker email rows stayed `0`, ZATCA submission logs stayed `331`, signed artifact drafts stayed `33`, and no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed.
- No `*dev08i*` temporary script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 13: AP output UI restricted-permission preflight`.

## Next Thread Prompt

`DEV-08I Part 13: AP output UI restricted-permission preflight`

## DEV-08I Part 13 - Restricted AP Output UI Permission Preflight Completed

- DEV-08I Part 13 read-only preflight is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_PREFLIGHT.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_PREFLIGHT.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `c3d4786a Verify DEV-08I full permission AP output UI`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; planned API/web targets are `http://localhost:4000` and `http://localhost:3000`.
- Primary Part 14 negative subject: restricted archive-only user `16d72d2a`, membership `2de5260b`, role `83dc203f`, permission count `4`, active with `generatedDocuments.view` but without `generatedDocuments.download` or any selected AP source view permission.
- Expected Part 14 UI result: `/documents` allowed with archive rows visible but download actions hidden/permission-required; all six AP detail routes show `Access denied`; no source PDF or archive download click is allowed.
- Secondary policy edge: AP viewer/no archive-download user `41b031e2` has AP source view permissions and would see source PDF actions on AP detail routes, so Part 14 must not click those buttons because current source PDF routes would create output.
- Part 14 approval phrase status: exact phrase received in the upfront DEV-08I approval bundle.
- Exact next prompt title: `DEV-08I Part 14: approved local authenticated restricted-user AP output UI permission checks`.

## Next Thread Prompt

`DEV-08I Part 14: approved local authenticated restricted-user AP output UI permission checks`

## DEV-08I Part 14 - Restricted AP Output UI Permission Checks Completed

- DEV-08I Part 14 evidence is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE.md).
- Runtime mutation performed: no; output generated/downloaded: no.
- Latest commit inspected: `1f13e4fe Plan DEV-08I restricted AP output UI permissions`; local `HEAD` matched `origin/main`.
- Approval phrase status: exact Part 14 phrase received in the upfront DEV-08I approval bundle and checked before authenticated browser work.
- Local-only proof: API `http://localhost:4000` returned health `200`, web `http://localhost:3000/login` returned `200`, and the sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user `16d72d2a`, membership `2de5260b`, role `83dc203f`, permission count `4`, had `generatedDocuments.view` but lacked `generatedDocuments.download` and all six selected AP source view permissions.
- UI checks: `/documents` loaded with six selected AP archive rows visible, `Download archived PDF` absent, and `Download permission required` visible; sidebar showed `Documents / Archive` and hid `Purchases`.
- AP route checks: all six AP detail routes rendered `Access denied` with source PDF button count `0`.
- Side effects/exposure: selected-source generated documents stayed `19 -> 19`, restricted generated documents stayed `0`, restricted archive-only login audits stayed `1`, marker email rows stayed `0`, ZATCA submission logs stayed `331`, signed artifact drafts stayed `33`, browser console/page errors were `0`, and no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed.
- Temporary runner `apps/api/scripts/dev08i-part14-restricted-ui-permissions.ts` was removed after execution and no `*dev08i*` script remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08I Part 15: restricted AP output UI evidence verification`.

## Next Thread Prompt

`DEV-08I Part 15: restricted AP output UI evidence verification`

## DEV-08I Part 15 - Restricted AP Output UI Evidence Verification Completed

- DEV-08I Part 15 read-only verification is recorded in [docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE_VERIFICATION.md](docs/development/DEV_08I_RESTRICTED_AP_OUTPUT_UI_PERMISSION_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/API/browser/output/download performed: no.
- Latest commit inspected: `904a41b2 Check DEV-08I restricted AP output UI permissions`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Restricted archive-only user `16d72d2a`, membership `2de5260b`, role `83dc203f`, permission count `4`, remained active with `generatedDocuments.view` but without `generatedDocuments.download` or any selected AP source view permission.
- Restricted AP viewer/no archive-download user `41b031e2`, membership `78a4a87c`, role `b167ef15`, permission count `10`, remained active with AP source view permissions and `generatedDocuments.view`, but without `generatedDocuments.download`.
- Part 14 UI evidence was verified from the committed doc: `/documents` loaded with selected archive rows visible, archive download actions absent, permission-required fallbacks visible, sidebar purchases hidden, and all six AP detail routes rendered `Access denied` with source PDF button count `0`.
- Current DB verification: selected-source generated documents stayed `19 -> 19`, generated documents by both restricted users stayed `0`, restricted archive-only `AUTH_LOGIN` rows stayed `1`, marker email rows stayed `0`, ZATCA submission logs stayed `331`, and signed artifact drafts stayed `33`.
- Side effects/exposure: no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed; no `*dev08i*` temporary script remained.
- Exact next prompt title: `DEV-08I Part 16: AP output permission audit and cleanup preflight`.

## Next Thread Prompt

`DEV-08I Part 16: AP output permission audit and cleanup preflight`

## DEV-08I Part 16 - AP Output Permission Audit And Cleanup Preflight Completed

- DEV-08I Part 16 read-only audit/cleanup preflight is recorded in [docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUDIT_CLEANUP_PREFLIGHT.md](docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUDIT_CLEANUP_PREFLIGHT.md).
- Runtime mutation performed: no; login/API/browser/output/download/cleanup performed: no.
- Latest commit inspected: `eb81bc5f Verify DEV-08I restricted AP output UI permissions`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Fixture inventory: three marker-scoped disposable roles, users, and memberships remain active for full output QA, restricted archive-only, and restricted AP viewer/no archive-download permission shapes.
- Generated-document inventory: selected-source generated documents total `19`; DEV-08I full-user generated documents total `12`; restricted users generated `0`.
- Audit inventory: `12` `GENERATED_DOCUMENT_CREATED` rows match the DEV-08I full-user generated-document prefixes, full-user `AUTH_LOGIN` rows total `1`, restricted archive-only `AUTH_LOGIN` rows total `1`, restricted AP viewer/no-download `AUTH_LOGIN` rows total `0`, and marker text-matched audit rows total `0`.
- Side effects/exposure: marker email rows stayed `0`, ZATCA submission logs stayed `331`, signed artifact drafts stayed `33`, and no raw audit metadata, PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed.
- Cleanup posture: preserve DEV-08I fixtures and generated-document/audit evidence for closure; defer cleanup unless a later explicitly approved local cleanup branch defines the exact retention/removal policy.
- Exact next prompt title: `DEV-08I Part 17: AP output permission and authenticated UI QA closure`.

## Next Thread Prompt

`DEV-08I Part 17: AP output permission and authenticated UI QA closure`

## DEV-08I Part 17 - AP Output Permission And Authenticated UI QA Closure Completed

- DEV-08I closure is recorded in [docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md](docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md).
- Runtime mutation performed by closure: no; login/API/browser/output/download/cleanup performed by closure: no.
- Latest commit inspected: `cfbc75f1 Plan DEV-08I AP output audit cleanup`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- DEV-08I proved local AP output permission boundaries across full-permission API generation/download metadata, restricted API negative checks, full-permission UI archive/source output behavior, and restricted UI archive/AP access denial behavior.
- Final fixture state: three marker-scoped disposable users, roles, and memberships remain active for full output QA, restricted archive-only, and restricted AP viewer/no archive-download shapes.
- Final output/audit counts: selected-source generated documents `19`, DEV-08I full-user generated documents `12`, restricted generated documents `0`, matching `GENERATED_DOCUMENT_CREATED` audit rows `12`, full-user `AUTH_LOGIN` rows `1`, restricted archive-only `AUTH_LOGIN` rows `1`, restricted AP viewer/no-download `AUTH_LOGIN` rows `0`.
- Side effects/exposure: marker email rows stayed `0`, ZATCA submission logs stayed `331`, signed artifact drafts stayed `33`, and no raw audit metadata, PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, or QR payload was printed.
- Cleanup posture: preserve DEV-08I fixtures and generated-document/audit evidence; defer cleanup to a later explicitly approved local cleanup branch.
- Remaining gaps: repeated generation/idempotency, source PDF route permission policy for AP viewers without archive download permission, AP generated-document email, production/beta/customer behavior, real ZATCA/email, and full E2E/smoke remain out of scope.
- Exact next prompt title: `DEV-08J Part 1: AP repeated idempotency and blocker paths preflight`.

## Next Thread Prompt

`DEV-08J Part 1: AP repeated idempotency and blocker paths preflight`

## DEV-08J Part 1 - AP Repeated Idempotency And Blocker Paths Preflight Completed

- DEV-08J Part 1 read-only preflight is recorded in [docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_PREFLIGHT.md](docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no; negative-check service calls performed: no; output/login/browser/email/ZATCA performed: no.
- Latest commit inspected: `0342d742 Close DEV-08I AP output permission evidence`; local `HEAD` matched `origin/main`.
- Local-only proof: Docker Postgres/Redis were healthy on local ports; sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Existing DEV-08J marker fixtures before this arc: `0`; baseline generated documents `852`, email outbox rows `224`, ZATCA submission logs `331`, planned signed artifact drafts `33`, and journal entries `3161`.
- Selected sequence: local fixture pack, fixture verification, AP output duplicate sweep, repeated/idempotency and blocker checks by AP family, source PDF permission-policy edge, and closure.
- Part 2 approval phrase status: exact phrase received in the upfront DEV-08J approval bundle.
- Exact next prompt title: `DEV-08J Part 2: approved local AP repeated blocker source fixture mutation`.

## Next Thread Prompt

`DEV-08J Part 2: approved local AP repeated blocker source fixture mutation`

## DEV-08J Parts 2-31 - AP Repeated Idempotency And Blocker Evidence Completed

- DEV-08J closure is recorded in [docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md](docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md).
- Runtime data mutations performed: yes, only the approved local-only DEV-08J fixture creation, duplicate output sweep, and repeated/blocker service checks under marker `DEV08J-AP-20260528T000000`.
- Approval phrase status: exact Part 2, 5, 8, 11, 14, 17, 20, 23, 26, and 29 phrases were received in the upfront DEV-08J approval bundle and checked before their mutation/check steps.
- Local-only proof: sanitized DB target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; no production, beta, hosted/shared target, or customer data was used.
- Fixture evidence: marker-scoped AP fixtures covered purchase orders, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and purchase receipts with active blocker dependencies.
- Duplicate output evidence: purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense repeated output generation each created one additional generated-document archive row; selected source counts became `4` each. This remains a product decision if future behavior should reuse, supersede, or explicitly version outputs.
- Repeated/blocker evidence: purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, and purchase receipt repeated/idempotency and blocker checks matched expected statuses/blocker messages, with only expected journal reversals.
- Source PDF permission edge: Part 28 recommended narrow hardening; Part 29 implemented source-view plus `generatedDocuments.download` for AP source PDF stream/generate routes and hid source PDF buttons without archive-download permission. `pdf-data` routes remain source-view read-only.
- Final counts: generated documents `857`, email outbox rows `224`, ZATCA submission logs `331`, planned signed artifact drafts `33`, journal entries `3188`.
- Tests/checks run: targeted generated-document permission API test passed, targeted AP page Jest suites passed, API typecheck passed. Full web test/typecheck remained blocked by unrelated untracked marketing/nav/permission-matrix work.
- Remaining gaps: AP generated-document email/outbox design, real email, real ZATCA, production/beta/customer behavior, full E2E/smoke, cleanup executor, broad permission matrix coverage, and duplicate-output product policy.
- Exact next prompt title: `DEV-08K Part 1: AP generated-document email design preflight`.

## Next Thread Prompt

`DEV-08K Part 1: AP generated-document email design preflight`

## DEV-08K Part 1 - AP Generated-Document Email Design Preflight Completed

- DEV-08K Part 1 read-only design preflight is recorded in [docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_DESIGN_PREFLIGHT.md](docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_DESIGN_PREFLIGHT.md).
- Runtime mutation performed: no; schema/code/email/outbox/provider mutation performed: no.
- Latest commit inspected: `25ae0b5b Close DEV-08J repeated blocker evidence`; local `HEAD` matched `origin/main`.
- Design decision: add a dedicated AP generated-document email outbox path that records local/mock metadata only, with nullable generated-document, source, and attachment metadata fields on `EmailOutbox`.
- Planned service/API boundary: `POST /email/ap-generated-documents/:generatedDocumentId/outbox`, requiring `emailOutbox.view`, `generatedDocuments.download`, and the matching AP source view permission.
- Planned provider behavior: create local `SENT_MOCK` / `mock-no-send` outbox metadata only, with no active provider call, no retry scheduling, and no real email send.
- Planned AP families: purchase orders, purchase bills, supplier payment receipts, supplier refunds, purchase debit notes, and cash expenses.
- Exposure boundary: no PDF body, base64, token, cookie, auth header, request/response body, email body, signed XML, QR payload, private key, CSID, or attachment body should be printed or stored in AP email evidence.
- Part 2 approval phrase status: exact phrase received in the upfront DEV-08K approval bundle.
- Exact next prompt title: `DEV-08K Part 2: approved local AP generated-document email schema design mutation`.

## Next Thread Prompt

`DEV-08K Part 2: approved local AP generated-document email schema design mutation`

## DEV-08K Part 2 - AP Email Schema Design Mutation Completed

- DEV-08K Part 2 evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_SCHEMA_DESIGN_MUTATION_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_SCHEMA_DESIGN_MUTATION_EVIDENCE.md).
- Approval phrase status: exact Part 2 phrase received in the upfront DEV-08K approval bundle and checked before schema/type edits.
- Runtime data mutation performed: no; email outbox rows created: no; provider calls performed: no; migration applied to a database: no.
- Latest commit inspected: `4eba5eac Plan DEV-08K AP generated document email`; local `HEAD` matched `origin/main` before edits.
- Schema/types changed: added `EmailTemplateType.AP_GENERATED_DOCUMENT`, nullable `EmailOutbox` generated-document/source/attachment metadata fields, an unapplied migration file, AP email DTO/source metadata types, web outbox metadata fields, and template label support.
- Generated client status: `corepack pnpm db:generate` succeeded after stopping the stale local Accounting App API lock holder; the local web dev server on port `3000` was left running.
- Verification status: API typecheck passed; web typecheck remained blocked by unrelated untracked `apps/web/src/app/marketing.test.tsx`.
- Exact next prompt title: `DEV-08K Part 3: AP email schema design evidence verification`.

## Next Thread Prompt

`DEV-08K Part 3: AP email schema design evidence verification`

## DEV-08K Part 3 - AP Email Schema Design Evidence Verification Completed

- DEV-08K Part 3 verification is recorded in [docs/development/DEV_08K_AP_EMAIL_SCHEMA_DESIGN_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_SCHEMA_DESIGN_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; email outbox mutation performed: no; provider call performed: no; migration applied to a database: no.
- Latest commit inspected: `66d11809 Add DEV-08K AP email schema design`; local `HEAD` matched `origin/main`.
- Verification result: schema/type additions match Part 2 evidence, the migration file exists but is not applied locally, no AP email service/controller endpoint exists yet, and no `*dev08k*` temp script remains.
- Read-only local snapshot: email outbox rows `227`, DEV-08K marker email rows `0`, provider events `0`, generated documents `870`, AP email migration applied locally `false`.
- Exact next prompt title: `DEV-08K Part 4: AP generated-document email service preflight`.

## Next Thread Prompt

`DEV-08K Part 4: AP generated-document email service preflight`

## DEV-08K Part 4 - AP Generated-Document Email Service Preflight Completed

- DEV-08K Part 4 service preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_SERVICE_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_SERVICE_PREFLIGHT.md).
- Runtime mutation performed: no; service/API implementation performed: no; email outbox rows created: no; provider calls performed: no.
- Latest commit inspected: `f860f444 Verify DEV-08K AP email schema design`; local `HEAD` matched `origin/main`.
- Selected API design: `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- Permission design: use `emailOutbox.view` as the static controller gate, then enforce `emailOutbox.view`, `generatedDocuments.download`, and the matching AP source view permission inside the service because the current permission guard uses any-permission semantics.
- Outbox design: create local metadata-only `SENT_MOCK` rows with provider `mock-no-send`, no retry scheduling, no provider call, and attachment metadata only.
- Part 5 approval phrase status: exact phrase received in the upfront DEV-08K approval bundle.
- Exact next prompt title: `DEV-08K Part 5: approved local AP generated-document email service implementation`.

## Next Thread Prompt

`DEV-08K Part 5: approved local AP generated-document email service implementation`

## DEV-08K Part 5 - AP Generated-Document Email Service Implementation Completed

- DEV-08K Part 5 evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_SERVICE_IMPLEMENTATION_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_SERVICE_IMPLEMENTATION_EVIDENCE.md).
- Approval phrase status: exact Part 5 phrase received in the upfront DEV-08K approval bundle and checked before implementation.
- Runtime data mutation performed: no; unit-test-only outbox mutation: mocked only; real provider calls: no.
- Latest commit inspected: `f365d228 Plan DEV-08K AP email service`; local `HEAD` matched `origin/main`.
- Implemented `POST /email/ap-generated-documents/:generatedDocumentId/outbox`, `EmailService.createApGeneratedDocumentOutbox`, AP source validation, service-level AND permission checks, metadata-only `SENT_MOCK` / `mock-no-send` outbox creation, sanitized response, and `EMAIL_OUTBOX_CREATED` audit mapping.
- Targeted red test failed before implementation as expected; targeted email service/controller tests passed after implementation; API typecheck passed.
- Read-only local side-effect check after tests: DEV-08K marker email rows `0`, provider events `0`.
- Exact next prompt title: `DEV-08K Part 6: AP generated-document email service evidence verification`.

## Next Thread Prompt

`DEV-08K Part 6: AP generated-document email service evidence verification`

## DEV-08K Part 6 - AP Generated-Document Email Service Evidence Verification Completed

- DEV-08K Part 6 verification is recorded in [docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md).
- Runtime data mutation performed: no; email outbox rows created: no; provider calls performed: no; migrations applied: no.
- Latest commit inspected: `193e7d46 Implement DEV-08K AP email service`; local `HEAD` matched `origin/main`.
- Verification result: the AP route and service exist as designed, the controller gate is `emailOutbox.view`, the service enforces `emailOutbox.view`, `generatedDocuments.download`, and matching AP source view permission with AND semantics, and the AP path uses `SENT_MOCK` / `mock-no-send` metadata-only outbox creation without calling the provider.
- Attachment/body exposure result: the AP document select and response use metadata only and exclude PDF body, base64, attachment body, provider payload, `bodyText`, and `bodyHtml` from the returned AP response.
- Targeted email service/controller tests passed: 2 suites, 37 tests.
- Read-only local side-effect check: DEV-08K marker email rows `0`, provider events `0`, generated documents `870`, AP email migration applied locally `false`.
- Temporary script check: no tracked or untracked `*dev08k*` files found under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 7: AP email outbox fixture preflight`.

## Next Thread Prompt

`DEV-08K Part 7: AP email outbox fixture preflight`

## DEV-08K Part 7 - AP Email Outbox Fixture Preflight Completed

- DEV-08K Part 7 preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_PREFLIGHT.md).
- Runtime mutation performed: no; email outbox rows created: no; provider calls performed: no; migrations applied: no.
- Latest commit inspected: `48806634 Verify DEV-08K AP email service`; local `HEAD` matched `origin/main`.
- Selected generated document: purchase bill generated document safe prefix `27a07429`, source prefix `16e6f021`, document/source number `BILL-000423`, status `GENERATED`, filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, hash prefix `47935bce9f75`.
- Selected recipient for Part 8: explicit synthetic `example.test` recipient `dev08k-ap-generated-document@example.test`; no source contact/vendor email needs to be printed or used.
- Provider posture: `EMAIL_PROVIDER` was not set in the targeted root/app env reads, `EmailModule` defaults to `mock`, and the AP service writes `mock-no-send` / `SENT_MOCK` metadata without calling the provider.
- Baseline counts: email outbox rows `227`, DEV-08K marker email rows `0`, provider events `0`, AP email migration applied locally `false`.
- Part 8 approval phrase status: exact Part 8 phrase received in the upfront DEV-08K approval bundle.
- Part 8 execution gate: blocked under current prompt limits because the AP email migration is not applied locally and the current prompts forbid migrations; do not attempt the runtime row creation until an explicitly allowed local schema path exists.
- Exact next prompt title: `DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`.

## Next Thread Prompt

`DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`

## DEV-08K Part 12 - AP Email Permission Negative Evidence Verification Completed

- DEV-08K Part 12 read-only verification is recorded in [docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; AP email endpoint called: no; provider calls performed: no; real email sent: no; login/browser performed: no.
- Latest commit inspected: `5f38e517 Check DEV-08K AP email permissions`; local `HEAD` matched `origin/main`.
- Part 11 evidence doc exists and contains all five expected denied vectors: missing `generatedDocuments.download`, missing AP source view, missing `emailOutbox.view`, restricted AP viewer/no archive download role, and restricted archive-only role all recorded as `403` blocked.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Count verification stayed unchanged from Part 11 evidence: email outbox rows `228`, synthetic recipient rows `1`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`, generated documents `870`.
- Selected generated document verification: safe prefix `27a07429` remained `GENERATED`, document type `PURCHASE_BILL`, source type `PurchaseBill`, source prefix `16e6f021`, document/source number `BILL-000423`, filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, hash prefix `47935bce9f75`.
- Selected outbox row remains safe prefix `3c19700b`, status `SENT_MOCK`, provider `mock-no-send`, template `AP_GENERATED_DOCUMENT`, with metadata-only attachment fields.
- Exposure controls: no email body, attachment body, PDF body, base64, source contact email, customer/vendor data, token, cookie, auth header, provider payload, signed XML, QR payload, private key, or CSID was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 13: AP email UI design preflight`.

## Next Thread Prompt

`DEV-08K Part 13: AP email UI design preflight`

## DEV-08K Part 9 - AP Email Outbox Fixture Evidence Verification Completed

- DEV-08K Part 9 read-only verification is recorded in [docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; email outbox rows created: no; provider calls performed: no; real email sent: no; ZATCA performed: no.
- Latest commit inspected: `69a6c7c2 Create DEV-08K AP email outbox fixture`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Outbox verification: exactly one AP generated-document email row exists for generated document safe prefix `27a07429`; outbox safe prefix `3c19700b`, source type `PurchaseBill`, source prefix `16e6f021`, template `AP_GENERATED_DOCUMENT`, status `SENT_MOCK`, provider `mock-no-send`, synthetic recipient classification `true`.
- Attachment metadata verification: filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, content hash prefix `47935bce9f75`; no PDF/body/base64/attachment/email body was printed.
- Selected generated document verification: safe prefix `27a07429` remained `GENERATED`, document type `PURCHASE_BILL`, source type `PurchaseBill`, document/source number `BILL-000423`.
- Count verification: email outbox rows `228`, synthetic recipient rows `1`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`, generated documents `870`.
- ZATCA snapshot: current read-only counts were submission logs `352` and signed artifact drafts `34`; no ZATCA command or mutation was run in Part 9.
- Temporary script check: no tracked or untracked `*dev08k*` temp scripts remain under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 10: AP email permission negative-check preflight`.

## Next Thread Prompt

`DEV-08K Part 10: AP email permission negative-check preflight`

## DEV-08K Part 10 - AP Email Permission Negative-Check Preflight Completed

- DEV-08K Part 10 read-only preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_PREFLIGHT.md).
- Runtime mutation performed: no; email outbox rows created: no; provider calls performed: no; login/API/browser performed: no.
- Latest commit inspected: `fb40145a Verify DEV-08K AP email outbox fixture`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Existing restricted fixtures selected for reference: restricted archive-only user `16d72d2a` / role `83dc203f` and restricted AP viewer/no archive-download user `41b031e2` / role `b167ef15`.
- Permission snapshot: both restricted roles lack `emailOutbox.view` and `generatedDocuments.download`; AP viewer/no-download has AP source view permissions including `purchaseBills.view`; archive-only has no AP source view permissions.
- Selected generated document: safe prefix `27a07429`, status `GENERATED`, document/source number `BILL-000423`, document type `PURCHASE_BILL`, source type `PurchaseBill`, source prefix `16e6f021`.
- Baseline counts: email outbox rows `228`, synthetic recipient rows `1`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`, generated documents `870`.
- Part 11 plan: use a disposable local runner with direct `EmailService.createApGeneratedDocumentOutbox` negative checks and isolated denied permission vectors for missing `generatedDocuments.download`, missing AP source view, missing `emailOutbox.view`, plus the two existing restricted role shapes. The runner must refuse non-local targets, print sanitized metadata only, and be removed before commit.
- Part 11 approval phrase status: not received in this thread.
- Exact next prompt title: `DEV-08K Part 11: approved local AP generated-document email permission negative checks`.

## Next Thread Prompt

`DEV-08K Part 11: approved local AP generated-document email permission negative checks`

## DEV-08K Part 11 - Approved Local AP Generated-Document Email Permission Negative Checks Completed

- DEV-08K Part 11 evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_PERMISSION_NEGATIVE_CHECK_EVIDENCE.md).
- Approval phrase status: exact Part 11 phrase received and checked before service checks.
- Runtime negative checks performed: yes, local-only `EmailService.createApGeneratedDocumentOutbox` denied permission vectors.
- Successful outbox creation: no; provider calls performed: no; real email sent: no; login/API/browser performed: no.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Selected generated document verification: safe prefix `27a07429` remained `GENERATED`, document type `PURCHASE_BILL`, source type `PurchaseBill`, source prefix `16e6f021`, document/source number `BILL-000423`.
- Negative check results: missing `generatedDocuments.download`, missing AP source view, missing `emailOutbox.view`, restricted AP viewer/no archive download role, and restricted archive-only role all returned `403`.
- Count result: email outbox rows stayed `228`, synthetic recipient rows stayed `1`, AP generated-document email rows stayed `1`, selected generated-document email rows stayed `1`, provider events stayed `0`, generated documents stayed `870`.
- Provider guard result: provider `send(...)` call count stayed `0`.
- Exposure controls: no PDF body, base64, attachment body, email body, request/response body, provider payload, signed XML, QR payload, token, cookie, auth header, private key, CSID, customer/vendor data, or source contact email was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 12: AP email permission negative evidence verification`.

## Next Thread Prompt

`DEV-08K Part 12: AP email permission negative evidence verification`

## DEV-08K Part 8 - Approved Local AP Generated-Document Email Outbox Fixture Mutation Completed

- DEV-08K Part 8 mutation evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_MUTATION_EVIDENCE.md).
- Approval phrase status: exact Part 8 phrase received and checked before mutation.
- Runtime outbox mutation performed: yes, exactly one local metadata-only `EmailService.createApGeneratedDocumentOutbox` call.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Created outbox safe prefix: `3c19700b`.
- Selected generated document/source: generated document safe prefix `27a07429`, source type `PurchaseBill`, source prefix `16e6f021`, document/source number `BILL-000423`, status remained `GENERATED`.
- Delivery result: `SENT_MOCK` with provider `mock-no-send`; provider events stayed `0`; no real email/provider call occurred.
- Attachment metadata result: filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, content hash prefix `47935bce9f75`.
- Count result: email outbox rows `227 -> 228`, synthetic recipient rows `0 -> 1`, AP generated-document email rows `0 -> 1`, selected generated-document email rows `0 -> 1`, generated documents `870 -> 870`.
- Exposure controls: no PDF body, base64, attachment body, email body, request/response body, provider payload, signed XML, QR payload, token, cookie, auth header, private key, CSID, customer/vendor data, or source contact email was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 9: AP email outbox fixture evidence verification`.

## Next Thread Prompt

`DEV-08K Part 9: AP email outbox fixture evidence verification`

## DEV-08K Part 8A - AP Email Local Schema Gate Preflight Completed

- DEV-08K Part 8A read-only schema gate preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_PREFLIGHT.md).
- Runtime mutation performed: no; migration applied: no; email outbox rows created: no; provider calls performed: no.
- Latest commit inspected: `f4d8834c Plan DEV-08K AP email outbox fixture`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Blocker confirmed: the committed AP email metadata migration exists, but local `_prisma_migrations` has no row for `20260528100000_add_ap_generated_document_email_metadata`, and the local `EmailOutbox` table has none of the seven new AP metadata columns.
- Baseline counts before schema application: email outbox rows `227`, selected synthetic recipient rows `0`, AP generated-document email rows `0`, provider events `0`, generated documents `870`.
- Selected schema path: Option A, applying only the already-committed AP email metadata migration to the disposable local DB.
- Part 8B approval phrase status: exact phrase received from the user before Part 8A execution.
- Exact next prompt title: `DEV-08K Part 8B: approved local AP email migration application`.

## Next Thread Prompt

`DEV-08K Part 8B: approved local AP email migration application`

## DEV-08K Part 8B - Approved Local AP Email Migration Application Completed

- DEV-08K Part 8B mutation evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_MUTATION_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_MUTATION_EVIDENCE.md).
- Approval phrase status: exact Part 8B phrase received and checked before mutation.
- Runtime schema mutation performed: yes, only the already-committed AP email metadata migration on the disposable local database.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Migration guard: an unrelated pending migration `20260521193000_add_supplier_statement_document_type` was present, so `prisma migrate deploy` was skipped to avoid applying more than the approved DEV-08K scope.
- Migration result: `20260528100000_add_ap_generated_document_email_metadata` was executed directly and marked applied; the unrelated supplier-statement migration remains unapplied.
- Schema result: `AP_GENERATED_DOCUMENT` exists locally and all seven AP email `EmailOutbox` metadata columns are present.
- Row/provider side-effect result: email outbox rows stayed `227`, selected synthetic recipient rows stayed `0`, AP generated-document email rows stayed `0`, provider events stayed `0`, generated documents stayed `870`.
- AP endpoint/provider/email/ZATCA result: not called or run.
- Exact next prompt title: `DEV-08K Part 8C: AP email local schema gate evidence verification`.

## Next Thread Prompt

`DEV-08K Part 8C: AP email local schema gate evidence verification`

## DEV-08K Part 8C - AP Email Local Schema Gate Evidence Verification Completed

- DEV-08K Part 8C read-only verification is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; email outbox rows created: no; AP endpoint called: no; provider calls performed: no.
- Latest commit inspected: `29a58cd7 Apply DEV-08K AP email migration locally`; local `HEAD` matched `origin/main`.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`, schema `public`.
- Schema verification: `20260528100000_add_ap_generated_document_email_metadata` is applied locally and all seven AP email `EmailOutbox` metadata columns are present.
- Selected generated document verification: safe prefix `27a07429` remains `GENERATED`, document/source number `BILL-000423`, document type `PURCHASE_BILL`, source type `PurchaseBill`, source prefix `16e6f021`, filename `purchase-bill-BILL-000423.pdf`, MIME type `application/pdf`, size `3417`, hash prefix `47935bce9f75`.
- Row/provider verification: email outbox rows `227`, selected synthetic recipient rows `0`, AP generated-document email rows `0`, selected generated-document email rows `0`, provider events `0`, generated documents `870`.
- Temporary script check: no tracked or untracked `*dev08k*` temp scripts remain under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`.

## Next Thread Prompt

`DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`

## Current DEV-08K Continuation Pointer

- Latest completed DEV-08K prompt: `DEV-08K Part 19: AP generated-document email closure`.
- Current evidence file: [docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md](docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md).
- Exact next prompt title: `DEV-08L Part 1: AP fiscal-period and permission edge preflight`.

## Next Thread Prompt

`DEV-08L Part 1: AP fiscal-period and permission edge preflight`

## DEV-08K Part 13 - AP Email UI Design Preflight Completed

- DEV-08K Part 13 read-only UI design preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_UI_DESIGN_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_UI_DESIGN_PREFLIGHT.md).
- Runtime mutation performed: no; UI code changed: no; AP email endpoint called: no; provider calls performed: no; real email sent: no; login/browser performed: no.
- Latest commit inspected: `575e707d Verify DEV-08K AP email permissions`; local `HEAD` matched `origin/main`.
- Selected UI placement: `/documents` generated-document rows, because the page already has generated-document ids and safe archive metadata needed for `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- AP source detail pages stay source-context/download surfaces for now; email outbox settings remains the review/audit surface after local outbox creation.
- Permission gating plan: require `generatedDocuments.download`, `emailOutbox.view`, and the matching AP source view permission for source types `PurchaseOrder`, `PurchaseBill`, `SupplierPayment`, `SupplierRefund`, `PurchaseDebitNote`, and `CashExpense`.
- Safe wording plan: `Create local email outbox`, with helper/success copy stating local mock outbox only, no real email/provider send, and no PDF/body exposure.
- Expected restricted state: hide the AP email action when any required permission is missing, the document is unsupported, or status is not `GENERATED`.
- Part 14 approval phrase status: exact phrase was received up front in this continuation thread and must be re-validated before implementation.
- Exact next prompt title: `DEV-08K Part 14: approved local AP generated-document email UI implementation`.

## DEV-08K Part 14 - Approved Local AP Generated-Document Email UI Implementation Completed

- DEV-08K Part 14 implementation evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_UI_IMPLEMENTATION_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_UI_IMPLEMENTATION_EVIDENCE.md).
- Approval phrase status: exact Part 14 phrase received and checked before implementation.
- Runtime mutation performed: no; AP email endpoint called during tests: no; provider calls performed: no; real email sent: no; login/browser performed: no; schema changed: no.
- UI change: `/documents` generated-document rows now show `Create local email outbox` for eligible AP generated documents.
- Permission gating: row action requires `generatedDocuments.download`, `emailOutbox.view`, and matching AP source view permission for `PurchaseOrder`, `PurchaseBill`, `SupplierPayment`, `SupplierRefund`, `PurchaseDebitNote`, or `CashExpense`.
- Wording/safety: UI states local mock outbox only, no real email/provider send, and no PDF body is shown; success links to `/settings/email-outbox`.
- Tests passed: `corepack pnpm exec jest --config jest.config.cjs src/lib/documents.test.ts src/lib/email.test.ts --testPathPatterns=documents/page.test.tsx` with `3` suites and `18` tests passing.
- Extra lint attempt did not complete because unrelated untracked `apps/web/src/app/marketing.test.tsx` currently has a `HomePage` JSX type error; left untouched.
- Exposure controls: tests and UI did not surface email body, attachment body, PDF body, base64, provider payload, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, or CSID.
- Exact next prompt title: `DEV-08K Part 15: AP email UI evidence verification`.

## DEV-08K Part 15 - AP Email UI Evidence Verification Completed

- DEV-08K Part 15 read-only/code-level verification is recorded in [docs/development/DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; AP email endpoint called: no; provider calls performed: no; real email sent: no; login/browser performed: no.
- Latest commit inspected: `2c957516 Implement DEV-08K AP email UI`; local `HEAD` matched `origin/main`.
- UI verification result: `/documents` AP email action is rendered only through `canCreateApGeneratedDocumentEmail(document, can)`.
- Permission visibility result: targeted tests cover full-permission visibility and hidden states for missing `generatedDocuments.download`, missing `emailOutbox.view`, missing AP source view, unsupported source/document type, and non-`GENERATED` document.
- Targeted tests passed: `corepack pnpm exec jest --config jest.config.cjs src/lib/documents.test.ts src/lib/email.test.ts --testPathPatterns=documents/page.test.tsx` with `3` suites and `18` tests passing.
- Local read-only counts stayed unchanged after UI implementation tests: email outbox rows `228`, synthetic recipient rows `1`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`, generated documents `870`.
- Selected generated document safe prefix `27a07429` remained `GENERATED`.
- Exposure controls: no email body, attachment body, PDF body, base64, provider payload, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, or CSID was printed or surfaced.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 16: AP email local UI outbox QA preflight`.

## DEV-08K Part 16 - AP Email Local UI Outbox QA Preflight Completed

- DEV-08K Part 16 read-only preflight is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_QA_PREFLIGHT.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_QA_PREFLIGHT.md).
- Runtime mutation performed: no; AP email endpoint called: no; provider calls performed: no; real email sent: no; browser/login performed: no.
- Latest commit inspected: `794e119a Verify DEV-08K AP email UI`; local `HEAD` matched `origin/main`.
- Selected user: local seed demo admin `admin@example.com`, role `Owner`, permission count `132`, with `generatedDocuments.download`, `emailOutbox.view`, and `purchaseBills.view`.
- Selected generated document: safe prefix `27a07429`, status `GENERATED`, document/source number `BILL-000423`, document type `PURCHASE_BILL`, source type `PurchaseBill`, source prefix `16e6f021`.
- UI flow plan: `/documents`, filter to purchase-bill generated documents, enter synthetic `.test` recipient `dev08k-ap-20260528t000000-ui@ledgerbyte.local.test`, click `Create local email outbox`, and expect `POST /email/ap-generated-documents/:generatedDocumentId/outbox` with `recipientEmail` only.
- Runtime health snapshot: web `/documents` on `localhost:3000` returned `200`; local API `localhost:4000` was not listening, so Part 17 must start/recheck API health/readiness before login/action.
- Baseline counts: email outbox rows `228`, DEV-08K marker email rows `1`, AP generated-document email rows `1`, selected generated-document email rows `1`, provider events `0`, generated documents `870`, next synthetic recipient rows `0`.
- Expected Part 17 post-action counts: email outbox rows `229`, DEV-08K marker email rows `2`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, next synthetic recipient rows `1`.
- Part 17 approval phrase status: exact phrase was received up front and must be re-validated before the local UI outbox mutation.
- Exposure controls: no email body, attachment body, PDF body, request/response body, base64, source contact email, customer/vendor data, token, cookie, auth header, signed XML, QR payload, private key, CSID, provider payload, or database URL was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 17: approved local authenticated AP email UI outbox QA`.

## DEV-08K Part 17 - Approved Local Authenticated AP Email UI Outbox QA Completed

- DEV-08K Part 17 local UI outbox QA evidence is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_QA_EVIDENCE.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_QA_EVIDENCE.md).
- Approval phrase status: exact Part 17 phrase received up front and re-validated before the local UI outbox mutation.
- Runtime mutation performed: yes, exactly one local AP generated-document email outbox row; browser/login performed: yes, local-only; provider calls performed: no; real email sent: no.
- Latest commit inspected: `a91b144e Plan DEV-08K AP email UI outbox QA`; local `HEAD` matched `origin/main` before the Part 17 evidence work.
- UI flow result: local login succeeded, selected local organization was applied, `/documents` was filtered to `PURCHASE_BILL` and `GENERATED`, the synthetic recipient `dev08k-ap-20260528t000000-ui@ledgerbyte.local.test` was entered, `Create local email outbox` was clicked once, and `POST /email/ap-generated-documents/:generatedDocumentId/outbox` returned `201`.
- Count result: email outbox rows `228 -> 229`, DEV-08K marker email rows `1 -> 2`, AP generated-document email rows `1 -> 2`, selected generated-document email rows `1 -> 2`, provider events `0 -> 0`, generated documents `870 -> 870`, synthetic recipient rows `0 -> 1`.
- Created outbox row: safe prefix `b61d54e2`, status `SENT_MOCK`, provider `mock-no-send`, generated document safe prefix `27a07429`, source type `PurchaseBill`, source prefix `16e6f021`, attachment filename `purchase-bill-BILL-000423.pdf`, byte count `3417`, content hash prefix `47935bce9f75`, attempt count `0`, max attempts `0`, sent at `null`, provider message id `null`.
- Selected generated document safe prefix `27a07429` remained `GENERATED` with byte count `3417` and content hash prefix `47935bce9f75`.
- Audit evidence: one expected local `AUTH_LOGIN` audit row in the run window for actor safe prefix `09f892d4` and organization safe prefix `00000000`.
- Exposure controls: no password, token, cookie, auth header, request body, response body, email body, attachment body, PDF body, base64, provider payload, source contact email, customer/vendor data, signed XML, QR payload, private key, or CSID was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08K Part 18: AP email local UI outbox evidence verification`.

## DEV-08K Part 18 - AP Email Local UI Outbox Evidence Verification Completed

- DEV-08K Part 18 read-only verification is recorded in [docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_EVIDENCE_VERIFICATION.md](docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; browser/login performed: no; AP email endpoint called: no; provider calls performed: no; real email sent: no.
- Latest commit inspected: `df1079cd Check DEV-08K AP email UI outbox locally`; local `HEAD` matched `origin/main`.
- Verification result: exactly one UI-created synthetic recipient row exists for generated document safe prefix `27a07429` and outbox safe prefix `b61d54e2`.
- Count result: email outbox rows `229`, DEV-08K marker email rows `2`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, generated documents `870`, synthetic recipient rows `1`, selected-document synthetic recipient rows `1`, attachment metadata rows `1`.
- Outbox row result: status `SENT_MOCK`, provider `mock-no-send`, attempt count `0`, max attempts `0`, sent at `null`, provider message id `null`, attachment filename `purchase-bill-BILL-000423.pdf`, byte count `3417`, content hash prefix `47935bce9f75`.
- Selected generated document safe prefix `27a07429` remains `GENERATED` with byte count `3417` and content hash prefix `47935bce9f75`.
- Login audit evidence: local `AUTH_LOGIN` rows exist for actor safe prefix `09f892d4` and organization safe prefix `00000000`; Part 17's successful runner counted one row in its successful-action window, while the broader Part 18 window also includes stopped/diagnostic local browser logins.
- Exposure controls: no password, token, cookie, auth header, request body, response body, email body, attachment body, PDF body, base64, provider payload, source contact email, customer/vendor data, signed XML, QR payload, private key, or CSID was printed.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`; Part 18 used a piped read-only verifier and created no disposable script file.
- Exact next prompt title: `DEV-08K Part 19: AP generated-document email closure`.

## DEV-08K Part 19 - AP Generated-Document Email Closure Completed

- DEV-08K closure is recorded in [docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md](docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md).
- Runtime mutation performed by closure: no; login/browser/API/outbox action performed by closure: no; provider calls or real email sends performed by closure: no.
- Latest commit inspected: `dfa7a24e Verify DEV-08K AP email UI outbox`; local `HEAD` matched `origin/main` before closure edits.
- What DEV-08K proved: dedicated AP generated-document email outbox schema/types, local-only migration gate, mock/no-send service/controller behavior, one service-level outbox fixture, permission negative checks, `/documents` UI implementation, one authenticated local UI outbox creation, and read-only evidence verification.
- Final local counts: email outbox rows `229`, DEV-08K marker email rows `2`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, generated documents `870`, selected UI synthetic recipient rows `1`.
- Selected generated document safe prefix `27a07429` remains `GENERATED`, document/source number `BILL-000423`, source prefix `16e6f021`, byte count `3417`, content hash prefix `47935bce9f75`.
- UI-created outbox row safe prefix `b61d54e2` remains `SENT_MOCK` with provider `mock-no-send`, zero attempts, `sentAt` `null`, provider message id `null`, and matching attachment metadata.
- Earlier service-level outbox fixture safe prefix `3c19700b` remains `SENT_MOCK` with provider `mock-no-send` for the same generated document/source metadata.
- Remaining gaps: real email provider delivery/retry/webhook/domain policy, cleanup retention/deletion, duplicate generated-document output policy, fiscal-period blockers, broader AP permission edge cases, production/beta/customer-data behavior, real ZATCA, full E2E, full smoke, full build, and full repo tests.
- Temporary script cleanup: no tracked or untracked `*dev08k*` script remains under `apps/api/scripts`.
- Exact next prompt title: `DEV-08L Part 1: AP fiscal-period and permission edge preflight`.

## DEV-08L Part 1 - AP Fiscal-Period And Permission Edge Preflight Completed

- DEV-08L Part 1 read-only preflight is recorded in [docs/development/DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md](docs/development/DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md).
- Runtime mutation performed: no; fiscal period mutation performed: no; fixture creation performed: no; AP service mutation performed: no; login/browser performed: no; output/email/ZATCA/provider action performed: no.
- Latest commit inspected: `c8547f7a Close DEV-08K AP email evidence`; local `HEAD` matched `origin/main`.
- Fiscal guard inventory: purchase bill finalize/void, supplier payment create/void, supplier refund create/void, purchase debit note finalize/void, cash expense create/void, and purchase receipt asset post/reverse use fiscal posting guards; purchase orders, purchase receipt create/void, supplier payment unapplied apply/reverse, and purchase debit note apply/reverse do not use fiscal posting guards.
- Permission edge inventory: AP state-changing controllers use dedicated family permissions; AP source PDF/generate paths require source view plus `generatedDocuments.download`; AP generated-document email requires `emailOutbox.view`, `generatedDocuments.download`, and matching AP source view; `admin.fullAccess` remains the shared full-access bypass.
- Fixture strategy: Part 2 should recheck the local DB target and fiscal-period landscape, create marker-scoped local-only closed/open fiscal period fixtures, create AP source/control records, and create restricted roles/users without production, beta, customer data, real email, real ZATCA, output body exposure, seed/reset/delete, deploy, or env/provider changes.
- Exact approval phrase status: not received exactly in the current user message; generic approval is recorded as insufficient for mutation prompts.
- Exact next prompt title: `DEV-08L Part 2: approved local AP fiscal-period and permission fixture mutation`.

## Next Thread Prompt

`DEV-08L Part 2: approved local AP fiscal-period and permission fixture mutation`

## DEV-08L Part 2 - Approved Local AP Fiscal-Period And Permission Fixture Mutation Completed

- DEV-08L Part 2 mutation evidence is recorded in [docs/development/DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md).
- Exact approval phrase status: received and checked before mutation.
- Runtime mutation performed: yes, local disposable fixture creation only.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; no production, beta, hosted/shared target, or customer data was used.
- Dedicated fixture organization safe prefix: `cdc2c778`; owner actor safe prefix: `dda4ee99`.
- Fiscal periods: closed May 2026 safe prefix `6cb54c20`, open June 2026 safe prefix `ee20b288`.
- Fixture source state: purchase bill draft/finalized, supplier payment/refund, purchase debit note draft/finalized, cash expense, purchase receipts, purchase order, restricted roles/users, inventory settings, and support accounts/items/warehouse were created under marker `DEV08L-AP-20260529T000000`.
- Baseline counts: fiscal periods `2`, roles/users `11`, purchase bills `4`, supplier payments `3`, supplier refunds `1`, purchase debit notes `2`, cash expenses `1`, purchase receipts `2`, purchase orders `1`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary runner `apps/api/scripts/dev08l-part2-fixture-mutation.temp.ts` was deleted after execution.
- Exact next prompt title: `DEV-08L Part 3: AP fiscal-period and permission fixture evidence verification`.

## Next Thread Prompt

`DEV-08L Part 3: AP fiscal-period and permission fixture evidence verification`

## DEV-08L Part 3 - AP Fiscal-Period And Permission Fixture Evidence Verification Completed

- DEV-08L Part 3 read-only verification is recorded in [docs/development/DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; login/browser/API mutation/output/email/ZATCA/provider action performed: no.
- Latest commit inspected: `6301d9ff Create DEV-08L AP fiscal permission fixtures`; local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Fiscal periods verified: closed May 2026 safe prefix `6cb54c20`, open June 2026 safe prefix `ee20b288`.
- Fixture records verified with expected statuses and safe prefixes, including purchase bill `81912f0b` draft closed-period finalize fixture, purchase bill `a4ab2c11` finalized void fixture, supplier payment/refund fixtures, purchase debit note fixtures, cash expense fixture, purchase receipt fixtures, and purchase order permission fixture.
- Baseline counts still matched Part 2: audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary script check: no `dev08l` temporary scripts remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08L Part 4: purchase bill fiscal-period blocker preflight`.

## Next Thread Prompt

`DEV-08L Part 4: purchase bill fiscal-period blocker preflight`

## DEV-08L Part 4 - Purchase Bill Fiscal-Period Blocker Preflight Completed

- DEV-08L Part 4 read-only preflight is recorded in [docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_PREFLIGHT.md](docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no; purchase bill service calls performed: no.
- Latest commit inspected: `8c2c3599 Verify DEV-08L AP fiscal permission fixtures`.
- Selected finalize fixture: purchase bill safe prefix `81912f0b`, status `DRAFT`, date `2026-05-12`, expected closed-period blocker before finalization/journal.
- Selected void fixture: purchase bill safe prefix `a4ab2c11`, status `FINALIZED`, date `2026-06-12`, expected current-date closed-period blocker before void/reversal journal.
- Baseline counts before Part 5: purchase bills `4`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Exact Part 5 approval phrase status: received up front and must be re-validated before the local negative checks.
- Exact next prompt title: `DEV-08L Part 5: approved local purchase bill fiscal-period blocker negative checks`.

## Next Thread Prompt

`DEV-08L Part 5: approved local purchase bill fiscal-period blocker negative checks`

## DEV-08L Part 5 - Approved Local Purchase Bill Fiscal-Period Blocker Negative Checks Completed

- DEV-08L Part 5 evidence is recorded in [docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation attempted: yes, limited to the two approved local purchase bill service calls selected by Part 4; successful mutation performed: no.
- Latest commit inspected: `51060165 Plan DEV-08L purchase bill fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`, actor safe prefix `dda4ee99`.
- `PurchaseBillService.finalize(...)` for `DEV08L-PB-CLOSED-FINALIZE` safe prefix `81912f0b` was blocked with `Posting date falls in a closed fiscal period.`
- `PurchaseBillService.void(...)` for `DEV08L-PB-VOID-OPEN` safe prefix `a4ab2c11` was blocked with `Posting date falls in a closed fiscal period.`
- Purchase bill statuses remained `DRAFT` and `FINALIZED`; journal entries remained `10`; audit logs, email outbox, generated documents, provider events, ZATCA invoice metadata, and ZATCA submission logs remained `0`.
- Temporary runner `apps/api/scripts/dev08l-part5-purchase-bill-blockers.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 6: purchase bill fiscal-period blocker evidence verification`.

## Next Thread Prompt

`DEV-08L Part 6: purchase bill fiscal-period blocker evidence verification`

## DEV-08L Part 6 - Purchase Bill Fiscal-Period Blocker Evidence Verification Completed

- DEV-08L Part 6 read-only verification is recorded in [docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08L_PURCHASE_BILL_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; purchase bill service calls performed: no.
- Latest commit inspected: `4659410d Check DEV-08L purchase bill fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Part 5 evidence contains both selected service calls and the expected message `Posting date falls in a closed fiscal period.`
- Purchase bill `DEV08L-PB-CLOSED-FINALIZE` safe prefix `81912f0b` remained `DRAFT` with no journal.
- Purchase bill `DEV08L-PB-VOID-OPEN` safe prefix `a4ab2c11` remained `FINALIZED` with journal present and no reversal journal.
- Counts remained unchanged: purchase bills `4`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Corrected temporary verifier `apps/api/scripts/dev08l-part6-purchase-bill-verification.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 7: supplier payment refund fiscal blocker preflight`.

## Next Thread Prompt

`DEV-08L Part 7: supplier payment refund fiscal blocker preflight`

## DEV-08L Part 7 - Supplier Payment Refund Fiscal Blocker Preflight Completed

- DEV-08L Part 7 read-only preflight is recorded in [docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_PREFLIGHT.md](docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no; supplier payment/refund service blocker calls performed: no.
- Latest commit inspected: `54684410 Verify DEV-08L purchase bill fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Selected Part 8 checks: supplier payment create on closed date, supplier payment void for safe prefix `59c3a992`, supplier refund create from source payment safe prefix `6fa2b089`, and supplier refund void for safe prefix `67a8f011`.
- Baseline statuses: selected supplier payments remained `POSTED`; selected supplier refund remained `POSTED`; all selected records had journals and no void reversal journals.
- Baseline counts before Part 8: supplier payments `3`, supplier refunds `1`, supplier payment allocations `0`, supplier payment unapplied allocations `0`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Exact Part 8 approval phrase status: received up front and must be re-validated before the local negative checks.
- Temporary read-only preflight runner `apps/api/scripts/dev08l-part7-supplier-payment-refund-preflight.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 8: approved local supplier payment refund fiscal-period blocker negative checks`.

## Next Thread Prompt

`DEV-08L Part 8: approved local supplier payment refund fiscal-period blocker negative checks`

## DEV-08L Part 8 - Approved Local Supplier Payment Refund Fiscal-Period Blocker Negative Checks Completed

- DEV-08L Part 8 evidence is recorded in [docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation attempted: yes, limited to the four approved local supplier payment/refund service calls selected by Part 7; successful mutation performed: no.
- Latest commit inspected: `cbc99645 Plan DEV-08L supplier payment refund fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`, actor safe prefix `dda4ee99`.
- `SupplierPaymentService.create(...)`, `SupplierPaymentService.void(...)`, `SupplierRefundService.create(...)`, and `SupplierRefundService.void(...)` were each blocked with `Posting date falls in a closed fiscal period.`
- Supplier payments `DEV08L-SP-VOID`, `DEV08L-SP-REFUND-CREATE-SOURCE`, and `DEV08L-SP-REFUND-VOID-SOURCE` remained `POSTED` with unapplied amount `100` and no void reversal journal.
- Supplier refund `DEV08L-SRF-VOID` remained `POSTED` with source payment safe prefix `908f37de` and no void reversal journal.
- Counts remained unchanged: supplier payments `3`, supplier refunds `1`, supplier payment allocations `0`, supplier payment unapplied allocations `0`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary runner `apps/api/scripts/dev08l-part8-supplier-payment-refund-blockers.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 9: supplier payment refund fiscal blocker evidence verification`.

## Next Thread Prompt

`DEV-08L Part 9: supplier payment refund fiscal blocker evidence verification`

## DEV-08L Part 9 - Supplier Payment Refund Fiscal Blocker Evidence Verification Completed

- DEV-08L Part 9 read-only verification is recorded in [docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; supplier payment/refund service calls performed: no.
- Latest commit inspected: `ed1130ff Check DEV-08L supplier payment refund fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Part 8 evidence contains all four selected service calls and the expected message `Posting date falls in a closed fiscal period.`
- Supplier payments `DEV08L-SP-VOID`, `DEV08L-SP-REFUND-CREATE-SOURCE`, and `DEV08L-SP-REFUND-VOID-SOURCE` remained `POSTED`, with unapplied amount `100`, journals present, and no void reversal journals.
- Supplier refund `DEV08L-SRF-VOID` remained `POSTED`, amount refunded `25`, journal present, and no void reversal journal.
- Counts remained unchanged: supplier payments `3`, supplier refunds `1`, supplier payment allocations `0`, supplier payment unapplied allocations `0`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Corrected temporary verifier `apps/api/scripts/dev08l-part9-supplier-payment-refund-verification.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 10: purchase debit note cash expense receipt fiscal blocker preflight`.

## Next Thread Prompt

`DEV-08L Part 10: purchase debit note cash expense receipt fiscal blocker preflight`

## DEV-08L Part 10 - Purchase Debit Note Cash Expense Receipt Fiscal Blocker Preflight Completed

- DEV-08L Part 10 read-only preflight is recorded in [docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_PREFLIGHT.md](docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_PREFLIGHT.md).
- Runtime mutation performed: no; PDN/cash expense/purchase receipt service blocker calls performed: no.
- Latest commit inspected: `7de18205 Verify DEV-08L supplier payment refund fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Selected Part 11 checks: PDN finalize `c04b06e9`, PDN void `5153102f`, cash expense create on closed date, cash expense void `ec4b1e2c`, receipt asset post `515854c6`, and receipt asset reversal `34123df3`.
- Not selected: PDN apply/reverse allocation and purchase receipt create/void because inspected code does not call the fiscal guard for those paths and running them would be unguarded mutation work.
- Baseline counts before Part 11: purchase debit notes `2`, purchase debit note allocations `0`, cash expenses `1`, purchase receipts `2`, stock movements `2`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Exact Part 11 approval phrase status: received up front and must be re-validated before the local negative checks.
- Temporary read-only preflight runner `apps/api/scripts/dev08l-part10-pdn-cash-receipt-preflight.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 11: approved local PDN cash expense receipt fiscal-period blocker negative checks`.

## Next Thread Prompt

`DEV-08L Part 11: approved local PDN cash expense receipt fiscal-period blocker negative checks`

## DEV-08L Part 11 - Approved Local PDN Cash Expense Receipt Fiscal-Period Blocker Negative Checks Completed

- DEV-08L Part 11 evidence is recorded in [docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation attempted: yes, limited to the six approved local PDN/cash expense/purchase receipt service calls selected by Part 10; successful mutation performed: no.
- Latest commit inspected: `5c54c718 Plan DEV-08L PDN cash receipt fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`, actor safe prefix `dda4ee99`.
- `PurchaseDebitNoteService.finalize(...)`, `PurchaseDebitNoteService.void(...)`, `CashExpenseService.create(...)`, `CashExpenseService.void(...)`, `PurchaseReceiptService.postInventoryAsset(...)`, and `PurchaseReceiptService.reverseInventoryAsset(...)` were each blocked with `Posting date falls in a closed fiscal period.`
- PDN `DEV08L-PDN-CLOSED-FINALIZE` remained `DRAFT`; PDN `DEV08L-PDN-VOID-OPEN` remained `FINALIZED`; cash expense `DEV08L-CE-VOID` remained `POSTED`; receipts `DEV08L-PR-ASSET-CLOSED` and `DEV08L-PR-REVERSE-OPEN` remained `POSTED`.
- Counts remained unchanged: purchase debit notes `2`, purchase debit note allocations `0`, cash expenses `1`, purchase receipts `2`, stock movements `2`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary runner `apps/api/scripts/dev08l-part11-pdn-cash-receipt-blockers.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 12: PDN cash expense receipt fiscal blocker evidence verification`.

## Next Thread Prompt

`DEV-08L Part 12: PDN cash expense receipt fiscal blocker evidence verification`

## DEV-08L Part 12 - PDN Cash Expense Receipt Fiscal Blocker Evidence Verification Completed

- DEV-08L Part 12 read-only verification is recorded in [docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md](docs/development/DEV_08L_PDN_CASH_EXPENSE_RECEIPT_FISCAL_BLOCKER_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; PDN/cash expense/purchase receipt service calls performed: no.
- Latest commit inspected: `2d0a667a Check DEV-08L PDN cash receipt fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Part 11 evidence contains all six selected service calls and the expected message `Posting date falls in a closed fiscal period.`
- PDN `DEV08L-PDN-CLOSED-FINALIZE` remained `DRAFT`; PDN `DEV08L-PDN-VOID-OPEN` remained `FINALIZED`; cash expense `DEV08L-CE-VOID` remained `POSTED`; receipts `DEV08L-PR-ASSET-CLOSED` and `DEV08L-PR-REVERSE-OPEN` remained `POSTED`.
- Counts remained unchanged: purchase debit notes `2`, purchase debit note allocations `0`, cash expenses `1`, purchase receipts `2`, stock movements `2`, journal entries `10`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Corrected temporary verifier `apps/api/scripts/dev08l-part12-pdn-cash-receipt-verification.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 13: AP state-changing permission edge preflight`.

## Next Thread Prompt

`DEV-08L Part 13: AP state-changing permission edge preflight`

## DEV-08L Part 13 - AP State-Changing Permission Edge Preflight Completed

- DEV-08L Part 13 read-only preflight is recorded in [docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_PREFLIGHT.md](docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_PREFLIGHT.md).
- Runtime mutation performed: no; AP service/controller mutation performed: no.
- Latest commit inspected: `f5e7826b Verify DEV-08L PDN cash receipt fiscal blockers`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Selected Part 14 shape: guard-only negative checks through `PermissionGuard.canActivate(...)` plus `assertGeneratedDocumentDownloadPermission(...)`; no login, JWT, browser, AP service call, API endpoint continuation, output generation, email, or ZATCA.
- Selected denied permissions cover purchase bill finalize/void, supplier payment create/void, supplier refund create/void, purchase debit note finalize/apply/void, cash expense create/void, purchase receipt create/void/asset post/asset reversal, purchase order approve/void/convert-to-bill, generated-document download helper, and AP email outbox permission.
- Positive control: `DEV08L Admin FullAccess` should allow `purchaseOrders.convertToBill` through the guard.
- Baseline counts before Part 14: roles `11`, organization members `11`, users with fixture memberships `11`, audit logs `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Exact Part 14 approval phrase status: received up front and must be re-validated before the local negative checks.
- Temporary read-only preflight runner `apps/api/scripts/dev08l-part13-permission-edge-preflight.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 14: approved local AP state-changing permission edge negative checks`.

## Next Thread Prompt

`DEV-08L Part 14: approved local AP state-changing permission edge negative checks`

## DEV-08L Part 14 - Approved Local AP State-Changing Permission Edge Negative Checks Completed

- DEV-08L Part 14 evidence is recorded in [docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_NEGATIVE_CHECK_EVIDENCE.md](docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_NEGATIVE_CHECK_EVIDENCE.md).
- Runtime mutation attempted: no AP service mutation was invoked; this run used `PermissionGuard.canActivate(...)` and `assertGeneratedDocumentDownloadPermission(...)` only.
- Latest commit inspected: `c3c2550f Plan DEV-08L AP state permission edges`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Twenty restricted guard/helper checks were blocked with the expected permission messages, covering purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, purchase receipt, purchase order, generated-document download, and AP email outbox permission edges.
- Positive control: `DEV08L Admin FullAccess` allowed `purchaseOrders.convertToBill`.
- Counts remained unchanged: purchase bills `4`, supplier payments `3`, supplier refunds `1`, purchase debit notes `2`, cash expenses `1`, purchase receipts `2`, purchase orders `1`, journal entries `10`, audit logs `0`, auth tokens `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary runner `apps/api/scripts/dev08l-part14-permission-edge-checks.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 15: AP state-changing permission edge evidence verification`.

## Next Thread Prompt

`DEV-08L Part 15: AP state-changing permission edge evidence verification`

## DEV-08L Part 15 - AP State-Changing Permission Edge Evidence Verification Completed

- DEV-08L Part 15 read-only verification is recorded in [docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_EVIDENCE_VERIFICATION.md](docs/development/DEV_08L_AP_STATE_PERMISSION_EDGE_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; AP service/controller mutation performed: no.
- Latest commit inspected: `86d40b55 Check DEV-08L AP state permission edges`.
- Local target remained protocol `postgresql`, host `localhost`, port `5432`, database `accounting`; fixture organization safe prefix `cdc2c778`.
- Part 14 evidence records denied check count `20`, allowed control count `1`, the generic permission denial, the generated-document PDF permission denial, and the `admin.fullAccess` control.
- Counts remained unchanged: purchase bills `4`, supplier payments `3`, supplier refunds `1`, purchase debit notes `2`, cash expenses `1`, purchase receipts `2`, purchase orders `1`, journal entries `10`, audit logs `0`, auth tokens `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Corrected temporary verifier `apps/api/scripts/dev08l-part15-permission-edge-verification.temp.ts` was deleted; `Test-Path` returned `False`.
- Exact next prompt title: `DEV-08L Part 16: AP fiscal permission edge closure`.

## Next Thread Prompt

`DEV-08L Part 16: AP fiscal permission edge closure`

## DEV-08L Part 16 - AP Fiscal Permission Edge Closure Completed

- DEV-08L closure is recorded in [docs/development/DEV_08L_AP_FISCAL_PERMISSION_EDGE_CLOSURE.md](docs/development/DEV_08L_AP_FISCAL_PERMISSION_EDGE_CLOSURE.md).
- Runtime mutation performed by closure: no; login/browser/output/email/ZATCA/provider/deploy/env action performed: no.
- Latest commit inspected: `4068be5c Verify DEV-08L AP state permission edges`.
- Fiscal blocker result: twelve selected AP fiscal blocker calls across purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and purchase receipt asset posting/reversal returned `Posting date falls in a closed fiscal period.`
- Permission edge result: twenty restricted guard/helper checks blocked with expected permission messages, and the `admin.fullAccess` control allowed `purchaseOrders.convertToBill`.
- Final side-effect state stayed contained: journal entries `10`, audit logs `0`, auth tokens `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Remaining gaps: cleanup/retention/delete policy, duplicate generated-document product policy, real email provider delivery/retry/webhooks/domain policy, production/beta/customer-data behavior, broad E2E/smoke, and advanced purchase/inventory/accounting gaps.
- Updated [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md) and [BUG_AUDIT.md](BUG_AUDIT.md) to record DEV-08L closure and remaining gaps.
- Exact next prompt title: `DEV-08M Part 1: AP cleanup retention and fixture cleanup policy preflight`.

## Next Thread Prompt

`DEV-08M Part 1: AP cleanup retention and fixture cleanup policy preflight`

## DEV-08M Part 1 - AP Cleanup Retention And Fixture Cleanup Policy Preflight Completed

- DEV-08M Part 1 read-only preflight is recorded in [docs/development/DEV_08M_AP_CLEANUP_RETENTION_PREFLIGHT.md](docs/development/DEV_08M_AP_CLEANUP_RETENTION_PREFLIGHT.md).
- Runtime mutation performed: no; cleanup/delete/archive/revoke action performed: no.
- Latest commit inspected: `c326d491 Close DEV-08L AP fiscal permission evidence`; `origin/main` matched `c326d491998e9b2f8c9dacca48f067ff422559c4`.
- Inventoried DEV-08 through DEV-08L AP fixture markers and classified accounting source documents, journals, allocations, receipts/stock movements, generated documents, email outbox/provider events, audit/auth logs, users/roles/memberships, and ZATCA metadata/logs.
- Retention decision: preserve DEV-08 evidence fixtures by default; hard deletion is forbidden by default; Part 2 may only run local marker-scoped count-only dry-run inventory.
- Cleanup executor strategy: refuse non-local targets, require explicit marker, default to dry-run, print counts only, avoid bodies/secrets/customer data, and require a later separate approval before any destructive delete/update/archive/revoke path exists.
- Exact Part 2 approval phrase status: received up front and must be re-validated before the local read-only dry-run.
- Unrelated untracked web/marketing and graphify paths were observed and left untouched.
- Exact next prompt title: `DEV-08M Part 2: approved local AP cleanup inventory dry-run`.

## Next Thread Prompt

`DEV-08M Part 2: approved local AP cleanup inventory dry-run`

## DEV-08M Part 2 - Approved Local AP Cleanup Inventory Dry-Run Completed

- DEV-08M Part 2 dry-run evidence is recorded in [docs/development/DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE.md](docs/development/DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE.md).
- Runtime mutation performed: no; deletion/update/archive/revoke/cleanup performed: no.
- Latest commit inspected: `41b38c41 Plan DEV-08M AP cleanup retention`.
- Exact Part 2 approval phrase was provided and re-validated before the dry-run.
- Local target was `postgresql` on `localhost:5432/accounting`; Docker Desktop and local `postgres`/`redis` compose services were started because the Windows PostgreSQL service could not be started from this session.
- Dry-run result: all `12` DEV-08 through DEV-08L markers detected; before/after table totals unchanged; body/secret output printed `false`.
- Count-only inventory totals: AP source documents `64`, source lines `25`, journals/journal lines `67`, allocations/reversals `2`, receipts/stock movements `9`, generated documents by source `24`, email outbox rows by source/document `4`, provider events for generated-document emails `0`, audit logs by AP source ids `110`, ZATCA marker hits `0`, users/roles/memberships marker hits `6`.
- Preserve/delete classification: all inventoried evidence families remain preserve-by-default; deletion candidates `0`; deletion approved `false`.
- Temporary runner `apps/api/scripts/dev08m-part2-cleanup-inventory-dry-run.temp.ts` was deleted; `Test-Path` returned `False`; no `*dev08m*` temp scripts remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08M Part 3: AP cleanup inventory dry-run evidence verification`.

## Next Thread Prompt

`DEV-08M Part 3: AP cleanup inventory dry-run evidence verification`

## DEV-08M Part 3 - AP Cleanup Inventory Dry-Run Evidence Verification Completed

- DEV-08M Part 3 verification is recorded in [docs/development/DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE_VERIFICATION.md](docs/development/DEV_08M_AP_CLEANUP_INVENTORY_DRY_RUN_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; deletion/update/archive/revoke/cleanup performed: no.
- Latest commit inspected: `3b3c269f Inventory DEV-08M AP cleanup candidates`.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Verification result: all `12` markers detected; live count-only inventory matched Part 2 evidence; entity counts stayed unchanged during verification; body/secret/customer-data output printed `false`.
- Reverified totals: AP source documents `64`, source lines `25`, journals/journal lines `67`, allocations/reversals `2`, receipts/stock movements `9`, generated documents by source `24`, email outbox rows by source/document `4`, provider events for generated-document emails `0`, audit logs by AP source ids `110`, ZATCA marker hits `0`, users/roles/memberships marker hits `6`.
- Temporary verifier `apps/api/scripts/dev08m-part3-dry-run-verification.temp.ts` was deleted; `Test-Path` returned `False`; no `*dev08m*` temp scripts remained under `apps/api/scripts`.
- Exact next prompt title: `DEV-08M Part 4: generated-document duplicate output policy preflight`.

## Next Thread Prompt

`DEV-08M Part 4: generated-document duplicate output policy preflight`

## DEV-08M Part 4 - Generated-Document Duplicate Output Policy Preflight Completed

- DEV-08M Part 4 read-only policy preflight is recorded in [docs/development/DEV_08M_GENERATED_DOCUMENT_DUPLICATE_OUTPUT_POLICY_PREFLIGHT.md](docs/development/DEV_08M_GENERATED_DOCUMENT_DUPLICATE_OUTPUT_POLICY_PREFLIGHT.md).
- Runtime mutation performed: no; code change performed: no; PDF generation/download, email, ZATCA, cleanup/delete/archive/revoke, deploy, migration, seed/reset/delete, production, beta, or customer-data action performed: no.
- Latest commit inspected: `d83c1a8d Verify DEV-08M AP cleanup inventory dry run`.
- Code inspection result: `GeneratedDocumentService.archivePdf(...)` is append-only create behavior; AP purchase order, purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense output paths render a fresh PDF and archive a new generated-document row.
- Prior DEV-08H/DEV-08J evidence showed repeated AP output generation creates another archive row, and repeated outputs did not match prior hashes.
- Paid v1 policy decision: treat repeated generated-document rows as append-only versioned archive behavior for now; preserve all rows by default and defer reuse/supersede/latest-version UX to a future product ticket.
- Exact Part 5 approval phrase was available but not used because no narrow code change is recommended; Part 5 and Part 6 are skipped.
- Exact next prompt title: `DEV-08M Part 7: AP cleanup executor preflight`.

## Next Thread Prompt

`DEV-08M Part 7: AP cleanup executor preflight`

## DEV-08M Part 7 - AP Cleanup Executor Preflight Completed

- DEV-08M Part 7 read-only cleanup executor preflight is recorded in [docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_PREFLIGHT.md](docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_PREFLIGHT.md).
- Runtime cleanup performed: no; deletion/update/archive/revoke performed: no; production, beta, customer-data, deploy, migration, seed/reset/delete, real email, real ZATCA, backup/restore, login, export, download, or body-reading action performed: no.
- Latest commit inspected: `74c31221 Plan DEV-08M duplicate output policy`.
- Decision: implement a committed local-only, dry-run-only AP cleanup planner in Part 8 so the Part 2/3 count-only inventory is repeatable without any destructive path.
- Recommended Part 8 scope: add a tested planner script under `apps/api/scripts`, require exact marker `DEV08M-AP-20260529T000000`, require explicit local DB target, ignore generic `DATABASE_URL`, refuse hosted/non-local/destructive terms, print counts only, and keep all evidence preserve-by-default.
- No deletion executor is recommended or approved in DEV-08M.
- Exact Part 8 approval phrase status: already received exactly from the user.
- Exact next prompt title: `DEV-08M Part 8: approved local AP cleanup executor dry-run script implementation`.

## Next Thread Prompt

`DEV-08M Part 8: approved local AP cleanup executor dry-run script implementation`

## DEV-08M Part 8 - Approved Local AP Cleanup Executor Dry-Run Script Implementation Completed

- DEV-08M Part 8 implementation evidence is recorded in [docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_IMPLEMENTATION_EVIDENCE.md](docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_IMPLEMENTATION_EVIDENCE.md).
- Runtime mutation performed: no; deletion/update/archive/revoke performed: no; production, beta, customer-data, deploy, migration, seed/reset/delete, real email, real ZATCA, backup/restore, login, export, download, or body/secret output action performed: no.
- Latest commit inspected: `390f094b Plan DEV-08M AP cleanup executor`.
- Implemented `apps/api/scripts/dev08m-ap-cleanup-planner.ts` with exact-marker validation, explicit local DB target classification, generic `DATABASE_URL` avoidance, hosted/forbidden target refusal, destructive argument refusal, and count-only dry-run output.
- Added `apps/api/scripts/dev08m-ap-cleanup-planner.spec.ts` plus plan/dry-run package scripts only; no execute/delete helper was added.
- Targeted Jest passed for the new planner spec.
- Local dry-run against `localhost:5432/accounting` printed counts only, with `dryRun=true`, `noMutation=true`, `noDeletion=true`, `deletionPathImplemented=false`, `cleanupExecuted=false`, and `bodyOrSecretOutputPrinted=false`.
- Exact next prompt title: `DEV-08M Part 9: AP cleanup executor dry-run evidence verification`.

## Next Thread Prompt

`DEV-08M Part 9: AP cleanup executor dry-run evidence verification`

## DEV-08M Part 9 - AP Cleanup Executor Dry-Run Evidence Verification Completed

- DEV-08M Part 9 verification is recorded in [docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_EVIDENCE_VERIFICATION.md](docs/development/DEV_08M_AP_CLEANUP_EXECUTOR_DRY_RUN_EVIDENCE_VERIFICATION.md).
- Runtime mutation performed: no; deletion/update/archive/revoke performed: no; production, beta, customer-data, deploy, migration, seed/reset/delete, real email, real ZATCA, backup/restore, login, export, download, or body/secret output action performed: no.
- Latest commit inspected: `96ad90ea Implement DEV-08M cleanup dry-run planner`.
- Targeted planner tests passed: `17` tests.
- Hosted target refusal and destructive `--delete` refusal checks passed.
- Write-path scan found no create/update/upsert/delete/deleteMany/updateMany/createMany, no `$executeRaw`, and no `$transaction`; only `$queryRawUnsafe` count queries were present.
- Before/after table counts matched around a local dry-run; dry-run output included `noDeletion=true`, `deletionPathImplemented=false`, and `COUNT-ONLY OUTPUT`, and did not print the database URL.
- Exact next prompt title: `DEV-08M Part 10: AP cleanup retention closure`.

## Next Thread Prompt

`DEV-08M Part 10: AP cleanup retention closure`

## DEV-08M Part 10 - AP Cleanup Retention Closure Completed

- DEV-08M closure is recorded in [docs/development/DEV_08M_AP_CLEANUP_RETENTION_CLOSURE.md](docs/development/DEV_08M_AP_CLEANUP_RETENTION_CLOSURE.md).
- Runtime cleanup performed: no; deletion/update/archive/revoke performed: no; production, beta, customer-data, deploy, migration, seed/reset/delete, real email, real ZATCA, backup/restore, login, export, download, or body/secret output action performed: no.
- Latest commit inspected: `6a444112 Verify DEV-08M cleanup dry-run planner`.
- Cleanup/retention policy: preserve DEV-08 through DEV-08L local AP evidence fixtures by default; hard deletion is forbidden by default; any future destructive cleanup needs a separate product/legal/audit design and new exact approval.
- Dry-run inventory: Part 2/3 count-only evidence detected `12` markers, AP source documents `64`, source lines `25`, journals/journal lines `67`, allocations/reversals `2`, receipts/stock movements `9`, generated documents `24`, email outbox rows `4`, provider events `0`, audit logs `110`, ZATCA marker hits `0`, and users/roles/memberships `6`.
- Duplicate-output policy: repeated generated-document rows are append-only versioned archive behavior for paid v1; Part 5/6 were skipped because no code change was recommended.
- Cleanup planner status: `apps/api/scripts/dev08m-ap-cleanup-planner.ts` is implemented and verified as local-only, dry-run-only, count-only, exact-marker gated, and without execute/delete helpers.
- Updated [docs/development/DEVELOPMENT_COMPLETION_PLAN.md](docs/development/DEVELOPMENT_COMPLETION_PLAN.md) and [BUG_AUDIT.md](BUG_AUDIT.md) to record DEV-08M closure and remaining AP gaps.
- Exact next prompt title: `DEV-08Z Part 1: AP local evidence final closure and production-gap handoff`.

## Next Thread Prompt

`DEV-08Z Part 1: AP local evidence final closure and production-gap handoff`

## DEV-08Z Part 1 - AP Local Evidence Final Closure And Production-Gap Handoff Completed

- DEV-08Z Part 1 evidence map is recorded in [docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md](docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md).
- Latest commit inspected: `9ce22e16 Close DEV-08M cleanup retention evidence`.
- Scope: documentation-only consolidation of DEV-08 through DEV-08M local AP evidence; no runtime mutation, tests, smoke, E2E, cleanup/delete, migration, seed/reset/delete, deploy, real email, real ZATCA, production, beta, hosted/shared target, or customer-data action was run.
- Branches mapped: DEV-08 core AP bill/payment, DEV-08B debit note/refund, DEV-08C purchase order conversion, DEV-08D supplier refund from payment, DEV-08E cash expense, DEV-08F inventory-clearing bill/receipt, DEV-08G purchase receipt/inventory integration, DEV-08H AP output/archive/download, DEV-08I AP output permission/auth UI, DEV-08J repeated/idempotency/blockers, DEV-08K generated-document email, DEV-08L fiscal/permission edges, and DEV-08M cleanup/retention.
- Remaining production gaps carried forward: linked PO-to-bill receipt reconciliation, valuation variance booking, landed cost, purchase returns, serial/batch/bin/location, real provider email delivery/retry/webhook/domain policy, duplicate-output UX/product policy, cleanup execution policy, broad E2E/smoke/full tests, production/beta/customer-data behavior, and real ZATCA behavior if AP documents ever intersect ZATCA.
- Exact next prompt title: `DEV-08Z Part 2: AP production-gap register`.

## Next Thread Prompt

`DEV-08Z Part 2: AP production-gap register`

## DEV-08Z Part 2 - AP Production-Gap Register Completed

- DEV-08Z Part 2 production-gap register is recorded in [docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md](docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md).
- Latest commit inspected: `893aa711 Map DEV-08 AP local evidence`.
- Scope: documentation-only conversion of DEV-08 local AP evidence into production/beta/customer-data readiness gaps; no implementation, tests beyond diff checks, deploys, production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, or environment/provider change was run.
- Highest-risk gaps: production/beta/customer-data behavior, linked PO-to-bill receipt reconciliation, purchase returns, valuation variance booking, real provider AP email delivery/retry/webhook/domain policy, and broad AP E2E/smoke/full-test coverage.
- Owner disciplines called out: accounting, inventory, product, QA, operations/security, and legal/audit/compliance.
- Exact next prompt title: `DEV-08Z Part 3: AP final readiness scorecard update`.

## Next Thread Prompt

`DEV-08Z Part 3: AP final readiness scorecard update`

## DEV-08Z Part 3 - AP Final Readiness Scorecard Update Completed

- DEV-08Z Part 3 readiness update is recorded in [docs/development/DEV_08Z_AP_READINESS_SCORECARD_UPDATE.md](docs/development/DEV_08Z_AP_READINESS_SCORECARD_UPDATE.md).
- Latest commit inspected: `cbc743ed Document DEV-08 AP production gaps`.
- Updated readiness/status docs: [docs/PRODUCT_READINESS_SCORECARD.md](docs/PRODUCT_READINESS_SCORECARD.md), [docs/REMAINING_ROADMAP.md](docs/REMAINING_ROADMAP.md), [docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md), [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md), [BUG_AUDIT.md](BUG_AUDIT.md), and [README.md](README.md).
- AP local evidence status: DEV-08 through DEV-08M are closed for local-only evidence; Purchases/AP remains conservatively scored because production, beta, customer-data, real provider email, real ZATCA, broad E2E/smoke/full-test, purchase matching, inventory valuation, and advanced receipt/return policy gaps remain open.
- Scope: documentation-only; no app code, runtime mutation, tests beyond diff checks, deploy, production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, or environment/provider setting changed.
- Exact next prompt title: `DEV-08Z Part 4: AP final closure`.

## Next Thread Prompt

`DEV-08Z Part 4: AP final closure`

## DEV-08Z Part 4 - AP Final Closure Completed

- DEV-08Z final closure is recorded in [docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_FINAL_CLOSURE.md](docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_FINAL_CLOSURE.md).
- Latest commit inspected: `e59bb79c Update DEV-08 AP readiness scorecard`.
- DEV-08 is closed as local AP evidence, covering DEV-08 through DEV-08M plus DEV-08Z evidence map, production-gap register, readiness update, and final closure.
- Closure conclusion: AP local evidence is strong for the DEV-08 scope, but it is not production-complete and does not prove production/beta/customer-data behavior, real provider email, real ZATCA, broad AP E2E/smoke/full-test coverage, accountant certification, legal retention certification, cleanup execution, or paid SaaS readiness.
- Remaining production gaps: linked PO-to-bill receipt reconciliation, production-grade purchase matching, valuation variance booking, landed cost, purchase returns, serial/batch/bin/location, real provider AP email, duplicate-output UX policy, cleanup execution policy, broad AP E2E/smoke/full tests, production/beta/customer-data behavior, and real ZATCA behavior if AP documents ever intersect ZATCA.
- Scope: documentation-only; no app code, runtime mutation, cleanup/delete, E2E, smoke, full build, full tests, production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, deploy, environment/provider change, backup/restore, login, download, export, or body/base64/secret output was run.
- Exact next prompt title: `DEV-09 Part 1: banking reconciliation production-gap and E2E readiness preflight`.

## Next Thread Prompt

`DEV-09 Part 1: banking reconciliation production-gap and E2E readiness preflight`

## DEV-09 Part 1 - Banking Reconciliation Production-Gap And E2E Readiness Preflight Completed

- DEV-09 Part 1 read-only preflight is recorded in [docs/development/DEV_09_BANKING_RECONCILIATION_PREFLIGHT.md](docs/development/DEV_09_BANKING_RECONCILIATION_PREFLIGHT.md).
- Latest commit inspected: `23c09f97 Close DEV-08 AP local evidence`; `main` matched `origin/main` after fetch.
- Scope: documentation and code inspection only; no runtime mutation, bank account creation/edit, statement import/preview execution, match/categorize/ignore, reconciliation lifecycle mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, production/beta/customer data, real bank file, output/download/PDF, email, ZATCA, backup, restore, or body/secret exposure was performed.
- Modules/routes mapped: bank accounts, bank transfers, bank statements/imports/transactions, bank reconciliations, accounting dependencies, web banking routes, permission helpers, and the existing banking E2E reference file.
- State machines inventoried: bank profile create/edit/archive/reactivate/opening balance, transfer create/void, statement parse/preview/import/void, statement transaction match/categorize/ignore, and reconciliation create/submit/approve/reopen/close/void.
- E2E readiness: route surfaces and unit coverage exist, but safe marker-scoped local fixtures and a narrow login/audit-writing/E2E configuration are still needed before browser E2E can be claimed.
- Production gaps: live feeds, bank-specific parser certification, duplicate/idempotency policy, raw-file archive execution, auto-match, locking/concurrency, audit/permission matrix, fiscal/accounting lock certification, FX/fees, cleanup, and customer-data handling.
- Exact Part 2 approval phrase status: received exactly from the user and must be re-validated before the local-only fixture mutation.
- Exact next prompt title: `DEV-09 Part 2: approved local banking reconciliation fixture mutation`.

## Next Thread Prompt

`DEV-09 Part 2: approved local banking reconciliation fixture mutation`

## DEV-09 Part 2 - Approved Local Banking Reconciliation Fixture Mutation Completed

- DEV-09 Part 2 fixture mutation evidence is recorded in [docs/development/DEV_09_BANKING_RECONCILIATION_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_09_BANKING_RECONCILIATION_FIXTURE_MUTATION_EVIDENCE.md).
- Latest commit inspected: `99c7ce5d Plan DEV-09 banking reconciliation readiness`.
- Exact Part 2 approval phrase was received and validated before mutation.
- Local target was classified as `postgresql` on `localhost:5432/accounting`; Docker Postgres/Redis were already healthy.
- Runtime mutation performed: yes, local-only synthetic fixture creation under marker `DEV09-BANK-20260530T000000`.
- Created marker-scoped local fixture rows: one fake organization, one fake user, one role/membership, one open fiscal period, two posting accounts, one active fake bank profile, one synthetic statement import, three unmatched synthetic statement transactions, and one posted synthetic match-candidate journal with two lines.
- Reconciliation count for the marker remains `0`; match/categorize/ignore and reconciliation lifecycle workflows were not run in Part 2.
- Global count deltas: organizations `+1`, users `+1`, roles `+1`, memberships `+1`, accounts `+2`, bank profiles `+1`, statement imports `+1`, statement transactions `+3`, journal entries `+1`, journal lines `+2`, reconciliations `0`, reconciliation items `0`, audit logs `0`.
- Temporary runner `apps/api/scripts/dev09-part2-fixture-mutation.temp.ts` was removed after the run.
- Production/beta/shared target, customer data, real bank files, real bank account numbers, request/response bodies, secrets, email, ZATCA, output downloads, PDFs, migration, seed/reset/delete, deploy, backup, and restore were not used.
- Exact next prompt title: `DEV-09 Part 3: banking reconciliation fixture evidence verification`.

## Next Thread Prompt

`DEV-09 Part 3: banking reconciliation fixture evidence verification`

## DEV-09 Part 3 - Banking Reconciliation Fixture Evidence Verification Completed

- DEV-09 Part 3 verification is recorded in [docs/development/DEV_09_BANKING_RECONCILIATION_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_09_BANKING_RECONCILIATION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `089072e3 Create DEV-09 banking reconciliation fixtures`.
- Scope: read-only verification; no statement preview/import execution, match, categorize, ignore, reconciliation lifecycle mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, production/beta/customer data, real bank file, output/download/PDF, email, ZATCA, backup, restore, body, or secret output was run.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Verified marker counts matched Part 2: accounts `2`, bank profile `1`, statement import `1`, statement transactions `3`, reconciliations `0`, reconciliation items `0`, journal entry `1`, journal lines `2`, audit logs `0`.
- Verified bank profile is active and fake-masked-only; all three statement transactions remain `UNMATCHED` and untouched.
- Verified posted match-candidate journal `DEV09-BANK-20260530T000000-JE-000001` exists with two lines.
- Temporary verifier `apps/api/scripts/dev09-part3-fixture-verification.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 4: statement import parser preflight`.

## Next Thread Prompt

`DEV-09 Part 4: statement import parser preflight`

## DEV-09 Part 4 - Statement Import Parser Preflight Completed

- DEV-09 Part 4 preflight is recorded in [docs/development/DEV_09_STATEMENT_IMPORT_PARSER_PREFLIGHT.md](docs/development/DEV_09_STATEMENT_IMPORT_PARSER_PREFLIGHT.md).
- Latest commit inspected: `ac297061 Verify DEV-09 banking reconciliation fixtures`.
- Scope: read-only parser/import planning; no statement preview execution, persisted import, real bank file, customer data, match/categorize/ignore, reconciliation lifecycle mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, output/download/PDF, email, ZATCA, backup, restore, body, or secret output was run.
- Parser support mapped: CSV, JSON, OFX, CAMT, MT940, unknown-format warning, invalid JSON warning, duplicate row detection, and closed-period/duplicate preview behavior.
- Part 5 selected scope: inline synthetic parser checks plus preview no-persistence against the marker bank profile; no persisted import.
- Exact Part 5 approval phrase status: received exactly from the user and must be re-validated before the local synthetic checks.
- Exact next prompt title: `DEV-09 Part 5: approved local synthetic statement import parser checks`.

## Next Thread Prompt

`DEV-09 Part 5: approved local synthetic statement import parser checks`

## DEV-09 Part 5 - Approved Local Synthetic Statement Import Parser Checks Completed

- DEV-09 Part 5 evidence is recorded in [docs/development/DEV_09_STATEMENT_IMPORT_PARSER_CHECK_EVIDENCE.md](docs/development/DEV_09_STATEMENT_IMPORT_PARSER_CHECK_EVIDENCE.md).
- Latest commit inspected: `aeeb8c18 Plan DEV-09 statement import parser checks`.
- Exact Part 5 approval phrase was received and validated before checks.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Runtime mutation performed: no persisted import or domain mutation; approved local checks were parser and preview only.
- Parser results: CSV `2` rows, JSON `2`, OFX `1`, CAMT `1`, MT940 `1`, UNKNOWN `0` with warning, invalid JSON `0` with warning.
- Preview results: valid CSV `2` valid rows, duplicate in-file `1` valid/`1` invalid, existing duplicate `1` warning, invalid row `1` invalid.
- Marker count deltas stayed zero for statement imports, statement transactions, audit logs, journal entries, and reconciliations.
- Real bank files, customer data, statement body output, match/categorize/ignore, reconciliation lifecycle, E2E, smoke, migration, seed/reset/delete, deploy, email, ZATCA, backup, and restore were not used.
- Temporary runner `apps/api/scripts/dev09-part5-parser-check.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 6: statement import parser evidence verification`.

## Next Thread Prompt

`DEV-09 Part 6: statement import parser evidence verification`

## DEV-09 Part 6 - Statement Import Parser Evidence Verification Completed

- DEV-09 Part 6 verification is recorded in [docs/development/DEV_09_STATEMENT_IMPORT_PARSER_EVIDENCE_VERIFICATION.md](docs/development/DEV_09_STATEMENT_IMPORT_PARSER_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `b5d5dcd8 Check DEV-09 synthetic statement import parser`.
- Scope: read-only parser/preview evidence verification; no persisted import, statement transaction mutation, match/categorize/ignore, reconciliation lifecycle mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, output/download/PDF, email, ZATCA, backup, restore, real bank file, customer data, body, or secret output was run.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Parser verification matched Part 5: CSV `2`, JSON `2`, OFX `1`, CAMT `1`, MT940 `1`, unknown warning, invalid JSON warning.
- Preview verification matched Part 5: valid CSV `2` valid rows, duplicate in-file `1` valid/`1` invalid, existing duplicate `1` warning, invalid row `1` invalid.
- Marker count deltas stayed zero for statement imports, statement transactions, audit logs, journal entries, and reconciliations.
- Temporary verifier `apps/api/scripts/dev09-part6-parser-verification.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 7: bank transaction match categorize ignore preflight`.

## Next Thread Prompt

`DEV-09 Part 7: bank transaction match categorize ignore preflight`

## DEV-09 Part 7 - Bank Transaction Match Categorize Ignore Preflight Completed

- DEV-09 Part 7 preflight is recorded in [docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_PREFLIGHT.md](docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_PREFLIGHT.md).
- Latest commit inspected: `85a847e3 Verify DEV-09 statement import parser`.
- Scope: read-only transaction-action planning; no match/categorize/ignore, reconciliation lifecycle mutation, statement import, E2E, smoke, migration, seed/reset/delete, deploy, env change, real bank file, customer data, output/download/PDF, email, ZATCA, backup, restore, body, or secret output was run.
- Selected Part 8 actions: match `DEV09-BANK-20260530T000000-MATCH-001`, categorize `DEV09-BANK-20260530T000000-CATEGORIZE-001`, and ignore `DEV09-BANK-20260530T000000-IGNORE-001`.
- Expected Part 8 deltas: statement import/transaction counts unchanged, reconciliation counts unchanged, journal entries `+1`, journal lines `+2`, audit logs `+3`, final import status `RECONCILED`.
- Unmatch/unignore and closed-period blockers are deferred because they are not selected for this batch.
- Exact Part 8 approval phrase status: received exactly from the user and must be re-validated before mutation.
- Exact next prompt title: `DEV-09 Part 8: approved local bank transaction match categorize ignore mutation`.

## Next Thread Prompt

`DEV-09 Part 8: approved local bank transaction match categorize ignore mutation`

## DEV-09 Part 8 - Approved Local Bank Transaction Match Categorize Ignore Mutation Completed

- DEV-09 Part 8 evidence is recorded in [docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_MUTATION_EVIDENCE.md](docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_MUTATION_EVIDENCE.md).
- Latest commit inspected: `9df98fb3 Plan DEV-09 bank transaction actions`.
- Exact Part 8 approval phrase was received and validated before mutation.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Runtime mutation performed: yes, exactly the approved local match/categorize/ignore actions against marker `DEV09-BANK-20260530T000000`.
- Results: match row `UNMATCHED -> MATCHED` with `JOURNAL_LINE`; categorize row `UNMATCHED -> CATEGORIZED` with posted journal `JE-000001`; ignore row `UNMATCHED -> IGNORED`; statement import `IMPORTED -> RECONCILED`.
- Marker count deltas: statement imports `0`, statement transactions `0`, audit logs `+3`, journal entries `+1`, journal lines `+2`, reconciliations `0`, reconciliation items `0`.
- Categorization journal shape: `DEV09-6200` debit `20.0000`, `DEV09-1010` credit `20.0000`.
- No real bank data, production/beta/shared target, customer data, statement body, output/download/PDF, email, ZATCA, migration, seed/reset/delete, deploy, backup, or restore was used.
- Temporary runner `apps/api/scripts/dev09-part8-transaction-actions.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 9: bank transaction actions evidence verification`.

## Next Thread Prompt

`DEV-09 Part 9: bank transaction actions evidence verification`

## DEV-09 Part 9 - Bank Transaction Actions Evidence Verification Completed

- DEV-09 Part 9 verification is recorded in [docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_EVIDENCE_VERIFICATION.md](docs/development/DEV_09_BANK_TRANSACTION_ACTIONS_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `7c5efc36 Check DEV-09 bank transaction actions`.
- Scope: read-only transaction-action evidence verification; no statement import, transaction mutation, reconciliation mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, real bank file, customer data, output/download/PDF, email, ZATCA, backup, restore, body, or secret output was run.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Verified import status `RECONCILED`; rows are `MATCHED`, `CATEGORIZED`, and `IGNORED` as expected.
- Verified marker counts: statement imports `1`, statement transactions `3`, audit logs `3`, journal entries `2`, journal lines `4`, reconciliations `0`, reconciliation items `0`.
- Verified categorization journal `JE-000001` posted with `DEV09-6200` debit `20.0000` and `DEV09-1010` credit `20.0000`.
- Verified audit actions: one matched, one categorized, and one ignored `BankStatementTransaction` audit log.
- Temporary verifier `apps/api/scripts/dev09-part9-transaction-verification.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 10: bank reconciliation close void preflight`.

## Next Thread Prompt

`DEV-09 Part 10: bank reconciliation close void preflight`

## DEV-09 Part 10 - Bank Reconciliation Close Void Preflight Completed

- DEV-09 Part 10 preflight is recorded in [docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_PREFLIGHT.md](docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_PREFLIGHT.md).
- Latest commit inspected: `1d7222f8 Verify DEV-09 bank transaction actions`.
- Scope: read-only reconciliation lifecycle planning; no reconciliation create/submit/approve/close/void, statement transaction mutation, statement import, output/download/PDF, E2E, smoke, migration, seed/reset/delete, deploy, env change, real bank file, customer data, email, ZATCA, backup, restore, body, or secret output was run.
- Selected Part 11 actions: create zero-difference draft for `2026-05-30`, submit, approve with local full-access service option, close with three item snapshots, then void administratively.
- Expected Part 11 deltas: reconciliations `+1`, review events `+4`, reconciliation items `+3`, audit logs `+5`, journals `0`, statement imports/transactions `0`.
- Mismatch blocker path is documented from code inspection but not selected for Part 11 execution to keep the mutation narrow.
- Exact Part 11 approval phrase status: received exactly from the user and must be re-validated before mutation.
- Exact next prompt title: `DEV-09 Part 11: approved local bank reconciliation close void mutation`.

## Next Thread Prompt

`DEV-09 Part 11: approved local bank reconciliation close void mutation`

## DEV-09 Part 11 - Approved Local Bank Reconciliation Close Void Mutation Completed

- DEV-09 Part 11 evidence is recorded in [docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_MUTATION_EVIDENCE.md](docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_MUTATION_EVIDENCE.md).
- Latest commit inspected: `eefa37e2 Plan DEV-09 bank reconciliation close void`.
- Exact Part 11 approval phrase was received and validated before mutation.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Runtime mutation performed: yes, exactly the approved local reconciliation create/submit/approve/close/void lifecycle against marker `DEV09-BANK-20260530T000000`.
- Reconciliation `BR-000001` moved `DRAFT -> PENDING_APPROVAL -> APPROVED -> CLOSED -> VOIDED`; initial difference was `0.0000`, ledger closing balance `80.0000`, statement closing balance `80.0000`.
- Close snapshotted three item statuses: `MATCHED`, `CATEGORIZED`, and `IGNORED`.
- Marker count deltas: reconciliations `+1`, review events `+4`, reconciliation items `+3`, audit logs `+5`, journals `0`, statement imports/transactions `0`.
- Mismatch blocker path was not selected for this batch.
- No real bank data, production/beta/shared target, customer data, statement body, output/download/PDF, email, ZATCA, migration, seed/reset/delete, deploy, backup, or restore was used.
- Temporary runner `apps/api/scripts/dev09-part11-reconciliation-close-void.temp.ts` was removed after the run.
- Exact next prompt title: `DEV-09 Part 12: bank reconciliation close void evidence verification`.

## Next Thread Prompt

`DEV-09 Part 12: bank reconciliation close void evidence verification`

## DEV-09 Part 12 - Bank Reconciliation Close Void Evidence Verification Completed

- DEV-09 Part 12 verification is recorded in [docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_EVIDENCE_VERIFICATION.md](docs/development/DEV_09_BANK_RECONCILIATION_CLOSE_VOID_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `03afae38 Check DEV-09 bank reconciliation close void`.
- Scope: read-only reconciliation close/void evidence verification; no reconciliation mutation, statement import, transaction mutation, journal mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, real bank file, customer data, output/download/PDF, email, ZATCA, backup, restore, body, or secret output was run.
- Local target remained `postgresql` on `localhost:5432/accounting`.
- Verified reconciliation `BR-000001` final status `VOIDED`, zero difference, and review transitions `SUBMIT`, `APPROVE`, `CLOSE`, `VOID`.
- Verified linked row statuses and close snapshots remain `MATCHED`, `CATEGORIZED`, and `IGNORED`.
- Verified marker counts: statement imports `1`, statement transactions `3`, reconciliations `1`, review events `4`, reconciliation items `3`, audit logs `8`, journal entries `2`, journal lines `4`.
- Temporary verifier `apps/api/scripts/dev09-part12-reconciliation-verification.temp.ts` was removed after the run, and no `*dev09*` temp scripts remain under `apps/api/scripts`.
- Exact next prompt title: `DEV-09 Part 13: banking E2E readiness and production-gap closure`.

## Next Thread Prompt

`DEV-09 Part 13: banking E2E readiness and production-gap closure`

## DEV-09 Part 13 - Banking E2E Readiness And Production-Gap Closure Completed

- DEV-09 Part 13 closure is recorded in [docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md](docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md).
- Latest commit inspected: `8c4c9d87 Verify DEV-09 bank reconciliation close void`.
- Scope: documentation-only DEV-09 closure and readiness updates; no runtime mutation, statement import, transaction mutation, reconciliation mutation, journal mutation, output/download/PDF, E2E, smoke, migration, seed/reset/delete, deploy, env change, production/beta/shared target, customer data, real bank file, email, ZATCA, backup, restore, body, or secret output was run.
- Closure conclusion: DEV-09 is complete as local banking/reconciliation evidence for synthetic fixtures, parser/preview checks, match/categorize/ignore, and reconciliation close/void.
- Production gaps remain: live bank feeds/external APIs, automatic matching, certified target-bank parser coverage, raw-file archive operations, strict approval queue policy, transfer fees, FX handling, broad E2E/smoke/full-test coverage, hosted/beta/customer-data proof, and accountant sign-off.
- Readiness docs updated: README, product readiness scorecard, remaining roadmap, project audit, implementation status, and bug audit.
- Exact next prompt title: `DEV-10 Part 1: reports and financial statements production-gap and E2E readiness preflight`.

## Next Thread Prompt

`DEV-10 Part 1: reports and financial statements production-gap and E2E readiness preflight`

## DEV-10 Part 1 - Reports And Financial Statements Preflight Completed

- DEV-10 Part 1 preflight is recorded in [docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_PREFLIGHT.md](docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_PREFLIGHT.md).
- Latest commit inspected: `96fea571 Close DEV-09 banking reconciliation evidence`.
- Scope: read-only code and document inspection for reports/financial statements; no fixture creation, login, report runtime query, CSV export, PDF generation, generated-document archive/download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production check, customer-data action, body output, or secret output was run.
- Reports inventoried: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, VAT Return, Aged Receivables, Aged Payables, Dashboard Summary, report CSV output, report PDF output, generated-document archive/download metadata, and report permission gates.
- Highest-risk report areas found: branch filters for journal-backed reports, VAT Return officialness/API-only posture, CSV/PDF/archive/download body exposure, generated-document database/base64 storage, dashboard/report endpoint permission split, restricted-role matrix, accountant layout review, broad E2E/smoke/full-test coverage, and production/beta/customer-data proof.
- Runtime mutation/output generation performed: no.
- Exact next prompt title: `DEV-10 Part 2: approved local reports fixture creation`.

## Next Thread Prompt

`DEV-10 Part 2: approved local reports fixture creation`

## DEV-10 Part 2 - Approved Local Reports Fixture Creation Completed

- DEV-10 Part 2 fixture evidence is recorded in [docs/development/DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_10_REPORT_FIXTURE_MUTATION_EVIDENCE.md).
- Latest commit inspected: `311f5dfd Preflight DEV-10 reports financial statements`.
- Exact Part 2 approval phrase was received and validated before mutation.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Marker used: `DEV10-RPT-20260530T000000`.
- Fixture summary: one synthetic organization, one user/membership, nine accounts, two tax rates, one branch, two contacts, one active bank profile, four posted balanced journals, ten journal lines, one finalized VAT-bearing sales invoice, and one finalized VAT-bearing purchase bill.
- Expected report math documented: TB `2610.0000` debit/credit, P&L net profit `350.0000`, balance sheet assets `1960.0000` equals liabilities/equity/retained earnings `1960.0000`, VAT net payable `90.0000`, AR aging `1150.0000` in `1_30`, AP aging `460.0000` in `CURRENT`.
- CSV/PDF/archive/download output generated: no.
- Temporary runner `apps/api/scripts/dev10-part2-report-fixture.temp.ts` was removed after the run.
- No production/beta/shared target, customer data, login, E2E, smoke, migration, seed/reset/delete, deploy, ZATCA, email, backup, restore, report output body, or secret output was used.
- Exact next prompt title: `DEV-10 Part 3: report fixture evidence verification`.

## Next Thread Prompt

`DEV-10 Part 3: report fixture evidence verification`

## DEV-10 Part 3 - Report Fixture Evidence Verification Completed

- DEV-10 Part 3 verification is recorded in [docs/development/DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_10_REPORT_FIXTURE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `77e55d1a Create DEV-10 report fixtures`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Fixture verification result: passed with no discrepancies or blockers.
- Counts checked: one organization, one user, one membership, nine accounts, two tax rates, one branch, two contacts, four journal entries, ten journal lines, one sales invoice, one purchase bill, zero generated documents, and zero audit logs.
- Status/balance checks: all four marker journals are `POSTED` and balanced.
- Output generation performed: no CSV, PDF, generated-document archive, or generated-document download.
- Temporary verifier `apps/api/scripts/dev10-part3-fixture-verification.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-10 Part 4: core financial report JSON check preflight`.

## Next Thread Prompt

`DEV-10 Part 4: core financial report JSON check preflight`

## DEV-10 Part 4 - Core Financial Report JSON Check Preflight Completed

- DEV-10 Part 4 preflight is recorded in [docs/development/DEV_10_CORE_REPORT_JSON_PREFLIGHT.md](docs/development/DEV_10_CORE_REPORT_JSON_PREFLIGHT.md).
- Latest commit inspected: `23481ee4 Verify DEV-10 report fixtures`.
- Scope: planning-only for local service-level JSON checks; no runtime report calls, login, fixture mutation, CSV, PDF, archive, download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Core reports planned: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, and Dashboard Summary.
- Expected checks: row/section counts, trial balance equality, P&L revenue/COGS/expense/net profit, balance sheet equality, VAT output/input/net payable, and dashboard cash/AR/AP/revenue/VAT summary.
- Exact next prompt title: `DEV-10 Part 5: approved local core financial report JSON checks`.

## Next Thread Prompt

`DEV-10 Part 5: approved local core financial report JSON checks`

## DEV-10 Part 5 - Approved Local Core Report JSON Checks Completed

- DEV-10 Part 5 evidence is recorded in [docs/development/DEV_10_CORE_REPORT_JSON_CHECK_EVIDENCE.md](docs/development/DEV_10_CORE_REPORT_JSON_CHECK_EVIDENCE.md).
- Latest commit inspected: `8f35bf56 Preflight DEV-10 core report JSON checks`.
- Exact Part 5 approval phrase was received and validated before checks.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Reports checked: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, and Dashboard Summary.
- Pass/fail summary: all selected JSON checks passed.
- Verified totals: TB debit/credit `2610.0000`, P&L net profit `350.0000`, balance sheet assets/liabilities-equity `1960.0000`, VAT net payable `90.0000`, dashboard cash `750.0000`, AR `1150.0000`, AP `460.0000`.
- Generated-document count stayed `0`; CSV/PDF/archive/download output generated: no.
- Temporary runner `apps/api/scripts/dev10-part5-core-report-json-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-10 Part 6: core financial report JSON evidence verification`.

## Next Thread Prompt

`DEV-10 Part 6: core financial report JSON evidence verification`

## DEV-10 Part 6 - Core Financial Report JSON Evidence Verification Completed

- DEV-10 Part 6 verification is recorded in [docs/development/DEV_10_CORE_REPORT_JSON_EVIDENCE_VERIFICATION.md](docs/development/DEV_10_CORE_REPORT_JSON_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `654ce43c Check DEV-10 core report JSON`.
- Core report JSON evidence status: passed with no discrepancies or blockers.
- Reports verified: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, and Dashboard Summary.
- Verified that generated-document delta stayed `0`, no CSV/PDF/archive/download output was generated, no full payload bodies or secrets were present, and no Part 5 temp script remains.
- Exact next prompt title: `DEV-10 Part 7: aging and VAT return report preflight`.

## Next Thread Prompt

`DEV-10 Part 7: aging and VAT return report preflight`

## DEV-10 Part 7 - Aging And VAT Return Report Preflight Completed

- DEV-10 Part 7 preflight is recorded in [docs/development/DEV_10_AGING_VAT_RETURN_PREFLIGHT.md](docs/development/DEV_10_AGING_VAT_RETURN_PREFLIGHT.md).
- Latest commit inspected: `08cb4c7c Verify DEV-10 core report JSON evidence`.
- Scope: planning-only for local JSON checks; no runtime report calls, login, fixture mutation, CSV, PDF, archive, download, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Reports planned: Aged Receivables, Aged Payables, and VAT Return.
- Expected checks: AR row count `1`, AR bucket `1_30`, AR total `1150.0000`; AP row count `1`, AP bucket `CURRENT`, AP total `460.0000`; VAT Return output `150.0000`, input `60.0000`, net payable `90.0000`.
- Exact next prompt title: `DEV-10 Part 8: approved local aging and VAT return report checks`.

## Next Thread Prompt

`DEV-10 Part 8: approved local aging and VAT return report checks`

## DEV-10 Part 8 - Approved Local Aging And VAT Return Report Checks Completed

- DEV-10 Part 8 evidence is recorded in [docs/development/DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md](docs/development/DEV_10_AGING_VAT_RETURN_CHECK_EVIDENCE.md).
- Latest commit inspected: `d99be86c Preflight DEV-10 aging VAT reports`.
- Exact Part 8 approval phrase was received and validated before checks.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Reports checked: Aged Receivables, Aged Payables, VAT Return, and branch-filtered source-document reads.
- Pass/fail summary: all selected aging and VAT Return JSON checks passed.
- Verified totals: AR `1150.0000` in `1_30`, AP `460.0000` in `CURRENT`, VAT Return output `150.0000`, input `60.0000`, net payable `90.0000`, refundable `0.0000`.
- Generated-document count stayed `0`; CSV/PDF/archive/download output generated: no.
- Temporary runner `apps/api/scripts/dev10-part8-aging-vat-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-10 Part 9: aging and VAT return evidence verification`.

## Next Thread Prompt

`DEV-10 Part 9: aging and VAT return evidence verification`

## DEV-10 Part 9 - Aging And VAT Return Evidence Verification Completed

- DEV-10 Part 9 verification is recorded in [docs/development/DEV_10_AGING_VAT_RETURN_EVIDENCE_VERIFICATION.md](docs/development/DEV_10_AGING_VAT_RETURN_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `ff560cd9 Check DEV-10 aging VAT reports`.
- Aging/VAT evidence status: passed with no discrepancies or blockers.
- Reports verified: Aged Receivables, Aged Payables, VAT Return, and branch-filtered source-document reports.
- Verified that generated-document delta stayed `0`, no CSV/PDF/archive/download output was generated, no full payload bodies or secrets were present, and no Part 8 temp script remains.
- Exact next prompt title: `DEV-10 Part 10: report output, CSV, PDF, archive, and permission gate preflight`.

## Next Thread Prompt

`DEV-10 Part 10: report output, CSV, PDF, archive, and permission gate preflight`

## DEV-10 Part 10 - Report Output Gate Preflight Completed

- DEV-10 Part 10 preflight is recorded in [docs/development/DEV_10_REPORT_OUTPUT_GATE_PREFLIGHT.md](docs/development/DEV_10_REPORT_OUTPUT_GATE_PREFLIGHT.md).
- Latest commit inspected: `486fdd1f Verify DEV-10 aging VAT evidence`.
- Scope: planning-only for report CSV/PDF/archive/download and permission gates; no runtime output generation, CSV call, PDF call, generated-document archive/download, login, fixture mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Output paths planned: `coreReportCsvFile`, `coreReportPdf`, generated-document list/detail/download metadata, and permission simulation for report export/download.
- Permission matrix summarized: export/download positive path, restricted `reports.view`-only negative path for CSV/PDF, and generated-document view-only negative path for download.
- Exact next prompt title: `DEV-10 Part 11: approved local report output/archive/download gate checks`.

## Next Thread Prompt

`DEV-10 Part 11: approved local report output/archive/download gate checks`

## DEV-10 Part 11 - Approved Local Report Output Archive Download Gate Checks Completed

- DEV-10 Part 11 evidence is recorded in [docs/development/DEV_10_REPORT_OUTPUT_GATE_MUTATION_EVIDENCE.md](docs/development/DEV_10_REPORT_OUTPUT_GATE_MUTATION_EVIDENCE.md).
- Latest commit inspected: `b394fae0 Preflight DEV-10 report output gates`.
- Exact Part 11 approval phrase was received and validated before checks.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Output checks run: trial balance CSV metadata, trial balance PDF/archive metadata, generated-document list/detail/download metadata, and token-free permission checks.
- Generated-document delta: before `0`, after CSV `0`, after PDF `1`, after download `1`, total `+1`.
- Permission gate result: `reports.export` and `generatedDocuments.download` allowed CSV export; `reports.view` only was forbidden for CSV/PDF; generated-document list/detail require `generatedDocuments.view`; download requires `generatedDocuments.download`.
- Body-output safety result: no CSV body, PDF body, generated-document base64, download body, full payload body, DB URL, auth header, cookie, token, or secret was printed.
- Temporary runner `apps/api/scripts/dev10-part11-output-gates.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-10 Part 12: report output/archive/download evidence verification`.

## Next Thread Prompt

`DEV-10 Part 12: report output/archive/download evidence verification`

## DEV-10 Part 12 - Report Output Archive Download Evidence Verification Completed

- DEV-10 Part 12 verification is recorded in [docs/development/DEV_10_REPORT_OUTPUT_GATE_EVIDENCE_VERIFICATION.md](docs/development/DEV_10_REPORT_OUTPUT_GATE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `503df177 Check DEV-10 report output gates`.
- Output evidence status: passed with no discrepancies or blockers.
- Generated-document verification result: CSV delta `0`, PDF delta `+1`, download delta `0`, total delta `+1`, marker `REPORT_TRIAL_BALANCE` metadata safe and hash-matched.
- Permission verification result: export/download positives allowed, restricted `reports.view`-only CSV/PDF forbidden, generated-document list/detail/download permissions confirmed.
- Body-output safety result: no CSV body, PDF body, generated-document base64, download body, full payload body, DB URL, auth header, cookie, token, or secret was printed.
- No new output/archive/download generation was performed during Part 12 verification.
- Exact next prompt title: `DEV-10 Part 13: reports and financial statements closure`.

## Next Thread Prompt

`DEV-10 Part 13: reports and financial statements closure`

## DEV-10 Part 13 - Reports And Financial Statements Closure Completed

- DEV-10 Part 13 closure is recorded in [docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md](docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md).
- Latest commit inspected: `72282737 Verify DEV-10 report output evidence`.
- Scope: documentation/read-only consolidation only; no runtime mutation, new report query, CSV/PDF/archive/download generation, login, fixture creation, E2E, smoke, full tests, full build, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer data, or body output was used.
- Closure conclusion: DEV-10 is closed for local-only report fixture math, core report JSON, aging/VAT Return JSON, Trial Balance CSV/PDF/archive/download metadata, no-body output handling, and selected permission-gate evidence.
- Output proof status: CSV created no archive row, PDF created exactly one local `REPORT_TRIAL_BALANCE` generated-document row, download created no additional row, and archive/download hashes matched.
- Permission proof status: export/download positives were allowed, restricted `reports.view`-only CSV/PDF was forbidden, generated-document list/detail require view permission, and generated-document download requires download permission.
- DEV-10 does not prove production readiness, beta readiness, customer-data behavior, accountant certification, official VAT filing, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, generated-document object-storage retention, broad E2E/smoke/full-test coverage, or load/concurrency.
- Readiness docs updated: README, BUG_AUDIT, Product Readiness Scorecard, Remaining Roadmap, Project Audit, and Implementation Status.
- Recommended next thread title: `DEV-11 Part 1: inventory valuation and COGS production-gap and E2E readiness preflight`.

## Next Thread Prompt

`DEV-11 Part 1: inventory valuation and COGS production-gap and E2E readiness preflight`

## DEV-11 Part 1 - Inventory Valuation And COGS Preflight Completed

- DEV-11 Part 1 preflight is recorded in [docs/development/DEV_11_INVENTORY_VALUATION_COGS_PREFLIGHT.md](docs/development/DEV_11_INVENTORY_VALUATION_COGS_PREFLIGHT.md).
- Latest commit inspected: `5804dbd2 Close DEV-10 reports financial statements evidence`.
- Scope: documentation and read-only code inspection only; no login, fixture creation, runtime mutation, posting, reversal, output generation, report query, E2E, smoke, full tests, full build, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Current model confirmed: operational stock movement records drive quantity and operational moving-average valuation reports, while financial statements consume posted/reversed `JournalEntry` and `JournalLine` rows only.
- Manual posting boundaries confirmed: sales stock issue COGS post/reverse, purchase receipt inventory asset post/reverse, and clearing variance proposal post/reverse are explicit, permission-gated, fiscal-period-guarded journal actions; previews/reports do not post journals.
- Highest-risk inventory/COGS gaps found: no DEV-11 marker fixture yet, no FIFO/cost layers, no landed cost, no automatic COGS/receipt/variance posting, no returns workflow, no serial/batch/bin/location, no multi-currency inventory policy, no direct-mode historical migration policy, no broad E2E/smoke/full-test/load/concurrency proof, and no hosted/beta/customer-data proof.
- Proposed local marker: `DEV11-INV-20260530T000000`; future fixture names must start with `DEV11-INV-` and remain local-only synthetic data.
- Exact next prompt title: `DEV-11 Part 2: approved local inventory valuation fixture creation`.

## Next Thread Prompt

`DEV-11 Part 2: approved local inventory valuation fixture creation`

## DEV-11 Part 2 - Approved Local Inventory Valuation Fixture Creation Completed

- DEV-11 Part 2 fixture evidence is recorded in [docs/development/DEV_11_INVENTORY_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_11_INVENTORY_FIXTURE_MUTATION_EVIDENCE.md).
- Latest commit inspected before mutation: `655dbbac Preflight DEV-11 inventory valuation COGS`.
- Exact Part 2 approval phrase was received and validated before mutation.
- Local target proof: root and API `DATABASE_URL` resolved to `postgresql` on `localhost:5432/accounting`, classified local-only; Docker Postgres and Redis were healthy local containers.
- Marker used: `DEV11-INV-20260530T000000`.
- Mutation performed: yes, local-only.
- Fixture created: marker organization/user/role, 9 marker accounts, open May 2026 fiscal period, inventory settings, one item, one warehouse, 3 stock movements, one finalized clearing-mode purchase bill with one posted clearing journal, one linked posted purchase receipt, one finalized sales invoice, one posted sales stock issue, and one draft adjustment reference.
- Key safe fixture IDs: org `837b9c13`, user `e08ad608`, item `27398986`, warehouse `0b519fab`, purchase bill `6d84a149`, purchase receipt `a413ac33`, sales stock issue `c3d25519`, bill journal `6befd661`.
- Expected math: opening `20.0000` units/value `200.0000`; receipt `10.0000` units/value `100.0000`; sales issue `5.0000`; expected COGS `50.0000`; expected receipt asset posting `100.0000`; expected operational on hand `25.0000` and value `250.0000`.
- Expected clearing setup: purchase bill clearing debit `90.0000`; expected open clearing difference before receipt asset posting `90.0000`; expected net clearing difference after receipt asset posting `-10.0000`.
- No COGS posting, receipt asset posting, variance proposal posting, report query, output generation, login/browser flow, production/beta/customer-data access, ZATCA, email, backup, restore, migration, seed/reset/delete, deploy, or environment change was performed.
- Temporary runner `apps/api/scripts/dev11-part2-fixture.temp.ts` was removed before commit.
- Exact next prompt title: `DEV-11 Part 3: inventory fixture evidence verification`.

## Next Thread Prompt

`DEV-11 Part 3: inventory fixture evidence verification`

## DEV-11 Part 3 - Inventory Fixture Evidence Verification Completed

- DEV-11 Part 3 verification is recorded in [docs/development/DEV_11_INVENTORY_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_INVENTORY_FIXTURE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `0b04e1aa Create DEV-11 inventory valuation fixture`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Marker verified: `DEV11-INV-20260530T000000`.
- Runtime mutation performed: no.
- Fixture readiness result: passed; COGS readiness, purchase receipt asset readiness, variance candidate readiness, open fiscal-period readiness, account mappings, and expected quantity/value math all verified with no blockers.
- Verified counts: organizations `1`, users `1`, contacts `2`, accounts `9`, inventory settings `1`, items `1`, warehouses `1`, stock movements `3`, purchase bills `1`, purchase receipts `1`, sales invoices `1`, sales stock issues `1`, inventory adjustments `1`, variance proposals `0`, journal entries `1`, journal lines `2`, generated documents `0`, audit logs `0`.
- Verified math: quantity on hand `25.0000`, moving-average unit cost `10.0000`, operational inventory value `250.0000`, expected COGS `50.0000`, receipt asset amount `100.0000`, bill clearing debit `90.0000`.
- Discrepancies/blockers: none found.
- No COGS posting, receipt asset posting, variance proposal mutation, report query, output generation, login/browser flow, production/beta/customer-data access, ZATCA, email, backup, restore, migration, seed/reset/delete, deploy, or environment change was performed.
- Temporary verifier `apps/api/scripts/dev11-part3-verify.temp.ts` was removed before commit.
- Exact next prompt title: `DEV-11 Part 4: sales stock issue COGS preflight`.

## Next Thread Prompt

`DEV-11 Part 4: sales stock issue COGS preflight`

## DEV-11 Part 4 - Sales Stock Issue COGS Preflight Completed

- DEV-11 Part 4 preflight is recorded in [docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_PREFLIGHT.md](docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_PREFLIGHT.md).
- Latest commit inspected: `f5328bfa Verify DEV-11 inventory fixture evidence`.
- Scope: read-only planning and code inspection only; no runtime mutation, COGS posting, COGS reversal, stock issue void, fixture creation, login/browser flow, report query, output generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Marker dependency confirmed: `DEV11-INV-20260530T000000` sales stock issue `DEV11-INV-SSI-0001`, safe ID `c3d25519`, remains `POSTED` and COGS-unposted from the Part 3 evidence.
- Runtime mutation/posting/reversal occurred: no.
- Expected COGS amount: `50.0000`, from `5.0000` issued units at moving-average unit cost `10.0000`.
- Expected COGS posting journal impact: `+1` posted journal entry and `+2` journal lines, Dr COGS account `DEV11-5000` `50.0000` / Cr Inventory Asset account `DEV11-1200` `50.0000`; stock movements, inventory quantities, operational inventory values, generated documents, CSV/PDF/archive/download outputs remain unchanged.
- Expected financial statement impact after post: P&L COGS increases `50.0000`, Inventory Asset decreases `50.0000`, Trial Balance remains balanced, and Balance Sheet remains balanced through current-period net income.
- Expected reversal impact if Part 5 includes reversal: one posted reversal journal and two reversal lines, source COGS journal marked `REVERSED`, marker issue reversal fields populated, and net COGS/Inventory Asset impact returns to baseline.
- Exact next prompt title: `DEV-11 Part 5: approved local sales stock issue COGS posting checks`.

## Next Thread Prompt

`DEV-11 Part 5: approved local sales stock issue COGS posting checks`

## DEV-11 Part 5 - Approved Local Sales Stock Issue COGS Checks Completed

- DEV-11 Part 5 evidence is recorded in [docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_CHECK_EVIDENCE.md](docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_CHECK_EVIDENCE.md).
- Latest commit inspected before mutation: `10b3503d Preflight DEV-11 sales stock issue COGS`.
- Exact Part 5 approval phrase was received and validated before mutation.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Mutation performed: yes, local-only and marker-scoped.
- Marker issue: `DEV11-INV-SSI-0001`, safe ID `c3d25519`.
- COGS preview result: `POSTABLE`, `canPost=true`, blockers `0`, total debit/credit `50.0000`.
- COGS post result: one posted COGS journal created, safe ID `8459b09e`, Dr COGS `DEV11-5000` `50.0000` / Cr Inventory Asset `DEV11-1200` `50.0000`.
- Duplicate COGS post was blocked with no count delta.
- Active-COGS void was blocked with no count or issue-state delta.
- COGS reversal result: source COGS journal `8459b09e` marked `REVERSED`, reversal journal `8b8c57c5` created and linked, final preview status `REVERSED`.
- Journal deltas from pre-check to final: journal entries `+2`, journal lines `+4`, audit logs `+2`, stock movements `0`, generated documents `0`.
- Final financial impact from COGS post plus reversal: COGS net `0.0000`, Inventory Asset net `0.0000`, source plus reversal trial-balance totals debit `100.0000` and credit `100.0000`.
- Blockers/discrepancies: none found.
- Temporary runner `apps/api/scripts/dev11-part5-cogs-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 6: sales stock issue COGS evidence verification`.

## Next Thread Prompt

`DEV-11 Part 6: sales stock issue COGS evidence verification`

## DEV-11 Part 6 - Sales Stock Issue COGS Evidence Verification Completed

- DEV-11 Part 6 verification is recorded in [docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_SALES_STOCK_ISSUE_COGS_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `7c4384e7 Check DEV-11 sales stock issue COGS`.
- Mutation performed: no; Part 6 was read-only verification only.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Verification result: passed with no discrepancies or blockers.
- COGS state verified: marker stock issue `DEV11-INV-SSI-0001` remains `POSTED`, has linked COGS source journal `8459b09e`, linked reversal journal `8b8c57c5`, populated posted/reversed fields, and was not voided.
- Journal verification result: source COGS journal is `REVERSED` with Dr COGS `DEV11-5000` `50.0000` / Cr Inventory Asset `DEV11-1200` `50.0000`; reversal journal is `POSTED` with opposite lines and points back to the source.
- Financial verification result: source plus reversal net COGS `0.0000`, net Inventory Asset `0.0000`, trial-balance totals debit `100.0000` and credit `100.0000`.
- Baselines verified: journal entries `3`, journal lines `6`, stock movements `3`, generated documents `0`, audit logs `2`.
- Audit actions verified using action-name-only reads: `COGS_POSTED` `1`, `COGS_REVERSED` `1`.
- Temporary verifier `apps/api/scripts/dev11-part6-cogs-verify.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 7: purchase receipt inventory asset preflight`.

## Next Thread Prompt

`DEV-11 Part 7: purchase receipt inventory asset preflight`

## DEV-11 Part 7 - Purchase Receipt Inventory Asset Preflight Completed

- DEV-11 Part 7 preflight is recorded in [docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_PREFLIGHT.md](docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_PREFLIGHT.md).
- Latest commit inspected: `f815bd1a Verify DEV-11 sales stock issue COGS evidence`.
- Scope: read-only planning and code inspection only; no runtime mutation, receipt asset posting, receipt asset reversal, purchase receipt void, fixture creation, report output, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Marker dependency confirmed: purchase receipt `DEV11-INV-PRC-0001`, safe ID `a413ac33`, remains `POSTED` and inventory-asset-unposted; linked purchase bill `DEV11-INV-BILL-0001`, safe ID `6d84a149`, is `FINALIZED` and `INVENTORY_CLEARING`.
- Runtime mutation/posting/reversal occurred: no.
- Expected receipt asset amount: `100.0000`, from `10.0000` received units at unit cost `10.0000`.
- Expected receipt asset posting journal impact: `+1` posted journal entry and `+2` journal lines, Dr Inventory Asset account `DEV11-1200` `100.0000` / Cr Inventory Clearing account `240` `100.0000`; stock movements, operational inventory quantities, generated documents, CSV/PDF/archive/download outputs remain unchanged.
- Expected clearing impact after post: marker bill clearing debit `90.0000`, receipt asset clearing credit `100.0000`, net clearing difference `-10.0000`; reversal returns the receipt asset pair to zero.
- Expected financial impact after post: Inventory Asset increases `100.0000`, Inventory Clearing decreases `100.0000`, Trial Balance remains balanced, and Balance Sheet remains balanced.
- Direct-mode, standalone, and PO-only receipt asset posting blockers were mapped as planning-only; Part 8 should not create broad blocker fixtures unless strictly necessary and marker-scoped.
- Exact next prompt title: `DEV-11 Part 8: approved local purchase receipt inventory asset posting checks`.

## Next Thread Prompt

`DEV-11 Part 8: approved local purchase receipt inventory asset posting checks`

## DEV-11 Part 8 - Approved Local Purchase Receipt Inventory Asset Checks Completed

- DEV-11 Part 8 evidence is recorded in [docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_CHECK_EVIDENCE.md](docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_CHECK_EVIDENCE.md).
- Latest commit inspected before mutation: `10086249 Preflight DEV-11 purchase receipt inventory asset`.
- Exact Part 8 approval phrase was received and validated before mutation.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Mutation performed: yes, local-only and marker-scoped.
- Marker receipt: `DEV11-INV-PRC-0001`, safe ID `a413ac33`, linked purchase bill safe ID `6d84a149`.
- Receipt preview result: `POSTABLE`, `canPost=true`, blockers `0`, receipt value `100.0000`, matched bill value `90.0000`, total debit/credit `100.0000`.
- Asset post result: one posted asset journal created, safe ID `f85f869e`, Dr Inventory Asset `DEV11-1200` `100.0000` / Cr Inventory Clearing `240` `100.0000`.
- Duplicate receipt asset post was blocked with no count delta.
- Direct-mode/standalone/PO-only blocker mutation checks were skipped because no existing marker fixture represented those states; no new broad blocker fixtures were created.
- Active receipt asset void was blocked with no count or receipt-state delta.
- Receipt asset reversal result: source asset journal `f85f869e` marked `REVERSED`, reversal journal `e3c196d7` created and linked, final preview status `REVERSED`.
- Journal deltas from pre-check to final: journal entries `+2`, journal lines `+4`, audit logs `+2`, stock movements `0`, generated documents `0`.
- Clearing effect: before post `90.0000`, after post `-10.0000`, final after reversal `90.0000`.
- Final financial impact from asset post plus reversal: Inventory Asset net `0.0000`, Inventory Clearing net `0.0000`, source plus reversal trial-balance totals debit `200.0000` and credit `200.0000`.
- Blockers/discrepancies: none found.
- Temporary runner `apps/api/scripts/dev11-part8-receipt-asset-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 9: purchase receipt inventory asset evidence verification`.

## Next Thread Prompt

`DEV-11 Part 9: purchase receipt inventory asset evidence verification`

## DEV-11 Part 9 - Purchase Receipt Inventory Asset Evidence Verification Completed

- DEV-11 Part 9 verification is recorded in [docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_PURCHASE_RECEIPT_INVENTORY_ASSET_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `faa87d58 Check DEV-11 purchase receipt inventory asset`.
- Mutation performed: no; Part 9 was read-only verification only.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Verification result: passed with no discrepancies or blockers.
- Receipt asset state verified: marker purchase receipt `DEV11-INV-PRC-0001` remains `POSTED`, has linked asset source journal `f85f869e`, linked reversal journal `e3c196d7`, populated posted/reversed fields, and was not voided.
- Journal verification result: source asset journal is `REVERSED` with Dr Inventory Asset `DEV11-1200` `100.0000` / Cr Inventory Clearing `240` `100.0000`; reversal journal is `POSTED` with opposite lines and points back to the source.
- Financial verification result: source plus reversal net Inventory Asset `0.0000`, net Inventory Clearing `0.0000`, trial-balance totals debit `200.0000` and credit `200.0000`.
- Baselines verified: journal entries `5`, journal lines `10`, stock movements `3`, generated documents `0`, audit logs `4`.
- Audit actions verified using action-name-only reads: `PURCHASE_RECEIPT_ASSET_POSTED` `1`, `PURCHASE_RECEIPT_ASSET_REVERSED` `1`.
- Temporary verifier `apps/api/scripts/dev11-part9-receipt-asset-verify.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 10: clearing variance proposal preflight`.

## Next Thread Prompt

`DEV-11 Part 10: clearing variance proposal preflight`

## DEV-11 Part 10 - Clearing Variance Proposal Preflight Completed

- DEV-11 Part 10 preflight is recorded in [docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_PREFLIGHT.md](docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_PREFLIGHT.md).
- Latest commit inspected: `a0c1e0e0 Verify DEV-11 purchase receipt inventory asset evidence`.
- Scope: read-only planning and code inspection only; no runtime mutation, proposal creation, proposal submission, proposal approval, variance journal posting, variance journal reversal, proposal voiding, fixture creation, report output, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, ZATCA, email, backup, restore, production/beta target, customer data, body output, or secret output was used.
- Runtime mutation/posting/reversal occurred: no.
- Marker dependency confirmed from existing evidence: purchase bill `DEV11-INV-BILL-0001` has Inventory Clearing debit `90.0000`; receipt `DEV11-INV-PRC-0001` asset posting was posted and reversed, leaving active receipt clearing credit `0.0000`.
- Expected Part 11 proposal amount: `90.0000`.
- Expected Part 11 proposal mapping: Dr Inventory Adjustment Loss `DEV11-5100` `90.0000` / Cr Inventory Clearing `240` `90.0000`.
- Expected Part 11 post impact before reversal: one posted journal entry and two journal lines, Inventory Adjustment Loss increases `90.0000`, Inventory Clearing is credited `90.0000`, and stock movements/generated documents stay unchanged.
- Expected Part 11 final impact if reversed: one posted reversal journal and two reversal lines, source variance journal marked `REVERSED`, source plus reversal pair nets to `0.0000`.
- Main blockers to re-check in Part 11: local-only DB target, existing duplicate marker proposal, current fiscal period openness for posting and reversal, and any extra reversed-receipt warning row in the clearing variance report.
- Exact next prompt title: `DEV-11 Part 11: approved local clearing variance proposal posting checks`.

## Next Thread Prompt

`DEV-11 Part 11: approved local clearing variance proposal posting checks`

## DEV-11 Part 11 - Approved Local Clearing Variance Proposal Checks Completed

- DEV-11 Part 11 evidence is recorded in [docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_CHECK_EVIDENCE.md](docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_CHECK_EVIDENCE.md).
- Latest commit inspected before mutation: `7e00d22d Preflight DEV-11 clearing variance proposal`.
- Exact Part 11 approval phrase was received and validated before mutation.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Mutation performed: yes, local-only and marker-scoped.
- Marker proposal safe ID: `141aa064`; source variance journal safe ID `267366ad`; reversal journal safe ID `1270a557`.
- Clearing read result: status `BILL_WITHOUT_RECEIPT_POSTING`, bill clearing debit `90.0000`, active receipt clearing credit `0.0000`, net clearing difference `90.0000`, and first matching variance amount `90.0000`.
- Proposal lifecycle result: `DRAFT -> PENDING_APPROVAL -> APPROVED -> POSTED -> REVERSED`.
- Post journal result: Dr Inventory Adjustment Loss `DEV11-5100` `90.0000` / Cr Inventory Clearing `240` `90.0000`.
- Reversal journal result: Dr Inventory Clearing `240` `90.0000` / Cr Inventory Adjustment Loss `DEV11-5100` `90.0000`; source variance journal marked `REVERSED`.
- Journal deltas from pre-Part-11 baseline to final: journal entries `+2`, journal lines `+4`, variance proposals `+1`, proposal events `+5`, audit logs `+5`, stock movements `0`, generated documents `0`.
- Final financial impact from variance post plus reversal: Inventory Adjustment Loss net `0.0000`, Inventory Clearing net `0.0000`, source plus reversal trial-balance totals debit `180.0000` and credit `180.0000`.
- Duplicate post was blocked; reversed-proposal void was blocked. The temporary runner first stopped on an order-sensitive reversal-line assertion after the approved lifecycle had completed, then resumed from the existing marker proposal and verified final state without creating a duplicate.
- Temporary runner `apps/api/scripts/dev11-part11-variance-proposal-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 12: clearing variance proposal evidence verification`.

## Next Thread Prompt

`DEV-11 Part 12: clearing variance proposal evidence verification`

## DEV-11 Part 12 - Clearing Variance Proposal Evidence Verification Completed

- DEV-11 Part 12 verification is recorded in [docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_CLEARING_VARIANCE_PROPOSAL_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `58d7b722 Check DEV-11 clearing variance proposal`.
- Mutation performed: no; Part 12 was read-only verification only.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only.
- Verification result: passed with no application discrepancies or blockers.
- Proposal lifecycle verified: marker variance proposal `141aa064` is `REVERSED`, amount `90.0000`, Dr account `DEV11-5100`, Cr account `240`, and events `CREATE`, `SUBMIT`, `APPROVE`, `POST`, `REVERSE` exist in order.
- Journal verification result: source variance journal `267366ad` is `REVERSED` with Dr Inventory Adjustment Loss `DEV11-5100` `90.0000` / Cr Inventory Clearing `240` `90.0000`; reversal journal `1270a557` is `POSTED` with opposite lines and points back to the source.
- Financial verification result: source plus reversal net Inventory Adjustment Loss `0.0000`, net Inventory Clearing `0.0000`, trial-balance totals debit `180.0000` and credit `180.0000`.
- Baselines verified: journal entries `7`, journal lines `14`, stock movements `3`, generated documents `0`, variance proposals `1`, variance proposal events `5`, audit logs `9`.
- Audit actions verified using action-name-only reads: `INVENTORY_VARIANCE_PROPOSAL_CREATED`, `INVENTORY_VARIANCE_PROPOSAL_SUBMITTED`, `INVENTORY_VARIANCE_PROPOSAL_APPROVED`, `INVENTORY_VARIANCE_PROPOSAL_POSTED`, and `INVENTORY_VARIANCE_PROPOSAL_REVERSED`, each count `1`.
- Temporary verifier `apps/api/scripts/dev11-part12-variance-proposal-verify.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 13: inventory valuation reports and financial statement impact preflight`.

## Next Thread Prompt

`DEV-11 Part 13: inventory valuation reports and financial statement impact preflight`

## DEV-11 Part 13 - Inventory Valuation Reports And Financial Impact Preflight Completed

- DEV-11 Part 13 preflight is recorded in [docs/development/DEV_11_INVENTORY_VALUATION_REPORTS_FINANCIAL_IMPACT_PREFLIGHT.md](docs/development/DEV_11_INVENTORY_VALUATION_REPORTS_FINANCIAL_IMPACT_PREFLIGHT.md).
- Latest commit inspected: `f9cfd315 Verify DEV-11 clearing variance proposal evidence`.
- Scope: read-only planning and code inspection only; no runtime report query, output generation, mutation, posting, reversal, fixture creation, CSV/PDF/download/archive generation, E2E, smoke, migration, seed/reset/delete, deploy, environment change, production/beta target, customer data, body output, or secret output was used.
- Runtime report queries/output/mutation occurred: no.
- Expected operational inventory report impact: stock valuation should show quantity `25.0000`, moving-average unit cost `10.0000`, estimated value `250.0000`, and movement summary should show inbound `30.0000`, outbound `5.0000`, closing `25.0000`, movement count `3`.
- Expected clearing report impact: clearing reconciliation should show bill clearing debit `90.0000`, active receipt clearing credit `0.0000`, net clearing difference `90.0000`, status `BILL_WITHOUT_RECEIPT_POSTING`; clearing variance should show first matching variance amount `90.0000` and an extra reversed-receipt warning row.
- Expected financial statement impact: COGS, Inventory Asset receipt/COGS pairs, and variance loss pairs net to `0.0000`; Inventory Clearing retains debit `90.0000` from the active purchase bill clearing journal and AP retains credit `90.0000`; Trial Balance and Balance Sheet should remain balanced.
- Part 14 must run JSON/read-only report checks only and must avoid CSV/PDF/download/archive/generated-document output.
- Main blocker/risk: low-stock expected count was not recorded in prior DEV-11 evidence and should be verified as a summarized count only.
- Exact next prompt title: `DEV-11 Part 14: approved local inventory valuation report checks`.

## Next Thread Prompt

`DEV-11 Part 14: approved local inventory valuation report checks`

## DEV-11 Part 14 - Inventory Valuation Report Checks Completed

- DEV-11 Part 14 inventory valuation report checks are recorded in [docs/development/DEV_11_INVENTORY_VALUATION_REPORT_CHECK_EVIDENCE.md](docs/development/DEV_11_INVENTORY_VALUATION_REPORT_CHECK_EVIDENCE.md).
- Latest commit inspected before report reads: `45f7d361 Preflight DEV-11 inventory valuation reports`.
- Exact Part 14 approval phrase was received and validated before report reads.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation performed: no.
- Report queries performed: yes, local-only JSON/in-process service reads.
- Output generation performed: no CSV, no PDF, no generated-document download/archive, and no report row/body output.
- Count stability result: stock movements stayed `3`, journal entries/lines stayed `7`/`14`, generated documents stayed `0`, audit logs stayed `9`, and variance proposal events stayed `5`.
- Inventory report result: stock valuation quantity `25.0000`, moving-average unit cost `10.0000`, estimated value `250.0000`, grand total `250.0000`; movement summary inbound `30.0000`, outbound `5.0000`, closing `25.0000`, movement count `3`; low-stock count `0`.
- Clearing report result: reconciliation status `BILL_WITHOUT_RECEIPT_POSTING`, bill clearing debit `90.0000`, active receipt clearing credit `0.0000`, net difference `90.0000`; clearing variance row count `2`, first matching amount `90.0000`, total variance amount `190.0000` because the reversed receipt warning amount remains visible.
- Financial statement result: GL shows AP `210` credit `90.0000` and Inventory Clearing `240` debit balance `90.0000`; COGS `DEV11-5000`, Inventory Asset `DEV11-1200`, and Adjustment Loss `DEV11-5100` net to `0.0000`; Trial Balance period debit/credit `570.0000`/`570.0000` and closing debit/credit `90.0000`/`90.0000`, balanced; P&L net profit `0.0000`; Balance Sheet balanced with total assets `0.0000`, total liabilities/equity `0.0000`, Inventory Clearing `-90.0000`, AP `90.0000`.
- Dashboard summary checked only as safe high-level totals: ledger basis `POSTED_AND_REVERSED_JOURNALS`, receivables `125.0000` across `1`, payables `90.0000` across `1`, revenue/VAT/cash all `0.0000`.
- Blockers/discrepancies: none found. Expected clarifications are that low stock is zero because the item is above reorder point, clearing variance includes the reversed receipt warning row, and operational valuation `250.0000` differs from Inventory Asset GL `0.0000` by design.
- Temporary checker `apps/api/scripts/dev11-part14-inventory-report-check.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 15: inventory valuation report evidence verification`.

## Next Thread Prompt

`DEV-11 Part 15: inventory valuation report evidence verification`

## DEV-11 Part 15 - Inventory Valuation Report Evidence Verification Completed

- DEV-11 Part 15 inventory valuation report evidence verification is recorded in [docs/development/DEV_11_INVENTORY_VALUATION_REPORT_EVIDENCE_VERIFICATION.md](docs/development/DEV_11_INVENTORY_VALUATION_REPORT_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `7f962880 Check DEV-11 inventory valuation reports`.
- Mutation performed: no.
- Output generation performed: no CSV, no PDF, no generated-document download/archive, and no body output.
- Report service queries performed during Part 15: no; verification used direct local marker counts, operational movement math, and posted/reversed journal account aggregates.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Verification result: passed. Part 14 inventory totals were confirmed as inbound `30.0000`, outbound `5.0000`, closing `25.0000`, moving-average cost `10.0000`, operational value `250.0000`, and low-stock expectation `0`.
- Financial verification result: direct journal totals debit/credit `570.0000`/`570.0000`; COGS `DEV11-5000`, Inventory Asset `DEV11-1200`, Adjustment Loss `DEV11-5100`, and Adjustment Gain `DEV11-4100` net `0.0000`; Inventory Clearing `240` net debit-minus-credit `90.0000`; AP `210` net debit-minus-credit `-90.0000`.
- Baseline verification: stock movements `3`, journal entries `7`, journal lines `14`, variance proposals `1`, variance proposal events `5`, generated documents `0`, audit logs `9`.
- No-body/no-secret scan found no URL-like DB strings, bearer/auth headers, private-key markers, env assignments, obvious password/token assignments, or long base64-like blobs in the Part 14 evidence and handoff.
- Blockers/discrepancies: none found. Remaining production gaps are accountant certification, production/beta/customer-data proof, FIFO/cost layers, landed cost, automatic posting policies, returns/serial/batch, multi-currency, and broad E2E/smoke/full-test/load/concurrency proof.
- Temporary verifier `apps/api/scripts/dev11-part15-report-evidence-verify.temp.ts` was removed after the check.
- Exact next prompt title: `DEV-11 Part 16: inventory valuation and COGS closure`.

## Next Thread Prompt

`DEV-11 Part 16: inventory valuation and COGS closure`

## DEV-11 Part 16 - Inventory Valuation And COGS Closure Completed

- DEV-11 Part 16 closure is recorded in [docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md](docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md).
- Latest commit inspected: `445db0ed Verify DEV-11 inventory valuation report evidence`.
- Marker: `DEV11-INV-20260530T000000`.
- DEV-11 is closed as local-only inventory valuation and COGS evidence.
- Evidence summary: Part 1-15 covered local preflight, fixture creation, fixture verification, manual sales stock issue COGS post/reverse and verification, compatible purchase receipt inventory asset post/reverse and verification, clearing variance proposal create/submit/approve/post/reverse and verification, inventory valuation report checks, financial statement impact checks, direct evidence verification, and no-body/no-secret checks.
- What DEV-11 proves: local marker fixture math, manual COGS posting/reversal, manual receipt asset posting/reversal, variance proposal lifecycle/posting/reversal, inventory valuation report summaries, clearing reports, GL, Trial Balance, P&L, Balance Sheet, dashboard totals, and generated-document count stability for the marker scope.
- Production gaps: FIFO/cost layers, landed cost, automatic posting, negative-stock production policy, serial/batch/bin/location, purchase returns, sales returns inventory impact, historical direct-mode migration, multi-currency inventory, transfer-fee/landed allocation, accountant review, broad E2E/smoke/full-test, hosted/beta/customer-data proof, load/concurrency, and object-storage/generated-document retention if outputs intersect inventory.
- DEV-11 does not prove production readiness, beta readiness, customer-data behavior, accountant certification, FIFO/landed-cost completeness, automatic COGS, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Closure actions only updated docs; no runtime mutation, new report query, CSV/PDF/download/archive output, E2E, smoke, full test, full build, migration, seed/reset/delete, deploy, env change, production/beta/customer-data access, ZATCA, email, backup, restore, or app-code change was performed.
- Exact next prompt title: `DEV-12 Part 1: generated documents storage retention production-gap and E2E readiness preflight`.

## Next Thread Prompt

`DEV-12 Part 1: generated documents storage retention production-gap and E2E readiness preflight`

## DEV-12 Part 1 - Generated Documents Storage Retention Preflight Completed

- DEV-12 Part 1 generated documents storage retention preflight is recorded in [docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_PREFLIGHT.md](docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_PREFLIGHT.md).
- Latest commit inspected: `0b3c1e4b Close DEV-11 inventory valuation COGS evidence`.
- Scope: documentation and read-only code inspection only; no login, fixture creation, runtime mutation, output generation, archive/download, storage migration, retention mutation, report query, E2E, smoke, full test, full build, migration, seed/reset/delete, deploy, env change, production/beta/customer data, ZATCA, email, backup, restore, body output, or secret output was performed.
- Current generated documents are database/base64 backed through `GeneratedDocumentService.archivePdf`, with `storageProvider = "database"`, `contentBase64`, `contentHash`, `sizeBytes`, and status `GENERATED`.
- Highest-risk gaps: generated-document object storage is not implemented, database/base64 migration is dry-run/count-only, signed URLs/lifecycle/legal hold/purge/malware scanning/restore proof are missing, repeated generation remains append-only without supersede/latest policy, and generated-document retention/legal compliance is not proven.
- Storage readiness can report generated-document storage status and migration-plan counts, but generated-document S3 writes are explicitly not enabled and migration execution is not implemented.
- ZATCA invoice PDF archive remains metadata-only at the PDF/A-3 boundary and must not be treated as signed XML, QR payload, or production compliance proof.
- Exact next prompt title: `DEV-12 Part 2: approved local generated-document fixture creation`.

## Next Thread Prompt

`DEV-12 Part 2: approved local generated-document fixture creation`

## DEV-12 Part 2 - Local Generated-Document Fixture Creation Completed

- DEV-12 Part 2 local generated-document fixture creation is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_FIXTURE_MUTATION_EVIDENCE.md](docs/development/DEV_12_GENERATED_DOCUMENT_FIXTURE_MUTATION_EVIDENCE.md).
- Latest commit inspected before mutation: `fa367c8c Preflight DEV-12 generated document storage`.
- Exact Part 2 approval phrase was received and validated before mutation.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Marker used: `DEV12-DOC-20260530T000000`.
- Mutation performed: yes, local-only and marker-scoped.
- Fixture created: one marker organization, one fake local marker user, one marker role/membership for local continuity, and one generated document.
- Generated-document metadata: safe ID prefix `663e5c68`, type `REPORT_TRIAL_BALANCE`, source type `AccountingReport`, source id `DEV12-DOC-20260530T000000-REPORT-TRIAL-BALANCE`, document number `DEV12-DOC-TB-0001`, filename `DEV12-DOC-trial-balance.pdf`, MIME `application/pdf`, storage provider `database`, status `GENERATED`, size `129` bytes, content hash prefix `29bb1b32935c488b`.
- Marker counts after mutation: organizations `1`, users `1`, generated documents `1`, generated-document audit logs `1`, attachments touched `0`, backup evidence touched `0`, storage migration records `0`.
- No `contentBase64`, PDF bytes, DB URLs, tokens, secrets, customer/vendor payloads, external object storage, ZATCA, email, backup, restore, storage migration, retention purge/delete, or download was used.
- Temporary helper `apps/api/scripts/dev12-part2-fixture.temp.ts` was removed after the fixture run.
- Exact next prompt title: `DEV-12 Part 3: generated-document fixture evidence verification`.

## Next Thread Prompt

`DEV-12 Part 3: generated-document fixture evidence verification`

## DEV-12 Part 3 - Generated-Document Fixture Evidence Verification Completed

- DEV-12 Part 3 fixture evidence verification is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_FIXTURE_EVIDENCE_VERIFICATION.md](docs/development/DEV_12_GENERATED_DOCUMENT_FIXTURE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `87644b30 Create DEV-12 generated document fixture`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation/download/output occurred: no.
- Fixture readiness result: passed with no discrepancies or blockers.
- Marker verified: organizations `1`, users `1`, generated documents `1`, generated-document audit logs `1`, `contentBase64` presence count `1`, external storage rows `0`, marker pollution rows `0`.
- Generated-document metadata verified: safe ID prefix `663e5c68`, type `REPORT_TRIAL_BALANCE`, source type `AccountingReport`, document number `DEV12-DOC-TB-0001`, filename `DEV12-DOC-trial-balance.pdf`, storage provider `database`, storage key `null`, status `GENERATED`, hash prefix `29bb1b32935c488b`, size `129`.
- `contentBase64` value and PDF bytes were not selected or printed; no generated-document download was performed.
- Temporary verifier `apps/api/scripts/dev12-part3-verify.temp.ts` was removed after the read-only check.
- Exact next prompt title: `DEV-12 Part 4: generated-document metadata list detail preflight`.

## Next Thread Prompt

`DEV-12 Part 4: generated-document metadata list detail preflight`

## DEV-12 Part 4 - Generated-Document Metadata List Detail Preflight Completed

- DEV-12 Part 4 metadata list/detail preflight is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_PREFLIGHT.md](docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_PREFLIGHT.md).
- Latest commit inspected: `d89ff0ea Verify DEV-12 generated document fixture`.
- Scope: documentation and read-only code inspection/planning only; no runtime mutation, metadata query, download, body output, archive generation, fixture creation, storage migration, retention mutation, E2E, smoke, migration, seed/reset/delete, deploy, env change, production/beta/customer data, ZATCA, email, backup, or restore occurred.
- Expected metadata/list/detail behavior: `GET /generated-documents` and `GET /generated-documents/:id` require `generatedDocuments.view`, use a metadata select that excludes `contentBase64`, support `documentType`, `sourceType`, `sourceId`, and `status` filters, and should expose only safe metadata for the DEV-12 fixture.
- Download remains a separate `generatedDocuments.download` body-output gate and is deferred to Part 7/8.
- Exact next prompt title: `DEV-12 Part 5: approved local generated-document metadata list detail checks`.

## Next Thread Prompt

`DEV-12 Part 5: approved local generated-document metadata list detail checks`

## DEV-12 Part 5 - Generated-Document Metadata Checks Completed

- DEV-12 Part 5 metadata checks are recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_CHECK_EVIDENCE.md](docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_CHECK_EVIDENCE.md).
- Latest commit inspected: `d23d2dea Preflight DEV-12 generated document metadata`.
- Exact Part 5 approval phrase was received and validated before metadata checks.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation performed: no.
- Metadata queries performed: yes, local-only service list/detail/filter reads.
- Download/output performed: no.
- Expected vs actual metadata behavior: matched. List/detail returned only safe metadata keys and excluded `contentBase64`, body, buffer, PDF bytes, and generic content fields.
- Filter results: document type, source type, source id, and status filters each resolved the marker generated document.
- Permission metadata verified: list/detail require `generatedDocuments.view`; download requires `generatedDocuments.download`.
- Count stability: marker generated documents remained `1`; generated-document audit logs remained `1`.
- Blockers/discrepancies: none found.
- Temporary checker `apps/api/scripts/dev12-part5-metadata-check.temp.ts` was removed after the read-only check.
- Exact next prompt title: `DEV-12 Part 6: generated-document metadata list detail evidence verification`.

## DEV-12 Part 6 - Generated-Document Metadata Evidence Verification Completed

- DEV-12 Part 6 generated-document metadata evidence verification is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_EVIDENCE_VERIFICATION.md](docs/development/DEV_12_GENERATED_DOCUMENT_METADATA_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `3f1e328a Check DEV-12 generated document metadata`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation performed: no.
- Output/download performed: no.
- Verification result: Part 5 metadata evidence remained marker-scoped, count-stable, body-free, and secret-free. The marker generated-document count remained `1`, the generated-document audit-log count remained `1`, metadata still excluded `contentBase64` and body fields, and hash/size/status/storage provider fields matched the fixture.
- Blockers/discrepancies: none found. Two initial `tsx` launcher attempts failed before verification because of environment/path resolution; the final direct local `tsx.cmd` invocation completed successfully without mutation or download.
- Temporary verifier `apps/api/scripts/dev12-part6-metadata-verify.temp.ts` was removed after the read-only check.
- Exact next prompt title: `DEV-12 Part 7: generated-document download gate preflight`.

## DEV-12 Part 7 - Generated-Document Download Gate Preflight Completed

- DEV-12 Part 7 generated-document download gate preflight is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_PREFLIGHT.md](docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_PREFLIGHT.md).
- Latest commit inspected: `670fdb9d Verify DEV-12 generated document metadata evidence`.
- Runtime mutation/download/output performed: no.
- Expected Part 8 download metadata/hash behavior: local marker download should return `application/pdf`, filename `DEV12-DOC-trial-balance.pdf`, byte length `129`, and a downloaded-buffer SHA-256 matching stored `contentHash` prefix `29bb1b32935c488b`.
- Expected Part 8 count behavior: archive delta `0`; generated-document audit-log delta `0` unless the code is changed to log downloads before Part 8.
- Permission gate expectation: `GET /generated-documents/:id/download` requires `generatedDocuments.download`; `generatedDocuments.view` alone is insufficient.
- Blockers/discrepancies: none found in preflight. Generated-document storage remains database/base64-backed and not object-storage-ready.
- Exact next prompt title: `DEV-12 Part 8: approved local generated-document download gate checks`.

## DEV-12 Part 8 - Generated-Document Download Gate Checks Completed

- DEV-12 Part 8 generated-document download gate checks are recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_CHECK_EVIDENCE.md](docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_CHECK_EVIDENCE.md).
- Latest commit inspected: `6b822ff0 Preflight DEV-12 generated document download gate`.
- Exact Part 8 approval phrase was received and validated before the local marker download check.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation performed: no, except the approved local download read.
- Download performed: yes, local-only metadata/hash only for the marker synthetic generated document.
- Output body printed: no.
- Download result: filename `DEV12-DOC-trial-balance.pdf`, MIME type `application/pdf`, size `129`, downloaded SHA-256 `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f`, matching stored metadata.
- Count stability: marker generated documents remained `1`; generated-document audit logs remained `1`; archive delta `0`; audit delta `0`.
- Missing id behavior returned `NotFoundException` without body output. Permission checks allowed `generatedDocuments.download` and `admin.fullAccess`, and rejected view-only/source-view-only permissions.
- Blockers/discrepancies: none found. Generated-document bodies remain database/base64-backed and not object-storage-ready.
- Temporary checker `apps/api/scripts/dev12-part8-download-check.temp.ts` was removed after the approved local check.
- Exact next prompt title: `DEV-12 Part 9: generated-document download gate evidence verification`.

## DEV-12 Part 9 - Generated-Document Download Gate Evidence Verification Completed

- DEV-12 Part 9 generated-document download gate evidence verification is recorded in [docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_EVIDENCE_VERIFICATION.md](docs/development/DEV_12_GENERATED_DOCUMENT_DOWNLOAD_GATE_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `aac198d3 Check DEV-12 generated document download gate`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Mutation performed: no.
- Output body printed: no.
- New download performed: no.
- Verification result: Part 8 hash/size/count evidence still matches current marker metadata. Marker generated documents remained `1`, generated-document audit logs remained `1`, marker pollution count was `0`, and the evidence scan found no long base64-like values or secret/auth/connection patterns.
- Blockers/discrepancies: none found. Generated-document object storage, retention/legal hold, purge/cleanup, restore proof, malware scanning, hosted/beta/customer-data behavior, and production readiness remain unproven.
- Temporary verifier `apps/api/scripts/dev12-part9-download-evidence-verify.temp.ts` was removed after the read-only check.
- Exact next prompt title: `DEV-12 Part 10: storage readiness and migration dry-run preflight`.

## DEV-12 Part 10 - Storage Readiness And Migration Dry-Run Preflight Completed

- DEV-12 Part 10 storage readiness and migration dry-run preflight is recorded in [docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_PREFLIGHT.md](docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_PREFLIGHT.md).
- Latest commit inspected: `9e562375 Verify DEV-12 generated document download gate`.
- Runtime mutation/storage migration/upload/delete/download performed: no.
- Expected storage readiness behavior: local providers should default to `database`; attachment and generated-document readiness should be ready with local/dev database warnings; S3 config output should be boolean/redacted only.
- Expected migration dry-run behavior: count-only marker organization plan with `dryRunOnly: true`, expected generated-document count `1`, generated-document total bytes `129`, database storage count `1`, S3 storage count `0`, and no object copy/delete/rewrite.
- Expected backup relation: backup readiness/restore plan are read-only metadata planning only; backup evidence mutations remain out of scope.
- Blockers/discrepancies: none found in preflight. Generated-document object storage, migration execution, retention/legal hold, restore proof, malware scanning, and production readiness remain unproven.
- Exact next prompt title: `DEV-12 Part 11: approved local storage readiness and migration dry-run checks`.

## DEV-12 Part 11 - Storage Readiness And Migration Dry-Run Checks Completed

- DEV-12 Part 11 storage readiness and migration dry-run checks are recorded in [docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_CHECK_EVIDENCE.md](docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_CHECK_EVIDENCE.md).
- Latest commit inspected: `0e8b4828 Preflight DEV-12 storage readiness dry run`.
- Exact Part 11 approval phrase was received and validated before local readiness/dry-run checks.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Runtime mutation performed: no.
- Migration executed: no.
- Upload/delete performed: no.
- Readiness result: attachment provider `database`, generated-document provider `database`, both ready with local/dev database storage warnings; S3 config output was boolean/redacted only.
- Migration dry-run result: `dryRunOnly: true`, generated-document count `1`, generated-document total bytes `129`, attachment count `0`, database storage count `1`, S3 storage count `0`, target provider `database`, no object copy/delete/rewrite.
- Backup readiness relation result: read-only, no mutation, no backup/restore executed, `productionReady=false`, all required evidence types missing for the marker organization.
- Count stability: marker generated documents `1 -> 1`, generated-document audit logs `1 -> 1`, marker organization attachments `0 -> 0`, backup/restore evidence `0 -> 0`.
- Blockers/discrepancies: none found. Generated-document object storage, migration executor, backup/restore proof, malware scanning, retention/legal hold, hosted/beta/customer-data behavior, and production readiness remain unproven.
- Temporary checker `apps/api/scripts/dev12-part11-storage-check.temp.ts` was removed after the approved local check.
- Exact next prompt title: `DEV-12 Part 12: storage readiness and migration dry-run evidence verification`.

## DEV-12 Part 12 - Storage Readiness And Migration Dry-Run Evidence Verification Completed

- DEV-12 Part 12 storage readiness and migration dry-run evidence verification is recorded in [docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_EVIDENCE_VERIFICATION.md](docs/development/DEV_12_STORAGE_READINESS_MIGRATION_DRY_RUN_EVIDENCE_VERIFICATION.md).
- Latest commit inspected: `4f40accd Check DEV-12 storage readiness dry run`.
- Local target proof: `postgresql` on `localhost:5432/accounting`, classified local-only; no hosted/provider target was used.
- Mutation performed: no.
- Migration/upload/delete performed: no.
- Verification result: marker generated document remains `database` backed with `storageKey = null`; Part 11 dry-run evidence still matches current counts, with marker generated documents `1`, generated-document audit logs `1`, marker attachments `0`, backup/restore evidence rows `0`, S3-backed generated documents `0`, `dryRunOnly: true`, and no migration execution.
- Redaction result: no long base64-like values, secret/auth/connection patterns, signed URLs, object keys, object bodies, or `contentBase64` values were found in Part 11 evidence.
- Blockers/discrepancies: none found. Generated-document object storage, migration executor, backup/restore proof, malware scanning, retention/legal hold, hosted/beta/customer-data behavior, and production readiness remain unproven.
- Temporary verifier `apps/api/scripts/dev12-part12-storage-evidence-verify.temp.ts` was removed after the read-only check.
- Exact next prompt title: `DEV-12 Part 13: retention legal hold cleanup policy preflight`.

## DEV-12 Part 13 - Retention Legal Hold Cleanup Policy Preflight Completed

- DEV-12 Part 13 retention legal hold cleanup policy preflight is recorded in [docs/development/DEV_12_RETENTION_LEGAL_HOLD_CLEANUP_POLICY_PREFLIGHT.md](docs/development/DEV_12_RETENTION_LEGAL_HOLD_CLEANUP_POLICY_PREFLIGHT.md).
- Latest commit inspected: `854f551b Verify DEV-12 storage readiness dry run evidence`.
- Runtime mutation/retention mutation/delete/purge/download/output performed: no.
- Highest-risk retention/legal-hold gaps: no generated-document retention duration, no legal-hold field/workflow/enforcement, no generated-document soft-delete/purge/cleanup/restore executor, no approved accounting/tax retention duration, unresolved customer-data deletion conflict, no backup-retention alignment proof, no generated-document object lifecycle, and no destructive-cleanup approval model.
- Recommended policy posture: preserve generated documents by default until a future dry-run-first, marker/tenant-scoped, approval-gated cleanup executor exists and legal/accounting retention rules are approved.
- Exact next prompt title: `DEV-12 Part 14: generated documents storage retention closure`.

## DEV-12 Part 14 - Generated Documents Storage Retention Closure Completed

- DEV-12 Part 14 closure completed.
- Closure doc: [docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md](docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md).
- Latest commit inspected: `151c3f37 Preflight DEV-12 retention cleanup policy`.
- Marker: `DEV12-DOC-20260530T000000`.
- Evidence summary: DEV-12 created and verified one synthetic DB-backed generated document; confirmed metadata list/detail/filter output excludes bodies; confirmed one approved local download metadata/hash check without body output; confirmed storage readiness and migration dry-run checks are count-only; and documented retention/legal-hold cleanup policy gaps.
- Fixture summary: generated document count `1`, generated-document audit-log count `1`, attachments `0`, backup/restore evidence rows `0`, storage provider `database`, storage key `null`, size `129`, SHA-256 `29bb1b32935c488bc28a21d53133b1384f9b0cd5e40d31956794e728de213f5f`.
- Production gaps: object storage for generated documents, database/base64 migration, signed URLs, lifecycle policy, legal hold, tax/accounting retention approval, customer-data deletion/retention conflict, malware scanning, restore proof, backup proof, generated-document purge executor, versioning/supersede policy, PDF/A-3/ZATCA artifact boundaries, hosted/beta/customer-data proof, broad E2E/smoke/full-test, load/concurrency for large PDFs, and accountant/legal review.
- DEV-12 is closed as local-only generated documents storage retention evidence.
- DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Exact next prompt title: `DEV-13 Part 1: role permission matrix production-gap and E2E readiness preflight`.

## Next Thread Prompt

`ZATCA next sprint: local signed XML validation plan or repeatable SDK CI runner design`

## Next Thread Prompt

`ZATCA local signed XML validation plan`

## ZATCA SDK CI Readiness Guard Completed

- Latest commit inspected: `6db215e5 Validate generated ZATCA XML fixtures locally`.
- Added `scripts/zatca-sdk-ci-readiness.cjs` and `scripts/zatca-sdk-ci-readiness.test.cjs`.
- Added root scripts: `zatca:sdk-ci-readiness` and `test:zatca-sdk-ci-readiness`.
- Added `docs/zatca/ZATCA_SDK_CI_RUNNER_PLAN.md`.
- Current guard status: `CI_BLOCKED_MISSING_SDK_REFERENCE`.
- CI posture: blocked, not ready. The official SDK exists locally under ignored `reference/`, but it is not available from a fresh checkout; default Java 17 remains unsupported. Local-only validation remains possible with an explicit Java 11-14 `ZATCA_SDK_JAVA_BIN`.
- PR CI remains non-ZATCA; SDK validation is not enabled in GitHub Actions.
- Real ZATCA network calls, signing, CSID/OTP, clearance/reporting, PDF/A-3, production credentials, email, deploys, migrations, seed/reset/delete, production/beta/customer data mutation, and production compliance remain disabled.

## ZATCA Approved Local Dummy Signing Execution Completed

- Latest commit inspected before execution: `158578d3 Plan approved ZATCA dummy signing execution`.
- Approval phrase matched exactly.
- SDK signing executed: yes, local dummy-material only.
- SDK QR executed: yes, local dummy-material only.
- Signed XML validation executed: yes, local dummy-material only.
- Real ZATCA network used: no.
- CSID/OTP used: no.
- Production/beta/customer data used: no.
- Private keys/certificates exposed: no; dummy material was used by SDK config only and certificate/private-key body content was not printed, copied into app storage, committed, or persisted as evidence.
- Fixture statuses:
  - `ledgerbyte-generated-standard-invoice`: sign `PASSED`, QR `PASSED`, signed validation `PASSED`.
  - `ledgerbyte-generated-credit-note`: sign `PASSED`, QR `PASSED`, signed validation `PASSED`.
- Evidence file path: `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.
- Cleanup status: `SUCCESS`; temp unsigned XML, signed XML, SDK runtime/config copies, and temp workspace were cleaned up.
- Redaction result: metadata-only evidence; no XML body, signed XML body, QR payload body, private-key body, certificate body, OTP, CSID material, token, auth header, request/response body, customer/vendor payload, attachment body, or unsafe raw SDK stdout/stderr was persisted.
- Current blockers: key custody decision, sandbox OTP/CSID, real signing credentials/certificate lifecycle, Phase 2 QR production proof, clearance/reporting, PDF/A-3, retry/error queue, production signed-artifact storage, official/legal/accounting reviews, and repeatable SDK CI.
- Exact next prompt title: `ZATCA dummy signing result review and Phase 2 QR gap analysis`.

## Next Thread Prompt

`ZATCA dummy signing result review and Phase 2 QR gap analysis`

## ZATCA Dummy Signing Result Review And Phase 2 QR Gap Analysis Completed

- Latest commit inspected: `3ef5a7c6 Execute ZATCA dummy signing locally`.
- Evidence reviewed: `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.
- Result review doc: `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md`.
- Phase 2 QR gap analysis doc: `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md`.
- Evidence validation: approval matched, environment `LOCAL_DUMMY_SIGNING_NO_NETWORK`, fixture count `2`, passed `2`, failed `0`, blocked `0`, both approved fixtures sign/QR/signed-validation `PASSED`, exit codes `0`, temp cleanup `SUCCESS`, no network, production compliance false, redaction flags safe.
- SDK signing executed in this review task: no.
- SDK QR executed in this review task: no.
- SDK signed XML validation executed in this review task: no.
- SDK hash command executed in this review task: no.
- ZATCA network, CSID, or OTP used in this review task: no.
- Private-key/certificate bodies exposed: no.
- Current blockers: sandbox OTP/CSID approval planning, compliance and production CSID lifecycle execution, production key custody implementation, real signing credentials/certificate lifecycle, production Phase 2 QR proof, clearance/reporting, PDF/A-3, retry/error queue, production signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.
- Exact next prompt title: `ZATCA sandbox CSID request execution guard`.

## Next Thread Prompt

`ZATCA sandbox CSID request execution guard`

## LedgerByte ZATCA Custody Provider Boundary Implementation Completed

- Branch: `codex/zatca-custody-provider-boundary-preflight`.
- Starting commit: `fe6642f3 Document ZATCA custody provider boundary preflight`.
- Implemented safe reference-only ZATCA custody provider boundary interfaces/classes for disabled and local-reference test-only behavior.
- Runtime provider remains disabled by default; local-reference provider requires explicit test-only construction and does not enable real custody.
- API readiness metadata now exposes reference-only boundary availability and legacy blocker fields without enabling custody.
- No real OTP, real CSID, real ZATCA network call, sandbox portal login, private-key generation/storage, raw certificate/CSR storage, request/response body handling, signing, clearance/reporting, PDF-A-3, provider/env change, migration execution, deploy, production credential, or production compliance claim was performed.
- Graphify output remained ignored and uncommitted.
- Implementation doc: `docs/development/ZATCA_CUSTODY_PROVIDER_BOUNDARY_IMPLEMENTATION.md`.
- Exact next prompt title: `LedgerByte verify ZATCA custody provider boundary evidence`.

## ZATCA Sandbox CSID Request Execution Guard Completed

- Latest commit inspected before this sprint: `6e486f3c Plan ZATCA sandbox CSID approval`.
- Repository reconciliation result: required baseline ZATCA guard/docs/reference readiness files were present; no prior sandbox CSID request execution guard docs/scripts existed, so the existing preflight guard was extended instead of duplicating scripts.
- Guard script: `scripts/zatca-sandbox-csid-preflight.cjs`.
- Guard tests: `scripts/zatca-sandbox-csid-preflight.test.cjs`.
- Guard doc: `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md`.
- Result doc: `docs/zatca/SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.
- Approval phrase: `I approve ZATCA sandbox compliance CSID request execution guard only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, no adapter execution, and metadata-only evidence.`
- Execution guard status: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- Execute flag status: `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Secrets/bodies exposed: no.
- Request body created: no.
- Response body processed or persisted: no.
- Production signing enabled: no.
- Production compliance enabled: no.
- Current blockers: key custody, CSID response custody, real sandbox adapter execution, actual OTP capture approval, compliance CSID request execution approval, compliance invoice checks, production CSID lifecycle, production signing and Phase 2 QR, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.
- Exact next prompt title: `ZATCA CSID response custody implementation plan`.

## Next Thread Prompt

`ZATCA CSID response custody implementation plan`

## ZATCA Sandbox OTP And Compliance CSID Approval Plan Completed

- Latest commit inspected before the approval-plan sprint: `68f94334 Guard ZATCA sandbox CSID preflight`.
- 2026-06-07 continuation inspected latest pushed branch state: `90dec971 Plan ZATCA sandbox CSID approval`.
- Approval plan doc: `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`.
- Approval runbook doc: `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`.
- Approval result doc: `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`.
- Guard extension: `--approval-phrase <text>` plus `--approval-plan`.
- Approval phrase: `I approve ZATCA sandbox OTP and compliance CSID request planning only. No production, no customer data, no production CSID, no clearance, no reporting, no PDF-A3, no signing enablement, no secret/body exposure, and metadata-only evidence.`
- Approval phrase matched: yes.
- Approval recognition status: `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.
- OTP/CSID/network call made: no.
- Sandbox adapter executed: no.
- Secret/body exposure: no.
- Production signing enabled: no.
- Current blockers: key custody implementation, CSID response custody approval, sandbox CSID request execution guard, real sandbox adapter execution, actual OTP capture approval, compliance CSID request execution approval, compliance invoice checks, production CSID lifecycle, production signing, Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed-artifact storage, official/legal/accounting review, and repeatable SDK CI.
- Exact next prompt title: `ZATCA sandbox CSID request execution guard`.

## Next Thread Prompt

`ZATCA sandbox CSID request execution guard`
