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
