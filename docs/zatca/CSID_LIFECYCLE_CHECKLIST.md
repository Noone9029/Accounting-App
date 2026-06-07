# ZATCA CSID Lifecycle Checklist

Date: 2026-06-06

Status values used in this checklist: `DONE_LOCAL`, `PLANNED`, `BLOCKED`, `NOT_STARTED`, `MANUAL_APPROVAL_REQUIRED`, `NOT_APPLICABLE`.

This checklist is metadata-only planning. It does not request OTPs, request compliance CSIDs, request production CSIDs, call ZATCA, generate production credentials, execute signing, persist signed XML, persist QR payloads, run clearance/reporting, implement PDF-A3, deploy, migrate, seed, reset, delete, send email, or change production/beta data.

## Sandbox CSID Preflight Guard

| Item | Status | Notes |
| --- | --- | --- |
| Sandbox CSID preflight guard script exists | DONE_LOCAL | `scripts/zatca-sandbox-csid-preflight.cjs` checks local readiness only. |
| Sandbox CSID preflight test exists | DONE_LOCAL | `scripts/zatca-sandbox-csid-preflight.test.cjs` covers no-network, redaction, env-presence, adapter, and strict-mode behavior. |
| Preflight result documented | DONE_LOCAL | `SANDBOX_CSID_PREFLIGHT_RESULTS.md` reports `PREFLIGHT_BLOCKED`. |
| OTP requested by preflight | NOT_APPLICABLE | No OTP was requested, accepted, stored, printed, or used. |
| Compliance CSID requested by preflight | NOT_APPLICABLE | No compliance CSID was requested. |
| Real sandbox adapter execution | BLOCKED | Adapter remains blocked and no ZATCA network call is allowed. |
| Sandbox OTP/CSID approval plan docs | DONE_LOCAL | `SANDBOX_OTP_CSID_APPROVAL_PLAN.md`, `SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`, and `SANDBOX_OTP_CSID_APPROVAL_RESULTS.md` are metadata-only. |
| Approval phrase recognition | DONE_LOCAL | Exact phrase plus `--approval-plan` returns `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`; no OTP/CSID/network/adapter execution occurs. |
| Sandbox request execution guard | DONE_LOCAL | `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md` and `SANDBOX_CSID_REQUEST_EXECUTION_RESULTS.md` document `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`; `--execute-csid-request` remains `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. |
| CSID response custody implementation plan | DONE_LOCAL | `CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`, `CSID_RESPONSE_CUSTODY_GUARD.md`, and `CSID_RESPONSE_CUSTODY_RESULTS.md` document `CUSTODY_METADATA_SIMULATION_BLOCKED`; no real response body, DB write, token/secret/certificate persistence, OTP, CSID request, network call, or adapter execution occurred. |
| Sandbox adapter execution approval plan | DONE_LOCAL | `SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`, `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`, and `SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md` document `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. |
| Next adapter boundary test plan | PLANNED | `ZATCA sandbox adapter mock-to-real boundary test plan`. |

