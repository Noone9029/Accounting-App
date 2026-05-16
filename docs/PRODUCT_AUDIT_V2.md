# LedgerByte Product Audit v2

Audit date: 2026-05-16

Latest commit audited: `3ed2568` (`Add ZATCA hash-chain replacement groundwork`) plus the current SDK hash persistence opt-in pass.

## Executive Summary

LedgerByte is now a broad accounting SaaS MVP with working local workflows for core AR/AP, banking, reports, documents, inventory controls, manual inventory accounting postings, audit visibility, team/security administration, mock-default email onboarding with opt-in SMTP delivery groundwork, browser smoke coverage, deployment runbooks, and a useful business dashboard.

The product is credible as a local demo and internal accountant-review sandbox. It is not yet production SaaS, and it is not Saudi/ZATCA production-ready. The most important remaining gap is not one missing screen; it is production hardening: provider validation, email queue/retry/webhooks, real object storage migration, backups, monitoring, security controls, formal approval workflows, official tax/compliance validation, and operations.

## Maturity Estimate

| Readiness area | Estimate | Verdict |
| --- | ---: | --- |
| Local demo MVP | 88% | Strong enough for guided demos and internal workflow review. |
| Private beta | 62% | Possible only with carefully selected testers, clear limitations, non-production data, and hands-on support. |
| Production SaaS | 38% | Blocked by operations, storage, email, billing, security hardening, backups, monitoring, and legal/compliance review. |
| Saudi/ZATCA production readiness | 36% | ZATCA remains local/mock/scaffold; official SDK samples pass locally under Java 11, LedgerByte standard fixture now passes SDK global validation, simplified fixture passes XSD/EN/PIH, API-generated standard XML validates locally with warnings, read-only hash comparison exists, and SDK hash persistence can be explicitly enabled for fresh EGS units only. Signing, Phase 2 QR, CSID, clearance/reporting, and PDF-A3 are not implemented. |
| Xero/Wafeq competitor readiness | 45% | Breadth is now meaningful, but production trust, compliance depth, integrations, onboarding, and polish are still behind mature products. |

## Completed Modules

- Auth foundation: register, login, JWT, `/auth/me`, organization membership context.
- Team and role management: role permissions, member invite/status/role changes, permission-aware frontend.
- Dashboard: read-only business overview with KPIs, lightweight trend/aging charts, permission-aware drill-down links, attention items, and quick actions.
- Core accounting: chart of accounts, manual journals, posting/reversal, fiscal-period guard.
- Sales/AR: invoices, payments, unapplied payment application, credit notes, refunds, customer ledgers/statements, PDFs.
- Purchases/AP: purchase orders, bills, supplier payments, debit notes, refunds, cash expenses, supplier ledgers/statements, PDFs.
- Banking: bank account profiles, bank transfers, opening balances, statement import preview/import, matching, categorization, reconciliation lifecycle, reconciliation reports.
- Reports: General Ledger, Trial Balance, Profit and Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, CSV/PDF exports.
- Inventory operations: warehouses, stock movements, adjustments, transfers, purchase receipts, sales stock issues, balances, valuation/movement/low-stock reports.
- Inventory accounting manual flows: manual COGS posting/reversal, inventory-clearing bill finalization, compatible receipt asset posting/reversal, clearing reconciliation/variance reports, variance proposal workflow.
- Documents: generated document archive and uploaded attachment groundwork with linked panels.
- Audit: standardized high-risk event names, metadata redaction, audit UI, CSV export, retention settings, dry-run preview.
- Numbering: number sequence settings UI/API with safe future-only changes.
- Email groundwork: mock/local outbox default, invites, invite acceptance, password reset, provider readiness, test-send, opt-in SMTP adapter, DB-backed rate limits.
- Storage groundwork: database storage default, feature-flagged S3-compatible storage for new uploaded attachments, migration-plan dry run, storage settings UI.
- QA: backend/frontend/ZATCA unit tests, deep API smoke script, Playwright browser E2E smoke suite, deployed E2E GitHub Actions workflow.
- Deployment documentation: Vercel/Supabase setup, API root/health/readiness docs, CI database readiness, Supabase security review, deployed E2E runbook.

