# DEV-02 Lightweight CI Proposal

## Purpose And Scope

This proposal defines a lightweight, non-mutating pull request verification workflow for LedgerByte.

The proposed workflow is meant to reuse the DEV-02 verification gate scripts without adding production targets, database mutation, login flows, smoke tests, E2E tests, or deployed-environment checks.

## Current Status

- Verification scripts exist in the root `package.json`: `verify:diff`, `verify:local:web`, `verify:local:api`, `verify:local:guards`, `verify:repo`, and `verify:ci:local`.
- The gate runner exists at `scripts/verify-gate.cjs`, with tests in `scripts/verify-gate.test.cjs`.
- DEV-02 Part 5 implemented the PR workflow at [.github/workflows/pr-verification.yml](../../.github/workflows/pr-verification.yml).
- The existing `.github/workflows/deployed-e2e.yml` workflow remains manual and beta/user-testing only.
- Production hosting research remains paused. AWS remains future production direction only, and Vercel remains beta/user-testing/staging only.

## Proposed Non-Mutating PR CI Workflow

The proposed PR workflow should:

- check out the repository
- set up Node and Corepack
- install dependencies with a frozen lockfile
- run `verify:diff`
- run `verify:ci:local`

Implemented workflow YAML:

```yaml
name: PR Verification

permissions:
  contents: read

on:
  pull_request:
  workflow_dispatch:

concurrency:
  group: pr-verification-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Non-mutating verification
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      CI: "true"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies
        run: corepack pnpm install --frozen-lockfile

      # Non-mutating PR gate only. Keep deployed E2E, smoke, migrations,
      # seed/reset/delete, deploys, ZATCA, email, backup/restore, and
      # login/audit-writing flows out of this workflow.
      - name: Verify diff safety
        run: corepack pnpm verify:diff

      - name: Run local CI verification gate
        run: corepack pnpm verify:ci:local
```

## Explicit Exclusions

The proposed PR workflow must not run:

- production URLs
- Vercel or Supabase setting changes
- migrations
- seed, reset, or delete commands
- login or other audit-log-writing flows
- E2E tests
- smoke tests
- real ZATCA commands or network calls
- real email sends, retries, or provider webhooks
- backup or restore commands
- customer-data mutation or customer-data reads from non-local/non-CI environments

## Required Approvals Before Future Expansion

Before expanding the PR workflow beyond the implemented non-mutating gate, confirm:

- whether package-manager cache settings should be added
- whether any additional check remains non-mutating
- whether visual regression belongs in PR CI or a later manual/nightly lane
- whether `verify:ci:local` runtime is acceptable for every pull request after real CI timing is observed
- that `.github/workflows/deployed-e2e.yml` remains manual and beta/user-testing only

## Risks And Mitigations

- Risk: `verify:ci:local` may be slower than expected because it runs typecheck, tests, build, and guard checks.
  Mitigation: keep the first PR workflow simple and tune only after measuring actual CI duration.
- Risk: existing tests or builds may depend on optional local assumptions.
  Mitigation: fail fast, capture the exact failing command, and fix only non-mutating test/setup issues in follow-up work.
- Risk: CI drift could accidentally introduce production or mutation checks.
  Mitigation: route all default PR checks through `scripts/verify-gate.cjs`, which rejects forbidden default-gate command patterns.
- Risk: manual deployed E2E could be confused with PR CI.
  Mitigation: keep deployed E2E in its existing manual workflow and document that it is beta/user-testing only.

## DEV-02 Part 5 Implementation Result

DEV-02 Part 5 implemented one new GitHub Actions workflow from the proposed YAML. It:

- uses `corepack pnpm install --frozen-lockfile`
- runs `corepack pnpm verify:diff`
- runs `corepack pnpm verify:ci:local`
- does not run migrations, seed/reset/delete, smoke, E2E, deploys, ZATCA, email, backup/restore, or login/audit-writing flows
- leaves the existing deployed E2E workflow manual and unchanged
