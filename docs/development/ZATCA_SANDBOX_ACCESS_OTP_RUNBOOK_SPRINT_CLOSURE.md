# ZATCA Sandbox Access OTP Runbook Sprint Closure

Date: 2026-06-08

Branch: `codex/zatca-sandbox-access-otp-runbook`

Starting main commit: `2f40904929081271b150eb2189928d0490e20507 Merge PR #5: ZATCA sandbox CSID execution approval gate`

Sandbox portal reference only: `https://sandbox.zatca.gov.sa/IntegrationSandbox`

## Summary

This lane prepares a human-operated sandbox access and manual OTP capture runbook. It records what a human operator may verify outside the repo and what LedgerByte, Codex, docs, logs, commits, screenshots, tests, and evidence must never store.

No sandbox portal login, OTP capture, CSID request, ZATCA network call, request-body creation, response-body processing, response custody, signing, clearance/reporting, PDF-A-3, migration, deploy, provider/env change, production credential use, or production compliance claim is included.

## Artifacts

- Runbook: `docs/zatca/SANDBOX_ACCESS_AND_MANUAL_OTP_RUNBOOK.md`
- Static guard: `scripts/zatca-sandbox-access-otp-runbook-guard.cjs`
- Guard test: `scripts/zatca-sandbox-access-otp-runbook-guard.test.cjs`

## Checks Run

- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`: passed.
- `corepack pnpm test:zatca-sandbox-access-otp-runbook-guard`: passed.
- `corepack pnpm zatca:sandbox-access-otp-runbook-guard -- --json --strict`: passed with `RUNBOOK_GUARD_PASSED`.
- `git diff --check`: passed, with Git line-ending normalization warnings only for touched files.
- `corepack pnpm verify:ci:local -- --plan`: passed in plan-only mode.

## Safety Boundaries

- Human access to the ZATCA sandbox portal may happen only outside Codex and outside the repository.
- Codex must not log in to the sandbox portal or inspect authenticated portal pages.
- OTP must be captured only by an authorized human operator.
- OTP must never be committed, logged, pasted into chat, included in screenshots, included in evidence docs, or provided to Codex.
- CSID values, binary security tokens, secrets, certificates, private keys, CSR bodies, request bodies, response bodies, auth headers, cookies, portal session data, provider payloads, signed XML, QR payloads, customer/vendor data, bank account data, email bodies, and production credentials remain forbidden.
- Evidence remains metadata-only.

## Safe Metadata

Allowed metadata includes sandbox access confirmed: yes/no, operator role confirmed: yes/no, portal URL used, date/time of manual check, environment: sandbox only, whether OTP flow is visible: yes/no, whether CSID request flow is visible: yes/no, blocker list, next required approval boundary, and OTP obtained manually: yes/no.

## Approval Ladder Before Execution

1. sandbox access confirmed
2. manual OTP capture approved
3. request body creation approved
4. real sandbox network request approved
5. response body processing approved
6. response custody approved
7. sandbox CSID stored by approved custody provider

## Remaining Blockers

- Manual sandbox access confirmation by a human operator.
- Manual OTP capture approval.
- OTP entry into LedgerByte.
- Request body creation approval.
- Real sandbox network request approval.
- Response body processing approval.
- Response custody approval.
- Approved custody provider for sandbox CSID storage.
- Real custody provider approval.
- KMS/HSM or approved managed-secret boundary.
- Legacy PEM/payload-capable fields.
- Signing and Phase 2 QR.
- Clearance/reporting.
- PDF-A-3.
- Production CSID lifecycle.
- Official/legal/accounting/ZATCA specialist review.

## Recommended Next Lane

`LedgerByte approve and merge ZATCA sandbox access OTP runbook PR.`
