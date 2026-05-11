# ZATCA Security And Key Management Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Private keys in the database are development placeholders only.
- Move real private-key generation and storage to KMS or a secrets manager before real onboarding.
- Prevent private-key material from normal API responses, frontend state, logs, audit records, and smoke output.
- Define access control, rotation, backup, incident response, and certificate revocation procedures.
- Verify signing operations can use key handles without exposing PEM material to application logs.
- Add operational monitoring for failed signing, failed API submissions, and suspicious certificate access.

## Reference-backed source files

- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem`

The SDK readme labels the bundled certificate and private key as dummy/testing material. They must not be used as LedgerByte tenant credentials or production secrets.