## Partial Modules

- Dashboard analytics: useful read-only snapshot with lightweight charts and drill-down links, but no customization, saved widgets, advanced charting, or accountant-approved KPI definitions.
- Banking: strong manual reconciliation, but no OFX/CAMT/MT940 parser, live feeds, auto-match, payment gateway, transfer fees, or FX handling.
- Inventory accounting: safe manual posting exists, but no automatic posting, no landed cost, no FIFO cost layers, no serial/batch tracking, no inventory returns workflow, and no historical direct-mode migration.
- Reports: broad operational reports exist, but official VAT return, filing exports, scheduled delivery, report pack controls, and accountant sign-off remain.
- Attachments/storage: upload/download/soft-delete works, new uploaded attachments can use S3-compatible storage when explicitly configured, but database/base64 remains the default and there is no migration executor, generated-document S3 path, scanning, OCR, or retention policy.
- Email: mock/local flow works with rate limits and SMTP can be enabled by env, but there is no retry queue, bounce/webhook handling, domain-auth validation workflow, MFA, or session invalidation.
- ZATCA: extensive local groundwork and docs exist; official SDK sample fixtures now pass locally under Java 11. LedgerByte's local standard XML fixture now passes SDK global validation after supply-date and PIH fallback work, the simplified fixture passes XSD/EN/PIH, API-generated standard XML validates locally with address/identifier warnings, and the app now has no-mutation SDK hash comparison, a dry-run reset plan, and explicit fresh-EGS SDK hash persistence. Signing, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3 remain unimplemented.
- Browser QA: route smoke exists and deployed E2E has run, but no visual regression, no full accounting assertions in browser, and no scheduled CI.

## Not Started

- Real ZATCA hash-chain replacement, signing, compliant XML/signature validation, CSID onboarding, clearance, reporting, and PDF/A-3.
- Real-bucket S3 validation, generated-document object storage, and database-to-S3 migration executor.
- Email provider validation, bounce/retry worker, provider webhooks, and domain authentication.
- Subscription billing, plans, tenant limits, and customer billing.
- MFA, refresh-token rotation, advanced session invalidation, anomaly alerts.
- Live bank feeds, payment gateway integration, bank auto-matching.
- Recurring invoices, quotes/proformas, delivery notes, fixed assets, payroll, project/job costing.
- Background job queue workers for email, exports, cleanup, and scheduled reports.
- Production observability, backups, restore drills, incident runbooks, uptime/error alerting.

## Production Blockers

1. No production email queue/retry, provider webhook, or deliverability/domain-auth setup.
2. Uploaded/generated documents still default to database/base64 storage unless the attachment S3 provider is explicitly configured.
3. No production backup/restore and monitoring runbooks proven against hosted infrastructure.
4. No subscription billing, tenant limits, or SaaS account lifecycle.
5. No MFA, advanced session controls, or formal security review.
6. No immutable external audit store, scheduled audit export, tamper-evident chain, or alerting.
7. No broad maker-checker approval workflow for high-risk accounting changes.
8. No official VAT return filing workflow.
9. No production-grade bank file parser or live bank integration.
10. Supabase RLS remains disabled in the documented test posture; tenant isolation is currently API-layer enforced.

## Compliance Blockers

- ZATCA official XML mapping is incomplete; official SDK samples pass locally under Java 11, the LedgerByte standard fixture now passes SDK global validation, the simplified fixture now passes SDK XSD/EN/PIH, and API-generated standard XML validates locally with warnings, but signing, QR/certificate, CSID, clearance/reporting, and PDF/A-3 remain blockers.
- ZATCA invoice hash/canonicalization has SDK `-generateHash` oracle evidence for fixtures and generated XML. SDK hash persistence now exists only for fresh explicitly enabled EGS units; existing local chains are not migrated and are still development-only.
- ZATCA signing and certificate/key custody are not implemented.
- Compliance CSID and production CSID onboarding are not implemented.
- Clearance/reporting endpoints are intentionally blocked for real network behavior.
- PDF/A-3 invoice archive is not implemented.
- VAT Summary is not an official VAT filing export.
- Audit logs are useful but not immutable or tamper-evident.

