# Hosted staging tenant proof approval packet

## Summary

This PR adds a standalone approval packet template for future hosted staging tenant-isolation proof execution.

It does not run a hosted proof, does not approve hosted execution, and does not include any secret values.

## Files changed

- `docs/security/HOSTED_STAGING_TENANT_PROOF_APPROVAL_PACKET.md`
- `docs/security/HOSTED_STAGING_TENANT_PROOF_RUNBOOK.md`
- `PR_HOSTED_STAGING_TENANT_PROOF_PACKET_SUMMARY.md`

## What the packet covers

- Approved staging/proof URL requirement.
- Synthetic tenant A/B IDs.
- Synthetic tenant A user identity and read-permission confirmation.
- Tenant B non-membership confirmation.
- Synthetic user credential or bearer-token strategy.
- Out-of-band bearer-token delivery requirement.
- Explicit base and read-only allow flags.
- Explicit no-destructive-mutation rule.
- Allowed endpoint list for the current GET-only adapter.
- Redaction rules.
- Expected sanitized evidence output.
- Stop rules.

## Safety

- No hosted mutations were run.
- No hosted migrations were run.
- No hosted proof was run.
- No production target was touched.
- No bearer token, cookie, password, database URL, service-role key, private key, customer data, document body, attachment body, signed XML, QR payload, or provider payload was added.
- Runtime code, accounting logic, Prisma schema, migrations, and UI behavior were not changed.

## Current status

Hosted staging proof remains blocked until the owner supplies the required packet values out of band and explicitly approves the read-only allow gates.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm verify:ci:local` - passed.
- Targeted high-risk secret scan - no real secrets; matches were documentation-only forbidden-secret wording.
- Targeted trailing whitespace scan - no matches.
- `git diff --check` and `git diff --cached --check` - passed.
- `apps/web/next-env.d.ts` generated churn was restored and has no final diff.

## Next recommended prompt

`Codex, review PR <number> for the hosted staging tenant proof approval packet only. Do not run hosted proof, do not run hosted migrations, do not run hosted mutations, and confirm the packet remains secret-free, blocked by default, and aligned with the existing hosted proof runbook.`
