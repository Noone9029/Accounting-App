# Local Signed XML Validation Plan

Date: 2026-06-06

LedgerByte remains controlled beta/user-testing only. This plan defines the proof gates required before any future local dummy-material signed XML validation experiment. This sprint does not execute signing, does not request OTP/CSID, does not call ZATCA, does not generate Phase 2 QR, does not clear/report invoices, does not create PDF/A-3, and does not claim production compliance.

## 1. Purpose And Scope

The purpose is to define a safe local/no-network path for a future dummy-material signing experiment using only official repo-local ZATCA references. The output of this sprint is planning, metadata, and guardrail tests only.

Actual XML signing remains disabled. SDK dummy keys/certificates may only be used in an isolated local temp experiment after explicit approval. Dummy material must never be stored as tenant credentials.

## 2. Current State

- Latest commit inspected for the dummy-signing guard sprint: `b94fd07f Plan ZATCA local signed XML validation`.
- Repository reconciliation: expected SDK CI readiness docs/scripts and the existing signing/Phase 2 QR plan were present.
- Worktree status: unrelated dirty/untracked inventory, marketing, and graphify files existed before this sprint and are intentionally out of scope.
- Generated fixtures `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note` already passed local/no-network SDK validation under Java 11.0.26.
- Default Java 17 remains unsupported for SDK execution and must safely block.
- SDK CI readiness remains blocked because `reference/` is ignored and not available from a fresh checkout.

## 3. Official References Inspected

Official SDK files:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/` path/file-name metadata only
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/` path/file-name metadata only
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

## 4. Signing Command Findings

- The SDK usage/readme document `fatoora -sign -invoice <filename> -signedInvoice <filename>`.
- The SDK readme describes `-signedInvoice` as the signed invoice output file option.
- The SDK config references schema, Schematron, certificate, private-key, PIH, input, and usage paths.
- The SDK readme states Java must be `>=11` and `<15`.
- This plan does not execute `fatoora -sign`.

## 5. QR Command Findings

- The SDK usage/readme document `fatoora -qr -invoice <filename>`.
- QR generation depends on the private key and certificate configured for the SDK.
- The security features standard defines Phase 2 QR TLV tags beyond basic tags 1-5: tag 6 XML hash, tag 7 ECDSA signature of the XML hash, tag 8 ECDSA public key, and tag 9 ZATCA technical CA signature for simplified invoices and associated notes.
- No Phase 2 QR should be claimed complete until signing and certificate behavior are verified against the SDK.
- This plan does not execute `fatoora -qr`.

## 6. Dummy Certificate And Private-Key Policy

- The SDK contains `Data/Certificates/cert.pem` and `Data/Certificates/ec-secp256k1-priv-key.pem` as local reference files.
- The SDK readme identifies the provided certificate and private key as dummy and for testing purposes only.
- This sprint inspected only certificate/private-key path and file-name metadata. It did not read, copy, print, persist, or expose certificate/private-key body content.
- Dummy material must never be stored as tenant credentials, uploaded as evidence, committed outside the official ignored reference folder, or used to imply production readiness.

## 7. Required Readiness Gates

Before any future local dummy signing experiment:

- Explicit user approval for a temp-only dummy signing dry-run must exist in that future sprint.
- Java must be explicitly Java 11-14 through `ZATCA_SDK_JAVA_BIN` or an approved isolated runner; Java 17 remains blocked.
- The local official SDK reference must be present.
- Generated sanitized fixtures must be present and current.
- The experiment must use a temporary working directory and delete temp XML, signed XML, QR, config, and SDK runtime copies by default.
- No production/beta/customer data may be used.
- No CSID/OTP, ZATCA network, clearance/reporting, PDF/A-3, deploy, migration, seed, reset, delete, or email command may run.
- Evidence must be metadata-only.

## 8. Locally Testable Without Network

A future approved local dummy experiment may test only:

- Whether the official SDK can sign sanitized generated fixture XML using SDK dummy material in a temp directory.
- Whether the SDK can generate QR metadata from the temp signed XML.
- Whether the SDK can validate the temp signed XML locally.
- Whether metadata-only evidence can record fixture ID, command stage, Java version, SDK version, safe status, safe error/warning codes, cleanup status, and redaction flags.

## 9. Not Testable Without CSID Or Sandbox

The following remain outside local dummy signing:

- Real compliance CSID or production CSID issuance.
- Real certificate trust, revocation, renewal, and authentication behavior.
- Real ZATCA clearance/reporting acceptance.
- Real API headers, request/response payloads, or endpoint behavior.
- Production Phase 2 QR validity.
- Legal or production compliance.

## 10. Must Not Be Implemented Yet

