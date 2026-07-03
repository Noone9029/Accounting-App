# Safe Script Review 03

Date: 2026-07-03
Goal ID: SECURITY-SAFE-SCRIPTS-03

Status: review queue reduced to zero; dangerous-capable workflows remain owner-approval required

## Scope

This pass reviewed the 10 retained safe-script findings from `SECURITY-HARDENING-02` and converted them from a vague `review-required` queue into explicit guard contracts. The changes are intentionally narrow:

- Add reusable non-mutating guard helpers for local-only API targets, production/remote refusal, exact owner approval, and redaction.
- Add tests for those guard helpers and for guarded smoke/demo seed behavior.
- Regenerate `docs/security/evidence/SAFE_SCRIPT_AUDIT.md` and JSON evidence.
- Keep migration, seed, API smoke, and ZATCA validation/debug workflows blocked unless an owner approves an explicitly disposable non-production target.

No dangerous script was executed in this review. No hosted database, Supabase, Vercel, provider, storage, signed URL, email, payment, migration, seed/reset/delete, ZATCA, UAE, Peppol, ASP, accounting, report, VAT, inventory valuation, banking, or reconciliation mutation was performed.

## Result

`corepack pnpm security:safe-script-audit` now reports:

- `status`: `OWNER_APPROVAL_REQUIRED`
- `review-required`: 0
- `owner-approval-required`: 10
- `guarded-or-dry-run`: 104
- `not-dangerous`: 56

This is not a production-readiness clearance. The remaining 10 entries are still dangerous-capable and must not be run casually. The improvement is that each retained entry now has an explicit classification and guard expectation instead of an unresolved review queue.

## Reviewed Entries

| Entry | Risk class | Guard added or retained | Remaining state |
| --- | --- | --- | --- |
| `scripts/debug-zatca-pih-chain.cjs` | ZATCA/API workflow debug | Refuses production or remote API targets and requires explicit local API approval before delegating to hash-mode validation. | Owner approval required |
| `scripts/validate-generated-zatca-invoice.cjs` | Generated invoice API validation | Refuses production or remote API targets, requires explicit local API approval, and redacts credentials, tokens, and error payloads. | Owner approval required |
| `db:migrate` | Prisma migration | Remains intentionally blocked without owner approval; no wrapper or execution was added. | Owner approval required |
| `db:seed` | Prisma seed | Remains intentionally blocked without owner approval; no seed command was executed. | Owner approval required |
| `demo:seed-workflows` | Demo workflow seed/API mutation | Local-only by default; remote disposable targets require `LEDGERBYTE_DEMO_SEED_ALLOW_REMOTE=true`, `LEDGERBYTE_DEMO_SEED_TARGET_CLASS=disposable-non-production`, and exact owner approval. | Owner approval required |
| `smoke:accounting:banking` | API smoke mutation | Local targets allowed; remote targets require disposable non-production classification and exact owner approval; production-like env/URL refused. | Owner approval required |
| `smoke:accounting:zatca-safe` | API smoke mutation | Same smoke target guard as banking; real ZATCA network remains disabled. | Owner approval required |
| `zatca:debug-pih-chain` | Package wrapper | Inherits `scripts/debug-zatca-pih-chain.cjs` local-only approval and production refusal. | Owner approval required |
| `zatca:validate-generated` | Package wrapper | Inherits generated invoice validation local-only approval, production refusal, and redaction. | Owner approval required |
| `zatca:validate-sdk-hash-mode` | Hash-mode API workflow | Refuses production or remote API targets and requires explicit local API approval before API workflow execution. | Owner approval required |

## Verification

Focused verification added for this pass:

- `node --test scripts/safe-script-guards.test.cjs`
- `corepack pnpm --filter @ledgerbyte/api test -- smoke-http seed-demo-workflows`
- `corepack pnpm test:security-safe-script-audit`
- `corepack pnpm security:safe-script-audit`

Final goal verification is recorded in the PR after the full gate set completes.

## Remaining Blockers

- The 10 retained entries still require owner approval and a disposable non-production target before execution.
- Hosted runtime-role cutover, RLS/Data API hardening, hosted grants/default-privilege checks, PITR/object-storage proof, provider evidence, and production compliance remain separate blocked goals.
- No production or hosted mutation should be inferred from this static guardrail review.
