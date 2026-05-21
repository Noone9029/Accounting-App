# Raw Statement File Archive Policy

Date: 2026-05-22

Status: design only. No raw bank statement file body storage is implemented by this document.

## Scope

This policy covers manually uploaded or pasted bank statement files used for LedgerByte statement import preview and reconciliation review. It applies to CSV, JSON, OFX, CAMT XML, MT940, and future manual file formats. It does not cover live bank feeds, external bank aggregators, automatic matching, payment gateways, or accounting postings.

## References Consulted

- FDX/Open Financial Exchange: [OFX 2.2 Specification](https://financialdataexchange.org/common/Uploaded%20files/OFX%20files/OFX%202.2.pdf), including statement transaction fields such as `STMTTRN`, `DTPOSTED`, `TRNAMT`, and `FITID`.
- ISO 20022: [Message Definitions catalogue for Cash Management](https://www.iso20022.org/iso-20022-message-definitions?search=camt), including `camt.053 BankToCustomerStatement` and `camt.054 BankToCustomerDebitCreditNotification` definitions for `Ntry`, `Amt`, `CdtDbtInd`, booking/value dates, and remittance/reference details.
- Westpac: [public MT940 statement format documentation](https://bankrec.westpac.com.au/docs/statements/mt940/), including `:60F:`, `:61:`, `:86:`, and `:62F:` line behavior.
- mBank: [public MT940 daily statement export documentation](https://www.mbank.pl/pdf/msp-korporacje/bankowosc-elektroniczna/mbank-companynet-description-of-the-mt940-daily-statement-export-file-format-v-1.3.pdf) for additional bank-published MT940 variation context.

## Current Beta Behavior

- LedgerByte accepts manual upload or paste input only.
- The parser detects CSV, JSON, OFX, CAMT XML, MT940, and unknown text.
- The parser normalizes supported rows into existing `BankStatementImport` metadata and `BankStatementTransaction` rows.
- Raw uploaded bank statement file bodies are not stored.
- Raw uploaded bank statement file bodies are not logged.
- Unsupported or unknown file text fails safely without echoing the raw input.
- Imported rows do not create journals. Accounting entries are created only if a user later categorizes an unmatched row through the existing manual reconciliation workflow.

## Beta Recommendation

Do not archive raw bank statement file bodies during beta.

Reasons:

- Bank files can contain bank account numbers, IBANs, BICs, routing details, transaction counterparties, payment references, card fragments, payroll indicators, and other sensitive personal or business data.
- Parser confidence is still limited to small sanitized fixtures and common format variants.
- Raw-file retention, encryption, access control, deletion, and audit requirements have not been approved.
- Beta testers should use dummy or sanitized files only.

## Production Recommendation

Add raw statement-file archiving only after a reviewed storage and retention design is approved.

Required controls before implementation:

- Object storage should be preferred over database body storage.
- Files must be encrypted at rest through the storage provider and, if feasible, application-managed envelope encryption for highly sensitive tenant content.
- Access must be tenant-scoped and permission-gated separately from parsed statement row access.
- Downloads must be audited with actor, tenant, import id, timestamp, and metadata only.
- Raw file content must never be written to application logs, audit metadata, error responses, analytics, or support tooling.
- Raw file retention must be explicit and configurable by policy.
- Deletion must be supported for raw file bodies without deleting the parsed statement rows required for reconciliation audit history.
- Malware scanning and content-type validation should run before files become downloadable.
- File hash, byte size, parser version, source type, upload timestamp, and uploader id may be stored as metadata.

## Storage Design If Implemented Later

Recommended metadata fields:

- `bankStatementImportId`
- `organizationId`
- `uploadedById`
- `filename`
- `sourceType`
- `contentType`
- `byteSize`
- `sha256Hash`
- `storageProvider`
- `storageKey`
- `parserVersion`
- `archivedAt`
- `deletedAt`

Do not store:

- Raw file body in logs.
- Raw file body in audit metadata.
- Raw file body in generated error messages.
- Raw file body in browser analytics.
- Bank credentials or external feed tokens.

## Access Control

Raw file archive access should require a dedicated permission, for example `bankStatements.rawFiles.download`, or an equivalent reviewed banking administration permission. It should not be granted automatically to every user who can view bank accounts.

Minimum controls:

- Organization membership and tenant scope.
- Active role permission check.
- Audit log for every download.
- Redacted list responses that show metadata only.
- No cross-tenant storage keys or public URLs.

## Retention And Deletion

Recommended beta posture: no raw bodies stored.

Recommended production posture:

- Default raw-file retention should be short unless legal/accounting policy requires longer retention.
- Parsed statement rows and reconciliation records should remain according to accounting audit policy.
- Deleting a raw file should preserve import metadata, parsed row history, reconciliation status, and audit events.
- Retention periods must be approved by legal/accounting review before production use.

## Migration Requirements

Implementing raw archive later likely requires:

- A non-destructive schema migration or reuse of the existing attachment/storage abstraction with a bank-statement-specific entity type.
- Object-storage validation in non-production.
- Access-control tests.
- Audit-log tests.
- Redaction tests proving raw file body content does not appear in logs, API responses, or error paths.
- A rollback plan that can disable new raw archives without deleting parsed statement rows.

## Current Decision

Raw statement-file archive remains design-only.

LedgerByte beta continues to store only parsed rows and import metadata. This keeps the user-testing environment lower-risk while the parser is validated against more sanitized real-world OFX, CAMT, and MT940 variants.
