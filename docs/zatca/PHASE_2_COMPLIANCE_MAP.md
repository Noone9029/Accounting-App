# ZATCA Phase 2 Compliance Map

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

Status values: `DONE_LOCAL`, `MOCK_ONLY`, `SKELETON`, `NOT_STARTED`, `NEEDS_OFFICIAL_VERIFICATION`.

Official reference files have now been inventoried under `reference/` and mapped in `OFFICIAL_IMPLEMENTATION_MAP.md`. Treat the table below as LedgerByte's code-status map; use `OFFICIAL_IMPLEMENTATION_MAP.md` and `ZATCA_CODE_GAP_REPORT.md` for reference-backed implementation sequencing.

| Requirement area | Current implementation status | Relevant files | Next engineering step | Manual dependency |
| --- | --- | --- | --- | --- |
| Seller profile data | `DONE_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `apps/web/src/app/(app)/settings/zatca/page.tsx` | Expand validation after official required seller fields are confirmed. | Verify official seller/address/company identifier fields. |
| Buyer/customer data | `SKELETON` | `apps/api/src/zatca/zatca.service.ts`, `packages/zatca-core/src/index.ts` | Map buyer VAT/address rules by invoice type. | Verify standard vs simplified customer requirements. |
| Invoice numbering | `DONE_LOCAL` | `apps/api/src/sales-invoices`, `apps/api/src/number-sequences` | Confirm numbering constraints for ZATCA samples. | Official numbering and branch/device rules. |
| Invoice UUID | `DONE_LOCAL` | `apps/api/prisma/schema.prisma`, `apps/api/src/zatca/zatca.service.ts` | Confirm UUID persistence and regeneration rules. | Official UUID lifecycle rules. |
| ICV | `DONE_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `apps/api/src/zatca/zatca-rules.spec.ts` | Verify official ICV sequence boundaries. | Official EGS/device sequence rules. |
| Previous invoice hash | `DONE_LOCAL` | `apps/api/src/zatca/zatca.service.ts`, `packages/zatca-core/src/index.ts` | Replace skeleton hash input with canonical signed XML flow. | Official hash-chain input/canonicalization rules. |
| Invoice hash | `SKELETON` | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca-core.spec.ts` | Hash official canonical XML instead of local skeleton XML. | Official canonicalization and hash algorithm samples. |
| UBL XML | `SKELETON` | `packages/zatca-core/src/index.ts` | Build official UBL/KSA extension mapping and validation fixtures. | Official XML implementation standard and sample files. |
| Official SDK local XML validation | `DONE_LOCAL` | `apps/api/src/zatca-sdk`, `apps/web/src/app/(app)/settings/zatca/page.tsx`, invoice detail ZATCA panel | Use feature-flagged local validation only for engineering review; keep disabled by default. | Java 11-14 runtime and verified local SDK paths. |
| QR TLV | `SKELETON` | `packages/zatca-core/src/index.ts` | Add Phase 2 cryptographic QR tags after signing exists. | Official QR tag list and byte encoding rules. |
| CSR generation | `DONE_LOCAL` | `packages/zatca-core/src/index.ts`, `apps/api/src/zatca/zatca.service.ts` | Align CSR subject/extensions with official profile. | FATOORA CSR profile requirements. |
| Compliance CSID | `MOCK_ONLY` | `apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts` | Implement only after OTP/API contract is verified. | Sandbox access, OTP, endpoint, auth, response fields. |
| Production CSID | `NOT_STARTED` | `apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts` | Keep blocked until sandbox validation passes. | Production onboarding approval and official workflow. |
| Standard invoice clearance | `NOT_STARTED` | `apps/api/src/zatca/zatca.service.ts` | Implement after signed XML and official API mapping. | Clearance endpoint, signed XML contract, response mapping. |
| Simplified invoice reporting | `NOT_STARTED` | `apps/api/src/zatca/zatca.service.ts` | Implement after signed XML and official API mapping. | Reporting endpoint, simplified invoice timing rules. |
| Cryptographic stamp/signature | `NOT_STARTED` | `packages/zatca-core/src/index.ts` | Add signing module and test against official samples. | CSID certificate chain, private key custody, signing spec. |
| PDF/A-3 embedding | `NOT_STARTED` | `packages/pdf-core`, `apps/api/src/generated-documents` | Add PDF/A-3 conversion and XML embedding pipeline later. | Official archive expectations and PDF/A-3 validator. |
| Document archive/audit logs | `DONE_LOCAL` | `apps/api/src/generated-documents`, `apps/api/src/zatca/zatca.service.ts` | Add retention/supersede policy and immutable audit review. | Legal retention and audit policy. |
| Error/retry handling | `SKELETON` | `apps/api/src/zatca/zatca.service.ts`, `apps/api/src/zatca/adapters/zatca-adapter.error.ts` | Map official error codes and retry classes. | Official API error catalog and retry guidance. |
| Sandbox/simulation/production environments | `NEEDS_OFFICIAL_VERIFICATION` | `apps/api/src/zatca/zatca.config.ts`, `.env.example` | Verify official URLs and environment semantics before enabling network. | Current official FATOORA endpoint documentation. |

## Reference-backed source files

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl`
