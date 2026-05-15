# Supabase Security Review

Audit date: 2026-05-15

This document records the current Supabase security posture for the LedgerByte Vercel/Supabase test environment and the production go/no-go items that remain. It does not enable Row Level Security or change database behavior.

## Current State

- Supabase is used as PostgreSQL only.
- LedgerByte authentication is application-owned JWT auth, not Supabase Auth.
- The browser talks to the LedgerByte API, not directly to Supabase.
- Tenant isolation is enforced in the API layer through authenticated organization context, role permissions, and tenant-scoped queries.
- Public-table Row Level Security is currently disabled in Supabase.

## Current Protection Boundary

The current protection model assumes:

- The database is private to the API and trusted operational tools.
- Users cannot connect directly to Supabase with broad table access.
- The frontend never receives Supabase service credentials.
- The frontend does not query Supabase tables directly.
- API controllers and services consistently enforce organization ownership.

This is acceptable for a private non-production test environment, but it is not enough by itself for broad production exposure.

## Key Risk

With RLS disabled, direct database access bypasses application tenant isolation. Any leaked high-privilege database connection string, misused service role, or direct SQL client can read or mutate data across tenants.

## What Not To Do

- Do not expose Supabase anon keys for direct app database access.
- Do not connect the Next.js frontend directly to Supabase tables.
- Do not store Supabase database URLs in browser-visible environment variables.
- Do not reuse production database credentials in GitHub Actions or local test scripts.
- Do not treat API-layer tenant checks as a replacement for database hardening when moving to production.
- Do not enable RLS automatically without a tested policy rollout plan.

## Recommended Future Options

### 1. Keep DB Private And App-Only

- Use Supabase as private Postgres behind the API.
- Restrict database access to Vercel API runtime, migrations, and approved admin operators.
- Rotate credentials regularly.
- Keep frontend Supabase access disabled.

This is the lowest-risk near-term path while LedgerByte continues to use application-owned auth.

### 2. Enable RLS Later With Policies

- Design tenant policy functions around `organizationId` or a trusted session variable.
- Add read/write policies table by table.
- Test each policy against Owner/Admin/Accountant/Sales/Purchases/Viewer roles.
- Add migration and rollback plans.
- Run policy tests against a copy of production-like data before enabling in production.

RLS must be designed deliberately because LedgerByte does not use Supabase Auth claims as its source of identity.

### 3. Use Dedicated DB Users And Least Privilege

- Separate runtime, migration, and read-only diagnostic users.
- Avoid using the default `postgres` superuser for routine runtime.
- Grant only required schema/table privileges.
- Keep `DIRECT_URL` for migrations out of runtime-only contexts.

### 4. Audit Public Schema Exposure

- Review every table in `public`.
- Identify tenant-scoped tables, global lookup tables, audit tables, token/outbox tables, generated documents, and attachments.
- Confirm indexes and foreign keys support tenant-scoped access patterns.
- Review sensitive columns such as hashes, generated document content, attachment content, email bodies, and token metadata.

## Production Go/No-Go Checklist

Go only when:

- Production API uses a strong runtime database user with least practical privilege.
- Production migrations use a separate controlled migration credential.
- Frontend has no Supabase table access.
- Production secrets are stored only in Vercel/Supabase secret managers.
- API tenant isolation has current tests for critical endpoints.
- RLS plan is either implemented and tested, or the database is private/app-only with a documented compensating control.
- Backups, point-in-time recovery, and credential rotation are documented.
- Attachment/generated-document storage risks are understood before real customer uploads.

No-go when:

- Supabase service credentials are browser-exposed.
- GitHub Actions points deployed E2E at production data.
- Public tables are directly accessible to untrusted users.
- RLS is enabled partially without tests and rollback.
- Direct database access is shared broadly with operators or developers.

## Current Recommendation

For the current test deployment, keep the database private and app-only, document that RLS is disabled, and do not expose Supabase keys to the frontend. Before production, choose between app-only private database hardening and a tested RLS policy rollout.
