# DEV-08I AP Output Permission Fixture Evidence Verification

## Purpose And Scope

- Task: `DEV-08I Part 3: AP output permission fixture evidence verification`.
- Latest commit inspected: `740e9492 Create DEV-08I AP output permission fixtures`.
- Local `HEAD` matched `origin/main`: yes.
- Branch inspected: `main`.
- Marker: `DEV08I-AP-20260528T000000`.
- Runtime mutation performed: no.
- Login/browser flow performed: no.
- PDF generation/download performed: no.
- Temporary scripts created: none.

This verification was read-only. It queried local Prisma metadata and did not create, update, delete, generate, download, export, send email, call ZATCA, run login, run browser checks, run migrations, run seed/reset/delete, deploy, or change env/provider/schema settings.

## Local Target

- Target classification: `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Source organization safe prefix: `00000000`.
- No production, beta, hosted/shared-target, or customer-data target was used.

## Source Verification

| Source | Number | Safe prefix | Status | Generated documents |
| --- | --- | --- | --- | ---: |
| Purchase order | `PO-000144` | `8f42caf7` | `APPROVED` | `2` |
| Purchase bill | `BILL-000423` | `16e6f021` | `FINALIZED` | `1` |
| Supplier payment | `PAY-000318` | `7efa0003` | `POSTED` | `1` |
| Supplier refund | `SRF-000127` | `e7eed3c7` | `POSTED` | `1` |
| Purchase debit note | `PDN-000127` | `7c07411c` | `FINALIZED` | `1` |
| Cash expense | `EXP-000065` | `bd4d1330` | `POSTED` | `1` |

All selected DEV-08H sources remain present in the same local organization.

## Role And User Verification

| Fixture role | Safe prefix | Permission count | Archive view | Archive download | Purchase bill view | Active members |
| --- | --- | ---: | --- | --- | --- | ---: |
| Full output QA | `a0c6ece9` | `136` | yes | yes | yes | `1` |
| Restricted AP viewer/no archive download | `b167ef15` | `10` | yes | no | yes | `1` |
| Restricted archive-only | `83dc203f` | `4` | yes | no | no | `1` |

| Fixture user | User safe prefix | Membership count | Membership status | Role safe prefix |
| --- | --- | ---: | --- | --- |
| Full output QA user | `5281dfc0` | `1` | `ACTIVE` | `a0c6ece9` |
| Restricted AP viewer/no archive download user | `41b031e2` | `1` | `ACTIVE` | `b167ef15` |
| Restricted archive-only user | `16d72d2a` | `1` | `ACTIVE` | `83dc203f` |

The verification did not print fixture passwords, tokens, cookies, auth headers, request bodies, response bodies, or raw role/user ids beyond safe prefixes.

## Side-Effect And Exposure Verification

| Count | Verified value |
| --- | ---: |
| Generated documents for selected DEV-08H sources | `7` |
| Marker email outbox rows | `0` |
| Organization ZATCA submission logs | `331` |
| Organization ZATCA signed artifact drafts | `33` |
| Marker audit logs | `0` |

No additional generated-document, email, ZATCA, or marker audit side effects were observed after Part 2. Login was not run, so `AUTH_LOGIN` audit rows remain absent for this marker.

## Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-list --left-right --count HEAD...origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08i*'`.
- Sanitized `.env` target parsing inside the read-only Prisma verification.
- Inline read-only Prisma verification through `node -`.

## Commands Skipped

- Login, browser flow, Playwright, authenticated API calls, and `/auth/login`.
- AP PDF generation, generated-document download, output archive mutation, real email, provider calls, and ZATCA.
- Fixture/user/role mutation, accounting mutations, migrations, seed/reset/delete, cleanup/delete, deployments, env changes, provider changes, schema changes, backup/restore.
- `verify:repo`, actual `verify:ci:local`, full tests, full build, full E2E, full smoke, and production-hosting research.

## Exact Next Prompt Title

`DEV-08I Part 4: authenticated full-permission AP output API preflight`
