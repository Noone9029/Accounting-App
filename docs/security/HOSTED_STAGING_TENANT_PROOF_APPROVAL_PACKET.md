# Hosted Staging Tenant Proof Approval Packet

Status: `BLOCKED - NOT APPROVED`

Date prepared: 2026-07-06

Purpose: provide the exact owner-supplied packet required before any hosted staging tenant-isolation proof is run.

This packet is a template and safety checklist only. It does not approve hosted proof execution, does not contain credentials, does not authorize hosted mutations, and does not authorize production access. Do not commit bearer tokens, cookies, passwords, database URLs, storage credentials, service-role keys, customer data, document bodies, attachment bodies, signed XML, QR payloads, or provider payloads into this file.

## Required Approval Summary

Hosted staging proof remains blocked until every item below is supplied and reviewed out of band:

| Field | Required value | Current status |
| --- | --- | --- |
| Approved staging or dedicated proof API base URL | Owner-approved non-production URL | Missing |
| Target classification | Explicit confirmation that the target is staging, sandbox, test, or dedicated proof | Missing |
| Customer-data exclusion | Confirmation that the target contains no real customer data | Missing |
| Proof-run ID | Unique ID such as `tenant-proof-YYYYMMDD-HHMMSS` | Missing |
| Synthetic tenant A organization ID | Tenant A organization ID | Missing |
| Synthetic tenant B organization ID | Tenant B organization ID | Missing |
| Synthetic tenant A user identity | Description of the user used for tenant A proof | Missing |
| Tenant A read permissions | Confirmation that the user can read dashboard, search, and reports for tenant A | Missing |
| Tenant B non-membership | Confirmation that the same user has no active membership in tenant B | Missing |
| Synthetic user credential or bearer-token strategy | Approved strategy for obtaining the tenant A bearer token without committing secrets | Missing |
| Credential delivery path | Secure out-of-band bearer-token delivery path, never git or committed docs | Missing |
| Base allow flag | Explicit approval to set `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1` | Missing |
| Read-only allow flag | Explicit approval to set `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1` | Missing |
| Staging mutation allow flag | Must remain unset for read-only proof | Not approved |
| Production override | Must remain unset | Not approved |
| Evidence owner | Person responsible for retaining sanitized evidence | Missing |
| Stop-rule owner | Person empowered to stop the run on any refusal or cross-tenant success | Missing |

## Approved Command Scope

Read-only proof may use only the current `staging-read-only-probe` adapter after all gates pass.

Allowed command:

```powershell
corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id $env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID --base-url $env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL
```

Allowed HTTP methods and endpoints:

| Method | Endpoint | Expected result |
| --- | --- | --- |
| `GET` | `/auth/me` | 2xx for the supplied synthetic tenant A token |
| `GET` | `/dashboard/summary` with tenant A organization header | 2xx |
| `GET` | `/search?query=LB-TENANT-PROOF:<proofRunId>` with tenant A organization header | 2xx |
| `GET` | `/reports/profit-and-loss?from=2026-01-01&to=2026-12-31` with tenant A organization header | 2xx |
| `GET` | `/dashboard/summary` with tenant B organization header using the tenant A token | `403` |

No other endpoint is approved by this packet.

## Forbidden Actions

Do not run any hosted command if it would do any of the following:

- Run hosted migrations.
- Run hosted seed, reset, delete, broad cleanup, or `security:cleanup -- --execute`.
- Run Supabase or Vercel mutations.
- Send POST, PATCH, PUT, or DELETE requests.
- Touch production or production-looking targets.
- Touch real customer data.
- Call object storage, email, bank-feed, payment-processor, ZATCA, Peppol, UAE ASP, or provider systems.
- Generate signed URLs.
- Capture response bodies, document bodies, attachment bodies, signed XML, QR payloads, auth headers, cookies, or tokens.

## Environment Variable Packet

These variables may be set only for an approved run, in a local shell, with values supplied out of band:

```powershell
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT = 'staging'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL = '<approved-staging-proof-url>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID = '<proof-run-id>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID = '<tenant-a-organization-id>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID = '<tenant-b-organization-id>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN = '<out-of-band-token>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW = '1'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW = '1'
```

If synthetic user credentials are used to obtain the bearer token, keep those credentials out of git, committed docs, command logs, and final reports. Only the resulting shell environment token is consumed by the current read-only adapter.

Do not set:

```powershell
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_READONLY_ALLOW
```

Clear all variables immediately after the run:

```powershell
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW -ErrorAction SilentlyContinue
Remove-Item Env:\LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_READONLY_ALLOW -ErrorAction SilentlyContinue
```

## Redaction Rules

Allowed evidence:

- Commit SHA.
- Proof-run ID.
- Target classification as staging, sandbox, test, or proof.
- Target host name only if it is not secret-like.
- Check IDs.
- HTTP status codes.
- `mutationAttempted=false`.
- `responseBodyCaptured=false`.
- Confirmation that environment variables were cleared.

Forbidden evidence:

- Raw bearer token.
- Cookies.
- Auth headers.
- Database URLs or direct URLs.
- Service-role keys.
- Storage credentials.
- Customer names, emails, documents, invoices, reports, attachments, or exported file contents.
- Response bodies.
- Signed XML.
- QR payloads.
- Private keys.
- Provider payloads.

## Expected Evidence Output

The proof output must show:

- `safety=ready`.
- `environment=staging`.
- `productionLooking=false`.
- `networkEnabled=true`.
- `mutationEnabled=false`.
- `cleanupScope=proofRunId-only`.
- All five approved checks with expected HTTP statuses.
- `responseBodyCaptured=false` for every check.
- `mutationAttempted=false`.
- No secret-looking values.

## Stop Rules

Stop immediately and report the exact blocker if:

- Any required packet field is missing.
- The target is production-looking or contains customer data.
- The token has active membership in tenant B.
- Tenant B dashboard returns 2xx.
- Any tenant A read unexpectedly returns 401, 403, 404, or 5xx.
- The command prints sensitive data.
- Any non-GET request is attempted.
- Any hosted mutation, migration, cleanup, provider, email, bank-feed, payment-processor, ZATCA, Peppol, ASP, object-storage mutation, signed URL, or production operation is suggested or attempted.

## Packet Status

Current status: blocked.

Reason: no approved staging/proof URL, no synthetic tenant IDs, no proof-run ID, no out-of-band bearer token, no explicit allow flags, and no evidence owner have been supplied in this worktree.
