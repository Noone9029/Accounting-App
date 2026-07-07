# Add support/email readiness proof

## Summary

This PR adds a local/static support and email readiness proof package for the paid-beta readiness track.

It includes:

- A source/docs/package verifier for support/email readiness coverage.
- Tests for missing proof surfaces, drifted safety-boundary text, package-script drift, JSON output, redaction, and local/static proof boundaries.
- Root package scripts for running the proof and its tests.
- A support/email readiness review document.

## Files changed

- `package.json`
- `scripts/support-email-readiness-proof.cjs`
- `scripts/support-email-readiness-proof.test.cjs`
- `SUPPORT_EMAIL_READINESS_PROOF_REVIEW.md`
- `PR_SUPPORT_EMAIL_READINESS_PROOF_SUMMARY.md`

## Safety contract

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No auth runtime logic changed.
- No UI behavior changed.
- No hosted proof executed.
- No hosted mutations or migrations were run.
- No cleanup execute was run.
- No email was sent.
- No provider APIs were called.
- No support tickets were created.
- No object-storage or signed URL operations were run.
- No real customer data or secrets are included.

## Proof coverage

The proof checks committed coverage for:

- Email controller guard/permission surface.
- Email readiness and diagnostics safety flags.
- Retry and retry-worker no-send/no-mutation defaults.
- Monitoring and provider-event metadata-only behavior.
- Sender-domain and monitoring evidence secret rejection.
- API catalog route documentation for email readiness/outbox/provider event surfaces.
- Support triage, incident response, controlled-beta support checklist, response templates, and monitoring/support readiness evidence.
- Root script wiring for the proof and monitoring/support readiness diagnostic.

## Remaining gaps

- No production support SLA tooling is active.
- No production monitoring provider, hosted log drain, status page, or ticketing automation is configured by this PR.
- Real SMTP/provider delivery remains disabled unless separately configured and approved.
- Provider-specific production webhook adapters and external email alert integrations remain future work.
- Hosted staging support behavior and real provider behavior require separate owner-approved packets.

## Validation

```bash
node --test scripts/support-email-readiness-proof.test.cjs
corepack pnpm test:support-email-readiness-proof
corepack pnpm support:email-readiness-proof -- --json
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @ledgerbyte/api db:generate
# Prisma validate with local/placeholder DATABASE_URL and DIRECT_URL
corepack pnpm test:monitoring-support-readiness
corepack pnpm monitoring:support-readiness -- --json --no-write
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/tenant-isolation-http.integration.spec.ts --runInBand
corepack pnpm build
corepack pnpm verify:diff
git diff --check
```

Results:

- Targeted support/email proof tests passed.
- Support/email proof CLI passed with `SUPPORT_EMAIL_READINESS_PROOF_PASSED`.
- Monitoring/support readiness tests passed.
- Monitoring/support readiness CLI passed with `MONITORING_SUPPORT_PARTIAL_READY` and zero blocked checks.
- Install, Prisma generate, Prisma validate, lint, typecheck, build, `verify:diff`, and `git diff --check` passed.
- Full `corepack pnpm test` failed locally in existing `apps/api/src/tenant-isolation-http.integration.spec.ts` because the `beforeAll` hook exceeded Jest's 5000 ms timeout under the full recursive suite. The same spec passed in isolation with `--runInBand`.
- Generated-file check passed; no `apps/web/next-env.d.ts` diff.
- Targeted secret scan passed; matches, if any, were documentation placeholders/safety terms only.

## Recommended next prompt

Codex, review this support/email readiness proof PR for owner-review readiness only. Confirm it is local/static only, checks committed support/email docs, tests, and package wiring, runs no hosted operations, sends no email, calls no providers, exposes no secrets, and leaves runtime/accounting/schema/UI behavior unchanged.
