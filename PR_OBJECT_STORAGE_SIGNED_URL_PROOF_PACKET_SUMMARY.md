# Real object-storage and signed URL proof approval packet

## Summary

This PR adds the Priority 5 approval and runbook packet for future real object-storage and signed URL tenant-isolation proof.

It is documentation-only. It does not implement signed URLs, change runtime storage behavior, touch hosted storage, run hosted migrations, run hosted mutations, change accounting logic, change Prisma schema, or change UI behavior.

## Files changed

- `docs/security/OBJECT_STORAGE_SIGNED_URL_PROOF_APPROVAL_PACKET.md`
- `docs/security/OBJECT_STORAGE_SIGNED_URL_PROOF_RUNBOOK.md`
- `docs/security/SIGNED_URL_OBJECT_STORAGE_PROOF_PLAN.md`
- `docs/security/STORAGE_TENANT_ISOLATION_PROOF_PLAN.md`
- `docs/storage/SIGNED_URL_OBJECT_STORAGE_RISK_REGISTER.md`
- `PR_OBJECT_STORAGE_SIGNED_URL_PROOF_PACKET_SUMMARY.md`

## Scope covered

- Real provider adapter proof prerequisites.
- Bucket policy proof prerequisites.
- Signed URL generation and expiry proof prerequisites.
- Cross-tenant signed URL denial prerequisites.
- Revoked and deleted document access denial prerequisites.
- Proof-run-ID-scoped cleanup and cleanup failure-path prerequisites.
- Required approval fields, allow flags, redaction rules, and stop rules.

## Runtime impact

No runtime code changed.

No accounting logic changed.

No Prisma schema or migrations changed.

No hosted storage commands were run.

No signed URLs were generated.

## Current status

Priority 5 remains blocked on owner approval, staging/proof bucket details, synthetic tenant details, credentials supplied out of band, and a future reviewed proof runner or approved manual execution plan.

## Reviewer focus

- Confirm the packet covers every Priority 5 proof item.
- Confirm the approval fields are explicit and non-placeholder values are required before execution.
- Confirm the runbook remains blocked by default.
- Confirm no production/customer-data or hosted mutation claim is introduced.
