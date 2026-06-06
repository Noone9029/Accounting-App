# ZATCA SDK Validation Evidence Format

Date: 2026-06-06

This standard defines metadata-only evidence for local/no-network official SDK validation runs. Evidence must not contain full XML bodies, QR payload bodies, private keys, tokens, headers, customer-sensitive payloads, or full SDK stdout/stderr.

## 2026-06-06 Custody Evidence Update

The key custody and CSID lifecycle evidence boundary is now documented in `KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`. Companion tracking docs are `CSID_LIFECYCLE_CHECKLIST.md` and `KEY_CUSTODY_DECISION_MATRIX.md`.

Evidence remains metadata-only. It must not contain private-key bodies, certificate bodies, CSID token/secret bodies, OTPs, CSR bodies, signed XML bodies, QR payload bodies, auth headers, or request/response bodies.

## Evidence Scope

Allowed:

- Run ID and timestamp.
- Local validation environment label.
- Java version.
- SDK presence and SDK version label when detectable.
- Fixture ID and fixture type.
- Invoice kind.
- Validation mode.
- Pass/fail/blocker status.
- Safe warning/error code summaries.
- Redaction flags.
- No-network and production-disabled flags.

Forbidden:

- Unsigned or signed XML bodies.
- QR payload bodies.
- Private keys or PEM material.
- Certificate bodies or PEM material.
- OTPs.
- CSID secret material.
- API credentials, auth tokens, and headers.
- Full ZATCA request/response bodies.
- Customer-sensitive payload bodies.

## Top-Level Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `validationRunId` | string | Yes | Stable ID for the local run. |
| `timestamp` | ISO string | Yes | Run timestamp. |
| `environment` | string | Yes | Must be `LOCAL_SDK_NO_NETWORK` for this sprint. |
| `validationMode` | string | Yes | Must be `OFFICIAL_SDK_VALIDATE_NO_NETWORK` for this wrapper. |
| `noNetworkOnly` | boolean | Yes | Must be `true`. |
| `sdkPathFound` | boolean | Yes | Presence metadata only. |
| `javaVersion` | string or null | Yes | Java version, not Java path. |
| `sdkVersion` | string or null | Yes | Version label from SDK JAR name if detectable. |
| `summary` | object | Yes | Counts by pass/fail/blocker. |
| `runs` | array | Yes | One entry per fixture. |
| `xmlBodyPrinted` | false | Yes | Must remain false. |
| `qrPayloadPrinted` | false | Yes | Must remain false. |
| `privateKeyPrinted` | false | Yes | Must remain false. |
| `networkCallsMade` | false | Yes | Must remain false. |
| `productionComplianceEnabled` | false | Yes | Must remain false. |

## Per-Fixture Fields

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `validationRunId` | string | Yes | Same run ID as top-level evidence. |
| `timestamp` | ISO string | Yes | Same timestamp as top-level evidence. |
| `environment` | string | Yes | `LOCAL_SDK_NO_NETWORK`. |
| `sdkPathFound` | boolean | Yes | No local absolute SDK path required. |
| `javaVersion` | string or null | Yes | Java version only. |
| `sdkVersion` | string or null | Yes | SDK version label if detectable. |
| `fixtureId` | string | Yes | Registry fixture ID. |
| `fixtureType` | string | Yes | Official or LedgerByte-generated category. |
| `invoiceKind` | string | Yes | Invoice, credit note, debit note, or related fixture kind. |
| `validationMode` | string | Yes | `OFFICIAL_SDK_VALIDATE_NO_NETWORK`. |
| `status` | string | Yes | `PASSED`, `FAILED`, or `BLOCKED`. |
| `passed` | boolean | Yes | True only when local SDK validation passes. |
| `validationAttempted` | boolean | Yes | False for safe blockers. |
| `sdkExitCode` | number or null | Yes | Null when blocked before execution. |
| `warningsCount` | number | Yes | Count of metadata-only warning records. |
| `errorsCount` | number | Yes | Count of metadata-only error/blocker records. |
| `safeErrorCodes` | string[] | Yes | Safe codes only, no body text. |
| `safeWarningCodes` | string[] | Yes | Safe codes only, no body text. |
| `hashGenerated` | false | Yes | This wrapper validates only; it does not generate hash evidence. |
| `xmlBodyPrinted` | false | Yes | Must remain false. |
| `qrPayloadPrinted` | false | Yes | Must remain false. |
| `privateKeyPrinted` | false | Yes | Must remain false. |
| `networkCallsMade` | false | Yes | Must remain false. |
| `realNetworkCallsEnabled` | false | Yes | Must remain false. |
| `signingEnabled` | false | Yes | Must remain false. |
| `clearanceReportingEnabled` | false | Yes | Must remain false. |
| `pdfA3Enabled` | false | Yes | Must remain false. |
| `blockers` | string[] | Yes | Safe blocker summaries. |
| `warnings` | string[] | Yes | Safe warning summaries. |

## Redaction Requirements

Evidence producers must:

- Sanitize SDK output before extracting safe codes.
- Drop full stdout/stderr from the persisted evidence format.
- Replace private key and credential-like strings before any local console output.
- Treat XML and QR payload bodies as forbidden even when fixtures contain only demo data.
- Record `networkCallsMade: false` only when the wrapper has not invoked any network operation.

## Sample

See `docs/zatca/evidence/sample-sdk-validation-evidence.json` for a sanitized example.

## 2026-06-06 Generated XML Fixture Evidence

Generated LedgerByte XML fixture validation evidence uses the same metadata-only format. The current generated-fixture evidence file is:

