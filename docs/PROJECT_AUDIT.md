# LedgerByte Project Audit

Audit date: 2026-05-15

Current commit audited: pending (`Add ZATCA SDK hash mode persistence groundwork`)

See also:

- `docs/PRODUCT_AUDIT_V2.md` for the current product maturity and go/no-go view.
- `docs/PRODUCT_READINESS_SCORECARD.md` for 0-100 readiness scores by product area.
- `docs/NEXT_30_PROMPTS_ROADMAP.md` for the prioritized next 30 implementation prompts.

## Summary

LedgerByte is a TypeScript monorepo for a GCC/Saudi-oriented accounting SaaS. The current codebase has a working local MVP for core AR and AP transaction flows, dashboard KPI overview, document PDFs, report CSV/PDF exports, generated-document archive, uploaded supporting-file attachment groundwork with database-default storage and feature-flagged S3-compatible storage for new uploads, storage readiness and dry-run migration planning, email invitation/password reset groundwork with mock-default delivery, opt-in SMTP adapter, provider readiness, test-send, and DB-backed rate limits, standardized audit logging with admin review UI, filtered CSV export, retention settings, dry-run retention preview, guarded number-sequence settings, operational inventory warehouse/stock-ledger/adjustment/transfer/receipt/issue/report controls, inventory accounting preview, clearing/matching groundwork, accountant-reviewed purchase bill clearing-mode finalization, explicit compatible purchase receipt asset posting, inventory clearing reconciliation/variance reporting, accountant-reviewed inventory variance proposal workflow, inventory accounting integrity audit, purchase receipt posting readiness audit, local API smoke coverage, browser E2E smoke coverage, and non-production ZATCA groundwork.

Current maturity level: `MVP_ACCOUNTING_FOUNDATION`. The Product Audit v2 now estimates local demo MVP readiness at 88%, private beta readiness at 62%, production SaaS readiness at 38%, Saudi/ZATCA production readiness at 36%, and Xero/Wafeq competitor readiness at 45%. The app can be demonstrated locally for dashboard KPI overview, sales invoices, customer payments, credit notes, customer refunds, purchase orders, purchase bills, purchase bill accounting previews, supplier payments, bank account profile balances/transactions, bank transfers, opening-balance posting, local bank statement import preview/reconciliation, reconciliation approval/close/lock review history, reconciliation reports, uploaded attachment upload/list/download/soft-delete on key source records, inventory warehouses, opening-balance movements, inventory adjustment approvals/voids, warehouse transfers/voids, purchase receipts/voids, sales stock issues/voids, inventory balances, inventory settings, inventory accounting settings, purchase receipt posting readiness, purchase receipt accounting previews, compatible receipt asset posting/reversal, bill/receipt matching visibility, inventory clearing reconciliation/variance reports, variance proposal create/submit/approve/post/reverse/void workflow, sales issue COGS previews/posting, stock valuation/movement/low-stock reports, ledgers, statements, core report exports, and PDFs. It is not production-ready as a SaaS and is not production ZATCA compliant.

## Tech Stack

- Monorepo: pnpm workspaces.
- Backend: NestJS, Prisma, PostgreSQL, JWT auth, class-validator DTOs.
- Frontend: Next.js App Router, React, Tailwind CSS, typed API helpers.
- Shared packages: `accounting-core`, `pdf-core`, `zatca-core`, `shared`, `ui`.
- PDF: PDFKit through `packages/pdf-core`.
- ZATCA: local TypeScript scaffolding plus local official references, Java SDK readiness/local-validation wrapper checks, official sample fixture validation pass under Java 11, LedgerByte XML structural fixes against SDK output, API-generated XML validation, read-only SDK/app hash comparison, dry-run hash-chain reset planning, and explicit fresh-EGS SDK hash persistence.
- Local infra: Docker Compose for PostgreSQL, Redis, API, and web.

## Monorepo Structure

- `apps/api`: NestJS API, Prisma schema/migrations/seed, smoke script, backend tests.
- `apps/web`: Next.js app routes, forms, helpers, frontend tests.
- `packages/accounting-core`: decimal-safe journal and invoice calculation helpers.
- `packages/pdf-core`: PDF data contracts and renderers.
- `packages/zatca-core`: local-only XML/QR/hash/CSR/checklist helpers.
- `packages/shared`: shared tenant/API types.
- `packages/ui`: UI placeholder package.
- `docs`: project audit docs plus ZATCA implementation maps.
- `reference`: local ZATCA/FATOORA docs and Java SDK material; not used for real network calls.
- `infra`: local Docker Compose and setup notes.

## What Works End To End

