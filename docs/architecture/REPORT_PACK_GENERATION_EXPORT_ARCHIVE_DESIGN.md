# Report-Pack Generation, Export, Download, And Archive Design

Date: 2026-06-21

Updated: 2026-07-09

Goal ID: `OB-REPORT-PACK-DESIGN-01`

Status: `LOCAL_MANIFEST_GROUNDWORK`

## Current Baseline

LedgerByte now has local/test-safe report-pack manifest groundwork:

- API: `GET /reports/report-pack/manifest-preview`
- API: `POST /reports/report-pack`
- API: `GET /reports/report-pack`
- API: `GET /reports/report-pack/:id`
- API: `POST /reports/report-pack/:id/download-readiness`
- Web: `/report-packs`
- Manifest statuses: `PLANNING_ONLY`, `DRAFT`, `GENERATING`, `READY_LOCAL`, `FAILED`, `DOWNLOAD_BLOCKED`, and `EXPIRED`.
- Persisted rows store report-pack manifest metadata only: selected report kinds, period, organization, generatedAt, requestedBy, requestId, and links to existing per-report CSV/PDF routes where supported.
- Pack-level downloads are explicitly blocked until storage/archive/signed URL proof is separately approved.
- Email, scheduling, archive writes, generated-document mutation, storage mutation, provider calls, and compliance submission remain disabled.

This groundwork does not generate bundled report artifacts. It records the local manifest boundary and keeps the future workflow below as the review path before any bundle generation, storage, delivery, schedule, archive, or hosted behavior is implemented.

## Non-Goals

This groundwork does not add report body generation, bundled PDF/CSV/XLSX artifacts, pack-level downloads, email sending, scheduling, archive writes, generated-document mutation, object storage behavior, signed URLs, provider calls, compliance behavior, ZATCA/UAE/Peppol/ASP behavior, AI proposals, Inbox behavior, hosted mutations, or production recovery proof.

## Guardrails

- Object storage approval remains `BLOCKED`.
- Real object storage remains unimplemented/unproven.
- Signed URLs remain unimplemented/unproven.
- Runtime generated documents remain DB-backed unless separately changed.
- Report-pack archive writes remain blocked until storage approval.
- Download links remain blocked until signed URL behavior is proven.
- Every future execution mutation must be tenant-scoped, permission-checked, idempotent where retried, and audited.
- Future report calculations must use LedgerByte report/ledger foundations, not simplified paid-invoice or source-document shortcuts.
- Current local manifest creation is tenant-scoped and audited, but it is not hosted/customer-data production proof.

## Shared Types

Future designs can use these conceptual value types. They are not implemented by this PR.

| Type | Values |
| --- | --- |
| `ReportPackFormat` | `PDF`, `CSV`, `XLSX` |
| `ReportPackRunStatus` | `DRAFT`, `REQUESTED`, `VALIDATING`, `QUEUED`, `GENERATING`, `GENERATED`, `FAILED`, `CANCELLED`, `ARCHIVED` |
| `ReportPackArtifactStatus` | `NOT_CREATED`, `CREATED`, `ARCHIVED`, `EXPIRED`, `BLOCKED`, `FAILED` |
| `ReportPackDeliveryStatus` | `NOT_REQUESTED`, `REQUESTED`, `SENT`, `FAILED`, `CANCELLED`, `BLOCKED` |
| `ReportPackReportKind` | The existing manifest-supported report kinds, including general ledger, trial balance, profit and loss, balance sheet, VAT summary, aging, cash flow, revenue trend, top customers, and top products/services. |

## Future Domain Models

Each model below is a design sketch only. Persisted schemas, DTOs, validators, services, queues, and UI contracts require separate PRs.

### ReportPackRequest

Captures an operator's intended report-pack request before execution.

| Field | Purpose |
| --- | --- |
| `id` | Stable request identifier. |
| `organizationId` | Tenant scope. Required on every query and mutation. |
| `businessScope` | Optional branch, business unit, currency, and market filters. |
| `actorUserId` | User who drafted or submitted the request. |
| `reportKinds` | Requested report kinds from the manifest-supported list. |
| `dateRange` | Requested `from`, `to`, and/or `asOf` values. |
| `formats` | Requested `PDF`, `CSV`, and/or `XLSX` formats. |
| `status` | Request/run status, starting as `DRAFT` or `REQUESTED`. |
| `artifactReferences` | Empty until a future run produces artifacts. |
| `storageReference` | `null` until storage approval and archive behavior are separately proven. |
| `contentHash` | `null` until immutable generated content exists. |
| `createdAt`, `updatedAt`, `submittedAt` | Lifecycle timestamps. |
| `auditPayload` | Request inputs, source manifest version, user agent/IP metadata where available, and reason text. |