## Local Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Required baseline ZATCA docs and dummy-signing evidence exist | DONE_LOCAL | Reconciled against commit `49bd2b00`. |
| Local dummy SDK signing evidence exists for generated standard invoice and credit note | DONE_LOCAL | Metadata-only evidence at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`. |
| Dummy SDK certificate/private-key path metadata inspected without body exposure | DONE_LOCAL | SDK dummy material is test-only and never tenant credential material. |
| Production signing enabled | BLOCKED | Must remain false until production custody and CSID lifecycle are approved. |
| Real ZATCA network enabled | BLOCKED | No real endpoint call is approved in this phase. |

## Organization And ZATCA Seller Profile Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Seller profile model exists | DONE_LOCAL | `ZatcaOrganizationProfile` stores non-secret seller profile fields. |
| Seller VAT/legal/profile values reviewed for official CSR use | PLANNED | Must be confirmed by authorized operator and ZATCA specialist. |
| Production taxpayer profile approved | MANUAL_APPROVAL_REQUIRED | Not done in this design task. |
| Legal/accounting review completed | BLOCKED | Required before production CSID/signing. |

## EGS Readiness

| Item | Status | Notes |
| --- | --- | --- |
| EGS unit model exists | DONE_LOCAL | `ZatcaEgsUnit` stores EGS metadata and hash-chain state. |
| Non-secret CSR EGS fields exist | DONE_LOCAL | Common name, serial number, organization unit, invoice type, and location address are modeled. |
| Legacy PEM-capable EGS fields identified | DONE_LOCAL | `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` are not production-acceptable custody. |
| Production EGS onboarding approved | BLOCKED | Requires production CSID lifecycle approval. |
| EGS decommission/revocation workflow implemented | NOT_STARTED | Needs incident and lifecycle work. |

## CSR Field Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Official CSR config key list inspected | DONE_LOCAL | SDK template/examples inspected under `reference/`. |
| Sanitized CSR config preview exists | DONE_LOCAL | Local-only preview and review workflow already exist. |
| CSR config approval records exist | DONE_LOCAL | `ZatcaCsrConfigReview` stores sanitized preview metadata and approvals. |
| SDK CSR generation for production credentials | BLOCKED | No production key generation is allowed. |
| CSR body exposure in evidence/API/UI | BLOCKED | Must remain forbidden outside explicitly approved CSR download/review paths. |

## OTP Acquisition Readiness

| Item | Status | Notes |
| --- | --- | --- |
| OTP requirement documented | DONE_LOCAL | Official compliance/renewal docs require OTP-style handling. |
| OTP requested in this task | NOT_APPLICABLE | No OTP was requested. |
| OTP storage implemented | BLOCKED | OTP must not be stored, logged, returned, or persisted. |
| Sandbox OTP operator approval | MANUAL_APPROVAL_REQUIRED | Future gate only. |
| Sandbox OTP/CSID approval phrase documented | DONE_LOCAL | Phrase is planning-only and does not authorize OTP request or CSID request. |
| Production OTP/operator flow | BLOCKED | Requires production onboarding approval. |

## Compliance CSID Request Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Compliance CSID request plan endpoint exists | DONE_LOCAL | Planning-only, no-network, no CSID request. |
| Compliance CSID HTTP mapper exists | DONE_LOCAL | Redacted request/response summaries only. |
| Real sandbox HTTP adapter execution | BLOCKED | Adapter throws before network execution. |
| Legacy CSID body persistence risk identified | DONE_LOCAL | `requestComplianceCsid` can persist CSID body if an adapter succeeds; keep real use blocked. |
| Compliance CSID request executed in this task | NOT_APPLICABLE | No CSID request was made. |
| Compliance CSID execution approval | MANUAL_APPROVAL_REQUIRED | Future sandbox preflight only. |

## CSID Response Custody Guard Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Custody implementation plan exists | DONE_LOCAL | `CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md` defines the provider boundary and fail-closed sequence. |
| Custody guard script exists | DONE_LOCAL | `scripts/zatca-csid-response-custody-guard.cjs` uses Node core modules only and requires `--no-network`. |
| Custody guard test exists | DONE_LOCAL | `scripts/zatca-csid-response-custody-guard.test.cjs` covers no-network refusal, approval phrase behavior, redaction, strict mode, provider/model detection, and legacy PEM blocker detection. |
| Metadata-only simulation status | BLOCKED | Exact phrase plus `--simulate-metadata-only-response` returns `CUSTODY_METADATA_SIMULATION_BLOCKED`. |
| Real response body processed | NOT_APPLICABLE | False in the guard result. |
| DB connection/write attempted | NOT_APPLICABLE | False in the guard result. |
| Token/secret/certificate persisted | BLOCKED | False in the guard result; provider remains disabled. |
| Legacy raw PEM fields | BLOCKED | `privateKeyPem`, `complianceCsidPem`, and `productionCsidPem` must not receive real CSID response material. |

## Compliance Invoice Validation Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Local generated fixtures validated through SDK | DONE_LOCAL | Local no-network fixtures and dummy signing evidence exist. |
| Compliance invoice API request implemented | NOT_STARTED | Must wait for signed XML/custody design. |
| Compliance invoice checks executed against ZATCA | BLOCKED | No real ZATCA network calls are approved. |
| Signed XML produced with approved custody | BLOCKED | Current dummy material is test-only. |

## Production CSID Request Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Production CSID gap documented | DONE_LOCAL | Current blockers include production CSID lifecycle. |
| Production CSID request executed in this task | NOT_APPLICABLE | No production CSID request was made. |
| Production CSID endpoint implementation | BLOCKED | Current production request is not approved and not production-safe. |
| Production custody approval | BLOCKED | KMS/HSM/external signing decision required. |
| Production signing enablement | BLOCKED | Must remain false. |

## Certificate Renewal Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Renewal official doc inspected | DONE_LOCAL | `reference/zatca-docs/renewal.pdf`. |
| Certificate expiry metadata model partially exists | PLANNED | Metadata-only CSID custody record has `expiryKnown`, `expiresAt`, and `renewalRequired`; production lifecycle still missing. |
| Renewal workflow implemented | NOT_STARTED | Requires custody, approval, OTP handling, and rotation rules. |
| Renewal execution approval | MANUAL_APPROVAL_REQUIRED | Future phase only. |

## Certificate Revocation And Decommission Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Revocation lifecycle identified from official security docs | DONE_LOCAL | Security standard includes revocation lifecycle area. |
| Metadata record revocation exists for compliance CSID custody records | DONE_LOCAL | Revokes metadata only, not real certificates. |
| Real certificate revocation flow implemented | NOT_STARTED | Requires official process and provider integration. |
| EGS decommissioning workflow | NOT_STARTED | Must block signing/submission and preserve metadata. |
| Incident signing-disable runbook | PLANNED | Required before production signing. |

## Audit And Evidence Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Metadata-only evidence format exists | DONE_LOCAL | `ZATCA_SDK_VALIDATION_EVIDENCE_FORMAT.md`. |
| ZATCA audit evidence standard exists | DONE_LOCAL | `ZATCA_AUDIT_EVIDENCE_STANDARD.md`. |
| Private key/certificate/CSID/OTP body exposure allowed | BLOCKED | Forbidden by policy. |
| Approval actor/timestamp metadata required | PLANNED | Must be carried into future gates. |
| Full request/response body storage | BLOCKED | Forbidden in normal evidence/logging. |

## Secrets And Key Custody Readiness

| Item | Status | Notes |
| --- | --- | --- |
| Custody provider boundary exists | DONE_LOCAL | Disabled provider and mocked contracts exist. |
| Real secrets-manager/KMS provider implemented | NOT_STARTED | Future phase only. |
| Production KMS/HSM/external signing implemented | NOT_STARTED | Preferred production direction. |
| Raw DB PEM storage for production | BLOCKED | Not production-acceptable. |
| SDK dummy material as tenant credentials | BLOCKED | Test-only. |

## Sandbox-Only Approval Gate

| Item | Status | Notes |
| --- | --- | --- |
| Sandbox CSID runbook exists | DONE_LOCAL | Existing runbook documents no-execution boundary. |
| `ZATCA sandbox CSID preflight guard` created | DONE_LOCAL | Guard reports `PREFLIGHT_BLOCKED` and performs no OTP/CSID/network execution. |
| Sandbox OTP capture approval | MANUAL_APPROVAL_REQUIRED | Future explicit approval. |
| Sandbox compliance CSID execution | BLOCKED | No real call approved. |
| Sandbox evidence redaction checklist | PLANNED | Must be implemented before execution. |

## Production Gate

| Item | Status | Notes |
| --- | --- | --- |
| Production key custody approved | BLOCKED | KMS/HSM/external signing required. |
| Production CSID request approved | BLOCKED | Requires sandbox success and official reviews. |
| Production signing enabled | BLOCKED | Must remain false. |
| Clearance/reporting implemented | NOT_STARTED | Separate phase after signing/custody. |
| PDF-A3 implemented | NOT_STARTED | Separate phase. |
| Production compliance claim allowed | BLOCKED | Not allowed from current evidence. |

## Sandbox Execution Guard Update

| Item | Status | Notes |
| --- | --- | --- |
| Sandbox CSID request execution guard | DONE_LOCAL | `SANDBOX_CSID_REQUEST_EXECUTION_GUARD.md` documents the no-network control boundary. |
| Execution guard observed result | BLOCKED | `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`; launch remains refused. |
| Execute CSID request flag | BLOCKED | `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`. |
| OTP/CSID/network/adapter execution | BLOCKED | No OTP, CSID request, network call, or sandbox adapter execution occurred. |
| Secret/body exposure | BLOCKED | No env values, OTPs, tokens, secrets, request bodies, response bodies, certificate bodies, or private-key bodies exposed. |
| Completed adapter approval plan | DONE_LOCAL | `ZATCA sandbox adapter execution approval plan`. |
| Next step | PLANNED | `ZATCA sandbox adapter mock-to-real boundary test plan`. |
