# ARABIC-UI-CONVERGE-01 Scope

## Baseline

- Latest main SHA: `38b3df3a1d92ddcc63f87102a02c6eeff5164422`
- Latest main commit: `38b3df3a Merge pull request #228 from Noone9029/codex/security-safe-scripts-03`
- Source patch preserved: `E:\Worktrees\Accounting-App\artifacts\arabic-ui-converge-source.patch`
- Source file-copy manifest: `E:\Worktrees\Accounting-App\artifacts\arabic-ui-converge-copied-files.txt`
- Source excluded-file manifest: `E:\Worktrees\Accounting-App\artifacts\arabic-ui-converge-excluded-files.txt`

## Copied Scope

The convergence branch copied intended frontend Arabic/i18n/RTL files only from the preserved source checkout:

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/lib/**`
- `tests/visual/visual-fixtures.ts`
- `tests/visual/arabic-locale.visual.spec.ts`

The branch intentionally excludes generated or unrelated source-checkout artifacts:

- `.stitch/DESIGN.md`
- `PRODUCT.md`
- `apps/web/next-env.d.ts`
- `docs/product/UI_UX_REBUILD_FOUNDATION.md`
- existing polished-workflow visual snapshot PNG changes

## Route Families Covered

1. Sales routes
2. Purchases
3. Banking and reconciliation
4. Reports
5. Inventory
6. Customers, suppliers, and contact details
7. Documents
8. Settings, admin, security, storage, and compliance surfaces
9. Setup, auth, public, and marketing-adjacent frontend surfaces in scope
10. App shell, sidebar, topbar, mobile, and RTL polish

## I18n Architecture

- Adds a first-party app i18n layer in `apps/web/src/lib/app-i18n.ts`.
- Defines `AppLocale` as `en | ar`, locale resolution, direction mapping, display labels, and locale-aware date and money helpers.
- Provides typed app dictionaries and a common-label translation map for static authenticated UI copy.
- Supports interpolation for count, date, currency, and status strings.
- Keeps English as the default and fallback language.

## RTL Architecture

- Reads `ledgerbyte_locale=ar|en` from cookies and renders `lang`/`dir` from the server boundary for first paint.
- Propagates locale through `AppLocaleProvider`, `useAppLocale`, and `useT`.
- Applies RTL-aware shell, topbar, sidebar, global create/search, and mobile navigation behavior.
- Uses logical text alignment and bidi-safe handling for record numbers and codes.

## Locale Preference Route

- Adds the planned web-only locale preference endpoint under `apps/web/src/app/api/locale/route.ts`.
- Accepts only `ar` and `en`.
- Stores only the `ledgerbyte_locale` cookie.
- Returns the resolved locale and direction.
- Does not mutate the database, call providers, expose secrets, or change backend API behavior.

## Tests And Visuals Added

- Dictionary, locale resolver, formatter, and fallback tests.
- Locale provider and app shell/topbar tests.
- Route/component tests for translated sales, purchase, banking, document, report, party, and compliance surfaces.
- Arabic visual matrix in `tests/visual/arabic-locale.visual.spec.ts`.
- Visual fixture updates needed for authenticated Arabic route coverage.

## Known Gaps

The following remain out of scope for this frontend PR:

- PDFs
- Emails
- Backend/API validation messages
- Generated external artifacts
- Native-speaker review for mechanically generated Arabic fallback copy

## Safety Notes

- No backend API behavior changes are included, except the planned `apps/web` locale preference route.
- No Prisma schema or migrations are included.
- No accounting, ledger posting, report, VAT, inventory valuation, or bank reconciliation math changes are intended.
- No provider, ZATCA, UAE, Peppol, ASP, Supabase, Vercel, email, payment, storage, or signed URL behavior is included.
- Conservative beta, draft, disabled, blocked, local-only, and readiness wording must remain conservative in English and Arabic.
