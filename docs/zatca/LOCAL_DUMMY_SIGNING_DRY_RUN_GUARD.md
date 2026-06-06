# Local Dummy Signing Dry-Run Guard

Date: 2026-06-06

LedgerByte remains controlled beta/user-testing only. This guard creates a disabled-by-default local command plan for future dummy-material ZATCA signing experiments. It does not execute SDK signing, SDK QR generation, signed XML validation, CSID/OTP, real ZATCA network calls, clearance/reporting, PDF/A-3, or production compliance.

## 1. Purpose And Scope

The purpose is to prove that LedgerByte can inspect readiness for a future local dummy signing experiment without touching the execution path. The guard reports metadata only: local SDK/reference presence, Java compatibility, generated fixture path presence, dummy certificate/private-key path presence, documented SDK command shapes, blockers, and redaction flags.

## 2. Current Status

- Command: `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json`
- Current workstation default: blocked because Java 17 is outside the official SDK range.
- With Java 11-14 and all local references present, the guard remains blocked as `BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL`.
- If a future approval marker is present, this sprint still reports `BLOCKED_SIGNING_EXECUTION_DISABLED`.
- Exact approval phrase support is metadata-only: without the execution flag it returns `PLAN_ONLY_APPROVAL_RECOGNIZED`; with `--execute-approved-plan` it returns `BLOCKED_EXECUTION_NOT_IMPLEMENTED_IN_THIS_SPRINT`.
- Signing, QR generation, and signed XML validation are not executed.

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

## 4. Guard Behavior

- Requires `--no-network`.
- Supports `--plan`, `--json`, `--strict`, and `--fixture <fixtureId>`.
- Uses Node core modules only.
- Detects Java version and treats Java 11-14 as SDK-compatible metadata only.
- Treats Java 17 as unsupported for SDK execution.
- Detects SDK reference, launcher, JAR, config, usage, and readme presence.
- Detects generated fixture paths for `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note`.
- Detects SDK dummy certificate/private-key path presence without reading bodies.
- Detects whether `ZATCA_LOCAL_DUMMY_SIGNING_APPROVAL` is present without printing its value.
- Exits nonzero in `--strict` mode while blocked.

## 5. Planned Command Sequence

The guard reports placeholders only:

```text
fatoora -sign -invoice <temp-unsigned.xml> -signedInvoice <temp-signed.xml>
fatoora -qr -invoice <temp-signed.xml>
fatoora -validate -invoice <temp-signed.xml>
```

The hash command shape is also recorded as future metadata:

```text
fatoora -generateHash -invoice <temp-unsigned.xml>
```

None of these commands run in this sprint.

## 6. Blocked By Default

Blocked behavior includes:

- SDK signing execution.
- SDK QR execution.
- SDK signed XML validation execution.
- Signed XML generation or persistence.
- QR payload generation or persistence.
- CSID/OTP and ZATCA API behavior.
- Clearance/reporting, PDF/A-3, deploys, migrations, seed/reset/delete, and email.
- Production compliance claims.

## 7. Dummy Certificate And Private-Key Policy

The guard inspects only path and filename metadata for:

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem`

It does not read, print, copy, persist, upload, or return certificate/private-key body content. SDK dummy material is test-only reference material and must never be stored as LedgerByte tenant credentials.

## 8. Java And SDK Requirements

- Official SDK execution requires Java `>=11` and `<15`.
- `ZATCA_SDK_JAVA_BIN` may point to a Java 11-14 binary for future local metadata checks.
- Default Java 17 remains a blocker for SDK execution.
- The SDK reference is currently local/ignored and not CI-repeatable from a fresh checkout.

## 9. Fixture Requirements

The future experiment may use only sanitized generated fixtures:

- `ledgerbyte-generated-standard-invoice`
- `ledgerbyte-generated-credit-note`

The guard reports fixture path presence only. It does not read or print XML bodies.

## 10. Future Temp-File Policy

A future approved execution sprint must use OS temp directories only, deterministic sanitized filenames, no production/beta/customer data, cleanup by default, and metadata-only cleanup evidence. This sprint creates no temp XML, signed XML, QR, config, SDK runtime copy, or execution log.

## 11. Evidence And Redaction Policy

Allowed future evidence fields are metadata only: run ID, timestamp, fixture ID/type, SDK version, Java version, stage statuses, safe warning/error codes, no-network flag, production-compliance false, redaction flags, and cleanup status.

Forbidden evidence includes XML bodies, signed XML bodies, QR payload bodies, private keys, certificate bodies, OTPs, CSID material, tokens, auth headers, request/response bodies, customer/vendor payloads, attachment bodies, and unsafe raw SDK stdout/stderr.

## 12. Status And Blocker Taxonomy

- `BLOCKED_PENDING_DUMMY_SIGNING_APPROVAL`
- `BLOCKED_INVALID_APPROVAL_PHRASE`
- `BLOCKED_EXECUTION_NOT_IMPLEMENTED_IN_THIS_SPRINT`
- `BLOCKED_UNSUPPORTED_JAVA`
- `BLOCKED_MISSING_SDK_REFERENCE`
- `BLOCKED_MISSING_GENERATED_FIXTURE`
- `BLOCKED_DUMMY_MATERIAL_PATH_MISSING`
- `BLOCKED_SIGNING_EXECUTION_DISABLED`
- `PLAN_ONLY_APPROVAL_RECOGNIZED`
- `PLAN_ONLY_READY` is reserved for a future guard revision and is not returned while signing execution remains disabled.

## 12A. Approved Execution Plan Gate

The approved execution plan runbook is `docs/zatca/APPROVED_LOCAL_DUMMY_SIGNING_EXECUTION_PLAN.md`. The guard now accepts `--approval-phrase <text>` and `--execute-approved-plan` for planning-only tests. The exact approval phrase is recognized without enabling SDK signing, QR generation, signed XML validation, network calls, production compliance, or signed XML persistence.

## 13. Tests And Verification

Test command:

```bash
corepack pnpm test:zatca-local-dummy-signing-dry-run
```

The tests mock Java and temporary repositories. They do not require the real SDK, do not call ZATCA, do not run `fatoora`, and do not create signed XML.

## 14. Explicit Non-Changes

- No SDK signing execution.
- No SDK QR execution.
- No signed XML validation execution.
- No CSID/OTP or network call.
- No production signing implementation.
- No private-key or certificate body exposure.
- No signed XML or QR payload persistence.
- No PDF/A-3.
- No schema, migration, Vercel, or Supabase change.

## 15. Recommended Next Prompt

`ZATCA approved local dummy signing execution`
