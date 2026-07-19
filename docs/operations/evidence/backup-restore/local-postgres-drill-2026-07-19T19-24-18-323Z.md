# Local PostgreSQL Backup/Restore Drill Evidence

- Timestamp: 2026-07-19T19:24:18.323Z
- Git commit: 9bff09af
- Mode: drill
- Status: LOCAL_POSTGRES_RESTORE_VERIFIED
- Source DB classification: local
- Restore DB classification: local
- Backup filename: ledgerbyte-local-backup-2026-07-19T19-24-12-792Z.dump
- Backup checksum: 4c2948ee6bf9fe0d981fc261178a48e43ff654f053d62215034f4558c5331fc0
- Backup size bytes: 1178293
- Blocked hosted/prod mutation status: blocked-by-default
- Hosted/prod mutation attempted: false
- Hosted production recovery proven: false
- Production recovery proven: false
- Object storage recovery proven: false

## Restore Verification Checks

| Check | Table | Result | Message |
| --- | --- | --- | --- |
| organization-table | Organization | PASS | Verification passed against local disposable restore database. |
| user-table | User | PASS | Verification passed against local disposable restore database. |
| membership-table | OrganizationMember | PASS | Verification passed against local disposable restore database. |
| account-table | Account | PASS | Verification passed against local disposable restore database. |
| journal-entry-table | JournalEntry | PASS | Verification passed against local disposable restore database. |
| journal-line-table | JournalLine | PASS | Verification passed against local disposable restore database. |
| sales-invoice-table | SalesInvoice | PASS | Verification passed against local disposable restore database. |
| purchase-bill-table | PurchaseBill | PASS | Verification passed against local disposable restore database. |
| email-outbox-table | EmailOutbox | PASS | Verification passed against local disposable restore database. |
| event-outbox-table | EventOutboxItem | PASS | Verification passed against local disposable restore database. |
| fixed-asset-table | FixedAsset | PASS | Verification passed against local disposable restore database. |
| recurring-template-table | RecurringTransactionTemplate | PASS | Verification passed against local disposable restore database. |
| recurring-run-table | RecurringTransactionRun | PASS | Verification passed against local disposable restore database. |
| tenant-scope-sample | Organization | PASS | Verification passed against local disposable restore database. |
| tenant-scope-no-cross-org-journal-lines | JournalLine | PASS | Verification passed against local disposable restore database. |
| prisma-migrations | _prisma_migrations | PASS | Verification passed against local disposable restore database. |
| core-schema | information_schema.tables | PASS | Verification passed against local disposable restore database. |
| journal-money-integrity | JournalEntry | PASS | Verification passed against local disposable restore database. |
| sales-document-money-integrity | SalesInvoice | PASS | Verification passed against local disposable restore database. |
| generated-document-hash | GeneratedDocument | PASS | Verification passed against local disposable restore database. |
| fixed-asset-carrying-amount | FixedAsset | PASS | Verification passed against local disposable restore database. |
| recurring-run-relationship | RecurringTransactionRun | PASS | Verification passed against local disposable restore database. |
| audit-log-request-id | AuditLog | PASS | Verification passed against local disposable restore database. |
| generated-document-request-id | GeneratedDocument | PASS | Verification passed against local disposable restore database. |
| document-extraction-request-id | DocumentExtractionResult | PASS | Verification passed against local disposable restore database. |
| document-review-request-id | DocumentReviewDecision | PASS | Verification passed against local disposable restore database. |
| payment-provider-event-request-id | PaymentProviderEvent | PASS | Verification passed against local disposable restore database. |
| invoice-payment-link | InvoicePaymentLink | PASS | Verification passed against local disposable restore database. |

## Blockers

- None recorded for this evidence output.

## Warnings

- Hosted/prod/beta/staging database mutation was blocked/not attempted.

This evidence is local/test-safe groundwork only. It does not prove hosted production backup, hosted restore, object-storage recovery, RPO/RTO approval, or disaster-recovery readiness.
