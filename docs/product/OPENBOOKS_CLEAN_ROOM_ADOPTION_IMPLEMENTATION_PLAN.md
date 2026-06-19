# OpenBooks Clean-Room Adoption Implementation Plan

Date: 2026-06-19

Status: `PLANNED`

## Executive Summary

LedgerByte may adopt selected accounting-product behaviors inspired by OpenBooks only through a clean-room process. This PR creates planning, policy, evidence, and validator guardrails. It does not implement runtime product behavior, add routes, add Prisma migrations, change API modules, change web UI, add dependencies, fetch source, or copy code.

The target outcome is a LedgerByte-native roadmap for ledger-first accounting, exception-first review, deterministic bookkeeping before AI, AI proposals that cannot post, report packs built from ledger lines, typed onboarding, honest integration health, document review through Inbox, and evidence-first acceptance packs.

## Clean-Room Rule: Adopt Behaviors, Not Code

OpenBooks is AGPL-risk behavioral inspiration only. LedgerByte must not copy OpenBooks code, schemas, comments, UI text, file structure, implementation details, or distinctive strings. Every future implementation must be independently specified, independently written, and fitted to LedgerByte's existing architecture.

## Hard Guardrails

| Area | Guardrail |
| --- | --- |
| Scope | Planning, docs, and validator only in this PR. |
| Runtime | No API, web UI, Prisma migration, Convex, or product behavior change. |
| Source | Do not fetch, vendor, import, translate, port, or reuse OpenBooks source. |
| Claims | Keep every OpenBooks-adoption feature `PLANNED`, `PARTIAL`, or `BLOCKED` until separately evidenced. |
| Compliance | Do not claim production UAE, ZATCA, Peppol, ASP, object-storage, or signed-URL readiness. |
| Storage | Generated-document object storage approval remains `BLOCKED`; runtime generated documents remain database-backed. |
| Hosting | Vercel remains beta/user-testing/staging only, not final production hosting. |
| AI | AI may propose future actions but must not post journals, mutate ledgers, or bypass deterministic validation. |

## What LedgerByte Should Adopt From OpenBooks

| Behavior | LedgerByte-native intent | Current status |
| --- | --- | --- |
| Ledger-first accounting | Make posted journal lines the source for statements, reports, and audit trails. | `PLANNED` |
| Exception-first Inbox | Route ambiguous imports, document review, failed matches, and human decisions into a review queue. | `PLANNED` |
| Deterministic bookkeeping pipeline | Normalize, validate, match, classify, propose, approve, and post through explicit stages. | `PLANNED` |
| AI proposal boundary | Let AI suggest classifications or explanations, but require deterministic validation and human/system approval before posting. | `PLANNED` |
| Ledger-line report pack | Build report packs from ledger lines and documented report definitions. | `PLANNED` |
| Typed onboarding checklist | Represent setup progress as typed requirements, blockers, warnings, and evidence. | `PLANNED` |
| Degraded-mode honesty | Show provider and integration limitations explicitly when integrations are disabled, mocked, or unproven. | `PLANNED` |
| App shell route registry | Centralize route metadata, commands, permissions, and global-search surfaces. | `PLANNED` |
| Document review through Inbox | Treat receipts and generated documents as reviewable evidence tied to accounting state. | `PLANNED` |
| Evidence-first acceptance packs | Close each implementation PR with status, tests, screenshots/evidence, and remaining blockers. | `PLANNED` |
| Disposable test-business fixtures | Use controlled synthetic organizations and marker-scoped fixtures for review evidence. | `PLANNED` |

## What LedgerByte Must Not Adopt

- OpenBooks source code, schemas, comments, UI text, file names, function names, file layout, or implementation structure.
- OpenBooks dependencies or source checkout.
- AGPL-contaminating direct reuse.
- Any runtime claim that a future adoption feature is `WORKING` without LedgerByte evidence.
- No route, endpoint, Prisma model, or UI copied from OpenBooks.
- Any compliance, provider, object-storage, signed-URL, UAE, ZATCA, Peppol, or ASP readiness claim not already proven in LedgerByte.

## Target LedgerByte Architecture

The future implementation should use LedgerByte-native bounded contexts, NestJS services/controllers, Prisma models only after approved schema design, Next.js app-shell metadata, existing permission checks, and existing evidence docs. New work should remain feature-flagged or hidden until each path has tests and evidence.

## Proposed Bounded Contexts

| Context | Responsibility | Initial implementation posture |
| --- | --- | --- |
| `inbox` | Review queue for import exceptions, document-review items, integration failures, and approval tasks. | Future DB/API/UI after route registry. |
| `bookkeeping-pipeline` | Deterministic stage machine for normalization, matching, classification, approval, and posting. | Future service behind tests. |
| `ai-proposals` | AI-suggested classifications and explanations that never post directly. | Future proposal records and approval boundary. |
| `report-pack` | Versioned report packs generated from ledger lines and report definitions. | Future read-only service first. |
| `integration-health` | Provider capability, disabled-mode, degraded-mode, and evidence state. | Future read-only health surfaces. |
| `onboarding` | Typed setup requirements, blockers, warnings, and evidence. | Future extension of existing setup surfaces. |
| `document-review` | Receipt/generated-document review state routed through Inbox. | Future review items linked to documents and source records. |

