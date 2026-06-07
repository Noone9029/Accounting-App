# ZATCA Sandbox OTP And Compliance CSID Approval Runbook

## 2026-06-07 Custody Guard Note

Before any real sandbox adapter execution, review `CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `CSID_RESPONSE_CUSTODY_GUARD.md`, and `CSID_RESPONSE_CUSTODY_RESULTS.md`. Current custody guard status is `CUSTODY_METADATA_SIMULATION_BLOCKED`; real response bodies, DB writes, token/secret/certificate persistence, OTP capture, CSID requests, network calls, adapter execution, env value output, and body exposure remain prohibited.

Adapter approval planning is now documented in `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, and `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`. The current approval status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; no adapter execution, request body creation, response body processing, OTP/CSID/network/DB action, env value exposure, or body exposure occurred.

Next prompt: `ZATCA sandbox adapter mock-to-real boundary test plan`.

Date: 2026-06-07

Status: Future runbook only. Do not request OTPs, request CSIDs, call ZATCA, execute the sandbox adapter, expose bodies, or enable signing from this document.

## Reconciliation Note

This runbook already existed in the latest pushed branch state inspected on 2026-06-07 (`90dec971 Plan ZATCA sandbox CSID approval`). It was updated in place. No duplicate approval docs or scripts were created, and unrelated dirty inventory, AP, marketing, and graph output files remain out of scope.

## Future Flow

1. Confirm the repository is on the expected approved commit for the future execution guard.
2. Run the no-network preflight guard.
3. Confirm key custody design is accepted.
4. Confirm CSID response custody provider is approved and enabled for sandbox only.
5. Confirm sandbox adapter execution is still disabled until the future execution guard explicitly enables it.
6. Confirm no production credentials are configured or used.
7. Confirm metadata-only evidence storage path and redaction booleans.
8. Confirm the exact approval phrase was provided for planning recognition.
9. Confirm `--approval-plan` is present.
10. Stop unless the future execution guard exists and passes its own tests.

## Operator Checklist

- Operator identity recorded as metadata.
- Approval timestamp recorded as metadata.
- Exact approval phrase match recorded as boolean.
- Approval phrase body not echoed in evidence.
- OTP requested: false for this plan.
- Compliance CSID requested: false for this plan.
- Production CSID requested: false.
- Sandbox adapter executed: false.
- Production signing enabled: false.
- Clearance/reporting enabled: false.
- PDF-A3 enabled: false.

## Environment Checklist

- Environment is sandbox planning only.
- `--no-network` is required for this guard.
- Sandbox base URL presence may be checked by boolean only.
- No env values may be printed.
- OTP-like env presence may be checked by boolean only.
- Production credential-like env presence must block future execution.
- Effective real network must remain false in this plan.

## Custody Checklist

- Private keys are not stored in normal DB tables for production use.
- Legacy raw PEM-capable fields are treated as blockers.
- CSID response custody provider is approved before response body material exists.
- Token, secret, and certificate body storage must be delegated to approved custody.
- Application evidence stores metadata only.
- Revocation and expiry metadata are planned before execution.

## Redaction Checklist

- OTP value redacted.
- CSR body redacted.
- Request body redacted.
- Response body redacted.
- Binary security token body redacted.
- Secret value redacted.
- Certificate body redacted.
- Private-key body redacted.
- Auth header redacted.
- XML and QR payload bodies absent.
- Approval phrase input not echoed by guard output.

## Abort Conditions

- Missing `--no-network`.
- Missing approval phrase.
- Invalid approval phrase.
- Exact phrase supplied without `--approval-plan`.
- Key custody blocker unresolved.
- CSID response custody blocker unresolved.
- Sandbox adapter still not covered by a future execution guard.
- Any production credential-like configuration is detected.
- Any request would include customer data.
- Any OTP, token, secret, certificate, private key, request body, or response body would be printed or persisted outside approved custody.
- Any production signing, clearance/reporting, PDF-A3, or production compliance flag is true.

## Future Command Shapes

Planning-only recognition, current sprint:

```bash
corepack pnpm zatca:sandbox-csid-preflight -- --plan --no-network --json --approval-phrase "<exact approval phrase>" --approval-plan
```

Future execution guard placeholder only:

```bash
corepack pnpm zatca:sandbox-csid-request-execution-guard -- --sandbox-only --metadata-only --approval-phrase "<exact approval phrase>" --otp-source "<ephemeral-manual-input>" --no-production
```

The placeholder command must not be added or run until the future execution guard sprint explicitly implements and tests it.

## Evidence Fields To Collect

- `status`
- `environment`
- `approvalPhraseMatched`
- `approvalPhraseEchoed`
- `approvalPlanRecognized`
- `operatorApprovedAt`
- `otpRequested`
- `otpProvided`
- `otpValueRedacted`
- `complianceCsidRequested`
- `productionCsidRequested`
- `networkCallsMade`
- `sandboxAdapterExecuted`
- `csidResponseCustodyApproved`
- `productionSigningEnabled`
- `productionComplianceEnabled`
- `clearanceReportingEnabled`
- `pdfA3Enabled`
- `requestBodyPrinted`
- `responseBodyPrinted`
- `secretBodyPrinted`
- `tokenBodyPrinted`
- `certificateBodyPrinted`
- `privateKeyBodyPrinted`
- `evidencePolicy`
- `blockers`
- `warnings`

## Fields Forbidden From Evidence

- OTP values.
- CSID bodies.
- Binary security token bodies.
- Secret values.
- Auth headers.
- Request bodies.
- Response bodies.
- Certificate bodies.
- Private-key bodies.
- XML bodies.
- Signed XML bodies.
- QR payload bodies.
- Customer/vendor data.
- Production credentials.

## Cleanup And Rollback

- Do not persist OTP values.
- Do not persist request or response bodies.
- Do not write signed XML or QR payloads.
- Do not retry automatically.
- Mark metadata-only attempt as blocked or aborted.
- Re-run no-network preflight after remediation.
- Revoke any mistakenly created metadata approval if scope or operator identity is wrong.
- Escalate any secret/body exposure as an incident.

## Next Stage After Approval

Completed follow-ups: `ZATCA sandbox CSID request execution guard`, `ZATCA CSID response custody implementation plan`, and `ZATCA sandbox adapter execution approval plan`. The next stage is a separate `ZATCA sandbox adapter mock-to-real boundary test plan` sprint. That future sprint must still be no-production, sandbox-only, custody-gated, redaction-tested, and blocked until all execution prerequisites are explicitly satisfied.

## Execution Guard Follow-Up

The separate execution guard sprint is now complete as a no-network guard only:

- Guard doc: `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md`.
- Result doc: `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.
- Observed guard status: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- Attempted execution flag status: `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.

No OTP/CSID/network call was made, the sandbox adapter was not executed, and no secrets or bodies were exposed. Completed follow-ups: `ZATCA sandbox adapter execution approval plan` and `ZATCA sandbox adapter mock-to-real boundary test plan`.

Boundary artifacts: `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md` and `SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`. Boundary status: `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`; mock adapter execution, request body creation, response body processing, DB writes, env value output, and body exposure remained false.

Completed follow-up: `ZATCA sandbox adapter no-network contract tests`.

Contract artifacts: `SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_TESTS.md` and `SANDBOX_ADAPTER_NO_NETWORK_CONTRACT_RESULTS.md`. Contract status is `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`; sandbox adapter execution, mock adapter execution, disabled adapter execution, request body creation, response body processing, DB writes, env value output, and body exposure remained false.

The next prompt is `ZATCA sandbox CSID dry-run request body schema plan`.
