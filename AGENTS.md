# LedgerByte Agent Instructions

This file is the standing instruction set for Codex/AI agents working in this repository.

Repository: `Noone9029/Accounting-App`
Product: LedgerByte, a Saudi-first accounting SaaS inspired by common cloud accounting workflows.
Current posture: controlled beta/user-testing only. Not production-launched.

## 1. Operating Principles

- Prefer one complete implementation arc over many tiny prompts.
- Keep tasks scoped, but do not split planning/docs/static-audit work into unnecessary micro-lanes.
- Split work only when crossing a real danger boundary:
  - production or beta data mutation
  - database migration/schema change
  - seed/reset/delete/cleanup execution
  - real ZATCA network, OTP, CSID, signing, clearance, reporting, PDF-A3
  - real email sending or provider webhook execution
  - billing/payment-provider integration
  - RLS/runtime DB role/security hardening
  - deployment/provisioning/production infrastructure changes
- Read relevant repo context first, then act. Do not wander the whole repo unless required.
- Always preserve safety, accounting correctness, and auditability over speed.
- Do not claim production readiness or compliance unless there is explicit, current, verified evidence.

## 2. Required First Reads

For most tasks, read these first:

- `CODEX_HANDOFF.md`
- `README.md`
- `BUG_AUDIT.md`

For development/QA tasks, also read relevant files under:

