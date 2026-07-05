# Hosted Staging Tenant Proof Packet

Status: `OWNER FILL REQUIRED - DO NOT EXECUTE UNTIL COMPLETE`

Purpose: collect the exact owner-approved values required before running LedgerByte's hosted staging tenant read-only proof. This packet is intentionally fillable and secret-free. It does not approve hosted execution until every required field is completed and reviewed.

Do not paste bearer tokens, cookies, passwords, database URLs, service-role keys, storage credentials, customer data, document bodies, attachment bodies, signed XML, QR payloads, or provider payloads into this file.

## Required Packet Values

| Field | Owner-supplied value |
| --- | --- |
| Approval reference | `<ticket, review comment, or approval record>` |
| Staging URL | `<approved staging, beta, sandbox, test, or proof API base URL>` |
| Environment classification | `<staging|beta|sandbox|test|proof>` |
| Production exclusion confirmation | `<confirm target is not production or production-looking>` |
| Customer-data exclusion confirmation | `<confirm synthetic data only and no real customer data>` |
| Proof-run ID | `<proof-run-id, for example tenant-proof-YYYYMMDD-HHMMSS>` |
| Synthetic tenant A ID | `<tenant-a-organization-id>` |
| Synthetic tenant B ID | `<tenant-b-organization-id>` |
| Synthetic user/auth method | `<existing synthetic user token, temporary synthetic user login, or other approved method>` |
| Tenant A permissions confirmation | `<confirm token/user can read auth, dashboard, search, and reports for tenant A>` |
| Tenant B non-membership confirmation | `<confirm token/user has no active membership in tenant B>` |
| Bearer token env var name | `LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN` |
| Bearer token delivery path | `<out-of-band shell/secret-store delivery path; never git or this file>` |
| Base allow flag approved | `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1` |
| Read-only allow flag approved | `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1` |
| Staging mutation allow flag | `MUST REMAIN UNSET` |
| Production override flag | `MUST REMAIN UNSET` |
| Evidence owner | `<owner responsible for retaining sanitized evidence>` |
| Rollback/contact owner | `<person/team to contact if the proof refuses or finds cross-tenant success>` |
| Evidence destination | `<approved location for sanitized evidence only>` |

## Approved GET-Only Endpoint List

No endpoint outside this table is approved by this packet.

| Check ID | Method | Endpoint | Organization context | Expected result |
| --- | --- | --- | --- | --- |
| `auth-me` | `GET` | `/auth/me` | none | `2xx` for the synthetic tenant A token |
| `tenant-a-dashboard-summary` | `GET` | `/dashboard/summary` | `Synthetic tenant A ID` | `2xx` |
| `tenant-a-search-proof-marker` | `GET` | `/search?query=LB-TENANT-PROOF:<proof-run-id>` | `Synthetic tenant A ID` | `2xx` |
| `tenant-a-profit-and-loss` | `GET` | `/reports/profit-and-loss?from=2026-01-01&to=2026-12-31` | `Synthetic tenant A ID` | `2xx` |
| `tenant-b-dashboard-summary-denied` | `GET` | `/dashboard/summary` | `Synthetic tenant B ID` using the tenant A token | `403` |

## Forbidden Endpoints And Methods

Forbidden methods:

- `POST`
- `PATCH`
- `PUT`
- `DELETE`
- Any method other than `GET`

Forbidden endpoints and actions:

- Hosted migrations, schema changes, seeds, resets, deletes, broad cleanup, or `security:cleanup -- --execute`.
- Supabase, Vercel, deployment, or production mutation commands.
- Object storage, provider, email, bank-feed, payment-processor, ZATCA, Peppol, ASP, or signed URL calls.
- Any export, PDF, attachment body, document body, invoice body, report body, customer record, or provider payload capture.
- Any endpoint not listed in the approved GET-only endpoint table.

## Redaction Rules

Allowed evidence:

