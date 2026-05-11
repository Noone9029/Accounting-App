# ZATCA XML Requirements Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Replace the local UBL-like skeleton with verified UBL 2.1 and KSA extension mapping.
- Verify required elements for standard tax invoices, simplified tax invoices, credit notes, and debit notes.
- Verify supplier, customer, tax, allowance/charge, payment means, delivery, and note fields.
- Verify decimal precision, currency, VAT category, exemption, and rounding rules.
- Implement official XML canonicalization before hashing/signing.
- Add official signed properties and certificate digest fields.
- Validate generated XML against official schemas and sample validator responses.
- Keep local XML generation labeled as skeleton until these items pass.

## Reference-backed source files

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/maindoc/UBL-Invoice-2.1.xsd`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`

Key gap found: current local XML does not yet emit the official `cac:AdditionalDocumentReference` structures for `ICV`, `PIH`, and `QR`, and does not implement official canonicalization, signatures, or populated UBL extensions.