- `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`

Required generated-fixture additions:

- `fixtureId` must be either `ledgerbyte-generated-standard-invoice` or `ledgerbyte-generated-credit-note`.
- `fixtureType` must remain `ledgerbyte-generated`.
- `sourceCategory` may be represented by the registry entry rather than by XML content in evidence.
- `noNetworkOnly` must be `true`.
- `productionComplianceEnabled` must be `false`.
- Redaction flags for XML body, QR payload, private key, token, and headers must remain `false`.
- `safeErrorCodes` and `safeWarningCodes` may include rule IDs only; they must not include raw XML, raw QR data, customer/vendor payloads, request bodies, response bodies, or stdout/stderr bodies.

The 2026-06-06 evidence recorded both generated fixtures as `PASSED` under Java 11.0.26 and SDK `238-R3.4.8`. Default Java 17 remains unsupported for this SDK range and must produce a blocker instead of a false pass.

## 2026-06-06 SDK CI Readiness Guard Output

`corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json` emits readiness metadata, not validation evidence. It may record status, Java version, SDK reference presence/tracking, generated fixture path presence, package script presence, CI flags, blockers, warnings, and redaction booleans.

The guard output must remain metadata-only:

- `networkCallsMade` must be `false`.
- `sdkValidationExecuted` must be `false`.
- `productionComplianceEnabled`, `signingEnabled`, `clearanceReportingEnabled`, and `pdfA3Enabled` must be `false`.
- XML bodies, QR payloads, private keys, certificate bodies, tokens, headers, request/response bodies, customer/vendor payloads, and raw unsafe SDK stdout/stderr remain forbidden.
- CI artifact upload of metadata-only evidence is blocked until retention/redaction policy is approved.

## 2026-06-06 Local Signed XML Plan Output

`corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json` emits readiness and experiment-plan metadata only. It is not signed XML validation evidence because signing is not executed in this sprint.

Future local dummy signed XML validation evidence may record run ID, timestamp, fixture ID/type, SDK version, Java version, signing/QR/validation stage status, safe warning/error codes, cleanup status, no-network flag, production-compliance false, and redaction flags.

Future evidence must still omit XML bodies, signed XML bodies, QR payload bodies, private keys, certificate bodies, OTPs, CSID material, tokens, auth headers, request/response bodies, customer/vendor payloads, attachment bodies, and raw unsafe SDK stdout/stderr.

## 2026-06-06 Local Dummy Signing Dry-Run Guard Output

`corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json` emits command-plan metadata only. It records Java compatibility, SDK/reference presence, generated fixture path presence, SDK dummy certificate/private-key path presence, explicit approval-marker presence, and planned `fatoora -sign`, `-qr`, and `-validate` command shapes.

This output is still not signed XML validation evidence. It must keep `networkCallsMade=false`, `productionComplianceEnabled=false`, `signingExecutionEnabled=false`, `dummySigningAllowed=false`, `qrExecutionEnabled=false`, `signedValidationExecutionEnabled=false`, and all body redaction flags false. It must not include XML bodies, signed XML bodies, QR payload bodies, certificate/private-key bodies, approval-marker values, tokens, auth headers, request/response bodies, customer/vendor payloads, attachment bodies, or unsafe raw SDK stdout/stderr.

## 2026-06-06 Approved Dummy Signing Execution Plan Output

The approved execution plan runbook is still planning evidence, not signed XML validation evidence. The guard may report `PLAN_ONLY_APPROVAL_RECOGNIZED`, `BLOCKED_INVALID_APPROVAL_PHRASE`, or `BLOCKED_EXECUTION_NOT_IMPLEMENTED_IN_THIS_SPRINT` while keeping all execution flags false.

Approval-gate output must not echo the supplied approval phrase and must keep `productionComplianceEnabled=false`, `networkCallsMade=false`, `signingExecutionEnabled=false`, `qrExecutionEnabled=false`, and `signedValidationExecutionEnabled=false`. Future execution evidence remains metadata-only and must never persist unsigned XML, signed XML, QR payload, private-key body, certificate body, OTP, CSID material, token, auth header, request/response body, customer/vendor payload, attachment body, or unsafe raw SDK stdout/stderr.

## 2026-06-06 Approved Dummy Signing Execution Evidence

The approved local dummy-material evidence file is:

- `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`

Allowed fields include run ID, timestamp, `LOCAL_DUMMY_SIGNING_NO_NETWORK` environment, no-network booleans, production-compliance false, SDK version, Java version, approval-match boolean, fixture counts, fixture IDs, fixture type, invoice kind, relative source path, sign/QR/validate stage statuses, SDK exit codes by stage, safe warning/error codes, blockers, temp workspace and cleanup status, and redaction flags.

The evidence must not include XML bodies, signed XML bodies, QR payload bodies, private-key bodies, certificate bodies, OTPs, CSID material, auth tokens, auth headers, request/response bodies, customer/vendor payloads, attachment bodies, or unsafe raw SDK stdout/stderr.

## 2026-06-06 Dummy Signing Review Evidence Check

`docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md` records the review of `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`. The review checked approval, environment, no-network, production-compliance false, fixture counts, fixture IDs, stage statuses, exit codes, cleanup status, persistence flags, raw stdout/stderr persistence flags, and redaction flags.

The review task did not create new execution evidence and did not run SDK sign, QR, validate, or hash commands. `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md` documents remaining QR/signing gaps without storing XML, signed XML, QR, key, certificate, token, header, request/response, customer/vendor, or attachment bodies.
