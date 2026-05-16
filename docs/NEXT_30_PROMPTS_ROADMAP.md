# Next 30 Codex Prompts Roadmap

Audit date: 2026-05-15

Latest commit audited: `3ed2568` (`Add ZATCA hash-chain replacement groundwork`) plus the current SDK hash persistence opt-in pass.

Each prompt is intentionally scoped so it can be executed as a safe Codex implementation/audit task. Prompts that need credentials say so explicitly.

## Phase 1: Stabilization And UX Polish

### 1. Run a full route QA polish pass

- Objective: Inspect every implemented route for loading, empty, error, and permission states; fix only real UI defects.
- Why it matters: The app is wide enough that route-level polish matters before beta.
- Dependencies: Browser E2E suite and seeded data.
- Risk level: Medium.
- Manual credentials needed: No.

### 2. Add dashboard customization and accountant-reviewed KPI definitions

- Objective: Review dashboard KPI definitions with an accountant/product owner, then add saved widget preferences only after definitions are approved.
- Why it matters: The dashboard now has charts and drill-downs, but production reliance needs reviewed definitions and configurable presentation.
- Dependencies: Existing `/dashboard/summary`, report routes, accountant/product input.
- Risk level: Medium.
- Manual credentials needed: Accountant/product input.

### 3. Expand browser E2E for critical create/detail flows

- Objective: Add smoke-level UI create/detail assertions for invoice, bill, payment, receipt, and dashboard routes.
- Why it matters: API smoke is deep, but UI regressions need earlier detection.
- Dependencies: Existing Playwright helpers.
- Risk level: Medium.
- Manual credentials needed: No.

### 4. Polish audit log export and retention UX

- Objective: Add better filter summaries, CSV export status, retention warnings, and dry-run explanations.
- Why it matters: Audit tools are admin-critical and must be clear.
- Dependencies: Existing audit APIs/UI.
- Risk level: Low.
- Manual credentials needed: No.

### 5. Add global empty/error state components

- Objective: Standardize empty, loading, error, and retry panels across major pages.
- Why it matters: UX trust improves without changing accounting behavior.
- Dependencies: Existing frontend components.
- Risk level: Low.
- Manual credentials needed: No.

### 6. Fix supplier AP balance wording and ledger labels

- Objective: Replace generic Dr/Cr display where supplier payable wording is clearer.
- Why it matters: Avoids accountant confusion in AP views.
- Dependencies: Supplier ledger UI helpers.
- Risk level: Low.
- Manual credentials needed: No.

## Phase 2: Production Foundations

### 7. Validate S3-compatible attachment storage adapter

- Objective: Exercise the feature-flagged S3-compatible attachment adapter against a real non-production bucket and document provider-specific caveats.
- Why it matters: Unit-mocked S3 behavior is not enough for production confidence.
- Dependencies: S3 attachment adapter and storage readiness groundwork.
- Risk level: High.
- Manual credentials needed: Optional test bucket credentials for live verification.

### 8. Add attachment/generated document migration executor

- Objective: Add resumable migration planning/execution from DB storage to object storage with rollback notes.
- Why it matters: Existing DB-stored files need a safe migration path.
- Dependencies: Validated S3-compatible adapter.
- Risk level: High.
- Manual credentials needed: Optional test bucket credentials.

### 9. Validate SMTP provider with non-production relay

- Objective: Exercise the opt-in SMTP adapter against Mailtrap/Resend SMTP or another non-production relay and document provider caveats.
- Why it matters: The adapter exists, but production use needs credential/domain validation outside smoke tests.
- Dependencies: SMTP provider adapter and email readiness/test-send UI.
- Risk level: Medium.
- Manual credentials needed: Provider sandbox SMTP credentials.

### 10. Add email provider webhooks and retry queue groundwork

- Objective: Track delivery, bounce, failure, and retry states without blocking requests.
- Why it matters: Production email needs observability and retries.
- Dependencies: SMTP validation and queue decision.
- Risk level: Medium.
- Manual credentials needed: Provider test credentials.

### 11. Add background job queue foundation

- Objective: Wire Redis/BullMQ or equivalent for email, exports, cleanup, and scheduled report jobs.
- Why it matters: Long-running tasks should not run in request paths.
- Dependencies: Existing Redis-ready infra.
- Risk level: High.
- Manual credentials needed: No for local; managed Redis later.

### 12. Add backup and restore runbooks

- Objective: Document and script non-production backup/restore drills for Supabase/Postgres and stored files.
- Why it matters: Production trust depends on restore, not just backup.
- Dependencies: Deployment docs and storage plan.
- Risk level: Medium.
- Manual credentials needed: Supabase/project access for live drill.

### 13. Harden CI pipelines for typecheck/test/build/smoke

- Objective: Add CI gates for typecheck, unit tests, build, API smoke where safe, and deployed E2E.
- Why it matters: Regression control is now essential.
- Dependencies: Existing scripts and workflow.
- Risk level: Medium.
- Manual credentials needed: GitHub secrets for deployed E2E only.

## Phase 3: ZATCA Production Path

### 14. Add official buyer address field support

- Objective: Add customer address fields needed by the official Saudi buyer-address rules, especially 4-digit building number, and map them into generated ZATCA XML without signing or network calls.
- Why it matters: Fresh-EGS SDK hash persistence and PIH validation now work locally, but generated XML still warns `BR-KSA-63` when buyer building-number data is missing.
- Dependencies: Official fixture result doc, fresh-EGS validation evidence, contact/customer data model review.
- Risk level: High.
- Manual credentials needed: No.

