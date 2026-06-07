# ZATCA Custody Provider Boundary Branch Start

Date: 2026-06-07

## Branch

- Branch name: `codex/zatca-custody-provider-boundary-preflight`.
- Base local commit: `39eafadc08b54507e5d5899a10459e28fccc1bcc`.
- Base local commit subject: `Update handoff after ZATCA custody foundation merge`.
- `origin/main` at branch creation: `fd6dbff97e5c669a1c2cda1fc329fecdda5bb809`.

## Why This Branch Starts From Local Main

Local `main` was ahead of `origin/main` by one docs-only handoff commit after PR #1 merged. This branch preserves that handoff commit without pushing directly to `origin/main`, avoiding any main-branch deployment automation.

## Current ZATCA State

- PR #1 merged the metadata-only ZATCA key custody and CSID lifecycle foundation into `main`.
- Real ZATCA production compliance is not enabled.
- No real OTP, real CSID, real ZATCA network call, real private-key generation/storage, signing, clearance/reporting, PDF/A-3, production credential, provider/environment change, deployment, migration execution, or production compliance claim is authorized by this branch start.
- The next lane is preflight/design only for the custody provider boundary.

## Forbidden Actions

- Do not run migrations or apply migration files to any database.
- Do not run seed/reset/delete.
- Do not deploy or change provider/environment configuration.
- Do not call real ZATCA services.
- Do not generate, store, print, or persist real private keys.
- Do not implement signing, clearance/reporting, or PDF/A-3 in this branch-start lane.
- Do not expose secrets, tokens, auth headers, cookies, DB URLs, service-role keys, private keys, request/response bodies, signed XML, QR payloads, provider payloads, generated document bodies, customer/vendor data, or email bodies.
- Do not delete source branches or graphify output.

## Remaining Blockers

- Real custody provider approval.
- KMS/HSM or equivalent signing boundary.
- Real CSR/OTP/CSID onboarding.
- Production CSID lifecycle.
- Certificate rotation/revocation.
- Signing and Phase 2 QR.
- Clearance/reporting.
- PDF/A-3.
- Signed artifact storage.
- Official/legal/accounting review.

## Next Prompt

`LedgerByte ZATCA custody provider boundary preflight`
