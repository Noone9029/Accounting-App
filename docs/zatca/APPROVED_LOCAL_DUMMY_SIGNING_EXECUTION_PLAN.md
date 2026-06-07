# Approved Local Dummy Signing Execution Plan

Date: 2026-06-06

LedgerByte remains controlled beta/user-testing only. This runbook defines the approval-gated future execution plan for one local dummy-material ZATCA signing experiment against sanitized local fixtures. This current task does not execute signing, QR generation, signed XML validation, CSID/OTP, ZATCA network calls, clearance/reporting, PDF/A-3, or production compliance behavior.

## 1. Purpose And Scope

The purpose is to define the exact launch checklist for a later local dummy-signing execution sprint. It covers preconditions, approval wording, planned temp-only commands, metadata-only evidence, cleanup, blockers, and success limits.

This plan uses only official repo-local ZATCA reference material under `reference/` and existing sanitized LedgerByte fixtures. It does not authorize production signing, sandbox onboarding, CSID/OTP requests, real ZATCA submission, or signed artifact storage.

## 2. Current State

- Latest commit inspected: `a3da6b5b Guard ZATCA dummy signing dry run`.
- Repository reconciliation: expected dummy-signing guard script, tests, ZATCA docs, package scripts, and handoff file were present.
- Existing command: `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json`.
- Default workstation Java 17 remains unsupported for SDK execution.
- Java 11-14 is required for any future SDK execution and must be supplied explicitly, for example by `ZATCA_SDK_JAVA_BIN`.
- SDK signing executed in this task: no.
- SDK QR executed in this task: no.
- Signed XML validation executed in this task: no.
- Network calls made in this task: no.
- Private-key/certificate bodies inspected or exposed in this task: no.

## 3. Official References Inspected

Official SDK files:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/` path and filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/` path and filename metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/CEN-EN16931-UBL.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonExtensionComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-CommonSignatureComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureAggregateComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-SignatureBasicComponents-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd`

Official ZATCA docs:

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`

## 4. Non-Negotiable Safety Boundaries

- No production, beta, hosted, or customer data.
- No real ZATCA network call.
- No OTP or CSID request.
- No production credentials.
- No clearance/reporting.
- No PDF/A-3.
- No production compliance claim.
- No signed XML body, QR payload body, private key, certificate body, token, auth header, request/response body, customer/vendor payload, or attachment body in stdout, docs, commits, evidence, logs, or artifacts.

## 5. Exact Future Approval Phrase

The future execution sprint must include this exact phrase before any execution implementation may run:

```text
I approve ZATCA local dummy signing execution against sanitized local fixtures only. No production, no beta, no customer data, no ZATCA network, no CSID, no OTP, no clearance, no reporting, no PDF-A3, and metadata-only evidence.
```

The phrase is for a future separate sprint only. This runbook and guard update recognize it as planning metadata; they do not execute signing.

## 6. Preconditions For Execution

- Run only in a local environment.
- Require `--no-network`.
- Use an explicit Java 11-14 binary path; do not rely on default Java 17.
- Confirm the local official SDK reference is present.
- Confirm generated sanitized fixtures are present.
- Use a temp workspace only.
- Use no production/beta/customer data.
- Use no CSID/OTP.
- Persist no signed XML.
- Produce metadata-only evidence.
- Confirm private-key/certificate bodies are not read, printed, copied into app storage, or exposed.

## 7. Exact Fixture Scope

Only these sanitized generated fixtures are in scope:

- `ledgerbyte-generated-standard-invoice`
- `ledgerbyte-generated-credit-note`

No other invoice, customer, vendor, hosted, beta, or production record is in scope.

## 8. Future Execution Sequence

1. Run the preflight guard with `--no-network`.
2. Verify exact approval phrase and future execution flag in that separate sprint.
3. Create an OS temp workspace.
4. Write sanitized unsigned fixture XML to temp only.
5. Run SDK sign against temp unsigned XML.
6. Run SDK QR against temp signed XML.
7. Run SDK validate against temp signed XML.
8. Parse only safe status, warning codes, and error codes.
9. Delete temp unsigned XML, signed XML, QR output, config/runtime copies, and logs by default.
10. Write metadata-only evidence.

## 9. Exact Planned Commands

```text
fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>
fatoora -qr -invoice <temp-signed.xml>
fatoora -validate -invoice <temp-signed.xml>
```

