# DEV-12 Retention Legal Hold Cleanup Policy Preflight

Date: 2026-05-30

Latest commit inspected: `854f551b Verify DEV-12 storage readiness dry run evidence`

Marker: `DEV12-DOC-20260530T000000`

## 1. Purpose And Scope

This Part 13 preflight records the generated-document retention, legal hold, and cleanup policy gaps found during DEV-12. It is documentation and read-only inspection only. It does not mutate runtime data, change retention settings, delete/purge/supersede generated documents, run cleanup executors, migrate storage, upload/delete objects, generate/download document bodies, or change app behavior.

This preflight prepares closure guidance for DEV-12. It does not approve any destructive cleanup policy.

## 2. Safety Rules

- Treat generated-document bodies as accounting/customer/vendor/VAT/report-sensitive output.
- Preserve DEV-12 marker evidence by default.
- Do not guess legal, accounting, tax, privacy, or customer-data deletion retention periods.
- Do not delete, purge, supersede, cleanup, or restore generated documents without a future explicit policy and approval gate.
- Do not print `contentBase64`, PDF bytes, CSV bodies, attachment bodies, signed XML, QR payloads, DB URLs, auth headers, cookies, tokens, secrets, provider payloads, object keys, or signed URLs.
- Do not run E2E, smoke, full tests, full build, migrations, seed/reset/delete, deploys, env changes, ZATCA, email, backup, restore, production, beta, hosted/shared, or customer-data checks.

## 3. Why Generated-Document Retention Is High-Risk

Generated documents can contain:

- Customer invoices, receipts, refunds, credit notes, and statements.
- Supplier bills, purchase orders, supplier receipts/refunds, debit notes, and supplier statements.
- Bank reconciliation reports and financial reports.
- VAT/accounting/tax-sensitive summaries.
- Future compliance-sensitive artifacts if output boundaries expand.

Retention decisions can conflict with accounting/tax preservation, auditability, customer-data deletion requests, backup/restore rules, email references, and duplicate-output/version policy. Silent deletion or body exposure would be high risk.

## 4. Current Retention Behavior

- `GeneratedDocument` has `status` values `GENERATED`, `FAILED`, and `SUPERSEDED`.
- Generated-document rows have `generatedAt` and `createdAt`.
- There is no generated-document retention duration field.
- There is no generated-document legal-hold field.
- There is no generated-document soft-delete flag or `deletedAt` field.
- There is no generated-document purge/cleanup executor.
- Archive creation is append-only in `GeneratedDocumentService.archivePdf`.
- Download reads the database body from `contentBase64`.
- Repeated generation currently creates additional archive rows unless a source-specific path implements different behavior.

## 5. Current Cleanup/Purge Behavior If Any

Generated documents:

- No generated-document delete endpoint was found.
- No generated-document purge endpoint was found.
- No generated-document cleanup executor was found.
- No generated-document restore endpoint was found.
- No generated-document object delete path was found.

Related systems:

- Attachments support soft-delete with `status`, `deletedById`, and `deletedAt`.
- Audit logs have retention settings plus preview/dry-run endpoints, but automatic purge execution is not implemented.
- Backup evidence create/verify/revoke mutates metadata-only records and is separate from generated-document body cleanup.
- ZATCA signed artifact storage has metadata-only retention/immutability planning, but that does not implement generated-document retention.

## 6. Legal Hold Gap

There is no generated-document legal-hold model, flag, permission, route, UI, or enforcement point.

A future legal-hold design needs:

- Hold scope by organization, document type, source type/source id, generated-document id, and compliance relevance.
- Hold reason, actor, timestamp, review date, and release workflow.
- Enforcement in delete/purge/supersede/migration executors.
- Immutable audit trail for hold apply/release.
- No body output in hold evidence.

## 7. Accounting/Tax Retention Gap

No accounting/tax retention duration is approved for generated documents. The system must not infer a duration from audit retention defaults, ZATCA planning notes, or generic business rules.

Open requirements:

- Accountant/legal review by document type and jurisdiction.
- Separate treatment for invoices, receipts, statements, reports, VAT/tax summaries, bank reconciliation reports, and future compliance artifacts.
- Immutable archive and supersession rules for documents that support accounting/tax evidence.
- Backup retention alignment with the primary generated-document retention policy.

## 8. Customer Data Deletion Conflict/Gap

Generated-document bodies may contain personal or customer/vendor data while also serving accounting/tax/audit retention requirements.

Open conflict policy:

- Define when generated documents must be preserved despite deletion requests.
- Define redaction/anonymization possibilities, if any, without corrupting accounting evidence.
- Define tenant/customer export and deletion workflows.
- Define audit trail language for denied or delayed deletion.
- Define backup retention and restore behavior for deleted/redacted entities.

No such generated-document policy is implemented today.

## 9. Backup/Restore Retention Relation

