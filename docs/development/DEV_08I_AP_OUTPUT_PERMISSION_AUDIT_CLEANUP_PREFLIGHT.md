# DEV-08I AP Output Permission Audit And Cleanup Preflight

## Purpose And Scope

- Task: `DEV-08I Part 16: AP output permission audit and cleanup preflight`.
- Latest commit inspected: `eb81bc5f Verify DEV-08I restricted AP output UI permissions`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/API/browser/output/download performed: no.
- Cleanup/delete performed: no.
- Temporary scripts created: none.

This preflight inventoried DEV-08I fixture, generated-document, and audit posture from committed evidence documents and read-only local Prisma metadata. It did not delete or clean up data. It did not log in, open a browser, call output routes, generate documents, download generated documents, read PDF bodies/base64, send email, call ZATCA, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Local Target And Fixture Inventory

- Database target accepted from `.env` without printing credentials: protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- `apps/api/scripts` `*dev08i*` files: none.
- Marker-scoped disposable role count: `3`.
- Marker-scoped disposable user count: `3`.
- Marker-scoped disposable membership count: `3`.

| Fixture | User prefix | Membership prefix | Role prefix | Status | Permission count |
| --- | --- | --- | --- | --- | ---: |
| Full output QA | `5281dfc0` | `b7f0b3d4` | `a0c6ece9` | `ACTIVE` | `136` |
| Restricted archive-only | `16d72d2a` | `2de5260b` | `83dc203f` | `ACTIVE` | `4` |
| Restricted AP viewer/no archive download | `41b031e2` | `78a4a87c` | `b167ef15` | `ACTIVE` | `10` |

The fixtures remain local disposable evidence records. Passwords, emails, tokens, cookies, auth headers, request bodies, response bodies, and raw role/user ids were not printed.

## Generated-Document Inventory

Selected-source generated-document totals:

| Count | Current result |
| --- | ---: |
| Selected-source generated documents | `19` |
| DEV-08I generated documents by full output QA user | `12` |
| Generated documents by restricted archive-only user | `0` |
| Generated documents by restricted AP viewer/no archive-download user | `0` |

Selected-source breakdown:

| Source | Source prefix | Status | Total docs | DEV-08I full-user docs | Latest doc prefix | Latest hash prefix | Latest size |
| --- | --- | --- | ---: | ---: | --- | --- | ---: |
| `PO-000144` | `8f42caf7` | `APPROVED` | `4` | `2` | `156e0b83` | `62af5411585e` | `3227` |
| `BILL-000423` | `16e6f021` | `FINALIZED` | `3` | `2` | `069106ca` | `bbcaed4b70ac` | `3417` |
| `PAY-000318` | `7efa0003` | `POSTED` | `3` | `2` | `75b2e7ae` | `15f03c31ffab` | `3136` |
| `SRF-000127` | `e7eed3c7` | `POSTED` | `3` | `2` | `32e98b3b` | `a779ecc9c06d` | `3044` |
| `PDN-000127` | `7c07411c` | `FINALIZED` | `3` | `2` | `3a6d6bad` | `016d0f09a34a` | `3334` |
| `EXP-000065` | `bd4d1330` | `POSTED` | `3` | `2` | `5cfcbed8` | `36ec51fd92b7` | `3263` |

DEV-08I generated-document prefixes by run:

| Run | Document prefixes |
| --- | --- |
| Part 5 API output | `d9591705`, `3d817d1e`, `6ad0e7b7`, `eda73f44`, `6bf15f25`, `42748b57` |
| Part 11 UI source output | `156e0b83`, `069106ca`, `75b2e7ae`, `32e98b3b`, `3a6d6bad`, `5cfcbed8` |

No document body, base64, attachment body, or PDF content was read or printed.

## Audit Inventory

Generated-document audit rows:

