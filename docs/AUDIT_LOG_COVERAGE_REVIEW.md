# Audit Log Coverage Review

Audit date: 2026-07-11

Commit scope: reviewed (`Standardize transactional FX audit evidence`)

## Current Audit Log System

- `AuditLog` remains the tenant-scoped append-only mutation trail with `organizationId`, optional `actorUserId`, `action`, `entityType`, `entityId`, `before`, `after`, request IP, user agent, and `createdAt`.
- `apps/api/src/audit-log/audit-events.ts` standardizes high-risk action names at the audit service boundary, so existing service calls such as `FINALIZE`, `VOID`, `POST_COGS`, and `REVERSE_INVENTORY_ASSET` are stored as explicit event names.
- `sanitizeAuditMetadata` recursively redacts passwords, token values/hashes, secrets, API/access keys, authorization headers, private keys, and base64 document payload fields before audit metadata is persisted or returned.
- `GET /audit-logs` supports action, entity type, entity id, actor, date, search, limit, and page filters.
- `GET /audit-logs/:id` returns tenant-scoped sanitized detail.
- `GET /audit-logs/export.csv` exports the same filtered audit trail as sanitized CSV for users with `auditLogs.export`, with sensitive metadata key names and values redacted.
- `AuditLogRetentionSettings` stores per-organization retention policy controls with a seven-year default, no automatic purge, and an export-before-purge marker.
- `GET /audit-logs/retention-settings`, `PATCH /audit-logs/retention-settings`, `GET /audit-logs/retention-preview`, and `POST /audit-logs/retention-dry-run` provide admin-only policy visibility and dry-run counts without deleting records.
- `/settings/audit-logs` provides the admin review UI with CSV export and retention preview/settings panels.
- `NUMBER_SEQUENCE_UPDATED` captures old/new prefix, next number, padding, and example values when a permitted admin/accountant changes future numbering settings.

## Transactional FX Evidence

Focused FX events supplement the existing document, payment, journal, and revaluation audit records. Each focused record is written with the same Prisma transaction executor as the mutation it describes, so a rollback cannot leave standalone FX audit evidence.

| Event | Entity | Exact emission condition |
| --- | --- | --- |
| `DOCUMENT_FX_CONTEXT_CHANGED` | `SalesInvoice`, `CreditNote`, `PurchaseBill`, or `PurchaseDebitNote` | A draft update changes the normalized transaction currency, base currency, or eight-decimal captured rate, and either the previous or next context is foreign currency. Changes that leave that tuple unchanged and base-currency-only drafts are silent. |
| `DOCUMENT_FX_RATE_FROZEN` | `SalesInvoice`, `CreditNote`, `PurchaseBill`, `PurchaseDebitNote`, or `CashExpense` | Foreign evidence becomes finalized or posted. Cash expenses post during creation and therefore have no separate draft-change event. Same-currency posting is silent. |
| `DOCUMENT_FX_RATE_FROZEN` | `CustomerPayment` or `SupplierPayment` | Every foreign direct payment creation freezes its captured rate through the same transaction executor as the payment, regardless of whether allocations produce realized FX or the amount remains unapplied. Same-currency payment creation is silent. |
| `REALIZED_FX_POSTED` | `RealizedFxSettlement` | A direct payment allocation or later unapplied-credit allocation has a non-zero realized gain/loss journal effect. Zero-FX allocations are silent. |
| `REALIZED_FX_REVERSED` | `RealizedFxSettlement` | The linked realized FX journal effect is reversed by allocation reversal or payment void. Reversals without a linked non-zero FX effect are silent. |
| `FX_REVALUATION_PREVIEWED` | `FxRevaluationRun` | A revaluation preview run is created after its selected tenant-owned rate evidence validates. |
| `FX_REVALUATION_SUPERSEDED` | `FxRevaluationRun` | A stale unposted active run is atomically failed while a valid replacement preview is created. |
| `FX_REVALUATION_REVIEWED` | `FxRevaluationRun` | A draft run is successfully claimed for review; an idempotent replay does not add a duplicate event. |
| `FX_REVALUATION_POSTED` | `FxRevaluationRun` | A reviewed run is successfully posted and its journal/carrying state is committed. |
| `FX_REVALUATION_REVERSED` | `FxRevaluationRun` | A posted run and its journal/carrying state are successfully reversed. |

FX event payloads are deliberately narrow. Document records contain only currency, base currency, captured rate, rate date, rate source, and rate snapshot ID. Payment freeze records add only the payment number and linked posting journal ID to that immutable rate evidence. Realized-settlement records contain payment/document IDs, realized gain/loss amounts, and the linked original or reversal journal IDs. Revaluation records retain the existing compact run status/date/line-count and journal-link evidence. Full DTOs, request hashes, idempotency keys beyond the existing compact revaluation lifecycle evidence, raw Prisma records, credentials, and provider payloads are not copied into focused FX events. The audit service still applies recursive sensitive-key redaction before persistence and export; this is a redaction boundary, not permission to include secrets in metadata.

Currency-rate snapshots remain append-only. A correction creates a new snapshot and subsequent draft/update, posting, settlement, or revaluation evidence references the selected immutable snapshot. No rate-update audit action or rate-update API exists.

## Already Audited High-Risk Actions

- Auth/security: login, password reset request for existing users, password reset completion, invitation acceptance, member invitation, member role/status changes, role create/update/delete.
- Core accounting: journal create/update/post/reverse and fiscal period create/update/close/reopen/lock.
- Sales: invoice create/update/finalize/void, customer payment create/void, credit note create/update/finalize/void, customer refund create/void.
- Purchases: purchase bill create/update/finalize/void, purchase order create/update/approve/send/close/void/convert, supplier payment create/void, purchase debit note create/update/finalize/void, supplier refund create/void, cash expense create/void.
- Banking: bank account profile create/update/archive/reactivate, bank transfer create/void, statement import/void, statement match/categorize/ignore, reconciliation create/submit/approve/reopen/close/void.
- Inventory: warehouse create/update/archive/reactivate, stock movement create, adjustment create/update/approve/void, warehouse transfer create/void, purchase receipt create/void/asset post/asset reverse, sales stock issue create/void/COGS post/COGS reverse, variance proposal create/submit/approve/post/reverse/void.
- Documents/storage/admin: attachment upload/update/delete, generated document archive creation, document settings update, number sequence update.
- ZATCA: profile update, EGS create/update/activate, CSR generation, mock/production CSID request attempts, XML generation, compliance check run.

## Missing Or Low-Priority Coverage

- Low-risk GET/list/detail reads are intentionally not logged.
- Some maintenance or metadata-only operations may still store generic event names if they are outside the standardized high-risk map.
- Report exports rely on generated-document audit coverage when a PDF is archived; simple JSON/CSV report reads are not logged.
- CSV export is manual only; no scheduled audit export exists yet.
- Retention preview is dry-run only; no automatic purge job or archive executor exists yet.
- No immutable external audit store, alerting, anomaly detection, or tamper-evident hash chain exists yet.