- Backup readiness is metadata-only and reports missing or verified evidence types.
- No backup or restore operation is executed by the application.
- No generated-document restore proof exists.
- No proof exists that backup retention preserves generated-document metadata and bodies consistently.
- No proof exists that restored generated documents retain download hash integrity.
- Future cleanup must account for backup copies and restored environments, not only live database rows.

## 10. Object-Storage Lifecycle Relation

Generated documents are database/base64-backed today. A future object-storage phase must define lifecycle before body migration:

- Tenant-scoped object keys.
- Encryption and access controls.
- Versioning or immutable retention where required.
- Legal-hold equivalent.
- Lifecycle expiration policy by document type/source/status.
- Backup and restore verification.
- Signed URL policy and auditability.
- Object delete policy and cleanup verification.
- Malware scanning or generation attestation where required.

Attachment S3 support is not generated-document object-storage support.

## 11. Proposed Retention Policy Dimensions

Future policy should be explicit across these dimensions:

| Dimension | Policy need |
| --- | --- |
| Document type | Retention may differ for invoices, receipts, statements, reports, bank reconciliation reports, and future compliance artifacts. |
| Source type | Source records have different lifecycle rules and accounting significance. |
| Tenant/org | Retention and deletion must be tenant-scoped and auditable. |
| Generated status | `GENERATED`, `FAILED`, and `SUPERSEDED` need separate retention and visibility rules. |
| Compliance relevance | Tax/accounting/compliance documents may need immutable preservation. |
| Legal hold | Hold apply/release must block destructive cleanup. |
| Backup retention | Backup copies must align with live retention and deletion policy. |
| Deletion audit trail | Every destructive or superseding action must leave immutable metadata evidence. |
| No-body logging | Cleanup, retention, and hold evidence must record metadata only. |

## 12. Proposed Future Cleanup Executor Requirements

A future cleanup executor should include:

- Dry-run first and default-only mode.
- Marker/tenant/document-type/source scoped selectors.
- Explicit approval gate with exact target, counts, and exclusions.
- Backup/export prerequisite where policy requires preservation before cleanup.
- Legal-hold respect before any mutation.
- Clear soft-delete versus supersede versus hard-purge decision.
- Immutable audit log for every affected row and policy decision.
- No body output and no `contentBase64` logging.
- Hash/size verification before and after any object migration or deletion.
- Idempotent execution and interruption recovery.
- Separate local, staging, beta, and production approval boundaries.
- Rollback/restore plan before destructive action.

No such executor exists today.

## 13. Production Gap Register For Retention/Legal Hold

| Gap | Current status | Production requirement |
| --- | --- | --- |
| Generated-document retention duration | Not implemented | Accountant/legal-approved durations by document type/source/compliance relevance. |
| Legal hold | Not implemented | Apply/release workflow, enforcement, and immutable audit trail. |
| Cleanup executor | Not implemented | Dry-run-first, scoped, approval-gated executor with no body output. |
| Soft-delete or supersede policy | Status enum has `SUPERSEDED`, but no transition policy | Decide append-only/versioned versus supersede/latest behavior. |
| Hard purge policy | Not implemented | Define when hard purge is legal and how backups are handled. |
| Customer data deletion conflict | Not resolved | Privacy/accounting conflict policy and audit trail. |
| Backup retention alignment | Metadata-only readiness | Prove backup retention and restore integrity for generated documents. |
| Object lifecycle | Not implemented | Object-storage lifecycle, immutability, versioning, legal hold, and delete behavior. |
| Malware scanning/attestation | Not implemented | Define scan or safe-generation attestation before object storage scale. |
| Hosted/beta/customer-data proof | Not performed | Separate approval and no-body evidence on approved non-production targets. |

## 14. E2E Readiness Implications

Future E2E must not run destructive cleanup by default. Before cleanup or legal-hold E2E:

- Use disposable local marker data only.
- Create dedicated roles for retention view/manage permissions.
- Test dry-run counts first.
- Test legal-hold negative cleanup blockers before any destructive path.
- Keep assertions to counts, statuses, safe IDs, hashes, and audit metadata.
- Avoid PDF bytes, base64, full bodies, DB URLs, auth headers, cookies, tokens, and secrets.
- Require a separate cleanup approval and restore plan for any mutation.

## 15. Recommended Closure Summary Points

DEV-12 closure should state:

- DEV-12 proved local marker generated-document fixture, metadata/list/detail, download hash/size, and storage readiness/dry-run evidence.
- DEV-12 did not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Generated documents remain database/base64-backed in this evidence.
- Retention, legal hold, cleanup, supersession, backup retention, and object lifecycle remain open production gaps.
- Destructive cleanup requires a future policy, dry-run-first executor, exact approval, and no-body/no-secret evidence.

## 16. Recommended Next Thread

`DEV-12 Part 14: generated documents storage retention closure`
