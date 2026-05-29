# DEV-08K AP Email Local UI Outbox QA Evidence

## Purpose And Scope

- Task: `DEV-08K Part 17: approved local authenticated AP email UI outbox QA`.
- Latest commit inspected: `a91b144e Plan DEV-08K AP email UI outbox QA`.
- Approval phrase status: exact Part 17 phrase received up front and re-validated before the local UI outbox mutation.
- Runtime outbox mutation performed: yes, exactly one local AP generated-document email outbox row.
- Browser/login performed: yes, local-only authenticated UI flow.
- Provider calls performed: no.
- Real email sent: no.

The run used only local `localhost` web/API/database targets and a synthetic `.test` recipient. It did not use production, beta, hosted/shared, or customer data; did not call a real email provider; did not run retry workers, webhooks, diagnostics sends, SMTP, migrations, seed/reset/delete, deploys, PDF generation/download, body/base64 reads, backup/restore, real ZATCA, signing, clearance/reporting, or PDF-A3.

## Local-Only Target

Sanitized database target:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

Runtime readiness:

| Target | Result |
| --- | --- |
| API `GET /health` | `200` |
| API `GET /readiness` | `200` |
| Web `/documents` | reached after local authenticated session setup |

No database URL, password, token, cookie, auth header, request body, response body, email body, attachment body, PDF body, base64, signed XML, QR payload, private key, CSID, SMTP payload, provider payload, customer/vendor data, or source contact email was printed.

## Selected User And Document

Authenticated local user:

| Field | Value |
| --- | --- |
| User | `admin@example.com` |
| Display name | `Demo Admin` |
| Role | `Owner` |
| Organization | `Demo GCC Trading` |
| Organization safe prefix | `00000000` |
| Permission count | `132` |
| Full access | `true` |

Required permission checks were all `true`: `generatedDocuments.download`, `emailOutbox.view`, and `purchaseBills.view`.

Selected AP generated document:

| Field | Value |
| --- | --- |
| Generated document safe prefix | `27a07429` |
| Status before | `GENERATED` |
| Status after | `GENERATED` |
| Document type | `PURCHASE_BILL` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Document/source number | `BILL-000423` |
| Filename | `purchase-bill-BILL-000423.pdf` |
| MIME type | `application/pdf` |
| Byte count before/after | `3417` / `3417` |
| Content hash prefix before/after | `47935bce9f75` / `47935bce9f75` |

## UI Action Evidence

| Check | Result |
| --- | --- |
| Login route visited | `true` |
| Selected local organization applied | `true` |
| Documents route visited | `true` |
| Filtered document type | `PURCHASE_BILL` |
| Filtered status | `GENERATED` |
| Recipient | `dev08k-ap-20260528t000000-ui@ledgerbyte.local.test` |
| UI action clicked | `true` |
| AP outbox POST count | `1` |
| AP outbox POST status | `201` |
| Success message visible | `true` |

The first browser attempt stopped before clicking the action because stale local browser organization state showed a different local organization. No outbox mutation occurred in that stopped attempt. The successful run explicitly applied the selected local organization in browser storage before visiting `/documents`.

## Count Evidence

| Check | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Email outbox rows | `228` | `229` | `1` |
| DEV-08K marker email rows | `1` | `2` | `1` |
| AP generated-document email rows | `1` | `2` | `1` |
| Selected generated-document email rows | `1` | `2` | `1` |
| Provider events | `0` | `0` | `0` |
| Generated documents | `870` | `870` | `0` |
| Synthetic recipient rows | `0` | `1` | `1` |
| Selected-document synthetic recipient rows | `0` | `1` | `1` |
| Synthetic recipient attachment metadata rows | `0` | `1` | `1` |

## Created Outbox Row

| Field | Value |
| --- | --- |
| Outbox safe prefix | `b61d54e2` |
| Status | `SENT_MOCK` |
| Provider | `mock-no-send` |
| Attempt count | `0` |
| Max attempts | `0` |
| Next attempt | `null` |
| Sent at | `null` |
| Provider message id | `null` |
| Generated document safe prefix | `27a07429` |
| Source type | `PurchaseBill` |
| Source safe prefix | `16e6f021` |
| Attachment filename | `purchase-bill-BILL-000423.pdf` |
| Attachment MIME type | `application/pdf` |
| Attachment byte count | `3417` |
| Attachment content hash prefix | `47935bce9f75` |
| Created at | `2026-05-29T00:35:15.186Z` |

Provider/no-send result:

| Check | Result |
| --- | --- |
| Provider | `mock-no-send` |
| Status | `SENT_MOCK` |
| Provider events after action | `0` |
| Provider events delta | `0` |
| Real provider send occurred | `false` |

## Audit Evidence

| Field | Value |
| --- | --- |
| Login audit rows in run window | `1` |
| Action | `AUTH_LOGIN` |
| Entity type | `User` |
| Actor user safe prefix | `09f892d4` |
| Organization safe prefix | `00000000` |

The login audit row is the expected local authenticated UI evidence under the safe fixture login policy.

## Temporary Script Cleanup

- Disposable runner: `apps/api/scripts/dev08k-part17-ui-outbox-qa.ts`.
- Removed before evidence commit: yes.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'` returned no files after cleanup.

## Part 18 Verification Note

Part 18 read-only verification is recorded in [DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_EVIDENCE_VERIFICATION.md](DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_EVIDENCE_VERIFICATION.md).

Verification confirmed exactly one UI-created synthetic recipient row for generated document safe prefix `27a07429` and outbox safe prefix `b61d54e2`. Counts remained email outbox rows `229`, DEV-08K marker email rows `2`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, generated documents `870`, synthetic recipient rows `1`, and selected-document synthetic recipient rows `1`.

The row remained `SENT_MOCK` with provider `mock-no-send`, zero attempts, `sentAt` `null`, `providerMessageId` `null`, and attachment metadata matching `purchase-bill-BILL-000423.pdf`, byte count `3417`, and content hash prefix `47935bce9f75`. The selected generated document remained `GENERATED`; no provider send, body read, base64 read, or secret exposure occurred.

## Exposure Controls

- No password, token, cookie, auth header, request body, response body, email body, attachment body, PDF body, base64, provider payload, source contact email, customer/vendor data, signed XML, QR payload, private key, or CSID was printed.
- The AP email UI submitted only the explicit synthetic recipient through `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- The evidence records only safe prefixes, statuses, providers, counts, attachment metadata, and local route/action statuses.

## Commands Run

- `git status --short`
- `git log -1 --oneline`
- Read `CODEX_HANDOFF.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_LOCAL_UI_OUTBOX_QA_PREFLIGHT.md`.
- Read `docs/development/DEV_08K_AP_EMAIL_UI_EVIDENCE_VERIFICATION.md`.
- Read `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- Read `BUG_AUDIT.md` and `README.md`.
- Started local API with `corepack pnpm --filter @ledgerbyte/api dev`.
- Local API health/readiness and web `/documents` checks.
- Created and ran disposable local UI runner `apps/api/scripts/dev08k-part17-ui-outbox-qa.ts`.
- `corepack pnpm exec tsx scripts/dev08k-part17-ui-outbox-qa.ts`.
- Deleted disposable runner.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`.

## Commands Skipped

- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP.
- PDF generation/download, body/base64 reads, attachment body reads.
- Migrations, Prisma db push, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 18: AP email local UI outbox evidence verification`