- Commit SHA under test.
- Approval reference.
- Proof-run ID.
- Environment classification.
- Target host only when not secret-like.
- Check IDs.
- HTTP status codes.
- `mutationAttempted=false`.
- `responseBodyCaptured=false`.
- `networkAttempted=true` only for the approved read-only probe.
- Confirmation that environment variables were cleared after the run.

Forbidden evidence:

- Raw bearer tokens.
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
- Full screenshots or logs that expose any forbidden data.

## Stop Conditions

Stop before execution if:

- Any packet field is missing.
- The staging URL is production-looking, customer-data-bearing, or not clearly staging, beta, sandbox, test, or proof.
- The bearer token is missing from the out-of-band environment variable.
- The token is pasted into this file, git, chat, logs, or final reports.
- Tenant A and tenant B IDs are missing, equal, or not synthetic.
- Tenant B non-membership is not confirmed.
- Any approved endpoint is not `GET`.
- Any hosted migration, mutation, cleanup execute, provider/storage call, email, payment, bank-feed, ZATCA, Peppol, ASP, signed URL, or production command is suggested.

Stop during execution if:

- The proof harness reports `safety=refused`.
- The target reports `productionLooking=true`.
- Any non-GET request is attempted.
- Any secret or response body is printed.
- Any tenant A read returns `401`, `403`, `404`, or `5xx`.
- Tenant B dashboard returns any `2xx` or otherwise succeeds with the tenant A token.

## Shell Environment To Set After Approval

Set these only in the local shell for the approved run, using values supplied out of band:

```powershell
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ENVIRONMENT = 'staging'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL = '<approved staging URL>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID = '<proof-run ID>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_A_ID = '<synthetic tenant A ID>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_TENANT_B_ID = '<synthetic tenant B ID>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_AUTH_TOKEN = '<out-of-band bearer token>'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW = '1'
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW = '1'
```

Do not set:

```powershell
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_READONLY_ALLOW
$env:LEDGERBYTE_HOSTED_TENANT_PROOF_PRODUCTION_OVERRIDE
```

## Exact Command To Run Once Filled

Run only this command after the packet and checklist are complete:

```powershell
corepack pnpm tenant-isolation:proof -- --mode staging-read-only-probe --environment staging --proof-run-id $env:LEDGERBYTE_HOSTED_TENANT_PROOF_RUN_ID --base-url $env:LEDGERBYTE_HOSTED_TENANT_PROOF_BASE_URL
```

Do not run the command from this packet while placeholder values remain.

## Evidence Output Format

Use this sanitized closeout format:

```text
Proof run: <proof-run ID>
Commit: <sha under test>
Approval reference: <reference>
Environment: <staging|beta|sandbox|test|proof>
Target host: <redacted safe host>
Evidence owner: <owner>
Rollback/contact owner: <owner>

Safety:
- safety: <ready|refused>
- productionLooking: <true|false>
- networkEnabled: true
- mutationEnabled: false
- mutationAttempted: false
- responseBodyCaptured: false

Checks:
- auth-me: <status> <pass|fail>
- tenant-a-dashboard-summary: <status> <pass|fail>
- tenant-a-search-proof-marker: <status> <pass|fail>
- tenant-a-profit-and-loss: <status> <pass|fail>
- tenant-b-dashboard-summary-denied: <status> <pass|fail>

Sensitive data handling:
- bearer token captured: no
- cookies captured: no
- auth headers captured: no
- response bodies captured: no
- customer data captured: no
- hosted mutations run: no
- hosted migrations run: no
- cleanup execute run: no
- provider/storage APIs called: no

Cleanup:
- environment variables cleared: <yes|no>
```

## Required Closeout Confirmation

The final execution report must state:

- No hosted migrations were run.
- No hosted mutations were run.
- No cleanup execute was run.
- No provider or storage API was called.
- No signed URL was generated.
- No real customer data was used.
- Evidence is sanitized according to this packet.
