# ZATCA Sandbox Adapter Execution Approval Runbook

## Purpose

This runbook describes the future sandbox adapter execution approval flow. It is not an execution runbook for this sprint. No adapter call, ZATCA network call, OTP request, CSID request, request body, response body, DB write, signing, QR generation, clearance/reporting, or PDF-A3 action is allowed now.

## Future Flow

1. Confirm the repository is on the approved commit for the future execution sprint.
2. Run the adapter approval guard with `--no-network`.
3. Confirm the exact approval phrase is recognized.
4. Confirm CSID response custody has been approved and tested.
5. Confirm key custody has been approved and raw PEM-capable runtime storage is out of scope.
6. Confirm OTP capture handling is approved and non-persistent.
7. Confirm sandbox-only env presence, without printing values.
8. Confirm production credential presence is false.
9. Confirm request/response body logging is disabled.
10. Confirm metadata-only evidence fields are configured.
11. Abort if any blocker remains.

## Operator Checklist

- Approval phrase present and exact.
- Future execution prompt explicitly authorizes sandbox adapter execution.
- Operator understands this is sandbox only.
- No customer data is included.
- No production credential or production CSID is present.
- No clearance/reporting, signing, QR, or PDF-A3 action is enabled.

## Environment Checklist

Record presence booleans only:

- `ZATCA_ADAPTER_MODE`
- `ZATCA_ENABLE_REAL_NETWORK`
- `ZATCA_SANDBOX_BASE_URL`
- `ZATCA_CSID_CUSTODY_PROVIDER`
- `ZATCA_CSID_CUSTODY_KMS_KEY_ID` or equivalent approved custody locator
- OTP source approved for one-time use

Do not record env values.

## Custody Checklist

- CSID response custody provider approved.
- Provider readiness tests pass without real ZATCA bodies.
- Metadata-only DB record path approved.
- Token, secret, and certificate bodies are kept out of normal DB tables.
- Legacy raw PEM-capable fields are not used for real response material.
- Custody failure rolls back metadata writes.

## OTP Handling Checklist

- OTP is requested only in a future approved execution sprint.
- OTP is not logged.
- OTP is not stored.
- OTP is not included in evidence.
- OTP is not echoed in errors.
- OTP is not retained after the request boundary.

## Network Gate Checklist

- Sandbox-only adapter mode is approved.
- Real-network gate is explicitly approved for sandbox.
- Sandbox base URL value is verified out of band and never copied into evidence.
- Production endpoints and production credentials are absent.
- No automatic retries are enabled.

## Redaction Checklist

Evidence must not contain:

- OTP values
- CSID material
- binary/security tokens
- secrets
- auth headers
- request bodies
- response bodies
- certificate bodies
- private-key bodies
- env values
- signed XML
- QR payloads

## Abort Conditions

Abort if:

- approval phrase is missing or invalid
- guard status is blocked
- CSID custody provider is disabled
- legacy raw PEM-capable fields remain in the execution path
- OTP handling approval is missing
- request/response body logging cannot be proven disabled
- any production credential is present
- any evidence would expose bodies or secrets
- DB writes are not explicitly authorized for metadata-only custody

## Future Command Shape Placeholders

Planning guard:

```powershell
corepack pnpm zatca:sandbox-adapter-execution-approval -- --plan --no-network --json --approval-phrase "<exact planning phrase>" --adapter-execution-approval
```

Future execution shape, still blocked in this sprint:

```powershell
corepack pnpm zatca:sandbox-adapter-execution-approval -- --plan --no-network --json --approval-phrase "<exact planning phrase>" --execute-adapter
```

The future real execution command must be defined in a separate approved sprint and must not include OTP, request body, response body, secrets, or env values in shell history or evidence.

## Evidence Fields To Collect

- command shape
- approval phrase matched true/false
- approval status
- execute-adapter status
- env presence booleans
- custody prerequisite booleans
- networkCallsMade
- sandboxAdapterExecuted
- requestBodyCreated
- responseBodyProcessed
- dbConnectionAttempted
- dbWriteAttempted
- blockers
- warnings
- next approval gate

## Fields Forbidden From Evidence

- OTP
- CSID material
- binary/security token
- secret
- auth header
- request body
- response body
- certificate body
- private-key body
- env value
- signed XML body
- QR payload

## Rollback and Failure Behavior

If custody fails, response handling must fail closed and rollback metadata writes. If a network request fails in a future approved sprint, no automatic retry should occur unless a separate retry policy is approved. If any sensitive body would be logged or persisted, abort immediately and record metadata-only blocker evidence.

## Next Stage After Approval

Completed follow-up: `ZATCA sandbox adapter mock-to-real boundary test plan`

Boundary artifacts: `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`, `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`, and `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`.

Boundary status: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`. No OTP/CSID/network call, sandbox adapter execution, mock adapter execution, request body creation, response body processing, DB write, env value output, or secret/body exposure occurred.

`ZATCA sandbox adapter no-network contract tests`
