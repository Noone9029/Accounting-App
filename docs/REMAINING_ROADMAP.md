# Remaining Roadmap

Audit date: 2026-05-15

For the updated Product Audit v2 planning artifacts, see:

- `docs/PRODUCT_AUDIT_V2.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/NEXT_30_PROMPTS_ROADMAP.md`

## Phase 1: Stabilize Current MVP

Objective: make the current AR/AP MVP reliable enough for structured user QA.

Tasks:

- Run guided QA through every implemented frontend route.
- Review dashboard KPI definitions, chart thresholds, attention item thresholds, and quick-action placement with an accountant/product owner.
- Fix UX inconsistencies, especially supplier AP balance labels.
- Wire the new Playwright browser E2E smoke into CI and expand it where user-facing regressions are found.
- Validate the opt-in SMTP provider with a non-production relay, then add domain authentication checks, provider webhooks, retry queue, and audit alerting for role/member administration.
- Harden fiscal period UX with period templates, optional reversal-date selection, and admin unlock approval design.
- Harden number sequence administration with reviewed reset/skip workflow, collision preview, and branch/device numbering policy before production.
- Add accountant review pass for report layouts and exported report formats.
- Add customizable dashboard widgets and saved preferences after KPI definitions are approved.
- Move Prisma seed config to `prisma.config.ts` before Prisma 7.

Manual dependencies:

- Accountant review of chart of accounts and posting rules.
- Product review of current UX flows.

Risk level: Medium.

Recommended next prompt:

> Run a full route QA polish pass across implemented LedgerByte screens, fixing only real loading, empty, error, permission, and responsive UI defects without changing accounting behavior.

## Phase 2: Finish Wafeq Core Accounting Modules

Objective: complete core accounting modules expected in a serious SME accounting SaaS.

Tasks:

- Supplier debit notes hardening and UI polish.
- Purchase receiving QA, partial bill matching, and purchase matching hardening.
- Cash expense import/OCR groundwork and production hardening for uploaded receipt attachments after the S3 adapter is validated against a real non-production bucket.
- Bank account profile, transfer, opening-balance, statement import preview, and reconciliation UX polish.
- Bank statement file-format samples, upload storage design using the storage readiness groundwork, and approval queue polish.
- Transfer fees and multi-currency FX transfer handling.
- Inventory adjustment/transfer UX polish and approval queue hardening.
- Official VAT return report.
- Scheduled/email report delivery.
- Customer and supplier statement PDF parity.

Manual dependencies:

- Accountant validation of report formats and VAT return requirements.
- Bank statement file format samples.

Risk level: High.

Recommended next prompt:

> Add bank statement file upload storage and OFX/CAMT/MT940 parser groundwork without live bank feeds or automatic matching.

## Phase 3: Inventory And Payroll Basics

Objective: add operational modules that affect accounting but require careful scope control.

Tasks:

- Purchase receiving and sales stock issue UX polish, delivery document groundwork, and operational status hardening.
- Inventory adjustment approval inbox and reason-code catalog.
- Warehouse in-transit transfer, shipping document, and bin/location support.
- Accountant review of the current moving-average operational valuation estimate and FIFO placeholder policy.
- Review inventory accounting settings, purchase receipt clearing previews/posting, purchase bill direct-vs-clearing finalization behavior, bill/receipt matching visibility, manual sales issue COGS posting, clearing account balances, and variance proposal journals with an accountant.
- Use `docs/inventory/PURCHASE_RECEIPT_POSTING_READINESS_AUDIT.md` as the go/no-go gate before automatic receipt GL posting or direct-mode migration.
- Harden manual COGS and receipt asset review/audit UX after first QA pass.
- Inventory accounting integrity audit is complete for the current manual posting chain, and accountant-reviewed variance proposals now exist. Next inventory accounting work should harden review outputs and define landed-cost, historical direct-mode migration/exclusion, and FIFO cost-layer policy before any automatic posting.
- Accounting-grade inventory valuation reports after GL posting design.
- Employee master data.
- Payroll shell with draft runs, pay items, and accounting posting plan.

Manual dependencies:

- Inventory valuation accounting policy, inventory clearing account treatment, bill/receipt matching/variance policy, receipt asset and variance proposal review policy, and COGS cost-flow approval.
- Payroll jurisdiction requirements.
- Accountant review of COGS/payroll postings.

Risk level: High.

Recommended next prompt:

> Review inventory variance proposal outputs with an accountant and design landed-cost/direct-mode migration policy without enabling automatic posting.

## Phase 4: ZATCA Production Path

Objective: move from local-only ZATCA groundwork to official validated Phase 2 implementation.

Tasks:

- Verify official XML requirements against local `reference/` docs and SDK samples.
- Keep Java 11-14 configured for repeatable local/CI SDK validation; official sample fixtures now pass under Java 11.
- Complete the remaining official XML gaps: generated invoice address/identifier warnings, broader invoice scenarios, signing/certificate, and Phase 2 QR.
- Use the no-mutation hash comparison, dry-run reset plan, and explicit fresh-EGS SDK hash mode as the verified baseline. The first two generated SDK-mode invoices now persist hashes that match SDK `-generateHash`, and repeated generation is idempotent.
- The invoice 2 `KSA-13` PIH validation failure is resolved for local fresh-EGS validation by passing metadata `previousInvoiceHash` through an invoice-specific temporary SDK `pihPath`.
- Resolve remaining generated XML buyer-address warning `BR-KSA-63` by adding real buyer building-number data later; do not hardcode fake address values.
- Implement signing and Phase 2 QR only after canonicalization and key custody are designed.
- Implement compliance CSID onboarding with real FATOORA sandbox OTP.
- Implement compliance invoice API tests.
- Implement production CSID request after sandbox success.
- Implement standard invoice clearance and simplified invoice reporting.
- Implement PDF/A-3 XML embedding.
- Move private keys and certificates to KMS/secrets manager.
- Add robust error/retry/status handling.

Manual dependencies:

- ZATCA/FATOORA sandbox access.
- FATOORA OTP.
- Official endpoint/auth verification.
- Repeatable Java 11-14 runtime verification for local and CI environments.
- KMS/secrets manager selection.

Risk level: Critical.

Recommended next prompt:

> Add official buyer address field support for ZATCA generated XML, including customer building number/district validation and UI/API data capture, without signing or network calls.

## Phase 5: Production/SaaS Readiness

Objective: harden LedgerByte for real users, operations, billing, and scale.

Tasks:

- Production deployment target and infrastructure-as-code.
- Managed Postgres, backups, restore drills, and monitoring.
- Validate the uploaded-attachment S3 adapter with a real non-production bucket, then implement generated-document object storage and a resumable DB-to-S3 migration executor.
- Email provider validation, background queue/retries, provider webhooks, and transactional template polish.
- WhatsApp provider integration if product requires it.
- Subscription billing and plan enforcement.
- Domain, DNS, SSL, and environment management.
- Security hardening: CORS, password policy, scheduled audit export/alerting plus immutable storage, secrets rotation, MFA, and session invalidation.
- Approval workflows and dual-control policies for high-risk accounting actions.
- Observability: logs, metrics, tracing, alerts.
- Multi-language polish, Arabic/English layout review, and regional formatting.
- Data import/export and admin support tooling.

Manual dependencies:

- Cloud provider account.
- Domain/DNS access.
- Email/WhatsApp/payment provider credentials.
- Legal/tax company details.
- Security review.

Risk level: High.

Recommended next prompt:

> Create a production readiness plan for LedgerByte covering deployment, storage, backups, monitoring, secrets, email, billing, and security controls.

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