- `docs/development/`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`

For production-readiness tasks, also read:

- `docs/production/`
- `docs/deployment/`

For ZATCA tasks, also read:

- `docs/zatca/`
- official ZATCA SDK/reference materials under `reference/`, if available

If `CODEX_HANDOFF.md` is stale compared with `git log -1`, update it or clearly report the mismatch.

## 3. Current Product Posture

LedgerByte is currently a controlled-beta/user-testing product.

Do not describe LedgerByte as:

- production-launched
- production-ready
- ZATCA production-compliant
- officially certified
- ready for unrestricted customer data
- Wafeq/Xero-equivalent in production maturity

Vercel deployments are beta/user-testing/staging only. Final production hosting remains a separate approved production-foundation decision.

Real ZATCA production compliance is not enabled.

## 4. Hard Safety Boundaries

Unless a task explicitly approves it, do not:

- deploy, provision, or change cloud infrastructure
- change Vercel/Supabase settings
- change environment variables or secrets
- run migrations
- change database schema
- seed, reset, delete, or cleanup data
- mutate production, beta, or customer data
- run login/audit-writing flows
- create, finalize, approve, void, reverse, allocate, match, categorize, ignore, transfer, receive, issue, post, export, download, send, upload, or delete records
- run full E2E or smoke against deployed/beta targets
- call real ZATCA networks
- request or capture OTPs
- request compliance or production CSIDs
- generate/store real private keys, certificates, CSRs, tokens, or CSID secrets
- sign XML for production
- clear/report invoices
- create PDF-A3 artifacts for production compliance
- send real customer emails
- trigger real provider webhooks
- execute backup/restore
- expose request/response bodies, auth headers, cookies, DB URLs, API keys, SMTP secrets, ZATCA material, signed XML, QR payloads, attachment bodies, or customer/vendor data

## 5. ZATCA Rules

For ZATCA work:

- Use official ZATCA docs, SDK, schemas, samples, Schematron rules, and manuals in `reference/` as the source of truth.
- Do not guess ZATCA rules.
- Do not use unofficial sources unless explicitly marked supplemental.
- Keep evidence metadata-only unless a later approved lane explicitly allows body handling.
- Default posture is no-network and no-production.
- Do not claim production compliance.
- Do not request OTP, CSID, clearance, reporting, signing, or PDF-A3 unless the task explicitly approves that exact action.
- If a ZATCA blocker requires real credentials, network calls, body processing, or secret custody, document the blocker and stop at the approved boundary.

## 6. Accounting Rules

Accounting correctness beats UI speed.

Do not broadly change:

- journal posting
- reversal behavior
- fiscal-period locks
- report math
- VAT math
- inventory valuation
- COGS
- AR/AP allocation logic
- bank reconciliation state
- ZATCA invoice metadata
- document/PDF totals

unless the task is explicitly scoped for that accounting behavior.

When changing accounting/state-machine code:

- identify affected ledger entries
- identify audit/logging side effects
- preserve idempotency
- preserve rollback behavior
- add targeted tests
- document remaining accounting-review questions

## 7. Graphify Usage

Use Graphify as a map, not proof.

If `graphify-out/` exists:

- inspect `graphify-out/GRAPH_REPORT.md`
- inspect `graphify-out/manifest.json`
- inspect `graphify-out/graph.json` if needed

Use Graphify only to identify:

- dependency groups
- high fan-out files
- shared helpers/components
- likely affected tests
- blast radius

Do not regenerate Graphify unless output is missing, clearly stale, or the task explicitly asks for regeneration.

Do not treat Graphify as runtime proof. Tests and code review still matter.

## 8. Token and Context Optimization

Use focused context.

Do:

- read `CODEX_HANDOFF.md`
- read only task-relevant docs/files
- use Graphify for dependency discovery
- use targeted search before broad repo inspection
- prefer arc prompts over tiny prompts for planning/docs/static work
- summarize findings in concise bullets
- keep final response under 15 bullets unless asked otherwise

Avoid:

- re-reading the entire repo every run
- repeating long safety walls if this file already covers them
- running broad tests before targeted tests
- editing unrelated files
- opening generated or large files unless necessary

## 9. Model/Intelligence Guidance

Use the cheapest capable model first.

Recommended routing:

- Docs, handoff sync, README updates, static audits: cheap/fast Codex-capable model, Low or Medium intelligence.
- Planning docs, runbooks, dry-run plans, static guards: standard Codex model, Medium intelligence.
- Narrow frontend/API bug fixes with targeted tests: standard Codex model, High intelligence.
- Cross-module implementation touching accounting state machines: stronger model, High or Extra High intelligence.
- ZATCA signing/CSID/network/security/RLS/migrations/production infra: GPT-5.5 or strongest available model, Extra High intelligence.
- Retry after cheaper model fails: escalate one level, do not immediately jump to the highest model unless high-risk.

When generating future prompts, include:

```text
Recommended model:
Recommended intelligence:
Token mode:
Escalate only if:
```

## 10. Verification Commands

Prefer safe gates first.

Common safe commands:

```bash
corepack pnpm verify:diff
corepack pnpm verify:local:web
corepack pnpm verify:local:api
corepack pnpm verify:local:guards
```

Broader but still non-destructive:

```bash
corepack pnpm verify:repo
corepack pnpm verify:ci:local
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Run targeted tests when possible, for example:

```bash
corepack pnpm --filter @ledgerbyte/api test -- <pattern>
corepack pnpm --filter @ledgerbyte/web test -- <pattern>
corepack pnpm --filter @ledgerbyte/api typecheck
corepack pnpm --filter @ledgerbyte/web typecheck
```

Before committing:

```bash
git diff --check
git diff --cached --check
```

Do not run migrations, seed/reset/delete, E2E, smoke, real ZATCA, real email, backup/restore, or deployed beta checks unless explicitly approved.

## 11. Dirty/Unrelated Files

Before work:

```bash
git status --short
git log -1 --oneline
git branch --show-current
```

Do not stage unrelated dirty files.

Known paths that often must remain untouched unless directly relevant:

- `apps/web/src/app/page.tsx`
- `graphify-out/*`
- marketing files
- generated local artifacts
- local machine config
- `.env*`
- reference SDK binaries or private material

If unrelated changes exist, leave them unstaged and mention them in the final response.

## 12. Documentation and Handoff Rules

Most non-trivial tasks should update:

- `CODEX_HANDOFF.md`

Update relevant docs only when the task touches that area.

