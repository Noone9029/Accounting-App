# PR: Add backup restore proof pack

## Summary

This PR extends the local-only synthetic backup/restore proof harness and adds a current proof review packet.

It proves:

- default dry-run stays non-mutating
- mock-cycle creates a synthetic backup manifest and payload only in a temp directory
- restore rehearsal verifies manifest shape, payload checksum, and record counts
- mock-cycle cleanup removes artifacts by default
- unsafe artifact paths are blocked
- real-data mode is blocked
- proof output documents its evidence format
- proof output documents the synthetic tenant-boundary summary
- proof output does not include payload bodies, customer data, provider credentials, or secret values

## Safety

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No hosted migrations or hosted mutations were run.
- No hosted backup or restore was run.
- No provider/storage APIs were called.
- No cleanup execute path was run.
- No production readiness or disaster recovery claim was added.

## Commands

Local proof commands:

```powershell
corepack pnpm backup:restore-proof -- --json --strict --dry-run
corepack pnpm backup:restore-proof -- --json --strict --mock-cycle
corepack pnpm test:backup-restore-proof
```

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- `corepack pnpm test:backup-restore-proof` - passed with 15 tests passed.
- `corepack pnpm backup:restore-proof -- --json --strict --dry-run` - passed with `BACKUP_RESTORE_PROOF_DRY_RUN_READY`.
- `corepack pnpm backup:restore-proof -- --json --strict --mock-cycle` - passed with `BACKUP_RESTORE_MOCK_CYCLE_PASSED`.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; web Jest emitted a worker teardown warning but all suites passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan on changed files - passed with no real secrets.
- Generated-file check restored generated `apps/web/next-env.d.ts` churn; final check is clean.

## Remaining Gaps

- Hosted Supabase/Postgres backup proof.
- Hosted PITR proof.
- Hosted restore drill execution.
- Real object-storage backup and restore proof.
- Provider backup policy evidence.
- RPO/RTO business owner sign-off.
- Legal/accounting retention approval.
- Monitoring and alerting evidence.
