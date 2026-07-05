# Real Object Storage And Signed URL Proof Approval Packet

Date: 2026-07-06

Status: `BLOCKED`

Scope: approval packet only. This packet defines the human approvals, staging inputs, safety gates, evidence rules, and stop conditions required before LedgerByte can run a real object-storage and signed URL tenant-isolation proof.

This packet does not implement signed URLs, enable real generated-document object storage, connect to hosted storage, mutate hosted or customer data, run hosted migrations, change schemas, add migrations, apply bucket policies, or approve execution.

## Purpose

Priority 5 requires proof for:

- Real provider adapter behavior.
- Bucket policy behavior.
- Signed URL generation.
- Signed URL expiry.
- Cross-tenant signed URL denial.
- Revoked or deleted document access denial.
- Object cleanup failure-path behavior.

Those checks require real staging object-storage infrastructure and credentials. This packet makes the required inputs explicit so a future run can be approved without weakening the existing fail-closed defaults.

## Current Baseline

| Area | Current status |
| --- | --- |
| Runtime attachment storage | Database-backed by default; S3-compatible attachment adapter is feature-flagged groundwork. |
| Runtime generated-document storage | Database-backed default. |
| Generated-document object adapter | Disabled/fail-closed for real object modes; fake local adapter is test-only. |
| Signed URLs | Not implemented in runtime issuance paths; current paths fail closed. |
| Hosted object-storage proof | Not run. |
| Bucket policy proof | Not run. |
| Approval status | `BLOCKED`. |

## Required Approval Fields

Do not run any real-provider proof until an owner supplies all fields below.

| Required field | Required value | Status |
| --- | --- | --- |
| Approval phrase | Exact phrase from an authorized owner | MISSING |
| Product owner approval reference | Ticket, signed comment, or approval record | MISSING |
| Security owner approval reference | Credential, logging, and evidence approval | MISSING |
| Storage/platform owner approval reference | Bucket, policy, lifecycle, and cleanup approval | MISSING |
| Accounting/legal review | Approval or explicit not-applicable reason | MISSING |
| Environment classification | `staging`, `sandbox`, `test`, or `proof` only | MISSING |
| Production exclusion | Written confirmation no production target is used | MISSING |
| Customer-data exclusion | Written confirmation synthetic data only | MISSING |
| Staging API base URL | Approved non-production URL, if API calls are part of proof | MISSING |
| Dedicated bucket name | Non-production bucket or isolated namespace | MISSING |
| Bucket provider and region | Provider name and region if applicable | MISSING |
| Bucket policy evidence | Redacted policy or policy review reference | MISSING |
| Credential reference | Secret-store reference only, no secret values | MISSING |
| Credential scope | Least-privilege actions, prefixes, expiry, and revocation | MISSING |
| Synthetic Tenant A ID | Synthetic organization ID | MISSING |
| Synthetic Tenant B ID | Distinct synthetic organization ID | MISSING |
| Synthetic user/token strategy | Out-of-band credential delivery and allowed permissions | MISSING |
| `proofRunId` | Unique proof-run ID and prefix pattern | MISSING |
| Allowed object domains | Attachments, generated documents, archives, or explicit subset | MISSING |
| Allow flags | Explicit environment variables for each enabled mode | MISSING |
| Cleanup policy | Proof-run-ID-scoped cleanup and failure-path owner | MISSING |
| Evidence destination | Redacted evidence output location | MISSING |
| Rollback owner | Owner and rollback path | MISSING |
| Final sign-off | All required owners approve the exact run | MISSING |

## Exact Approval Phrase

Future approval must include this exact phrase:

```text
I approve LedgerByte real object-storage and signed URL tenant-isolation proof for staging-only execution using synthetic tenants, a dedicated non-production bucket or namespace, proof-run-ID-scoped objects, and no customer data.
```

The phrase is invalid unless it is accompanied by all required approval fields. Do not infer approval from placeholder text, chat context, a green CI run, or this packet.

## Required Allow Flags

The future proof command must be blocked unless every relevant flag is explicitly set.

```powershell
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_ALLOW = '1'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_ENVIRONMENT = 'staging'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_RUN_ID = '<proofRunId>'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_TENANT_A_ID = '<synthetic-tenant-a-id>'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_TENANT_B_ID = '<synthetic-tenant-b-id>'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_BUCKET_CLASSIFICATION = 'staging'
$env:LEDGERBYTE_OBJECT_STORAGE_PROOF_PROVIDER_ALLOW = '1'
```

