# Generated Document Object Storage Risk Register

Date: 2026-06-19

Scope: generated-document object-storage implementation contract. This risk register is local-only design evidence and does not enable object storage, signed URLs, schema changes, hosted storage, or production compliance behavior.

| Risk | Impact | Current mitigation | Remaining gap | Future proof requirement |
| --- | --- | --- | --- | --- |
| Cross-tenant generated document access | Tenant data exposure through metadata or body bytes | API get/download use `{ id, organizationId }`; controller requires generated-document permissions | Hosted/customer-data behavior not proven | Synthetic Tenant A/B staging proof for metadata, content, and denied body access |
| Object key guessing | Bypasses API if bucket policy is weak | Current generated documents are DB-backed; future contract forbids direct object-key input | Bucket policy proof absent | Tenant A guessed-key access denied by provider and API |
| Path traversal | Unsafe filenames could create confusing object paths | Validator and attachment S3 helpers remove `..`; generated-document future key helper is covered locally | Runtime generated-document object write path absent | Object-key tests for hostile filenames in future write path |
| Metadata/content mismatch | Download returns wrong body for row metadata | Current DB row stores hash and size with body | Object metadata split not implemented | Hash equivalence checks before and after upload |
| Hash mismatch | Corrupt or substituted object goes undetected | Current archive path stores SHA-256 in `contentHash` | No object-backed retrieval verification | Migration/restore proof verifies SHA-256 and content length |
| DB metadata/object storage split-brain | Metadata points to missing or orphaned object | Contract requires failed-row/orphan handling | No implementation exists | Simulated upload/metadata failure tests and repair plan |
| Stale signed URL after permission removal | User keeps access after role/source access changes | Signed URLs are not implemented; plan requires short TTL | Revocation posture not proven | Signed URL proof with permission-change scenario before production use |
| Bucket policy misconfiguration | Broad read/list exposes tenant objects | No hosted bucket is touched in this pass | Provider policy evidence absent | Dedicated staging bucket policy review and direct-access denial proof |
| Public bucket exposure | Public object reads expose financial documents | Contract forbids public bucket assumptions | Hosted provider proof absent | Public list/read denied at bucket and object levels |
| Migration partial failure | Some docs object-backed, some DB-backed, unclear rollback | Current migration plan is dry-run/count-only | No migration executor or dual-read period | Staging batch migration with rollback to DB content |
| Backup/restore failure | Archive body cannot be restored after DB cleanup | DB content is not deleted today | Object-body backup/restore proof absent | Restore proof before any DB content deletion |
| Legal hold/retention conflict | Cleanup deletes evidence that should be retained | Current rows remain append-only DB-backed | Legal hold/retention model absent | Owner/legal/accounting-approved retention and cleanup policy |
| Future provider artifact leakage | ZATCA/UAE provider payloads leak through generic document path | Current PDF/A-3 boundary is metadata-only; provider artifacts are future/gated | Provider artifact object model absent | Separate compliance rail with body redaction and provider evidence |
| KSA/UAE artifact cross-edition leakage | Wrong market sees active compliance artifacts or claims | Contract requires future KSA/UAE edition gates and Generic neutrality | No object-backed compliance artifact rail exists | Edition-gated tests before future compliance artifact storage |
