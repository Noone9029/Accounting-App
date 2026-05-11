# ZATCA Security And Key Management Checklist

This is a working engineering checklist. Official ZATCA/FATOORA documentation must be verified before production. Do not treat current mock implementation as legal compliance.

- Private keys in the database are development placeholders only.
- Move real private-key generation and storage to KMS or a secrets manager before real onboarding.
- Prevent private-key material from normal API responses, frontend state, logs, audit records, and smoke output.
- Define access control, rotation, backup, incident response, and certificate revocation procedures.
- Verify signing operations can use key handles without exposing PEM material to application logs.
- Add operational monitoring for failed signing, failed API submissions, and suspicious certificate access.
