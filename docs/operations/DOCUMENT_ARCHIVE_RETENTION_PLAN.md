# Document Archive and Retention Plan

Status: draft, needs legal review
Date: 2026-07-02

## Covered Artifacts

- generated PDFs
- generated XML/readiness artifacts
- attachments
- bank statement imports
- compliance validation outputs
- future ASP submission payloads/responses
- audit exports

## Draft Retention Posture

| Artifact | Draft retention | Notes |
| --- | --- | --- |
| accounting documents | 7 years | Subject to jurisdiction/legal review. |
| audit logs | 7 years | Existing retention settings default to long retention with purge disabled. |
| support diagnostics | 180 days | Must exclude secrets and private document bodies. |
| future ASP evidence | 7 years minimum | Provider/legal requirements must override this draft. |
| failed generated documents | 90 days | Retain enough metadata to debug without preserving bad artifacts forever. |

## Required Controls

- tenant-scoped archive records
- hash/size metadata
- immutable or versioned storage where legally required
- explicit supersession records
- export-before-purge for regulated artifacts
- legal hold flag before production use

This is not legal advice and must be reviewed before paid or production launch.