### ReportPackRun

Represents an execution attempt derived from a request.

| Field | Purpose |
| --- | --- |
| `id` | Stable run identifier. |
| `requestId` | Parent request. |
| `organizationId` | Tenant scope. |
| `businessScope` | Branch/business filters inherited from the request. |
| `actorUserId` | User who requested the run or system actor for an approved future schedule. |
| `reportKinds` | Kinds included in this run. |
| `dateRange` | Frozen execution range. |
| `formats` | Frozen execution formats. |
| `status` | Request/run state machine value. |
| `artifactReferences` | Produced artifact IDs, if any. |
| `storageReference` | Archive target metadata only after storage approval; otherwise `null`. |
| `contentHash` | Aggregate hash of all produced artifacts when generation succeeds. |
| `createdAt`, `updatedAt`, `startedAt`, `finishedAt` | Execution timestamps. |
| `auditPayload` | Idempotency key, manifest version, worker/job reference, validation result, failure summary, and permission snapshot. |

### ReportPackRunItem

Represents one report inside a run.

| Field | Purpose |
| --- | --- |
| `id` | Stable item identifier. |
| `runId` | Parent run. |
| `organizationId` | Tenant scope. |
| `businessScope` | Item-level branch/business filters. |
| `actorUserId` | User responsible for the parent request. |
| `reportKind` | Single report kind. |
| `dateRange` | Item-specific execution range. |
| `format` | Item output format. |
| `status` | Item generation status aligned to the run state. |
| `artifactReference` | Produced artifact ID, if any. |
| `storageReference` | `null` until archive storage is approved and written. |
| `contentHash` | Hash of this item output after generation. |
| `createdAt`, `updatedAt`, `startedAt`, `finishedAt` | Item lifecycle timestamps. |
| `auditPayload` | Source route/handler, normalized query, data basis, warning list, and failure details. |

### ReportPackArtifact

Represents an immutable generated file or bundle metadata record.

| Field | Purpose |
| --- | --- |
| `id` | Stable artifact identifier. |
| `runId` | Parent run. |
| `organizationId` | Tenant scope. |
| `businessScope` | Scope inherited from run/item. |
| `actorUserId` | User who caused generation or approved archive action. |
| `reportKind` | Single report kind or `REPORT_PACK_BUNDLE`. |
| `dateRange` | Covered reporting dates. |
| `format` | `PDF`, `CSV`, or `XLSX`. |
| `status` | Artifact state machine value. |
| `artifactReference` | Logical artifact pointer used by APIs and audit logs. |
| `storageReference` | Object storage pointer only after separately approved storage writes; otherwise `null`. |
| `contentHash` | SHA-256 or stronger hash of artifact bytes. |
| `sizeBytes`, `mimeType`, `filename` | File metadata. |
| `createdAt`, `updatedAt`, `archivedAt`, `expiresAt` | Artifact timestamps. |
| `auditPayload` | Generator version, source report hashes, retention policy, storage approval ID, and failure reason. |

### ReportPackDelivery

Represents an explicit future delivery request, such as email.

| Field | Purpose |
| --- | --- |
| `id` | Stable delivery identifier. |
| `runId` | Parent run. |
| `artifactId` | Artifact being delivered. |
| `organizationId` | Tenant scope. |
| `businessScope` | Scope inherited from the run. |
| `actorUserId` | User who explicitly requested delivery. |
| `reportKind` | Single report kind or `REPORT_PACK_BUNDLE`. |
| `dateRange` | Dates covered by the artifact. |
| `format` | Delivered artifact format. |
| `status` | Delivery state machine value. |
| `artifactReference` | Artifact pointer; required before delivery can proceed. |
| `storageReference` | Storage pointer only if archive/storage has separately been approved. |
| `contentHash` | Hash of the delivered artifact. |
| `createdAt`, `updatedAt`, `requestedAt`, `sentAt` | Delivery timestamps. |
| `auditPayload` | Recipient summary, template/version, explicit user action evidence, provider-disabled or provider-result metadata, and failure reason. |

### ReportPackEvent

Append-only audit record for request, run, artifact, delivery, schedule, and policy decisions.

