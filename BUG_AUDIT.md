# LedgerByte Bug Audit

Audit date: 2026-06-12

Latest commit audited: `74e7855b` (`Merge pull request #25 from codex/controlled-beta-route-load-verification-batch`) plus the current controlled-beta statement workspace polish branch.

## Scope

Reviewed the current LedgerByte monorepo without adding product features:

- `apps/api`
- `apps/web`
- `packages/accounting-core`
- `packages/shared`
- `packages/pdf-core`
- `packages/zatca-core`
- `packages/ui`
- `infra`
- `README.md`

## Commands Run

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git log -1 --oneline`
- `git ls-files`
- `corepack pnpm --filter @ledgerbyte/api test`
- `corepack pnpm db:migrate`
- `corepack pnpm db:seed`
- `corepack pnpm db:generate`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- API smoke test against `http://localhost:4000`
- Frontend route checks against `http://localhost:3000`
- API health check against `http://localhost:4000/health`

## Bugs Found And Fixed

### Controlled-beta statement workspace handoff polished

Fixed the remaining beta-facing statement workspace blocker where customer and supplier statements were still only discoverable through the shared `/contacts/[id]` surface, with no clear workspace entry point and weak return-path continuity once users drilled into statement activity.

Risk reduced:

- Added direct `Customer statement activity` and `Supplier statement activity` entry cards in the customer and supplier workspaces through `apps/web/src/components/parties/party-pages.tsx`.
- Added a dedicated `partyStatementHref(...)` helper in `apps/web/src/lib/parties.ts` so workspace statement links always open the shared contact statement tabs with a safe workspace `returnTo`.
- Added explicit shared-statement handoff panels in `apps/web/src/app/(app)/contacts/[id]/page.tsx` with `Open customer workspace`, `Open supplier workspace`, `View AR activity`, `View AP activity`, and aging-report follow-on links.
- Preserved shared-statement `returnTo` context on contact-ledger row drill-downs into invoice, bill, payment, refund, credit-note, debit-note, and expense detail routes.
- Preserved incoming statement context on invoice and purchase bill follow-on actions so `Back`, payment/debit-note, credit-note, and receipt flows stay anchored to the originating statement path.
- Added focused regression coverage in:
  - `apps/web/src/lib/parties.test.ts`
  - `apps/web/src/components/parties/party-pages.test.tsx`
  - `apps/web/src/app/(app)/contacts/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/bills/[id]/page.test.tsx`

Remaining risks:

- Customer and supplier statements still use the shared contact-detail implementation underneath; this arc clarified the handoff and route continuity but did not add dedicated statement routes or new balance-calculation logic.
- This pass did not change accounting math, payment allocation logic, report math, VAT math, generated PDF logic, runtime ZATCA behavior, or production/beta/customer-data behavior.
- Older secondary detail routes outside invoices, bills, payments, and shared contact statements may still need the same return-path review if controlled-beta tester feedback exposes more generic handoff loss.

### Controlled-beta settings root route restored

Fixed a real route-load gap where `/settings` had no page on the merged PR #24 base, leaving the settings route family without a root entry even though the controlled-beta verification batch expected it to load safely.

Risk reduced:

- Added `apps/web/src/app/(app)/settings/page.tsx` and redirected `/settings` to `/settings/team`.
- Added `apps/web/src/app/(app)/route-load-verification.test.tsx` to cover `/settings` along with the under-tested controlled-beta route modules for setup, customer/supplier workspaces, reports, storage settings, sales invoices, sales credit notes, purchase bills, and purchase debit notes.
- Re-ran the broader non-mutating route suite across dashboard, contact detail, documents, bills, matching, payment routes, invoice detail, team settings, and ZATCA settings on the PR #24 merged base.

Remaining risks:

- Customer and supplier statements still share the combined contact-detail surface instead of dedicated statement routes.
- This pass stayed frontend/tests/docs only; no schema, accounting logic, payment allocation logic, statement balance logic, report math, VAT math, generated PDF logic, ZATCA runtime, or production/beta/customer-data behavior changed.

### Controlled-beta payment-detail return path chain hardened

Fixed a real main-journey continuity bug where workspace-filtered payment lists handed users into payment detail, invoice/bill review, and aging reports without preserving a usable route back through the payment workflow they came from.

Risk reduced:

- Customer and supplier payment list `View` actions now carry the filtered list context, including the prior workspace `returnTo`, into payment detail routes.
- Customer and supplier payment detail pages now use that preserved `returnTo` on the top-level `Back` action instead of always dropping users into the generic ledger-wide payment list.
- Customer payment next actions now open invoice and AR report links with a payment-detail return path, and supplier payment next actions do the same for bill and AP report links.
- Added focused regression coverage in:
  - `apps/web/src/app/(app)/sales/customer-payments/page.test.tsx`
  - `apps/web/src/app/(app)/sales/customer-payments/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`

Remaining risks:

- This pass did not add `returnTo` handling to every document/archive surface; the broader route-load verification batch should keep watching for similar context loss on older detail routes.
- This pass did not change payment posting, allocation logic, report math, VAT math, generated PDF behavior, runtime ZATCA behavior, or production/beta/customer-data behavior.

### Controlled-beta payments and statements workflow surfaces hardened

Fixed small but real workflow bugs where customer/supplier workspaces, payment lists, payment creation routes, and aging reports lost useful party context or used wording that overstated what the supplier-payment surface actually proves.

Risk reduced:

- Customer and supplier workspace summary cards now hand payment list pages a safe `returnTo` path, and the filtered payment lists keep that workspace context visible with explicit `Back to workspace` actions.
- Customer payment lists now respect `customerId` query context, and supplier payment lists now respect `supplierId` query context, instead of dropping workspace-originated handoffs into the full unfiltered payment ledgers.
- Customer payment empty-state invoice creation now preserves the current customer workspace context, and supplier payment empty-state bill creation now preserves the current supplier workspace context.
- Aging reports now expose a clear `Back to workspace` action when reached from a customer or supplier workspace.
- Supplier payment UI copy no longer calls the downloadable document a `receipt`; it now uses neutral payment-document/PDF wording so the UI does not imply a receipt/advice was sent, acknowledged, or externally confirmed.
- Added focused frontend regression coverage in:
  - `apps/web/src/app/(app)/sales/customer-payments/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/page.test.tsx`
  - `apps/web/src/app/(app)/sales/customer-payments/new/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/new/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`
  - `apps/web/src/components/reports/report-pages.test.tsx`

Remaining risks:

- This pass did not add new dedicated customer/supplier statement routes; statement tabs still live on the shared contact-detail surface.
- This pass did not change payment posting, allocation, journal behavior, statement math, report math, VAT math, generated PDF behavior, ZATCA runtime, or production/beta/customer-data behavior.

### Controlled-beta customer and supplier workspace handoff polished

Fixed small but real customer/supplier workflow bugs where detail and review surfaces still handed users back to generic `/contacts/:id` routes even though richer `/customers/:id` and `/suppliers/:id` workspaces now exist.

Risk reduced:

- Generic contact detail now exposes explicit `Customer workspace` and `Supplier workspace` buttons based on the contact role, and mixed `BOTH` contacts now explain that both workspaces are available.
- Customer payment, supplier payment, purchase debit note, and sales invoice workflow guidance now point to the richer customer/supplier workspace routes instead of the generic combined contact page.
- Purchase matching and inventory valuation variance supplier-group links now drill into `/suppliers/:id`, which keeps AP review follow-up aligned with the supplier workspace instead of a mixed contact route.
- Added focused frontend regression coverage in:
  - `apps/web/src/app/(app)/contacts/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/inventory/valuation-variances/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/matching/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/sales/customer-payments/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx`

Remaining risks:

- This pass did not yet sweep every older sales/purchases detail route that may still use generic contact links, so a broader payments/statements hardening pass is still needed.
- No accounting math, posting logic, payment allocation logic, report math, VAT math, generated PDF behavior, ZATCA runtime, or production/beta/customer-data behavior changed.

### Controlled-beta documents and reports workflow surfaces hardened

Fixed small but real documents/reports workflow issues without changing accounting logic, VAT math, report math, generated PDF behavior, storage-provider behavior, or runtime ZATCA behavior.

Risk reduced:

- The documents archive filter no longer depends on a hand-maintained type list. It now derives options from shared generated-document labels, which keeps `SALES_QUOTE` and `BANK_RECONCILIATION_REPORT` archive rows filterable.
- Aged Receivables and Aged Payables helper actions now preserve report context with safe `returnTo` parameters on create/payment routes instead of silently dropping users into detached workflows.
- The reports index now explicitly frames VAT Return as a draft accountant-review view only, which reduces wording that could be read as an official VAT filing or submission surface.
- Added focused frontend regression coverage in:
  - `apps/web/src/lib/documents.test.ts`
  - `apps/web/src/components/reports/report-pages.test.tsx`

Remaining risks:

- VAT Return export actions remain unavailable because the current backend does not expose dedicated VAT Return export endpoints, and this pass intentionally did not add misleading export UI.
- This pass did not change report math, VAT math, journal posting behavior, generated PDF logic, archive persistence, backup execution, restore execution, or runtime ZATCA behavior.

### Controlled-beta setup onboarding now stays on the richer customer flow and preserves source context

Fixed small but real onboarding/workflow issues across setup, dashboard quick actions, and the first invoice/payment entry points without changing accounting behavior or runtime ZATCA behavior.

Risk reduced:

- The setup wizard no longer sends `First customer` into the generic `/contacts` surface; it now points to `/customers`, which keeps the first workflow on the richer customer workspace.
- The setup wizard `First invoice` and `First payment` links now include `returnTo=/setup`, so save/cancel flows can return users to guided setup instead of dropping them into generic transaction routes.
- Dashboard quick actions for invoice, customer payment, purchase bill, supplier payment, and cash expense now include `returnTo=/dashboard`, keeping first-workflow navigation anchored to the dashboard surface.
- Sales invoice empty-state guidance now sends the user to `/customers` instead of the generic contacts list when no customer exists yet.
- Customer payment empty-state guidance now sends the user to `/customers` instead of the generic contacts list when the first workflow is blocked on customer setup.
- Added focused frontend regression coverage in:
  - `apps/web/src/lib/dashboard.test.ts`
  - `apps/web/src/components/onboarding/setup-wizard.test.tsx`
  - `apps/web/src/app/(app)/dashboard/page.test.tsx`
  - `apps/web/src/components/forms/sales-invoice-form.test.tsx`
  - `apps/web/src/app/(app)/sales/customer-payments/new/page.test.tsx`

Remaining risks:

- This pass did not change setup checklist generation, dashboard data loading, accounting/report math, posting behavior, AP workflow rules, or runtime ZATCA behavior.
- The setup flow still relies on existing customer creation through the customer workspace and underlying contact forms; no dedicated `/customers/new` route was added in this pass.

### Controlled-beta route surfaces now hand off to the right customer, supplier, and archive states

Fixed small but real route-surface issues across contacts, reports, documents, and storage wording without changing accounting logic or runtime ZATCA behavior.

Risk reduced:

- The generic contacts list now sends pure customer contacts to `/customers/<id>` and pure supplier contacts to `/suppliers/<id>` instead of always dropping users into the older combined `/contacts/<id>` route. `BOTH` contacts still use the combined contact view.
- Supplier-focused contacts onboarding no longer tells users to create the first invoice. When the page is opened with `?type=SUPPLIER`, the empty-state next step now points to `/purchases/bills/new`.
- Aged Receivables and Aged Payables now send contact drill-downs to the matching customer/supplier detail pages, and their helper actions now point to `/customers` or `/suppliers` instead of the generic contacts list.
- The generated-documents archive no longer shows `Download archived PDF` for `FAILED` rows, which previously implied a broken archive artifact could still be downloaded. Failed rows now show explicit unavailable guidance instead.
- Storage backup readiness wording now states metadata review status rather than wording that could be read as proven backup/restore execution.
- Added focused frontend regression coverage in:
  - `apps/web/src/app/(app)/contacts/page.test.tsx`
  - `apps/web/src/components/reports/report-pages.test.tsx`
  - `apps/web/src/app/(app)/documents/page.test.tsx`
  - `apps/web/src/lib/documents.test.ts`
  - `apps/web/src/lib/storage.test.ts`

Remaining risks:

- This pass did not change dashboard data loading, report math, document generation logic, archive persistence, backup execution, restore execution, or runtime ZATCA behavior.
- The generic combined `/contacts/<id>` route still exists for `BOTH` contacts and remains the only surface showing both customer and supplier ledger tabs together.

### Controlled-beta invoice and bill workflow return paths hardened

Fixed real user-flow blockers in the draft-edit and post-transaction guidance surfaces without changing accounting behavior.

Risk reduced:

- Sales invoice edit now preserves a safe `returnTo` on edit routes for both cancel and post-save redirect instead of silently dropping the user back into the generic invoice flow.
- Sales invoice edit submit wording now says `Save changes` in edit mode instead of the misleading `Save draft invoice`.
- Sales invoice detail now passes `returnTo=/sales/invoices/<id>` into customer payment and credit note creation flows, so the user can return to the source invoice after the guided next step.
- Purchase bill detail now passes `returnTo=/purchases/bills/<id>` into supplier payment, purchase debit note, and purchase receipt creation flows, so the AP workflow stays anchored to the source bill.
- Invoice and bill ledger links now open the richer customer/supplier detail surfaces (`/customers/<id>` and `/suppliers/<id>`) instead of the generic contact-detail route.
- Added focused frontend regression coverage in:
  - `apps/web/src/components/forms/sales-invoice-form.test.tsx`
  - `apps/web/src/app/(app)/sales/invoices/[id]/page.test.tsx`
  - `apps/web/src/app/(app)/purchases/bills/[id]/page.test.tsx`

Remaining risks:

- This pass did not change invoice/bill posting, journal creation, payment allocation, debit/credit note accounting, report math, ZATCA runtime behavior, PDF generation logic, or storage behavior.
- Other requested route groups in the broader controlled-beta hardening arc still need the same focused review: setup, dashboard, contacts, documents, reports, and storage wording.

### ZATCA PDF-A3 approval gate added

Added a dedicated metadata-only approval gate for future ZATCA PDF-A3 planning without allowing any real archive generation, embedding, or persistence.

Risk reduced:

- PR `#16` `ZATCA clearance reporting approval gate` was verified live and merged into `main` at `edc306e6` before this lane started.
- Added `docs/zatca/PDF_A3_APPROVAL_GATE.md`.
- Added `docs/zatca/PDF_A3_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_PDF_A3_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-pdf-a3-approval-gate.cjs`.
- Added `scripts/zatca-pdf-a3-approval-gate.test.cjs`.
- Added root package scripts `zatca:pdf-a3-approval-gate` and `test:zatca-pdf-a3-approval-gate`.
- Default status is `PDF_A3_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `PDF_A3_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No PDF-A3 was generated, no XML was embedded, no signed XML was embedded, no file was persisted, no object-storage/database/document-store write was executed, and no invoice/customer data was read.
- No signing, QR, ZATCA, clearance/reporting, or production compliance behavior was enabled.
- Production compliance launch remains blocked.

### ZATCA clearance/reporting approval gate added

Added a dedicated metadata-only approval gate for future ZATCA clearance/reporting planning without allowing any real submission, API call, or payload handling.

Risk reduced:

- PR `#15` `ZATCA signing and Phase 2 QR approval gate` was verified live and merged into `main` at `154bbf82` before this lane started.
- Added `docs/zatca/CLEARANCE_REPORTING_APPROVAL_GATE.md`.
- Added `docs/zatca/CLEARANCE_REPORTING_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_CLEARANCE_REPORTING_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-clearance-reporting-approval-gate.cjs`.
- Added `scripts/zatca-clearance-reporting-approval-gate.test.cjs`.
- Added root package scripts `zatca:clearance-reporting-approval-gate` and `test:zatca-clearance-reporting-approval-gate`.
- Default status is `CLEARANCE_REPORTING_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `CLEARANCE_REPORTING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No clearance was executed, no reporting was executed, no invoice or note was submitted, no ZATCA network call was made, no request body was created, no response body was processed, and no CSID/token/secret/certificate/private-key was used.
- No signing, QR, PDF-A3, or production compliance behavior was enabled.
- PDF-A3 and production compliance remain blocked.

### AP purchase bill edit return routing hardened

Fixed a purchase bill edit-path reliability bug where `PurchaseBillForm` ignored a safe `returnTo` query whenever an existing draft bill was loaded for edit.

Risk reduced:

- Edit purchase bill cancel and post-save redirect now preserve a safe supplier-context `returnTo` path instead of always falling back to `/purchases/bills` or the bill detail page.
- Added a targeted failing-then-passing form test covering edit-route `returnTo` handling.
- Tightened purchase bill frontend tests to use UUID-shaped supplier and bill ids across the AP purchase bill form and detail guidance surface so the route/test inputs better match real validation expectations after the seeded UUID validation fix.
- Added DTO regression coverage proving optional purchase bill reference ids accept `null` but still reject empty strings and visible labels.

Remaining risks:

- This change does not alter AP posting, bill finalization, supplier payment allocation, debit notes, inventory clearing, email, ZATCA, hosted behavior, or production posture.
- Beta Vercel route-load verification for the updated branch was not run in this pass.

### ZATCA sandbox CSID preflight guard added

Added a metadata-only, no-network preflight guard for future sandbox compliance CSID readiness.

Risk reduced:

- Added `scripts/zatca-sandbox-csid-preflight.cjs`.
- Added `scripts/zatca-sandbox-csid-preflight.test.cjs`.
- Added `docs/zatca/SANDBOX_CSID_PREFLIGHT_GUARD.md`.
- Added `docs/zatca/SANDBOX_CSID_PREFLIGHT_RESULTS.md`.
- The guard verifies local references, CSR keys, code surfaces, package scripts, env presence booleans, sandbox adapter blocking, mock-only adapter status, and custody blockers.

Remaining risks:

- Current status is `PREFLIGHT_BLOCKED`.
- No OTP was requested, no CSID was requested, no ZATCA network call was made, no private-key/certificate/CSID/token/header/request/response body was exposed, and production signing remains disabled.
- Key custody, CSID response custody, sandbox adapter execution, OTP approval, CSID request approval, production signing, Phase 2 QR, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA sandbox OTP and compliance CSID approval plan added

Added the planning-only approval phrase, runbook, result doc, and guard recognition for a future sandbox OTP/compliance CSID execution guard.

Risk reduced:

- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_PLAN.md`.
- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RUNBOOK.md`.
- Added `docs/zatca/SANDBOX_OTP_CSID_APPROVAL_RESULTS.md`.
- Extended `scripts/zatca-sandbox-csid-preflight.cjs` and `scripts/zatca-sandbox-csid-preflight.test.cjs` with planning-only approval recognition.
- Observed status is `APPROVAL_PLAN_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no secrets/bodies were exposed, and production signing remains disabled.
- Key custody, CSID response custody, sandbox CSID request execution guard, real sandbox adapter execution, compliance invoice checks, production CSID lifecycle, production signing, Phase 2 QR, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA manual OTP capture approval gate added

Added a dedicated metadata-only approval gate for future human-operated sandbox OTP capture confirmation without allowing execution.

Risk reduced:

- Added `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_GATE.md`.
- Added `docs/zatca/MANUAL_OTP_CAPTURE_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_MANUAL_OTP_CAPTURE_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-manual-otp-capture-approval-gate.cjs`.
- Added `scripts/zatca-manual-otp-capture-approval-gate.test.cjs`.
- Added root package scripts `zatca:manual-otp-capture-approval-gate` and `test:zatca-manual-otp-capture-approval-gate`.
- Default status is `MANUAL_OTP_CAPTURE_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `MANUAL_OTP_CAPTURE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No OTP was captured, no OTP value was stored, no OTP value was shared with Codex, no CSID was requested, no ZATCA network call was made, no request body was created, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Request body creation approval, real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage approval, signing, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA sandbox network request approval gate added

Added a dedicated metadata-only approval gate for future sandbox network request planning without allowing any real network or adapter execution.

Risk reduced:

- Added `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_GATE.md`.
- Added `docs/zatca/SANDBOX_NETWORK_REQUEST_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SANDBOX_NETWORK_REQUEST_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-sandbox-network-request-approval-gate.cjs`.
- Added `scripts/zatca-sandbox-network-request-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-network-request-approval-gate` and `test:zatca-sandbox-network-request-approval-gate`.
- Default status is `SANDBOX_NETWORK_REQUEST_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_NETWORK_REQUEST_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- PR `#9` and PR `#10` were merged into `main` before this branch was created, but the new network-request lane still does not permit any real network execution.
- No network request was executed, no adapter was executed, no request body was created, no real OTP was included, no CSID was requested, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Response processing approval, response custody approval, sandbox CSID storage approval, signing, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA sandbox response processing approval gate added

Added a dedicated metadata-only approval gate for future sandbox response processing planning without allowing any response receipt, response processing, or response custody behavior.

Risk reduced:

- PR `#11` `ZATCA sandbox network request approval gate` was rechecked live and merged into `main` at `13bf16a5` before this branch was created.
- Added `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE.md`.
- Added `docs/zatca/SANDBOX_RESPONSE_PROCESSING_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SANDBOX_RESPONSE_PROCESSING_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-sandbox-response-processing-approval-gate.cjs`.
- Added `scripts/zatca-sandbox-response-processing-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-processing-approval-gate` and `test:zatca-sandbox-response-processing-approval-gate`.
- Default status is `SANDBOX_RESPONSE_PROCESSING_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_PROCESSING_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Response custody approval, sandbox CSID storage approval, signing, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA sandbox response custody approval gate added

Added a dedicated metadata-only approval gate for future sandbox response custody planning without allowing any response custody, provider execution, or storage writes.

Risk reduced:

- PR `#12` `ZATCA sandbox response processing approval gate` was rechecked live and merged into `main` at `d15884f8` before this branch was created.
- Added `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE.md`.
- Added `docs/zatca/SANDBOX_RESPONSE_CUSTODY_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SANDBOX_RESPONSE_CUSTODY_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-sandbox-response-custody-approval-gate.cjs`.
- Added `scripts/zatca-sandbox-response-custody-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-response-custody-approval-gate` and `test:zatca-sandbox-response-custody-approval-gate`.
- Default status is `SANDBOX_RESPONSE_CUSTODY_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_RESPONSE_CUSTODY_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No network request was executed, no adapter was executed, no request body was created, no response body was received, no response body was processed, no response custody was stored, no custody provider was executed, no secret-manager write was executed, no database write was executed, no object-storage write was executed, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Sandbox CSID storage approval, signing, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA sandbox CSID storage approval gate added

Added a dedicated metadata-only approval gate for future sandbox CSID storage planning without allowing any credential storage or custody-provider execution.

Risk reduced:

- PR `#13` `ZATCA sandbox response custody approval gate` was rechecked live and merged into `main` at `db8f058c` before this branch was created.
- Added `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_GATE.md`.
- Added `docs/zatca/SANDBOX_CSID_STORAGE_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SANDBOX_CSID_STORAGE_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-sandbox-csid-storage-approval-gate.cjs`.
- Added `scripts/zatca-sandbox-csid-storage-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-csid-storage-approval-gate` and `test:zatca-sandbox-csid-storage-approval-gate`.
- Default status is `SANDBOX_CSID_STORAGE_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SANDBOX_CSID_STORAGE_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No custody provider was executed, no CSID was stored, no binary security token was stored, no CSID secret was stored, no certificate/private key/CSR was stored, no database write was executed, no secret-manager write was executed, no KMS/HSM/object-storage write was executed, no network request was executed, no adapter was executed, no request body was created, no response body was processed, no response custody was stored, no real OTP was included, no CSID was requested, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Signing, Phase 2 QR, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA signing and Phase 2 QR approval gate added

Added a dedicated metadata-only approval gate for future signing and Phase 2 QR planning without allowing any signing, QR, signed XML, or SDK execution.

Risk reduced:

- PR `#14` `ZATCA sandbox CSID storage approval gate` was rechecked live and merged into `main` at `ce2489a5` before this branch was created.
- Added `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_GATE.md`.
- Added `docs/zatca/SIGNING_AND_PHASE2_QR_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SIGNING_AND_PHASE2_QR_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-signing-phase2-qr-approval-gate.cjs`.
- Added `scripts/zatca-signing-phase2-qr-approval-gate.test.cjs`.
- Added root package scripts `zatca:signing-phase2-qr-approval-gate` and `test:zatca-signing-phase2-qr-approval-gate`.
- Default status is `SIGNING_PHASE2_QR_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `SIGNING_PHASE2_QR_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- No signing was executed, no QR was generated, no signed XML was generated, no signature was generated, no private key/certificate/CSID was used, no SDK signing command was executed, no ZATCA network call was made, and no clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA sandbox request body creation approval gate added

Added a dedicated metadata-only approval gate for future sandbox request body creation planning without allowing any real body creation or execution.

Risk reduced:

- Added `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE.md`.
- Added `docs/zatca/SANDBOX_REQUEST_BODY_CREATION_APPROVAL_RESULTS.md`.
- Added `docs/development/ZATCA_SANDBOX_REQUEST_BODY_CREATION_APPROVAL_GATE_SPRINT_CLOSURE.md`.
- Added `scripts/zatca-sandbox-request-body-creation-approval-gate.cjs`.
- Added `scripts/zatca-sandbox-request-body-creation-approval-gate.test.cjs`.
- Added root package scripts `zatca:sandbox-request-body-creation-approval-gate` and `test:zatca-sandbox-request-body-creation-approval-gate`.
- Default status is `REQUEST_BODY_CREATION_APPROVAL_BLOCKED`.
- The exact phrase plus `--metadata-only` is recognized only as metadata approval and returns `REQUEST_BODY_CREATION_APPROVAL_RECOGNIZED_BUT_EXECUTION_BLOCKED`.

Remaining risks:

- PR `#9` and PR `#10` are now merged into `main`, so this request-body approval gate is part of the merged ZATCA governance ladder.
- No request body was created, no real OTP was included, no CSID was requested, no ZATCA network call was made, no response body was processed, and no signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- Real sandbox network request approval, response processing approval, response custody approval, sandbox CSID storage approval, signing, clearance/reporting, PDF-A3, and production compliance remain blocked.

### ZATCA CSID response custody implementation plan added

Added a metadata-only response custody implementation plan and guard before any future real sandbox compliance CSID response may be processed.

Risk reduced:

- Added `docs/zatca/CSID_RESPONSE_CUSTODY_IMPLEMENTATION_PLAN.md`.
- Added `docs/zatca/CSID_RESPONSE_CUSTODY_GUARD.md`.
- Added `docs/zatca/CSID_RESPONSE_CUSTODY_RESULTS.md`.
- Added `scripts/zatca-csid-response-custody-guard.cjs`.
- Added `scripts/zatca-csid-response-custody-guard.test.cjs`.
- Added root package scripts `zatca:csid-response-custody-guard` and `test:zatca-csid-response-custody-guard`.
- Observed status is `CUSTODY_METADATA_SIMULATION_BLOCKED`.

Remaining risks:

- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no real response body was processed, no DB write was attempted, no token/secret/certificate body was persisted, no env values were printed, and no secrets/bodies were exposed.
- Custody provider implementation/approval, legacy raw PEM-capable fields, sandbox adapter execution approval, OTP capture approval, CSID request approval, production signing, Phase 2 QR, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA sandbox adapter execution approval plan added

Added a metadata-only adapter execution approval plan and guard before any future sandbox adapter can be allowed to run.

Risk reduced:

- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_PLAN.md`.
- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RUNBOOK.md`.
- Added `docs/zatca/SANDBOX_ADAPTER_EXECUTION_APPROVAL_RESULTS.md`.
- Added `scripts/zatca-sandbox-adapter-execution-approval.cjs`.
- Added `scripts/zatca-sandbox-adapter-execution-approval.test.cjs`.
- Added root package scripts `zatca:sandbox-adapter-execution-approval` and `test:zatca-sandbox-adapter-execution-approval`.
- Observed status is `ADAPTER_EXECUTION_APPROVAL_RECOGNIZED_BUT_BLOCKED`; `--execute-adapter` remains `BLOCKED_ADAPTER_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.

Remaining risks:

- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no request body was created, no response body was processed, no DB write was attempted, no env values were printed, and no secrets/bodies were exposed.
- Mock-to-real adapter boundary tests, custody provider implementation/approval, legacy raw PEM-capable fields, OTP capture approval, CSID request approval, production signing, Phase 2 QR, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA sandbox adapter mock-to-real boundary test plan added

Added a static-only boundary plan and guard before any future sandbox adapter execution can move from mock/disabled paths toward real adapter tests.

Risk reduced:

- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_TEST_PLAN.md`.
- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RUNBOOK.md`.
- Added `docs/zatca/SANDBOX_ADAPTER_MOCK_TO_REAL_BOUNDARY_RESULTS.md`.
- Added `scripts/zatca-sandbox-adapter-boundary-check.cjs`.
- Added `scripts/zatca-sandbox-adapter-boundary-check.test.cjs`.
- Added root package scripts `zatca:sandbox-adapter-boundary-check` and `test:zatca-sandbox-adapter-boundary-check`.
- Observed status is `BOUNDARY_STATIC_CHECK_PASSED_WITH_BLOCKERS`.

Remaining risks:

- No OTP was requested, no CSID was requested, no ZATCA network call was made, no sandbox adapter was executed, no mock adapter was executed, no request body was created, no response body was processed, no DB write was attempted, no env values were printed, and no secrets/bodies were exposed.
- No-network adapter contract tests, custody provider implementation/approval, legacy raw PEM-capable fields, OTP capture approval, CSID request approval, production signing, Phase 2 QR, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA key custody and CSID lifecycle design added

Captured the key custody, certificate/CSID lifecycle, and sandbox approval-gate design without enabling onboarding or signing.

Risk reduced:

- Added `docs/zatca/KEY_CUSTODY_AND_CSID_LIFECYCLE_DESIGN.md`.
- Added `docs/zatca/CSID_LIFECYCLE_CHECKLIST.md`.
- Added `docs/zatca/KEY_CUSTODY_DECISION_MATRIX.md`.
- Reconciled existing legacy EGS PEM-capable fields, metadata-only CSID custody records, disabled custody provider, mock-only CSID flow, and blocked real sandbox/production adapters.
- Recommended KMS/HSM/external signing or equivalent custody for production private keys, with application tables storing metadata only.

Remaining risks:

- No OTP was requested, no CSID was requested, no ZATCA network call was made, no private-key/certificate body was exposed, no production credentials were generated, and production signing remains disabled.
- Sandbox CSID preflight, sandbox OTP/CSID, compliance CSID lifecycle, production CSID lifecycle, production key custody, Phase 2 QR proof, clearance/reporting, PDF-A3, retry/error queue, signed artifact storage, official/legal/accounting review, and repeatable SDK CI remain blocked.

### ZATCA local signed XML validation plan added

Added a planning-only guard for the next signed XML validation step without enabling signing.

Risk reduced:

- Added `docs/zatca/LOCAL_SIGNED_XML_VALIDATION_PLAN.md`.
- Added `scripts/zatca-local-signed-xml-plan.cjs` and `corepack pnpm zatca:local-signed-xml-plan -- --plan --no-network --json`.
- Added targeted tests for no-network enforcement, Java 17 blocking, Java 11-14 metadata-only support, missing SDK/fixture blockers, strict-mode exit behavior, no SDK sign/QR/hash execution, and no XML/QR/key/certificate body output.

Remaining risks:

- The guard is blocked by default and does not execute signing.
- Default Java 17 remains unsupported; future SDK execution requires Java 11-14.
- Key custody, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, signed artifact storage, official reviews, and production compliance remain blocked.

### ZATCA SDK CI readiness guard added

Added a safe no-network SDK CI readiness guard without enabling SDK validation in GitHub Actions.

Risk reduced:

- Added `scripts/zatca-sdk-ci-readiness.cjs` and `corepack pnpm zatca:sdk-ci-readiness -- --plan --no-network --json`.
- Added targeted tests for no-network enforcement, Java 17 blocking, Java 11-14 support metadata, missing SDK/fixture blockers, strict-mode exit behavior, launcher metadata, and metadata-only redaction.
- Added `docs/zatca/ZATCA_SDK_CI_RUNNER_PLAN.md` documenting runner options, current blocker status, and a documentation-only workflow sketch.

Remaining risks:

- Current status is `CI_BLOCKED_MISSING_SDK_REFERENCE` because the official SDK is local/ignored under `reference/` and not available from a fresh checkout.
- Default Java 17 remains unsupported; CI execution requires Java 11-14.
- PR CI remains non-ZATCA. No real ZATCA network calls, signing, CSID/OTP, clearance/reporting, PDF/A-3, email, deploy, migration, seed/reset/delete, production/beta/customer data mutation, or production compliance was enabled.

### DEV-11 inventory valuation and COGS evidence closed

Closed the DEV-11 inventory valuation and COGS evidence chain as local-only documentation/readiness evidence without changing product behavior.

Risk reduced:

- Added `docs/development/DEV_11_INVENTORY_VALUATION_COGS_CLOSURE.md` with the full Part 1-15 evidence map, marker scope, accounting summaries, production gap register, and future E2E readiness checklist.
- Consolidated evidence for the marker fixture, manual sales stock issue COGS post/reverse path, compatible purchase receipt asset post/reverse path, clearing variance proposal lifecycle, and inventory/report financial summaries.
- Updated readiness, roadmap, audit, implementation, README, and handoff docs to state that DEV-11 is closed as local-only inventory valuation and COGS evidence.

Remaining risks:

- DEV-11 does not prove production readiness, beta readiness, customer-data behavior, accountant certification, FIFO/landed-cost completeness, automatic COGS, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Inventory accounting is not production-complete. FIFO/cost layers, landed cost, automatic posting, returns, serial/batch/bin/location, historical direct-mode migration, multi-currency inventory, accountant review, hosted proof, and load/concurrency remain open.
- No app code, runtime data, report query, output generation, migration, seed/reset/delete, deploy, env var, ZATCA, email, backup, restore, production/beta target, customer data, E2E, smoke, full test, or full build changed in the closure.

### API hosting decision ADR drafted

Captured the proposed production API hosting direction without changing product behavior or production infrastructure.

Risk reduced:

- Added [ADR-013 API hosting decision](docs/production/adrs/ADR-013-api-hosting-decision.md) as a drafted/proposed API hosting ADR because ADR-002 is already reserved for the production database provider.
- Documented AWS ECS Fargate as the recommended paid SaaS v1 API direction.
- Documented that API and worker should be hosted as separate ECS Fargate services, even if they share one image.
- Documented fallback posture: DigitalOcean App Platform is secondary fallback, Elastic Beanstalk is AWS fallback only, AWS App Runner is not recommended because official AWS docs say it is closed to new customers as of April 30, 2026, and Render/Fly/Railway-style hosting is backup/private-beta only.
- Updated production docs to state that Vercel remains beta/user-testing/staging only, not final API production hosting.

Remaining risks:

- This is documentation/planning only. ADR-013 is drafted/proposed, but implementation has not started, the API provider/service is not provisioned, ECS/Fargate is not configured, worker hosting is not configured, no production API deploy was performed, and actual API deployment/infrastructure setup belongs to later implementation tickets.
- No app code, env vars, database, Redis, storage, ZATCA behavior, email behavior, accounting logic, customer data, Supabase RLS, runtime DB roles, Vercel settings, migrations, seed/reset/delete, deployment, provisioning, backups/restores, full smoke, or full E2E changed.

### Production implementation backlog documented

Converted the production foundation roadmap into owned planning artifacts without changing product behavior or production infrastructure.

Risk reduced:

- Added `docs/production/PRODUCTION_IMPLEMENTATION_TICKETS.md` with ticket-ready scopes across hosting, database/security, backups/storage, monitoring/operations, SaaS operations, legal/compliance, ZATCA, and product/beta readiness.
- Added `docs/production/ARCHITECTURE_DECISION_RECORDS.md` with ADR placeholders for final hosting, database provider, object storage, queue/worker hosting, email, billing, monitoring, secrets, ZATCA strategy, raw bank statement archive policy, RLS/Data API strategy, and least-privilege runtime DB role.
- Added `docs/production/NEXT_10_PRODUCTION_TICKETS.md` to order the first production-foundation tickets by risk reduction.
- Added `docs/production/adrs/ADR-001-final-production-hosting.md` as a drafted/proposed final production hosting ADR; final production hosting remains proposed, not implemented.
- Updated readiness/audit docs to state that the current stage remains controlled beta/user-testing, Vercel remains beta/user-testing only, and no production implementation was performed.

Remaining risks:

- This is documentation/planning only. ADR-001 is drafted/proposed, but implementation has not started, no provider is provisioned, no production deploy was performed, and the tickets/ADRs still need owners, execution approval, safe validation environments, legal/accountant/ZATCA specialist review, and implementation.
- Full smoke, full E2E, migrations, seed/reset/delete, Vercel/Supabase environment changes, Supabase RLS changes, runtime DB role changes, real email, real ZATCA, monitoring setup, billing setup, app tests, and backups/restores were intentionally out of scope.

### Production foundation roadmap documented

Added planning documents that make the current product stage and production blockers explicit without changing product behavior.

Risk reduced:

- Added `docs/production/PRODUCTION_FOUNDATION_ROADMAP.md` for the path from controlled beta/user-testing to paid Saudi-first SaaS v1.
- Added `docs/production/PAID_SAAS_V1_GAP_MATRIX.md` covering hosting, database security, backups, monitoring, email, billing, support, ZATCA, legal, product UX, accounting review, bank imports, inventory maturity, reporting, and CI/testing.
- Added `docs/production/LAUNCH_GATE_CHECKLIST.md` with controlled beta, paid private beta, public production, ZATCA-compliance, security, backup/restore, monitoring/support, and billing/legal gates.
- Updated top-level readiness/audit docs to state that Vercel is beta/user-testing only, LedgerByte is not production-launched, real ZATCA production compliance is not enabled, paid production SaaS requires production foundation work, and controlled beta is the current practical stage.

Remaining risks:

- This is documentation/planning only. Hosting, least-privilege runtime DB role, RLS/Data API strategy, backups/restores, object storage, monitoring, billing, support, legal review, accountant review, and ZATCA production work remain unimplemented or incomplete.
- Full smoke, full E2E, migrations, seed/reset/delete, Vercel/Supabase environment changes, Supabase RLS changes, runtime DB role changes, real email, real ZATCA, and backups/restores were intentionally out of scope.

### Beta feedback intake triaged

Reviewed the sanitized beta/accountant feedback intake locations before applying any product fixes.

Risk reduced:

- Added `docs/beta-testing/BETA_FEEDBACK_TRIAGE_SUMMARY.md` so the current intake state is explicit.
- Confirmed the repository has beta testing docs, accountant review docs, and GitHub issue templates, but no completed sanitized feedback submissions or accountant findings were present in the local checkout.
- The public GitHub issues query for `Noone9029/Accounting-App` returned zero issue records to triage.
- No blocker or high-priority feedback was available, so no UX, copy, route, layout, accounting, report, security, ZATCA, schema, or deployment behavior was changed.

Remaining risks:

- Beta tester and accountant feedback still needs to be collected through the feedback templates or issue templates.
- Accountant review remains pending and must not be treated as approval or certification.
- Full smoke, full E2E, and runtime-role security hardening remain separate pending tasks.

### Beta access management guidance added

Prepared controlled beta access guidance and visible admin copy without changing auth architecture.

Risk reduced:

- Added `docs/beta-testing/BETA_ACCESS_MANAGEMENT.md` covering 3-5 tester intake, role selection, invite flow, password reset, revocation, beta organization labels, cleanup requests, and data safety rules.
- Updated Team Members UI with beta access guidance and mobile-safe horizontal scrolling for the member table.
- Updated Roles UI with beta role guidance that keeps Owner/Admin internal and recommends Viewer or scoped workflow roles for external testers.
- Updated beta testing docs/readiness docs so access issues, role scope, and revocation are explicit.

Remaining risks:

- Actual tester invitations, sanitized feedback, accountant review, full smoke, full E2E, and runtime-role security hardening remain pending.
- This does not add MFA, advanced session management, new permission logic, or production identity controls.

### Bank statement parser variants hardened

Validated the manual OFX/CAMT/MT940 parser groundwork against additional sanitized common variants and documented a design-only raw statement-file archive policy.

Risk reduced:

- Added sanitized OFX XML-style, CAMT.054, and MT940 multiline fixtures with fake account/reference values only.
- OFX parsing now warns when `FITID` is missing instead of silently relying on weaker duplicate keys.
- CAMT parsing now supports date-time booking dates and common transaction reference fallbacks, and it no longer infers amount direction when `CdtDbtInd` is absent.
- MT940 parsing now handles comma-decimal amounts, alphanumeric transaction code shapes, and multiline `:86:` narratives.
- UI copy now says OFX/CAMT/MT940 support is limited for bank-specific variants and that raw bank file bodies are not archived in beta.
- Added `docs/banking/RAW_STATEMENT_FILE_ARCHIVE_POLICY.md` recommending no raw file body storage in beta and object-storage archiving later only after policy approval.

Remaining risks:

- Parser support is still limited to sanitized fixtures and common variants, not certified target-bank coverage.
- Raw statement-file archive implementation remains intentionally unimplemented.
- No live bank feeds, external bank aggregation, automatic matching, transfer fees, or FX transfer handling.
- Full smoke and full E2E remain intentionally pending.

### Bank parser compatibility matrix added

Prepared a target-bank validation program without changing parser behavior or banking workflows.

Risk reduced:

- Added `docs/banking/BANK_STATEMENT_COMPATIBILITY_MATRIX.md` with explicit support levels and target-bank rows marked not collected until sanitized samples exist.
- Added `docs/banking/SANITIZED_BANK_SAMPLE_COLLECTION_GUIDE.md` with removal/preservation rules, fake replacement patterns, and before/after examples.
- Added `docs/banking/BANK_PARSER_VALIDATION_CHECKLIST.md` covering parser detection, row counts, date/amount/direction/reference/description extraction, duplicate key quality, UI preview, persistence, and no-raw-body logging.
- Added `apps/api/src/bank-statements/fixtures/README.md` with fixture safety rules, naming conventions, categories, and targeted parser test commands.

Remaining risks:

- No bank-specific parser support is certified.
- No raw statement-file archive implementation, live bank feed, external bank aggregation, automatic matching, transfer fee, or FX transfer handling was added.
- Full smoke and full E2E remain intentionally pending.

### Visual regression coverage added

Added focused mocked Playwright visual regression coverage for polished beta UX routes without changing accounting behavior.

Risk reduced:

- `corepack pnpm test:visual` now runs `tests/visual/polished-workflows.visual.spec.ts` with deterministic mocked API data instead of live beta credentials or real API traffic.
- Critical setup, dashboard, reports, AR/customer statement, invoice detail, AP/supplier statement, purchase bill detail, bank account detail, inventory valuation, and documents/archive routes now have desktop, tablet, and mobile screenshots.
- Additional AR, AP, banking, inventory, document settings, and number sequence routes assert visible guidance, headings, no document-level horizontal overflow, and safe wording.
- The visual suite asserts no production ZATCA submission/compliance claim, no implemented PDF/A-3 claim, and no live bank integration claim.

Remaining risks:

- The suite is a focused visual safety net, not full browser E2E, full smoke, PDF binary validation, accountant review, or deployed authenticated browser QA.
- A pre-existing dashboard chart React key warning appears during the visual run and remains a product-code cleanup item outside this test-only pass.

### Bank statement format parser groundwork added

Added sanitized OFX, CAMT XML, and MT940 parser samples plus limited manual parser support without live bank integration or accounting behavior changes.

Risk reduced:

- Small sanitized fixtures now cover OFX, CAMT XML, and MT940 input shapes using clearly fake account/reference values.
- The API and browser parser helpers now detect CSV, JSON, OFX, CAMT XML, MT940, and unknown text instead of silently treating every upload as CSV.
- Limited OFX/CAMT/MT940 parsing normalizes common dates, signed amounts or debit/credit direction, descriptions, currency, and bank references into the existing statement import row shape.
- Unsupported or unknown text returns a safe validation error without echoing raw file content.
- Imported batches now preserve the detected manual source type through the existing `BankStatementImport.sourceType` string field.

Remaining risks:

- This is parser groundwork, not certified coverage of every bank export variant.
- Raw statement-file archive policy, automatic matching, live bank feeds, external bank aggregation, transfer fees, and FX transfer handling remain out of scope.
- Full smoke and full E2E remain intentionally pending.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Manual bank statement import groundwork added

Added safe manual CSV/JSON/text bank statement upload and paste parsing without live bank integration or accounting behavior changes.

Risk reduced:

- Statement import now reads small manual files in the browser, previews parsed rows, validates common row issues, and sends the same text through the existing tenant-scoped preview/import API.
- Parser support now covers debit/credit formats, signed amount formats, transaction/posted date aliases, memo/details aliases, balance, counterparty, currency, and bank reference aliases.
- Preview guidance now surfaces invalid dates/amounts, conflicting debit and credit values, currency mismatch, missing description/reference warnings, duplicate candidates, row counts, and import result next actions.
- Storage remains conservative: raw file bodies are not stored; existing import metadata and parsed statement rows are persisted.

Remaining risks:

- No live bank feeds, external bank aggregation, certified OFX/CAMT/MT940 bank-specific parser coverage, automatic matching, raw-file archive implementation, transfer fees, or FX transfer handling.
- Full smoke and full E2E remain intentionally pending.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Inventory drill-down UX polished

Added visible guidance around inventory items, warehouses, purchase receipts, sales stock issues, adjustments, transfers, stock movements, balances, and inventory reports without changing inventory posting behavior.

Risk reduced:

- Item and warehouse pages now explain tracked products, warehouse quantity movement, quantity in/out, operational cost/value estimates, and next actions.
- Purchase receipt and sales stock issue details now explain posted/voided stock effects, linked movement IDs, manual receipt-asset/COGS posting boundaries, and inventory report navigation.
- Inventory adjustment and warehouse transfer details now explain draft/approval, source/destination movement, void/reversal rows, and stock ledger inspection.
- Inventory movement, balance, stock valuation, movement summary, and low-stock reports now include plain-language guidance, empty states, next-action links, and mobile-safe layouts.
- Browser QA covered 14 inventory/report routes at desktop/tablet/mobile widths with no document overflow, console/page errors, request failures, or unknown mocked API calls.

Remaining risks:

- Inventory valuation/COGS/accounting behavior was intentionally unchanged; landed cost, FIFO/cost-layer design, serial/batch tracking, returns workflow, and automatic posting policy remain future work.
- Full smoke and full E2E remain intentionally pending from earlier deployment work.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Banking reconciliation UX polished

Added visible guidance around bank account, transfer, statement import, statement transaction, reconciliation summary, and reconciliation detail pages without changing banking posting behavior.

Risk reduced:

- Bank account pages now explain ledger balance movement, debits, credits, running balances, imported statement rows, and closed-period lock implications.
- Bank transfer detail now shows posted-transfer success context, source/destination movement, void/reversal guidance, bank-ledger links, account links, and dashboard navigation.
- Statement import and matching pages now explain manual CSV/JSON imports, matched/unmatched/categorized/ignored states, match candidates, categorization, locked-period warnings, and no-live-bank-feed behavior.
- Reconciliation pages now explain zero-difference close readiness, unmatched-row blockers, review history, captured close rows, and closed-period locks.
- Browser QA covered bank account list/detail, transfer creation/detail, statement imports, statement transactions, statement row detail, reconciliation summary/detail, and reports at desktop/tablet/mobile widths with no document overflow, console warning/error entries, page errors, request failures, or unknown mocked API calls.

Remaining risks:

- Ledger math, reconciliation logic, automatic matching, live bank feeds, bank file parser support, transfer fees, and FX transfer handling remain unchanged.
- Full smoke and full E2E remain intentionally pending from earlier deployment work.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Supplier AP drill-down UX polished

Added visible guidance around the supplier ledger, purchase bill detail, supplier payment detail, debit-note detail, and AP report drill-down path without changing AP posting behavior.

Risk reduced:

- Supplier ledger pages now explain how purchase bills, supplier payments, debit notes, refunds, and reversals affect the running payable balance.
- Purchase bill detail now explains draft/finalized/paid/partially paid/voided states and routes users to supplier payment, debit note, supplier ledger, AP report, PDF, or dashboard actions.
- Supplier payment detail now shows recorded-payment success guidance, allocation explanation, receipt access, bill links, supplier ledger links, AP report links, and dashboard navigation.
- Purchase debit note detail now explains AP reduction, allocation, reversal, supplier ledger/AP report navigation, and conservative local-only ZATCA wording.
- Browser QA covered supplier ledger, purchase bill detail, supplier payment detail, debit note detail, aged payables, and reports at desktop/tablet/mobile widths with no document overflow or console warning/error entries.

Remaining risks:

- Full smoke and full E2E remain intentionally pending from earlier deployment work.
- Banking/reconciliation and inventory workflows still need the same visible route QA.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Customer ledger and report drill-down UX polished

Added visible guidance around the customer ledger and AR report path after invoice payment without changing accounting behavior.

Risk reduced:

- Customer ledger pages now explain how finalized invoices, payments, credit notes, and refunds affect the running customer balance.
- Ledger tables now show readable activity/status labels instead of raw enum-style text.
- Empty ledger states now direct users to create an invoice, record a payment, open AR reports, or return to the dashboard.
- Aged receivables/payables now explain report buckets, payment impact, and next actions, with customer and document drill-down links.
- Browser QA covered contact ledger, aged receivables, reports, payment detail, and invoice detail at desktop/tablet/mobile widths.

Remaining risks:

- Full smoke and full E2E remain intentionally pending from earlier deployment work.
- Visual regression coverage and accountant review of report wording are still needed.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Guided first-workflow UX added

Added a user-facing first accounting workflow across setup, dashboard, customer, invoice, payment, and report screens without changing accounting behavior.

Risk reduced:

- The setup wizard now presents a first-workflow progress path for business profile, VAT/tax details, first customer, first invoice, first payment, and first report.
- `GET /dashboard/onboarding-checklist` now exposes real-data first-payment and first-reportable-activity checklist states.
- The dashboard empty state and onboarding card now point to the next incomplete setup or first-accounting action.
- Contacts, new sales invoice, new customer payment, and reports pages now include first-use guidance and links to the relevant next workflow step.
- ZATCA guidance remains conservative and does not claim production ZATCA connectivity or compliance.

Remaining risks:

- The wider app still needs manual route QA, responsive review, visual regression coverage, and broader empty/error-state polish.
- Full smoke and full E2E remain intentionally pending from earlier deployment work.
- Supabase RLS and least-privilege runtime role hardening remain parked until the safe Vercel env mutation path is available.

### Backup restore readiness added

Added backup/restore readiness planning and metadata-only evidence capture without running backups, running restores, exporting customer data, or exposing secrets.

Risk reduced:

- `BackupRestoreEvidence` stores review metadata for database backup, point-in-time recovery, migration history, object-storage backup, generated-document backup, attachment backup, restore drill, restore verification, RPO/RTO review, and other evidence.
- `GET /system/backup-readiness` is read-only/no-mutation and reports missing/verified evidence, blockers, warnings, and `productionReady=false` until required evidence is verified.
- `GET /system/restore-drill-plan` returns an isolated restore-drill checklist only; it does not restore snapshots, run migrations, export customer data, send email, or call ZATCA.
- `/system/backup-evidence` list/create/verify/revoke endpoints are metadata-only, audit create/verify/revoke actions, and reject database URLs, service role keys, storage credentials, connection strings, SMTP/API/provider secrets, auth headers, private keys, signed XML/QR bodies, customer document contents, and attachment contents.
- `/settings/storage` now shows backup readiness, restore-drill planning, evidence completeness, safe evidence controls, and `productionReady=false` without any run-backup or restore button.
- Smoke now asserts no backup execution, no restore execution, no secret exposure, metadata-only evidence behavior, and continued ZATCA/email safety gates.

Remaining risks:

- Real Supabase/Postgres backup/PITR validation must be performed outside LedgerByte.
- Object-storage backup validation and a non-production restore drill are still pending.
- RPO/RTO targets and legal/accounting retention duration still require business review.
- Production monitoring, alerting, incident runbooks, storage migration execution, and real ZATCA OTP/CSID remain separate blockers.

### Email worker monitoring readiness added

Added scheduled retry-worker planning, a disabled-by-default worker run shell, and metadata-only delivery monitoring evidence without sending customer email by default.

Risk reduced:

- `GET /email/retry-worker/plan` is read-only/no-mutation and reports worker enabled/configured state, scheduler provider `NONE` by default, due retry counts, suppressed counts, active suppression counts, max-attempts policy, blockers, and warnings.
- `POST /email/retry-worker/run` is disabled by default with `LEDGERBYTE_EMAIL_RETRY_WORKER_ENABLED=false`; default responses skip without sending email or mutating data.
- Enabled worker runs still require `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=true` before delegating to the existing due-record retry processor, which respects suppressions and max attempts.
- `EmailDeliveryMonitoringEvidence` stores metadata-only retry throughput, bounce alert, complaint alert, suppression trend, delivery dashboard, and provider webhook health evidence.
- `/email/monitoring-plan` and `/email/monitoring-evidence` list/create/verify/revoke endpoints require `users.manage`, send no email, create no outbox record, and reject SMTP/API/webhook secrets, raw provider payloads, customer recipient lists, and customer message bodies.
- `/settings/email-outbox` now shows retry worker status, monitoring evidence state, bounce/complaint threshold blockers, suppression trend blockers, webhook health blockers, and monitoring evidence controls.
- Smoke now asserts worker plan/run safety, monitoring plan/evidence safety, no secret exposure, no customer email by default, and `productionReady=false`.

Remaining risks:

- The worker run shell is not a production scheduler or queue.
- Provider-specific webhook adapters, real relay execution evidence, external monitoring integration, real alert delivery, and live DNS/provider validation remain pending.

### Email webhook suppression readiness added

Added disabled-by-default signed provider webhook verification planning, metadata-only suppression handling, and monitoring-safe bounce/complaint readiness without sending customer email by default.

Risk reduced:

- `EmailSuppression` stores tenant-scoped masked/hash suppression metadata for bounce, complaint, manual, and provider-event sources; raw suppression emails are accepted only as request input and are not returned.
- `GET /email/provider-events/webhook-plan` is read-only/no-mutation and reports webhook verification enabled/configured state, allowed-provider configuration, verified-event count, no raw headers, no raw provider payload, and no webhook secret returned.
- `POST /email/provider-events/webhook` is disabled by default; disabled or unsigned input persists no provider event, mutates no outbox record, and sends no email. When explicitly enabled, it accepts only allowlisted provider-agnostic HMAC test signatures.
- `GET /email/suppressions`, `POST /email/suppressions`, and `POST /email/suppressions/:id/revoke` require `users.manage`, send no email, create no outbox record, and expose only metadata.
- Active suppressions block matched send/retry attempts without calling the provider.
- `/settings/email-outbox` now shows webhook verification, webhook secret configured/missing, suppression list controls, suppressed retry counts, and alerting/monitoring blockers.
- Smoke now asserts webhook plan safety, suppression masking/hash behavior, retry-plan suppression counts, no secret exposure, no customer email by default, and `productionReady=false`.

Remaining risks:

- The webhook verifier is provider-agnostic/test-only; production still needs provider-specific signature contracts and exposure strategy.
- Retry worker planning exists, but a production scheduler/queue is still required before production delivery.
- Monitoring-safe evidence exists, but no external monitoring integration or alert delivery exists.
- Real non-production relay execution and live DNS/provider validation remain pending.

### Email retry and bounce readiness added

Added durable transactional email retry metadata, disabled-by-default retry processing, and metadata-only provider event capture without sending customer email by default.

Risk reduced:

- `EmailOutbox` now records attempt count, max attempts, next/last attempt timestamps, redacted last error, provider event status, delivery/bounce/complaint timestamps, and retry lock metadata.
- `GET /email/retry-plan` is read-only/no-mutation and reports pending, retryable failed, blocked, and due retry counts without sending email.
- `POST /email/retry-process` requires `users.manage` and is disabled by default with `LEDGERBYTE_EMAIL_RETRY_PROCESSOR_ENABLED=false`; default responses skip without sending email or mutating data.
- Enabled retry processing only handles due retryable outbox records, obeys max attempts, creates no new outbox records, updates existing metadata, and returns redacted provider summaries.
- `EmailProviderEvent`, `GET /email/provider-events/plan`, and unsigned `POST /email/provider-events/mock` capture metadata-only local/mock provider events while rejecting SMTP/API/provider secrets, auth headers, URLs, private DKIM keys, raw payloads, customer recipients, and customer message bodies.
- `/settings/email-outbox` now shows retry pending/blocked counts, retry processor state, mock-only provider event readiness, bounce signature status, monitoring blockers, and no-customer-email safety messaging.
- Smoke now asserts retry-plan shape, default retry processor skip/no-send/no-mutation behavior, provider-event readiness, no outbox mutation, and secret-marker redaction.

Remaining risks:

- Retry processing is not scheduled; a real worker/queue is still required before production delivery.
- Provider events are mock-only and unsigned; production still needs signed webhook verification, suppression-list handling, monitoring, and alerting.
- Real non-production relay execution and live DNS/provider validation remain pending.

### Email sender-domain readiness added

Added metadata-only sender-domain evidence capture and non-production relay diagnostics planning without sending customer email by default.

Risk reduced:

- `EmailSenderDomainEvidence` stores tenant-scoped SPF/DKIM/DMARC/MX/return-path/provider-verification metadata only.
- `/email/sender-domain-evidence` list/create/verify/revoke endpoints require `users.manage`, send no email, create no outbox record, and reject SMTP passwords, API keys, tokens, authorization headers, connection URLs, provider secrets, private DKIM keys, and customer email content.
- `GET /email/readiness` now reports sender-domain status, missing/verified SPF/DKIM/DMARC, relay diagnostics status, and explicit false states for bounce webhooks, retry policy, and monitoring.
- `GET /email/diagnostics-plan` exposes a no-send/non-mutation plan; `POST /email/diagnostics` remains disabled by default and still creates no outbox record.
- `/settings/email-outbox` now shows sender-domain evidence status, relay/bounce/retry/monitoring blockers, and safe metadata capture controls.
- Smoke now asserts sender-domain readiness shape, default-disabled diagnostics, no outbox mutation, and secret-marker redaction.

Remaining risks:

- Relay diagnostics still need an explicitly enabled sandbox/non-production SMTP run against an allowlisted recipient.
- DKIM/SPF/DMARC evidence is manual metadata only; there is no live DNS/provider validation.
- Scheduled retry execution, signed bounces/webhooks, monitoring, provider event verification, and production template review remain incomplete.

### Email readiness diagnostics added

Added production SMTP/email readiness validation and disabled-by-default diagnostics without sending real customer email by default.

Risk reduced:

- `GET /email/readiness` now returns read-only/no-mutation provider readiness, production SMTP configuration booleans, blockers, warnings, diagnostics gate status, and redaction guarantees.
- `POST /email/diagnostics` returns `SKIPPED_DISABLED`, `executionAttempted=false`, `noEmailSent=true`, `noCustomerEmailSent=true`, and `noMutation=true` unless `LEDGERBYTE_EMAIL_DIAGNOSTICS_SEND_ENABLED=true` and an allowlisted recipient is provided.
- Optional diagnostics execution uses a safe diagnostic subject/body, does not persist outbox records, masks recipients in responses, and returns only redacted delivery summaries.
- `/settings/email-outbox` now shows production readiness, password-reset/invite reliability warnings, diagnostics disabled-by-default status, and no-customer-email messaging.
- Smoke now asserts readiness/diagnostics no-send behavior, no outbox mutation, and common secret-marker redaction.

Remaining risks:

- Production SMTP still needs a real non-production relay validation run, live DKIM/SPF/DMARC/provider validation, retries, bounces/webhooks, monitoring, and template review.
- Diagnostics sending must remain disabled by default in production until the allowlist and provider test process are approved.

### ZATCA PIH chain and generated address warning pass

Used only the repo-local official ZATCA SDK readme, `Configuration/usage.txt`, Schematron rules, `Data/PIH/pih.txt`, official samples, XML/security PDFs, and data dictionary to investigate the fresh-EGS invoice 2 `KSA-13` failure.

Confirmed cause:

- LedgerByte persisted invoice 2 PIH as invoice 1's SDK hash and hash compare returned `MATCH`.
- The SDK `-validate` command reads the expected previous hash from `Configuration/config.json` `pihPath`.
- The default `pihPath` file contains the official first-invoice PIH seed, so invoice 2 validation was comparing against the wrong previous hash.

Risk reduced:

- The SDK validation wrapper now uses a temporary invoice-specific `pihPath` file containing `ZatcaInvoiceMetadata.previousInvoiceHash` when validating generated invoice XML.
- Added `corepack pnpm zatca:debug-pih-chain` as a local-only debug runner for fresh-EGS two-invoice PIH-chain validation.
- Generated buyer mapping now emits `Contact.addressLine1` as buyer `StreetName` and `Contact.addressLine2` as buyer `CitySubdivisionName`.
- Latest local debug run validated `INV-000001` and `INV-000002` globally through the SDK; `KSA-13` is resolved for this local fresh-EGS generated standard-invoice path.

Remaining risks:

- Generated XML still warns `BR-KSA-63` because the current `Contact` model does not capture a dedicated 4-digit buyer building number.
- LedgerByte is still not ZATCA production compliant.
- Signing/certificate handling, real CSID onboarding, clearance/reporting, Phase 2 QR, PDF/A-3, key custody, and sandbox credentials remain unimplemented.

### ZATCA SDK hash mode persistence groundwork added

Used only the repo-local official ZATCA SDK readme, `Configuration/usage.txt`, Schematron rules, `Data/PIH/pih.txt`, official samples, and XML/security PDFs to add explicit local-only SDK hash persistence safeguards.

Risk reduced:

- Added persistent `ZatcaHashMode` with `LOCAL_DETERMINISTIC` as the default and `SDK_GENERATED` as an explicit per-EGS opt-in.
- Added fresh-EGS-only `POST /zatca/egs-units/:id/enable-sdk-hash-mode` requiring `zatca.manage`, SDK readiness, `confirmReset=true`, a reason, and zero existing invoice metadata.
- Added `ZatcaInvoiceMetadata.hashModeSnapshot` so generated metadata records show whether local or SDK hash mode was active.
- SDK mode now persists SDK `-generateHash` output as invoice hash/XML hash for future metadata, chains PIH from the prior SDK hash, stays idempotent on repeated generation, and rolls back on SDK hash failure.
- `GET /zatca/hash-chain-reset-plan` now shows per-EGS hash mode, metadata counts, SDK readiness blockers, and enablement recommendations.
- `/settings/zatca` now shows a hash mode/SDK hash chain panel with blockers, reason/confirmation controls, and local-only warnings.
- Invoice detail hash comparison now shows EGS hash mode, metadata hash mode, stored hash, and SDK mismatch warnings.
- Added audit event `ZATCA_SDK_HASH_MODE_ENABLED`.
- Updated smoke to verify default local mode, blocked SDK-mode enablement, reset-plan blockers, and no metadata mutation.

Current state:

- SDK hash persistence is not automatic and does not apply to existing EGS units with metadata.
- Existing local deterministic hash chains are not migrated in place; use a fresh EGS unit for SDK mode.
- SDK hash mode is still local-only and requires explicit SDK execution/readiness.

Remaining risks:

- LedgerByte is still not ZATCA production compliant.
- Signing/certificate handling, real CSID onboarding, clearance/reporting, Phase 2 QR, and PDF/A-3 remain unimplemented.
- Repeatable Java 11-14 CI/Docker execution, real key custody, sandbox credentials, and accountant/legal review are still required before production use.

### ZATCA official hash-chain replacement planning added

Used only the repo-local official ZATCA SDK readme, `Configuration/usage.txt`, Schematron rules, `Data/PIH/pih.txt`, official samples, and XML/security PDFs to plan the transition from LedgerByte's local deterministic hash chain to SDK/C14N11-backed hashes.

Risk reduced:

- Added `ZATCA_HASH_MODE=local` as the safe default planning mode.
- Added no-mutation `POST /sales-invoices/:id/zatca/hash-compare` for app-hash vs SDK `-generateHash` comparison.
- Added dry-run `GET /zatca/hash-chain-reset-plan` for active EGS ICV/last-hash state, existing invoice metadata, reset risks, and recommended next steps.
- Added `/settings/zatca` hash-chain status and reset-plan visibility.
- Added invoice-detail SDK hash comparison UI with local-only/no-mutation warnings.
- Updated smoke to assert disabled-by-default hash compare behavior and verify metadata/EGS state is not mutated.

Current state:

- SDK hash can now be stored only for future metadata generated under a fresh EGS unit explicitly enabled for `SDK_GENERATED`.
- EGS units with existing metadata still use the local deterministic hash chain and are blocked from in-place SDK-mode migration.
- Reset planning is visibility only; no automatic reset or purge exists.

Remaining risks:

- LedgerByte is still not ZATCA production compliant.
- Signing/certificate handling, real CSID onboarding, clearance/reporting, Phase 2 QR, and PDF/A-3 remain unimplemented.
- Official hash persistence still needs repeatable fresh-EGS runtime validation, local/CI Java strategy, reset approval, and key custody design before production use.

### API-generated ZATCA XML validation and SDK hash comparison

Used only the repo-local official ZATCA SDK readme, `Configuration/usage.txt`, official standard/simplified samples, Schematron rules, and XML/security PDFs to validate generated invoice XML and add read-only SDK hash comparison.

Risk reduced:

- Added SDK `fatoora -generateHash -invoice <filename>` command planning through the existing argument-array wrapper.
- Added SDK hash output parsing and response fields: `sdkHash`, `appHash`, `hashMatches`, and `hashComparisonStatus`.
- Kept SDK execution disabled by default; normal smoke still expects `hashComparisonStatus=BLOCKED`.
- Fixed Windows SDK execution under sanitized child-process env by resolving `cmd.exe` through ComSpec/SystemRoot and preserving `Path`/`PATH`.
- Added `scripts/validate-generated-zatca-invoice.cjs` to validate generated invoice XML through a running local API without printing tokens, passwords, or XML.
- Added `docs/zatca/HASH_CHAIN_AND_PIH_PLAN.md` to document current metadata hash behavior and migration/reset impact.

Result:

- Official standard invoice sample SDK hash: `V4U5qlZ3yXQ/Si1AC/R8SLc3F+iNy27wdVe8IWRqFAQ=`.
- Official simplified invoice sample SDK hash: `z5F9qsS6oWyDhehD8u8S0DaxV+2CUiUz9Y+UsR61JgQ=`.
- LedgerByte standard fixture SDK hash remains `Lt2QoJTH0yk6yJYK7vtb59zfyYwFOb8RsWWrpMdGCVg=`.
- LedgerByte simplified fixture SDK hash remains `5Ikqk68Pa1SveBTWh+K5tF55LUoj+GhLzj/Ib78Bpfw=`.
- API-generated invoice XML for `INV-000072` validated locally through the wrapper with SDK exit code `0`.
- Generated invoice app hash `X8UbEeT1oEdrpx2lMCNRUljZtcylcMoj1HSnaCWSDb8=` did not match SDK hash `ZVhjW6kwGeZ58ZYw1l9+9dBPm+m2CIWxKX4pDXVzTsU=`, which confirms current app hash-chain storage is still local-only groundwork.

Remaining risks:

- LedgerByte is still not ZATCA production compliant.
- Generated XML still has production-quality seller/buyer address and identifier warnings.
- App hash-chain storage still uses a local deterministic hash and must not be used for real ZATCA chains.
- Signing/certificate handling, Phase 2 QR, CSID onboarding, clearance/reporting, and PDF/A-3 are not implemented.

### ZATCA supply-date and PIH/hash groundwork

Used only the repo-local official ZATCA SDK samples, Schematron rules, SDK docs, XML/security PDFs, data dictionary, and `Data/PIH/pih.txt` to close the remaining non-signing XML fixture gaps.

Risk reduced:

- Added standard invoice supply-date mapping as `cac:Delivery/cbc:ActualDeliveryDate`, based on `BR-KSA-15` and data dictionary `KSA-5`.
- Changed missing previous-invoice-hash behavior to use the official first-invoice PIH fallback value, base64 SHA-256 of `0`.
- Preserved explicit PIH overrides for future hash-chain sequencing.
- Added blocked hash-input groundwork helpers that remove the documented UBL extension, QR ADR, and signature nodes but do not fake official C14N11 output.
- Recorded SDK `-generateHash` fixture outputs as future oracle values without changing app hash behavior.
- Mapped generated sales invoice XML to use issue date as the current local supply-date fallback until a separate supply/delivery date field exists.

Result:

- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples still pass under Java 11 with the official launcher.
- LedgerByte standard fixture now passes SDK `[XSD]`, `[EN]`, `[KSA]`, `[PIH]`, and global validation.
- LedgerByte simplified fixture now passes SDK `[XSD]`, `[EN]`, and `[PIH]`; remaining failures are expected non-production signing, certificate, and Phase 2 QR gaps.

Remaining risks:

- LedgerByte is still not ZATCA production compliant.
- Official C14N11 hash computation is not implemented in app code.
- Generated invoice XML still needs SDK validation through the local API.
- Signing/certificate handling and Phase 2 QR are not implemented.
- CSID onboarding, clearance/reporting, and PDF/A-3 are not implemented.

### ZATCA XML structural fixes against SDK gaps

Used the official repo-local SDK samples and UBL schemas to correct LedgerByte's local XML skeleton without signing or network calls.

Risk reduced:

- Fixed UBL root/header ordering so `cbc:IssueDate` and `cbc:IssueTime` appear in the SDK-accepted order.
- Moved ICV into the official `cac:AdditionalDocumentReference` shape with `cbc:ID=ICV` and `cbc:UUID`.
- Kept PIH in the official ADR attachment shape and documented that the value is still a local placeholder until canonical hash-chain work exists.
- Added QR ADR attachment structure for local QR output while keeping Phase 2 cryptographic QR out of scope.
- Mapped standard and simplified invoice transaction flags to official sample values `0100000` and `0200000`.
- Adjusted local fixture seller/buyer identifiers, tax totals, monetary totals, address order, and line classified tax category shape.

Result:

- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples still pass under Java 11 with the official launcher.
- LedgerByte standard fixture improved from XSD/KSA failure to SDK `[XSD]`, `[EN]`, and `[KSA]` pass; remaining global failure is `KSA-13` PIH, with warning `BR-KSA-15` for supply date.
- LedgerByte simplified fixture improved to SDK `[XSD]` and `[EN]` pass; remaining failures are signing, QR, and PIH related.

Remaining risks:

- LedgerByte XML is still not production compliant.
- PIH/canonical hash-chain behavior is not implemented.
- Signing/certificate handling and Phase 2 QR are not implemented.
- CSID onboarding, clearance/reporting, and PDF/A-3 are not implemented.
- Generated invoice XML through the API still needs SDK validation.

### Official ZATCA SDK fixture validation pass

Used only the repo-local official `reference/` folder to inspect the ZATCA SDK, docs, schemas, rules, samples, manuals, and data dictionary. The SDK command was verified from official local files as `fatoora -validate -invoice <filename>`. A supported Java 11 runtime was found locally and used without changing global Java.

Risk reduced:

- `GET /zatca-sdk/readiness` now reports explicit Java support fields, required range `>=11 <15`, the Java command used, Java blocker message, and official SDK command string.
- The SDK wrapper now prefers the official launcher over direct JAR execution and passes `SDK_CONFIG`/`FATOORA_HOME` through the execution environment.
- Added `scripts/zatca-sdk-readiness.cjs` to print local Java/SDK readiness without network calls or secrets.
- Updated `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` with Java detection, exact official fixture pass output, exact LedgerByte fixture failure messages, and next technical fixes.
- Added/updated tests for Java 11-14 support detection, Java 15/17 blockers, command construction, readiness fields, disabled default behavior, and SDK output safety.

Result:

- Default local Java is OpenJDK 17.0.16 and remains unsupported for the SDK.
- Java 11.0.26 was found at `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`.
- Official standard invoice, simplified invoice, standard credit note, and standard debit note samples passed with the official launcher.
- The official simplified invoice also emitted warning `BR-KSA-98` about simplified invoice submission within 24 hours.
- LedgerByte local standard and simplified XML fixtures failed official SDK validation with XSD ordering, `ICV`/`PIH`, transaction-code, party-identifier, tax-total, and simplified line-calculation gaps.
- Generated invoice XML validation through the API was skipped because the local API/database stack was not confirmed running.

Remaining risks:

- Signing is not implemented.
- CSID onboarding is not implemented.
- Clearance/reporting is not implemented.
- PDF/A-3 is not implemented.
- Production compliance is not claimed.
- LedgerByte simplified XML still fails production-critical signing/QR/certificate checks, even though the local standard fixture now passes SDK global validation.
- Real local/CI fixture validation still needs a repeatable Java 11-14 runtime or Docker wrapper.

### SMTP provider adapter added

Added an opt-in transactional SMTP adapter behind `EMAIL_PROVIDER=smtp`, while keeping `EMAIL_PROVIDER=mock` as the default for local development, tests, and smoke runs.

Risk reduced:

- `nodemailer` is now available in the API workspace for provider-neutral SMTP delivery.
- `EmailDeliveryStatus` now distinguishes `SENT_PROVIDER` from `SENT_MOCK`.
- `EmailTemplateType` now includes `TEST_EMAIL` for provider verification without touching invite/reset behavior.
- `GET /email/readiness` reports SMTP readiness and real-send status without exposing `SMTP_PASSWORD`.
- `POST /email/test-send` exercises the active provider and records the result in `EmailOutbox`.
- `/settings/email-outbox` now shows provider warnings and a permission-gated test-send form.
- Smoke verifies mock remains default and test-send records an outbox message without real external delivery.

Remaining risks:

- Mock remains default; real SMTP credentials and sender-domain validation are still required before production use.
- No background email queue, retry worker, bounce/complaint handling, provider webhooks, suppression list, or DKIM/SPF/DMARC validation workflow.
- No invoice/statement email sending yet.

### S3-compatible attachment adapter added

Added a real S3-compatible storage adapter for new uploaded attachments behind `ATTACHMENT_STORAGE_PROVIDER=s3`, while keeping database/base64 storage as the default.

Risk reduced:

- `@aws-sdk/client-s3` is now available for S3-compatible upload/download storage work.
- `AttachmentStorageProvider` now includes `S3` for active object-storage metadata.
- `S3AttachmentStorageService` writes new objects to `org/{organizationId}/attachments/{attachmentId}/{safeFilename}` with content type and safe metadata.
- S3-backed attachments store `storageKey`, `contentHash`, and `sizeBytes` while keeping `contentBase64` null.
- Downloads read through the API from the configured S3-compatible bucket, preserving tenant-scoped authorization.
- `/storage/readiness` reports S3 configuration readiness without exposing secrets, and `/storage/migration-plan` distinguishes database and S3 attachment counts.
- `/settings/storage` shows the active target provider and redacted S3 readiness state.

Remaining risks:

- Database storage remains the default provider.
- Existing database attachments are not migrated.
- Generated documents remain database-backed.
- No virus scanning, OCR, signed URL policy, lifecycle/retention policy, or physical object purge exists yet.
- The adapter still needs non-production bucket validation with real credentials before production use.

### Frontend route QA polish pass

Reviewed implemented frontend routes for route stability, stale links, permission-aware dashboard navigation, and narrow-screen table behavior without changing accounting or API business behavior.

Risk reduced:

- Static route inventory covered 111 `page.tsx` route patterns under `apps/web/src/app`.
- Literal app-link sweep found no unmatched frontend app links after fixes.
- Dashboard KPI and metric drill-downs now use the shared permission-aware drill-down helper for customer payments, supplier payments, bank account/reconciliation review, negative stock, and fiscal periods.
- The stale dashboard `/bank-reconciliations` link was replaced with the existing `/bank-accounts` review route.
- Accounts, contacts, branches, tax rates, fiscal periods, manual journals, and sales invoices now use horizontal table overflow wrappers with stable minimum widths on narrow screens.

Remaining risks:

- Browser E2E remains smoke-level and does not replace full visual regression testing.
- Dynamic detail pages still need periodic manual responsive review as data volumes grow.
- No custom empty/error-state component refactor was added in this pass because existing route-local states were already present across the reviewed surfaces.

### Dashboard charts and drilldowns added

Added lightweight dashboard chart widgets and permission-aware KPI drill-down links without changing accounting behavior or report calculations.

Risk reduced:

- `GET /dashboard/summary` now includes last-six-month sales, purchases, net profit, and cash balance trend arrays.
- The summary response includes AR/AP aging buckets and a low-stock watchlist for dashboard widgets.
- `/dashboard` renders simple CSS/HTML trend bars, aging bars, low-stock rows, severity grouping, last-updated text, and "View report" links.
- KPI cards and attention rows link to existing review/report pages where the active role has the needed permission.
- Smoke checks now verify the trend/aging payload shape and sensitive-field exclusion.

Remaining risks:

- No customizable dashboard or saved widget preferences.
- No advanced charting, forecasting, or visual regression testing.
- KPI and alert definitions still need accountant/product review before production reliance.
- Dashboard remains read-only and does not replace detailed reports, ledgers, or reconciliations.

### Product Audit v2 completed

Added a current-state Product Audit v2, readiness scorecard, and prioritized next-30-prompts roadmap after the latest dashboard, audit, inventory, storage, email, E2E, and deployment-readiness work.

Current readiness snapshot:

- Local demo MVP: 88%.
- Private beta: 62%.
- Production SaaS: 38%.
- Saudi/ZATCA production readiness: 28%.
- Xero/Wafeq competitor readiness: 45%.

Current top 10 risks:

1. ZATCA is not production compliant; local standard fixture validation now passes, but generated XML validation, official hash integration, signing, CSID, clearance, reporting, and PDF/A-3 remain missing.
2. Database/base64 attachment and generated-document storage is still active; real object storage and migration are pending.
3. Mock/local email remains the default; real provider delivery, retries, bounces, and domain authentication are pending.
4. Production operations are not ready: backups, restore drills, monitoring, alerts, and incident runbooks are missing.
5. No SaaS billing, tenant limits, subscription lifecycle, or support tooling exists.
6. No MFA, advanced session invalidation, or full security review exists.
7. Audit visibility is strong for MVP but no immutable external audit store, scheduled export, alerting, or tamper evidence exists.
8. Inventory accounting remains manual and policy-gated; landed cost, FIFO, serial/batch, returns, and automatic postings are not implemented.
9. Banking has manual reconciliation and limited manual OFX/CAMT/MT940 parser groundwork, but no live feeds, auto-match, certified bank-specific parser coverage, fees, or FX transfer handling.
10. Dashboard/report definitions need accountant/product review before production reliance.

Next recommended prompt:

> Run a full route QA polish pass across implemented LedgerByte screens, fixing only real loading, empty, error, permission, and responsive UI defects without changing accounting behavior.

### Dashboard KPI overview added

Added a read-only dashboard summary API and business overview UI without changing accounting behavior.

Risk reduced:

- `GET /dashboard/summary` requires `dashboard.view` and returns tenant-scoped sales, purchase, banking, inventory, report-health, compliance/admin, and attention-item metrics.
- `/dashboard` now shows KPI cards, AR/AP monthly totals, banking and inventory review counts, compliance/admin status, attention links, and permission-gated quick actions.
- Attention items highlight overdue invoices, overdue bills, unreconciled bank transactions, low stock, clearing variances, ZATCA readiness blockers, fiscal-period issues, and database-backed storage warnings.
- Smoke now checks the dashboard summary shape and verifies no obvious sensitive fields are exposed.

Remaining risks:

- No customizable dashboard.
- No advanced charting, saved widget preferences, or accountant-approved chart thresholds.
- KPI definitions need accountant/product review before production reliance.
- Dashboard is read-only and does not replace detailed reports, ledgers, or reconciliations.

### Number sequence settings added

Added guarded number-sequence list/detail/update APIs and a Settings UI for document numbering configuration without changing existing generated numbers.

Risk reduced:

- `GET /number-sequences` and `GET /number-sequences/:id` expose tenant-scoped scope, prefix, next number, padding, example, and update timestamp to users with `numberSequences.view`.
- `PATCH /number-sequences/:id` requires `numberSequences.manage`, validates prefix characters/length, validates padding, and rejects lowering `nextNumber`.
- Prefix, padding, and next-number updates affect future documents only and do not renumber historical records.
- `NUMBER_SEQUENCE_UPDATED` audit logs record old/new prefix, next number, padding, and example values.
- `/settings/number-sequences` gives permitted admins/accountants a review and edit surface.
- Smoke checks number-sequence listing, safe no-op patch behavior, example formatting, and audit-log creation.

Remaining risks:

- No reset workflow.
- No per-branch numbering.
- No document-type template rules.
- No historical renumbering.
- No deeper collision analysis beyond blocking lower `nextNumber` values.

### Audit log export and retention controls added

Added filtered audit-log CSV export, tenant retention policy settings, dry-run retention preview, and admin UI controls without automatic deletion.

Risk reduced:

- `GET /audit-logs/export.csv` exports the same tenant-scoped filters as the audit-log list and serializes only sanitized metadata.
- `AuditLogRetentionSettings` stores per-organization retention controls with a 2555-day default, `autoPurgeEnabled` disabled by default, and export-before-purge tracking.
- `GET /audit-logs/retention-settings`, `PATCH /audit-logs/retention-settings`, `GET /audit-logs/retention-preview`, and `POST /audit-logs/retention-dry-run` expose retention policy and dry-run counts without deleting logs.
- `/settings/audit-logs` now lets permitted users export CSV and lets admins review/update retention settings and preview old-log counts.
- Smoke now checks retention settings, retention dry-run preview, CSV content type, and CSV redaction of sensitive audit metadata.

Remaining risks:

- No immutable external audit store.
- No scheduled audit export.
- No automatic purge or archive executor.
- No alerting or anomaly detection.
- No tamper-evident audit chain.

### Audit log coverage and UI added

Added standardized audit visibility for important accounting, security, user-management, document, bank, inventory, and ZATCA actions.

Risk reduced:

- `apps/api/src/audit-log/audit-events.ts` now maps generic service actions to explicit event names such as `SALES_INVOICE_FINALIZED`, `PURCHASE_BILL_FINALIZED`, `COGS_POSTED`, `PURCHASE_RECEIPT_ASSET_POSTED`, `ATTACHMENT_UPLOADED`, `AUTH_PASSWORD_RESET_COMPLETED`, and `ZATCA_XML_GENERATED`.
- Audit metadata is recursively sanitized before storage and response serialization; passwords, token values/hashes, secrets, API/access keys, private keys, authorization headers, and base64 payload fields are redacted.
- `GET /audit-logs` now supports action, entity type, entity id, actor, date, search, limit, and page filters.
- `GET /audit-logs/:id` returns tenant-scoped sanitized detail.
- `/settings/audit-logs` gives permitted admins/accountants a filterable log table and detail view.
- Generated document archiving, invite acceptance, login, password reset request/completion, and existing high-risk accounting/inventory/document actions now have stronger audit visibility.
- Smoke now checks representative audit records for invoice finalization, attachment upload/delete, COGS post/reversal, and sensitive metadata redaction.

Coverage map:

- Already audited: auth token delivery events, role/member administration, journal/fiscal period changes, sales finalization/void/payment/refund/credit note actions, purchase bill/order/payment/refund/debit note/cash expense actions, bank transfers/statements/reconciliations, inventory adjustments/transfers/receipts/issues/COGS/receipt asset/variance proposals, attachments, generated documents, document settings, and ZATCA local actions.
- Missing or low priority: harmless GET/list/detail reads, report JSON/CSV reads, external immutable audit store, scheduled export, automatic purge/archive executor, alerting, anomaly detection, and tamper-evident audit hash chaining.

Remaining risks:

- No external immutable audit store.
- No scheduled audit export.
- No automatic purge or archive executor.
- No alerting or anomaly detection.
- No tamper-evident audit chain.
- Low-risk read activity is not logged by design.

### API root status endpoint added

Added safe API status visibility so opening the deployed API base URL no longer looks like downtime.

Risk reduced:

- `GET /` now returns public, non-sensitive LedgerByte API status JSON with `/health` and `/readiness` links, a sanitized environment label, and a timestamp.
- `GET /health` remains lightweight and independent of database connectivity.
- `GET /readiness` performs a safe database connectivity check and returns `503` with redacted JSON if the database is unavailable.
- The deployed E2E environment check script now verifies API root, `/health`, and `/readiness` before running browser smoke.
- Deployment docs now explain how to distinguish root status, function health, database readiness, CORS failures, stale deployments, and DB outages.

Remaining risks:

- `/readiness` is a minimal database check only; it does not validate migrations, seed data, CORS, or all downstream services.
- A just-pushed commit still depends on Vercel redeploying the API alias before the deployed root URL reflects the new status endpoint.
- Supabase RLS remains a separate deployment security review item.

### Supabase Data API grant hardening added

Audited and partially hardened the user-testing Supabase exposure model without enabling broad RLS or changing application behavior.

Risk reduced:

- Confirmed the web app uses the Nest API through `NEXT_PUBLIC_API_URL`; no direct Supabase REST, GraphQL, Realtime, or Storage client path was found in the inspected app code.
- Confirmed the API uses Prisma/Postgres as the runtime data path and LedgerByte JWT/organization guards as the application tenant boundary.
- Metadata review found 76 public tables with RLS disabled and broad `anon`/`authenticated` public table grants before mitigation.
- Revoked `anon` and `authenticated` grants on public tables, sequences, and functions in the user-testing project, including `postgres`-owned future default grants for those roles.
- API/web health stayed HTTP `200`, readiness stayed `ok`, and `smoke:accounting:reports` passed with secret-store credentials after the grant change.

Remaining risks:

- RLS is still disabled on 76 public tables and must not be enabled blindly without compatible policies.
- The Supabase Data API Dashboard toggle was not changed because the setting was not exposed through the current tool surface.
- The Prisma runtime database role is not yet least-privilege; runtime and migration/admin credential separation remains a dedicated follow-up. The planned user-testing role is `ledgerbyte_app_runtime_user_testing`, but it was not created because no safe Vercel API `DATABASE_URL` mutation path was available to store the generated password, redeploy, and validate without printing secrets.
- `supabase_admin` default privileges for future public objects still include `anon`/`authenticated`; current direct object grants remain revoked, but future-object defaults need a reviewed follow-up pass.
- `service_role` remains a high-risk admin key class and must stay out of browser and ordinary runtime paths.

### Deployed E2E readiness docs added

Added non-production CI database readiness and deployment security documentation for the Vercel/Supabase test environment.

Risk reduced:

- `docs/deployment/CI_DATABASE_READINESS_CHECKLIST.md` defines the non-production database, migration, seed user, test organization, API/web URL, GitHub secrets, and go/no-go checks required before trusting deployed E2E.
- `docs/deployment/SUPABASE_SECURITY_REVIEW.md` documents the current RLS-disabled posture, API-layer tenant isolation boundary, direct database access risk, and production go/no-go security review items.
- `docs/deployment/DEPLOYED_E2E_RUNBOOK.md` explains manual GitHub Actions execution, artifacts, common deployment failures, and recovery steps.
- `scripts/check-deployed-e2e-env.cjs` now prints a safe redacted preflight summary without exposing the E2E password.
- The deployed E2E workflow now has a conservative concurrency group and read-only repository permissions.
- README now links the readiness docs and shows the deployed E2E workflow badge.

Remaining risks:

- No automatic DB reset before deployed E2E.
- Supabase RLS policies are not enabled yet.
- Deployed E2E remains manual-only; no scheduled CI.
- No production deployment approval gates.
- Browser E2E remains smoke-level and does not replace API accounting smoke.

### Deployed E2E GitHub Actions workflow added

Added CI wiring for the deployed Playwright smoke suite without changing product behavior.

Risk reduced:

- `.github/workflows/deployed-e2e.yml` now runs the deployed browser smoke suite through manual GitHub Actions dispatch.
- The workflow uses `LEDGERBYTE_E2E_EMAIL` and `LEDGERBYTE_E2E_PASSWORD` from GitHub Secrets and keeps deployed web/API URLs configurable through dispatch inputs or repository variables.
- `scripts/check-deployed-e2e-env.cjs` fails early when test URLs, credentials, or API health are missing before Chromium launches.
- Playwright failure artifacts are uploaded from `playwright-report/` and `test-results/` when present.
- Browser E2E docs now explain manual dispatch, required secrets, deployed environment prerequisites, and artifact inspection.

Remaining testing risks:

- The workflow is manual-only; no scheduled or push-triggered deployed run is active yet.
- It still depends on a migrated, seeded, non-production Supabase test database.
- Browser smoke remains route/form/readiness coverage and does not replace deep API accounting smoke.
- Supabase public-table RLS remains a deployment security review item.

### Deployed browser E2E smoke stabilized

Ran the Playwright browser smoke suite against the deployed LedgerByte test environment:

- Web: `https://ledgerbyte-web-test.vercel.app`
- API: `https://ledgerbyte-api-test.vercel.app`
- Result: 11 specs passed.

