# ZATCA CSR And CSID Onboarding Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## 2026-06-06 Reconciliation Update

This older checklist remains historical context. The current status checklist is `CSID_LIFECYCLE_CHECKLIST.md`, and the consolidated design is `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`.

No OTP was requested, no CSID was requested, and no ZATCA network call was made by the design task.

## 2026-06-06 Sandbox CSID Preflight Guard Update

`SANDBOX_CSID_PREFLIGHT_GUARD.md` and `SANDBOX_CSID_PREFLIGHT_RESULTS.md` now provide the no-network preflight before any sandbox OTP/CSID approval. The current status is `PREFLIGHT_BLOCKED`.

The guard checks CSR reference presence and CSR property keys, but it does not request OTPs, request CSIDs, call ZATCA, generate signing material, or expose request/response/credential bodies.

## 2026-06-06 Sandbox OTP/CSID Approval Plan Update

`SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md` now document the future approval phrase and runbook. The guard recognizes the exact phrase for planning only as `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`; no OTP request, CSID request, ZATCA network call, sandbox adapter execution, response body handling, signing, clearance/reporting, PDF-A3, or production compliance is enabled.

- Current CSR generation is local development groundwork only.
- Verify official CSR subject attributes, serial-number format, extensions, key algorithm, and certificate profile.
- Get FATOORA sandbox access and a real OTP before testing compliance CSID onboarding.
- Map official compliance CSID request/response fields.
- Store issued CSIDs and certificate request IDs without exposing private keys.
- Keep production CSID request blocked until sandbox compliance checks pass.
- Add tests proving request logs never store OTP, CSR PEM, CSID PEM, or private-key material.

## Reference-backed source files

- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`

Current LedgerByte CSR generation remains local-only. Before real compliance CSID work, compare local CSR output against the SDK CSR tool and verify CSR subject, serial-number, key algorithm, OTP handling, and response fields.

## Sandbox CSID Request Execution Guard Update

- Guard doc: `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md`.
- Result doc: `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md`.
- Observed guard status: `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`.
- Observed execute status: `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- CSR readiness remains metadata-only; the guard does not create a CSID request body or process a response body.
- No OTP was requested, no CSID was requested, no adapter was executed, no network call was made, and no secrets/bodies were exposed.
- Next prompt: `ZATCA CSID response custody implementation plan`.
