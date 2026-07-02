# Data Processing and Retention Notes

Status: draft, requires legal review
Date: 2026-07-02

## Processing Notes

- LedgerByte stores accounting and operational records per organization.
- Tenant isolation is currently application-enforced and database hardening remains a production-readiness workstream.
- Generated documents and future eInvoice evidence require retention and deletion controls.
- Support diagnostics must avoid secrets, passwords, provider tokens, private document bodies, and unnecessary personal data.

## Retention Draft

| Data | Draft period | Status |
| --- | --- | --- |
| accounting records | 7 years | needs legal review |
| audit logs | 7 years | app settings exist; legal review needed |
| support tickets | 180 days | needs support tooling |
| backups | per hosted DB policy | blocked by hosting decision |
| future ASP evidence | 7 years minimum | blocked by provider/legal review |

## Deletion and Legal Hold Gaps

- Define export-before-delete process.
- Define legal hold ownership.
- Define retention exceptions by jurisdiction.
- Verify object storage lifecycle and immutability before production use.
