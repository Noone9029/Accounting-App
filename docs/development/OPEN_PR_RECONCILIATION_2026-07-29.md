# Open PR reconciliation — 2026-07-29

## Scope and method

This is a static, read-only reconciliation of every open PR reported by GitHub at the evidence timestamp. No legacy PR, branch, title, body, reviewer, label, base, or remote branch was changed. No legacy commit was rebased, cherry-picked, pushed, merged, or closed.

Baseline: `origin/main` = `e5fa6dbb126e693ea82aa1ced923470da3831097`.

Inventory method:

1. Fetched all remotes, tags, and pruned references; verified the live main SHA.
2. Queried the GitHub REST pulls inventory and each PR's complete changed-file list, metadata, review count, and commit-status summary.
3. Compared each original base/head patch, current `origin/main`, affected schema/routes/permissions, and current product/readiness evidence.
4. Searched current main for direct and semantic replacements. A semantic replacement is not treated as a byte-identical patch.

All 20 PRs have one commit, zero reviews, and two successful historical status contexts. All are behind current main. Eight are conflicted (`#50`, `#112`, `#113`, `#117`, `#118`, `#128`, `#129`, `#138`); the remaining 12 are mergeable only in the stale `behind` state. None of the heads is an ancestor of current main, so there are no direct patch-already-merged claims.

## Classification summary

| Primary classification | Count | PRs |
| --- | ---: | --- |
| `PATCH_ALREADY_IN_MAIN` | 0 | — |
| `SUPERSEDED_BY_CURRENT_MAIN` | 6 | #112, #113, #115, #117, #118, #138 |
| `OBSOLETE_PLANNING_ONLY` | 3 | #126, #127, #129 |
| `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE` | 7 | #121, #122, #123, #124, #125, #116, #120 |
| `UNIQUE_CANDIDATE_FOR_FRESH_REIMPLEMENTATION` | 3 | #114, #119, #128 |
| `REQUIRES_SECURITY_OR_ACCOUNTING_REVIEW` | 1 | #50 |
| `REQUIRES_OWNER_DECISION` | 0 | — |

## PR-by-PR evidence

`Historical checks` means the two successful commit-status contexts currently reported by GitHub; it is not proof against current main. `Exact patch` is false for all rows because no old head is reachable from current main. URLs are `https://github.com/Noone9029/Accounting-App/pull/<number>`.