Examples:

- ZATCA tasks: `docs/zatca/`
- DEV tasks: `docs/development/`
- production foundation: `docs/production/`
- deployment/security: `docs/deployment/`
- product readiness: `docs/PRODUCT_READINESS_SCORECARD.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/REMAINING_ROADMAP.md`, only when scores/posture truly change

`CODEX_HANDOFF.md` should include:

- latest commit inspected
- branch name
- completed lane/task
- files/docs/scripts added or changed
- checks run
- skipped commands and why
- remaining blockers
- exact next recommended prompt title
- whether production/ZATCA/customer-data behavior changed

## 13. Commit and Push Rules

Unless the task says not to commit:

- commit focused changes
- push the branch
- use a clear commit message
- do not mix unrelated changes

Final response must include:

- latest commit inspected
- branch
- files changed
- tests/checks run
- skipped commands and why
- commit hash pushed
- whether branch is ahead of main or needs PR/merge
- next recommended arc

## 14. Pull Request and Merge Rules

When preparing a PR or merge:

- verify branch against `main`
- summarize changed files
- confirm safety boundaries
- confirm tests/checks
- confirm no secrets/bodies/customer data
- confirm no production/ZATCA/email/deploy side effects unless explicitly approved
- mention if GitHub Actions did or did not run
- mention if Vercel preview/status checks passed

Do not merge without explicit user approval if the task only requested preparation.

## 15. Preferred Prompt Shape

Future prompts should use this shape:

```text
Recommended model:
Recommended intelligence:
Token mode:
Escalate only if:

Task:
Complete [ARC NAME] in one run.

Goal:
[clear outcome]

Scope:
[what to inspect/change/test]

Use Graphify:
[yes/no and how]

Hard limits:
[only task-specific additions; rely on AGENTS.md for standing rules]

Verification:
[targeted checks]

Commit:
[message]

Final response:
[under 15 bullets]
```

## 16. When to Stop and Ask

Stop and report instead of continuing if:

- a task would require forbidden secrets or credentials
- a task would require production/beta/customer-data mutation without approval
- ZATCA real network/body/OTP/CSID/signing boundary is reached
- migration/schema/backfill is required but not approved
- cleanup/delete/reset is required but not approved
- tests reveal a broad accounting inconsistency outside scope
- Graphify or dependency inspection shows a high fan-out shared file would need broad refactor

Prefer a clear blocker report over a fake fix.

## 17. Current Strategic Priorities

Current priorities, in rough order:

1. Keep handoff and branch state accurate.
2. Merge narrow safe fixes only after targeted verification.
3. Continue controlled-beta hardening without production claims.
4. Reduce Codex usage with arc prompts and this standing instruction file.
5. Use Graphify for blast-radius guidance.
6. Preserve ZATCA safety boundaries.
7. Build production foundation only through explicit approved lanes.
8. Do not broaden customer exposure until security, backups, monitoring, billing/legal, and ZATCA blockers are addressed.

## 18. Test and Build Resource Limits

These limits override any unconstrained-looking test, build, typecheck, lint, code-generation, local-CI, or workspace command examples elsewhere in this file.

- All processes started for one test/build operation must stay within an aggregate ceiling of **20 GB RAM** and approximately **50% of the machine's logical CPU capacity**. These are maximums, not targets.
- Calculate the worker limit as `max(1, floor(logical_cpu_count / 2))` and explicitly pass the appropriate concurrency setting to the tool being used, including Jest `--maxWorkers=50%`, Playwright `--workers=<limit>`, and bounded pnpm workspace concurrency.
- Run only one heavy command at a time. Account for child processes when enforcing both limits; never give each child the full 20 GB allowance.
- Never run Jest, Playwright, builds, or pnpm workspace execution with unconstrained parallelism.
- Prefer narrower targeted checks before broader suites. If a command cannot be reliably constrained to these limits, do not run it; explain the limitation and choose a safer verification method.
