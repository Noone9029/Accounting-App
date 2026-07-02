# Safe Script Review 02

Date: 2026-07-02
Goal ID: SECURITY-HARDENING-02

Status: partially resolved diagnostic queue; real dangerous-capable entries remain review-required

## Safety Contract

- Static scanner and source review only.
- No dangerous script executed.
- No database connection.
- No network calls.
- No migration, seed, reset, delete, provider call, hosted mutation, Vercel/Supabase mutation, storage operation, email, payment, or compliance submission.

## Result

`corepack pnpm security:safe-script-audit` now reports:

- Status: `REVIEW_REQUIRED`
- `guarded-or-dry-run`: 102
- `not-dangerous`: 54
- `review-required`: 10

The queue was reduced from 32 review-required entries to 10 by adding exact reviewed classifications for local/read-only/guarded entries. The remaining 10 are intentionally not cleared because they can migrate, seed, call API smoke flows, or run ZATCA validation/debug paths against API workflows.

## Reviewed And Cleared Categories

| Category | Examples | Conclusion |
| --- | --- | --- |
| Read-only hosted preflight | `scripts/check-deployed-e2e-env.cjs` | GET reachability checks only; credentials are reported as configured/redacted. |
| Build-only deploy hook | `scripts/vercel-postinstall.cjs` | Exits unless Vercel API deploy target is active; builds packages and runs `prisma generate` only. |
| Local readiness diagnostics | `scripts/zatca-sdk-readiness.cjs`, `pre-asp:diagnostics`, SDK CI readiness wrappers | Metadata and local filesystem/JDK/schema inspection only. |
| Guard/test wrappers | `test:zatca-*`, sandbox/CSID custody guards | Node test or guard-contract commands; no provider execution by default. |
| Local fixture/SDK wrappers | `zatca:sdk-validate-local`, `zatca:generate-local-xml-fixtures` | Local fixture/SDK work only; no DB or provider network by default. |
| Explicitly gated local ZATCA wrappers | `zatca:csr-local-generate`, `zatca:local-signed-xml-validate` | Disabled by default and require explicit local execution gates; no CSID request or clearance/reporting by default. |

## Remaining Review-Required Entries

| Source | Path | Reason retained |
| --- | --- | --- |
| file | `scripts/debug-zatca-pih-chain.cjs` | Invokes hash-mode validation workflow; can call API workflows and is not a pure static diagnostic. |
| file | `scripts/validate-generated-zatca-invoice.cjs` | Logs in, calls invoice ZATCA generate/XML/SDK-validation endpoints, and can operate against configured API data. |
| package-script | `db:migrate` | Runs Prisma migration deploy. |
| package-script | `db:seed` | Runs Prisma seed. |
| package-script | `demo:seed-workflows` | Runs demo workflow seed. |
| package-script | `smoke:accounting:banking` | Calls API smoke banking workflows and can mutate smoke data. |
| package-script | `smoke:accounting:zatca-safe` | Calls API smoke ZATCA-safe workflows and can mutate smoke data. |
| package-script | `zatca:debug-pih-chain` | Wrapper for `scripts/debug-zatca-pih-chain.cjs`. |
| package-script | `zatca:validate-generated` | Wrapper for `scripts/validate-generated-zatca-invoice.cjs`. |
| package-script | `zatca:validate-sdk-hash-mode` | Runs hash-mode validation workflow with API calls and temp SDK work. |

## Remaining Follow-Up

- Keep the 10 retained entries behind explicit owner approval or local-only execution windows.
- Add separate execution guards before any production/hosted use of migrate, seed, smoke, or ZATCA validation/debug commands.
- Do not treat this scanner as proof of production safety, hosted tenant isolation, provider readiness, or compliance readiness.
