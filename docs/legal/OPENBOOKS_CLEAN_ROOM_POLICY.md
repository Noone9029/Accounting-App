# OpenBook MIT Reuse Policy

Date: 2026-06-20

Status: `ACTIVE_POLICY`

## Policy

OpenBook is MIT-licensed reference software and may be used as source material only under this controlled reuse policy. This supersedes the earlier clean-room-only posture, which was written before the license was verified.

The default implementation posture remains conservative: adopt behavior and UX ideas first, copy only small isolated chunks when that is better than rewriting, and preserve LedgerByte's accounting, audit, tenant, fiscal-lock, storage, provider, and compliance boundaries.

## Prohibited

- No AGPL-risk, unknown-license, or mixed-license source reuse.
- No wholesale OpenBook schema, server-action, provider, storage, compliance, or accounting-posting transplant.
- No OpenBook dependency additions unless a separate PR justifies the dependency and verifies its license.
- No production source reference to OpenBooks.
- No provider, storage, ZATCA, UAE, Peppol, ASP, hosted-service, or production-compliance claim based on OpenBook adoption.

## Allowed

- Independently written LedgerByte-native implementation.
- Small OpenBook MIT source chunks when they are isolated, reviewable, and not part of provider, storage, compliance, security, tenant-isolation, or accounting-posting trust boundaries.
- Documentation that cites OpenBook as source or inspiration.
- Behavior-level adoption of OpenBook workflows after LedgerByte-specific review.

## Required For Future Work

- Production source must not reference OpenBooks.
- Any future direct reuse must be listed in `docs/legal/OPENBOOK_MIT_ATTRIBUTION.md` before the PR is marked ready for review.
- The attribution entry must identify the OpenBook source path, upstream commit, copied/adapted LedgerByte path, license, and reason for reuse.
- Reviewers must reject unattributed source copying, large mixed ports, and copied logic that bypasses LedgerByte domain rules.
- Feature status must remain `PLANNED`, `PARTIAL`, or `BLOCKED` until LedgerByte evidence proves a bounded `WORKING` path.

## Current PR Scope

This PR is docs and validator only. It does not implement runtime OpenBook-adoption behavior, copy OpenBook code into production source, add dependencies, add migrations, change API behavior, change web UI, or change provider/compliance/storage readiness.
