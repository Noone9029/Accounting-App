# Real Object Storage And Signed URL Proof Runbook

Date: 2026-07-06

Status: `BLOCKED`

Scope: runbook only. This document defines how a future approved real object-storage and signed URL proof should be prepared, executed, evidenced, and stopped. It does not authorize execution and does not add runtime behavior.

## Preconditions

Before any command can touch hosted storage, all of the following must be true:

- `docs/security/OBJECT_STORAGE_SIGNED_URL_PROOF_APPROVAL_PACKET.md` has complete non-placeholder approval evidence.
- The target is explicitly non-production.
- Synthetic Tenant A and Tenant B exist and are distinct.
- Credentials are supplied out of band through an approved secret store or local shell environment.
- The bucket or namespace is dedicated to staging/proof use, or the approved prefix is isolated and proof-run scoped.
- The proof runner or manual command packet has been reviewed.
- No customer data is in scope.

If any item is missing, stop and report `BLOCKED`.

## Execution Phases

### Phase 0: Local Readiness

Run local checks only:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm --filter @ledgerbyte/api exec prisma validate
corepack pnpm test
corepack pnpm build
corepack pnpm verify:diff
git diff --check
```

Restore `apps/web/next-env.d.ts` if it contains generated Next.js churn.

### Phase 1: Approval Intake

Verify every required field in the approval packet:

- Approval phrase.
- Approver references.
- Non-production and no-customer-data confirmations.
- Synthetic tenant IDs.
- Proof-run ID.
- Bucket/provider classification.
- Credential scope and expiry.
- Allowed proof modes.
- Evidence and cleanup owners.

No hosted command may run in this phase.

### Phase 2: Provider And Bucket Preflight

Allowed checks after approval:

- Confirm provider target classification.
- Confirm bucket or namespace name is staging/proof/test/sandbox-looking.
- Confirm public list/read is disabled using redacted policy evidence or provider metadata.
- Confirm credential permissions are least-privilege for the approved prefix.
- Confirm cleanup can be scoped by `proofRunId`.

Stop on any production-looking target, missing policy evidence, or broad credential.

### Phase 3: Synthetic Object Lifecycle Proof

With mutation approval only:

1. Write Tenant A synthetic object under the approved proof-run prefix.
2. Write Tenant B synthetic object under the approved proof-run prefix.
3. Read Tenant A object through authorized Tenant A metadata.
4. Verify Tenant A hash, size, content type, and object metadata.
5. Attempt Tenant A access to Tenant B object through API metadata and expect denial.
6. Attempt direct object-key access if the provider supports a safe denial check and expect denial.

Do not use customer objects. Do not list broad prefixes.

### Phase 4: Signed URL Proof

Only if signed URL implementation and signed URL approval exist:

1. Issue Tenant A signed URL only after authorization.
2. Record TTL seconds without recording the URL value.
3. Fetch Tenant A synthetic object through the URL if the approved packet allows it.
4. Wait until the approved TTL expires.
5. Verify the URL no longer returns the object.
6. Attempt Tenant A request for Tenant B signed URL and expect denial before URL issuance.
7. Remove or suspend permission/membership for the synthetic user if approved.
8. Verify revoked user cannot issue a new signed URL.
9. Soft-delete or revoke the synthetic document if approved.
10. Verify deleted or revoked metadata cannot issue a new signed URL or API download.

Never log the full signed URL.

### Phase 5: Cleanup And Failure Path

Cleanup must be proof-run scoped:

- List only approved proof-run prefix objects.
- Delete only approved proof-run prefix objects.
- Capture counts, not bodies.
- If cleanup fails, stop broad retries, record the remaining redacted object identifiers, and hand off to the manual owner named in the approval packet.

The failure path must prove that cleanup failure does not trigger broad deletes or hide remaining proof objects.

## Evidence Template

Use this structure for future sanitized evidence:

```text
Proof run: <proofRunId>
Commit: <sha>
Environment: <staging|sandbox|test|proof>
Approval packet: <reference>
Provider: <redacted provider classification>
Bucket/namespace: <redacted or approved safe name>
Tenant A: <synthetic tenant id>
Tenant B: <synthetic tenant id>

Results:
- Real provider adapter proof: <pass|fail|blocked>
- Bucket policy proof: <pass|fail|blocked>
- Signed URL generation: <pass|fail|blocked>
- Signed URL expiry: <pass|fail|blocked>
- Cross-tenant signed URL denial: <pass|fail|blocked>
- Revoked access denial: <pass|fail|blocked>
- Deleted document denial: <pass|fail|blocked>
- Cleanup success path: <pass|fail|blocked>
- Cleanup failure path: <pass|fail|blocked>

Sensitive data handling:
- Full signed URLs captured: no
- Secrets captured: no
- Customer data used: no
- Document bodies retained: no

Cleanup:
- Objects created: <count>
- Objects deleted: <count>
- Objects remaining: <count or blocked reason>
- Manual cleanup owner if needed: <owner>
```

## Redaction Rules

- Replace full signed URLs with `<redacted-signed-url>`.
- Replace access keys and secret keys with `<redacted-secret>`.
- Replace bearer tokens and cookies with `<redacted-token>`.
- Redact object keys beyond the approved tenant/proof-run prefix unless the approval packet allows safe synthetic keys.
- Do not store document bodies.

## Commands That Remain Forbidden

- Hosted migrations.
- Production migrations.
- Database seed/reset/delete against hosted data.
- Broad bucket cleanup.
- Security cleanup execute mode against hosted production.
- Production deployment or alias changes.
- Real email, payment, bank-feed, ZATCA, UAE Peppol, ASP, or provider production calls.

## Current Status

No real-provider or signed URL proof should be run yet. The next safe step is owner review of the approval packet and runbook.

## Next Recommended Prompt

```text
Codex, review the real object-storage and signed URL proof approval packet only. Confirm the packet is complete enough for owner review, do not implement signed URLs, do not touch hosted storage, do not run hosted migrations or mutations, and report APPROVE-READY, BLOCKED, or PENDING.
```