- Register/login, organization selection, and role-aware `/auth/me` membership responses.
- Read-only dashboard summary and UI showing AR/AP, banking, inventory, report-health, compliance/admin counts, attention items, and permission-gated quick actions.
- Tenant-scoped role permissions with protected default Owner/Admin/Accountant/Sales/Purchases/Viewer roles.
- Role and organization member management UI/API with custom role creation, permission matrices, role/status changes, active-provider email invites, invite acceptance, password reset, email provider readiness/test-send, token request rate limits, expired-token cleanup, email outbox inspection, audit log review UI, filtered audit CSV export, retention dry-run controls, and guarded number-sequence settings.
- API permission guards for sensitive accounting, document, report, fiscal period, and ZATCA actions.
- Frontend sidebar, route access, and high-risk action visibility based on active role permissions.
- Tenant-scoped CRUD foundations for accounts, branches, contacts, tax rates, items, journals, and future document numbering settings.
- Bank account profiles for cash/bank asset accounts, posted transaction visibility, bank-aware payment/expense account labels, posted bank transfers, transfer voids, guarded one-time opening-balance journals, local statement import preview/validation, manual matching, categorization journals, ignores, reconciliation summaries, reconciliation submit/approve/reopen/close records, review events, close item snapshots, void history, and closed-period statement/import locks.
- Sales invoice draft/create/edit/finalize/void with AR journal posting.
- Customer payment posting with invoice allocation and balance updates.
- Unapplied customer payment application and reversal.
- Credit note creation/finalization/void, allocation to invoices, and allocation reversal.
- Manual customer refunds from unapplied customer payments or credit notes.
- Customer ledger and statement rows for AR events.
- Purchase bill draft/create/edit/finalize/void with AP journal posting.
- Purchase order draft/create/edit/delete, approve, mark sent, close, void, PDF/archive, and conversion to draft purchase bills without posting journals.
- Supplier payment posting, allocation to bills, bill balance updates, and void restoration.
- Supplier ledger and statement rows for AP events.
- Inventory `MAIN` warehouse defaults, warehouse create/archive/reactivate, opening-balance stock movements, draft/approved/voided inventory adjustments, posted/voided warehouse transfers, posted/voided purchase receipts, posted/voided sales stock issues, source document receive/issue status helpers, purchase bill/order receipt matching status helpers, purchase bill direct-vs-clearing accounting previews/finalization, compatible purchase receipt asset previews/post/reverse journals, inventory clearing reconciliation/variance reports, accountant-reviewed variance proposals with explicit approved posting/reversal, derived item/warehouse balances, valuation settings, inventory accounting settings with inventory clearing mapping, purchase receipt posting readiness, sales issue COGS previews, explicit manual COGS post/reverse journals, operational stock reports, low-stock reporting, and explicit no-journal inventory movement behavior outside manual COGS/receipt asset/approved variance proposal post actions.
- Sales invoice, credit note, customer payment, customer refund, customer statement, purchase order, purchase bill, supplier payment, core report, and bank reconciliation PDFs.
- Core accounting report JSON/CSV/PDF outputs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- Generated document archive for generated PDFs.
- Uploaded supporting-file attachment groundwork with database-default storage, metadata, tenant-scoped linked entity validation, reusable panels on key detail pages, storage readiness API, feature-flagged S3-compatible upload/download storage for new attachments, dry-run migration counts, and `/settings/storage`.
- Local-only ZATCA profile, EGS, CSR, mock CSID, XML/QR/hash, compliance checklist, reference maps, SDK wrapper readiness/dry-run/local-validation disabled path, official fixture registry/results documentation, no-mutation hash-chain comparison/reset planning, and fresh-EGS SDK hash mode persistence safeguards.
- Full `typecheck`, `test`, `build`, and API smoke workflow is run for each release checkpoint; browser E2E smoke now exists for local user-facing route checks.

## Groundwork Or Scaffold Only

- Email invitation, invited-user onboarding, and password reset exist with mock/local default delivery, an opt-in SMTP adapter, provider readiness/test-send, DB-backed rate limits, and expired-token cleanup; no background queue/retry, provider webhooks, domain authentication validation, MFA, or advanced session management exists.
- Bank feeds, external bank APIs, automatic matching, OFX/CAMT/MT940 upload parsing, transfer fees, and multi-currency FX transfers are not implemented.
- Purchase receiving exists as a manual operational workflow; partial billing, supplier delivery documents, landed cost, and automatic inventory receipt are not implemented.
- Dashboard and reports have useful MVP visibility, but dashboard KPI definitions, report filing definitions, scheduling, and email delivery remain missing.
- Inventory warehouse, stock ledger, adjustment approval, warehouse transfer controls, manual purchase receiving, manual sales stock issue, valuation settings, purchase bill clearing-mode finalization, compatible manual purchase receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, accountant-reviewed variance proposal workflow, purchase receipt posting readiness audit, inventory accounting integrity audit, manual COGS posting, and operational reports exist, but automatic COGS, automatic/direct-mode receipt asset posting, automatic variance posting, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are not implemented.
- PDF rendering is operational only, not legal/template-complete.
- Generated document storage and existing uploaded attachment content still default to database base64; new uploaded attachments can use S3-compatible storage only when explicitly configured, and no migration executor is active.
- ZATCA is local/mock/scaffold only. Local SDK validation groundwork exists behind a disabled-by-default flag; official SDK sample fixtures now pass under Java 11, LedgerByte standard XML fixture now passes SDK global validation, simplified XML fixture passes XSD/EN/PIH, API-generated standard XML validates locally with warnings, and hash-chain reset planning is dry-run only. SDK hash persistence has been validated end-to-end on a fresh explicitly enabled EGS: two generated invoices matched direct SDK `-generateHash`, invoice 2 PIH equaled invoice 1's SDK hash, repeat generation was idempotent, and invoice-specific SDK `pihPath` handling resolved the prior invoice 2 `KSA-13` local validation failure. Buyer building-number warnings, signing, Phase 2 QR, real CSID, clearance, reporting, and PDF/A-3 do not exist.
- Redis is present in local infra but workers/queues are not wired.
- Production deployment, monitoring, backups, subscription billing, email queue/retry/webhook operations, WhatsApp, generated-document object storage, and attachment migration operations are not implemented.

