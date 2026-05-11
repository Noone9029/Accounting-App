# ZATCA QR Requirements Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Current QR TLV generation covers basic tags 1-5 only.
- Keep UTF-8 byte-length handling for Arabic/Unicode seller names.
- Verify all official Phase 2 QR tags for simplified and standard invoice scenarios.
- Add cryptographic stamp/signature tags only after invoice signing exists.
- Add official QR sample fixtures and scanner validation where available.
- Verify QR payload displayed in PDFs does not imply legal compliance until signing and official validation pass.