Additional flags are required for modes that can issue URLs, mutate objects, or cleanup proof objects:

```powershell
$env:LEDGERBYTE_OBJECT_STORAGE_SIGNED_URL_ALLOW = '1'
$env:LEDGERBYTE_OBJECT_STORAGE_MUTATION_ALLOW = '1'
$env:LEDGERBYTE_OBJECT_STORAGE_CLEANUP_ALLOW = '1'
```

Do not set mutation or cleanup flags for read-only preflight. Do not set any production override for this proof.

## Required Proof Matrix

| Proof item | Required evidence | Must stop if |
| --- | --- | --- |
| Real provider adapter proof | Synthetic object write, read, hash/size verification, metadata check, and proof-run prefix. | Provider target is production-looking, credentials are missing, or object keys are not proof-run scoped. |
| Bucket policy proof | Public list/read denied, direct cross-tenant object access denied, and least-privilege policy reviewed. | Public access is enabled or policy evidence is missing. |
| Signed URL generation | Tenant A can receive a short-lived URL only after API authorization for Tenant A object metadata. | URL is issued before tenant authorization or exposes bucket/key secrets in logs. |
| Signed URL expiry | Previously issued synthetic URL fails after the approved TTL window. | URL remains valid beyond approved TTL. |
| Cross-tenant signed URL denial | Tenant A cannot get a URL for Tenant B attachment, generated document, or archive object. | Any Tenant B URL is issued to Tenant A. |
| Revoked access denial | Permission or membership removal blocks new URL issuance. | Revoked user can issue a new URL. |
| Deleted document denial | Deleted or revoked document metadata blocks new URL issuance and API download. | Deleted object is still reachable through API authorization. |
| Cleanup success path | Proof-run-ID objects are listed and deleted only inside the approved prefix. | Cleanup targets a broad prefix or unrelated object. |
| Cleanup failure path | Simulated or observed cleanup failure is captured with no broad retry/delete and a manual owner. | Failure handler attempts broad cleanup or hides remaining object keys. |

## Data Rules

- Synthetic tenants only.
- Synthetic documents only.
- No customer data.
- No real invoices, tax artifacts, signed XML, QR payloads, bank data, email payloads, or provider production payloads.
- Object content must be harmless test text or generated fixture bytes.
- Object keys must include tenant and proof-run context where the provider supports it.

## Secret And Evidence Rules

Never commit, print, or paste:

- Raw access keys or secret keys.
- Bearer tokens, cookies, or auth headers.
- Database URLs or direct URLs.
- Full signed URLs.
- Customer identifiers.
- Document bodies.
- Bucket credentials.

Evidence may include:

- Redacted target classification.
- Proof-run ID.
- Sanitized command status.
- HTTP status codes.
- Provider operation type.
- Redacted object key prefix.
- Hash/size match result.
- URL TTL seconds, without URL value.
- Denial status and reason class.
- Cleanup summary counts.

## Stop Rules

Stop immediately if:

- Any required approval field is missing.
- Target classification is production-looking.
- Customer data may be present.
- Credentials are broader than the approved staging scope.
- A command would run hosted migrations, seed/reset/delete database data, security cleanup execute mode, production deployment, email, payment, bank-feed, ZATCA, UAE Peppol/ASP, or unrelated provider work.
- A signed URL or secret value appears in logs.
- Tenant A receives access to Tenant B object metadata, body, or URL.
- Cleanup targets anything broader than the proof-run prefix.

## Required Closeout

A future execution closeout must include:

- Commit SHA under test.
- Approval packet reference.
- Environment classification.
- Proof-run ID.
- Commands run.
- Evidence file locations.
- Pass/fail for every proof matrix row.
- Redacted secret scan result.
- Cleanup result or cleanup blocker.
- Confirmation environment variables were cleared.
- Confirmation no hosted migrations, production targets, or customer data were used.

## Current Decision

The proof is not approved and not executable from this repository state. Priority 5 remains blocked on completed approval fields, staging credentials supplied out of band, and a future reviewed proof runner or approved manual execution plan.
