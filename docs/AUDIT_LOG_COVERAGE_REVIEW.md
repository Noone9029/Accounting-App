# Audit Log Coverage Review

Audit date: 2026-05-15

Commit scope: pending (`Add audit log coverage and UI`)

## Current Audit Log System

- `AuditLog` remains the tenant-scoped append-only mutation trail with `organizationId`, optional `actorUserId`, `action`, `entityType`, `entityId`, `before`, `after`, request IP, user agent, and `createdAt`.
- `apps/api/src/audit-log/audit-events.ts` standardizes high-risk action names at the audit service boundary, so existing service calls such as `FINALIZE`, `VOID`, `POST_COGS`, and `REVERSE_INVENTORY_ASSET` are stored as explicit event names.
- `sanitizeAuditMetadata` recursively redacts passwords, token values/hashes, secrets, API/access keys, authorization headers, private keys, and base64 document payload fields before audit metadata is persisted or returned.
- `GET /audit-logs` supports action, entity type, entity id, actor, date, search, limit, and page filters.
- `GET /audit-logs/:id` returns tenant-scoped sanitized detail.
- `/settings/audit-logs` provides the admin review UI.

## Already Audited High-Risk Actions

- Auth/security: login, password reset request for existing users, password reset completion, invitation acceptance, member invitation, member role/status changes, role create/update/delete.
- Core accounting: journal create/update/post/reverse and fiscal period create/update/close/reopen/lock.
- Sales: invoice create/update/finalize/void, customer payment create/void, credit note create/update/finalize/void, customer refund create/void.
- Purchases: purchase bill create/update/finalize/void, purchase order create/update/approve/send/close/void/convert, supplier payment create/void, purchase debit note create/update/finalize/void, supplier refund create/void, cash expense create/void.
- Banking: bank account profile create/update/archive/reactivate, bank transfer create/void, statement import/void, statement match/categorize/ignore, reconciliation create/submit/approve/reopen/close/void.
- Inventory: warehouse create/update/archive/reactivate, stock movement create, adjustment create/update/approve/void, warehouse transfer create/void, purchase receipt create/void/asset post/asset reverse, sales stock issue create/void/COGS post/COGS reverse, variance proposal create/submit/approve/post/reverse/void.
- Documents/storage: attachment upload/update/delete, generated document archive creation, document settings update.
- ZATCA: profile update, EGS create/update/activate, CSR generation, mock/production CSID request attempts, XML generation, compliance check run.

## Missing Or Low-Priority Coverage

- Low-risk GET/list/detail reads are intentionally not logged.
- Some maintenance or metadata-only operations may still store generic event names if they are outside the standardized high-risk map.
- Report exports rely on generated-document audit coverage when a PDF is archived; simple JSON/CSV report reads are not logged.
- No immutable external audit store, export, alerting, anomaly detection, or tamper-evident hash chain exists yet.
