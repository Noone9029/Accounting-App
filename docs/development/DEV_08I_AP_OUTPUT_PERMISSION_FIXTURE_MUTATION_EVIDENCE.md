# DEV-08I AP Output Permission Fixture Mutation Evidence

## Purpose And Scope

- Task: `DEV-08I Part 2: approved local AP output permission fixture mutation`.
- Latest commit inspected: `202a7123 Plan DEV-08I AP output permission QA`.
- Local `HEAD` matched `origin/main`: yes.
- Branch inspected: `main`.
- Marker: `DEV08I-AP-20260528T000000`.
- Approval phrase status: received and matched exactly before mutation.
- Runtime mutation performed: yes, local disposable user/role fixture upsert only.
- Login/browser flow performed: no.
- PDF generation/download performed: no.

Approval phrase used:

`I approve DEV-08I Part 2 local-only AP output permission fixture mutation under marker DEV08I-AP-20260528T000000. No production, no beta, no customer data.`

## Local-Only Proof

- `apps/api/.env` database target was parsed without printing credentials.
- Target classification: `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Local Postgres port `5432`: reachable.
- Local Redis port `6379`: reachable.
- Docker containers observed: `infra-postgres-1` and `infra-redis-1`, both healthy.
- No production, beta, hosted/shared-target, or customer-data target was used.

## Source Confirmation

All six DEV-08H AP output sources were found in the same local organization, safe prefix `00000000`.

| Source | Number | Safe prefix | Status | Generated documents |
| --- | --- | --- | --- | ---: |
| Purchase order | `PO-000144` | `8f42caf7` | `APPROVED` | `2` |
| Purchase bill | `BILL-000423` | `16e6f021` | `FINALIZED` | `1` |
| Supplier payment | `PAY-000318` | `7efa0003` | `POSTED` | `1` |
| Supplier refund | `SRF-000127` | `e7eed3c7` | `POSTED` | `1` |
| Purchase debit note | `PDN-000127` | `7c07411c` | `FINALIZED` | `1` |
| Cash expense | `EXP-000065` | `bd4d1330` | `POSTED` | `1` |

## Fixture Mutation Result

The approved local fixture mutation created or confirmed three disposable custom roles and three disposable users. Passwords, tokens, auth headers, cookies, request bodies, and response bodies were not printed.

| Fixture role | Safe prefix | Permission count | Has `generatedDocuments.download` | Has `purchaseBills.view` |
| --- | --- | ---: | --- | --- |
| Full output QA | `a0c6ece9` | `136` | yes | yes |
| Restricted archive-only | `83dc203f` | `4` | no | no |
| Restricted AP viewer/no archive download | `b167ef15` | `10` | no | yes |

| Fixture user | User safe prefix | Membership safe prefix | Role safe prefix |
| --- | --- | --- | --- |
| Full output QA user | `5281dfc0` | `b7f0b3d4` | `a0c6ece9` |
| Restricted archive-only user | `16d72d2a` | `2de5260b` | `83dc203f` |
| Restricted AP viewer/no archive download user | `41b031e2` | `78a4a87c` | `b167ef15` |

The two restricted shapes are intentional:

- Archive-only proves archive list/detail can be allowed while archive download and AP source output are blocked.
- AP viewer/no archive download proves the current policy edge where AP source view permissions may still expose source PDF routes while archive downloads remain blocked.

## Side-Effect And Exposure Result

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents for selected DEV-08H sources | `7` | `7` |
| Marker email outbox rows | `0` | `0` |
| Organization ZATCA submission logs | `331` | `331` |
| Organization ZATCA signed artifact drafts | `33` | `33` |
| Marker audit logs | `0` | `0` |

No generated-document rows, email outbox rows, ZATCA rows, or marker audit rows were created by this fixture setup. The direct fixture upsert did not run login and therefore did not create `AUTH_LOGIN` audit rows.

## Temporary Runner Cleanup

- Temporary runner created: `apps/api/scripts/dev08i-part2-fixtures.ts`.
- Runner removed after execution: yes.
- Cleanup proof: `Test-Path apps/api/scripts/dev08i-part2-fixtures.ts` returned `False`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'` returned no files.
- The temporary runner was not staged.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Sanitized `.env` target parsing.
- `Test-NetConnection` for local Postgres and Redis ports.
- `docker ps --format ...`.
- Temporary local `tsx` runner for the approved fixture upsert.
- `Test-Path apps/api/scripts/dev08i-part2-fixtures.ts`.

## Commands Skipped

- Login, browser flow, Playwright, and `/auth/login`.
- AP PDF generation, generated-document download, output archive mutation, real email, provider calls, and ZATCA.
- Accounting state mutation beyond local disposable auth/role fixtures.
- Migrations, seed/reset/delete, cleanup/delete, deployments, env changes, provider changes, schema changes, backup/restore.
- `verify:repo`, actual `verify:ci:local`, full tests, full build, full E2E, full smoke, and production-hosting research.

## Exact Next Prompt Title

`DEV-08I Part 3: AP output permission fixture evidence verification`
