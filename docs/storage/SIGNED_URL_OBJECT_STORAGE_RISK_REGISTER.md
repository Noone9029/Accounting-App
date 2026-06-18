# Signed URL Object Storage Risk Register

Date: 2026-06-19

Scope: signed URL and object-storage tenant-boundary proof design.

| Risk | Current status | Local mitigation | Remaining blocker |
| --- | --- | --- | --- |
| Signed URL issued before tenant authorization | Not implemented | Proof plan requires authorization before URL shape | Implement signed URL path and prove in staging |
| Direct object-key input accepted from requests | Not implemented | Harness contract marks direct object-key input as refused | Enforce in future API route tests |
| Cross-tenant attachment URL request | Not implemented | Attachment downloads already use `{ id, organizationId }` before content read | Add signed URL route only with equivalent tests |
| Cross-tenant generated-document URL request | Not implemented | Generated-document downloads use `{ id, organizationId }` before content read | Generated-document object storage and signed URL route remain future work |
| Generated-document object key lacks stable generated-document id | Contracted locally | Future key shape now requires `org/{organizationId}/generated-documents/{generatedDocumentId}/{safeFileName}` | Runtime object write path and hosted proof remain future work |
| Future archive URL request leaks tenant data | Not implemented | Plan requires archive ownership by organization before URL issuance | Archive object-storage model and tests |
| Object-key traversal in proof helper | Fixed locally | Validator helpers remove `..` markers and validate tenant/type prefixes | Hosted bucket policy proof |
| Public bucket or broad prefix exposure | Not proven | Harness refuses production-looking targets and documents private-bucket requirement | Provider bucket policy evidence |
| Stale signed URL after permission removal | Not implemented | TTL/revocation behavior is an explicit acceptance item | Signed URL implementation and staging proof |
| Secret or URL logging | Not implemented | Harness output records no real URLs, no secrets, no signed URL bodies | Logging tests when URL issuance exists |
| Cleanup removes unrelated objects | Not run | Harness cleanup scope is proof-run-id-only when proofRunId is valid | Staging cleanup adapter and review |
