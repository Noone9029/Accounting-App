export const ZATCA_CHECKLIST_CATEGORIES = ["PROFILE", "CSR_CSID", "XML", "QR", "HASH_CHAIN", "API", "PDF_A3", "SECURITY", "TESTING"] as const;
export const ZATCA_CHECKLIST_STATUSES = ["DONE_LOCAL", "MOCK_ONLY", "SKELETON", "NOT_STARTED", "NEEDS_OFFICIAL_VERIFICATION"] as const;
export const ZATCA_CHECKLIST_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type ZatcaChecklistCategory = (typeof ZATCA_CHECKLIST_CATEGORIES)[number];
export type ZatcaChecklistStatus = (typeof ZATCA_CHECKLIST_STATUSES)[number];
export type ZatcaChecklistRiskLevel = (typeof ZATCA_CHECKLIST_RISK_LEVELS)[number];

export interface ZatcaChecklistItem {
  id: string;
  category: ZatcaChecklistCategory;
  title: string;
  description: string;
  status: ZatcaChecklistStatus;
  codeReferences: string[];
  sourceReferences?: string[];
  manualDependency?: string;
  riskLevel: ZatcaChecklistRiskLevel;
}

export const ZATCA_PHASE_2_CHECKLIST = [
  {
    id: "profile-seller-core-fields",
    category: "PROFILE",
    title: "Seller profile core fields",
    description: "Capture local seller name, VAT number, city, and Saudi country code for XML/CSR groundwork.",
    status: "DONE_LOCAL",
    codeReferences: ["apps/api/src/zatca/zatca.service.ts", "apps/web/src/app/(app)/settings/zatca/page.tsx"],
    sourceReferences: ["reference/zatca-docs/EInvoice_Data_Dictionary.xlsx - seller profile rows need manual page confirmation"],
    riskLevel: "MEDIUM",
  },
  {
    id: "csr-local-generation",
    category: "CSR_CSID",
    title: "Local CSR generation",
    description: "Generate a development CSR and store the private key only as a temporary local placeholder.",
    status: "DONE_LOCAL",
    codeReferences: ["packages/zatca-core/src/index.ts", "apps/api/src/zatca/zatca.service.ts"],
    sourceReferences: [
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Generating-a-Certificate-Signing-Request-CSR",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties",
      "reference/zatca-docs/compliance_csid.pdf - needs manual page confirmation",
    ],
    manualDependency: "Verify official CSR subject, extension, and certificate profile requirements before real onboarding.",
    riskLevel: "HIGH",
  },
  {
    id: "compliance-csid-mock",
    category: "CSR_CSID",
    title: "Compliance CSID onboarding",
    description: "Local mock CSID flow exists; real FATOORA OTP and official compliance CSID API are not integrated.",
    status: "MOCK_ONLY",
    codeReferences: ["apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts", "apps/api/src/zatca/zatca.service.ts"],
    sourceReferences: ["reference/zatca-docs/compliance_csid.pdf - POST /compliance"],
    manualDependency: "Get sandbox access, OTP, endpoint details, auth headers, and response field mapping from official docs.",
    riskLevel: "CRITICAL",
  },
  {
    id: "production-csid-real-flow",
    category: "CSR_CSID",
    title: "Production CSID issuance",
    description: "Production CSID issuance is intentionally blocked and must not be implemented until sandbox validation is complete.",
    status: "NOT_STARTED",
    codeReferences: ["apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts", "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts"],
    sourceReferences: ["reference/zatca-docs/onboarding.pdf - POST /production/csids", "reference/zatca-docs/renewal.pdf - PATCH /production/csids"],
    manualDependency: "Official production onboarding rules and credentials.",
    riskLevel: "CRITICAL",
  },
  {
    id: "xml-ubl-skeleton",
    category: "XML",
    title: "UBL XML skeleton",
    description: "Deterministic local UBL-like XML skeleton exists, but official Phase 2 required elements are not fully mapped.",
    status: "SKELETON",
    codeReferences: ["packages/zatca-core/src/index.ts", "apps/api/src/zatca-core.spec.ts"],
    sourceReferences: [
      "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf - needs manual page confirmation",
      "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml",
    ],
    manualDependency: "Verify official UBL, KSA extensions, invoice type, tax category, allowance/charge, and note requirements.",
    riskLevel: "CRITICAL",
  },
  {
    id: "xml-canonicalization-signing-input",
    category: "XML",
    title: "XML canonicalization and signing input",
    description: "Canonicalization, signed properties, certificate digest fields, and signing transforms are not implemented.",
    status: "NOT_STARTED",
    codeReferences: ["packages/zatca-core/src/index.ts"],
    sourceReferences: [
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl - hash and signature rules",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Signing-and-Generating-Invoice-Hash",
    ],
    manualDependency: "Official signing/canonicalization specification and sample validation artifacts.",
    riskLevel: "CRITICAL",
  },
  {
    id: "qr-phase-2-fields",
    category: "QR",
    title: "Phase 2 QR fields",
    description: "Basic TLV QR tags 1-5 exist; Phase 2 cryptographic tags are not available until signing exists.",
    status: "SKELETON",
    codeReferences: ["packages/zatca-core/src/index.ts", "apps/api/src/zatca-core.spec.ts"],
    sourceReferences: [
      "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf - QR section needs manual page confirmation",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Generating-QR-Code",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl - QR ADR rules",
    ],
    manualDependency: "Official QR tag requirements for simplified and standard invoices.",
    riskLevel: "HIGH",
  },
  {
    id: "hash-chain-local-icv",
    category: "HASH_CHAIN",
    title: "Local ICV and previous invoice hash chain",
    description: "Local ICV/previous-hash state is tracked and repeated generation is idempotent for the same invoice.",
    status: "DONE_LOCAL",
    codeReferences: ["apps/api/src/zatca/zatca.service.ts", "apps/api/src/zatca/zatca-rules.spec.ts"],
    sourceReferences: [
      "reference/zatca-docs/EInvoice_Data_Dictionary.xlsx - KSA-13/KSA-16 rows",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl - BR-KSA-33, BR-KSA-34, BR-KSA-61",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/PIH/pih.txt",
    ],
    manualDependency: "Verify official hash input, canonical XML, and reset/sequence rules.",
    riskLevel: "HIGH",
  },
  {
    id: "api-network-guardrails",
    category: "API",
    title: "Real network guardrails",
    description: "Adapter configuration keeps real ZATCA calls disabled unless explicit sandbox flags and base URL are present.",
    status: "DONE_LOCAL",
    codeReferences: ["apps/api/src/zatca/zatca.config.ts", "apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts"],
    sourceReferences: [
      "reference/zatca-docs/compliance_csid.pdf",
      "reference/zatca-docs/compliance_invoice.pdf",
      "reference/zatca-docs/clearance.pdf",
      "reference/zatca-docs/reporting.pdf",
    ],
    riskLevel: "HIGH",
  },
  {
    id: "api-official-endpoint-mapping",
    category: "API",
    title: "Official endpoint and payload mapping",
    description: "Official compliance CSID, compliance-check, clearance, and reporting endpoints/payloads are not mapped yet.",
    status: "NOT_STARTED",
    codeReferences: ["apps/api/src/zatca/adapters/http-zatca-sandbox.adapter.ts", "apps/api/src/zatca/adapters/zatca-adapter.types.ts"],
    sourceReferences: [
      "reference/zatca-docs/compliance_csid.pdf",
      "reference/zatca-docs/compliance_invoice.pdf",
      "reference/zatca-docs/clearance.pdf",
      "reference/zatca-docs/reporting.pdf",
      "reference/zatca-docs/onboarding.pdf",
    ],
    manualDependency: "Current official ZATCA/FATOORA API docs, sandbox credentials, sample payloads, and error semantics.",
    riskLevel: "CRITICAL",
  },
  {
    id: "api-clearance-reporting",
    category: "API",
    title: "Clearance and reporting submissions",
    description: "Clearance/reporting endpoints return safe local blocked responses and do not submit to ZATCA.",
    status: "NOT_STARTED",
    codeReferences: ["apps/api/src/zatca/zatca.service.ts", "apps/api/src/zatca/adapters/mock-zatca-onboarding.adapter.ts"],
    sourceReferences: ["reference/zatca-docs/clearance.pdf - POST /invoices/clearance/single", "reference/zatca-docs/reporting.pdf - POST /invoices/reporting/single"],
    manualDependency: "Official clearance/reporting rules, signed XML, response mapping, and retry semantics.",
    riskLevel: "CRITICAL",
  },
  {
    id: "signature-cryptographic-stamp",
    category: "SECURITY",
    title: "Cryptographic stamp and invoice signature",
    description: "Invoice signing, cryptographic stamp fields, certificate digest, and signed QR tags are not implemented.",
    status: "NOT_STARTED",
    codeReferences: ["packages/zatca-core/src/index.ts"],
    sourceReferences: [
      "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf - needs manual page confirmation",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Signing-and-Generating-Invoice-Hash",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd",
    ],
    manualDependency: "Official signing rules, valid CSID certificate chain, private-key custody, and sample validation.",
    riskLevel: "CRITICAL",
  },
  {
    id: "pdf-a3-xml-embedding",
    category: "PDF_A3",
    title: "PDF/A-3 XML embedding",
    description: "Generated PDFs are operational documents only; PDF/A-3 conversion and XML embedding are not implemented.",
    status: "NOT_STARTED",
    codeReferences: ["packages/pdf-core", "apps/api/src/generated-documents"],
    sourceReferences: ["reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/*.pdf", "reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf - needs manual page confirmation"],
    manualDependency: "Official archive/embedding expectations and PDF/A-3 validation tooling.",
    riskLevel: "CRITICAL",
  },
  {
    id: "key-management-kms",
    category: "SECURITY",
    title: "Private key custody",
    description: "Private keys are currently development placeholders in the database and must move to KMS/secrets storage before real use.",
    status: "NEEDS_OFFICIAL_VERIFICATION",
    codeReferences: ["apps/api/prisma/schema.prisma", "apps/api/src/zatca/zatca.service.ts"],
    sourceReferences: [
      "reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf - needs manual page confirmation",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Adding-the-Private-Key-and-Certificate",
    ],
    manualDependency: "KMS/secrets-manager design, access controls, rotation, backup, and audit policy.",
    riskLevel: "CRITICAL",
  },
  {
    id: "testing-official-validation",
    category: "TESTING",
    title: "Official validation suite",
    description: "Local unit and smoke tests exist, but official ZATCA validator/sample invoice testing is not integrated.",
    status: "NOT_STARTED",
    codeReferences: ["apps/api/src/zatca-core.spec.ts", "apps/api/scripts/smoke-accounting.ts"],
    sourceReferences: [
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md#Validating-E-invoice-Documents",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/**/*.xml",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/**/*.xsd",
      "reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/*.xsl",
    ],
    manualDependency: "Official sandbox validator responses, required invoice samples, and regression fixtures.",
    riskLevel: "HIGH",
  },
] as const satisfies readonly ZatcaChecklistItem[];
