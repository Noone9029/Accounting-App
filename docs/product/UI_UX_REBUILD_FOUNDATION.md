# LedgerByte UI/UX Rebuild Foundation

## Direction
LedgerByte is moving toward a dense accounting operations interface: fast scanning, restrained visual styling, accountant-first review states, and explicit action boundaries. This foundation slice creates design context and shared UI primitives before page-by-page migration.

## Screen Inventory
- Public and auth: marketing pages, Arabic variants, login, register, invite accept, password reset.
- Shell: desktop sidebar, mobile first-workflow nav, global search, global create, organization switcher, topbar route context.
- Onboarding: guided setup, dashboard first-workflow card, setup fallback.
- Core accounting: dashboard, sales lists/forms/details, purchases lists/forms/details, customer/supplier/contact workspaces.
- Banking: bank accounts, statement imports, statement transaction review, rules, deposits, cheques, transfers, reconciliations.
- Reports: index, GL, trial balance, P&L, balance sheet, VAT summary/return, aged AR/AP, inventory reports.
- Controls: roles/team, organization, numbering, documents, storage, email, compliance, banking accounting, audit logs.

## Token Inventory
- Color: `ink`, `workspace`, `panel`, `line`, `mist`, `steel`, `sidebar`, `accent`, `palm`, `palm-dark`, `amber`, `rosewood`, `info`.
- Typography: Inter/system sans for product UI; tabular monospace treatment for money, account codes, dates, document numbers, and totals.
- Shape: `rounded-md` for controls and repeated panels; avoid radii above 8px in signed-in product surfaces.
- Elevation: `shadow-panel` for stable containers and `shadow-lift` for hoverable repeated items only.
- State: success, warning, danger, info, draft, neutral. State labels must include text, not color alone.

## Density Rules
- Prefer compact 12-16px spacing for repeated operational UI.
- Keep page headers tight and use the first viewport for actual workflow content.
- Preserve wide work surfaces for accounting tables and review grids.
- Avoid one-off decorative cards, gradient-heavy sections, and marketing-style hero spacing.

## Table Rules
- Tables are first-class UI for finance data.
- Keep money, dates, document numbers, account codes, and quantities aligned and easy to scan.
- Use horizontal overflow on mobile when the table is the trustworthy representation.
- Keep filters close to the table they affect.
- Row actions stay explicit and operator initiated.

## Form Rules
- Put identity and metadata first, line-entry grids second, review/totals/status third, and explicit actions last.
- Use persistent labels, nearby helper text, visible disabled states, and keyboard-friendly controls.
- Do not hide validation, posting, filing, matching, or reconciliation consequences behind vague buttons.

## Panel And Card Rules
- Use panels for grouped controls, evidence, review rails, and repeated summaries.
- Do not nest cards inside cards.
- Use 8px-or-less radius and shallow elevation.
- Prefer full-width bands or split panes for page structure.

## Status Badge Rules
- Status text is mandatory; color is supporting evidence only.
- Use neutral/draft/warning/danger/info/success tones consistently.
- Conservative labels beat optimistic labels when a workflow is local-only or controlled-beta.

## Empty, Loading, And Error States
- Empty states must say what is missing and what manual next step is available.
- Loading states should reserve space and avoid layout jumps where practical.
- Error states should preserve the page context and avoid implying data mutation.

## Accessibility Principles
- Signed-in app pages use a main landmark and clear heading hierarchy.
- Icon-only controls need accessible names and tooltips where useful.
- Focus rings must be visible against light and dark shell surfaces.
- Mobile layouts must keep primary actions reachable and text unoverlapped.

## Mobile Rules
- The desktop sidebar becomes a drawer or first-workflow shortcut strip.
- Tables may scroll horizontally where data fidelity matters.
- Filters stack before tables; action groups wrap instead of shrinking labels.
- Route context remains visible in the topbar or mobile nav.

## Compliance Wording Rules
- Preserve current edition-aware labels and conservative compliance wording.
- Do not claim live bank feeds, fake reconciliation, provider connections, official tax-authority submission, ZATCA/FTA/Peppol/ASP production readiness, signed URL proof, storage proof, or automation unless implemented and verified in the repo.
- Use internal review, controlled beta, local readiness, manual import, manual reconciliation, and not connected when those are the implementation facts.

## First Slice
- Product context: `PRODUCT.md`.
- Stitch design context: `.stitch/DESIGN.md`.
- Runtime tokens: `apps/web/src/app/globals.css`.
- UI primitives: `apps/web/src/components/ui/ledger-system.tsx`.
- Representative screens: dashboard, sales invoice list, reports index, auth form, roles settings, app shell/sidebar/topbar.
