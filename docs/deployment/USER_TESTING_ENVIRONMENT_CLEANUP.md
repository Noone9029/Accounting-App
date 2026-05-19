# User-Testing Environment Cleanup Runbook

Date: 2026-05-19

This runbook describes how to plan cleanup for the LedgerByte user-testing environment without global resets, production data actions, secret exposure, customer content dumps, real ZATCA network calls, or real customer email sends.

## Scope

Current user-testing targets:

- Web: `https://ledgerbyte-web-test.vercel.app`
- API: `https://ledgerbyte-api-test.vercel.app`
- Supabase test project: `xynelbjqcmbgtscfmmzv`
- Default local/demo organization id: `00000000-0000-0000-0000-000000000001`

This runbook is for non-production user-testing data only. Do not apply it to production without a separate approved data-retention and incident plan.

## Safety Rules

- Do not run a global database reset.
- Do not delete organizations outside the approved user-testing organization.
- Do not print database URLs, Supabase service keys, Vercel tokens, SMTP secrets, ZATCA material, auth headers, signed XML bodies, QR payload bodies, document bodies, or attachment bodies.
- Do not download generated-document or attachment bodies during cleanup planning.
- Do not send real customer emails.
- Do not call real ZATCA network, CSID, clearance, reporting, or PDF-A3 paths.
- Do not use production credentials for smoke, E2E, or cleanup.

## Identifying Demo/Test Data

Known LedgerByte test/demo markers:

- Demo workflow seed marker: `LEDGERBYTE_DEMO_WORKFLOW_SEED`.
- Browser E2E demo contacts:
  - `Acme Riyadh Trading LLC`
  - `Gulf Office Supplies Co.`
- Demo workflow item SKU: `DEMO-WORKFLOW-PRODUCT`.
- Demo attachment filename: `demo-workflow-receipt.csv`.
- Smoke records commonly include `Smoke Test` naming.
- Test-only email domains commonly use `.test`.
- Seed admin email in local demos is `admin@example.com`.

Use these markers only inside the approved user-testing organization. Do not search or delete globally.

## Dry-Run Cleanup Planner

Run the dry-run planner before any manual cleanup. It authenticates against the API, reads tenant-scoped list endpoints, and prints counts only. It does not delete, update, send email, restore data, or download bodies.

```powershell
$env:LEDGERBYTE_USER_TESTING_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_USER_TESTING_ORG_ID="00000000-0000-0000-0000-000000000001"
$env:LEDGERBYTE_USER_TESTING_CLEANUP_EMAIL="<from secret store>"
$env:LEDGERBYTE_USER_TESTING_CLEANUP_PASSWORD="<from secret store>"
corepack pnpm user-testing:cleanup-plan
```

The planner refuses unknown organization ids unless `LEDGERBYTE_USER_TESTING_CLEANUP_ALLOW_UNKNOWN_ORG=true` is explicitly set. It also refuses unsafe hosts by default.

## Safe Reset Approach

There is no destructive cleanup executor in the repository yet. Cleanup is manual and scoped:

1. Confirm the target API URL is the test API, not a production custom domain.
2. Confirm the target organization id belongs to the disposable user-testing tenant.
3. Run `corepack pnpm user-testing:cleanup-plan`.
4. Review counts for invoices, bills, payments, contacts, items, generated documents, attachments, email metadata, ZATCA metadata, audit logs, and evidence records.
5. If deletion is required, create a reviewed SQL/script plan that deletes only rows with the approved organization id and known demo markers.
6. Run the deletion plan only in a Supabase branch or disposable test database first.
7. Re-run smoke and E2E after cleanup.

Do not perform a destructive global reset from this runbook.

## Rerun Seed Safely

Local or disposable non-production only:

```powershell
corepack pnpm db:seed
```

For validated workflow data through the API:

```powershell
$env:LEDGERBYTE_API_URL="http://localhost:4000"
corepack pnpm demo:seed-workflows
```

Remote seeding is disabled by default. Only use the remote override for disposable non-production targets:

```powershell
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_DEMO_SEED_ALLOW_REMOTE="true"
$env:LEDGERBYTE_DEMO_SEED_EMAIL="<from secret store>"
$env:LEDGERBYTE_DEMO_SEED_PASSWORD="<from secret store>"
$env:LEDGERBYTE_DEMO_SEED_ORGANIZATION_ID="00000000-0000-0000-0000-000000000001"
corepack pnpm demo:seed-workflows
```

## Rerun E2E

```powershell
$env:LEDGERBYTE_WEB_URL="https://ledgerbyte-web-test.vercel.app"
$env:LEDGERBYTE_API_URL="https://ledgerbyte-api-test.vercel.app"
$env:LEDGERBYTE_E2E_EMAIL="<from secret store>"
$env:LEDGERBYTE_E2E_PASSWORD="<from secret store>"
$env:LEDGERBYTE_E2E_SEED_WORKFLOWS="false"
corepack pnpm e2e
```

Use `LEDGERBYTE_E2E_SEED_WORKFLOWS=false` for already-seeded remote environments unless the target was intentionally reset and approved for reseeding.

## Revoking Test User Access

Manual options:

- Disable or rotate the test user's password through approved admin tooling.
- Change organization member status if the UI/API supports the desired access state.
- Rotate JWT secret only with a coordinated redeploy and user sign-out plan.
- Rotate E2E credentials stored in GitHub Actions and local secret storage.

Do not print access tokens, password hashes, invite tokens, or reset tokens.

## Clearing Email Artifacts

Current email behavior is intentionally disabled by default for real sends. Cleanup planning can include:

- Count email outbox rows with the dry-run planner.
- Review suppression metadata counts.
- Review sender-domain and monitoring evidence metadata.

Do not send test emails as part of cleanup. Do not print email message bodies or customer recipients. A future destructive cleanup executor must skip active production-like records and should use masked/hash metadata where possible.

## Clearing Evidence Metadata

Evidence tables are metadata-only but still tenant-scoped and should be treated as operational records:

- Backup/restore evidence.
- Email sender-domain evidence.
- Email monitoring evidence.
- ZATCA storage/custody evidence.

Do not delete evidence records unless the target is disposable and the deletion is part of a reviewed user-testing reset plan. Prefer revocation endpoints when the product supports them.

## Credential Rotation Checklist

- Vercel API project environment variables reviewed as presence-only.
- Vercel web `NEXT_PUBLIC_API_URL` verified.
- Supabase test database credentials rotated if shared outside trusted operators.
- E2E user password rotated after broad demos.
- SMTP diagnostics and email retry/webhook flags remain disabled unless explicitly testing non-customer relay behavior.
- ZATCA real network flags remain disabled.

## What Remains To Build

- A reviewed destructive cleanup executor for a single user-testing organization.
- Per-table deletion ordering with foreign-key safety.
- Audit logging for cleanup requests.
- Supabase branch validation before cleanup promotion.
- Automated credential rotation checklist integration.