Bugs found and fixed:

- The deployed Supabase database was missing recent Prisma migrations for inventory variance proposals, attachments, email invite/password reset, and token rate-limit tables. The missing migrations were applied to the test database and the migration history was aligned.
- One migration referenced tables and enums before their own migrations were guaranteed to exist. The migration was made compatibility-safe and the rate-limit table creation was moved into a later ordered migration.
- The API opened too many concurrent Prisma sessions for the small Supabase/Vercel test environment. Prisma now defaults to `connection_limit=1` on Vercel unless explicitly overridden.
- Storage migration-plan and ZATCA readiness pages triggered unnecessary concurrent API/database pressure in the deployed environment. Those paths now load sequentially enough for smoke reliability.
- The web API client could receive cached/304 auth responses in the deployed browser, which caused transient access-denied states. App API requests now use `no-store` cache behavior.
- A few smoke selectors were too broad or too strict for deployed pages and were tightened to stable headings/text.
- The inventory route smoke needed a deployed-friendly per-test timeout because it checks many pages in a single browser test.

Remaining deployment/testing caveats:

- Browser E2E is still smoke-level and does not replace API accounting assertions.
- Supabase reported row-level security disabled on public tables during inspection; this remains a deployment security review item and was not auto-changed during browser QA.
- The deployed test database must be intentionally migrated before running deployed E2E.
- No CI wiring for deployed Playwright runs exists yet.

