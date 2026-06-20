# Typed Onboarding Status Contract

## Purpose

This contract defines how LedgerByte should treat typed onboarding status after the profile metadata, persistence schema, API/service foundation, and setup wizard API consumption slices.

Current feature status: `PARTIAL`.

This document does not add runtime behavior, routes, persistence changes, public tokens, provider calls, storage mutation, hosted mutation, AI behavior, compliance submission, or production readiness claims.

## Current Baseline

Typed onboarding currently has these LedgerByte-native foundations:

- Archetype metadata and checklist template metadata.
- Setup/onboarding route-registry consumers and setup progress metadata.
- Additive Prisma schema groundwork for onboarding profiles, checklists, checklist items, checklist events, and template version tracking.
- API/service behavior for profile selection, checklist generation/recompute, item complete/skip/reopen transitions, tenant scope, optional branch scope, permission checks, and event records.
- Setup wizard API consumption for loading saved profile/checklist state, updating the selected archetype, and refreshing the preview after recompute.

This is enough to support a controlled, API-backed setup wizard preview. It is not enough to mark typed onboarding `WORKING`.

## Status Meanings

`PARTIAL` means typed onboarding has real foundations but still has known operational gaps. It can be used as a guarded setup preview, but it is not a complete onboarding workflow.

`WORKING` means the setup wizard can reliably use typed onboarding in real environments with clear migration evidence, browser/API coverage, safe failure states, and status documentation.

`BLOCKED` would mean a required prerequisite fails closed or an approved guardrail is violated.

## Real-Environment Migration Strategy

Typed onboarding can move toward real-environment use only through an explicit migration runbook. This PR does not execute that runbook.

Required migration approach:

1. Confirm the target environment and approval scope before any hosted migration.
2. Review the additive onboarding schema migration and generated Prisma client from the exact commit to be deployed.
3. Capture the target database backup/snapshot or rollback evidence required by the environment owner.
4. Apply migrations only through the approved non-production or production deployment process for that environment.
5. Do not seed onboarding profiles, checklists, or checklist items during migration.
6. Treat missing profile/checklist rows as the expected default state; the setup wizard should show the safe default preview until a user explicitly saves a profile through the API.
7. Verify post-migration that no tenant receives another tenant's onboarding profile, checklist, item, or event rows.
8. Preserve onboarding event records; do not reset/delete generated onboarding rows as a convenience operation.

Rollback posture:

- The schema foundation is additive, so rollback should prefer disabling the setup wizard API consumption path or reverting the application release rather than deleting onboarding data.
- Destructive rollback of onboarding tables, rows, or event history requires separate approval.

## WORKING Promotion Criteria

Typed onboarding can move from `PARTIAL` to `WORKING` only after all of the following are true on merged `main`:

- Migration strategy is approved for the target environment and a post-migration verification record exists.
- API checks cover organization isolation, optional branch scope, permissions, actor context, allowed archetypes, recompute behavior, blocked-item fail-closed behavior, and event records.
- Web checks cover loading, empty, error, save, recompute, disabled-control, and no-profile fallback states in the setup wizard preview.
- Browser/E2E coverage proves the setup wizard can load a saved profile, change archetype, reload, and render persisted checklist state without browser durable persistence.
- The setup wizard still works when the typed onboarding API returns no profile, returns no checklist, or fails safely.
- Planned and blocked checklist items remain non-actionable unless separately implemented, proven, and approved.
- No localStorage, sessionStorage, cookies, indexedDB, URL query persistence, public token, public route, provider call, storage mutation, hosted mutation, AI proposal, auto-posting, compliance submission, or production readiness claim is introduced.
- Clean-room validation passes and production source contains no OpenBooks references.
- `docs/IMPLEMENTATION_STATUS.md` and `docs/REMAINING_ROADMAP.md` are updated with the evidence and the status change.

Until every criterion is met, the status remains `PARTIAL`.

## Explicit Non-Goals

- No public onboarding route.
- No public sales document token design.
- No generated-document object storage or signed URL behavior.
- No email, storage, bank, ASP, Peppol, UAE, ZATCA, or other provider behavior.
- No compliance submission or readiness upgrade.
- No AI proposal behavior.
- No automatic postings or accounting mutations.
- No claim that typed onboarding is production-ready.
