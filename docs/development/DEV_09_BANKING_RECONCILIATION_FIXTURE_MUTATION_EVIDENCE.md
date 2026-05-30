# DEV-09 Banking Reconciliation Fixture Mutation Evidence

Status: completed approved local-only fixture mutation
Date: 2026-05-30
Latest commit inspected: `99c7ce5d Plan DEV-09 banking reconciliation readiness`
Marker: `DEV09-BANK-20260530T000000`

## Approval

Exact approval phrase received and validated before the write-capable step:

`I approve DEV-09 Part 2 local-only banking reconciliation fixture mutation under marker DEV09-BANK-20260530T000000. No production, no beta, no customer data.`

## Local Target Proof

The mutation runner classified the active database target without printing credentials or the full URL:

| Source | Scheme | Host | Port | Database | Local |
| --- | --- | --- | --- | --- | --- |
| `apps/api/.env` / runtime `DATABASE_URL` | `postgresql` | `localhost` | `5432` | `accounting` | yes |

Docker service check before mutation showed local Postgres and Redis already running and healthy:

- `infra-postgres-1`: healthy, `5432`
- `infra-redis-1`: healthy, `6379`

No production, beta, hosted/shared, or customer-data target was used.

## Mutation Performed

Allowed local-only synthetic fixture rows were created under marker `DEV09-BANK-20260530T000000`:

- One fake local organization.
- One fake local user and banking role/membership.
- One open 2026 fiscal period for the marker organization.
- Two synthetic posting accounts:
  - `DEV09-1010` synthetic bank ledger account.
  - `DEV09-6200` synthetic bank category account.
- One active fake bank account profile:
  - display prefix: `DEV09-BANK-20260530T000000 Synthetic Bank Profile`
  - fake masked values only: `TEST-DEV09` and `SA**DEV09`
- One synthetic posted journal entry used only as a future match candidate.
- One synthetic statement import:
  - filename prefix: `DEV09-BANK-20260530T000000-synthetic-statement.csv`
  - source type: `CSV`
  - status: `IMPORTED`
  - row count: `3`
- Three synthetic statement transactions, all left `UNMATCHED`:
  - `DEV09-BANK-20260530T000000-MATCH-001`, `CREDIT`, `100.0000`
  - `DEV09-BANK-20260530T000000-CATEGORIZE-001`, `DEBIT`, `20.0000`
  - `DEV09-BANK-20260530T000000-IGNORE-001`, `DEBIT`, `5.0000`

Actions intentionally not performed:

- No real bank file import.
- No statement preview/import body output.
- No match, categorize, ignore, unignore, reconciliation create, submit, approve, close, void, or browser E2E.
- No production, beta, hosted/shared target, customer data, real bank account number, email, ZATCA, deploy, migration, seed/reset/delete, backup, restore, output download, PDF, or secret/body printing.

## Count Evidence

Global count deltas from the runner:

| Table | Before | After | Delta |
| --- | ---: | ---: | ---: |
| organizations | 13 | 14 | +1 |
| users | 94 | 95 | +1 |
| roles | 159 | 160 | +1 |
| memberships | 104 | 105 | +1 |
| accounts | 412 | 414 | +2 |
| bankAccountProfiles | 179 | 180 | +1 |
| bankStatementImports | 312 | 313 | +1 |
| bankStatementTransactions | 312 | 315 | +3 |
| bankReconciliations | 78 | 78 | 0 |
| bankReconciliationItems | 78 | 78 | 0 |
| journalEntries | 3285 | 3286 | +1 |
| journalLines | 7580 | 7582 | +2 |
| auditLogs | 11454 | 11454 | 0 |

Marker-scoped counts after mutation:

| Family | Count |
| --- | ---: |
| accounts | 2 |
| bank account profiles | 1 |
| statement imports | 1 |
| statement transactions | 3 |
| reconciliations | 0 |
| journal entries | 1 |
| journal lines | 2 |
| audit logs | 0 |

The zero reconciliation count is intentional for Part 2 because reconciliation lifecycle checks are deferred to the approved later parts.

## Side-Effect Boundary

- Runtime mutation performed: yes, local-only synthetic fixture creation under marker `DEV09-BANK-20260530T000000`.
- Production/beta/shared target used: no.
- Customer data used: no.
- Real bank files used: no.
- Real account numbers printed: no.
- Body, base64, request/response body, bank file body, secret, token, auth header, cookie, DB URL, provider payload, email body, PDF body, signed XML, or QR payload printed: no.
- Audit logs created: `0`.
- Journals created: `1` posted synthetic match-candidate journal with `2` lines.
- Reconciliations created: `0`.

## Temporary Runner Cleanup

Temporary runner created for this approved local mutation:

- `apps/api/scripts/dev09-part2-fixture-mutation.temp.ts`

Cleanup status:

- Removed after the run.
- No committed script change is required for Part 2.

## Next Step

Proceed to `DEV-09 Part 3: banking reconciliation fixture evidence verification`.