### Browser E2E smoke suite added

Added a Playwright browser smoke suite for critical LedgerByte workflows without changing product behavior.

Risk reduced:

- `corepack pnpm e2e` now runs a repeatable browser smoke suite against local `http://localhost:3000` and `http://localhost:4000`.
- E2E preflight checks fail with a clear "Start local API/web before running E2E." message if the app is not running.
- Shared helpers cover seeded-admin login, app navigation, API discovery for detail pages, unique-name generation, and browser console/page error capture.
- Browser coverage now includes auth/navigation, sales, purchases, banking, reports, inventory, attachments panel rendering, permissions/team pages, password reset/mock email outbox, ZATCA readiness, and storage readiness.
- `docs/testing/BROWSER_E2E_TESTING.md` documents local setup, commands, environment overrides, coverage boundaries, and known limitations.

Remaining testing risks:

- Browser E2E does not replace deep accounting assertions; API smoke remains the source of truth for journal and financial behavior.
- Attachment upload/download/delete and invite token acceptance remain API-smoke-owned for now.
- No visual regression testing.
- No CI wiring for Playwright yet.

### Email readiness and auth token rate limits added

Added production email provider readiness and DB-backed token delivery rate limits without making real sending the default.

Risk reduced:

- `GET /email/readiness` reports the active provider, mock mode, real-sending flag, SMTP configuration booleans, warnings, and blockers without exposing SMTP secret values.
- `SmtpEmailProvider` now has a real opt-in SMTP implementation; `smtp-disabled` still reports intentional non-delivery and `smtp` reports missing config blockers before any send attempt.
- Password reset requests are limited by email and IP while preserving the generic response used to avoid account enumeration.
- Organization invite requests are limited by email/organization/hour and organization/day, with clear authenticated admin errors.
- `AuthTokenRateLimitEvent` stores rate-limit evidence in the database for multi-instance safety.
- `POST /auth/tokens/cleanup-expired` removes expired unconsumed tokens older than 30 days for operational cleanup.
- `/settings/email-outbox` now shows provider readiness, redacted SMTP configuration state, and expired-token cleanup when permitted.

Remaining risks:

- SMTP is opt-in and still requires non-production relay validation before production use.
- No DKIM/SPF/domain authentication or deliverability handling.
- No MFA.
- No refresh-token rotation or advanced session invalidation.
- No background email queue, retry worker, bounce handling, or provider webhook handling.

### Invite/password reset groundwork added

Added mock/local email-token infrastructure for organization member invitations, invited-user onboarding, password reset, and outbox inspection.

Risk reduced:

- Organization invites now create or update `INVITED` memberships and can create invited users with unusable placeholder passwords until acceptance.
- Invite and password reset tokens are stored as SHA-256 hashes only; raw tokens appear only in generated mock/local links.
- Invite acceptance sets the user password, activates the membership, consumes the token, and returns a normal login response.
- Password reset requests always return a generic response and do not reveal whether an email exists.
- Password reset confirmation validates a one-hour token, updates the password, and consumes the token.
- `EmailOutbox` stores mock/local delivery records for invite and password reset templates, and `/settings/email-outbox` exposes tenant-scoped inspection for permitted admins.

Remaining risks:

- SMTP is opt-in; mock remains default, and no paid/provider-specific API adapter exists.
- No DKIM/SPF/domain authentication or deliverability handling.
- No MFA.
- No refresh-token rotation or advanced session management.

### Storage readiness/S3 groundwork added

Added production-grade storage planning and S3-compatible adapter groundwork without changing current upload behavior.

Risk reduced:

- Storage provider environment variables keep uploaded attachments and generated documents on database storage by default.
- `GET /storage/readiness` reports active providers, max size, S3 configuration booleans, warnings, and blocking reasons without returning secret values.
- `GET /storage/migration-plan` returns dry-run counts and byte totals for uploaded attachments and generated documents without copying, deleting, or rewriting content.
- `S3AttachmentStorageService` has since been implemented for feature-flagged uploaded-attachment storage when S3 config is complete.
- The `/settings/storage` page gives administrators a redacted readiness and migration-planning view.
- Storage architecture, S3 migration, and attachment security docs now define the future production path.

Remaining risks:

- Database storage is still the default upload path.
- No DB-to-S3 migration executor exists.
- No virus scanning.
- No retention policy.

### Document attachment groundwork added

Added reusable uploaded supporting-file infrastructure without changing generated document archive behavior or adding external storage.

Risk reduced:

- Uploaded files now have tenant-scoped `Attachment` metadata with sanitized filenames, original filename, MIME type, size, content hash, storage provider marker, active/deleted status, notes, upload/delete actors, and soft-delete lifecycle.
- The default MVP storage path is database/base64 behind an `AttachmentStorageService` abstraction; S3/object storage is now available only for new uploads when explicitly configured.
- Upload validates linked entity ownership before storing content and supports key accounting/operational records across sales, purchases, banking, inventory, contacts, items, and manual journals.
- Attachment APIs are permission-gated for view, upload, download, notes management, and soft delete.
- Frontend `AttachmentPanel` is mounted on key sales, purchase, banking, and inventory detail pages.
- Smoke coverage uploads attachments to a purchase bill, cash expense, and sales invoice, verifies list/download/soft-delete behavior, and confirms attachment actions do not create journals.

Remaining risks:

- Database storage is not production-scale.
- No virus scanning.
- No OCR or receipt scanning.
- No active S3/object storage upload provider.
- No retention policy.
- No email attachment sending or ZATCA attachment submission.

### Inventory variance proposal workflow added

Added an accountant-reviewed proposal workflow for inventory clearing differences without automatic posting.

Risk reduced:

- Clearing variance rows can now be converted into draft proposals only after the API recomputes the current variance amount from report data.
- Manual proposals require a positive amount and tenant-owned active posting debit and credit accounts.
- Proposal lifecycle is explicit: draft, submitted, approved, posted, reversed, or voided.
- Submission and approval create audit events only; they do not create journals.
- Posting requires an approved proposal, an open fiscal period on the proposal date, and an explicit user action.
- Reversal is explicit and creates a linked reversal journal using the existing journal reversal strategy.
- Posted proposals cannot be voided until reversed.

Remaining risks:

- No automatic variance posting.
- No landed cost.
- FIFO remains placeholder-only.
- Historical direct-mode bill migration/exclusion policy still requires accountant review.
- Accountant review is required before posting any variance proposal in production.

### Inventory accounting integrity audit completed

Reviewed the full inventory accounting chain after manual COGS posting, explicit purchase receipt asset posting, Inventory Clearing purchase bill finalization, and clearing reconciliation/variance reporting.

Audit result:

- No code-level double-counting defect was found in the audited manual posting paths.
- Direct-mode purchase bills remain blocked from receipt asset posting.
- Clearing-mode bills, receipt asset journals, reversals, and clearing reports are internally consistent for the current manual workflow.
- COGS posting and reversal remain explicit, permission-gated, fiscal-period guarded, and isolated from invoice posting.
- Inventory adjustments, warehouse transfers, stock movements, receipt creation, and stock issue creation remain operational-only unless an explicit manual posting action is used.
- Report/preview endpoints remain read-only and smoke-covered for no journal creation.

Remaining risks:

- No automatic variance posting or correction journals.
- No landed cost.
- FIFO remains placeholder-only.
- No direct-mode historical migration.
- Moving-average COGS remains an operational estimate requiring accountant review.

Recommendation:

- GO for an accountant-reviewed variance journal proposal workflow, provided it remains proposal-only until an authorized accountant explicitly posts a journal.

### Inventory clearing reconciliation and variance reporting added

Implemented read-only review reports for manually posted purchase receipt asset journals and `INVENTORY_CLEARING` purchase bills.

What changed:

- Added `GET /inventory/reports/clearing-reconciliation` with filters for date, supplier, purchase bill, purchase receipt, status, and optional CSV export.
- Added `GET /inventory/reports/clearing-variance` to surface only rows requiring accountant review, including partial clearing, value variances, clearing-mode bills without active receipt asset postings, receipt asset postings without compatible clearing bills, and reversed receipt asset postings.
- Added clearing account GL activity summary fields so accountants can compare report-computed open differences to posted journal activity.
- Added frontend Inventory report pages, sidebar links, purchase bill mini-panel, and purchase receipt mini-panel.
- Report endpoints are read-only and create no journals.

Remaining risks:

- No automatic variance posting or correction journals.
- No landed cost.
- FIFO remains placeholder-only.
- Historical direct-mode bill migration/exclusion policy still requires accountant review.
- Accountant review is required before production use.

### Explicit purchase receipt inventory asset posting added

Implemented manual accountant-reviewed inventory asset posting for purchase receipts linked to finalized `INVENTORY_CLEARING` purchase bills only.

Risk reduced:

- `DIRECT_EXPENSE_OR_ASSET` purchase bills remain excluded from receipt asset posting to prevent double-counting inventory or expense.
- Receipt posting is explicit only through `POST /purchase-receipts/:id/post-inventory-asset`; there is no automatic receipt GL posting from purchase bills, purchase receipts, or stock movements.
- Posting creates one balanced journal, Dr Inventory Asset and Cr Inventory Clearing, using receipt line quantity multiplied by unit cost.
- Posting requires enabled inventory accounting, moving-average valuation, valid active posting Inventory Asset and Inventory Clearing accounts, a finalized non-voided clearing-mode bill, posted receipt status, unit costs, positive receipt value, and fiscal-period approval on the receipt date.
- Reversal is explicit through `POST /purchase-receipts/:id/reverse-inventory-asset`, creates a reversal journal, and leaves the operational receipt lifecycle separate.
- Purchase receipt voiding is blocked while an asset journal is active and unreversed.

Remaining risks:

- No automatic purchase receipt GL posting.
- No receipt asset posting for historical/direct-mode purchase bills and no historical migration.
- Inventory Clearing timing differences are visible in read-only reconciliation/variance reports, and correction journals require accountant-reviewed proposal approval plus an explicit post action.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend tests for direct-mode blocking, unfinalized bill blocking, missing settings/unit-cost blocking, balanced Dr Inventory Asset / Cr Inventory Clearing journals, fiscal-period guard, duplicate rejection, reversal, void protection, report impact, tenant isolation, and permission metadata.
- Frontend helper tests for receipt asset posting status, post/reverse button visibility, and linked bill mode warnings.
- Smoke coverage for compatible clearing bill receipt preview, explicit asset posting, trial balance/general ledger impact, void blocking, reversal, void after reversal, and unchanged no-auto-post behavior.

### Inventory clearing bill finalization added

Implemented explicit accountant-reviewed purchase bill finalization for `INVENTORY_CLEARING` mode while preserving `DIRECT_EXPENSE_OR_ASSET` behavior.

Risk reduced:

- Direct-mode purchase bill finalization remains unchanged: Dr selected line account, Dr VAT Receivable when applicable, Cr Accounts Payable.
- Inventory-clearing bills can finalize only when inventory accounting is enabled, `MOVING_AVERAGE` is selected, purchase receipt posting mode is `PREVIEW_ONLY`, and a separate active posting Inventory Clearing account is mapped.
- Clearing-mode finalization posts Dr Inventory Clearing for tracked lines, Dr selected accounts for non-inventory lines, Dr VAT Receivable, and Cr Accounts Payable.
- Automatic purchase receipt GL posting remains disabled; previews still create no journals, and only explicit compatible receipt asset posting creates journals.
- Voiding clearing-mode purchase bills uses the existing journal reversal path without touching stock movements.

Remaining risks:

- Automatic purchase receipt GL posting remains disabled; explicit receipt asset posting is limited to compatible clearing-mode bills.
- Inventory clearing balances may accumulate until compatible receipts are explicitly posted and a reconciliation workflow exists.
- Historical finalized direct-mode bills are not migrated.
- Migration and exclusion strategy still requires accountant approval.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend tests for direct-mode regression, clearing-mode preview/finalization blockers, balanced clearing journals, void reversal, readiness warnings, and report trial-balance impact.
- Frontend helper tests for clearing-mode labels, warnings, can-finalize helper, and preview line display.
- Smoke coverage for direct-mode finalization, clearing-mode finalization, Dr Inventory Clearing / Cr AP journal verification, unchanged purchase receipt GL posting, and readiness no-go.

### Purchase bill clearing compatibility groundwork added

Earlier groundwork added bill-level inventory posting mode storage, purchase bill accounting preview, readiness compatibility counts, frontend mode controls, and clearing-mode migration design documentation. That phase resolved the audit no-go item at the design/data visibility level only; purchase receipt GL posting remained disabled.

Risk reduced:

- Existing bills remain in `DIRECT_EXPENSE_OR_ASSET`, preserving current purchase bill AP posting behavior.
- `INVENTORY_CLEARING` mode is explicit and draft-level, with preview visibility showing Dr Inventory Clearing for tracked lines and normal line accounts for non-inventory lines.
- Clearing-mode finalization was intentionally blocked until the accountant-reviewed implementation in the current phase.
- Readiness now exposes direct-mode and clearing-mode bill counts so historical migration/exclusion work is visible.
- Purchase bill previews create no journals and do not change purchase receipt or purchase bill accounting.

Remaining risks:

- Automatic purchase receipt GL posting remains disabled; explicit receipt asset posting is limited to compatible clearing-mode bills.
- Inventory clearing balances still require manual review until compatible receipts are explicitly posted and reconciliation is implemented.
- Historical finalized direct-mode bills are not migrated.
- Migration and exclusion strategy still requires accountant approval.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend tests for direct-mode preview, clearing-mode preview, validation, permission metadata, and then-current finalization blocking.
- Frontend helper tests for purchase bill mode labels, preview line display, and readiness warnings.
- Smoke coverage for direct purchase bill preview, clearing-mode purchase bill preview, unchanged journal counts from previews, and readiness compatibility visibility.

### Purchase receipt posting readiness audit added

Added a read-only purchase receipt posting readiness endpoint, inventory settings readiness panel, readiness/design documents, tests, and smoke coverage. This remains an audit gate for automatic posting; explicit compatible receipt asset posting is now implemented separately and preview/readiness reads still create no journals.

Risk reduced:

- Accountants can see whether Inventory Asset and Inventory Clearing mappings, moving-average valuation, inventory accounting enablement, and preview-only receipt mode are ready before the next posting task.
- The readiness endpoint always warns that purchase receipt GL posting is not enabled yet.
- The audit documents explicitly call out the double-count risk from current purchase bill direct line posting.
- The settings UI shows readiness blockers and recommendations without exposing a post button.

Remaining risks:

- Automatic purchase receipt GL posting remains disabled; explicit receipt asset posting is limited to compatible clearing-mode bills.
- Bill/receipt clearing entries are not implemented.
- Existing finalized purchase bills need a migration or exclusion strategy before receipt posting.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend readiness tests for missing settings/accounts, no-journal behavior, tenant scoping, and permission metadata.
- Frontend helper tests for readiness status, blockers, and warnings.
- Smoke coverage for `/inventory/purchase-receipt-posting-readiness` and unchanged journal counts.

### Inventory clearing preview and matching groundwork added

Added inventory clearing account settings, purchase receipt posting mode, enhanced purchase receipt accounting previews, purchase bill receipt matching status, purchase order receipt/bill matching visibility, UI panels, docs, tests, and smoke coverage. This is design and review groundwork only; purchase receipt previews still create no journals and always return `canPost: false`.

Risk reduced:

- Accountants can map a separate Inventory Clearing account for compatible receipt asset posting.
- Clearing account validation requires a tenant-owned active posting `LIABILITY` or `ASSET` account, blocks reuse of inventory asset, and rejects Accounts Payable code `210`.
- Purchase receipt previews show receipt value, matched bill value, value difference, matching summary, and Dr Inventory Asset / Cr Inventory Clearing preview lines.
- Purchase bill and purchase order detail pages expose receipt matching status and warnings without accounting mutation.
- Seed/foundation data now includes code `240` Inventory Clearing for new organizations.

Remaining risks:

- Automatic purchase receipt GL posting remains disabled; explicit receipt asset posting is limited to compatible clearing-mode bills.
- Bill/receipt clearing entries are not implemented.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend clearing account validation, enhanced receipt preview, bill/receipt matching status, tenant, and permission tests.
- Frontend helper tests for posting mode, warnings, missing clearing mapping, and matching status labels.
- Smoke coverage for configuring Inventory Clearing, linked bill receipt preview, bill receipt matching status, and unchanged journal counts from receipt preview.

### Manual COGS posting added

Added explicit manual COGS posting and reversal for sales stock issues using the existing preview layer. Posting is permission-gated, tenant-scoped, fiscal-period guarded, transactional, and linked back to `SalesStockIssue`. The implementation creates one reviewed Dr COGS / Cr Inventory Asset journal only when the user explicitly posts COGS; invoices and stock issues still do not auto-post COGS.

Risk reduced:

- `inventory.cogs.post` and `inventory.cogs.reverse` separate COGS posting from ordinary inventory/sales operations.
- Posting requires enabled inventory accounting, mapped inventory asset and COGS accounts, `MOVING_AVERAGE`, a posted/unvoided issue, no prior COGS journal, no preview blocking reasons, and positive estimated COGS.
- Reversal creates a linked reversal journal without voiding the sales stock issue.
- Stock issue voiding is blocked while COGS is active and allowed again after COGS reversal.
- P&L reflects COGS through posted journals, not stock movements.

Remaining risks:

- Purchase receipt inventory asset posting is manual-only for compatible clearing-mode bills.
- Purchase receipt clearing reconciliation is now read-only; variance proposals exist, but automatic variance posting is still missing.
- No landed cost.
- FIFO placeholder only.
- No automatic COGS posting from invoices or stock issues.
- Accountant review is required before production use.

Tests/smoke added:

- Backend COGS posting, reversal, double-post/double-reverse, fiscal-period guard, void protection, tenant, permission metadata, no stock movement mutation, and P&L report tests.
- Frontend helper tests for COGS status, post/reverse button visibility, and financial-report warning display.
- Smoke coverage for enabling inventory accounting, manual COGS posting, P&L COGS activity, active-COGS void block, COGS reversal, and stock issue void after reversal.

### Inventory accounting preview groundwork added

Added preview-only inventory accounting settings, account mapping validation, purchase receipt accounting preview, sales stock issue COGS preview, UI preview panels, design documents, tests, and smoke coverage. The implementation keeps inventory accounting non-posting: preview endpoints do not create journal entries and do not affect GL, COGS, inventory asset balances, VAT, or financial statements.

Risk reduced:

- Accountants can review mapped inventory asset, COGS, adjustment gain, and adjustment loss accounts before real posting exists.
- Purchase receipt previews show design-only Dr Inventory Asset / Cr Inventory Clearing or AP placeholder lines and explicitly warn that bill/receipt matching and inventory clearing are not finalized.
- Sales stock issue previews show estimated moving-average COGS with Dr COGS / Cr Inventory Asset lines.
- `enableInventoryAccounting` remains false by default and cannot be enabled without required mappings and `MOVING_AVERAGE`.
- FIFO remains placeholder-only.

Remaining risks:

- No automatic COGS posting; manual COGS posting now requires explicit review/action.
- No inventory asset posting.
- Purchase receipt inventory asset posting and clearing reconciliation now exist in manual/read-only form; automatic posting remains missing.
- No landed cost.
- No serial/batch tracking.
- Accountant review is required before any financial inventory posting.

Tests/smoke added:

- Backend settings validation, permission, tenant, preview, moving-average estimate, and no-journal tests.
- Frontend helper tests for warnings, preview line display, non-postable previews, and missing mappings.
- Smoke coverage for accounting settings, purchase receipt preview, sales issue COGS preview, and unchanged journal counts.

### Purchase receiving and sales stock issue groundwork added

Added operational purchase receipts from purchase orders, purchase bills, or standalone suppliers, plus sales stock issues from finalized sales invoices. Receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements, sales issues create `SALES_ISSUE_PLACEHOLDER` stock movements, and voids create controlled reversal movements. Source status endpoints now expose NOT_STARTED/PARTIAL/COMPLETE progress without storing fragile received/issued totals on source lines.

Risk reduced:

- Purchase orders and purchase bills can now be received into active warehouses with line-level remaining quantity guards.
- Finalized sales invoices can now issue tracked stock with invoice remaining quantity and stock availability checks.
- Receipt and issue voids are one-time operations and are blocked when a receipt void would make stock negative.
- Inventory balances, movement summaries, and valuation estimates naturally include receipt/issue movement rows.
- The workflow remains operational-only and creates no journal entries.

Remaining risks:

- No automatic COGS posting.
- No inventory asset GL posting.
- No landed cost.
- No serial/batch tracking.
- No delivery note or supplier delivery document workflow.
- No automatic financial inventory accounting.

Tests/smoke added:

- Backend purchase receipt, sales stock issue, source status, tenant, no-journal, and permission tests.
- Frontend helper and route/action permission tests for receipt/issue statuses and source labels.
- Smoke coverage for PO receiving, sales invoice stock issue, void restoration, source statuses, and no receipt/issue journal entries.

### Inventory valuation/reporting groundwork added

Added per-organization inventory settings, moving-average operational stock valuation, movement summary reporting, low-stock reporting from item reorder points, CSV export for inventory reports, frontend inventory report/settings pages, reorder fields on items, tests, and smoke coverage. The implementation keeps inventory operations reporting-only: it does not post inventory journals, COGS, inventory asset accounting, or financial statement values.

Risk reduced:

- Teams can review operational estimated stock value by item and warehouse without changing GL.
- Missing inbound cost data is visible as a valuation warning instead of silently producing accounting-like totals.
- Movement summary exposes opening, inbound, outbound, closing, count, and movement-type breakdown from the stock ledger.
- Low-stock reporting now has simple reorder-point groundwork.
- Inventory settings make the valuation method explicit while keeping FIFO marked as placeholder.

Remaining risks:

- No automatic COGS posting.
- No inventory asset accounting.
- Purchase receiving and sales issue are operational-only and do not post accounting.
- Valuation needs accountant review before financial use.
- FIFO is placeholder-only.
- No inventory financial statements.
- No serial/batch tracking.

Tests/smoke added:

- Backend inventory settings, valuation, movement summary, low-stock, tenant, and permission tests.
- Frontend helper tests for valuation warnings, settings labels, movement summaries, and low-stock statuses.
- Smoke coverage for inventory settings, valuation report, movement summary, low-stock shape, and no-journal inventory operations.

### Reconciliation approval and import preview added

Added pasted CSV/JSON statement import preview, validation summaries, duplicate warnings, partial import support, closed-period import protection, and a bank reconciliation submit/approve/reopen/close workflow with review events. Reconciliation close now requires approval, while closed periods continue to lock statement transaction changes and overlapping imports.

Risk reduced:

- Statement imports can be previewed before records are written, with valid/invalid rows, detected columns, totals, and warnings.
- Real imports now reuse the preview parser/validator and reject invalid rows unless partial import is explicitly requested.
- Imports into closed reconciliation periods are blocked, while preview warns without writing data.
- Reconciliations now preserve submit, approve, reopen, close, and void history through review events.
- Approved-only close provides a reviewer checkpoint before immutable period locking.

Remaining risks:

- No production-grade bank statement file storage/parser certification; uploaded attachment groundwork is separate from import parsing.
- Limited manual OFX/CAMT/MT940 parser groundwork exists now, but broad bank-specific variants still need review with sanitized real samples.
- No bank feeds or external banking APIs.
- No strict dual-control approval queue beyond the same-submitter guard.
- No automatic/ML matching.

Tests/smoke added:

- Backend CSV parser, preview/import validation, approval workflow, review event, permission, tenant, and closed-period protection tests.
- Frontend helper tests for import preview summaries, reconciliation status/actions, review timeline labels, and locked warnings.
- Smoke coverage for CSV preview, import, submit, approve, close, review events/items, closed-period mutation/import rejection, preview warning, report export, and void/unlock.

### Report exports and reconciliation report PDFs added

Added CSV and PDF delivery for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, plus bank reconciliation report data/CSV/PDF endpoints. Report PDFs are archived through generated documents, and frontend report pages and reconciliation detail pages now expose download actions.

Risk reduced:

- Core accounting reports can now be exported from the API and UI instead of only viewed as JSON/page data.
- CSV helpers escape commas, quotes, and newlines and use accountant-readable columns.
- Report PDFs share the existing PDF rendering package and generated-document archive.
- Bank reconciliation report output includes status, period, balances, close/void actors, item snapshots, and summary totals.

Remaining risks:

- Accountant review is still needed before relying on report layouts or definitions in production.
- No scheduled reports or email delivery exists yet.
- VAT Summary is not an official VAT filing export.
- No report approval workflow exists yet.
- Voiding reconciliation is administrative only and does not reverse categorized journals.

Tests/smoke added:

- Backend CSV helper, report controller, PDF renderer, report archive, reconciliation report data, and permission tests.
- Frontend export URL, filename, PDF path, and document type label tests.
- Smoke coverage for trial balance CSV/PDF, reconciliation report data/CSV/PDF, and generated report document archive entries.

### Bank reconciliation close/lock workflow added

Added `BankReconciliation` and `BankReconciliationItem` records, tenant-scoped reconciliation list/create/detail/close/void/items APIs, reconciliation close pages, closed item snapshots, summary metadata for latest close/open draft/closed-through date, statement transaction lock warnings, permissions, tests, and smoke coverage.

Risk reduced:

- Bank accounts can now be formally reconciled for a date range instead of relying only on ad hoc summary totals.
- Closing requires zero difference and no unmatched statement transactions in the period.
- Closed reconciliations snapshot matched/categorized/ignored statement rows for review history.
- Closed periods block statement transaction match, categorize, ignore, and import void/status-changing actions.
- Voiding a reconciliation preserves audit history and unlocks the period without mutating journal entries.

Remaining risks:

- Reviewer approval now exists; strict dual-control queues remain future work.
- Limited file upload parser and OFX/CAMT/MT940 groundwork exists now, but there is still no live feed, external banking API, certified bank-specific coverage, or payment gateway integration.
- No automatic/ML matching.
- Voiding reconciliation is administrative only and does not reverse categorized journals.
- Accountant review is still needed before production use.

Tests/smoke added:

- Backend reconciliation service and controller permission tests.
- Backend statement lock tests for match, categorize, ignore, and import void.
- Frontend helper tests for reconciliation status, close-block messages, closed-through date, and locked row warnings.
- Smoke coverage for draft creation, close, item snapshot, locked-row rejection, void/unlock, and summary fields.

### Bank statement import and reconciliation groundwork added

