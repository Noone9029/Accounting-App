# Open PR reconciliation — 2026-07-19

Baseline: `origin/main` at `3c89122c`. Inventory was collected with `gh pr list --state open --limit 100`; every listed PR targets `main`, has an older base SHA, and had only historical June checks. No PR was closed or merged.

| PR | Classification | Diff / CI evidence | Disposition |
| --- | --- | --- | --- |
| #138 typed onboarding status | STALE_CONFLICTED | Base `5cf8a798`; head `ce40cbb9`; GitHub reports `CONFLICTING`; historical checks passed. | Owner decision; do not close without gate. |
| #129 data management planning | STALE_CONFLICTED | Base `4ddc9284`; head `7ba1c8ba`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #128 payment instructions foundation | STALE_CONFLICTED | Base `4ddc9284`; head `a2983934`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #127 payment instructions schema design | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Excluded product area; retain. |
| #126 payment instructions adoption design | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Excluded product area; retain. |
| #125 chat collaboration design | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Explicitly excluded; retain. |
| #124 custom fields design | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Retain. |
| #123 project/time design | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Explicitly excluded; retain. |
| #122 automation boundary panel | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | AI work is excluded; retain. |
| #121 automation boundary API | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | AI work is excluded; retain. |
| #120 team workspace panel | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Chat/collaboration is excluded; retain. |
| #119 export manifest panel | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Retain. |
| #118 notification summary panel | STALE_CONFLICTED | Base `4ddc9284`; head `8660e491`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #117 notification summary API | STALE_CONFLICTED | Base `4ddc9284`; head `e811d341`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #116 team workspace API | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Chat/collaboration is excluded; retain. |
| #115 collection reminder API | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Retain. |
| #114 export manifest planning API | INDEPENDENT_FUTURE_WORK | Old base `4ddc9284`; `MERGEABLE`; historical checks passed. | Retain. |
| #113 sales quote workflow API | STALE_CONFLICTED | Base `4ddc9284`; head `bd613fd9`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #112 sales invoice workflow API | STALE_CONFLICTED | Base `4ddc9284`; head `4030ce25`; `CONFLICTING`; historical checks passed. | Owner decision. |
| #50 UAE PINT-AE allowance/reverse-charge foundation | STALE_CONFLICTED | Base `2d99e42b`; head `c3a8cc94`; `CONFLICTING`; historical checks passed. | Separate compliance work; owner decision. |

## Repository posture

- `main` branch-protection endpoint returned 404 (`Branch not protected`).
- Dependabot alert API returned 403 because alerts are disabled.
- No open GitHub issues were returned.
- Existing dirty root checkout remains protected; no root file was changed.
- No equivalent-patch or superseded classification is asserted without a per-PR rebase/diff resolution. Those actions remain deferred pending owner approval.
