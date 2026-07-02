# Object Storage Validation Plan

Status: provider-agnostic plan
Date: 2026-07-02

## Scope

This plan applies to generated documents, attachments, future signed artifacts, and compliance evidence files. It does not select a provider and does not upload/download objects in this PR.

## Validation Matrix

| Check | Required proof |
| --- | --- |
| tenant path isolation | Organization A cannot list/read/write/delete Organization B object keys. |
| private by default | Objects are not public unless explicitly designed as public artifacts. |
| signed URL expiry | URLs expire at configured limits and cannot be replayed after expiry. |
| object integrity | Stored metadata includes size/hash/content type; retrieval checks metadata before use. |
| versioning | Replacement/supersession keeps audit trail or explicit supersession record. |
| lifecycle | Retention and deletion are documented and legally approved. |
| backup/restore | Bucket contents can be restored or reconciled from evidence. |
| audit trail | Upload/download/delete/signed-url actions are attributable. |

## Non-Mutating Preflight

Before a real bucket proof, run configuration checks that print booleans only:

- provider configured
- bucket configured
- region configured
- access key present
- secret key present
- signed URL TTL configured

Never print credential values.

## Blocked Items

- Real provider decision.
- Non-production test bucket.
- Legal retention/hold policy.
- Signed URL implementation proof.
