---
name: LedgerByte Dense Accounting Ops
colors:
  ink: "#17212b"
  workspace: "#f6f8fb"
  panel: "#fbfcfe"
  line: "#d9e2ea"
  mist: "#eef3f6"
  steel: "#5d7182"
  sidebar: "#122033"
  accent: "#2563eb"
  palm: "#0f766e"
  palmDark: "#115e59"
  amber: "#b7791f"
  rosewood: "#9f1239"
  info: "#4f46e5"
---

# Design System: LedgerByte Dense Accounting Ops

## Visual Theme
LedgerByte should feel like a quiet finance operations desk used by an accountant on a bright office monitor while moving between invoices, bank rows, reports, and setup evidence. The interface is light, compact, and steady; it uses restrained contrast, predictable structure, and enough density that a reviewer can keep context without scrolling through oversized cards.

The product should not look like a generic fintech landing page. The signed-in workspace uses a dark navigation rail for orientation, pale work surfaces for repeated use, and semantic color only where it carries state or action meaning.

## Color Roles
- Ledger Ink `#17212b`: primary text, headings, totals.
- Workspace Mist `#f6f8fb`: app background.
- Panel White `#fbfcfe`: tables, forms, panels, report containers.
- Ledger Line `#d9e2ea`: borders, separators, control outlines.
- Soft Mist `#eef3f6`: inactive data wells, secondary blocks, skeletons.
- Accounting Teal `#0f766e`: primary actions and accountant-safe links.
- Review Blue `#2563eb`: active navigation, focus, informational links.
- Review Amber `#b7791f`, Risk Rosewood `#9f1239`, Balanced Emerald, Info Indigo `#4f46e5`: status and evidence states.

## Typography
Use Inter when available, then system UI. Keep the product on a fixed rem scale: 12px metadata, 14px body/control text, 16px section headings, 20-24px page headings. Money, dates, numbers, account codes, and document numbers use tabular or monospace styling.

Headings are practical, not editorial. Use weight and spacing to create hierarchy; do not use negative letter spacing or fluid viewport-based type.

## Components
- Buttons: rounded-md, icon-aware, text labels for commands. Primary actions use Accounting Teal; secondary actions use white surface with Ledger Line; quiet actions use text/link styling.
- Tables: compact uppercase headers, tabular numeric columns, horizontal overflow on mobile unless a dedicated row layout exists, row actions grouped at the right.
- Forms: accounting review sequence first, helper text close to controls, explicit submit/cancel states.
- Panels: use for grouped controls, evidence, or repeated items. Avoid nested cards and oversized marketing spacing.
- Status badges: always include text. Color reinforces meaning but is never the only signal.
- Empty/loading/error states: preserve workflow context, state what is missing, and avoid implying unavailable automation.

## Layout
Use a 4px/8px spacing rhythm with compact vertical stacks. Keep repeated panels at 8px radius or less. Avoid nested cards; use full-width bands, table shells, split panes, or review rails instead. The main content max width remains wide enough for accounting tables.

Responsive behavior should preserve workflows: sidebar collapses, tables overflow or become row summaries, global search/create remain available, and critical actions stay reachable without hiding risk context.

## Accessibility
Every page should expose a single main landmark, stable heading hierarchy, keyboard-visible focus, named icon buttons, sufficient contrast, and text equivalents for state. Dense layout must not mean tiny targets for primary actions.

## Compliance Wording
Use conservative labels such as controlled beta, manual review, internal export, not connected, local readiness, and no authority submission when that is the implementation truth. Never imply live feeds, provider submission, official filing, ZATCA/FTA/Peppol production readiness, or silent reconciliation without repo-backed proof.

## Stitch Prompt Language
Use phrases such as dense accounting operations, review-first workflow, manual banking control, controlled-beta readiness, accountant scan speed, GCC VAT/e-invoicing readiness without official submission claims.