Added `BankStatementImport` and `BankStatementTransaction` records, local JSON/CSV row import APIs, statement row list/detail APIs, match-candidate lookup against posted bank journal lines, manual matching, categorization posting, ignore workflow, reconciliation summary, frontend import/transaction/review/summary pages, permissions, tests, and smoke coverage.

Risk reduced:

- Imported bank statement rows are tenant-scoped and stored separately from ledger postings.
- Statement imports do not create accounting entries until a user explicitly categorizes an unmatched row.
- Manual matching validates same organization, same linked bank account, posted journal status, amount, and direction.
- Categorization creates a balanced posted journal and respects fiscal-period posting locks.
- Reconciliation summaries expose unmatched, matched, categorized, ignored, debit, credit, ledger balance, statement closing balance, and difference fields.

Remaining risks:

- No production-grade bank file parser/storage workflow beyond local upload/paste rows; uploaded attachment groundwork is separate from import parsing.
- Limited OFX/CAMT/MT940 parser groundwork exists now, but there is still no live feed, external banking API, certified bank-specific coverage, or payment gateway integration.
- No automatic/ML matching.
- Formal close/lock, report export, and reviewer workflow now exist; file upload storage remains future work.
- Accountant review is still needed before production use.

Tests/smoke added:

- Backend bank statement service and controller permission tests.
- Frontend helper tests for row parsing, status labels, candidate labels, and reconciliation status.
- Smoke coverage for importing a matching statement row, manual matching, categorizing an unmatched debit, and fetching reconciliation summary.

### Bank transfers and opening balance safeguards added

Added `BankTransfer` posting workflow, transfer list/create/detail UI, immediate balanced transfer journals, idempotent transfer void reversal, one-time bank opening-balance posting, fiscal-period guards, transaction source labels, permissions, tests, and smoke coverage.

Risk reduced:

- Users can now move funds between active bank/cash profiles without using ad hoc manual journals.
- Transfer voiding is guarded so repeated void requests do not create duplicate reversal journals.
- Opening balance metadata can be posted once into the ledger and is locked afterward to avoid duplicate opening-balance journals.
- Bank account transactions now identify transfer, transfer reversal, and opening-balance sources when matched.

Remaining risks:

- Bank statement import preview, manual matching, reconciliation approval/close, and report export now exist; bank feeds and file upload storage remain future work.
- No live feeds or external banking API.
- No transfer fees.
- No multi-currency FX transfers.

Tests/smoke added:

- Backend bank transfer service/controller permission tests.
- Backend bank account opening-balance posting and transaction source tests.
- Frontend helper tests for transfer validation/status and opening-balance/source labels.
- Smoke coverage for create/void transfer, bank/cash transaction visibility, opening-balance posting, and duplicate-post rejection.

### Bank account profiles added

Added bank/cash account profile groundwork with `BankAccountProfile`, profile lifecycle APIs, default Cash/Bank profile seeding, posted-ledger balance summaries, transaction visibility, frontend list/detail/create/edit pages, role permissions, and bank-aware payment/refund/expense dropdown labels.

Risk reduced:

- Users can now distinguish operational cash/bank/wallet/card accounts from generic chart-of-account asset rows.
- Posted cash/bank activity is visible from one module across customer payments, supplier payments, refunds, cash expenses, and manual journals.
- Payment and expense forms remain compatible with raw `accountId` posting while showing clearer bank profile labels when available.

Remaining risks:

- Bank statement import preview, manual matching, reconciliation approval/close, and report export now exist; bank feeds and file upload storage remain future work.
- No live feeds or external banking API.
- No transfer fees or multi-currency FX handling.

Tests/smoke added:

- Backend bank account service and controller permission tests.
- Frontend helper tests for status, labels, running balance, and dropdown display.
- Smoke coverage for default bank profiles, balance movement after payment/expense flows, and transaction endpoint rows.

### Purchase orders MVP added

Added non-posting purchase orders with tenant-scoped API permissions, default role grants, draft/approve/sent/closed/voided/billed lifecycle rules, PDF/archive support, frontend list/detail/create/edit pages, and conversion into draft purchase bills.

Risk reduced:

- Suppliers can now be ordered from before AP bill entry without prematurely posting accounting journals.
- Converted purchase bills retain a source PO link and only post AP when finalized through the existing bill workflow.
- Purchase order permissions now gate view/create/update/approve/void/convert actions across API and UI.

Remaining risks:

- No approval workflow or dual-control policy.
- No partial receiving or partial billing.
- No inventory stock receipt or stock movement.
- No email sending to suppliers.

Tests/smoke added:

- Backend purchase order lifecycle/conversion tests.
- Frontend purchase order helper and PDF path tests.
- Smoke coverage for create, approve, send, PDF download, convert to draft bill, and finalize converted bill.

### Account deletion missed dependent records

`DELETE /accounts/:id` only checked journal lines, child accounts, and system accounts. Accounts referenced by sales invoice lines, items, or customer payments could reach a database foreign-key failure instead of a clear business error.

Fix: `ChartOfAccountsService.remove` now checks:

- journal lines
- child accounts
- sales invoice lines
- item revenue/expense account references
- customer payment paid-through account references
- system account flag

### Payment void could reopen a voided invoice

Voiding a payment restored invoice `balanceDue` by incrementing every allocated invoice, even if the invoice had already been voided. That could leave a `VOIDED` invoice with a positive `balanceDue`.

Fix: payment void now restores balance only for allocated invoices still in `FINALIZED` status for the same organization.

### Statement date validation accepted impossible dates

`GET /contacts/:id/statement` accepted strings like `2026-02-31` because JavaScript normalized them into a later valid date.

Fix: statement date parsing now validates the parsed UTC year/month/day against the input parts.

### Negative tax rates could be created or updated

Tax rate DTOs accepted decimal strings and the service did not reject negative values. Invoices would later fail when using those rates, but invalid tax setup could still be stored.

Fix: `TaxRateService` now rejects negative rates on create and update.

### Supplier contact detail page showed a ledger error

`/contacts/[id]` loaded only the customer ledger endpoint. Supplier-only contacts linked from `/contacts` therefore showed `Customer contact not found` instead of a usable contact profile.

Fix: the contact detail page now loads the base contact first. Customer/BOTH contacts load ledger and statement sections; supplier-only contacts show the profile with an informational ledger message.

## Tests Added Or Updated

- Added chart-of-accounts deletion dependency tests.
- Added tax-rate negative validation tests.
- Added statement impossible-date validation test.
- Updated customer payment void tests to assert finalized-invoice restoration filtering.
- Existing API/web test suites now pass with the new checks.

## API Smoke Coverage

The local API smoke test verified:

- seed login
- organization lookup
- balanced journal creation
- unbalanced journal rejection
- journal posting
- edit-after-post rejection
- reversal creation
- duplicate reversal rejection
- customer and supplier contact creation
- item creation
- draft invoice edit/delete
- invoice finalization
- finalized invoice edit/delete rejection
- finalize idempotency
- payment allocation to draft invoice rejection
- allocation above balance rejection
- partial payment balance update
- full payment balance update
- unapplied payment amount behavior
- payment receipt-data allocations
- payment void balance restoration
- payment void idempotency
- payment void after invoice void keeps voided invoice balance at `0.0000`
- customer ledger fetch
- customer statement fetch
- supplier ledger rejection
- impossible statement date rejection

Smoke summary from the successful run:

```json
{
  "invoiceTotal": "115",
  "balanceAfterPartial": "65",
  "balanceAfterFull": "0",
  "balanceAfterVoidPayment": "65",
  "voidedInvoiceBalanceAfterPaymentVoid": "0",
  "ledgerRows": 11,
  "ledgerClosingBalance": "65.0000",
  "statementRows": 11,
  "receiptAllocations": 1
}
```

## Frontend Route Checks

HTTP route checks returned `200` for:

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/organization/setup`
- `/accounts`
- `/tax-rates`
- `/branches`
- `/contacts`
- `/journal-entries`
- `/journal-entries/new`
- `/items`
- `/sales/invoices`
- `/sales/invoices/new`
- `/sales/customer-payments`
- `/sales/customer-payments/new`
- `/get-started`
- `/reports`

The in-app browser automation backend could not run because the configured Node runtime is `v22.19.0`, while the Node REPL browser backend requires `>=22.22.0`. Route-level checks and server logs were used as the fallback.

## Command Failures During Audit

- `rg --files` failed with Windows app binary access denied for the bundled `rg.exe`; fallback used `git ls-files` and PowerShell file enumeration.
- Initial focused `typecheck`/API test run failed after the first patch because a test mock was updated in the wrong helper and date parsing needed an explicit tuple type. Both were corrected before final verification.
- Browser automation setup failed with: Node runtime `v22.19.0` found, Node REPL requires `>=22.22.0`.

Final verification passed:

- `corepack pnpm db:migrate`
- `corepack pnpm db:seed`
- `corepack pnpm db:generate`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

## Concurrency Hardening Pass

Audit date: 2026-05-07

Commit inspected: `ec40a0a` (`Stabilize current accounting workflows`)

### Race Risks Found And Fixed

- Invoice finalization could create more than one journal if two requests finalized the same draft invoice at the same time.
- Invoice voiding could race with payment allocation or create inconsistent reversal state.
- Finalized invoices with active customer payments could be voided, creating unclear AR/payment state.
- Customer payment creation validated invoice balances before the transaction and then decremented balances unconditionally, allowing concurrent over-allocation.
- Customer payment voiding could restore invoice balances twice if two void requests ran together.
- Manual journal duplicate reversal could surface a raw Prisma unique-constraint failure.

### Strategy Used

- Invoice finalization now re-reads the invoice inside the transaction and claims the draft row with `updateMany` before creating the journal entry.
- Invoice voiding now claims the invoice row before checking active payment allocations, then creates/reuses the reversal inside the same transaction.
- Finalized invoices with active non-voided payment allocations are rejected with: `Cannot void invoice with active payments. Void payments first.`
- Customer payment creation validates customer/account/invoice references inside the transaction and uses conditional `balanceDue >= amountApplied` invoice updates.
- Customer payment voiding claims the posted payment row before creating a reversal or restoring invoice balances.
- Duplicate journal reversal attempts are converted into clear business errors.
- Number sequence behavior remains based on Prisma atomic `upsert` increment and now has direct tests, including transaction-client usage.

### Commands Run

- `corepack pnpm db:generate` failed with Windows `EPERM` while renaming Prisma `query_engine-windows.dll.node`; a running local API/dev process was holding the generated Prisma client DLL open.
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- Docker service check for Postgres and Redis health.
- API health check against `http://localhost:4000/health`.
- Web route check against `http://localhost:3000/login`.
- API smoke test for login, invoice finalization idempotency, payment allocation, invoice void rejection with active payment, over-allocation rejection, payment void idempotency, balance restoration, and contact ledger fetch.

### Tests Added Or Updated

- Invoice finalize idempotency and lost-claim behavior.
- Invoice finalization failure before journal link.
- Invoice void with active payments rejected.
- Draft invoice void without reversal.
- Payment allocation stale-claim rejection with no journal/payment created.
- Payment number sequence not consumed after allocation claim failure.
- Payment void lost-claim idempotency.
- Journal duplicate reversal unique-constraint handling.
- Number sequence formatting and transaction-client usage.

## Repeatable Accounting Smoke Workflow

Audit date: 2026-05-07

Commit inspected: `c3b5b81` (`Harden accounting transaction safety`)

### Smoke Script Added

Added `apps/api/scripts/smoke-accounting.ts` and package scripts:

- `corepack pnpm --filter @ledgerbyte/api smoke:accounting`
- `corepack pnpm smoke:accounting`

The script runs against `LEDGERBYTE_API_URL` or `http://localhost:4000` by default.

### Smoke Coverage

- Seed user login.
- `/auth/me` organization discovery.
- Tenant headers on every business request.
- Smoke customer creation.
- Smoke service item creation using account code `411` and VAT on Sales 15% when available.
- Draft sales invoice creation and edit.
- Invoice finalization and repeated finalization idempotency.
- Over-allocation payment rejection.
- Partial payment and remaining payment allocation.
- Invoice `balanceDue` reduction to zero.
- Customer ledger invoice debit and payment credit checks.
- Customer statement date-range and closing balance checks.
- Customer payment receipt-data allocation and journal checks.
- Payment void and repeated payment void idempotency.
- Invoice void rejection while another active payment exists.

### Remaining Gaps

- The smoke script is live-API coverage, not a multi-process concurrency load test.
- It intentionally leaves smoke records in the database for auditability.
- It does not cover frontend browser interaction, ZATCA, PDFs, credit notes, purchases, or bank reconciliation.

## PDF Groundwork Pass

Audit date: 2026-05-07

Commit inspected: `870b3b5` (`Add accounting smoke workflow`)

### PDF Groundwork Added

- Added shared PDF data contracts and PDFKit-based renderers in `packages/pdf-core`.
- Added sales invoice PDF data and PDF endpoints.
- Added customer payment receipt PDF data and PDF endpoints.
- Added customer statement PDF data and PDF endpoints.
- Updated frontend invoice, payment, and contact statement pages with authenticated PDF download actions.
- Extended the live accounting smoke workflow to verify PDF data endpoints and PDF responses.

### Smoke Coverage Added

The smoke script now verifies:

- `GET /sales-invoices/:id/pdf-data`
- `GET /sales-invoices/:id/pdf`
- `GET /customer-payments/:id/receipt-pdf-data`
- `GET /customer-payments/:id/receipt.pdf`
- `GET /contacts/:id/statement-pdf-data`
- `GET /contacts/:id/statement.pdf`

PDF smoke checks validate status, `application/pdf` content type, non-empty body, and `%PDF` file header.

### Remaining PDF Risks

- These PDFs are not legal/ZATCA-compliant tax documents yet.
- No XML embedding, QR code, PDF/A-3, cryptographic stamp, or hash-chain data is included.
- No template designer, custom fonts, logo handling, or stored PDF archive exists yet.

## Document Settings And Archive Groundwork

Audit date: 2026-05-07

Commit inspected: `09bb7c9` (`Add invoice and receipt PDF groundwork`)

### Document Groundwork Added

- Added organization document settings for invoice, receipt, and statement titles, footer text, colors, visibility flags, and saved template choices.
- Added generated document archive records for sales invoice PDFs, customer payment receipt PDFs, and customer statement PDFs.
- PDF downloads now apply organization document settings and archive generated PDF snapshots with content hash, size, filename, source reference, and base64 content.
- Added generated document list/detail/download APIs and frontend archive/settings pages.
- Extended the accounting smoke workflow to verify document settings, PDF archive creation, and archived PDF download.

### Remaining Document Risks

- Base64 database PDF storage is temporary and should move to S3-compatible storage before production scale.
- GET PDF endpoints archive each download, so repeated downloads create repeated archive records until a retention/supersede policy is added.
- Saved `compact` and `detailed` template options currently fall back to the standard renderer.
- Legal/ZATCA compliance is still out of scope: no XML embedding, QR code, PDF/A-3, cryptographic stamp, or clearance/reporting flow.

## ZATCA Foundation Groundwork

Audit date: 2026-05-07

Commit inspected: `2d5bc3e` (`Add document settings and archive groundwork`)

### ZATCA Groundwork Added

- Added organization ZATCA profiles for seller identity, VAT number, Saudi address fields, environment, and registration status.
- Added development EGS units with active-unit selection, local CSR/private-key/CSID placeholders, last ICV, and previous invoice hash state.
- Added sales invoice ZATCA metadata for invoice UUID, local compliance status, ICV, previous hash, invoice hash, XML base64, QR base64, and error fields.
- Added ZATCA submission logs for local compliance-generation events.
- Added `packages/zatca-core` helpers for deterministic UBL-like XML skeletons, basic TLV QR payloads, SHA-256 invoice hashes, and combined payload building.
- Added API endpoints for ZATCA profile, EGS units, invoice compliance metadata, XML downloads, QR payloads, and submission logs.
- Added frontend ZATCA settings and invoice compliance sections.
- Extended smoke coverage to generate local XML/QR/hash data for a finalized invoice and verify XML/QR endpoints.

### Remaining ZATCA Risks

- This is local-only foundation work and is not production ZATCA compliance.
- No real ZATCA APIs, OTP onboarding, CSR generation, CSID issuance, clearance, reporting, cryptographic signing, XML canonicalization, or official validation is implemented.
- Private keys are stored only as development placeholders in the database; production must use secrets manager/KMS-backed storage.
- PDF/A-3 and XML embedding are not implemented.
- Official ZATCA documentation and sandbox behavior must be re-verified before building the real onboarding/submission phase.

## ZATCA Onboarding Groundwork

Audit date: 2026-05-07

Commit inspected: `cc0df31` (`Add ZATCA foundation groundwork`)

### CSR And Mock CSID Groundwork Added

- Added CSR/private-key generation helpers in `packages/zatca-core` using Node-compatible local crypto utilities.
- Added CSR validation for required seller, VAT, organization, device serial, city, and Saudi country fields.
- Added EGS CSR generation, CSR preview, and CSR download endpoints.
- Added a ZATCA onboarding adapter interface with a local mock adapter for compliance CSID requests.
- Added mock OTP flow accepting local 6-digit values such as `000000`.
- Added mock compliance CSID state handling, certificate request id storage, active mock EGS handling, and submission logs.
- Changed onboarding submission logs so they can be EGS/onboarding scoped without requiring an invoice metadata row.
- Hardened EGS API responses so `privateKeyPem` is not exposed through normal frontend APIs after generation.
- Added frontend onboarding controls for CSR generation/download, mock CSID request, OTP entry, EGS status, and recent ZATCA logs.

### Remaining Onboarding Risks

- Private key database storage remains development-only. Production must use KMS/secrets manager and must never log private keys.
- The mock CSID flow does not validate real OTPs, does not issue real CSIDs, and does not call ZATCA.
- Production CSID request intentionally returns not implemented.
- Real ZATCA sandbox credentials, official API contracts, CSR profile requirements, certificate chain handling, and compliance checks must be verified against current ZATCA documentation before production work.

## ZATCA Sandbox Adapter Scaffolding

Audit date: 2026-05-08

Commit inspected: `9ea5047` (`Add safe ZATCA sandbox adapter scaffolding`)

### Sandbox Adapter Scaffolding Added

- Added config-gated ZATCA adapter modes: `mock`, `sandbox-disabled`, and scaffolded `sandbox`.
- Added `ZATCA_ENABLE_REAL_NETWORK=false` default behavior so real ZATCA calls remain intentionally disabled unless explicit sandbox env flags are set.
- Added sandbox-disabled and HTTP sandbox adapter scaffolds with flexible request/response types for future compliance CSID, production CSID, compliance-check, clearance, and reporting methods.
- Added failed submission logging for disabled or incomplete adapter calls, including base64 request/response/error payloads and clear disabled response codes.
- Added local/mock invoice compliance-check logging without marking invoices cleared or reported.

### Remaining Adapter Risks

- This is still not production ZATCA compliance.
- Real calls are intentionally disabled by default and official ZATCA endpoint URLs, request bodies, response mappings, credentials, and auth headers must be verified before any sandbox network enablement.
- Compliance risk remains until official ZATCA documentation and valid sandbox credentials are used for real compliance CSID and compliance-check testing.

## ZATCA Foundation Stabilization

Audit date: 2026-05-11

Commit inspected: pending (`Stabilize ZATCA groundwork`)

### Stabilization Added

- Made repeated local ZATCA invoice generation idempotent: once XML/QR/hash metadata exists for an invoice, repeat generation returns that metadata without consuming another ICV or changing the active EGS hash chain.
- Added backend coverage that compliance CSID request logs do not store OTP, CSR PEM, or private-key material.
- Added core coverage for XML escaping, deterministic hashing, and UTF-8 byte-length handling for Arabic/Unicode QR TLV seller names.
- Extended smoke coverage for safe adapter defaults, EGS private-key redaction, CSR-only response behavior, repeated ZATCA generation idempotency, and safe blocked clearance/reporting logs.
- Rechecked that normal EGS responses redact `privateKeyPem` and that CSR endpoints return CSR PEM only.

### Remaining Stabilization Risks

- The ZATCA XML remains a local skeleton and must be verified against current official ZATCA/FATOORA XML, canonicalization, signing, and validation rules.
- Real network adapter endpoint paths and payloads remain intentionally unverified and disabled by default.
- Private-key database storage is still development-only and must move to KMS/secrets-manager-backed storage before real certificate handling.
- Mock CSID and mock invoice compliance checks are fake local workflow states and must not be treated as legal clearance or reporting.

## ZATCA Official-Docs Mapping And Checklist

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA compliance checklist mapping`)

### Checklist Mapping Added

- Added `docs/zatca` engineering checklists for Phase 2 mapping, API integration, XML, QR, CSR/CSID onboarding, PDF/A-3 archive, security/key management, and testing/validation.
- Added typed `ZATCA_PHASE_2_CHECKLIST` data in `packages/zatca-core` so future implementation can be tracked against explicit requirement areas instead of guessed code paths.
- Added authenticated `GET /zatca/compliance-checklist` and `GET /zatca/readiness` endpoints.
- Added settings-page checklist and readiness display with status/risk badges and local blocking reasons.
- Kept `productionReady=false` and real network calls disabled by default.

### Remaining Critical ZATCA Risks

- Official ZATCA XML rules are not fully implemented or validated.
- Real compliance CSID onboarding is not integrated.
- Invoice signing and cryptographic stamp generation are not implemented.
- PDF/A-3 conversion and XML embedding are not implemented.
- Clearance and reporting submissions are not implemented.
- Real private keys are not stored in KMS/secrets-manager-backed custody.

## ZATCA XML Mapping Scaffold

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA XML mapping scaffold`)

### XML Mapping Scaffold Added

- Added local XML field mapping docs and fixture guidance under `docs/zatca`.
- Added local dev fixtures under `packages/zatca-core/fixtures` for standard and simplified VAT invoice skeletons, including Arabic/Unicode text and XML escaping cases.
- Refactored the local XML builder into deterministic section builders for header, supplier, customer, tax totals, monetary totals, invoice lines, and ZATCA extension/signature TODO placeholders.
- Added typed `ZATCA_XML_FIELD_MAPPING` constants and local-only `validateLocalZatcaXml` checks in `packages/zatca-core`.
- Added authenticated `GET /zatca/xml-field-mapping` and `GET /sales-invoices/:id/zatca/xml-validation` endpoints.
- Added invoice UI display for local XML validation and settings UI visibility for XML mapping counts.

### Remaining XML Mapping Risks

- Official UBL/ZATCA field mapping still requires official documentation verification.
- Local XML validation is not official ZATCA SDK validation and must not be treated as legal certification.
- Signing, canonicalization, cryptographic stamp, official invoice hash source, PDF/A-3 XML embedding, clearance, and reporting are still not implemented.

## ZATCA Official Reference Mapping

Audit date: 2026-05-12

Commit inspected: pending (`Map official ZATCA references`)

### Reference Mapping Added

- Inventoried the local `reference/` folder, including official ZATCA PDFs, the data dictionary XLSX, Java SDK files, sample XML files, UBL XSD schemas, Schematron XSL rules, PDF/A-3 samples, and non-ZATCA local PDFs.
- Added `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md` to map official source files to CSR, CSID, XML, QR, hash, signing, API, PDF/A-3, and validation work.
- Added `docs/zatca/SDK_USAGE_PLAN.md` with a safe plan for using the Java SDK as an isolated validation/hash/signing oracle later.
- Added `docs/zatca/ZATCA_CODE_GAP_REPORT.md` comparing current local scaffolding to the inspected references.
- Added official source-reference metadata to `ZATCA_PHASE_2_CHECKLIST` items.

### Remaining Reference-Backed ZATCA Risks

- Current XML still does not match the SDK sample structure for `ICV`, `PIH`, `QR`, populated UBL extensions, signature blocks, invoice type flags, and several tax/monetary structures.
- Current invoice hash is not official C14N11 canonicalization and has not been compared to the SDK `-generateHash` output.
- The SDK requires Java 11 through below 15; the local machine has Java 17, and the Windows launcher has path-with-space issues in this checkout.
- Real API base URLs, credentials, request headers, and sandbox behavior still require manual verification before any real network calls.
- No signing, production CSID, clearance/reporting, PDF/A-3 embedding, or KMS-backed key custody is implemented.

## ZATCA SDK Validation Wrapper Groundwork

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA SDK validation wrapper groundwork`)

### SDK Wrapper Groundwork Added

- Added test-only SDK discovery for the local `reference/` folder, SDK JAR, `fatoora` launcher, `jq`, Java availability/version, and repo path-space warnings.
- Added authenticated `GET /zatca-sdk/readiness` and dry-run-only `POST /zatca-sdk/validate-xml-dry-run` endpoints.
- Added `ZATCA_SDK_EXECUTION_ENABLED=false` default behavior; local SDK execution remains blocked by default.
- Added an execution endpoint gate that returns a clear disabled error unless explicitly enabled, and still avoids real execution until the command format is verified.
- Added settings-page SDK readiness display and invoice-detail SDK dry-run command-plan display.
- Extended smoke coverage for SDK readiness and dry-run planning without requiring Java execution.

### Remaining SDK Wrapper Risks

- Direct JAR and `fatoora.bat` invocation still require manual command verification because previous local attempts hit a Java/config null-pointer and Windows path-with-space issues.
- Java 11-14 should be pinned before any execution attempt; local Java 17 is outside the SDK readme range.
- SDK validation is not wired into normal app startup or normal invoice generation.
- No signing, hash replacement, real API calls, PDF/A-3, production CSID, clearance, or reporting behavior was implemented.

## ZATCA SDK Local Validation Groundwork

Audit date: 2026-05-16

Commit inspected: pending (`Add ZATCA SDK local validation groundwork`)

### SDK Local Validation Groundwork Added

- Added env-configured local SDK execution controls: `ZATCA_SDK_JAR_PATH`, `ZATCA_SDK_CONFIG_DIR`, `ZATCA_SDK_WORK_DIR`, `ZATCA_SDK_JAVA_BIN`, and `ZATCA_SDK_TIMEOUT_MS`, with `ZATCA_SDK_EXECUTION_ENABLED=false` still the default.
- Enhanced `GET /zatca-sdk/readiness` with execution-enabled, config-directory, work-directory, supported-command, blocking-reason, and `canRunLocalValidation` status.
- Added disabled-by-default local validation endpoints for request XML, allowlisted reference fixtures, and generated invoice XML.
- Added path traversal protection, 2 MB XML limit, argument-array command execution, timeout enforcement, temp-file cleanup, and stdout/stderr redaction.
- Added settings-page SDK readiness details and invoice-detail local SDK validation result display.
- Extended tests and smoke checks so default runs do not require Java or SDK execution.

### Remaining SDK Local Validation Risks

- Real local execution still needs a pinned Java 11-14 runtime and verification on the target machine.
- Passing local SDK validation would not prove production compliance.
- No signing, real CSID, clearance/reporting, PDF/A-3, KMS key custody, or network submission exists.

## Sales Credit Notes MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add sales credit notes MVP`)

### Credit Notes Added

- Added `CreditNoteStatus`, `CreditNote`, and `CreditNoteLine` schema models with tenant-scoped relations to customer, optional original sales invoice, branch, item, account, tax rate, journal entry, and reversal journal entry.
- Added authenticated credit note APIs for list/create/detail/update/delete/finalize/void plus PDF data/PDF endpoints and invoice-linked credit note listing.
- Added credit note calculation using the same server-side invoice line semantics for gross, discount, taxable amount, tax, and total.
- Added finalization posting: debit revenue by line taxable amount, debit VAT Payable for tax, and credit Accounts Receivable for the credit note total.
- Added void posting through one reusable reversal journal and idempotent finalize/void behavior.
- Added customer ledger and statement rows for finalized and voided credit notes.
- Added operational credit note PDF rendering and generated document archive support with `DocumentType.CREDIT_NOTE`.
- Added frontend credit note list/create/detail/edit pages, invoice detail links/linked rows, and contact ledger navigation.
- Extended smoke coverage for credit note create/finalize, linked invoice listing, ledger row, PDF endpoint, and archived PDF download.

### Remaining Credit Note Risks

- Credit note refund application is not implemented.
- ZATCA credit note XML, signing, PDF/A-3 embedding, clearance, and reporting are not implemented.
- Inventory returns and stock valuation effects are not implemented.
- Credit note application and allocation reversal now mutate invoice `balanceDue`, but refunds and broader customer credit workflows still need design.

## Credit Note Application Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add credit note application workflow`)

### Credit Application Added

- Added immutable `CreditNoteAllocation` rows that link finalized credit notes to finalized open sales invoices.
- Added authenticated `POST /credit-notes/:id/apply`, `GET /credit-notes/:id/allocations`, and `GET /sales-invoices/:id/credit-note-allocations` endpoints.
- Added transaction-guarded balance updates so credit application decreases `SalesInvoice.balanceDue` and `CreditNote.unappliedAmount` without allowing negative balances.
- Confirmed credit application creates no journal entry because credit note finalization already posts the AR reduction.
- Added ledger and statement `CREDIT_NOTE_ALLOCATION` rows with zero debit/credit so matching is visible without double-counting AR.
- Blocked voiding allocated credit notes and invoices with active credit note allocations until reversal exists.
- Extended credit note PDF data/rendering and frontend invoice/credit note/contact views to show allocations.
- Extended smoke coverage for partial application, over-application rejection, neutral ledger rows, PDF allocation data, and allocated credit note void blocking.

