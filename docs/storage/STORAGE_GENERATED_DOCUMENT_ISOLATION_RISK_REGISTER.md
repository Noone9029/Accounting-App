# Storage Generated Document Isolation Risk Register

Date: 2026-06-19

Scope: local-only uploaded attachment and generated-document tenant isolation.

2026-06-19 implementation-plan update: `docs/storage/GENERATED_DOCUMENT_OBJECT_STORAGE_IMPLEMENTATION_PLAN.md` now defines the generated-document object-storage implementation path. The path is DB-fallback-first, disabled by default, generated-document-id anchored, and staging-proof-gated. Generated-document object storage and signed URLs are still not enabled.

| Risk | Current status | Local mitigation | Remaining blocker |
| --- | --- | --- | --- |
| Cross-tenant attachment metadata access | Locally tested through organization-scoped queries | Attachment list/get/download use `organizationId`; detail metadata excludes `contentBase64` | Hosted proof with synthetic tenants |
| Cross-tenant attachment content access | Locally tested | Download looks up `{ id, organizationId }` before reading storage | Hosted object-storage and bucket policy proof |
| Cross-tenant attachment mutation | Locally tested | Update and soft-delete load attachment by organization before mutation | Hosted proof and audit evidence |
| Unsafe attachment source linking | Locally tested | Upload checks supported source records by `{ id, organizationId }` | Broader hosted source-record proof |
| S3 object-key traversal markers | Fixed locally | Filename portion removes `..` before key construction | Bucket policy and object-store behavior proof |
| Direct object-key guessing | Not proven in hosted storage | API requires metadata authorization; keys include org and attachment IDs | Provider bucket policy proof |
| Generated-document metadata/content guessed IDs | Locally tested | Get/download use `{ id, organizationId }` before returning metadata/content | Hosted proof with synthetic generated documents |
| Generated-document archive source ownership | Fixed locally for supported source types | Archive creation checks supported source records by `{ id, organizationId }` | Coverage for future unsupported source types as they are promoted |
| Generated-document object storage | Not implemented | Readiness warns generated documents remain database-backed | Design object keys, writes, reads, migration, backup/restore |
| Generated-document object-storage contract | Locally documented | `GENERATED_DOCUMENT_OBJECT_STORAGE_CONTRACT.md` requires generated-document-id anchored keys, authorization before key/URL resolution, hash verification, migration rollback, and edition gates | Runtime implementation, schema decision, staging bucket proof, and owner sign-off |
| Signed URLs | Not implemented | Local proof harness now records authorization-before-URL, no direct object-key input, TTL/audit requirements, and staging gates | Implement signed URL route/provider support and prove with synthetic staging tenants |
| Signed URL proof harness guardrails | Locally tested | Dry-run output reports no real URL generation, no hosted storage touch, staging allow/proofRunId gates, and production-looking target refusal | Hosted proof still needs approved staging bucket and credentials |
| Compliance archive body storage | Metadata-only in current local compliance path | Metadata rows are organization-scoped; no body persisted here | Future artifact body storage and retention design |
| Backup/restore tenant boundary | Not proven | None in this local pass beyond metadata scoping | Approved backup/restore proof |
| Retention/legal hold/malware scanning | Not implemented/proven | Explicitly blocked in docs | Legal/security/accounting review and implementation |
| Generated-document object-read cutover | Not implemented | Implementation plan requires object reads disabled until write/hash proof passes and DB fallback is proven | Future local fake-adapter tests and staging proof |
| Generated-document metadata migration | Not implemented | Current schema can support minimal object metadata, but richer lifecycle/proof fields are future-only | Explicit schema/migration approval if missing metadata is required |
