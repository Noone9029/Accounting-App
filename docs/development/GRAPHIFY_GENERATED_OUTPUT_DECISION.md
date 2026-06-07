# Graphify Generated Output Decision

Date: 2026-06-07
Branch: `codex/dev-12-generated-documents-storage-retention`

## Prior Stabilization Commits Found

- `788094fd` Document branch stabilization triage
- `c734ee32` Stabilize API schema product slice
- `42d09d3e` Stabilize web workflow UI slice
- `aa9af3b2` Stabilize docs status slice
- `e6a09209` Stabilize marketing readiness slice

## Paths Inspected

- `graphify-out/**`
- `apps/graphify-out/**`

## File Counts

- Files on disk: 68
- Tracked files: 0
- Untracked, not ignored before this decision: 61
- Already ignored by existing `*.log` rule: 7
- Approximate total size: 30,030,281 bytes
- Extension mix: 54 JSON files, 7 log files, 4 Markdown reports, 2 HTML graph views, 1 `.graphify_python` interpreter marker

## Safety Scan

Safe pattern scanning did not find high-confidence API key assignments, authorization header values, env connection strings, private keys, or cookie headers in the graphify output. URL-like strings appeared in 2 files, and generic source-domain words such as request, response, body, customer, email, and token appeared in generated graph/report content. The graphify detect metadata also records 12 skipped sensitive inputs.

No generated artifact bodies were printed into this decision record, and no secrets, env values, request/response bodies, or customer records are intentionally documented here.

## Decision

Decision: ignore generated output.

Rationale:

- The inspected paths are Graphify reports, graph JSON, AST/cache JSON, logs, manifests, and local analysis artifacts.
- No files under these paths are tracked.
- Tracked references to Graphify are documentation and handoff notes, not source or test dependencies.
- The artifacts can be regenerated from the repository and Graphify tooling when needed.
- The files are large enough and broad enough to be risky source-history noise.

The artifacts remain preserved on disk. They are not staged or committed by default.

## Ignore Rules

Added minimal ignore rules to `.gitignore`:

- `graphify-out/`
- `apps/graphify-out/`

The existing `*.log` rule already covered the Graphify log files, but it did not cover the generated JSON, Markdown, HTML, cache, or manifest output.

## Files Deliberately Not Committed

- `graphify-out/**`
- `apps/graphify-out/**`

No selected Graphify artifacts are required as source files, test fixtures, or docs for this stabilization branch.

## Remaining Worktree Status

After this decision is committed, regular `git status --short` should be clean. The Graphify artifacts should remain on disk and appear only as intentionally ignored generated output when status is checked with ignored files included.

## Non-Changes

- No Graphify files were deleted, moved, archived, staged, or committed.
- No API/schema/product files were staged.
- No web workflow/UI files were staged.
- No marketing/readiness files were staged.
- No ZATCA, email, provider, deployment, backup/restore, migration, seed, smoke, E2E, browser login, or production-check work was run.

Next prompt title: `LedgerByte final stabilization verification and push`
