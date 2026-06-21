# LedgerByte Product Context

## Product Identity
LedgerByte is a controlled-beta accounting workspace for GCC-focused businesses and accountants. It helps operators review invoices, payments, purchases, inventory, manual banking imports, reports, documents, roles, and readiness evidence from one signed-in product surface.

## Primary Users
- Owners and finance operators who need fast daily bookkeeping without losing the accounting trail.
- Accountants and reviewers who scan reports, source records, tax/VAT surfaces, permissions, and audit evidence.
- Internal beta operators who must keep product wording conservative until production, official compliance, and operational gates are proven.

## UX Direction
LedgerByte should feel dense, serious, compact, organized, calm, trustworthy, and optimized for repetitive finance work. The UI direction is closer to Xero, QuickBooks, and Wafeq operations surfaces than to a marketing SaaS template.

## Product Principles
- Dense but readable: prioritize scan speed, stable columns, compact controls, and predictable navigation.
- Trust through restraint: no decorative finance cliches, fake automation, unsupported compliance claims, or hidden state changes.
- Review before action: risky workflows expose evidence, status, and consequences before posting, matching, reconciling, filing, or exporting.
- Regional honesty: UAE/KSA/GCC readiness language must distinguish local review from official tax-authority or provider submission.
- Route continuity matters: list, detail, statement, report, and follow-on actions should preserve source context with existing `returnTo` patterns.

## Anti-Goals
- Do not imply live bank feeds, bank credentials, payment initiation, silent posting, silent reconciliation, public launch readiness, ZATCA certification, FTA reporting, or production compliance unless the repo explicitly implements and proves it.
- Do not simplify away accountant-facing data density where tables, filters, money columns, dates, statuses, and audit context are necessary.
- Do not rebuild backend APIs or database schema as part of the UI rebuild unless a screen cannot be truthful with current data.

## Visual Direction
Restrained light product UI with compact accounting density. Use tinted neutrals, calm teal primary actions, measured blue for information and active navigation, amber/rose/emerald states, Inter/system typography, 8px-or-less product radii, and shallow elevation only when it clarifies layering.

## Reference Products
- Xero: reconciliation visibility, correction in context, daily finance dashboard scanning.
- QuickBooks: guided setup, attention surfacing, accountant-friendly reports.
- Wafeq: GCC accounting structure, VAT/e-invoicing readiness framing, Arabic/English regional expectations.
