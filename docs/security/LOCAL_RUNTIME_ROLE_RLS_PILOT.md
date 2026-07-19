# ARC-03 local runtime-role and RLS pilot

Status: executable local proof; not a hosted cutover.

## Architecture decision

LedgerByte remains API-mediated: the Prisma datasource is used by the Nest API, and the repository contains no application-table RLS migration or browser Data API integration. Application guards and explicit `organizationId` scopes remain the active production boundary. This phase adds a local pilot that proves the proposed defense-in-depth pattern without changing application tables, hosted roles, Supabase settings, or deployment secrets.

Browser clients must not receive `DATABASE_URL`, `DIRECT_URL`, service-role credentials, or direct grants to LedgerByte application tables. Supabase Data API exposure has not been live-inspected, so it is an unresolved hosted configuration item and must stay disabled or restricted until `APPROVE NON-PRODUCTION HOSTED PROOF` authorizes a dedicated proof.

## Disposable pilot grants matrix

| Role | Pilot access | Explicitly denied or absent |
| --- | --- | --- |
| migration/admin (`postgres`, local only) | Creates and tears down only the disposable proof database, roles, schema, policy, and synthetic records. | Not an API runtime credential; no hosted use. |
| runtime (`ledgerbyte_arc03_runtime`) | `USAGE` on `arc03_proof`; `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the tenant pilot table, subject to forced RLS. | Schema creation, role creation, public-schema grants, admin flags, RLS bypass, and cross-tenant rows. |
| read-only (`ledgerbyte_arc03_readonly`) | `USAGE` plus `SELECT` on the tenant pilot table, subject to forced RLS. | All writes, DDL, role administration, public-schema access, and RLS bypass. |

`PUBLIC` receives no schema or table access in the pilot. The runtime and read-only roles are `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, and `NOBYPASSRLS`.

## Tenant context and pooling

The pilot uses `SET LOCAL ledgerbyte.organization_id = '<tenant uuid>'` inside a transaction. The policy compares that transaction-local setting with each row's organization. Connection-pooled Prisma traffic must set equivalent context inside every transaction; session-scoped settings are not acceptable because they can leak across pooled requests. This has not been wired into the production Prisma client, so the pilot is evidence for incremental policy design rather than an assertion that application-table RLS is active.

## Live proof scope

The executable command uses two synthetic tenants and representative records for membership, accounts, journals, sales, purchases, contacts, generated documents, email outbox, recurring transactions, fixed assets, audit, and ZATCA state. It proves runtime DDL/role/public-schema denials, cross-tenant identifier-guessing read denial, cross-tenant write denial, read-only write denial, and local teardown.

Run only against an isolated disposable local database:

```powershell
$env:LEDGERBYTE_LOCAL_RUNTIME_ROLE_PROOF_APPROVAL='I_UNDERSTAND_THIS_MUTATES_A_DISPOSABLE_LOCAL_DATABASE'
$env:LEDGERBYTE_LOCAL_RUNTIME_ROLE_PROOF_DATABASE_URL='postgresql://postgres@127.0.0.1:55434/ledgerbyte_arc03_local_proof'
corepack pnpm --filter @ledgerbyte/api security:local-runtime-role-proof
```

The command classifies the target, refuses remote or production-looking names, and drops only its disposable proof database and roles in teardown. It does not run migrations, alter LedgerByte application tables, connect to hosted PostgreSQL, call Supabase, or deploy anything.

## Hosted boundary and rollback

Hosted runtime role creation, grants/default-privilege inspection, Supabase Data API verification, RLS policy rollout, and API secret cutover require `APPROVE NON-PRODUCTION HOSTED PROOF`. The local rollback is exercised by proof teardown; hosted rollback remains a separately approved maintenance-window operation.