### Remaining Credit Application Risks

- Customer refunds now exist, but payment gateway refunds and bank reconciliation are not implemented.
- Credit note allocation does not yet support automatic suggestions across multiple open invoices.
- ZATCA credit note XML/signing/submission remains pending.
- Inventory returns and stock valuation effects remain pending.

## Credit Note Allocation Reversal

Audit date: 2026-05-12

Commit inspected: pending (`Add credit note allocation reversal`)

### Allocation Reversal Added

- Added reversal metadata to `CreditNoteAllocation`: `reversedAt`, `reversedById`, and `reversalReason`.
- Added authenticated `POST /credit-notes/:id/allocations/:allocationId/reverse`.
- Added guarded transaction logic that restores `SalesInvoice.balanceDue` and `CreditNote.unappliedAmount` without creating a journal entry.
- Added clear duplicate reversal handling with `Credit allocation has already been reversed.`
- Updated credit note and invoice void guards so only active allocations block voiding; reversed allocations do not block.
- Added neutral `CREDIT_NOTE_ALLOCATION_REVERSAL` ledger and statement rows.
- Updated credit note/invoice UI allocation tables, credit note PDFs, tests, and smoke coverage for reversal.

### Remaining Allocation Reversal Risks

- Reversal itself is all-or-nothing, but there is no user-facing allocation reversal history page beyond credit note/invoice/ledger rows.
- Manual customer refund workflow now exists, but payment gateway refunds are not implemented.
- ZATCA credit note XML/signing/submission remains pending.
- Inventory return integration remains pending.

## Customer Refund Groundwork

Audit date: 2026-05-12

Commit inspected: pending (`Add customer refund groundwork`)

### Customer Refunds Added

- Added `CustomerRefundStatus`, `CustomerRefundSourceType`, and tenant-scoped `CustomerRefund` records for manual refunds from unapplied customer payments or finalized credit notes.
- Added authenticated refund APIs for list/create/detail/refundable-sources/void plus PDF data/PDF/archive endpoints.
- Added transaction-guarded source balance updates so refunds decrease payment or credit note `unappliedAmount` and voiding restores it once.
- Added accounting posting: debit Accounts Receivable account code `120`, credit the selected paid-from bank/cash asset account.
- Added refund void reversal journals and blocked source payment/credit note voiding while posted refunds exist.
- Added customer ledger and statement rows for `CUSTOMER_REFUND` and `VOID_CUSTOMER_REFUND`.
- Added frontend refund list/create/detail pages, sidebar navigation, payment/credit-note refund links, and contact ledger navigation.
- Added customer refund PDF rendering and generated document archive support with `DocumentType.CUSTOMER_REFUND`.
- Extended smoke coverage for payment refunds, credit note refunds, refund voiding, source unapplied balance restoration, ledger rows, and refund PDF download.

### Remaining Customer Refund Risks

- No payment gateway refund integration exists.
- No bank reconciliation or bank-feed matching exists.
- No ZATCA credit note/refund XML, signing, clearance, reporting, or PDF/A-3 embedding exists.
- Supplier debit notes and inventory return integration remain pending.

## Customer Overpayment Application Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add customer overpayment application workflow`)

### Overpayment Application Added

- Added tenant-scoped `CustomerPaymentUnappliedAllocation` audit rows for applying existing customer overpayments to later finalized open invoices.
- Added authenticated APIs for listing unapplied payment allocations, applying unapplied payment amounts, reversing allocations, and viewing invoice-side allocation history.
- Added transaction-guarded allocation and reversal updates so invoice `balanceDue` and payment `unappliedAmount` cannot go negative or exceed original invoice/payment totals.
- Confirmed unapplied payment application and reversal are matching-only actions and do not create journal entries because the original customer payment already posted `Dr Bank/Cash, Cr Accounts Receivable`.
- Active unapplied payment allocations now block customer payment voiding and invoice voiding; reversed allocations do not block voiding.
- Customer refunds continue to use only the current payment `unappliedAmount`, so amounts applied to invoices are not refundable unless the allocation is reversed first.
- Added neutral customer ledger and statement rows for `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION` and `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL`.
- Updated payment receipts, invoice detail, payment detail, contact ledger UI, tests, and smoke coverage for the new workflow.

### Remaining Overpayment Risks

- No automated customer-credit matching or allocation suggestions exist yet.
- No bank reconciliation or bank-feed matching exists.
- No payment gateway refund integration exists.
- Supplier debit notes and inventory return integration remain pending.
- ZATCA credit note/submission workflow remains pending.

## Purchases And Supplier Payments MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add purchases and supplier payments MVP`)

### Purchases Groundwork Added

- Added `PurchaseBillStatus`, `PurchaseBill`, `PurchaseBillLine`, `SupplierPaymentStatus`, `SupplierPayment`, and `SupplierPaymentAllocation` schema records with tenant-scoped supplier, branch, account, tax rate, item, journal, and allocation relations.
- Added authenticated purchase bill APIs for list/create/detail/update/delete/finalize/void, open bill lookup, PDF data, and PDF download.
- Added authenticated supplier payment APIs for list/create/detail/void, receipt PDF data, and receipt PDF download.
- Added purchase bill calculations using the same decimal-safe gross, discount, taxable, tax, and line-total semantics as sales invoices.
- Added AP posting on bill finalization: debit expense/cost-of-sales/asset purchase accounts, debit VAT Receivable account code `230`, and credit Accounts Payable account code `210`.
- Added supplier payment posting: debit Accounts Payable account code `210`, credit selected paid-through asset account, and reduce allocated bill balances.
- Added supplier payment voiding with one reusable reversal journal and one-time bill balance restoration.
- Added supplier ledger and supplier statement APIs with purchase bill, supplier payment, voided payment, and voided bill rows.
- Added purchase bill and supplier payment receipt PDF rendering plus generated document archive types.
- Added frontend purchases navigation, bill list/create/detail/edit pages, supplier payment list/create/detail pages, and supplier ledger/statement sections on contact detail.
- Extended smoke coverage for supplier contact setup, purchase bill finalization, AP journal checks, partial supplier payment, supplier payment void, supplier ledger/statement, and purchase/supplier payment PDFs.

### Remaining Purchase Risks

- No purchase orders are implemented.
- No supplier debit notes or supplier credit allocation/refund workflow exists beyond supplier payments.
- No inventory stock movement, landed-cost, or COGS integration exists for purchase bill lines that reference inventory accounts.
- No bank reconciliation or bank-feed matching exists for supplier payments.
- No ZATCA purchase-side compliance, validation, or submission workflow is implemented.

## Full Project Audit And Roadmap

Audit date: 2026-05-12

Commit inspected: `dd498c7` (`Add purchases and supplier payments MVP`)

### Audit Docs Created

- Added `docs/PROJECT_AUDIT.md` with current maturity, top risks, and next priorities.
- Added `docs/IMPLEMENTATION_STATUS.md` with module-by-module MVP/partial/groundwork status.
- Added `docs/CODEBASE_MAP.md` with repo structure, backend modules, frontend routes, package boundaries, and logic locations.
- Added `docs/API_CATALOG.md` with implemented endpoints grouped by module.
- Added `docs/DATABASE_MODEL_CATALOG.md` with Prisma enum/model purposes, relationships, accounting impact, and limitations.
- Added `docs/FRONTEND_ROUTE_CATALOG.md` with implemented UI routes, data fetched, actions, and missing UX pieces.
- Added `docs/ACCOUNTING_WORKFLOW_AUDIT.md` with journal postings, balance effects, void/reversal behavior, and risks.
- Added `docs/ZATCA_STATUS_AUDIT.md` with explicit non-compliance warnings and remaining official validation needs.
- Added `docs/TESTING_AND_SMOKE_AUDIT.md` with test counts, smoke coverage, uncovered areas, and Windows caveats.
- Added `docs/REMAINING_ROADMAP.md` with phased next work from MVP stabilization through production/SaaS readiness.
- Added `docs/MANUAL_DEPENDENCIES.md` with human/third-party setup requirements.

### New Issues Found

- Supplier AP balances currently reuse the shared customer-style Dr/Cr display helper on contact detail. The underlying AP ledger math is documented, but the UI should later use supplier-specific payable wording.
- Prisma continues to warn that `package.json#prisma` seed configuration is deprecated and should move to `prisma.config.ts` before Prisma 7.
- PowerShell paths containing `(app)` need quoting or `-LiteralPath` during local operations.

### Major Remaining Risks

- Role permission enforcement is now MVP-grade, but invite/member management and approval workflows remain limited.
- Fiscal periods now lock posting dates, but formal year-end close and approval workflows remain limited.
- Core financial reports now have MVP coverage, but still need accountant review and production hardening.
- Inventory/COGS remain unimplemented; purchase orders and bank reconciliation are MVP-grade and still need advanced hardening.
- Generated PDFs are still stored as database base64 and need object storage before production scale.
- ZATCA remains local/mock/scaffold only and is not production compliant.

### Next Recommended Module

Supplier debit notes are the next accounting module because purchases/AP now exists and supplier-side adjustments are needed before deeper purchase-order or inventory flows.

## Supplier Debit Notes MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add purchase debit notes MVP`)

### Supplier Debit Notes Added

- Added `PurchaseDebitNoteStatus`, `PurchaseDebitNote`, `PurchaseDebitNoteLine`, and `PurchaseDebitNoteAllocation` schema records with tenant-scoped supplier, original bill, branch, account, tax rate, item, journal, and allocation relations.
- Added authenticated purchase debit note APIs for list/create/detail/update/delete/finalize/void/apply/allocation reversal plus PDF data/PDF/archive endpoints.
- Added purchase bill helper APIs for linked debit notes and debit note allocations.
- Added AP reversal posting on debit note finalization: debit Accounts Payable account code `210`, credit line purchase accounts by taxable amounts, and credit VAT Receivable account code `230` when tax exists.
- Added transaction-guarded allocation and reversal updates so purchase bill `balanceDue` and debit note `unappliedAmount` cannot go below zero or above source totals.
- Confirmed debit note allocation and allocation reversal are matching-only actions and do not create journal entries because finalization already posts the AP reduction.
- Added supplier ledger and statement rows for `PURCHASE_DEBIT_NOTE`, `VOID_PURCHASE_DEBIT_NOTE`, `PURCHASE_DEBIT_NOTE_ALLOCATION`, and `PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL`.
- Added operational purchase debit note PDF rendering and generated document archive support with `DocumentType.PURCHASE_DEBIT_NOTE`.
- Added frontend purchases navigation, debit note list/create/detail/edit pages, purchase bill linked debit-note sections, allocation/reversal actions, and contact supplier ledger row links.
- Extended smoke coverage for debit note finalization, journal checks, allocation, allocation reversal, voiding after reversal, supplier ledger rows, PDF download, and archived PDF download.

### Remaining Supplier Debit Note Risks

- No inventory return or stock movement integration exists for supplier debit notes.
- No ZATCA debit note XML, signing, clearance, reporting, or PDF/A-3 embedding exists.
- Supplier cash refund workflow now exists for unapplied debit note balances, but it is manual accounting only and has no bank integration.
- No purchase order linkage exists.
- No bank reconciliation or bank-feed matching exists.

## Supplier Overpayment And Refund Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add supplier overpayment and refund workflow`)

### Supplier Credit Handling Added

- Added `SupplierPaymentUnappliedAllocation`, `SupplierRefundStatus`, `SupplierRefundSourceType`, and `SupplierRefund` schema records with tenant-scoped supplier, source payment/debit note, account, journal, reversal, and generated document support.
- Added authenticated supplier payment APIs for applying unapplied supplier payment credit to open bills, listing unapplied applications, and reversing active unapplied applications.
- Added authenticated supplier refund APIs for list/create/detail/refundable-source lookup/void/PDF data/PDF/archive.
- Added guarded matching-only updates so supplier payment unapplied applications decrease `PurchaseBill.balanceDue` and `SupplierPayment.unappliedAmount`, while reversal restores both without creating journal entries.
- Added supplier refund posting: debit selected bank/cash asset account and credit Accounts Payable account code `210`.
- Added supplier refund voiding with one reusable reversal journal and one-time source `unappliedAmount` restoration.
- Blocked supplier payment voiding while active unapplied payment applications or posted supplier refunds exist; reversed applications and voided refunds do not block.
- Blocked purchase bill voiding while active supplier payment unapplied applications exist.
- Blocked purchase debit note voiding while posted supplier refunds from that debit note exist.
- Added supplier ledger/statement rows for `SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION`, `SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL`, `SUPPLIER_REFUND`, and `VOID_SUPPLIER_REFUND`.
- Added operational supplier refund PDF rendering and generated document archive support with `DocumentType.SUPPLIER_REFUND`.
- Added frontend purchases navigation, supplier refund list/create/detail pages, supplier payment unapplied application/reversal UI, supplier refund links from payments/debit notes, purchase bill allocation visibility, and contact supplier ledger row links.
- Extended backend/frontend tests and smoke coverage for supplier overpayment application, reversal, supplier payment refunds, debit note refunds, supplier ledger rows, and supplier refund PDF download.

### Remaining Supplier Credit Risks

- No bank reconciliation or bank-feed matching exists for supplier refunds or supplier payments.
- No payment gateway or bank reconciliation integration exists; refunds are manual accounting records only.
- No automated supplier credit matching or allocation suggestions exist.
- No purchase order linkage exists.
- No inventory return or stock movement integration exists.
- No ZATCA debit note XML/signing/submission exists.

## Cash Expenses MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add cash expenses MVP`)

### Cash Expenses Added

- Added `CashExpenseStatus`, `CashExpense`, and `CashExpenseLine` schema records with tenant-scoped optional supplier/contact, branch, paid-through account, line account, tax rate, item, journal, and void reversal relations.
- Added `DocumentType.CASH_EXPENSE` and `NumberSequenceScope.CASH_EXPENSE` with seeded `EXP-` numbering.
- Added authenticated cash expense APIs for list/create/detail/void/PDF data/PDF/archive.
- Added immediate posting behavior: debit line expense/COGS/asset accounts, debit VAT Receivable account code `230` when tax exists, and credit the selected paid-through asset account.
- Added cash expense voiding with one reusable reversal journal and idempotent void-state handling.
- Added optional supplier/contact linkage with supplier/BOTH validation.
- Added neutral supplier ledger/statement rows for linked cash expenses so supplier activity is visible without changing AP running balance.
- Added operational cash expense PDF rendering and generated document archive support.
- Added frontend purchases navigation route, cash expense list/create/detail pages, PDF download, and void action.
- Extended backend/frontend tests and smoke coverage for posting, VAT journal behavior, supplier ledger visibility, PDF download, and void reversal.

### Remaining Cash Expense Risks

- Receipt attachment groundwork exists, but it is database-backed only and has no object storage lifecycle.
- No OCR or receipt scanning exists yet.
- No employee claim approval workflow exists yet.
- No bank reconciliation or bank-feed matching exists.
- No cash expense import workflow exists.

## Core Accounting Reports MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add core accounting reports MVP`)

### Reports Added

- Added authenticated, tenant-scoped report APIs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- General Ledger, Trial Balance, Profit & Loss, Balance Sheet, and VAT Summary are derived from posted journal activity. Historical journals marked `REVERSED` are included with their posted reversal journals so reversal accounting remains balanced.
- Aged Receivables uses current finalized, non-voided sales invoices with open `balanceDue`.
- Aged Payables uses current finalized, non-voided purchase bills with open `balanceDue`.
- Added frontend report pages under `/reports/*` with date/as-of filters, loading/error/empty states, tabular output, and totals.
- Added report helper tests, backend report math tests, and smoke checks for all report endpoints.

### Remaining Reports Risks

- VAT Summary is not an official VAT return filing report.
- Report PDFs and basic CSV exports now exist.
- Scheduled/email delivery is not implemented yet.
- Report definitions and presentation still need accountant review before production use.

## Fiscal Period Posting Locks

Audit date: 2026-05-12

Commit inspected: pending (`Add fiscal period posting locks`)

### Fiscal Period Controls Added

- Added authenticated, tenant-scoped fiscal period APIs for list/create/detail/update/close/reopen/lock.
- Added overlap validation, end-before-start validation, and guarded status transitions for `OPEN`, `CLOSED`, and `LOCKED`.
- Added a central fiscal period posting guard: if no periods exist, posting remains allowed; once periods exist, posting dates must fall inside an `OPEN` period.
- Enforced the guard on manual journal posting/reversal and all accounting workflows that create posted journals or reversal journals.
- Kept pure allocation/matching actions unguarded because they create no journal entry and should not be treated as new postings.
- Added `/fiscal-periods` frontend page with period creation, status badges, close/reopen/lock actions, and irreversible-lock warnings.
- Extended backend/frontend tests and smoke coverage for fiscal period transitions and closed-period posting rejection.

### Remaining Fiscal Period Risks

- Locked periods cannot be reopened in this MVP; no admin unlock/approval workflow exists.
- Reversal journals use the current date as their posting date; no user-selected reversal date exists yet.
- No fiscal year wizard, period templates, or year-end close workflow exists yet.
- No retained earnings close process exists yet.
- Reports do not yet label or summarize fiscal period status for selected date ranges.

## Role Permission Enforcement

Audit date: 2026-05-12

Commit inspected: pending (`Enforce role permissions`)

### Permissions Enforcement Added

- Added shared permission constants, default role permission sets, and helpers in `packages/shared`.
- Seeded Owner, Admin, Accountant, Sales, Purchases, and Viewer roles with explicit permission arrays.
- Added a tenant-scoped `PermissionGuard` and `@RequirePermissions(...)` decorator for sensitive API routes.
- Enforced permissions on accounting, sales, purchase, reports, document, fiscal period, generated document, organization, role, branch, audit, and ZATCA endpoints.
- Updated `/auth/me` to expose active memberships with role name and permissions for frontend decisions.
- Added frontend permission helpers, sidebar filtering, route-level access denied handling, and permission-aware action visibility.
- Extended smoke coverage to verify role permissions are visible from `/auth/me`.

### Permission Risks Reduced

- Users with active organization membership can no longer perform sensitive accounting actions solely by guessing API endpoints.
- Report, posting, voiding, fiscal lock, document settings, generated document download, and ZATCA management actions now require explicit role permissions.
- Frontend navigation and high-risk action buttons no longer advertise workflows the active role cannot use.

### Remaining Permission Risks

- Invite flow and member/role assignment UI remain limited.
- Role editor UI is not yet production-grade.
- Approval workflows, maker-checker review, and dual-control policies are not implemented.
- Permission coverage must be kept current when new modules or endpoints are added.

## Team And Role Management

Audit date: 2026-05-13

Commit inspected: pending (`Add team and role management`)

### Team/Role Management Added

- Added `Role.isSystem` so seeded default roles can be protected from deletion and editing.
- Added role create/update/delete APIs with permission-string validation against the shared permission catalog.
- Added organization member list/detail, role update, status update, and local invite-placeholder APIs.
- Added lockout safeguards that block removing the last active full-access member and leaving the organization without an active user manager.
- Added `/settings/team`, `/settings/roles`, and `/settings/roles/[id]` UI pages with permission-aware controls.
- Added grouped permission matrix UI for viewing and editing custom roles.
- Extended smoke coverage for role list, member list, custom role creation, and unknown permission rejection.

### Remaining Team/Role Risks

- Email invite delivery and password reset use mock by default with opt-in SMTP support; domain authentication validation and MFA are not implemented yet.
- Approval workflows and dual-control for high-risk role/member changes are not implemented.
- Role/member changes write audit logs, but there is no dedicated audit review UI yet.

## Inventory Warehouse And Stock Ledger Groundwork

Audit date: 2026-05-13

Commit inspected: pending (`Add inventory warehouse groundwork`)

### Inventory Groundwork Added

- Added warehouse and stock movement schema groundwork with active/archived warehouse status and positive-quantity stock ledger movement types.
- Added seeded and provisioned `MAIN` default warehouses for organizations.
- Added authenticated warehouse APIs for list/create/detail/update/archive/reactivate with tenant scoping and archive safeguards.
- Added authenticated stock movement APIs for list/create/detail with tracked-item validation, active-warehouse validation, duplicate opening-balance rejection, and negative-stock prevention.
- Added derived inventory balance API by item and warehouse.
- Added Inventory sidebar navigation, warehouse pages, stock movement pages, balance table, item inventory-tracking quantity display, and frontend inventory helper tests.
- Extended smoke coverage for default warehouse lookup, inventory-tracked item setup, opening balance, adjustment in/out, balance verification, movement listing, and no-journal stock movement behavior.

### Remaining Inventory Risks

- No inventory valuation accounting exists.
- No automatic COGS posting exists; manual COGS posting now requires explicit review/action.
- Manual operational purchase receiving now exists, but no automatic purchase bill stock receipt or inventory asset posting exists.
- Manual operational sales stock issue now exists, but no sales delivery document, automatic sales invoice stock issue, or automatic COGS posting exists.
- Direct stock-movement adjustments have been replaced by the controlled adjustment workflow.
- No inventory financial reporting or valuation report exists.

## Inventory Adjustments And Warehouse Transfers

Audit date: 2026-05-14

Commit inspected: pending (`Add inventory adjustments and transfers`)

### Inventory Operations Added

- Added `InventoryAdjustment` schema, statuses, types, number sequences, permissions, APIs, and frontend list/create/detail/edit pages.
- Added draft adjustment lifecycle with draft-only edit/delete, approval to generated `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` movements, and one-time void reversal movements.
- Added `WarehouseTransfer` schema, status, number sequence, permissions, APIs, and frontend list/create/detail pages.
- Added immediate posted warehouse transfers with atomic `TRANSFER_OUT` and `TRANSFER_IN` stock movements plus one-time reversal movements on void.
- Restricted direct stock movement creation to `OPENING_BALANCE`; adjustments and transfers now own their generated stock rows.
- Extended inventory balance behavior and tests so adjustment and transfer movement directions are included.
- Extended smoke coverage for adjustment approval/void, transfer posting/void, balance restoration, and no-journal inventory behavior.

### Remaining Inventory Risks

- No automatic COGS posting exists; manual COGS posting now requires explicit review/action.
- No inventory valuation accounting exists.
- Manual operational purchase receiving now exists, but no automatic purchase bill stock receipt or inventory asset posting exists.
- Manual operational sales stock issue now exists, but no sales delivery document, automatic sales invoice stock issue, or automatic COGS posting exists.
- Operational inventory reports exist, but no accounting-grade inventory financial reports exist.
- No landed cost workflow exists.
- No barcode, serial, or batch tracking exists.

## Remaining Risks

- The concurrency strategy relies on PostgreSQL row locks produced by conditional updates inside Prisma transactions. A small multi-process load test is still recommended before production.
- If a manual journal reversal races against an invoice/payment void of the same journal, the void may fail cleanly and need a retry instead of silently reusing that concurrent reversal.
- Branch defaults are not globally normalized; multiple branches can be marked default.
- Account parent updates prevent self-parenting but do not yet prevent descendant cycles.
- `next-env.d.ts` flips between `.next/types` and `.next/dev/types` when switching between build and dev on Next 16. The tracked file is kept clean after verification, but this remains local development churn.
- Prisma 6 warns that `package.json#prisma` seed configuration is deprecated and should move to a Prisma config file before Prisma 7.
- Inventory warehouse/stock ledger, adjustment approval, warehouse transfer controls, purchase receiving, sales stock issue controls, and accounting preview groundwork exist, but real COGS posting, inventory asset GL posting, inventory clearing, landed cost, serial/batch tracking, automatic financial inventory accounting, and inventory financial reporting remain unimplemented.
- ZATCA groundwork is intentionally non-compliant until real onboarding, signing, clearance/reporting, PDF/A-3, official SDK/schema/Schematron validation, and KMS-backed key custody are implemented.

## Recommended Next Steps

1. Review the new inventory accounting preview layer with an accountant, then add explicit COGS posting only after approval.
2. Add formal fiscal year close, retained earnings close, and admin unlock/approval workflows.
3. Add a lightweight Playwright or browser smoke suite once the local Node runtime supports the in-app browser backend.
4. Normalize branch default behavior and account parent cycle validation.
5. Move Prisma seed configuration to `prisma.config.ts` before upgrading to Prisma 7.

## ZATCA Fresh EGS SDK Hash Mode Validation

Audit date: 2026-05-16

Commit inspected: pending (`Validate SDK hash mode end to end`)

### Validation Added

- Added repeatable local helper `corepack pnpm zatca:validate-sdk-hash-mode`.
- Validated Java 11.0.26 with the official SDK launcher from a no-space temp SDK copy.
- Created an isolated local organization and fresh zero-metadata EGS.
- Enabled `SDK_GENERATED` hash mode with explicit confirmation and verified `ZATCA_SDK_HASH_MODE_ENABLED` audit logging.
- Generated two finalized invoices through the API.
- Verified invoice 1 uses the official first PIH seed and persisted SDK hash `3G0f1iTuJNYnHJY8dJWsoGfz9jfCBaTwNb+UK84ILaU=`.
- Verified invoice 2 uses invoice 1's SDK hash as PIH and persisted SDK hash `Eoo9jY0Tcf1zof/rjR3LPIXXsyxnLNvzrIcZLR9OczY=`.
- Verified persisted hashes match direct SDK `fatoora -generateHash -invoice <filename>`.
- Verified `POST /sales-invoices/:id/zatca/hash-compare` returns `MATCH` and `noMutation=true` for both invoices.
- Verified repeated generation does not increment ICV or mutate EGS last hash.
- Tightened SDK validation success parsing so `GLOBAL VALIDATION RESULT = FAILED` returns `success=false` even when the SDK exits `0`.

### Remaining ZATCA Risks

- Superseded by the later PIH-chain debug pass above: generated invoice 2 `KSA-13` is resolved for local fresh-EGS validation by using an invoice-specific temporary SDK `pihPath`.
- Generated invoices still show buyer-address quality warning `BR-KSA-63` because customer records do not capture a dedicated 4-digit buyer building number.
- No signing, certificate/key custody, Phase 2 QR, CSID, clearance/reporting, PDF/A-3, or real ZATCA network calls exist.
- Fresh-EGS SDK hash mode is local-only evidence and is not production compliance.

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.

## ZATCA CSR config review workflow update (2026-05-16)

Official references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only operator review tracking for sanitized non-production CSR config previews:
- Added `ZatcaCsrConfigReview` records with `DRAFT`, `APPROVED`, `SUPERSEDED`, and `REVOKED` status.
- Stored only sanitized `key=value` CSR config preview text, official key order, config hash, missing/review/blocker metadata, operator approval fields, and audit-friendly notes.
- Added endpoints to create/list reviews and approve/revoke review records.
- New reviews supersede previous active reviews for the same EGS unit so only the latest preview review remains active.
- Approval is blocked when the current preview has missing fields, blockers, or a changed config hash.
- `POST /zatca/egs-units/:id/csr-dry-run` now reports `configReviewRequired`, `latestReviewId`, `latestReviewStatus`, and `configApprovedForDryRun` for future controlled SDK CSR planning.
- The ZATCA settings UI shows review status, config hash, approval metadata, and create/approve/revoke actions next to the sanitized CSR config preview.
- Audit logs capture create/approve/revoke actions without private keys, certificate bodies, CSID tokens, one-time portal codes, generated CSR bodies, or production credentials.

Safety boundary remains unchanged:
- No SDK CSR execution is implemented.
- No compliance CSID or production CSID request is made.
- No invoice signing, clearance/reporting, PDF/A-3, real ZATCA network call, production credentials, or production compliance claim is enabled.

Recommended next step:
- Add an explicitly gated, temp-directory-only local CSR file preparation review gate that requires an approved review hash before any future non-production SDK CSR execution experiment.

## 2026-05-16 - ZATCA CSR local generation gate

Official local references inspected for this phase:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implemented local-only behavior:
- Added a disabled-by-default CSR local generation gate at `POST /zatca/egs-units/:id/csr-local-generate` and `corepack pnpm zatca:csr-local-generate`.
- The gate requires `ZATCA_SDK_CSR_EXECUTION_ENABLED=true`, a non-production EGS unit, an `APPROVED` CSR config review, a current preview hash matching the approved review, no missing CSR fields, and no preview blockers.
- When the flag is false, no SDK process runs, no temp private key is generated, no CSR is generated, and the response reports `executionEnabled=false`, `executionAttempted=false`, and `executionSkipped=true`.
- When the flag is true and all prerequisites pass, the app writes only a temp CSR config file, runs the official SDK CSR command plan with temp private-key and generated-CSR paths, summarizes sanitized stdout/stderr, and deletes the temp directory by default.
- Responses, logs, reviews, smoke output, and UI do not expose private key PEM, generated CSR body, certificate bodies, CSID token material, OTP values, or production credentials.
- The gate does not request compliance CSIDs, does not request production CSIDs, does not call ZATCA network endpoints, does not sign invoices, does not perform clearance/reporting, does not implement PDF/A-3, and keeps `productionCompliance=false`.

UI and validation notes:
- ZATCA settings now shows that local SDK CSR generation requires an approved review and the disabled-by-default env gate.
- Default smoke calls the local generation endpoint with the default disabled flag and verifies no SDK execution, no secret content, no EGS ICV/hash mutation, and no submission-log creation.
- Normal tests mock SDK execution and do not require Java or the official SDK.

Recommended next step:
- Add a controlled non-production operator flow to intentionally enable the CSR gate in a local sandbox session, run the SDK CSR command once with temp files, and manually inspect only sanitized metadata before any future CSID onboarding design.

