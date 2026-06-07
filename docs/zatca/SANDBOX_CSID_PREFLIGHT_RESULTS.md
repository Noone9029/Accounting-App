# ZATCA Sandbox CSID Preflight Results

Date: 2026-06-07

## Repository Reconciliation

- Latest pushed branch state inspected on 2026-06-07: `90dec971 Plan ZATCA sandbox CSID approval`.
- Required baseline files were present.
- Existing sandbox OTP/CSID approval docs and guard handling were found and updated in place, not duplicated.
- Unrelated dirty inventory, AP, marketing, and graph output files were present in the worktree and remained out of scope.
- No approval evidence was invented; results below come from local no-network guard output only.

## Command Run

```bash
corepack pnpm zatca:sandbox-csid-preflight -- --plan --no-network --json
```

## Preflight Status

`PREFLIGHT_BLOCKED`

Safe planning prerequisites are present, but future sandbox execution remains blocked.

## Approval Plan Extension

The guard now recognizes the exact future approval phrase only when `--approval-plan` is also present. The observed planning-only approval run returned `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

See:

- `SANDBOX_OTP_CSID_APPROVAL_PLAN.md`
- `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`
- `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`

## References Found

- Baseline ZATCA docs and local dummy signing evidence: found.
- SDK readme, usage, and config: found.
- CSR template/examples: found.
- Compliance CSID document: found.
- Onboarding document: found.
- Renewal document: found.
- Security features standard: found.
- XML implementation standard: found.
- EInvoice data dictionary: found.
- Clearance and reporting documents: found.

CSR keys found:

- `csr.common.name`
- `csr.serial.number`
- `csr.organization.identifier`
- `csr.organization.unit.name`
- `csr.organization.name`
- `csr.country.name`
- `csr.invoice.type`
- `csr.location.address`
- `csr.industry.business.category`

## Code Surfaces Found

- `apps/api/prisma/schema.prisma`: found.
- `apps/api/src/zatca/zatca.service.ts`: found.
- `apps/api/src/zatca/zatca.controller.ts`: found.
- `apps/api/src/zatca/zatca.config.ts`: found.
- `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts`: found.
- `apps/api/src/zatca/adapters/sandbox-disabled-zatca-onboarding.adapter.ts`: found.
- `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts`: found.
- `apps/api/src/zatca/custody/compliance-csid-secret-custody.provider.ts`: found.
- CSR dry-run/local-generate and compliance CSID plan scripts: found.
- Shared readiness, web ZATCA lib, and settings UI surfaces: found.

Findings:

- Legacy raw PEM-capable fields are still present.
- Metadata-only custody record model exists.
- Sandbox adapter exists but execution remains blocked.
- Mock adapter exists and is mock-only.
- CSID response custody provider exists but remains disabled/unapproved.
- Production compliance remains false.

## Env Presence Summary

Values were not printed, stored, copied, or used.

| Field | Boolean |
| --- | --- |
| Sandbox base URL configured | `false` |
| OTP-like env var present | `false` |
| Production credential-like env var present | `false` |
| Sandbox compliance CSID request gate configured | `false` |
| Sandbox compliance CSID request gate enabled | `false` |
| Sandbox CSID execution explicitly disabled | `true` |
| Adapter mode sandbox configured | `false` |
| Real network enabled configured | `false` |
| Effective real network enabled | `false` |

## Blockers

- `BLOCKED_KEY_CUSTODY_NOT_IMPLEMENTED`: legacy raw PEM-capable fields exist and production KMS/HSM/external signing custody is not implemented.
- `BLOCKED_CSID_RESPONSE_CUSTODY_NOT_APPROVED`: token, secret, and certificate response custody remains disabled or unapproved.
- `BLOCKED_SANDBOX_ADAPTER_DISABLED`: real sandbox adapter execution remains disabled and no ZATCA network call is allowed.
- `BLOCKED_OTP_NOT_APPROVED`: OTP capture is not approved, accepted, stored, printed, or requested by the guard.
- `BLOCKED_CSID_REQUEST_NOT_APPROVED`: future compliance CSID request execution requires a separate explicit approval gate.
- `BLOCKED_PRODUCTION_SIGNING_DISABLED`: production signing and production compliance remain disabled.

## Warnings

None from this local preflight run.

## Redaction Result

- Environment values printed: `false`.
- OTP body printed: `false`.
- CSR body printed: `false`.
- Private-key body printed: `false`.
- Certificate body printed: `false`.
- Token body printed: `false`.
- Secret body printed: `false`.
- Auth header printed: `false`.
- Request body printed: `false`.
- Response body printed: `false`.

## No-Network Result

- `noNetworkOnly`: `true`.
- `networkCallsMade`: `false`.
- `commandExecutionAttempted`: `false`.
- `dbConnectionAttempted`: `false`.
- `otpRequested`: `false`.
- `complianceCsidRequested`: `false`.
- `productionCsidRequested`: `false`.
- `productionSigningEnabled`: `false`.
- `productionComplianceEnabled`: `false`.
- `clearanceReportingEnabled`: `false`.
- `pdfA3Enabled`: `false`.
- `signedXmlGenerated`: `false`.
- `qrPayloadGenerated`: `false`.

## What Remains Blocked

- Key custody implementation and approval.
- CSID response custody implementation and approval.
- Sandbox OTP handling approval.
- Compliance CSID request approval.
- Real sandbox adapter execution.
- Compliance invoice checks.
- Production CSID lifecycle.
- Production signing and Phase 2 QR proof.
- Clearance/reporting.
- PDF-A3.
- Signed-artifact storage.
- Retry/error queue.
- Official/legal/accounting review.
- Repeatable SDK CI.

## Recommended Next Prompt

`ZATCA sandbox CSID request execution guard`