| Field | Purpose |
| --- | --- |
| `id` | Stable event identifier. |
| `entityType`, `entityId` | Request/run/item/artifact/delivery/schedule reference. |
| `organizationId` | Tenant scope. |
| `businessScope` | Scope relevant to the entity. |
| `actorUserId` | User or system actor responsible for the event. |
| `reportKind` | Related report kind, if applicable. |
| `dateRange` | Related reporting dates. |
| `format` | Related output format. |
| `status` | New state or policy result. |
| `artifactReference` | Artifact pointer involved in the event, if any. |
| `storageReference` | Storage pointer involved in the event, if any. |
| `contentHash` | Hash involved in the event, if any. |
| `createdAt` | Event timestamp. |
| `auditPayload` | Before/after state, validation errors, permission result, idempotency key, approval ID, and trace/correlation IDs. |

### ReportPackSchedule

Future approved recurring request. It must not execute until scheduling is separately implemented and enabled.

| Field | Purpose |
| --- | --- |
| `id` | Stable schedule identifier. |
| `organizationId` | Tenant scope. |
| `businessScope` | Branch/business filters for each scheduled run. |
| `actorUserId` | User who created or last changed the schedule. |
| `reportKinds` | Report kinds to include in future runs. |
| `dateRange` | Relative range policy, such as previous month or quarter-to-date. |
| `formats` | Output formats requested for scheduled runs. |
| `status` | Schedule status, with delivery defaulting to `BLOCKED` until execution is separately enabled. |
| `artifactReferences` | Empty until future scheduled runs produce artifacts. |
| `storageReference` | `null` until storage approval and archive writes are separately proven. |
| `contentHash` | `null` until artifacts exist. |
| `createdAt`, `updatedAt`, `lastRunAt`, `nextRunAt`, `disabledAt` | Schedule lifecycle timestamps. |
| `auditPayload` | Recurrence rule, timezone, permission snapshot, approval metadata, and disable reason. |

## Future State Machines

### Request And Run States

Allowed states: `DRAFT`, `REQUESTED`, `VALIDATING`, `QUEUED`, `GENERATING`, `GENERATED`, `FAILED`, `CANCELLED`, `ARCHIVED`.

Expected transitions:

1. `DRAFT` to `REQUESTED` after explicit user submission.
2. `REQUESTED` to `VALIDATING` after tenant, permission, date-range, fiscal-lock, and report-kind checks begin.
3. `VALIDATING` to `QUEUED` only when validation passes.
4. `QUEUED` to `GENERATING` when a future worker starts.
5. `GENERATING` to `GENERATED` only after all required artifacts are created and hashed.
6. `REQUESTED`, `VALIDATING`, or `QUEUED` to `CANCELLED` after explicit user cancellation or policy cancellation.
7. Any non-terminal execution state to `FAILED` when validation, generation, artifact creation, or policy checks fail.
8. `GENERATED` to `ARCHIVED` only after separately approved archive storage writes succeed.

Failed and cancelled runs preserve audit history. They must not be deleted to hide validation failures, permission denials, worker failures, or user cancellations.

### Artifact States

Allowed states: `NOT_CREATED`, `CREATED`, `ARCHIVED`, `EXPIRED`, `BLOCKED`, `FAILED`.

Rules:

- Artifacts start as `NOT_CREATED`.
- `CREATED` requires generated bytes, file metadata, and content hash.
- `ARCHIVED` requires approved storage behavior and a recorded storage reference.
- `EXPIRED` means access is intentionally no longer available.
- `BLOCKED` is required when storage approval, signed URL proof, retention policy, permission, or compliance boundaries prevent an artifact action.
- `FAILED` records artifact generation or persistence failure.

### Delivery States

Allowed states: `NOT_REQUESTED`, `REQUESTED`, `SENT`, `FAILED`, `CANCELLED`, `BLOCKED`.

Rules:

- Email requires explicit user action.
- Email cannot proceed without an existing artifact reference.
- Delivery remains `BLOCKED` when provider configuration, permission, artifact, signed URL, or storage proof is missing.
- `SENT` requires provider evidence from a separately approved provider path.
- `FAILED` and `CANCELLED` preserve audit history.

## Mandatory Action Rules

- Downloads require an existing artifact.
- Email requires explicit user action.
- Archive writes require storage approval.
- Signed URLs remain blocked until separately proven.
- Failed/cancelled runs preserve audit history.
- Download links remain blocked until signed URL behavior is proven.
- Report-pack archive writes remain blocked until storage approval.
- Runtime generated documents remain DB-backed unless separately changed.

## Future API Design

Every endpoint below is future-only, tenant-scoped, permission-checked, and audited. This PR does not implement them.

