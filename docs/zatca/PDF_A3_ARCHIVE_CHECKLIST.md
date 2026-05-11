# ZATCA PDF/A-3 Archive Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Current PDFs are operational documents only.
- PDF/A-3 conversion is not implemented.
- XML embedding is not implemented.
- Verify official expectations for embedded XML filename, relationship, metadata, and archive retention.
- Add PDF/A-3 validation tooling before claiming archive readiness.
- Define retention, supersede, and immutable audit rules for generated documents.
- Ensure PDF QR display is tied to signed/validated XML before production use.

## Reference-backed source files

- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/PDF-A3/*.pdf`
- `reference/zatca-docs/E-Invoicing_Detailed__Guideline.pdf`

The SDK bundle includes PDF/A-3 samples, but LedgerByte should not implement embedding until the sample metadata, embedded XML relationship, and legal archive expectations are manually verified.