## Security Blockers

- No MFA.
- No refresh-token rotation or advanced session invalidation.
- No production email queue/webhook security controls or domain authentication validation.
- No virus scanning for uploaded attachments.
- No signed URL policy, generated-document object-storage path, or object lifecycle/retention enforcement.
- No external immutable audit retention.
- No anomaly detection or admin alerting for sensitive changes.
- No production secrets/key custody design for ZATCA private keys.
- Deployment security review still needs RLS/private networking/least-privilege decisions.

## UX Blockers

- Dashboard has lightweight drill-downs and trend context, but still needs advanced charting, saved preferences, and accountant-approved KPI definitions.
- Many list pages need filters, saved views, bulk actions, and clearer empty states.
- Supplier AP balance wording should be accountant-reviewed.
- Error recovery and validation messages need a product-wide pass.
- No onboarding wizard or setup checklist for new organizations.
- No guided approval inbox for reconciliations, inventory variances, or high-risk actions.
- Attachment upload is functional but not polished for drag/drop, previews, or OCR.

## Accounting-Review Blockers

- Chart of accounts template needs accountant sign-off.
- Report definitions and layouts need accountant sign-off.
- Dashboard KPI definitions need accountant/product sign-off.
- VAT return design needs tax advisor review.
- Fiscal year close and retained earnings workflow is missing.
- Inventory valuation policy needs sign-off before FIFO/landed cost/automatic posting.
- Inventory variance proposal debit/credit policy needs accountant review.
- Direct-mode historical purchase bill policy needs review before any migration or automatic receipt posting.
- Approval thresholds and maker-checker rules are not defined.

## Go/No-Go

| Target | Recommendation |
| --- | --- |
| Local guided demo | GO |
| Internal accountant review | GO |
| Private beta with non-production data | CONDITIONAL GO |
| Paid production SaaS | NO-GO |
| Saudi/ZATCA compliant invoicing | NO-GO |
| Inventory accounting automation | NO-GO until landed cost/FIFO/direct-mode policy is approved |

## Recommended Next Development Focus

1. Stabilize current UX: dashboard chart polish, error/empty states, route QA, and browser smoke expansion.
2. Turn production groundwork into real infrastructure: S3 migration/generated-document storage, email provider, backup/restore, monitoring, and CI gates.
3. Resolve the fresh-EGS SDK-mode generated XML gaps now exposed by local validation: invoice 2 `KSA-13` PIH validation, buyer-address warnings, signing, certificate, and Phase 2 QR before any network calls.
4. Add accountant-reviewed advanced accounting only after current report/dashboard/inventory policies are signed off.
5. Add SaaS business layer after operational foundations are reliable.

## Fresh EGS SDK Hash Validation Update

Update date: 2026-05-16.

The fresh-EGS SDK hash persistence path has now been validated end-to-end locally with Java 11.0.26 and no ZATCA network calls. A zero-metadata EGS was explicitly enabled for `SDK_GENERATED`; two invoices persisted SDK hashes; invoice 2 PIH equaled invoice 1's SDK hash; hash compare returned `MATCH` for both invoices; repeated generation did not mutate ICV or last hash.

Follow-up PIH-chain debugging confirmed the prior invoice 2 `KSA-13` failure was caused by SDK validator configuration: the SDK `-validate` command reads the expected previous hash from `Configuration/config.json` `pihPath`, which defaults to the first-invoice seed in `Data/PIH/pih.txt`. LedgerByte now validates generated invoice chains with a temporary SDK config whose `pihPath` contains the invoice metadata `previousInvoiceHash`. Both generated standard invoices now pass SDK XML validation globally. Production readiness remains unchanged because buyer building-number data, signing, CSID, clearance/reporting, and PDF/A-3 are still absent.

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