| Method | Path | Future purpose | Minimum controls |
| --- | --- | --- | --- |
| `POST` | `/reports/report-pack/runs` | Create/request a run. | `reports.view` plus future run/export permission, organization scope, fiscal-lock checks, idempotency key, audit event. |
| `GET` | `/reports/report-pack/runs` | List scoped runs. | `reports.view`, organization scope, permission-filtered query, no cross-tenant rows. |
| `GET` | `/reports/report-pack/runs/:runId` | Read one run. | `reports.view`, run organization match, audit-safe response shape. |
| `POST` | `/reports/report-pack/runs/:runId/cancel` | Cancel a non-terminal run. | Explicit user action, ownership/permission check, status guard, audit event. |
| `POST` | `/reports/report-pack/runs/:runId/retry` | Retry a failed run. | Explicit user action, idempotency, failure-state guard, fresh validation, audit event. |
| `GET` | `/reports/report-pack/runs/:runId/artifacts` | List artifacts for a run. | `reports.view`, run organization match, no signed URL generation. |
| `POST` | `/reports/report-pack/runs/:runId/artifacts/:artifactId/download-link` | Request a future download link. | Existing artifact required, download permission, signed URL proof required; blocked until proven. |
| `POST` | `/reports/report-pack/runs/:runId/email` | Request email delivery. | Explicit user action, existing artifact required, provider approval required, audit event; blocked until enabled. |
| `GET` | `/reports/report-pack/schedules` | List future schedules. | `reports.view`, organization scope, permission filter. |
| `POST` | `/reports/report-pack/schedules` | Create a future schedule. | Explicit user action, scheduling permission, recurrence validation, audit event; blocked until scheduling is approved. |
| `PATCH` | `/reports/report-pack/schedules/:scheduleId` | Update a future schedule. | Organization match, permission check, optimistic concurrency, audit event. |
| `DELETE` | `/reports/report-pack/schedules/:scheduleId` | Disable/delete a future schedule. | Organization match, permission check, audit event, no deletion of historical run/event records. |

## Permission And Audit Requirements

Future implementation should split permissions so read-only preview remains separate from execution:

- Read/list: existing `reports.view`.
- Create/retry/cancel run: future explicit report-pack execution permission.
- Export/download: existing export/download permissions plus artifact ownership and signed URL proof.
- Email delivery: future delivery permission plus explicit user action.
- Scheduling: future schedule management permission.
- Archive writes: future storage/archive approval flag and storage proof gate.

Every future mutating endpoint must record a `ReportPackEvent` with organization ID, actor ID, action, previous status, next status, permission result, idempotency key where applicable, and reason/failure text.

## Storage, Download, And Archive Boundaries

Archive writes must remain blocked until storage approval is separately granted and proven. A future archive implementation must record storage approval ID, object key, provider-independent storage reference, content hash, size, retention policy, and rollback behavior.

Download links must remain blocked until signed URL behavior is separately designed, implemented, and proven. A future link endpoint must not create links for missing artifacts, expired artifacts, blocked artifacts, cross-tenant artifacts, or artifacts without verified hashes.

Runtime generated documents remain DB-backed unless separately changed. Report-pack archive work must not silently migrate generated-document storage or imply object-storage readiness.

## Failure, Retry, Idempotency, And Rollback

- Request creation should accept an idempotency key and deduplicate retries within the same organization and actor scope.
- Generation retry must create a new run attempt or append an explicit retry event; it must not overwrite the failed run history.
- Partial failures should mark failed items and the parent run as `FAILED` unless a later design supports partial-success semantics.
- Rollback must be explicit: cancel queued work, mark artifacts blocked/expired when invalidated, and preserve all audit events.
- Content hashes must be stable and recalculated after any regeneration.

## Recommended Implementation Sequence

1. Contract-only PR for future DTO/type names and state-machine tests with no routes, schema, workers, or UI behavior.
2. Add read-only run history schema/API only after schema review, permissions, and tenant-isolation tests are defined.
3. Add explicit run request API behind disabled execution gates.
4. Add generation workers only after report correctness, fiscal-lock, audit, and idempotency tests exist.
5. Add artifact metadata without download links.
6. Add signed URL/download behavior only after signed URL proof is approved.
7. Add archive writes only after object storage approval is approved and proven.
8. Add email delivery and scheduling as separate guarded PRs.

## Verification Expectations

Each future implementation PR should run the clean-room validator, production-source third-party reference scan, focused API tests for tenant isolation/permissions/audit/fiscal-lock behavior, focused web tests when UI changes, and storage/provider/compliance proof gates only when that behavior is explicitly in scope.
