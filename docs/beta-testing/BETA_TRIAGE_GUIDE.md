# LedgerByte Beta Triage Guide

This guide classifies beta feedback. It does not replace accountant review, legal review, security review, or production readiness approval.

## Severity Levels

### Blocker

Use when beta testing cannot continue or a tester could materially misunderstand core accounting state.

Examples:
- Cannot sign in or reach the assigned beta organization.
- Cannot create or inspect a core test record needed for the script.
- Invoice, bill, payment, ledger, or report screen shows impossible or contradictory status guidance.
- PDF/download/archive action is unusable for a required beta review item.
- Sensitive data or secrets appear in the UI, logs, screenshots, or exported output.

### High

Use when a serious issue could mislead users, create accounting risk, or damage trust.

Examples:
- Accounting correctness concern.
- Security/privacy concern.
- ZATCA wording claims or implies production submission, CSID execution, clearance/reporting, PDF/A-3, or certification.
- UI suggests real bank integration when only manual import is implemented.
- Real email sending appears enabled by default or wording implies a customer email was sent.
- Payment, invoice, bill, supplier payment, or reconciliation success guidance is missing or misleading.

### Medium

Use when the workflow can continue but the tester is likely to need support.

Examples:
- Confusing terminology.
- Empty state does not explain the next action.
- Mobile/tablet layout wraps poorly but remains usable.
- Report/filter/export copy is unclear.
- Document archive behavior is not explained clearly.

### Low

Use for polish issues that do not block understanding or completion.

Examples:
- Minor spacing inconsistency.
- Awkward but safe copy.
- Non-critical alignment issue.
- Optional link label could be clearer.

## Issue Categories

- Blocker.
- High.
- Medium.
- Low.
- UX confusion.
- Accounting correctness concern.
- PDF/document concern.
- Report wording concern.
- Performance issue.
- Mobile layout issue.
- Security/privacy concern.
- ZATCA/compliance wording concern.

## Priority Rules

- Accounting correctness concerns get priority.
- Security/privacy concerns get priority.
- ZATCA production wording claims are high priority.
- Any copy implying PDF/A-3, CSID execution, clearance/reporting, real network submission, or production compliance is high priority.
- Any copy implying live bank integration is high priority unless that feature is explicitly enabled in a later approved scope.
- Real email sending concerns are high priority because beta should not send real customer emails by default.
- Visual polish issues can be batched unless they block workflow completion or mobile usage.
- Accountant review is not complete unless a qualified accountant has reviewed the packet and findings have been recorded.

## Triage Workflow

1. Confirm the issue contains no secrets or real customer-sensitive data.
2. Assign one severity and one or more issue categories.
3. Mark whether it blocks beta usage.
4. Flag must-fix-before-beta and must-fix-before-production separately.
5. Link screenshots/videos only after redaction.
6. Route accounting correctness concerns to accountant/product review.
7. Route security/privacy concerns to security hardening review.
8. Route ZATCA/compliance wording concerns to the compliance backlog before broader beta use.
9. Batch low-severity copy/layout polish for the next UX pass.

## Current Known Non-Blockers

- Accountant review packet exists, but accountant review is still pending.
- Full smoke remains pending.
- Full E2E remains pending.
- Security runtime-role hardening remains parked until a safe Vercel environment mutation path is available.
- Production ZATCA compliance is not enabled.
- Manual bank statement import is file/paste based; live bank integration is not implemented.