| PR | Patch / metadata evidence | Primary classification and flags | Current-main replacement or conflict evidence | Unique behavior and recommended disposition | Owner approval |
| --- | --- | --- | --- | --- | --- |
| #138 typed onboarding status contract | Base `5cf8a798`, head `ce40cbb9`; 5 files, docs only; conflicted. | `SUPERSEDED_BY_CURRENT_MAIN`; `DOCS_ONLY`, `CONFLICTED`. | Current typed onboarding is implemented in `apps/web/src/lib/typed-onboarding.ts`, `typed-onboarding-guidance.ts`, selector/state code, and the setup wizard; it carries current controlled-beta wording. | Old documentation contract is stale. Close as superseded; retain only as historical design evidence. | Closure gate only. |
| #129 data-management settings planning route | Base `4ddc9284`, head `7ba1c8ba`; 8 files; conflicted. | `OBSOLETE_PLANNING_ONLY`; `FRONTEND_ONLY`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | Its read-only planning page predates current storage, document, audit-log, export, and protected route-inventory governance. It would require route catalog, permission, and UI inventory rework. | No executable import/export behavior. Close as obsolete planning; future tenant portability work must start from current storage/audit/export seams. | Closure gate only. |
| #128 payment-instructions schema foundation | Base `4ddc9284`, head `a2983934`; 3 files; conflicted; adds a migration, three tables, enums, FK/index design. | `UNIQUE_CANDIDATE_FOR_FRESH_REIMPLEMENTATION`; `SCHEMA_OR_MIGRATION`, `TENANT_RELEVANT`, `ACCOUNTING_RELEVANT`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | Current schema has no `PaymentInstruction*` models. The old `20260621100000` migration is not in main but cannot be accepted unchanged after later document, generated-document, bank-payment, tenancy, and audit work. | Preserve as requirements only. Do not merge. Fresh ticket: **Design tenant-scoped payment-instruction lifecycle from current document and bank-profile models**. | Closure gate only. |
| #127 payment-instructions schema design | Base `4ddc9284`, head `d554c0d8`; 2 docs/test files; mergeable but behind. | `OBSOLETE_PLANNING_ONLY`; `DOCS_ONLY`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | Design assumes the unmerged #128 schema and old OpenBook adoption framing. | Close as obsolete design; extract only validated requirements during the fresh #128 replacement. | Closure gate only. |
| #126 payment-instructions adoption design | Base `4ddc9284`, head `d382a923`; 2 docs/test files; mergeable but behind. | `OBSOLETE_PLANNING_ONLY`; `DOCS_ONLY`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | It is a design-only predecessor to #127/#128, not LedgerByte runtime behavior. | Close as obsolete design evidence. | Closure gate only. |
| #125 chat/collaboration adoption design | Base `4ddc9284`, head `4a4b7aa1`; 2 docs/test files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `DOCS_ONLY`, `OPENBOOK_ADOPTION`. | No KSA-first subscription, ZATCA, or UAE compliance dependency was found. | Close; retain historical design only. Future ticket only if an owner chooses collaboration as a product lane. | Closure gate only. |
| #124 custom-fields adoption design | Base `4ddc9284`, head `48658df3`; 2 docs/test files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `DOCS_ONLY`, `OPENBOOK_ADOPTION`. | No release-critical dependency on a generic custom-field engine was found; broad custom fields could affect audit/compliance semantics. | Close; preserve the concept only. | Closure gate only. |
| #123 project/time-tracking adoption design | Base `4ddc9284`, head `d7ddc9ae`; 2 docs/test files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `DOCS_ONLY`, `OPENBOOK_ADOPTION`. | Current roadmap prioritizes subscription lifecycle and country compliance, not project/time tracking. | Close; preserve historical design only. | Closure gate only. |
| #122 automation proposal boundary panel | Base `4ddc9284`, head `250f84b7`; 4 files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `FRONTEND_ONLY`, `SECURITY_RELEVANT`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | Panel depends on #121 and old type definitions; current main has only narrowly scoped reviewed bank-import proposal language. | Close as out of scope. Any future automation UI must follow current audit, tenancy, and human-review boundaries. | Closure gate only. |
| #121 automation proposal boundary API | Base `4ddc9284`, head `ccd5110f`; 8 files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `API_READ_ONLY`, `SECURITY_RELEVANT`, `TENANT_RELEVANT`, `OPENBOOK_ADOPTION`. | Old module/controller/service is absent from main and not required by the commercial roadmap. Its proposed AI boundary predates current security and audit posture. | Close; do not reuse directly. A future automation proposal service needs a separate owner-approved security/audit design. | Closure gate only. |
| #120 team workspace summary panel | Base `4ddc9284`, head `6704fb34`; 4 files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `FRONTEND_ONLY`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | Depends on #116 API and does not support current subscription/compliance lanes. | Close; retain as historical UI idea only. | Closure gate only. |
| #119 data export manifest panel | Base `4ddc9284`, head `f48e4b57`; 4 files; mergeable but behind. | `UNIQUE_CANDIDATE_FOR_FRESH_REIMPLEMENTATION`; `FRONTEND_ONLY`, `TENANT_RELEVANT`, `SECURITY_RELEVANT`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | Current main has tenant-scoped report/audit CSV and document export proof, not a generalized manifest UI. The old panel depends on #114 and stale types. | Do not merge. Fresh ticket: **Tenant data-export manifest UX over current audited export contracts**. | Closure gate only. |
| #118 notification-center summary panel | Base `4ddc9284`, head `8660e491`; 4 files; conflicted. | `SUPERSEDED_BY_CURRENT_MAIN`; `FRONTEND_ONLY`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | `apps/web/src/components/app-shell/topbar.tsx` already supplies a notification menu from `/dashboard/summary` attention items, with accessibility tests. | Close as superseded. | Closure gate only. |
| #117 notification-center summary API | Base `4ddc9284`, head `e811d341`; 5 files; conflicted. | `SUPERSEDED_BY_CURRENT_MAIN`; `API_READ_ONLY`, `TENANT_RELEVANT`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | Current dashboard summary powers the topbar attention UI; email/outbox notification support and permissions have since evolved independently. | Close as superseded rather than grafting the stale endpoint. | Closure gate only. |
| #116 team workspace summary API | Base `4ddc9284`, head `52ee2be7`; 5 files; mergeable but behind. | `UNIQUE_BUT_OUT_OF_CURRENT_SCOPE`; `API_READ_ONLY`, `TENANT_RELEVANT`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | No current commercial dependency; #120 is its only open-PR consumer. | Close as out of scope. | Closure gate only. |
| #115 collection-reminder candidate API | Base `4ddc9284`, head `d499a9e6`; 5 files; mergeable but behind. | `SUPERSEDED_BY_CURRENT_MAIN`; `API_READ_ONLY`, `TENANT_RELEVANT`, `ACCOUNTING_RELEVANT`, `OPENBOOK_ADOPTION`. | Current collections routes/services and dashboard attention/collection evidence provide the contemporary follow-up path; old reminder-candidate summary is not the current workflow contract. | Close as superseded; any automatic reminder execution remains a separately reviewed lane. | Closure gate only. |
| #114 export-manifest planning API | Base `4ddc9284`, head `9019c06d`; 7 files; mergeable but behind. | `UNIQUE_CANDIDATE_FOR_FRESH_REIMPLEMENTATION`; `API_READ_ONLY`, `TENANT_RELEVANT`, `SECURITY_RELEVANT`, `DEPENDS_ON_ANOTHER_OPEN_PR`, `OPENBOOK_ADOPTION`. | Current main has report/audit exports and tenant-isolation proofs, not the proposed generalized manifest API. The old module predates current redaction/audit and storage boundaries. | Do not merge. Fresh ticket: **Audited tenant-export manifest service using current export and retention boundaries**. | Closure gate only. |
| #113 sales-quote workflow summary API | Base `4ddc9284`, head `bd613fd9`; 5 files; conflicted. | `SUPERSEDED_BY_CURRENT_MAIN`; `API_READ_ONLY`, `ACCOUNTING_RELEVANT`, `TENANT_RELEVANT`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | Current quote detail/workflow pages, generated-document support, permission audit, and sales-domain service are the maintained workflow surface. | Close as superseded; do not introduce an obsolete parallel summary contract. | Closure gate only. |
| #112 sales-invoice workflow summary API | Base `4ddc9284`, head `4030ce25`; 5 files; conflicted. | `SUPERSEDED_BY_CURRENT_MAIN`; `API_READ_ONLY`, `ACCOUNTING_RELEVANT`, `TENANT_RELEVANT`, `CONFLICTED`, `OPENBOOK_ADOPTION`. | Current sales-invoice detail, posting/payment, generated-document, permission, and ZATCA safety behavior is materially newer than the old summary endpoint. | Close as superseded; any new summary must derive from current accounting and compliance states. | Closure gate only. |
| #50 UAE PINT-AE allowance/reverse-charge foundation | Base `2d99e42b`, head `c3a8cc94`; 15 files; conflicted; changes package code/tests and readiness docs. | `REQUIRES_SECURITY_OR_ACCOUNTING_REVIEW`; `UAE_RELEVANT`, `ACCOUNTING_RELEVANT`, `COMMERCIAL_SAAS_RELEVANT`, `CONFLICTED`. | Current UAE package has later PINT-AE serializer/readiness work and explicitly blocks reverse-charge and allowance/discount scenarios pending source-backed mappings. The exact old fixtures/functions are absent, while current UAE docs state that current mappings remain unresolved. | Do not merge or treat as compliance proof. Preserve tests as requirement candidates. Fresh UAE ARC must first make a PINT-AE version decision, validate tax categories/units/transaction flags/allowances against official artifacts, and select an ASP boundary. | Owner must approve any future UAE implementation scope; closure still separately gated. |

