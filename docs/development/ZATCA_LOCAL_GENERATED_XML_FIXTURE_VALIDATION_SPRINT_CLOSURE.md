# ZATCA Local Generated XML Fixture Validation Sprint Closure

Date: 2026-06-06

LedgerByte remains controlled beta/user-testing only. This sprint is local/no-network ZATCA preparation. It does not sign XML, request OTPs or CSIDs, call ZATCA, clear/report invoices, generate PDF/A-3, use production credentials, send email, deploy, mutate production/beta data, or claim production compliance.

## Repo Reconciliation

- `git log -1 --oneline`: `704aa1d5 feat: add Sales AR and purchase matching workflows`.
- The expected previous local SDK validation pipeline files were present: `scripts/zatca-sdk-validate-local.cjs`, `scripts/zatca-sdk-validate-local-lib.cjs`, `scripts/zatca-sdk-validate-local.test.cjs`, registry/evidence docs, evidence directory, sample evidence JSON, and prior closure doc.
- `package.json` included `zatca:sdk-validate-local`.
- `docs/zatca/evidence` existed.
- `CODEX_HANDOFF.md` and ZATCA docs mentioned the previous SDK validation sprint.
- Nuance: the previous SDK pipeline files were present in the worktree but not all were part of the latest inspected commit. Because the requested stop condition was missing files, implementation continued.

## Official References Inspected

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

## Java And SDK Runner Status

- Default Java detected: OpenJDK 17.0.16, unsupported for the official SDK range.
- Supported local Java detected: Java 11.0.26.
- Runner decision: use `ZATCA_SDK_JAVA_BIN` for explicit Java 11-14 selection and keep global Java unchanged.
- Docker was available but not used because the Java 11 path plus isolated temporary no-space SDK launcher workspace was sufficient.
- The wrapper stages the official launcher/JAR into a temp no-space directory and writes a temporary config pointing back to the repo-local official SDK reference files. It cleans the temp workspace after execution.

## Generated Fixtures

- `ledgerbyte-generated-standard-invoice`
  - Input: `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.input.json`
  - XML snapshot: `packages/zatca-core/fixtures/ledgerbyte-generated-standard-invoice.expected.xml`
  - Result: generated locally from sanitized demo data and passed SDK local/no-network validation under Java 11.0.26.
- `ledgerbyte-generated-credit-note`
  - Input: `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.input.json`
  - XML snapshot: `packages/zatca-core/fixtures/ledgerbyte-generated-credit-note.expected.xml`
  - Result: generated locally from sanitized demo data, references `LB-GEN-STD-0001`, and passed SDK local/no-network validation under Java 11.0.26.

The XML snapshots are committed as deterministic local regression fixtures under the existing `packages/zatca-core/fixtures` policy. XML bodies remain forbidden in evidence, public docs, API responses, and logs.

## Evidence

- Evidence file: `docs/zatca/evidence/generated-xml-fixture-validation-20260606.json`.
- Evidence status: both generated fixtures `PASSED`.
- SDK version label: `238-R3.4.8`.
- Java version label: `11.0.26`.
- No-network guarantee: `noNetworkOnly=true`, `networkCallsMade=false`.
- Redaction guarantee: evidence flags show XML body, QR payload, private key, token, and header output remain false.
- Production compliance: false.

## Readiness API And UI

- Read-only readiness metadata now includes `generatedStandardInvoiceFixtureStatus`, `generatedCreditNoteFixtureStatus`, `lastGeneratedFixtureEvidenceStatus`, `generatedFixtureJavaBlocker`, `generatedFixtureNoNetworkOnly`, and `generatedFixtureProductionCompliance`.
- The ZATCA settings UI shows safe local-preparation wording and does not expose XML bodies or claim compliance.

## Commands Run

- `git status --short`
- `git log -1 --oneline`
- Java version checks and Java path discovery
- Docker version check
- Official reference inspection from repo-local `reference/`
- `node --check scripts/generate-zatca-local-xml-fixtures.cjs`
- `node --check scripts/zatca-sdk-validate-local-lib.cjs`
- `node --check scripts/zatca-sdk-validate-local.cjs`
- `corepack pnpm --filter @ledgerbyte/zatca-core build`
- `corepack pnpm zatca:generate-local-xml-fixtures`
- `corepack pnpm --filter @ledgerbyte/zatca-core test`
- `corepack pnpm zatca:sdk-validate-local -- --all --no-network --json` with default Java 17, which safely blocked validation
- `corepack pnpm zatca:sdk-validate-local -- --fixture ledgerbyte-generated-standard-invoice --fixture ledgerbyte-generated-credit-note --no-network --json --out docs/zatca/evidence/generated-xml-fixture-validation-20260606.json` with Java 11.0.26
- Targeted individual generated fixture validation with Java 11.0.26
- `corepack pnpm zatca:sdk-validate-local -- --all --no-network --json` with Java 11.0.26

## Commands Skipped

- Full E2E and full smoke, because this sprint only changed targeted ZATCA fixture/wrapper/readiness surfaces.
- Migrations, seed/reset/delete, backup/restore, and destructive cleanup, because no schema or data mutation was required.
- Real ZATCA network, OTP/CSID request, signing, clearance/reporting, PDF/A-3, and real email, because they are out of scope and explicitly blocked.
- Deployment and Vercel/Supabase setting changes, because this sprint is local-only.

## Remaining Blockers

- Key custody decision.
- Sandbox OTP and CSID.
- Signing.
- Phase 2 QR.
- Clearance/reporting.
- PDF/A-3.
- Retry/error queue.
- Production secure signed artifact storage.
- Official reviews.
- Repeatable SDK CI.

## Next Recommended Prompt

`ZATCA next sprint: design a repeatable no-network SDK CI runner or a local signed XML validation plan, while keeping signing, CSID, network, clearance/reporting, PDF/A-3, and production compliance disabled unless explicitly approved.`
