# Browser E2E Testing

Audit date: 2026-05-15

LedgerByte has a Playwright browser smoke suite for route, form, navigation, and critical user-facing surface checks. It is intentionally lighter than the API smoke: API smoke owns deep accounting assertions, journal behavior, and mutation-heavy workflows.

## Prerequisites

Start local infrastructure and apply database setup before running browser E2E:

```bash
docker compose -f infra/docker-compose.yml up -d postgres redis
corepack pnpm db:migrate
corepack pnpm db:seed
```

Start the API and web apps in another terminal:

```bash
corepack pnpm dev
```

The browser suite expects:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Seeded admin email: `admin@example.com`
- Seeded admin password: `Password123!`

## Commands

Run the smoke suite:

```bash
corepack pnpm e2e
```

If Playwright reports that Chromium is not installed on the machine, install the browser once:

```bash
corepack pnpm exec playwright install chromium
```

Run in headed mode:

```bash
corepack pnpm e2e:headed
```

Override local URLs or credentials:

```bash
LEDGERBYTE_WEB_URL=http://localhost:3000 LEDGERBYTE_API_URL=http://localhost:4000 corepack pnpm e2e
LEDGERBYTE_E2E_EMAIL=admin@example.com LEDGERBYTE_E2E_PASSWORD=Password123! corepack pnpm e2e
```

## Preflight

`tests/e2e/global-setup.ts` checks that:

- API health is reachable.
- Web app is reachable.
- Login credentials are configured.

If either app is not running, Playwright fails with:

```text
Start local API/web before running E2E.
```

The suite does not start Docker, API, or web automatically.

## Covered Flows

- Auth and navigation: login, dashboard shell, organization switcher, owner-visible nav, sign out.
- Sales: invoice list and new invoice form shell.
- Purchases: bill list/form, purchase orders, supplier payments, cash expenses.
- Banking: bank account list/detail, statement imports, reconciliation summary, reconciliation list.
- Reports: reports index, General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, export button visibility.
- Inventory: warehouses, stock movements, balances, adjustments, transfers, purchase receipts, sales stock issues, variance proposals, settings, stock valuation, movement summary, low stock, clearing reconciliation, clearing variance.
- Attachments: attachment panel rendering on an available accounting document detail page.
- Permissions: role list, role detail permission matrix, team page.
- Email/auth groundwork: password reset generic response, mock email outbox, email readiness panel.
- ZATCA: readiness/settings surface without real network credentials.
- Storage: database storage readiness, generated document storage readiness, redacted S3 readiness, dry-run migration notice.

## Data Strategy

- Uses the seeded admin for login.
- Uses API setup helpers only to discover existing records for detail-page smoke checks.
- Skips record-specific detail checks when no suitable seeded record exists.
- Avoids external services and real email/S3/ZATCA credentials.

## Known Limits

- The browser suite does not prove full accounting correctness.
- It does not perform visual regression testing.
- Attachment upload/download/delete remains covered by API smoke; browser coverage is currently render-only.
- Email invite acceptance and token extraction remain covered by API smoke; browser coverage checks the visible password reset/outbox/readiness surfaces.
- CI wiring is not added yet.