## Chain findings

| Chain | Finding | Recommendation |
| --- | --- | --- |
| #126 → #127 → #128 payment instructions | Two design-only PRs feed one stale migration. Merging any subset leaves dead design, missing runtime, or an unsafe schema island. | Close all after the closure gate; create one fresh current-main design/implementation ticket if payment instructions become a priority. |
| #121 → #122 automation proposal | Panel requires the unmerged API and stale types. | Close both as out of scope; do not merge either independently. |
| #116 → #120 team workspace | Panel has no independent maintained API contract. | Close both as out of scope. |
| #117 → #118 notification center | Current dashboard-attention topbar replaces the old pair. | Close both as superseded. |
| #114 → #119 → #129 export/data management | Planning API/panel and planning route are not an executable portability feature and predate current export/audit/storage proof. | Close the old chain; retain #114/#119 requirements for one future audited export-manifest ticket. |
| #112 and #113 sales summaries | Both add stale parallel contracts over accounting state. | Close as superseded; do not reintroduce the contracts without a current accounting/compliance design. |
| #123, #124, #125 OpenBook design ideas | Planning-only concepts outside the immediate KSA-first commercial scope. | Close as out of scope; retain historical references only. |

## UAE PR #50 review

PR #50 uniquely adds document- and line-level allowance fixtures, negative/excess/missing-reason checks, allowance validation/serialization scaffolding, and a deliberately blocked reverse-charge scenario. That is valuable historical requirement evidence, but not safe code to merge:

- It predates later UAE package, organization-readiness, ASP, serializer, and controlled-beta documentation decisions.
- The current package intentionally keeps allowance/discount and reverse-charge cases blocked pending source-backed official mappings; the old branch's exact functions and error codes are not current-main behavior.
- The old work does not settle the currently required PINT-AE version decision, official tax-category semantics, unit mappings, allowance reason-code mapping, transaction flags, provider/ASP payload contract, or legal/compliance review.
- Its tests can seed a future requirements matrix, but must be re-authored and validated against the selected official artifacts rather than copied as compliance proof.

Proposed future ticket: **UAE: source-backed PINT-AE allowances, tax categories, transaction flags, and ASP contract decision**.

## Stop condition

This reconciliation document does not authorize PR closure. The next possible closure action remains gated by the exact standalone owner phrase `APPROVE STALE PR CLOSURE`.

## Closure evidence — 2026-07-30

The owner supplied the exact standalone approval phrase `APPROVE STALE PR CLOSURE`. Before any hosted mutation, all 20 legacy PR heads were re-fetched and matched the head SHAs recorded in the JSON evidence.

- Closed as approved: #112, #113, #115, #116, #117, #118, #120, #121, #122, #123, #124, #125, #126, #127, #129, and #138.
- Retained open: #50 (security/accounting review), #114, #119, and #128 (fresh-reimplementation candidates).
- Final live open-PR count: 4.
- No legacy PR was merged, rebased, pushed, or otherwise changed beyond its approved closure and one factual closure comment. No remote branch was deleted.
