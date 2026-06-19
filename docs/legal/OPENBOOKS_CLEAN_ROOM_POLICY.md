# OpenBooks Clean-Room Policy

Date: 2026-06-19

Status: `ACTIVE_POLICY`

## Policy

OpenBooks must be treated as AGPL-risk reference material. It may inform high-level behavioral planning only. It must not be used as source material for LedgerByte implementation.

## Prohibited

- No direct copying.
- No translated copying.
- No copied schemas, comments, UI text, file names, function names, implementation structure, or distinctive strings.
- No OpenBooks dependencies.
- No source vendoring, source import, source port, or source-derived implementation.
- No production source reference to OpenBooks.

## Allowed

- Independently written behavior specs.
- LedgerByte-native implementation after docs/spec approval.
- Documentation that cites OpenBooks only as behavioral inspiration, not as source.
- Future implementation PRs that state they are clean-room reimplementations.

## Required For Future Work

- Production source must not reference OpenBooks.
- Any future direct reuse requires explicit legal approval before code is viewed, copied, imported, vendored, translated, ported, or reused.
- Implementation PRs must confirm clean-room reimplementation and list the LedgerByte-native files changed.
- Reviewers must reject any implementation PR that contains OpenBooks code, schemas, comments, UI text, names, file layout, or implementation structure.
- Feature status must remain `PLANNED`, `PARTIAL`, or `BLOCKED` until LedgerByte evidence proves a bounded `WORKING` path.

## Current PR Scope

This PR is docs and validator only. It does not implement runtime OpenBooks-adoption behavior, copy OpenBooks code, fetch OpenBooks source, add dependencies, add migrations, change API behavior, change web UI, or change provider/compliance/storage readiness.