## 2026-05-16 - Local ZATCA signing dry-run and Phase 2 QR gate

- Official sources inspected: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, official simplified/standard invoice samples, official standard credit/debit samples, SDK certificate/private-key fixture paths, BR-KSA Schematron rules, UBL XAdES/XMLDSig schemas, XML implementation standard PDF, security features implementation standard PDF, and EInvoice_Data_Dictionary.xlsx.
- Added local-only signing dry-run groundwork through `POST /sales-invoices/:id/zatca/local-signing-dry-run` and `corepack pnpm zatca:local-signing-dry-run`.
- `ZATCA_SDK_SIGNING_EXECUTION_ENABLED` defaults to `false`. With the default setting, no SDK signing execution, no QR generation, no temp private-key usage, no signed XML output, no CSID request, no ZATCA network call, and no persistence occurs.
- If explicitly enabled for local/non-production work, the planned path writes unsigned XML to temporary files, attempts the official SDK `-sign` command, plans/runs the SDK `-qr` step only after a signed XML is detected, sanitizes stdout/stderr, and cleans temporary files by default.
- Redaction guarantees: responses and logs must not include private key PEM, certificate bodies, CSID tokens, OTPs, full signed XML bodies, generated CSR bodies, or QR payload bodies.
- Phase 2 QR status: blocked until signed XML, certificate, hash, and signature artifacts are available. The current UI/API exposes the dependency chain instead of fabricating cryptographic QR tags.
- Production limitations remain: no compliance CSID request, no production CSID request, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: run a controlled non-production SDK signing experiment only after approved CSR/test certificate material exists and the operator explicitly enables the local execution gate.

## 2026-05-16 - Controlled local ZATCA signing experiment

Scope: local SDK signing/Phase 2 QR experiment only. No CSID request, no ZATCA network call, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv132-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-XAdESv141-2.1.xsd
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Schemas/xsds/UBL2.1/xsd/common/UBL-xmldsig-core-schema-2.1.xsd
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed from official references:
- The SDK documents local `fatoora -sign -invoice <file> -signedInvoice <file>` and `fatoora -qr -invoice <file>` commands.
- Simplified invoices require the cryptographic stamp/UBL signature structures and Phase 2 QR path; BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60 remain expected until valid signing material and QR generation are in place.
- The official samples contain the required signature IDs `urn:oasis:names:specification:ubl:signature:1`, `urn:oasis:names:specification:ubl:signature:Invoice`, and signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`.
- The bundled SDK certificate/private key files are treated as SDK dummy/test material only and must not be used as production credentials.

Implementation updates:
- Hardened `POST /sales-invoices/:id/zatca/local-signing-dry-run` so `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` still requires a generated XML, invoice metadata, active EGS, writable temp directory, Java SDK readiness, SDK launcher/config readiness, explicit SDK dummy certificate/private key availability, no production credentials, no network-like command plan, and no persistence.
- Rewrites SDK config into a temp directory for any future local signing attempt so official config keys point at repo-local SDK paths and dummy test material without returning certificate/private-key content.
- Response now distinguishes `executionStatus`, `signingExecuted`, `qrExecuted`, dummy material readiness, temp SDK config writing, signed XML detection, QR detection, SDK exit codes, sanitized stdout/stderr, blockers, warnings, and cleanup.
- UI now surfaces local signing execution status plus whether SDK signing or QR commands actually executed.
- Default smoke remains safe with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false` and verifies execution is skipped.

Controlled local experiment result:
- Experiment invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`, generated locally as `SIMPLIFIED_TAX_INVOICE` with ICV 33 for this test.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` set only for that command.
- Java observed: OpenJDK 17.0.16.
- SDK path: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8`.
- Result: `executionEnabled=true`, `executionAttempted=false`, `executionSkipped=true`, `executionStatus=SKIPPED`.
- Blocker: detected Java 17.0.16 is outside the SDK-supported range `>=11 <15`.
- SDK exit code: not applicable because execution was correctly blocked before SDK invocation.
- `signedXmlDetected=false`; `qrDetected=false`; `sdkExitCode=null`; `qrSdkExitCode=null`.
- Temp files written: unsigned XML false, SDK config false, signed XML false.
- Cleanup: no temp files required; cleanup reported success.
- Optional local validation of signed temp XML was skipped because no signed XML was produced.

Security and redaction guarantees:
- No private key PEM, certificate body, CSID token, OTP, generated CSR body, signed XML body, or QR payload body is returned or stored.
- No invoice metadata is marked signed.
- No signed XML or QR is persisted to the database.
- The dry-run path does not request CSIDs, does not call ZATCA, and does not submit invoices.
- The path remains a local engineering experiment and does not prove production compliance.

Remaining blockers and next step:
- Install/use an officially supported Java runtime for the SDK experiment, preferably Java 11, then rerun the gated local experiment with SDK dummy/test material only.
- Even if local dummy signing succeeds later, production signing remains blocked until proper compliance/production CSID onboarding, key custody, certificate handling, clearance/reporting design, and production validation are implemented.

## 2026-05-16 - Java 11 controlled ZATCA SDK signing experiment

Scope: local-only SDK signing and QR experiment with SDK dummy/test material. No CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF-A3, no production credentials, no signed XML persistence, and no production-compliance claim.

Official sources inspected:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/cert.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Certificates/ec-secp256k1-priv-key.pem
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx

Confirmed official behavior:
- The SDK readme requires Java versions `>=11` and `<15`.
- The documented local signing command is `fatoora -sign -invoice <filename> -signedInvoice <filename>`.
- The documented QR command is `fatoora -qr -invoice <filename>`.
- SDK bundled `cert.pem` and `ec-secp256k1-priv-key.pem` are dummy/testing material only and are not production credentials.
- Simplified invoices require the signature/cryptographic stamp structure and QR flow; official rules include BR-KSA-27, BR-KSA-28, BR-KSA-29, BR-KSA-30, and BR-KSA-60.
- The official simplified sample includes `ext:UBLExtensions`, `sac:SignatureInformation`, signature ID `urn:oasis:names:specification:ubl:signature:1`, referenced signature/signature ID `urn:oasis:names:specification:ubl:signature:Invoice`, signature method `urn:oasis:names:specification:ubl:dsig:enveloped:xades`, and a `QR` additional document reference.

Java runtime configuration:
- Default Java remains OpenJDK `17.0.16` from `C:\Users\Ahmad\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.16.8-hotspot\bin\java.exe`.
- Supported local Java used for the experiment: `C:\Program Files\Microsoft\jdk-11.0.26.4-hotspot\bin\java.exe`.
- Java 11 version output: OpenJDK `11.0.26` Microsoft build `11.0.26+4-LTS`.
- No global Java change was made; the command used `ZATCA_SDK_JAVA_BIN` only for the local experiment process.

Wrapper hardening added:
- The official Windows `fatoora.bat` expands `FATOORA_HOME` without quotes, so the repo path `E:\Accounting App` broke the launcher under Java 11.
- The local signing wrapper now stages the SDK launcher, JAR, `jq`, and `global.json` into the existing no-space temp directory before execution.
- The temp SDK config is still rewritten only in temp storage and points at SDK dummy/test certificate/private-key material.
- `tempFilesWritten.sdkRuntime` reports whether the temporary SDK runtime staging occurred.
- The sales invoice ZATCA panel displays whether the temp SDK runtime was staged.
- `corepack pnpm zatca:local-signing-dry-run -- --help` now documents `ZATCA_SDK_JAVA_BIN`.

Controlled signing/QR experiment result:
- Invoice: `INV-000163` / `faa19714-abdd-4732-a012-283b5d4ff8c6`.
- Invoice type: `SIMPLIFIED_TAX_INVOICE`.
- Local ICV: `33` from the previously generated unsigned XML.
- Command: `corepack pnpm zatca:local-signing-dry-run -- --invoice-id faa19714-abdd-4732-a012-283b5d4ff8c6` with `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=true` and `ZATCA_SDK_JAVA_BIN` set to Java 11 for that command only.
- Result: `executionEnabled=true`, `executionAttempted=true`, `executionSkipped=false`, `executionStatus=SUCCEEDED_LOCALLY`.
- `signingExecuted=true`; `qrExecuted=true`.
- `sdkExitCode=0`; `qrSdkExitCode=0`.
- `signedXmlDetected=true`; `qrDetected=true`.
- `tempFilesWritten`: unsigned XML true, SDK config true, SDK runtime true, signed XML true, files retained false.
- Cleanup: performed true, success true, temp files removed by default.
- Sanitized SDK output: signing reported `InvoiceSigningService - invoice has been signed successfully`; QR reported `QrGenerationService - Qr has been generated successfully`; QR payload body was redacted.

Optional local validation of signed temp XML:
- A second keep-temp run was used only long enough to validate `signed.xml` locally, then the temp directory was deleted.
- Validation command used the temp staged SDK launcher/config and Java 11, with no ZATCA network call and no CSID request.
- Validation exit code: `0`.
- XSD: PASSED.
- EN: PASSED.
- KSA: PASSED.
- QR: PASSED.
- SIGNATURE: PASSED.
- PIH: FAILED.
- GLOBAL: FAILED.
- Remaining warning: `BR-KSA-08` seller identification warning in the local demo data.
- Remaining error: `KSA-13` PIH invalid. This is expected for the isolated dummy signing experiment because the signed temp artifact is not persisted and the hash chain/PIH is not mutated or promoted as an official signed invoice.

Redaction and no-mutation guarantees:
- No private key PEM, certificate body, CSID token, OTP, signed XML body, generated CSR body, or QR payload body is returned or stored.
- Signed XML is temp-only and deleted by default.
- The validation temp directory from the keep-temp run was manually deleted after validation.
- No invoice metadata is marked signed.
- No signed XML or QR payload is persisted to the database.
- No ICV, PIH, invoice hash, previous hash, EGS last hash, or submission log is mutated by the local signing dry-run path.

Remaining limitations and next step:
- This proves the local SDK dummy-material signing/QR path can execute under Java 11 only; it does not prove production compliance.
- Production signing remains blocked until real compliance/production CSID onboarding, secure key custody, certificate lifecycle handling, official clearance/reporting behavior, PDF-A3, and production validation are implemented.
- Recommended next step: add an explicit local signed-XML validation dry-run endpoint/script that keeps signed XML temp-only, returns only sanitized validation categories, and continues to block all CSID/network/persistence behavior.

### ZATCA local signed XML validation dry-run update (2026-05-16)

- Added a local-only signed XML validation dry-run path for generated invoices: `POST /sales-invoices/:id/zatca/local-signed-xml-validation-dry-run` and `corepack pnpm zatca:local-signed-xml-validate -- --invoice-id <id>`.
- Official references inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/PIH/pih.txt`, SDK dummy `Data/Certificates/cert.pem`, SDK dummy `Data/Certificates/ec-secp256k1-priv-key.pem`, standard/simplified SDK invoice samples, ZATCA Schematron rules, XML Implementation Standard PDF, Security Features Implementation Standards PDF, and `EInvoice_Data_Dictionary.xlsx`.
- Behavior: when `ZATCA_SDK_SIGNING_EXECUTION_ENABLED=false`, signing, QR, and signed XML validation are skipped and the response stays dry-run/no-mutation. When explicitly enabled in local/dev only, the service signs and QR-generates temp XML with SDK dummy/test material, rewrites the temp SDK `pihPath` to invoice metadata `previousInvoiceHash`, validates the signed temp XML, sanitizes XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL output, then cleans temp files by default.
- PIH/KSA-13 finding: the earlier signed-temp validation PIH failure was caused by SDK validation reading the default configured PIH file instead of an invoice-specific previous hash. The new temp `pihPath` override fixed the controlled local validation for demo invoice `INV-000163`: XSD/EN/KSA/QR/SIGNATURE/PIH/GLOBAL all passed with validation exit code `0`.
- Seller identification: BR-KSA-08 readiness now reports missing or invalid seller ID scheme/number, and XML emits seller `cac:PartyIdentification` only when the seller ID scheme is one of `CRN`, `MOM`, `MLS`, `SAG`, `OTH`, or `700` and the value is alphanumeric. Existing generated XML must be regenerated after adding valid seller ID data to clear an existing BR-KSA-08 warning.
- Safety guarantees: no CSID request, no ZATCA network call, no invoice submission, no clearance/reporting, no PDF/A-3, no production credentials, no signed XML/QR persistence, no ICV/PIH/hash-chain mutation, and no production compliance claim.
- Recommended next step: add controlled seller profile data repair/regeneration guidance for demo invoices, then design a signed XML promotion workflow separately from this dry-run path.

## ZATCA signed XML promotion planning update (2026-05-16)

- Added a safe signed XML promotion architecture boundary in `docs/zatca/SIGNED_XML_PROMOTION_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-xml-promotion-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact promotion readiness blockers for dummy/test material, missing real certificate/CSID, missing production key custody, missing persistence workflow, missing clearance/reporting, and missing PDF/A-3.
- Updated invoice/settings UI readiness to show that local signed XML validation success is not persisted signed invoice state and cannot be promoted from SDK dummy material.
- No signed XML, QR payload, private key, certificate body, CSID token, OTP, generated CSR body, production credential, ZATCA network call, CSID request, clearance/reporting, PDF/A-3, or production compliance claim is introduced.

## ZATCA signed artifact storage planning update (2026-05-16)

- Added metadata-only signed artifact storage planning in `docs/zatca/SIGNED_ARTIFACT_STORAGE_PLAN.md`.
- Added `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan` as a local-only, dry-run, no-mutation endpoint.
- Added signed artifact storage readiness blockers for missing metadata model, object-storage retention, immutable archive, intentionally blocked signed XML body persistence, intentionally blocked QR payload persistence, and missing clearance/reporting linkage.
- Chose no Prisma schema in this phase because no signed artifact state should be persisted until object-storage retention, immutable archive, audit, and redaction rules are approved.
- No signed XML body, QR payload body, SDK execution, CSID request, ZATCA network call, clearance/reporting, PDF/A-3, production credential, or production compliance claim is introduced.

## 2026-05-17 - ZATCA signed artifact metadata-only draft records

Official sources inspected for this phase:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

Findings applied:
- Future clearance/reporting payloads use `uuid`, `invoiceHash`, and a base64 invoice payload, so signed artifact planning keeps invoice metadata visible but does not create submission payloads.
- Official samples and Schematron confirm signed XML, QR, cryptographic stamp, ICV, and PIH are linked artifacts; local validation success is not enough to promote or store production artifacts.
- The new `ZatcaSignedArtifactDraft` table stores planning metadata only: status, source, hashes/sizes placeholders, sanitized validation summary fields, dummy-material flag, promotion blocker reason, and creator audit metadata.
- `signedXmlStorageKey` and `qrPayloadStorageKey` remain null in this task. No signed XML body or QR payload body columns were added.
- New endpoints are local-only: `POST /sales-invoices/:id/zatca/signed-artifact-drafts`, `GET /sales-invoices/:id/zatca/signed-artifact-drafts`, and the expanded `GET /sales-invoices/:id/zatca/signed-artifact-storage-plan`.
- Object-storage capability checks report provider/bucket configuration, unknown write capability, retention/immutability not implemented, tenant-scoped key-prefix planning, and body persistence blocked.
- Production compliance remains false. There are still no CSID requests, no ZATCA network calls, no clearance/reporting, no PDF/A-3, no production credentials, and no signed XML/QR body persistence.

Recommended next step:
- Add a future object-storage probe design that checks write/read/delete capability in an isolated test prefix without storing signed XML bodies, then define retention/immutability controls before any artifact-body persistence.

## 2026-05-17 - ZATCA signed artifact object-storage probe

Official sources inspected for this phase:
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf

Storage implementation inspected:
- apps/api/src/storage/storage-configuration.service.ts
- apps/api/src/storage/storage-provider.ts
- apps/api/src/storage/storage.controller.ts
- apps/api/src/storage/storage.module.ts
- apps/api/src/attachments/attachment-storage.service.ts
- apps/api/src/attachments/attachment.module.ts
- apps/api/src/storage/storage.service.spec.ts
- apps/api/src/storage/storage.controller.spec.ts

Implemented behavior:
- Added `GET /zatca/signed-artifact-storage/probe-plan` for a read-only local probe plan. It returns object-storage configuration status, test prefix, planned test object key, and explicit blockers without uploading any object.
- Added `POST /zatca/signed-artifact-storage/probe` behind `ZATCA_SIGNED_ARTIFACT_STORAGE_PROBE_ENABLED=false` by default. When disabled, it skips execution and writes/deletes nothing.
- When explicitly enabled in a local/test environment, the probe writes only this harmless text payload under `zatca/signed-artifacts/probe/<organizationId>/<timestamp>-probe.txt`: `LedgerByte ZATCA signed artifact storage probe only. No invoice data.`
- The enabled probe reads the harmless object back when supported, deletes it afterward, reports cleanup, and still keeps signed artifact body storage blocked.
- The probe does not upload signed XML, QR payload, invoice data, private keys, certificates, CSID tokens, OTPs, production credentials, or ZATCA submission payloads.
- The invoice signed artifact storage plan now reports `storageProbeRequired=true`, `latestStorageProbeStatus=NOT_RUN`, and includes the probe plan while body persistence remains blocked.
- The invoice ZATCA panel shows object-storage status and that the probe is disabled by default unless the env flag is enabled.

Safety boundary:
- No signed XML body persistence.
- No QR payload body persistence.
- No CSID requests.
- No ZATCA network calls.
- No clearance/reporting.
- No PDF/A-3.
- No production credentials.
- No production compliance claim.

Recommended next step:
- Add a future signed artifact retention and immutability design review before any endpoint can persist signed XML or QR payload bodies.

## 2026-05-17 - ZATCA signed artifact immutable storage policy planning

- Official sources inspected: SDK Readme/readme.md, SDK Configuration/usage.txt, official simplified and standard signed invoice samples, official Schematron rules, the XML and security implementation PDFs, EInvoice_Data_Dictionary.xlsx, compliance_invoice.pdf, reporting.pdf, and clearance.pdf under `reference/`.
- Added metadata-only immutable storage policy planning in `docs/zatca/SIGNED_ARTIFACT_IMMUTABLE_STORAGE_POLICY.md`.
- Added `GET /zatca/signed-artifact-storage/immutable-policy-plan` as a read-only, local-only, no-mutation endpoint. It returns `policyApproved=false`, `retentionDurationApproved=false`, `objectVersioningRequired=true`, `immutableArchiveRequired=true`, and `productionCompliance=false`.
- Updated signed artifact storage and probe plans with immutable policy status, retention review status, and the next step to approve immutable storage policy before signed artifact body persistence.
- Readiness now includes blockers for unapproved immutable policy, unapproved legal/accounting retention duration, unconfirmed object versioning, missing deletion/voiding policy, missing supersession policy, missing archive restore test, missing access-control review, and missing encryption-at-rest review.
- No retention duration is guessed. Retention duration remains legal/accounting review required.
- No signed XML body, QR payload body, invoice data, private key, certificate body, CSID token, OTP, production credential, ZATCA network call, clearance/reporting, PDF/A-3, or production compliance claim is introduced.
- Recommended next step: run a legal/accounting retention review and object-storage immutability review before designing any signed XML/QR body persistence endpoint.

## ZATCA immutable policy approval risk tracking

No signed XML or QR payload body persistence was introduced. The approval workflow is intentionally metadata-only and keeps `productionCompliance=false`. Retention duration remains a legal/accounting review item and must not be guessed.

Open risks remain: future object-storage immutability, retention enforcement, restore testing, real CSID/certificate custody, clearance/reporting, and production compliance review.

## ZATCA storage control evidence records update (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, SDK `Configuration/usage.txt`, SDK simplified and standard invoice samples, SDK Schematron validation rules, ZATCA Security Features PDF, ZATCA XML Implementation PDF, `EInvoice_Data_Dictionary.xlsx`, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf`.
- Added metadata-only technical control evidence planning for future signed artifact storage. Evidence covers object versioning, immutable retention/legal-hold equivalent, encryption at rest, access control, backup/restore, restore testing, tenant key scoping, deletion/supersession, storage probe, and other reviewed evidence.
- Evidence records intentionally do not store signed XML bodies, QR payload bodies, private keys, certificate bodies, CSID tokens, OTPs, CSR bodies, object-storage access keys, production credentials, or production compliance state.
- Retention duration remains legal/accounting review required. No retention duration is guessed from the official references.
- Immutable policy, storage-plan, and probe-plan responses now surface evidence-required status, verified evidence types, missing evidence types, and technical-control readiness while keeping body persistence blocked.
- Endpoints added: `GET /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence`, `POST /zatca/signed-artifact-storage/control-evidence/:id/verify`, and `POST /zatca/signed-artifact-storage/control-evidence/:id/revoke`.
- Recommended next step: collect real legal/accounting retention approval and real provider technical evidence, then design a separate body-storage approval gate before any signed XML or QR payload persistence.

## ZATCA evidence completeness reporting (2026-05-17)

- Official files inspected for this phase: SDK `Readme/readme.md`, `Configuration/usage.txt`, simplified and standard invoice samples, the SDK Schematron rules, XML/security implementation PDFs, data dictionary, `compliance_invoice.pdf`, `reporting.pdf`, and `clearance.pdf` under `reference/`.
- Required technical evidence before future signed artifact body persistence can even be reviewed: OBJECT_VERSIONING, IMMUTABLE_RETENTION, ENCRYPTION_AT_REST, ACCESS_CONTROL, BACKUP_RESTORE, RESTORE_TEST, TENANT_KEY_SCOPING, DELETION_SUPERSESSION, and STORAGE_PROBE.
- Completeness rule: only the latest VERIFIED evidence record for each required type counts. DRAFT, REVOKED, SUPERSEDED, and OTHER evidence do not satisfy a required control.
- Added read-only organization reporting at `GET /zatca/signed-artifact-storage/evidence-completeness`; it returns required, verified, missing, draft, revoked, latest-by-type, and BLOCKED or COMPLETE_FOR_REVIEW status.
- Body persistence remains blocked even when all evidence is COMPLETE_FOR_REVIEW. A separate legal/accounting retention approval and explicit body-storage phase are still required.
- The explicit body-persistence gate always returns allowed=false in this phase because evidence, immutable policy, retention approval, production certificate/CSID/key custody, clearance/reporting, PDF/A-3, and body persistence implementation are not complete.
- No signed XML body, QR payload body, private key, certificate body, CSID token, OTP, CSR body, production credential, ZATCA network call, clearance/reporting call, PDF/A-3 output, or production compliance claim is introduced.
- Retention duration is still not guessed; legal/accounting review is required.
- Recommended next step: verify all required technical evidence records, then design a separate explicit body-storage approval gate before any signed XML/QR payload persistence work.

## ZATCA sandbox compliance CSID onboarding planner (2026-05-17)

Official references inspected for this phase: SDK readme/usage, CSR config template/examples, `compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, XML/security PDFs, and the data dictionary under `reference/`.

LedgerByte now exposes a sanitized sandbox compliance CSID request plan for non-production EGS units. The plan reports CSR/review status, OTP requirement, redacted planned headers/body fields, disabled execution status, blockers, warnings, and next steps. It does not request CSIDs, call ZATCA, submit invoices, persist signed XML/QR bodies, implement clearance/reporting, implement PDF/A-3, use production credentials, or claim production compliance.

`ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED` defaults to false. The current dry-run remains skipped/planned only; even with the flag enabled, HTTP execution is blocked until a later sandbox adapter and token/certificate custody phase. OTP, private key PEM, CSR body, certificate body, binary security token, secret, production credentials, signed XML body, and QR payload body are never returned.

Recommended next step: design the sandbox-only HTTP adapter and one-time OTP DTO/custody path with mocked responses before any real sandbox CSID request is allowed.
## 2026-05-18 - Sandbox compliance CSID mock adapter contract

Official local sources inspected for this step:
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties`
- `reference/zatca-docs/compliance_csid.pdf`
- `reference/zatca-docs/onboarding.pdf`
- `reference/zatca-docs/renewal.pdf`
- `reference/zatca-docs/compliance_invoice.pdf`
- `reference/zatca-docs/reporting.pdf`
- `reference/zatca-docs/clearance.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`

Implementation notes:
- Compliance CSID onboarding remains sandbox/simulation planning only. Production CSID onboarding remains blocked.
- `POST /zatca/egs-units/:id/compliance-csid-request-dry-run` still skips execution when `ZATCA_SANDBOX_COMPLIANCE_CSID_REQUEST_ENABLED=false`.
- When the gate is explicitly enabled and `mode=mock`, only the local mock adapter contract can run. It never calls ZATCA and never requests a real CSID.
- The OTP dry-run DTO trims input, requires a conservative 6-digit numeric value for mock mode, rejects blank/unsafe values, and never stores or returns the OTP. The local official references confirm OTP is required for the compliance CSID request, but they do not expand a broader format rule in the inspected text.
- Public responses expose only booleans for binary security token, secret, and certificate presence. They do not return private key PEM, CSR body, OTP, certificate body, binarySecurityToken, secret, signed XML body, QR payload body, or production credentials.
- Mock adapter failures are sanitized before returning to callers.
- No signed XML body persistence, QR payload persistence, clearance/reporting, PDF/A-3, production credentials, production CSID, or production compliance claim is introduced.

Recommended next step:
- Design a separate real sandbox HTTP adapter plan with explicit OTP custody, redacted token/certificate storage, idempotency, audit logging, and a manual enablement review before any real sandbox request is attempted.
## 2026-05-18 - ZATCA compliance CSID request mapper

- Official files inspected: `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, the XML/security PDFs, `EInvoice_Data_Dictionary.xlsx`, SDK `Readme/readme.md`, `Configuration/usage.txt`, and SDK CSR templates/examples.
- Added a non-executing request mapper for the official sandbox compliance CSID contract: `POST /compliance`, `OTP` header, `Accept-Version: V2`, JSON `csr` body, and redacted public summaries only.
- Added a response mapper for official-like `requestID`, `binarySecurityToken`, `secret`, and certificate presence. Public responses expose only IDs and booleans; token, secret, certificate body, OTP, and CSR body remain redacted.
- Added recorded-contract tests for request mapping, response mapping, malformed/error response sanitization, production blocking, plan/mock/real dry-run modes, and no adapter/network mutation in real mode.
- The real sandbox HTTP adapter remains a stub for compliance CSID: it builds the redacted request contract and throws before any HTTP call. `mode=real` returns `BLOCKED_REAL_HTTP_NOT_IMPLEMENTED`.
- `corepack pnpm zatca:compliance-csid-plan` and `corepack pnpm zatca:compliance-csid-dry-run` now accept `--mode plan|mock|real`; real mode prints a blocker and never calls ZATCA.
- No real compliance CSID request, production CSID request, clearance/reporting, PDF/A-3, signed XML body storage, QR payload body storage, production credentials, or production compliance claim is implemented.
- Recommended next step: add a secrets-custody and sandbox execution design for real response material before any real sandbox HTTP request is considered.

## 2026-05-18 - ZATCA CSID response custody planning

- Inspected official ZATCA compliance CSID, onboarding, renewal, compliance invoice, reporting, clearance, XML/security, data dictionary, and SDK reference files before changing code.
- Added metadata-only CSID response custody planning for `binarySecurityToken`, `secret`, and certificate material. The plan keeps token, secret, certificate body, private key, OTP, CSR body, signed XML body, and QR payload body out of public API/UI responses.
- Added `GET /zatca/egs-units/:id/compliance-csid-custody-plan`, extended readiness with `COMPLIANCE_CSID_CUSTODY`, and added dry-run custody booleans (`tokenWouldRequireCustody`, `secretWouldRequireCustody`, `certificateWouldRequireCustody`, persisted=false flags).
- Schema decision: no Prisma schema was added because this phase does not request or persist a real sandbox CSID response. Custody storage remains a future approval phase.
- No real ZATCA network call, real CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, signed XML body persistence, QR payload persistence, or production compliance claim was introduced.
- Recommended next step: design a metadata-only custody record and secrets-manager/KMS integration gate before any real sandbox response persistence.

### ZATCA CSID custody records and secrets/KMS gate - 2026-05-18

Official files inspected for this phase:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

LedgerByte now has metadata-only `ZatcaComplianceCsidCustodyRecord` records for future sandbox compliance CSID custody planning. The record stores safe metadata such as request ids, certificate request ids, boolean presence flags, storage mode placeholders, expiry/renewal metadata, status, and audit user ids. It does not store `binarySecurityToken` bodies, secret bodies, certificate bodies, private keys, OTPs, CSR bodies, signed XML bodies, QR payload bodies, or production credentials.

New safe API behavior:
- `POST /zatca/egs-units/:id/compliance-csid-custody-records` creates metadata-only records for non-production EGS units.
- `GET /zatca/egs-units/:id/compliance-csid-custody-records` lists safe metadata only.
- `POST /zatca/compliance-csid-custody-records/:id/revoke` revokes metadata only.
- `GET /zatca/egs-units/:id/compliance-csid-custody-plan` now reports the latest custody record, record count, and a secrets-manager/KMS custody gate.

The custody gate remains blocked in this phase: `allowed=false`, token storage ready is false, secret storage ready is false, certificate storage ready is false, KMS configured is false, secrets-manager configured is false, encrypted DB approval is false, and `productionCompliance=false`. Metadata records do not enable CSID persistence, signed XML persistence, QR payload persistence, real ZATCA network calls, production CSID requests, clearance/reporting, PDF/A-3, production credentials, or any production compliance claim.

Recommended next step: design and approve the real secrets-manager/KMS custody implementation for sandbox compliance CSID response material before enabling any real sandbox response persistence. Production CSID, clearance/reporting, PDF/A-3, signed artifact body persistence, and production compliance remain separate blocked phases.

### ZATCA CSID secrets custody provider boundary - 2026-05-18

Official files inspected for this phase:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

LedgerByte now has a `ComplianceCsidSecretCustodyProvider` boundary and a disabled implementation for future sandbox compliance CSID token, secret, and certificate custody. The provider readiness endpoint reports `provider=DISABLED`, `enabled=false`, token/secret/certificate storage not ready, KMS/secrets-manager not configured, encrypted DB not approved, and `productionCompliance=false`.

The disabled provider store/revoke methods throw sanitized errors and do not leak token, secret, certificate, private key, OTP, CSR, signed XML, QR payload, provider credentials, or production credential input. Custody plans and dry-runs now include provider readiness and keep `custodyGate.allowed=false`.

No real ZATCA network call, real CSID request, production CSID request, token body persistence, secret body persistence, certificate body persistence, private key persistence, OTP/CSR body persistence, signed XML/QR body persistence, clearance/reporting, PDF/A-3, production credentials, or production compliance claim is enabled.

Recommended next step: design and approve a concrete secrets-manager/KMS provider configuration and redacted reference model before any future sandbox CSID response body persistence.

## ZATCA CSID secrets provider configuration plan - 2026-05-18

Official files inspected for this phase: `compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `compliance_invoice.pdf`, `reporting.pdf`, `clearance.pdf`, the XML/security standards, the data dictionary, and the SDK readme/usage files under `reference/`.