## Top 10 Risks

1. ZATCA is not production compliant; LedgerByte simplified XML still fails signing/QR/certificate checks, API-generated XML still has buyer building-number warnings, and real onboarding, signing, and API submission are missing. Fresh-EGS SDK hash persistence and PIH-chain validation now work locally, including the prior invoice 2 `KSA-13` case.
2. Invite/onboarding/password reset default to mock/local delivery with provider readiness, test-send, opt-in SMTP, and DB-backed request rate limits; MFA, queue/retry, webhooks, and advanced session management are still missing.
3. No broad approval workflow, dual control, or maker-checker policy exists for high-risk accounting actions outside the new bank reconciliation approval path.
4. Bank reconciliation has local import preview, manual matching, categorization, approval, close/lock, report export groundwork, and basic linked attachments, but there is no live feed, automatic matching, OFX/CAMT/MT940 parser, production-grade bank file parser/storage workflow, or external bank integration.
5. Inventory warehouses, adjustment controls, transfers, manual receipts/issues, valuation settings, purchase bill clearing-mode finalization, compatible manual receipt asset posting, inventory clearing preview/matching/reconciliation groundwork, variance proposal workflow, purchase receipt posting readiness audit, integrity audit, and manual COGS posting exist, but automatic COGS, automatic/direct-mode receipt asset posting, GL valuation reports, automatic variance posting, automatic receipts/issues, landed cost, serial/batch tracking, and accounting-grade inventory financial reports are still missing.
6. Generated PDFs and existing uploaded attachments remain database/base64 by default; new uploaded attachments can use the feature-flagged S3-compatible adapter, but no migration executor, generated-document S3 path, virus scanning, or lifecycle policy is active.
7. Production secrets/key custody is not hardened; ZATCA private key storage is explicitly dev-only.
8. Dashboard, browser E2E, and API smoke improve visibility, but dashboard KPIs are still MVP definitions and there is no visual regression coverage yet.
9. Supplier AP balance display reuses a generic Dr/Cr helper; supplier-specific payable wording should be reviewed to avoid user confusion.
10. Audit logs cover high-risk events, admin review, filtered CSV export, retention dry-run controls, and number-sequence update events, but scheduled export, automatic purge, immutable external storage, alerting, anomaly detection, and tamper evidence are not implemented.

## Top 10 Next Priorities

1. Run a human QA pass through the dashboard, sales, purchase, payment, refund, and PDF routes, then wire typecheck/test/build/API smoke into CI and decide when the manual deployed E2E workflow should become scheduled.
2. Validate SMTP against a non-production relay, add DKIM/SPF/domain-authentication checks, MFA planning, scheduled audit export, audit alerting for role/member changes, and a reviewed number-sequence reset/skip workflow.
3. Add official VAT return work, accountant review for report definitions, and scheduled/email report delivery.
4. Add fiscal year close, retained earnings close, and controlled unlock/approval workflows.
5. Add partial PO receiving/billing design and purchase matching hardening.
6. Harden bank reconciliation with upload storage, import file-format samples/parsers, transfer fees, and multi-currency FX handling.
7. Review accountant-reviewed inventory variance journal proposal outputs, then define historical direct-mode exclusion/migration and landed-cost policy before any automatic posting.
8. Add proper buyer building-number/address data for generated ZATCA XML, then advance signing/certificate, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3.
9. Test the uploaded-attachment S3 adapter with a real non-production bucket, then implement the migration executor and generated-document S3 path.
10. Prepare production deployment, monitoring, backups, secrets management, and security review.

## New Issues Found During Audit

- Supplier AP balances currently display through the shared `formatLedgerBalance` helper that labels positive balances as `Dr`. The underlying supplier ledger math is documented as credit-minus-debit, but the UI should later use supplier-specific payable labels to avoid confusing accountants.
- Prisma still warns that `package.json#prisma` seed configuration is deprecated and should move to Prisma config before Prisma 7.
- Windows PowerShell requires quoting paths containing `(app)` when running git or shell commands against frontend App Router paths.

## Audit Verification Commands

- `corepack pnpm add -D @playwright/test -w`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm e2e --list`: passed and discovered 11 Playwright smoke specs.
- `corepack pnpm build`: passed.
- `corepack pnpm --filter @ledgerbyte/web test`: passed.
- Full browser E2E run was skipped because local API/web were not listening on `localhost:4000` and `localhost:3000`.

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