- Production signing.
- CSID/OTP requests.
- Real ZATCA network calls.
- Clearance/reporting.
- PDF/A-3.
- Phase 2 QR completion claims.
- Signed XML storage or upload.
- Private key or certificate body persistence.
- Production credentials or production compliance claims.

## 11. Proposed Future Local Experiment Design

In a future sprint titled `ZATCA local dummy signing dry-run guard`:

1. Keep execution disabled by default.
2. Add an explicit local-only approval gate.
3. Copy only required SDK runtime/config files into an isolated temp directory.
4. Write sanitized generated fixture XML to temp files only.
5. Run the official SDK sign command only after approval and Java/SDK readiness pass.
6. Run SDK QR and validation only against the temp signed output.
7. Extract metadata-only status and safe codes.
8. Delete temp outputs by default.
9. Persist no XML body, signed XML body, QR payload body, private key body, certificate body, token, header, customer/vendor payload, or raw unsafe stdout/stderr.

## 12. Future Evidence Format

Future signed XML validation evidence may include:

- `runId`
- `timestamp`
- `fixtureId`
- `fixtureType`
- `sourceCategory`
- `sdkVersion`
- `javaVersion`
- `signingStageStatus`
- `qrStageStatus`
- `validationStatus`
- `safeWarningCodes`
- `safeErrorCodes`
- `noNetworkOnly: true`
- `networkCallsMade: false`
- `productionCompliance: false`
- `redaction` flags
- `tempCleanupStatus`

Evidence must not include XML bodies, signed XML bodies, QR payload bodies, private keys, certificate bodies, OTPs, CSID material, auth tokens, headers, request/response bodies, customer/vendor payloads, attachment bodies, or unsafe raw SDK stdout/stderr.

## 13. Redaction Rules

- XML body printed: false.
- Signed XML body printed: false.
- QR payload printed: false.
- Private key printed: false.
- Certificate body printed: false.
- Token/header printed: false.
- Request/response body printed: false.
- Customer/vendor payload printed: false.

## 14. Temp-File And Cleanup Rules

- Use OS temp directories only.
- Use sanitized deterministic file names without invoice/customer names.
- Restrict temp files to unsigned fixture XML, signed XML output, generated QR output, temp SDK config, and safe execution logs.
- Delete temp files by default.
- If cleanup fails, evidence may record cleanup failure metadata only and must not print paths containing secrets or body content.

## 15. Artifact Retention Rules

- Do not commit signed XML.
- Do not upload XML bodies or signed XML bodies as CI artifacts.
- Do not persist QR payload bodies.
- Metadata-only evidence may be persisted only after redaction is proven.
- CI artifact upload remains blocked until retention/redaction policy is approved.

## 16. Risks And Blockers

- Signing execution is disabled by policy in this sprint.
- Default Java 17 is unsupported.
- The official SDK is local/ignored and not CI-repeatable from a fresh checkout.
- Dummy SDK material is test-only and cannot stand in for CSID/certificate lifecycle.
- Key custody/KMS/HSM design remains unresolved.
- Real CSID/OTP, clearance/reporting, PDF/A-3, retry/error queue, signed artifact storage, and official review remain blockers.

## 17. Future Acceptance Criteria

A future local dummy signing experiment can be accepted only if:

- It uses official SDK/reference material only.
- It requires `--no-network`.
- It defaults to blocked unless explicit local approval is provided.
- It uses Java 11-14 only.
- It signs only sanitized generated fixtures in temp storage.
- It produces metadata-only evidence.
- It deletes temp outputs by default.
- It proves no signing, QR, XML, certificate, key, token, header, request/response, customer/vendor, or attachment body leaks into stdout, logs, docs, evidence, commits, or artifacts.
- It still makes no production compliance claim.

## 18. Local Dummy Signing Guard Update

The follow-on guard now exists:

```bash
corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json
```

It plans the future SDK sign, QR, and signed validation command sequence but keeps `signingExecutionEnabled=false`, `dummySigningAllowed=false`, `qrExecutionEnabled=false`, `signedValidationExecutionEnabled=false`, `productionCompliance=false`, and evidence body policy metadata-only. It reads no certificate/private-key bodies and creates no signed XML.

## 19. Recommended Next Prompt

`ZATCA approved local dummy signing execution`

## 20. Approved Execution Plan Update

The follow-on approved execution runbook now exists at `docs/zatca/APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md`. It defines the exact future approval phrase, fixture scope, temp-only command sequence, metadata-only evidence shape, cleanup policy, and failure behavior for a later local dummy-material signing sprint. The current sprint still executed no SDK signing, QR generation, signed XML validation, CSID/OTP, ZATCA network call, clearance/reporting, PDF/A-3, or production compliance behavior.
