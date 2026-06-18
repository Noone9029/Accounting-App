# Database RLS And Storage Isolation Decision Sprint Closure

Date: 2026-06-18

Branch: `feature/database-rls-storage-isolation-decision`

Base: `origin/main` at `3368904464891d99977698e2258a20ae1a34e776`, after PR #71 merged.

## Scope

This pass reviewed LedgerByte database/RLS/runtime-role posture and storage tenant-isolation proof planning after PR #71.

Scope stayed planning, audit, docs, and safe local verification only.

No hosted command, hosted/customer-data mutation, hosted Supabase command, Vercel deploy command, production database command, seed/reset/delete, Prisma schema change, migration, RLS implementation, object-storage mutation, signed URL generation, real customer document access, ZATCA production work, UAE Peppol/PINT-AE/ASP production work, provider integration, real ASP call, Peppol call, ZATCA call, real bank feed, payment processor integration, real email, production compliance claim, or SOC 2/security certification claim was added.

## Protected State

The preserved dirty worktree remains untouched:

```text
E:\Accounting App
feature/edition-split-preserve-current-changes
```

The safety patch remains untouched:

```text
E:\Repo-Hygiene-Safety\Accounting-App-20260617-192644\primary-country-edition-repo-hygiene-safety-20260617-192644.patch
```

The ZATCA stash remains preserved:

```text
stash@{0}
```

Protected branches were not modified:

```text
codex/purchase-bill-seeded-uuid-validation
codex/wafeq-banking-reconciliation-audit-polish
```

## PR #71 Baseline

PR #71 recorded that staging tenant isolation proof was not executed because all required staging/proof inputs were missing:

- Staging environment/base URL.
- Proof-run ID.
- Auth token.
- Synthetic tenant A ID.
- Synthetic tenant B ID.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_ALLOW=1`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_READONLY_ALLOW=1`.
- `LEDGERBYTE_HOSTED_TENANT_PROOF_STAGING_MUTATION_ALLOW=1`.

PR #71 preserved the fail-closed local posture. No hosted command ran and no hosted/customer data was mutated.

## Database/RLS Decision

Added:

- `docs/security/DATABASE_RLS_RUNTIME_ROLE_DECISION.md`

Findings:

- Database-enforced application-table RLS is absent/pending in the repository.
- The Prisma schema gives most production-domain models direct `organizationId` tenant paths.
- `User` and `Organization` are root/global models that need membership-derived access policy.
- Nullable organization tables such as token, rate-limit, email, and backup/restore evidence rows need special handling.
- App-source raw SQL found in this pass is limited to the health-check `SELECT 1`.
- Current tenant protection is application-enforced through `JwtAuthGuard`, `OrganizationContextGuard`, `PermissionGuard`, service-level `organizationId` predicates, PR #67 local regressions, and the PR #69/#70/#71 hosted proof harness path.

Recommended production decision:

- Use a hybrid approach.
- Keep application-level tenant scoping as the active boundary.
- Add a least-privilege non-admin API runtime database role before production.
- Design and prove database RLS for critical tenant tables in a separate staged rollout.
- Do not claim tenant isolation is production-grade until staging proof, runtime-role evidence, storage proof, backup/restore, concurrency, observability, and owner sign-off all pass.

## Storage Isolation Proof Plan

Added:

- `docs/security/STORAGE_TENANT_ISOLATION_PROOF_PLAN.md`

Findings:

- Uploaded attachments are database/base64-backed by default.
- Uploaded attachments have a feature-flagged S3-compatible adapter for new uploads only.
- S3 attachment keys use `org/{organizationId}/attachments/{attachmentId}/{safeFilename}`.
- Generated documents remain database/base64-backed.
- Downloads remain API-mediated and organization-scoped.
- No signed URL implementation was found in the current app path.
- No hosted storage proof, generated-document object-storage proof, signed URL proof, backup/restore proof, or production archive guarantee exists yet.

## Handoff Updates

Updated:

- `CODEX_HANDOFF.md`
- `BUG_AUDIT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`

The updates keep the current posture explicit:

- PR #71 recorded staging proof blockers.
- Staging tenant isolation proof remains blocked by missing credentials.
- This pass reviewed database/RLS/runtime-role and storage tenant isolation only.
- RLS remains absent/pending.
- Storage/signed URL proof remains pending.
- No hosted commands were run.
- No hosted/customer data was mutated.
- No schema or migration changes were made.
- No ZATCA production work was added.
- No UAE Peppol/ASP production work was added.
- Provider evidence remains unavailable.

## Remaining Production Blockers

- Approved staging/proof credentials and synthetic tenant IDs.
- Network-capable read-only probe adapter.
- Approved staging synthetic proof adapter and cleanup path.
- Least-privilege API runtime database role.
- Tested RLS or formally accepted private-app-only compensating control.
- Storage tenant proof for attachments, generated documents, archive records, object keys, and signed URLs if added.
- Backup/restore proof for metadata and object bodies.
- Concurrency/race proof.
- Observability evidence for denied cross-tenant access.
- Security/accounting/legal owner sign-off.
- UAE ASP/Peppol provider evidence remains unavailable.
- ZATCA production credentials remain unavailable.

## Next Recommended Prompt

`Implement least-privilege runtime role and RLS staging design`