## Future Prisma Model Sketches

Planning only. Do not implement these models in this PR.

```prisma
// Future planning sketch only.
model InboxItem {
  id             String
  organizationId String
  sourceType     String
  sourceId       String?
  category       String
  status         String
  priority       String
  assignedToId   String?
  evidenceJson   Json?
  createdAt      DateTime
  updatedAt      DateTime
}

// Future planning sketch only.
model BookkeepingPipelineRun {
  id             String
  organizationId String
  sourceType     String
  sourceId       String
  status         String
  stage          String
  deterministic  Boolean
  evidenceJson   Json?
  createdAt      DateTime
  updatedAt      DateTime
}

// Future planning sketch only.
model AiProposal {
  id             String
  organizationId String
  inboxItemId    String?
  proposalType   String
  status         String
  proposedJson   Json
  acceptedById   String?
  rejectedById   String?
  createdAt      DateTime
  updatedAt      DateTime
}

// Future planning sketch only.
model ReportPackRun {
  id             String
  organizationId String
  reportPackType String
  sourceLedgerHash String?
  status         String
  evidenceJson   Json?
  createdAt      DateTime
}
```

## Future API Endpoint Sketches

Planning only. Do not implement these endpoints in this PR.

| Endpoint sketch | Purpose | Notes |
| --- | --- | --- |
| `GET /inbox/items` | List review items. | Must be tenant-scoped and permission-checked. |
| `POST /inbox/items/:id/resolve` | Resolve a review item. | Must not post journals unless tied to an approved deterministic operation. |
| `POST /bookkeeping-pipeline/runs` | Start a deterministic run. | Future dry-run and execute boundary required. |
| `GET /ai-proposals` | List AI proposals. | Proposals are not accounting facts. |
| `POST /ai-proposals/:id/accept` | Accept a proposal into a deterministic path. | Acceptance must not bypass validation. |
| `POST /report-packs` | Generate a report pack. | Must derive from ledger lines and report definitions. |
| `GET /integration-health` | Show provider capability and degraded-mode state. | Must state unproven providers honestly. |
| `GET /onboarding/checklist` | Return typed setup progress. | Future extension of existing setup checklist. |

## Proposed UI Surfaces

- Inbox list with filters for exceptions, documents, imports, integration health, and approvals.
- Inbox detail panel with evidence, source links, proposed actions, and explicit blockers.
- Pipeline run detail with stage history, deterministic decisions, and failure evidence.
- AI proposals panel that labels suggestions as proposals and blocks direct posting.
- Report pack generation and history page.
- Integration health page showing enabled, disabled, degraded, mocked, blocked, and unproven states.
- Typed onboarding checklist using existing LedgerByte setup surfaces.
- App shell route registry and command palette metadata for routes and actions.
- Document/receipt review screens entered through Inbox rather than standalone hidden flows.

## Proposed PR Roadmap

1. Clean-room docs and validator.
2. App shell route registry.
3. Typed onboarding.
4. Report-pack service.
5. Inbox DB/API.
6. Inbox UI and keyboard/batch flow.
7. Deterministic pipeline.
8. AI proposal boundary.
9. Ask AI panel.
10. Integration health/degraded mode.
11. Document/receipt review through Inbox.
12. Evidence-pack validator and sprint closure.

## Definition Of Done

- Clean-room policy is present and linked from implementation docs.
- Validator passes and blocks OpenBooks references in production source.
- Status docs say adoption is `PLANNED` only.
- No runtime behavior, Prisma migration, API route, web route, provider call, hosted mutation, or dependency is added.
- No OpenBooks code is copied or referenced from production source.
- Compliance and storage blockers remain unchanged.

## Definition Of PARTIAL

Future implementation may be `PARTIAL` only when LedgerByte-native code exists, tests pass for a bounded path, feature status is documented, and remaining blockers are explicit.

## Definition Of BLOCKED

Future implementation must be `BLOCKED` when required legal approval, schema approval, provider evidence, storage proof, compliance proof, test evidence, or owner sign-off is missing.

## Verification Commands

- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `corepack pnpm verify:openbooks-clean-room`
- `git diff --check`
- `git diff --cached --check` after staging
- Existing docs/static guard if available for the final diff.

## Remaining Blockers

- Legal review of any future direct reuse request, if one is proposed.
- Approved LedgerByte-native specs before implementation PRs.
- App shell route registry design approval.
- Prisma schema design approval before any Inbox or proposal models.
- Accountant review for report-pack definitions.
- AI safety and audit policy for proposal handling.
- Generated-document object storage approval remains `BLOCKED`.
- Real object storage and signed URLs remain unimplemented and unproven.
- UAE/ZATCA/Peppol/ASP production readiness remains blocked unless separately proven.

## Next Recommended Codex Goal

Implement the app shell route registry as a LedgerByte-native foundation for future Inbox, onboarding, report-pack, and command surfaces, without adding OpenBooks source, dependencies, copied text, or runtime accounting behavior.