| Run | Document prefix | Audit action | Audit row prefix | Actor prefix |
| --- | --- | --- | --- | --- |
| Part 5 API output | `d9591705` | `GENERATED_DOCUMENT_CREATED` | `7c2b6d3e` | `5281dfc0` |
| Part 5 API output | `3d817d1e` | `GENERATED_DOCUMENT_CREATED` | `39963611` | `5281dfc0` |
| Part 5 API output | `6ad0e7b7` | `GENERATED_DOCUMENT_CREATED` | `fb0b11ef` | `5281dfc0` |
| Part 5 API output | `eda73f44` | `GENERATED_DOCUMENT_CREATED` | `6f85fd48` | `5281dfc0` |
| Part 5 API output | `6bf15f25` | `GENERATED_DOCUMENT_CREATED` | `135b98b9` | `5281dfc0` |
| Part 5 API output | `42748b57` | `GENERATED_DOCUMENT_CREATED` | `fec2a0ee` | `5281dfc0` |
| Part 11 UI source output | `156e0b83` | `GENERATED_DOCUMENT_CREATED` | `b8883808` | `5281dfc0` |
| Part 11 UI source output | `069106ca` | `GENERATED_DOCUMENT_CREATED` | `78454889` | `5281dfc0` |
| Part 11 UI source output | `75b2e7ae` | `GENERATED_DOCUMENT_CREATED` | `7b5b8c47` | `5281dfc0` |
| Part 11 UI source output | `32e98b3b` | `GENERATED_DOCUMENT_CREATED` | `6f46263f` | `5281dfc0` |
| Part 11 UI source output | `3a6d6bad` | `GENERATED_DOCUMENT_CREATED` | `37f50110` | `5281dfc0` |
| Part 11 UI source output | `5cfcbed8` | `GENERATED_DOCUMENT_CREATED` | `c3b1f3db` | `5281dfc0` |

Login audit rows:

| Fixture | Audit rows | Audit row prefix |
| --- | ---: | --- |
| Full output QA user `5281dfc0` | `1` | `ffa6cd9d` |
| Restricted archive-only user `16d72d2a` | `1` | `4b62c358` |
| Restricted AP viewer/no archive-download user `41b031e2` | `0` | n/a |

Marker text matched audit rows: `0`. The schema does not carry a dedicated QA marker field for login/generated-document audit rows; DEV-08I evidence therefore scopes those rows by local organization, fixture actor prefix, entity type/action, selected source/document prefixes, and timestamp/order evidence rather than raw audit metadata.

Raw audit `before`/`after` metadata was not printed.

## Side-Effect Inventory

| Count | Current result |
| --- | ---: |
| Marker email outbox rows | `0` |
| Organization ZATCA submission logs | `331` |
| Organization ZATCA signed artifact drafts | `33` |

No real email/provider path, marker email row, ZATCA network/CSID/clearance/reporting/signing/PDF-A3 path, migration, seed/reset/delete, deploy, env/provider/schema change, backup/restore, production-hosting research, production target, beta target, hosted/shared target, or customer-data target was used.

## Cleanup Posture

Closure should preserve the DEV-08I fixtures and generated-document/audit evidence, and defer cleanup unless a later explicitly approved cleanup branch is opened.

Reasons:

- Part 16 is read-only and explicitly says not to delete or clean up data.
- The fixture users/roles/memberships are the evidence subjects for API and UI permission boundaries.
- The generated-document rows and their audit rows are the evidence proving full-permission generation/download and restricted-user non-generation behavior.
- Deleting fixture users or generated-document rows would change the local evidence baseline and could disrupt actor/document references.
- A future cleanup should be separately approved, local-only, and should define whether to preserve audit rows, null generated-document actors, archive evidence, or remove only disposable auth fixtures.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Read previous DEV-08I preflight/evidence/verification documents and `CODEX_HANDOFF.md`.
- Read required background docs from DEV-08H, DEV-08G, DEV-08F, DEV-08, DEV-03, DEV-02, DEV-01, `BUG_AUDIT.md`, and `README.md`.
- Read-only local Prisma metadata inventory with `node -e` from `apps/api`.

## Commands Skipped

- Cleanup/delete and any fixture/generated-document/audit mutation.
- Login, browser/UI flow, Playwright, API generation, generated-document download, AP source data routes, AP source PDF streaming, and AP source generation routes.
- Full tests, full build, full E2E, full smoke, `verify:repo`, and actual `verify:ci:local`.
- Migrations, seed/reset/delete, deploys, env/provider/schema changes, backups/restores, production-hosting research, real email, provider calls, and real ZATCA.

## Exact Next Prompt Title

`DEV-08I Part 17: AP output permission and authenticated UI QA closure`
