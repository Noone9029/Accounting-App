# PR: Add production monitoring proof pack

## Summary

This PR strengthens the local-only monitoring/support readiness proof pack.

It proves:

- the monitoring/support diagnostic remains deterministic
- the diagnostic is source/docs-only and non-mutating
- evidence output is Markdown plus JSON
- evidence output excludes secrets, customer data, provider credentials, and provider responses
- the alerting matrix covers required high-risk signals
- no live provider alerts or hosted log drain are claimed
- existing support, incident, health/readiness, backup, storage, email, and compliance boundary evidence remains discoverable

## Safety

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No hosted migrations or hosted mutations were run.
- No uptime monitor was created.
- No alert provider, log drain, or status page was configured.
- No email was sent.
- No provider/storage APIs were called.
- No production support SLA or production readiness claim was added.

## Commands

Local proof commands:

```powershell
corepack pnpm monitoring:support-readiness
corepack pnpm monitoring:support-readiness -- --json --no-write
corepack pnpm test:monitoring-support-readiness
```

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- `corepack pnpm test:monitoring-support-readiness` - passed with 6 tests.
- `corepack pnpm monitoring:support-readiness` - passed with `MONITORING_SUPPORT_PARTIAL_READY`.
- `corepack pnpm monitoring:support-readiness -- --json --no-write` - passed with `MONITORING_SUPPORT_PARTIAL_READY`.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed; web Jest emitted the existing worker teardown warning but all suites passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan on changed files - passed with safe wording/test matches only and no real secrets.
- Generated-file check restored generated `apps/web/next-env.d.ts` churn; final check is clean.

## Remaining Gaps

- Real external uptime monitor creation.
- Real alert provider routing.
- Hosted log drain configuration.
- API error monitoring provider setup.
- Worker/queue monitoring in a hosted runtime.
- Email provider event/webhook monitoring.
- Hosted backup/PITR alerting.
- Real object-storage/signed URL alerting.
- Paid support SLA/tooling.
- Public status page decision.