Hash metadata may be checked only if the future sprint explicitly needs it and still keeps bodies out of evidence:

```text
fatoora -generateHash -invoice <temp-unsigned.xml>
```

## 10. Evidence Format

Future evidence may include:

- `runId`
- `timestamp`
- `fixtureId`
- `fixtureType`
- `sdkVersion`
- `javaVersion`
- `signingStageStatus`
- `qrStageStatus`
- `signedValidationStatus`
- `safeWarningCodes`
- `safeErrorCodes`
- `noNetworkOnly: true`
- `networkCallsMade: false`
- `productionCompliance: false`
- `redaction`
- `tempCleanupStatus`

Future evidence must be metadata-only and must not persist raw SDK stdout/stderr if it can contain payloads.

## 11. Redaction Policy

- XML body printed/persisted: false.
- Signed XML body printed/persisted: false.
- QR payload body printed/persisted: false.
- Private key printed/read/persisted: false.
- Certificate body printed/read/persisted: false.
- OTP/CSID/token/header printed/persisted: false.
- Request/response body printed/persisted: false.
- Customer/vendor payload printed/persisted: false.

## 12. Temp Cleanup Policy

- Use OS temp directories only.
- Use deterministic sanitized filenames.
- Delete temp unsigned XML, signed XML, QR output, config/runtime copies, and logs by default.
- Evidence may record cleanup status and safe counts only.
- If cleanup fails, evidence must not reveal body content or sensitive path content.

## 13. Failure And Rollback Behavior

- On any preflight blocker, stop before SDK execution.
- On any SDK stage failure in the future sprint, stop subsequent stages unless the runbook explicitly permits metadata-only continuation.
- Delete temp outputs by default after failure.
- Record safe status/codes and cleanup metadata only.
- Do not retry with production credentials, CSID material, hosted data, or network.

## 14. What Success Means

Success in the future sprint would mean the local SDK could sign, generate QR, and validate sanitized temp fixtures with SDK dummy material under Java 11-14, with no network and metadata-only evidence.

## 15. What Success Does Not Mean

Success would not mean ZATCA production compliance, sandbox acceptance, CSID issuance, production certificate validity, production Phase 2 QR validity, clearance/reporting readiness, PDF/A-3 readiness, or safe signed-artifact storage readiness.

Dummy signed XML must never be treated as production-valid.

## 16. What Remains Blocked After Success

- Key custody and production certificate handling.
- Sandbox OTP/CSID.
- Real signing credentials.
- Phase 2 QR production proof.
- Clearance/reporting.
- PDF/A-3.
- Retry/error queue.
- Production signed-artifact storage.
- Official/legal/accounting reviews.
- Repeatable SDK CI with approved reference policy.

## 17. Required Tests Before Future Execution

- Exact approval phrase recognition.
- Incorrect approval phrase blocking.
- Java 17 blocking.
- Java 11-14 metadata readiness.
- SDK reference path presence.
- Fixture path presence.
- Dummy certificate/private-key path-only detection.
- No SDK command execution without future approval and implementation.
- No XML, signed XML, QR, private-key, certificate, token, header, request/response, customer/vendor, or attachment body output.
- Temp cleanup success/failure metadata only.

## 18. Recommended Next Prompt

`ZATCA approved local dummy signing execution`

## 19. Execution Result Update

The approved execution sprint has now run once locally against `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note` using explicit Java `11.0.26` through `ZATCA_SDK_JAVA_BIN` and SDK `238-R3.4.8`.

Result: `PASSED_LOCAL_DUMMY_SIGNING`. SDK sign, QR, and signed XML validation stages passed for both sanitized fixtures with exit code `0`. The run used temp files, no network calls, metadata-only evidence, and cleanup by default.

Evidence: `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`.

This result still does not mean production signing, Phase 2 QR production correctness, CSID onboarding, clearance/reporting, PDF/A-3 readiness, signed artifact storage readiness, hosted/customer-data proof, or ZATCA compliance.

Next prompt: `ZATCA dummy signing result review and Phase 2 QR gap analysis`

## 20. Result Review And QR Gap Follow-Up

The follow-up review is complete:

- Evidence review: `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md`.
- Phase 2 QR gap analysis: `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md`.

The local dummy execution result remains useful local SDK evidence only. Production key custody, CSID lifecycle, production signing, Phase 2 QR production proof, clearance/reporting, PDF/A-3, signed artifact storage, repeatable SDK CI, and production compliance remain blocked.
