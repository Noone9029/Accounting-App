# ZATCA SDK Usage Plan

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

## Current SDK Hash Mode Update

LedgerByte now has a local-only persistence path for SDK-generated invoice hashes, but it is intentionally not the default:

- `ZatcaEgsUnit.hashMode` defaults to `LOCAL_DETERMINISTIC`.
- `SDK_GENERATED` can be enabled only through the admin endpoint on a fresh EGS unit after SDK execution/readiness passes.
- Existing EGS units with invoice metadata are blocked from in-place migration; create a new EGS unit for SDK hash mode.
- `ZatcaInvoiceMetadata.hashModeSnapshot` records the mode used when metadata is generated.
- SDK mode persists `fatoora -generateHash -invoice <filename>` output only; it still does not sign, submit, request CSIDs, clear/report, or embed XML in PDF/A-3.

The local SDK bundle is `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.

## SDK Summary

| Item | Finding |
| --- | --- |
| SDK language/runtime | Java CLI/JAR. |
| Primary executable | `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Apps/fatoora` and `Apps/fatoora.bat`, backed by `Apps/zatca-einvoicing-sdk-238-R3.4.8.jar`. |
| Java requirement from SDK readme | Java >=11 and <15. Default local Java is 17.0.16, but Java 11.0.26 was found under `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe` and was used for fixture validation without changing global Java. |
| License | `LICENSE.txt` is LGPL v3. Legal review is needed before bundling or linking the SDK in distributed software. |
| Validates XML | Yes, SDK readme documents `fatoora -validate -invoice <filename>`. |
| Signs invoices | Yes, SDK readme documents `fatoora -sign -invoice <filename> -signedInvoice <filename>`. Do not integrate signing yet. |
| Generates invoice hash | Yes, SDK readme documents `fatoora -generateHash -invoice <filename>`. |
| Generates QR | Yes, SDK readme documents `fatoora -qr -invoice <filename>`. |
| Generates CSR/private key | Yes, SDK readme documents `fatoora -csr -csrConfig <filename> ...`. |
| Generates API request JSON | Yes, SDK readme documents invoice API request generation. |
| Includes sample XML | Yes, standard/simplified invoices, credit notes, debit notes, and scenario samples. |
| Includes schemas/rules | Yes, UBL 2.1 XSDs and ZATCA/EN16931 Schematron XSL files. |
| Includes sample PDF/A-3 | Yes, PDF samples are under `Data/Samples/PDF-A3`. |

## Local Execution Findings

- Running without `SDK_CONFIG` returned a configuration null-pointer error from `Config.readResourcesPaths`.
- Running the Windows launcher initially failed because `jq` was not on `PATH`.
- Running the launcher from `E:\Accounting App` can fail because paths derived from the checkout are not fully quoted and the space can split the path.
- Running from a no-space temporary SDK copy with Java 11, `SDK_CONFIG`, `FATOORA_HOME`, and the SDK `Apps` folder on `PATH` successfully validated official fixtures.
- Direct JAR validation was not equivalent to the official launcher for the simplified invoice sample; it reported QR/signature failures while `fatoora.bat -validate -invoice` passed. Prefer the official launcher.
- The SDK readme identifies bundled certificate/private-key files as dummy/testing material. They must never be loaded into LedgerByte tenant state or logs.

## Node/NestJS Integration Options

| Option | Practicality | Notes |
| --- | --- | --- |
| Direct Java library import | Not practical | The SDK is distributed as a CLI/JAR, not a TypeScript package. Direct integration would increase coupling and licensing/upgrade risk. |
| CLI wrapper with `child_process` | Practical later | Best first integration path for test-only validation/hash/sign experiments. Use temporary directories, explicit timeouts, redacted logs, and a pinned Java runtime. |
| Docker wrapper | Recommended for repeatable validation | Avoids local Java-version drift and path-with-space script issues. Good for CI validation jobs and future controlled sandbox tooling. |
| Copy XSD/XSL validation into Node | Practical for schema/Schematron only | Could validate XML structure without signing, but must still compare to SDK output before trusting results. |
| In-process signing implementation | Not now | Requires key custody, canonicalization, certificate handling, XAdES/XMLDSig correctness, and official validation fixtures. |

## Recommended Safe Approach

1. Keep the current LedgerByte runtime in mock mode with real network calls disabled.
2. Build a test-only SDK wrapper that runs in a temporary directory and never writes tenant secrets to logs.
3. Pin Java 11-14 with Docker or a local toolchain path; do not rely on the default installed Java 17.
4. First use the SDK only for offline XML validation and hash comparison against copied, license-approved fixtures.
5. Add SDK validation to CI only after the wrapper is deterministic on Windows paths with spaces and Linux CI paths.
6. Treat SDK signing and QR generation as future validation oracles until production key custody is designed.
7. Do not enable clearance/reporting/compliance network submissions until the API adapter has verified URLs, payloads, credentials, and sandbox-only tests.

## Implemented Wrapper Groundwork

- `GET /zatca-sdk/readiness` now reports local SDK discovery and Java readiness without executing the SDK.
- `POST /zatca-sdk/validate-xml-dry-run` now builds a command plan from invoice XML metadata or request `xmlBase64` without writing temp files or executing Java.
- `POST /zatca-sdk/validate-xml-local` now accepts raw XML, base64 XML, or invoice XML metadata, but remains disabled by default through `ZATCA_SDK_EXECUTION_ENABLED=false`.
- `POST /zatca-sdk/validate-reference-fixture` validates allowlisted XML fixture paths under `reference/` or `packages/zatca-core/fixtures` only.
- `POST /sales-invoices/:id/zatca/sdk-validate` runs local validation against generated invoice XML when explicitly enabled and readiness passes. It also runs SDK `-generateHash` and returns read-only `sdkHash`, `appHash`, `hashMatches`, and `hashComparisonStatus` fields.
- `POST /sales-invoices/:id/zatca/hash-compare` runs the SDK hash oracle only, when enabled, and always returns `noMutation=true`.
- `GET /zatca/hash-chain-reset-plan` returns active EGS/local metadata state plus reset risks as a dry run only.
- `ZATCA_HASH_MODE=local` remains the default. `ZATCA_HASH_MODE=sdk` is a planning flag only and does not make LedgerByte persist SDK hashes.
- The SDK readme documents `fatoora -validate -invoice <filename>`; LedgerByte now prefers launcher execution and uses direct JAR execution only as a fallback if no launcher is present.
- The SDK readme documents `fatoora -generateHash -invoice <filename>`; LedgerByte uses it as the hash oracle and does not mutate metadata during comparison.
- The wrapper enforces a 2 MB XML limit, timeout, temp-file cleanup, output redaction, and path traversal blocking. Windows `.bat` launcher execution uses `cmd.exe` with an argument array only; it does not concatenate a command string.
- The frontend displays SDK validation readiness on `/settings/zatca` and exposes dry-run plus local validation actions from invoice detail pages.
- `apps/api/src/zatca-sdk/zatca-official-fixtures.ts` registers the first official and LedgerByte XML fixtures used for the Java 11 validation pass.
- `scripts/validate-generated-zatca-invoice.cjs` validates a generated invoice through a running local API and prints a safe hash comparison summary.

See `SDK_VALIDATION_WRAPPER.md` for endpoint behavior and safety rules.

## Current Fixture Validation Result

`OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` records the 2026-05-16 fixture pass.

The SDK command is verified as `fatoora -validate -invoice <filename>`. Actual fixture execution was completed with Java 11.0.26 and the official Windows launcher from a no-space temporary SDK copy:

- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples passed.
- The simplified official invoice produced warning `BR-KSA-98` about submitting simplified invoices within 24 hours, while the global result still passed.
- LedgerByte standard and simplified local XML fixtures were improved in the follow-up structural and supply-date/PIH passes. UBL ordering, official `ICV`/`PIH`/`QR` ADR shapes, standard/simplified transaction flags, seller/customer identifiers, tax total shape, supply date, official first PIH fallback, and the simplified line amount warning were corrected. The standard fixture now passes SDK XSD/EN/KSA/PIH validation and global validation. The simplified fixture now passes SDK XSD/EN/PIH validation but still fails signing, QR, and certificate checks because real signing/certificate/Phase 2 QR behavior is not implemented.
- SDK `-generateHash` has been used as a local oracle for LedgerByte fixtures. The app intentionally does not compute official hashes yet; the core helper returns blocked status until SDK hash output or verified C14N11 support is wired in.
- Generated invoice XML validation through the API now succeeds locally when SDK execution is explicitly enabled. The tested finalized invoice returned SDK exit code `0`; SDK hash `ZVhjW6kwGeZ58ZYw1l9+9dBPm+m2CIWxKX4pDXVzTsU=` and app hash `X8UbEeT1oEdrpx2lMCNRUljZtcylcMoj1HSnaCWSDb8=` produced `hashComparisonStatus=MISMATCH`, which is expected until official SDK/C14N11 hashing replaces the local deterministic app hash.
- Fresh-EGS SDK hash-mode validation now has repeatable local runners: `corepack pnpm zatca:validate-sdk-hash-mode` and `corepack pnpm zatca:debug-pih-chain`. With Java 11.0.26, the latest debug pass enabled `SDK_GENERATED` on a zero-metadata EGS, generated `INV-000001` and `INV-000002`, persisted SDK hashes `LjCY8QibCBOF4IHSmbwyLFevrxfCi7wD5+XP2D2plS4=` and `5HwroZhItrbnJyQf0a+aiPXzTCLlIci14fnPgKZmNS0=`, verified direct SDK `-generateHash` matches, verified invoice 2 PIH equals invoice 1's SDK hash, and proved repeat generation does not mutate ICV or EGS last hash. The previous invoice 2 `KSA-13` validation failure was caused by the SDK validator reading the default `Data/PIH/pih.txt` first-seed file; the wrapper now uses a temporary SDK config whose `pihPath` contains the invoice metadata `previousInvoiceHash`. Both generated standard invoices now pass SDK XML validation globally. The remaining warning is `BR-KSA-63` because the customer model does not yet capture buyer building number.

## Guardrails For Future Wrapper

- Use an allowlisted command set (`-validate` and `-generateHash`; signing only after explicit design approval).
- Execute with a per-run temp directory outside `reference/`.
- Redact paths and payloads that may contain private key, certificate, OTP, CSID secret, or full signed XML.
- Enforce timeout and max output length.
- Store only derived validation results in normal application logs.
- Never use the SDK dummy private key/certificate as tenant material.

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.
