# LedgerByte Product Readiness Scorecard

Audit date: 2026-05-16

Latest commit audited: `3ed2568` (`Add ZATCA hash-chain replacement groundwork`) plus the current SDK hash persistence opt-in pass.

Scoring uses a 0-100 practical readiness scale for the current codebase. A high score means the area is usable in the current MVP; it does not imply production legal/compliance readiness.

| Category | Score | Current evidence | Biggest gaps | Next priority |
| --- | ---: | --- | --- | --- |
| Core accounting | 78 | Chart of accounts, manual journals, fiscal-period guard, posting/reversal, balanced reports, smoke coverage. | Year-end close, retained earnings, approval workflow, concurrency/load testing, accountant sign-off. | Add fiscal year close and accountant-reviewed report definitions. |
| Sales/AR | 82 | Invoices, payments, unapplied payments, credit notes, refunds, customer ledgers/statements, PDFs, attachments, smoke coverage. | Recurring invoices, quotes/proformas, delivery notes, payment gateway, collection workflow. | Add recurring invoices or quote/proforma workflow after UX QA. |
| Purchases/AP | 78 | Purchase orders, bills, clearing mode, supplier payments, debit notes, refunds, cash expenses, AP ledgers/statements, PDFs. | Partial billing, multi-PO matching, remittance email, OCR/import, supplier statement PDF parity. | Harden purchase matching and supplier statement/payment UX. |
| Banking/reconciliation | 64 | Bank profiles, transfers, opening balances, statement import, matching, categorization, reconciliation approval/close/void, reports. | No live feeds, auto-match, OFX/CAMT/MT940 parser, transfer fees, FX handling, production file storage workflow. | Add bank file upload/parser groundwork and approval queue polish. |
| Reports | 74 | GL, Trial Balance, P&L, Balance Sheet, VAT Summary, AR/AP aging, CSV/PDF exports, generated archive. | Official VAT return, scheduled/email delivery, report packs, accountant layout review. | Accountant-review report definitions and add official VAT return design. |
| Inventory | 70 | Warehouses, movements, adjustments, transfers, receipts, issues, valuation reports, manual COGS, receipt asset posting, clearing reports, variance proposals. | No landed cost, FIFO, serial/batch, automatic postings, returns workflow, historical direct-mode migration. | Review variance proposal outputs and design landed-cost/direct-mode policy. |
| Documents/attachments | 62 | Generated PDFs, archive, attachment upload/list/download/soft-delete, linked panels, storage readiness/migration dry run, feature-flagged S3-compatible storage for new uploaded attachments. | DB/base64 remains default, no migration executor, no generated-document S3 path, no virus scanning, no OCR, no retention policy. | Validate S3 mode with a non-production bucket and implement migration executor. |
| Roles/permissions/security | 70 | Shared permission strings, backend guards, frontend gating, team/role UI, invite onboarding, rate limits. | No MFA, advanced sessions, dual control, security review, production identity controls. | Add MFA/session plan and maker-checker policy for high-risk actions. |
| Audit/compliance visibility | 78 | Standard events, metadata redaction, audit UI, filters, CSV export, retention settings, dry-run preview, smoke checks. | No immutable store, scheduled export, purge executor, alerting, anomaly detection, tamper evidence. | Add scheduled export/immutable storage design and sensitive-action alerts. |
| ZATCA | 39 | Profile, EGS, CSR groundwork, mock CSID, local XML/QR/hash, SDK readiness docs, disabled-by-default local SDK validation endpoints, official fixture registry/results doc, official sample validation pass under Java 11, local standard fixture SDK global pass, simplified fixture XSD/EN/PIH pass, API-generated standard XML local SDK validation, no-mutation SDK/app hash comparison, dry-run hash-chain reset plan, explicit fresh-EGS SDK hash mode, SDK-hash metadata snapshot, invoice-specific PIH validation config, and blocked real network behavior. | Signing, Phase 2 QR, CSID, clearance, reporting, PDF/A-3, buyer building-number data, KMS key custody, and repeatable Java/SDK CI execution remain missing. Existing local hash chains are not migrated. | Add proper buyer address fields, then design signing/certificate work. |
| Email/communications | 50 | Mock email outbox default, invites, password reset, readiness API/UI, opt-in SMTP adapter, test-send, DB-backed rate limits. | No queue/retries, bounces/webhooks, domain-auth validation, polished templates, invoice/statement sending, or MFA/session invalidation. | Validate SMTP with a non-production relay and add deliverability/queue controls. |
| Storage/scalability | 45 | Storage config/readiness, feature-flagged S3-compatible attachment upload/download, migration plan counts, database default works locally. | No DB-to-S3 migration executor, signed URLs, object lifecycle, generated-document S3 path, scanning, backup policy, or real-bucket validation evidence. | Test S3 mode against a non-production bucket and build migration rollback plan. |
| Browser QA/E2E | 64 | 11 Playwright specs for critical routes, deployed E2E workflow/docs, API smoke remains deep accounting check. | No visual regression, no scheduled browser CI, browser tests are smoke-level, no data reset strategy. | Schedule non-production deployed E2E and expand broken-route coverage. |
| Deployment readiness | 46 | Vercel/Supabase docs, API health/root/readiness, deployed E2E runbook/workflow, CI DB checklist, Supabase security review. | No production IaC, backups, monitoring, RLS/private-network decision, environment promotion policy. | Add production readiness runbook and backup/restore drill plan. |
| UX/product polish | 58 | Broad route coverage, dashboard KPI cards, lightweight charts/drill-downs, settings pages, panels, helper tests, permission-aware nav. | List filters, bulk actions, customizable dashboards, onboarding wizard, empty/error states, mobile polish, visual consistency. | Run route QA and add deeper dashboard/accounting review polish. |
| Production operations | 25 | Some readiness docs and manual smoke/E2E workflows. | No incident response, observability, background jobs, data retention executors, support tools, billing, SLAs. | Define operations baseline: monitoring, alerts, backups, restore drills, runbooks. |

## Overall Readiness Interpretation

- Local MVP: strong enough to demonstrate serious accounting workflows.
- Private beta: possible only with limited users and explicit non-production limitations.
- Production: blocked by operations, security, compliance, storage, email, and SaaS-business gaps.
- Compliance: ZATCA and official tax filing remain the largest domain-specific blockers.

## Highest Leverage Improvements

1. Real-bucket object-storage validation and file migration.
2. Email queue/retry, provider webhooks, and domain-auth validation around the opt-in SMTP adapter.
3. Production backup/restore and monitoring plan.
4. LedgerByte generated XML warning cleanup for buyer building-number data, signing/certificate, and Phase 2 QR work.
5. Dashboard/report accountant review.
6. UX route QA and E2E expansion.
7. Audit immutable export/alerting.
8. Advanced inventory policy: landed cost, FIFO, historical direct-mode handling.

## Fresh EGS SDK Hash Update

The fresh-EGS SDK hash-mode validation step is now complete locally. It proved opt-in SDK hash persistence, first-PIH seed usage, invoice-to-invoice SDK PIH chaining, hash-compare `MATCH`, and idempotent regeneration for two invoices without network calls. A follow-up debug pass resolved the generated invoice 2 `KSA-13` validation failure by using an invoice-specific temporary SDK `pihPath` file containing metadata `previousInvoiceHash`. The ZATCA score remains constrained because buyer building-number data, signing/CSID/clearance/PDF-A3, and repeatable CI SDK execution are not implemented.

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
