# Local Dummy Signing Execution Results

LedgerByte remains controlled beta/user-testing only. This result records one approved local/no-network ZATCA SDK dummy-material experiment against sanitized generated fixtures. It is not production signing, ZATCA compliance, CSID onboarding, clearance/reporting, PDF/A-3 readiness, or signed artifact storage readiness.

## Purpose

Prove that the official repo-local SDK can sign, generate QR, and validate sanitized local LedgerByte fixture XML in an isolated temp workspace with Java 11-14 and metadata-only evidence.

## Approval Phrase Used

`I approve ZATCA local dummy signing execution against sanitized local fixtures only. No production, no beta, no customer data, no ZATCA network, no CSID, no OTP, no clearance, no reporting, no PDF-A3, and metadata-only evidence.`

The phrase matched the approved runbook exactly.

## Official References Inspected

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
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`

## Fixtures Attempted

- `ledgerbyte-generated-standard-invoice`
- `ledgerbyte-generated-credit-note`

Both sources were sanitized local generated fixture snapshots under `packages/zatca-core/fixtures/`.

## Java And SDK Readiness

- SDK version: `238-R3.4.8`.
- Execution Java: explicit `ZATCA_SDK_JAVA_BIN` resolving to Java `11.0.26`.
- Default Java 17 remains unsupported and is not used for SDK execution.
- SDK reference is available locally under ignored `reference/`; this still does not make CI ready from a fresh checkout.

## Stage Results

| Fixture | Sign | QR | Signed XML validation | Exit codes |
| --- | --- | --- | --- | --- |
| `ledgerbyte-generated-standard-invoice` | `PASSED` | `PASSED` | `PASSED` | sign `0`, QR `0`, validate `0` |
| `ledgerbyte-generated-credit-note` | `PASSED` | `PASSED` | `PASSED` | sign `0`, QR `0`, validate `0` |

Run status: `PASSED_LOCAL_DUMMY_SIGNING`.

## Evidence File

- `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`

Evidence is metadata-only. It records run ID, timestamp, SDK version, Java version, fixture IDs, stage statuses, exit codes, counts, cleanup status, no-network flags, production-compliance false, and redaction flags.

## Cleanup Result

- Temp workspace created: yes.
- Temp unsigned XML, signed XML, SDK runtime/config copies, and local execution workspace cleanup: `SUCCESS`.
- Signed XML was generated only inside temp execution and was deleted by default.
- No signed XML body was committed or persisted as evidence.

## Redaction Result

Evidence and docs do not include XML bodies, signed XML bodies, QR payload bodies, private-key bodies, certificate bodies, OTPs, CSID material, auth tokens, auth headers, full request/response bodies, customer/vendor payloads, attachment bodies, or unsafe raw SDK stdout/stderr.

Certificate and private-key files were inspected by path/filename metadata only. The SDK used its dummy material through temp SDK config during the approved local run; body content was not manually read, copied into app storage, printed, logged, or persisted.

## What Success Means

The official local SDK can process the two sanitized LedgerByte-generated fixtures through dummy-material sign, QR, and signed XML validation stages under Java 11.0.26 without network calls and with metadata-only evidence.

## What Success Does Not Mean

This does not prove production signing, Phase 2 QR production correctness, sandbox acceptance, CSID issuance, clearance/reporting readiness, PDF/A-3 readiness, signed artifact storage readiness, hosted/customer-data behavior, or ZATCA compliance.

## Remaining Blockers

- Key custody decision.
- Sandbox OTP/CSID.
- Real signing credentials and certificate lifecycle.
- Phase 2 QR production proof.
- Clearance/reporting.
- PDF/A-3.
- Retry/error queue.
- Production signed-artifact storage.
- Official/legal/accounting reviews.
- Repeatable SDK CI with approved SDK reference policy.

## Commands Run

- `git status --short`
- `git log -1 --oneline`
- `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe -version`
- `node --check scripts/zatca-local-dummy-signing-dry-run.cjs`
- `node --test scripts/zatca-local-dummy-signing-dry-run.test.cjs`
- `corepack pnpm test:zatca-local-dummy-signing-dry-run`
- `corepack pnpm test:zatca-local-signed-xml-plan`
- `corepack pnpm test:zatca-sdk-ci-readiness`
- `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json`
- `corepack pnpm zatca:local-dummy-signing-dry-run -- --plan --no-network --json --approval-phrase <approved phrase>`
- `corepack pnpm zatca:local-dummy-signing-dry-run -- --execute-approved-plan --no-network --json --fixture ledgerbyte-generated-standard-invoice --fixture ledgerbyte-generated-credit-note --approval-phrase <approved phrase> --out docs/zatca/evidence/local-dummy-signing-execution-20260606.json`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json ok')"`
- Evidence forbidden-body marker scan.
- `git diff --check`
- `git diff --cached --check`

## Commands Skipped

- Real ZATCA network calls, OTP/CSID requests, clearance/reporting, PDF/A-3, production signing, production credential use, E2E, smoke, migrations, seed/reset/delete, deploys, environment changes, email, backup/restore, production checks, and login/audit-writing flows.

## Recommended Next Prompt

`ZATCA dummy signing result review and Phase 2 QR gap analysis`