### 15. Re-run fresh-EGS SDK validation after address fixes

- Objective: Repeat the two-invoice fresh-EGS validation after buyer-address data support and confirm both SDK `-generateHash` and SDK XML validation pass without address warnings where signing is not required.
- Why it matters: The current pass resolves invoice 2 `KSA-13`; the next pass should prove generated standard XML is clean before signing work.
- Dependencies: Prompt 14 buyer address fields, SDK validation wrapper, hash comparison endpoint, reset-plan endpoint, and fresh-EGS enablement.
- Risk level: Critical.
- Manual credentials needed: No.

### 16. Implement verified XML canonicalization fallback

- Objective: Replace the blocked in-process hash groundwork helper with a verified C14N11 implementation or keep the SDK executable path as the controlled production-adjacent hash oracle.
- Why it matters: Production hash-chain, signing, clearance, and reporting depend on correct hashes even when the SDK process is unavailable.
- Dependencies: Fresh-EGS SDK hash persistence evidence.
- Risk level: Critical.
- Manual credentials needed: No.

### 17. Design ZATCA signing and key custody

- Objective: Add a security design for private keys, certificates, KMS/secrets storage, rotation, and audit.
- Why it matters: Production signing cannot store real keys like dev scaffolding.
- Dependencies: Security/storage decision.
- Risk level: Critical.
- Manual credentials needed: Cloud/KMS decision later.

### 18. Implement sandbox compliance CSID onboarding

- Objective: Add real sandbox-only CSID request flow behind explicit flags and OTP input.
- Why it matters: CSID is required before compliance invoice testing.
- Dependencies: Official XML/hash/signing groundwork.
- Risk level: Critical.
- Manual credentials needed: FATOORA sandbox access and OTP.

### 19. Implement clearance/reporting sandbox flows

- Objective: Add standard invoice clearance and simplified invoice reporting in sandbox-only mode.
- Why it matters: Real submission behavior is the legal-compliance path.
- Dependencies: CSID, signing, official XML.
- Risk level: Critical.
- Manual credentials needed: FATOORA sandbox credentials.

### 20. Add PDF/A-3 invoice archive groundwork

- Objective: Embed signed XML in PDF/A-3-compatible archives after official XML/signing exists.
- Why it matters: Production e-invoice archive requirements may require embedded XML.
- Dependencies: Official signed XML.
- Risk level: High.
- Manual credentials needed: No.

## Phase 4: Advanced Accounting

### 21. Design landed cost without posting automation

- Objective: Add landed-cost allocation design, settings, previews, and docs without creating journals automatically.
- Why it matters: Inventory valuation cannot mature without freight/duty allocation policy.
- Dependencies: Current inventory clearing and receipt asset flows.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 22. Add FIFO cost-layer groundwork

- Objective: Add FIFO layer model/design and valuation preview while keeping moving average active.
- Why it matters: FIFO is currently placeholder-only.
- Dependencies: Inventory valuation policy.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 23. Add inventory returns design

- Objective: Design sales returns and supplier returns interaction with stock, COGS, receipt asset postings, and variances.
- Why it matters: Returns are a core inventory/accounting gap.
- Dependencies: COGS and receipt asset posting rules.
- Risk level: High.
- Manual credentials needed: Accountant review.

### 24. Add recurring invoices

- Objective: Add recurring invoice templates, schedule preview, and explicit generation controls.
- Why it matters: Common SME subscription/service workflow.
- Dependencies: Existing invoice flow.
- Risk level: Medium.
- Manual credentials needed: No.

### 25. Add quotes/proformas

- Objective: Add non-posting sales quote/proforma workflow and conversion to invoice.
- Why it matters: Needed for sales pipeline before invoicing.
- Dependencies: Sales invoice form.
- Risk level: Medium.
- Manual credentials needed: No.

### 26. Add delivery notes

- Objective: Add non-accounting delivery note groundwork tied to sales invoices and stock issues.
- Why it matters: Operational sales fulfillment is missing.
- Dependencies: Sales stock issue flow.
- Risk level: Medium.
- Manual credentials needed: No.

### 27. Add fixed assets shell

- Objective: Add asset register design, acquisition links, depreciation preview, and docs without automatic posting initially.
- Why it matters: Fixed assets are a common accounting module.
- Dependencies: Chart of accounts and purchase bills.
- Risk level: High.
- Manual credentials needed: Accountant policy input.

### 28. Add payroll shell

- Objective: Add employee master data and payroll run design without payroll posting or statutory filing.
- Why it matters: Payroll is important but jurisdiction-sensitive.
- Dependencies: HR/payroll jurisdiction requirements.
- Risk level: High.
- Manual credentials needed: Payroll policy input.

## Phase 5: SaaS Business Layer

### 29. Add subscription plans and tenant limits groundwork

- Objective: Add plan model, feature limits, usage counters, and admin visibility without billing collection.
- Why it matters: SaaS needs product packaging before paid rollout.
- Dependencies: Product/pricing decisions.
- Risk level: Medium.
- Manual credentials needed: No.

### 30. Add Stripe billing integration plan and test-mode checkout

- Objective: Add test-mode billing for plans/subscriptions with webhook safety and no production charges.
- Why it matters: Converts product into an actual SaaS business.
- Dependencies: Plan/tenant limit model.
- Risk level: High.
- Manual credentials needed: Stripe test keys and webhook secret.

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

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.