LedgerByte now has a non-executing CSID custody provider configuration planner. It reads only planning environment variables for future `FUTURE_SECRETS_MANAGER`, `FUTURE_KMS`, and `FUTURE_ENCRYPTED_DB` modes, redacts key IDs/prefixes/regions, and keeps the runtime provider disabled.

The provider configuration endpoint and custody plan report `providerEnabled=false`, `bodyStorageAllowed=false`, `tokenStorageReady=false`, `secretStorageReady=false`, `certificateStorageReady=false`, and `productionCompliance=false`. `ZATCA_CSID_CUSTODY_ALLOW_BODY_STORAGE` is intentionally ignored in this phase.

No real secrets-manager/KMS call, real ZATCA network call, real CSID request, token/secret/certificate/private-key/OTP/CSR/signed-XML/QR body persistence, clearance/reporting, PDF/A-3, production credential use, or production compliance claim is implemented.

Recommended next step: add mocked secrets-manager/KMS provider client contract tests that still never store real CSID material.

## ZATCA CSID mocked custody provider contracts update (2026-05-18)

Official files inspected for this update:
- reference/zatca-docs/compliance_csid.pdf
- reference/zatca-docs/onboarding.pdf
- reference/zatca-docs/renewal.pdf
- reference/zatca-docs/compliance_invoice.pdf
- reference/zatca-docs/reporting.pdf
- reference/zatca-docs/clearance.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf
- reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf
- reference/zatca-docs/EInvoice_Data_Dictionary.xlsx
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md
- reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt

Implemented scope:
- Added local TypeScript-only mocked secrets-manager and KMS client contracts for future compliance CSID custody tests.
- Added mocked provider skeletons that accept fake injected clients, return redacted references only, and report productionCompliance=false.
- Added redacted reference handling that never exposes full ARNs, URLs, UUIDs, secret paths, KMS key IDs, provider credentials, token bodies, secret bodies, or certificate bodies.
- Kept the runtime factory/default provider disabled; providerEnabled=false, bodyStorageAllowed=false, and realProviderImplementationReady=false.
- Updated provider readiness, provider configuration plan, smoke output, and ZATCA settings UI to show mocked provider contract availability without enabling real storage.

Safety guarantees:
- No real secrets-manager, KMS, cloud provider, database secret storage, or ZATCA network call is performed.
- No real CSID request, production CSID request, clearance/reporting, PDF/A-3, production credentials, signed XML body storage, or QR payload body storage is implemented.
- binarySecurityToken, secret, certificate body, private key, OTP, CSR body, signed XML, and QR payload bodies remain blocked from API/UI responses and persistence.
- productionCompliance remains false.

Recommended next step:
- Add a non-executing provider-reference audit and rotation plan before any real sandbox custody provider implementation.

# Sellable-v1 bug audit update - 2026-05-18

- Added regression coverage for the dashboard onboarding checklist and smoke assertions that it remains read-only, no-mutation, tenant-scoped, and ZATCA-safe.
- Added frontend regression coverage for the `/setup` wizard rendering checklist steps, progress, next incomplete step, blockers/warnings, safe failed-load fallback, dashboard link, and ZATCA non-production messaging.
- No regression was found or intentionally changed in contact VAT/ID validation.
- No regression was found or intentionally changed in dashboard summary concurrency hardening.
- Open risk: production deployment still needs real SMTP relay/domain-auth validation, storage, backup/restore, and browser E2E validation before paid customer use.

# Backup/restore verification update - 2026-05-19

- Executed a local non-production Docker Postgres restore drill using seeded local/demo data only. The check verified counts only and did not inspect or export customer document payloads, attachment payloads, signed XML bodies, QR payloads, database URLs, service role keys, storage credentials, SMTP secrets, API keys, auth headers, private keys, or provider secrets.
- Verified matching counts for 76 tables, 55 migrations, 11 organizations, 77 users, 186 attachments, 820 generated documents, and 3121 journal entries.
- Created verified metadata-only `BackupRestoreEvidence` for `DATABASE_BACKUP`, `MIGRATION_HISTORY`, `RESTORE_DRILL`, `RESTORE_VERIFICATION`, `GENERATED_DOCUMENT_BACKUP`, and `ATTACHMENT_BACKUP`.
- Created draft blocked `OBJECT_STORAGE_BACKUP` evidence because no S3-compatible object-storage backup/provider export was configured locally.
- `GET /system/backup-readiness` remains `productionReady=false`; missing evidence is still `POINT_IN_TIME_RECOVERY`, `OBJECT_STORAGE_BACKUP`, and `RPO_RTO_REVIEW`.
- No bug was found or intentionally changed in ZATCA execution/network behavior, contact VAT/ID validation, dashboard summary concurrency hardening, or email retry/webhook/suppression behavior.
- Recommended next step: verify hosted Supabase backup/PITR and S3-compatible object-storage backup/restore in a real non-production project, then capture sanitized evidence without exposing secrets or customer content.

# Document/PDF UX polish update - 2026-05-21

- Polished visible document/PDF guidance across source record detail pages, customer statement, supplier statement, generated archive, document settings, and number sequence settings.
- Added shared UI copy that explains generated PDFs are archived, archived downloads do not post accounting entries or send data externally, and document settings affect future PDFs only.
- Updated document action labels to be specific to invoice, receipt, purchase bill, debit note, credit note, and archived PDF downloads.
- Added archive/settings/numbering links near document actions and richer archive empty states without changing APIs or accounting behavior.
- Supplier statement PDF export/archive parity is now available from the supplier statement route using existing supplier statement rows and the `SUPPLIER_STATEMENT` generated-document type.
- No PDF totals, VAT/tax calculation, journal posting, accounting behavior, ZATCA signing/submission, PDF/A-3, CSID, clearance/reporting, migration, seed/reset/delete, full smoke, or full E2E changed.

# Document download beta QA follow-up - 2026-05-21

- Restored the local DPAPI-backed beta credential store and ran authenticated API-level document download/archive QA against deployed commit `ff01b2b` without printing passwords, tokens, auth headers, request/response bodies, PDF bodies, document numbers, or customer/vendor names.
- Verified HTTP `200`, `application/pdf`, safe attachment filename presence, `.pdf` filename extension, nonzero byte length, and `%PDF` magic bytes for sales invoice PDFs, customer payment receipt PDFs, credit note PDFs, purchase bill PDFs, supplier payment receipt PDFs, purchase debit note PDFs, customer statement PDFs, supplier statement PDFs, and archived generated-document downloads.
- Archive rows were created for invoice, customer payment receipt, credit note, purchase bill, supplier payment receipt, purchase debit note, and customer statement downloads.
- A follow-up non-destructive enum migration adds `SUPPLIER_STATEMENT`, so supplier statement PDF downloads can now create generated-document archive rows without changing supplier ledger/AP math.
- User-testing deployment `da45544` applied the enum migration and targeted supplier statement archive QA passed: the supplier statement PDF response was `200` `application/pdf`, exactly one `SUPPLIER_STATEMENT` archive row was created, and the archived PDF download also returned `200` `application/pdf`.
- Authenticated browser UI width checks remain pending because the deployed browser session was unauthenticated, login automation could not safely fill the email/password controls, and JavaScript URL token injection was rejected by browser security policy.

# Statement PDF readability follow-up - 2026-05-21

- Polished customer and supplier statement PDF presentation labels, balance headings, activity headings, empty-state wording, and generated-from-ledger explanatory copy.
- Polished customer/supplier contact statement UI copy and download labels so AR statements explain customer balances and AP statements explain supplier payables.
- Regression coverage now checks customer-specific and supplier-specific statement presentation labels plus archive-safe contact statement guidance.
- No customer/supplier ledger math, AP/AR balance math, PDF totals, generated-document archive behavior, migrations, ZATCA behavior, full smoke, or full E2E changed.
- Remaining risk: accountant review is still recommended for final statement wording and presentation before production use.

# Accountant review packet - 2026-05-22

- Added a dedicated accountant review packet under `docs/accountant-review/` to prepare qualified review of LedgerByte document output, statement readability, report labels, inventory report wording, and bank reconciliation screens.
- Added a checklist and findings template so reviewer issues can be classified by severity, release impact, screenshot/file reference, recommended wording/layout, and accounting correctness concern.
- Added a text-only sample-output index that references safe visual snapshots, local PDF renderer tests, UI routes, and authenticated endpoint patterns without committing binary PDFs or real beta/customer data.
- No accounting calculation, ledger math, report math, PDF totals, posting behavior, generated-document archive logic, ZATCA behavior, schema, migration, seed/reset/delete, email, backup, restore, full smoke, or full E2E was changed.
- Remaining risk: accountant review is still pending; this packet must not be represented as accountant approval or compliance certification.

# Beta testing feedback kit - 2026-05-22

- Added a dedicated beta testing kit under `docs/beta-testing/` with a tester guide, step-by-step workflow script, feedback form template, and triage guide for selected user-testing participants.
- The script covers setup, dashboard, customer/invoice/payment, customer ledger and AR report, supplier/bill/payment/debit-note, supplier ledger and AP report, manual bank statement import preview, reconciliation/matching review, inventory review, document PDF/archive behavior, and reports/dashboard review.
- Added GitHub issue templates for beta bug reports, accounting review findings, and UX feedback, each with explicit safety checks to avoid secrets, auth material, real customer-sensitive data, production document data, PDF/document bodies, signed XML, QR payloads, and attachment bodies.
- The kit clearly states that Vercel is beta/user-testing only, no real ZATCA submission/CSID/clearance/reporting/PDF/A-3/production certification is enabled, no real customer email sending is enabled by default, and live bank integration is not implemented.
- No accounting calculation, ledger math, report math, PDF totals, posting behavior, ZATCA behavior, schema, migration, seed/reset/delete, Supabase RLS, runtime DB role, Vercel environment, email sending, backup, restore, full smoke, or full E2E was changed.

# Beta access dry run - 2026-05-22

- Ran a deployed user-testing API-level beta access dry run using the local DPAPI-backed credential store without printing passwords, tokens, auth headers, request/response bodies, invite tokens, customer/vendor data, or document bodies.
- Confirmed email provider readiness before inviting: provider `mock`, mock mode true, and real sending disabled.
- Invited a safe dummy `.example.test` tester with `Viewer`; the invite created a mock outbox record with status `SENT_MOCK`, so no real external email was sent.
- Verified role management and revocation: changed role to `Sales`, changed it back to `Viewer`, suspended access, reactivated it, then suspended again. Final dummy member state was `SUSPENDED` with role `Viewer`.
- No `Owner` or `Admin` role was assigned to the dummy tester.
- No app bug was found requiring a UI/auth/permission fix. No auth architecture, permission logic, accounting behavior, ZATCA behavior, Supabase RLS, runtime DB role, Vercel env, migration, seed/reset/delete, full smoke, or full E2E action changed.

# DEV-08H AP output/archive/email closure - 2026-05-28

- Local-only AP output evidence created and verified fake purchase order, purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense generated-document archive rows without using production, beta, shared, or customer data.
- Archived download integrity passed for the six initially generated AP output rows by matching returned buffer hashes/sizes to stored generated-document metadata without printing PDF bodies or base64.
- Open product decision: repeated purchase-order PDF generation currently creates a second generated-document archive row for the same source. Decide whether future behavior should remain versioned duplicates, reuse existing rows, or supersede older rows.
- Historical blocker at DEV-08H close: no AP document email action or generated-document attachment-capable outbox path existed then. DEV-08K later resolved the local mock/no-send AP outbox path; real provider delivery still requires a separate approved branch.
- Remaining QA gap: authenticated API/UI permission behavior for AP output and generated-document downloads still needs a separate approved local login/audit-writing preflight.
- No real email provider send, ZATCA network/signing/clearance/reporting/PDF-A3, secrets, env changes, migrations, seed/reset/delete, deployment, full smoke, full E2E, or production/beta/customer-data behavior changed.

# DEV-08J AP repeated idempotency/blocker closure - 2026-05-28

- Local-only DEV-08J evidence created marker-scoped AP fixtures, verified repeated/idempotency behavior, and checked expected blocker paths for purchase orders, purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, and purchase receipts.
- Repeated AP output generation for purchase bill, supplier payment receipt, supplier refund, purchase debit note, and cash expense created additional archive rows. Duplicate output behavior remains an open product decision: preserve versioned duplicates, reuse existing rows, or supersede older rows.
- Source PDF output was hardened: AP source PDF stream/generate routes now require the source view permission plus `generatedDocuments.download`, and AP detail source PDF buttons are hidden without archive-download permission. Source `pdf-data` remains source-view read-only.
- Historical blocker at DEV-08J close: AP generated-document email still needed a safe outbox path. DEV-08K later implemented and verified the local mock/no-send AP outbox path; real provider delivery still requires a separate approved branch.
- Full web test/typecheck remained blocked by unrelated untracked marketing/nav/permission-matrix work; targeted AP tests and API typecheck passed.
- No production, beta, hosted/shared target, customer data, real email provider send, real ZATCA network/signing/clearance/reporting/PDF-A3, secrets, env changes, migrations, seed/reset/delete, deployment, full smoke, or full E2E changed.

# DEV-08K AP generated-document email closure - 2026-05-29

- Local-only DEV-08K evidence implemented and verified a dedicated AP generated-document email outbox path with metadata-only attachment fields, `AP_GENERATED_DOCUMENT` template type, `SENT_MOCK` status, and `mock-no-send` provider behavior.
- The previous blocker that no AP-specific outbox attachment path existed is resolved for local mock/no-send evidence only. Real provider delivery, retry scheduling, webhook handling, domain validation, and production email readiness remain blocked for later explicit approval.
- Authenticated local UI QA created exactly one synthetic-recipient AP generated-document email row from `/documents`; final counts were email outbox rows `229`, AP generated-document email rows `2`, selected generated-document email rows `2`, provider events `0`, generated documents `870`.
- Permission negative checks verified missing generated-document download, email outbox view, or AP source view permission does not create AP email rows.
- No email body, PDF body, attachment body, base64, provider payload, source contact email, customer/vendor data, password, token, cookie, auth header, request/response body, signed XML, QR payload, private key, CSID, production, beta, hosted/shared target, real provider send, real ZATCA, env/provider changes, seed/reset/delete, deployment, full smoke, or full E2E changed.
- Remaining AP gaps move to fiscal-period and broader permission edge preflight, cleanup policy, duplicate-output product policy, and real provider email delivery policy.

# DEV-08L AP fiscal-period and permission edge closure - 2026-05-29

- Local-only DEV-08L evidence created marker-scoped AP fiscal-period and permission fixtures under `DEV08L-AP-20260529T000000`, with a dedicated local organization and no production, beta, hosted/shared, or customer data.
- Fiscal blocker checks proved selected purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, and purchase receipt asset posting/reversal paths fail with `Posting date falls in a closed fiscal period.` before later state, journal, audit, output, email, or ZATCA writes.
- Permission edge checks proved twenty restricted AP guard/helper denials, including generated-document download and AP email outbox permission edges, and confirmed `admin.fullAccess` remains an allowed control.
- Final DEV-08L side-effect counts stayed at audit logs `0`, auth tokens `0`, email outbox `0`, generated documents `0`, provider events `0`, ZATCA invoice metadata `0`, and ZATCA submission logs `0`.
- Non-fiscal AP operational paths remain documented rather than mutated: supplier payment unapplied apply/reverse, purchase debit note apply/reverse allocation, purchase receipt create/void, and purchase orders.
- Remaining AP gaps move to cleanup/retention/delete policy, duplicate generated-document product policy, real provider email delivery/retry/webhook policy, production/beta/customer-data behavior, broad E2E/smoke, and advanced purchase/inventory/accounting policy.

# DEV-08M AP cleanup retention closure - 2026-05-30

- Local-only DEV-08M evidence closed AP cleanup/retention policy without deleting, updating, archiving, revoking, or purging any data.
- The canonical count-only inventory found DEV-08 through DEV-08L markers `12`, AP source documents `64`, source lines `25`, journals/journal lines `67`, allocations/reversals `2`, receipts/stock movements `9`, generated documents `24`, email outbox rows `4`, provider events `0`, audit logs `110`, ZATCA marker hits `0`, and users/roles/memberships marker hits `6`.
- Retention policy is preserve-by-default for AP source fixtures, journals, allocations, receipts, stock movements, generated documents, email evidence, audit/auth evidence, users/roles/memberships, and ZATCA metadata/logs. Destructive cleanup needs a separate future policy and approval.
- Duplicate generated-document output policy is append-only versioned archive behavior for paid v1; reuse/supersede/latest-version UX is deferred until legal/audit retention, email references, and document-list behavior are designed together.
- Added and verified `apps/api/scripts/dev08m-ap-cleanup-planner.ts` as a local dry-run-only, count-only planner with exact marker validation, explicit local DB target requirement, generic `DATABASE_URL` avoidance, hosted/destructive refusal checks, and no execute/delete package helper.
- Remaining AP gaps move to DEV-08Z final evidence map and production-gap handoff, real provider email delivery/retry/webhook policy, production/beta/customer-data behavior, broad E2E/smoke, and advanced purchase/inventory/accounting policy.

# DEV-08Z AP readiness scorecard update - 2026-05-30

- DEV-08Z consolidated DEV-08 through DEV-08M as closed local-only AP evidence in `docs/development/DEV_08Z_AP_LOCAL_EVIDENCE_MAP.md`.
- The AP production-gap register is recorded in `docs/development/DEV_08Z_AP_PRODUCTION_GAP_REGISTER.md`.
- Readiness docs now state that AP local evidence is strong for the DEV-08 scope but not production-complete.
- Remaining AP production gaps include linked PO-to-bill receipt reconciliation, valuation variance booking, landed cost, purchase returns, serial/batch/bin/location behavior, real provider AP email delivery/retry/webhook/domain policy, duplicate-output UX/product policy, cleanup execution policy, broad AP E2E/smoke/full-test coverage, production/beta/customer-data behavior, and real ZATCA behavior if AP documents ever intersect ZATCA.
- No app code, runtime mutation, tests beyond diff checks, deploy, production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, or environment/provider setting changed.

# DEV-09 banking/reconciliation local evidence closure - 2026-05-30

- DEV-09 consolidated local-only banking/reconciliation evidence in `docs/development/DEV_09_BANKING_RECONCILIATION_CLOSURE.md`.
- The local evidence covers marker-scoped synthetic bank fixtures, parser/preview checks for CSV/JSON/OFX/CAMT/MT940 shapes, match/categorize/ignore actions, and reconciliation `DRAFT -> PENDING_APPROVAL -> APPROVED -> CLOSED -> VOIDED`.
- Final marker verification counted statement imports `1`, statement transactions `3`, reconciliations `1`, review events `4`, reconciliation items `3`, audit logs `8`, journal entries `2`, and journal lines `4`.
- Readiness docs now state that banking/reconciliation local evidence is useful for the DEV-09 scope but not production-complete.
- Remaining banking production gaps include live bank feeds/external bank APIs, automatic matching, certified target-bank parser coverage, raw statement archive operations, strict approval queue policy, transfer fees, FX handling, broad E2E/smoke/full-test coverage, production/beta/customer-data behavior, and accountant review.
- No app code, runtime mutation in the closure step, deploy, production/beta/customer data, real bank file, real email, real ZATCA, migration, seed/reset/delete, backup/restore, full smoke, full E2E, or environment/provider setting changed.

# DEV-10 reports/financial statements local evidence closure - 2026-05-30

- DEV-10 consolidated local-only reports and financial statements evidence in `docs/development/DEV_10_REPORTS_FINANCIAL_STATEMENTS_CLOSURE.md`.
- The local evidence covers marker-scoped synthetic report fixtures, core report JSON checks, aging and VAT Return JSON checks, Trial Balance CSV/PDF/archive/download metadata, no-body output handling, and selected permission gates.
- Final output-gate evidence recorded CSV archive delta `0`, PDF/archive delta `+1`, download delta `0`, generated-document type `REPORT_TRIAL_BALANCE`, hash-matched download metadata, and restricted `reports.view`-only CSV/PDF forbidden.
- Readiness docs now state that reports local evidence is useful for the DEV-10 scope but not production-complete.
- Remaining reporting production gaps include accountant-reviewed report definitions/layouts, official VAT filing scope, scheduled/email delivery, report packs, advanced branch/multi-period/consolidation behavior, inventory valuation/FIFO/landed-cost reporting, generated-document object-storage retention, restricted-role matrix coverage, broad E2E/smoke/full-test coverage, production/beta/customer-data behavior, and load/concurrency.
- No app code, runtime mutation in the closure step, new report query, new CSV/PDF/archive/download generation, deploy, production/beta/customer data, real email, real ZATCA, migration, seed/reset/delete, backup/restore, full smoke, full E2E, or environment/provider setting changed.

# DEV-12 generated documents storage retention closure - 2026-05-30

- DEV-12 consolidated local-only generated documents storage retention evidence in `docs/development/DEV_12_GENERATED_DOCUMENTS_STORAGE_RETENTION_CLOSURE.md`.
- The local evidence covers marker `DEV12-DOC-20260530T000000`, one synthetic DB-backed generated document, safe metadata list/detail/filter checks, one approved local download metadata/hash check, storage readiness and migration dry-run counts, and retention/legal-hold cleanup policy preflight.
- Final marker evidence recorded one generated document, one generated-document audit-log row, storage provider `database`, storage key `null`, size `129`, matching SHA-256 metadata, attachment count `0`, backup/restore evidence count `0`, and no migration/upload/delete/purge/restore execution.
- DEV-12 is closed as local-only generated documents storage retention evidence.
- DEV-12 does not prove production readiness, beta readiness, customer-data behavior, object-storage readiness, retention/legal compliance, restore proof, malware scanning, broad E2E/smoke/full-test, hosted behavior, or load/concurrency.
- Remaining generated-document production gaps include object storage, database/base64 migration, signed URLs, lifecycle policy, legal hold, tax/accounting retention approval, customer-data deletion/retention conflict handling, malware scanning, restore proof, backup proof, purge executor, versioning/supersede policy, PDF/A-3/ZATCA artifact boundaries, hosted/beta/customer-data proof, broad E2E/smoke/full-test coverage, load/concurrency for large PDFs, and accountant/legal review.
- No app code, runtime mutation in the closure step, new download, PDF/base64/body output, deploy, production/beta/customer data, external object storage, migration, seed/reset/delete, backup/restore, full smoke, full E2E, or environment/provider setting changed.

# ZATCA local generated XML fixture validation - 2026-06-06

- No product bug requiring production mutation was found in the generated-fixture sprint.
- Added sanitized deterministic generated XML fixtures for a standard invoice and a standard credit note and validated both through the local official SDK wrapper with Java 11.0.26.
- Default Java 17 remains a safe unsupported-runtime blocker and must not be treated as valid SDK readiness.
- Evidence is metadata-only and does not include XML bodies, QR payload bodies, private keys, CSID material, OTPs, tokens, headers, request/response bodies, customer/vendor payloads, or unsafe SDK stdout/stderr.
- Remaining ZATCA blockers are unchanged: key custody, sandbox OTP/CSID, signing, Phase 2 QR, clearance/reporting, PDF/A-3, retry/error queue, production signed artifact storage, official reviews, and repeatable SDK CI.

# ZATCA local dummy signing dry-run guard - 2026-06-06

- No signing bug was fixed and no signing execution was attempted.
- Added `scripts/zatca-local-dummy-signing-dry-run.cjs` to report readiness and planned SDK command shapes while keeping signing, QR, and signed XML validation execution disabled.
- The guard checks dummy certificate/private-key path presence only and does not read or expose their bodies.
- Remaining blockers are unchanged: explicit future local dummy signing approval, Java 11-14 for SDK execution, SDK reference/CI policy, key custody, sandbox OTP/CSID, Phase 2 QR, clearance/reporting, PDF/A-3, signed artifact storage, official review, and production compliance.

# ZATCA approved local dummy signing execution plan - 2026-06-06

- No runtime bug was fixed and no SDK signing, QR generation, or signed XML validation was attempted.
- Added an approval-phrase runbook and planning-only guard behavior so a future sprint can test approval recognition before any local dummy-material execution is implemented.
- The execution path remains blocked; no private-key/certificate bodies, XML bodies, signed XML bodies, QR payload bodies, CSID/OTP material, tokens, headers, or request/response bodies were exposed.

# ZATCA approved local dummy signing execution - 2026-06-06

- No production bug was fixed and no production ZATCA behavior was enabled.
- One approved local dummy-material SDK run passed for `ledgerbyte-generated-standard-invoice` and `ledgerbyte-generated-credit-note` under Java `11.0.26`.
- Metadata-only evidence is at `docs/zatca/evidence/local-dummy-signing-execution-20260606.json`; no XML bodies, signed XML bodies, QR payload bodies, private-key bodies, certificate bodies, OTP/CSID material, tokens, headers, or request/response bodies were persisted.
- Remaining blockers are unchanged: key custody, sandbox OTP/CSID, production signing, Phase 2 QR production proof, clearance/reporting, PDF/A-3, signed artifact storage, official review, repeatable SDK CI, and production compliance.

# ZATCA dummy signing result review and QR gap analysis - 2026-06-06

- No production bug was fixed and no SDK signing/QR/validation/hash command was executed in this review.
- Added `docs/zatca/DUMMY_SIGNING_RESULT_REVIEW.md` and `docs/zatca/PHASE_2_QR_GAP_ANALYSIS.md`.
- Evidence review confirmed both approved fixtures passed in the prior run with metadata-only evidence, no network calls, cleanup success, and production compliance false.
- Remaining blockers are unchanged: key custody, sandbox OTP/CSID, compliance/production CSID lifecycle, production signing, Phase 2 QR production proof, clearance/reporting, PDF/A-3, signed artifact storage, official review, repeatable SDK CI, and production compliance.

# ZATCA sandbox CSID request execution guard - 2026-06-07

- No production bug was fixed and no production ZATCA behavior was enabled.
- Added a no-network execution guard for future sandbox compliance CSID request execution.
- Status is `EXECUTION_GUARD_READY_BUT_REQUEST_BLOCKED`; `--execute-csid-request` remains `BLOCKED_EXECUTION_NOT_IMPLEMENTED_OR_NOT_APPROVED`.
- No OTP, CSID request, network call, sandbox adapter execution, request body creation, response body processing, secret/body exposure, signing, clearance/reporting, PDF-A3, migration, seed/reset/delete, deployment, email, or production compliance behavior occurred.
- Remaining blockers: key custody, CSID response custody, real sandbox adapter execution, actual OTP capture approval, compliance CSID request execution approval, compliance invoice checks, production CSID lifecycle, production signing, Phase 2 QR proof, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.

# ZATCA sandbox adapter no-network contract tests - 2026-06-07

- No production bug was fixed and no production ZATCA behavior was enabled.
- Added no-network adapter contract tests and a standalone metadata-only guard for the mock, disabled, and sandbox adapter boundaries.
- Status is `NO_NETWORK_CONTRACT_PASSED_WITH_BLOCKERS`.
- No OTP, CSID request, network call, sandbox adapter execution, mock adapter execution, disabled adapter execution, request body creation, response body processing, DB connection/write, env value output, secret/body exposure, signing, clearance/reporting, PDF-A3, migration, seed/reset/delete, deployment, email, or production compliance behavior occurred.
- Remaining blockers: sandbox CSID dry-run request body schema planning, CSID response custody provider approval, legacy raw PEM-capable fields, OTP capture approval, CSID request approval, real network approval, adapter execution approval, production CSID lifecycle, production signing, Phase 2 QR proof, clearance/reporting, PDF-A3, retry queue, signed-artifact storage, official/legal/accounting review, repeatable SDK CI, and production compliance.
