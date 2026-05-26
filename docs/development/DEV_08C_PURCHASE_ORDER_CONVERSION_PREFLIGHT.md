# DEV-08C Purchase Order Conversion Preflight

## 1. Purpose And Scope

DEV-08C Part 1 is a read-only preflight for the purchase order lifecycle and the purchase-order-to-purchase-bill conversion branch.

- Repository: `Noone9029/Accounting-App`.
- Branch inspected: `main`.
- Latest commit inspected: `b5782526 Close DEV-08B debit note refund evidence`.
- Local `HEAD` matched `origin/main`: `b5782526302fea2465a50dab220037fcc9e55cfc`.
- Mutation performed: no.
- No supplier, purchase order, purchase bill, purchase receipt, stock movement, journal, generated document, email, ZATCA, cleanup, migration, seed/reset/delete, deployment, environment, provider, schema, production, beta, shared-target, or customer-data action was performed.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `b5782526 Close DEV-08B debit note refund evidence`.
- `git rev-parse HEAD`: `b5782526302fea2465a50dab220037fcc9e55cfc`.
- `git rev-parse origin/main`: `b5782526302fea2465a50dab220037fcc9e55cfc`.

## 3. Local-Only And No-Mutation Proof

- `git status --short` showed only unrelated untracked web/marketing and graphify files:
  - `apps/graphify-out/`
  - `apps/web/src/app/ar/`
  - `apps/web/src/app/marketing.test.tsx`
  - `apps/web/src/app/pricing/`
  - `apps/web/src/app/product/`
  - `apps/web/src/app/readiness/`
  - `apps/web/src/app/resources/`
  - `apps/web/src/app/workflows/`
  - `apps/web/src/components/marketing/`
  - `graphify-out/`
- These files were left untouched and unstaged.
- No `*dev08b*` or `*dev08c*` temporary script exists under `apps/api/scripts`.
- This preflight used source/document inspection only. It did not start services, log in, query a hosted target, run a mutation script, generate PDFs, seed/reset/delete, migrate, deploy, or change environment/provider settings.

## 4. Purchase Order Lifecycle Map

| Operation | Controller route | Service method | Permission | Allowed start | Result | Main blockers and validation | Accounting impact | Inventory impact | Audit action | Output/PDF side effect | Existing coverage | Missing coverage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create | `POST /purchase-orders` | `PurchaseOrderService.create` | `purchaseOrders.create` | New record | `DRAFT` PO with lines and totals | Active supplier contact required; branch must belong to org; at least one line; active item if item is used; active posting expense, cost-of-sales, or asset account if account is supplied; active purchase/BOTH tax rate if supplied; positive/finalizable totals are not enforced until approval | None | None | `PurchaseOrder:CREATE` | None | API rules cover totals; web form covers setup data and draft save shape indirectly through helper tests | No local runtime fixture yet; no integration assertion of audit/non-effects |
| Update | `PATCH /purchase-orders/:id` | `PurchaseOrderService.update` | `purchaseOrders.update` | `DRAFT` | Still `DRAFT` with updated header/lines/totals | Existing PO must be tenant-scoped; only draft can be edited; same supplier/branch/line/account/tax validation as create when changed | None | None | `PurchaseOrder:UPDATE` | None | API rule blocks updates after approval | No full update happy-path/audit coverage found |
| Approve | `POST /purchase-orders/:id/approve` | `PurchaseOrderService.approve` | `purchaseOrders.approve` | `DRAFT` | `APPROVED`, `approvedAt` set | Repeated approve on `APPROVED` returns existing order; other statuses blocked; finalizable totals required | None | None | `PurchaseOrder:APPROVE` | None | API rule covers approval and positive-total blocker; web helper tests cover visible action | No runtime proof of audit/non-effects |
| Mark sent | `POST /purchase-orders/:id/mark-sent` | `PurchaseOrderService.markSent` | `purchaseOrders.approve` | `APPROVED` | `SENT`, `sentAt` set | Repeated mark-sent on `SENT` returns existing order; any non-approved status blocked | None | None | `PurchaseOrder:MARK_SENT` | None | API rule covers approved to sent; web helper tests cover visible action | No runtime proof of audit/non-effects |
| Close | `POST /purchase-orders/:id/close` | `PurchaseOrderService.close` | `purchaseOrders.update` | `APPROVED`, `SENT`, or `PARTIALLY_BILLED` | `CLOSED`, `closedAt` set | Repeated close on `CLOSED` returns existing order; draft, billed, voided, and other statuses blocked | None | None | `PurchaseOrder:CLOSE` | None | API rule covers sent to closed; web helper tests cover visible action | No branch fixture yet; no audit/non-effect runtime proof |
| Void | `POST /purchase-orders/:id/void` | `PurchaseOrderService.void` | `purchaseOrders.void` | `DRAFT`, `APPROVED`, or `SENT` | `VOIDED`, `voidedAt` set | Repeated void on `VOIDED` returns existing order; billed, closed, partially billed, and other statuses blocked | None | None | `PurchaseOrder:VOID` | None | API rule covers draft void; web helper tests confirm billed cannot be voided | No approved/sent void runtime branch yet; no audit/non-effect runtime proof |
| Delete | `DELETE /purchase-orders/:id` | `PurchaseOrderService.remove` | `purchaseOrders.update` | `DRAFT` only | Record deleted | Tenant-scoped record required; only draft can be deleted | None | Cascading deletes PO lines only | `PurchaseOrder:DELETE` | None | Draft-only guard shares `assertDraft`; no explicit PO delete spec found | Cleanup/delete remains out of scope for DEV-08C fixture evidence |
| PDF data | `GET /purchase-orders/:id/pdf-data` | `PurchaseOrderService.pdfData` | `purchaseOrders.view` | Any existing PO | Returns PDF data object | Tenant-scoped record required | None | None | None expected | Returns document data only; no archive write in service | Renderer-level PDF coverage exists elsewhere | Output body inspection and download are forbidden in DEV-08C Part 1 |
| PDF download | `GET /purchase-orders/:id/pdf` | `PurchaseOrderService.pdf` | `purchaseOrders.view` | Any existing PO | PDF stream returned | Tenant-scoped record required | None | None | Generated-document archive behavior can log through generated document service | Renders PDF and archives `DocumentType.PURCHASE_ORDER` if generated document service is available | PDF rendering tests exist; web path builder test exists | Output/archive path is explicitly deferred |
| Generate PDF | `POST /purchase-orders/:id/generate-pdf` | `PurchaseOrderService.generatePdf` | `purchaseOrders.view` | Any existing PO | Generated document record, if service is available | Same as PDF | None | None | Generated-document archive behavior | Archives a purchase order PDF | General generated document coverage exists | Explicitly forbidden for DEV-08C preflight and mutation plan |
| Convert to bill | `POST /purchase-orders/:id/convert-to-bill` | `PurchaseOrderService.convertToBill` | `purchaseOrders.convertToBill` | `APPROVED` or `SENT` | Draft purchase bill returned; PO updated to `BILLED` with `convertedBillId` | Existing PO must be approved or sent; no prior `convertedBillId`; supplier still active and supplier/BOTH; every line needs explicit account or item expense account; line accounts must be active posting expense, cost-of-sales, or asset accounts | No journal at conversion time | No purchase receipt or stock movement is created | `PurchaseOrder:CONVERT_TO_BILL` | None | API rule covers conversion to draft bill without journal and closed/voided rejection; web action exists | No runtime fixture yet; no tests found for inactive supplier, missing line account, item expense fallback, repeat conversion, or copied field assertions |
| Converted bill finalization | `POST /purchase-bills/:id/finalize` | `PurchaseBillService.finalize` | `purchaseBills.finalize` | Converted bill remains `DRAFT` | `FINALIZED`, `journalEntryId` set, `balanceDue = total` | Bill must be draft; not voided; finalizable totals; posting date allowed; AP account `210`; VAT receivable `230` if tax exists; inventory-clearing mode blockers if enabled | Posts AP journal: debit direct expense/asset or clearing accounts and VAT receivable, credit AP | Does not create purchase receipts or stock movements; inventory-clearing mode remains separate from manual receipt asset posting | `PurchaseBill:FINALIZE` | None | API tests cover direct journal, no-tax, inventory-clearing, closed-period blocker, and idempotent finalized behavior | Converted-bill-specific local runtime proof remains for later DEV-08C parts |

## 5. Purchase-Order-To-Bill Conversion Map

- Conversion does create a purchase bill through `tx.purchaseBill.create`.
- The converted bill status is `DRAFT`.
- Conversion does not post a journal. The API spec asserts `journalEntryId: null`, and the service does not call `journalEntry.create` in the conversion transaction.
- Conversion sets `PurchaseOrder.convertedBillId` to the created bill id.
- Conversion changes the purchase order status to `BILLED`.
- Conversion is blocked when `convertedBillId` is already set, so repeat conversion should fail.
- Conversion is allowed only from `APPROVED` or `SENT`; `CLOSED` and `VOIDED` are explicitly rejected by existing tests, and other statuses are rejected by the same service guard.
- Supplier, branch, currency, notes, terms, subtotal, discount total, taxable total, tax total, total, line item, line account, tax rate, description, quantity, unit price, discount rate, calculated amounts, and `sortOrder` are copied to the draft bill.
- Line account fallback exists: each bill line uses `line.accountId ?? line.item?.expenseAccountId`.
- Inactive supplier or a contact that is not `SUPPLIER`/`BOTH` blocks conversion.
- Missing explicit line account and missing item expense account blocks conversion with `Purchase order line N requires an account before conversion.`
- Line accounts must be active posting `EXPENSE`, `COST_OF_SALES`, or `ASSET` accounts in the organization.
- Purchase receipts and inventory stock movement paths are not invoked by conversion. Receipt matching and receiving status are read/link surfaces. Creating a purchase receipt is a separate `PurchaseReceiptService.create` path and is not approved in DEV-08C Part 1 or Part 2.

## 6. Accounting And Journal Expectations

- Purchase order create, update, approve, mark-sent, close, void, delete, and conversion should not create journals.
- Purchase-order-to-bill conversion creates a draft purchase bill only.
- The converted purchase bill remains non-posting until `PurchaseBillService.finalize`.
- Purchase bill finalization posts the AP journal:
  - debit line expense/asset accounts or inventory clearing for eligible clearing-mode tracked lines,
  - debit VAT receivable account `230` when tax is greater than zero,
  - credit accounts payable account `210`.
- The selected DEV-08C fixture should therefore show no journal after Part 2 PO draft creation and no journal until a later converted bill finalization part.

## 7. Inventory And Receipt Expectations

- Purchase orders are operational and non-accounting.
- Purchase order detail reads receiving/matching summaries and links to `/inventory/purchase-receipts/new?sourceType=purchaseOrder&purchaseOrderId=...` only when the user has `purchaseReceiving.create`.
- Conversion to bill does not create purchase receipts, receipt lines, stock movements, inventory asset journals, or inventory asset reversal journals.
- Purchase receipt creation is a separate inventory path that can create stock movements. It remains out of scope for DEV-08C Part 1 and the selected Part 2 mutation target.

## 8. Audit Expectations

Expected service audit actions for a full DEV-08C arc:

- `PurchaseOrder:CREATE`.
- `PurchaseOrder:UPDATE`, if an update branch is later approved.
- `PurchaseOrder:APPROVE`.
- `PurchaseOrder:MARK_SENT`.
- `PurchaseOrder:CONVERT_TO_BILL`.
- `PurchaseBill:FINALIZE`, when the converted bill is finalized later.
- `PurchaseOrder:CLOSE`, for a separate close branch.
- `PurchaseOrder:VOID`, for a separate void branch.
- `PurchaseOrder:DELETE` exists in code but is not selected for the DEV-08C fixture arc.

## 9. Output, Email, And ZATCA Expectations

- Purchase order PDF and generate-PDF paths are output/archive-producing and remain forbidden in this arc until a separate output approval exists.
- Purchase bill PDF and generate-PDF paths are also output/archive-producing and remain forbidden.
- No purchase order, conversion, or purchase bill finalization path sends email.
- No purchase order, conversion, or purchase bill finalization path creates ZATCA XML, signed artifacts, QR payloads, CSID activity, or network submission.

## 10. Permission Expectations

- Purchase order view/list/detail/PDF data/PDF/generate-PDF: `purchaseOrders.view`.
- Purchase order create: `purchaseOrders.create`.
- Purchase order update, close, delete draft: `purchaseOrders.update`.
- Purchase order approve and mark sent: `purchaseOrders.approve`.
- Purchase order void: `purchaseOrders.void`.
- Purchase order convert to bill: `purchaseOrders.convertToBill`.
- Converted bill finalization: `purchaseBills.finalize`.
- Purchase bill view/source link: `purchaseBills.view`.
- Purchase receiving status read: `purchaseReceiving.view`.
- Purchase receipt creation link: `purchaseReceiving.create`, but receipt creation is not part of DEV-08C Part 1 or selected Part 2.

## 11. Existing Coverage Found

API coverage:

- `apps/api/src/purchase-orders/purchase-order-rules.spec.ts` covers totals, tenant-scoped get, draft-only update guard, positive-total approval guard, approve, mark sent, close, void, convert-to-bill creating a draft bill without a journal, and conversion rejection for closed/voided orders.
- `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts` covers purchase bill totals, AP journal line construction, draft creation without journal, idempotent already-finalized behavior, finalization journal creation, no-tax finalization, accounting preview, inventory-clearing blockers and journal lines, closed-period blocker, finalized bill void blockers, and void reversal without stock movement mutation.
- `apps/api/src/purchase-bills/purchase-bill.controller.spec.ts` covers accounting preview permission behavior.

Web/helper coverage:

- `apps/web/src/lib/purchase-orders.test.ts` covers purchase order lifecycle helper states, labels, action visibility by permission, and totals preview.
- `apps/web/src/lib/pdf-download.test.ts` covers the purchase order PDF path builder.
- `apps/web/src/app/(app)/purchases/bills/[id]/page.test.tsx` covers draft purchase bill state and finalize action guidance.

## 12. Missing Coverage

- Local runtime evidence for the DEV-08C purchase order fixture.
- Local runtime evidence for approve, mark sent, convert-to-bill, converted bill finalization, close branch, and void branch.
- Runtime audit assertions for `PurchaseOrder` lifecycle actions.
- Runtime forbidden side-effect assertions for generated documents, email, ZATCA, purchase receipts, stock movements, cash expenses, supplier payments/refunds/debit notes, cleanup, migrations, seed/reset/delete, deploys, production, beta, or customer data.
- Conversion tests for repeat conversion with an existing `convertedBillId`.
- Conversion tests for inactive supplier, non-supplier contact, missing line account, item expense-account fallback, copied notes/terms/branch/currency/totals/sort order, and tax rate copying.
- PDF/archive output behavior for purchase orders and converted bills remains deliberately untested in this arc.

## 13. Selected Part 2 Mutation Target

Use the smallest safe local-only target:

- Create or reuse one fake local supplier named `DEV08C-AP-20260526T000000 Supplier`.
- Create one draft purchase order fixture only.
- Do not approve.
- Do not mark sent.
- Do not close.
- Do not void.
- Do not convert to bill.
- Do not finalize a bill.
- Do not call PDF, generate-PDF, download, archive, email, ZATCA, purchase receipt, inventory, supplier payment/refund, debit note, cash expense, cleanup, migration, seed/reset/delete, deploy, environment, provider, or schema paths.

## 14. Fixture Marker And Planned Totals

- Marker: `DEV08C-AP-20260526T000000`.
- Supplier display label: `DEV08C-AP-20260526T000000 Supplier`.
- Description: `DEV-08C local-only purchase order conversion QA`.
- Currency: `SAR`.
- Line shape: one direct/service line with an active posting expense, cost-of-sales, or asset account.
- Preselected safe local dependency from DEV-08/DEV-08B evidence: account code `111`, safe id prefix `4a8bb6e7`, type `ASSET`, posting-enabled. Prefer a clearer dedicated expense account only if the Part 2 local guard proves one exists safely.
- Preselected VAT dependency from DEV-08/DEV-08B evidence: `VAT on Purchases 15%`, rate `15.0000`, safe id prefix `172417be`.
- Planned subtotal: `1000.0000`.
- Planned VAT: `150.0000`.
- Planned total: `1150.0000`.
- Expected purchase order status after Part 2: `DRAFT`.
- Expected converted bill after Part 2: absent.
- Expected journal after Part 2: absent.
- Expected generated document/PDF/archive/email/ZATCA after Part 2: absent.

## 15. Expected Forbidden Side Effects

Part 2 evidence must prove absence of:

- approved, sent, closed, voided, or converted purchase order state.
- converted purchase bill.
- purchase bill finalization.
- journal entries.
- generated documents, PDFs, downloads, or archive rows.
- email outbox/provider events.
- ZATCA signed artifacts, metadata, XML, QR, CSID, clearance, reporting, or network calls.
- supplier payments, supplier refunds, purchase debit notes, cash expenses.
- purchase receipts, stock movements, inventory asset journals, or inventory reversals.
- cleanup/delete actions.
- migrations, seed/reset/delete, deploys, environment/provider/schema changes.
- production, beta, hosted, shared-target, or customer-data actions.

## 16. Required Approval Phrase For Part 2

`I approve DEV-08C Part 2 local-only purchase order fixture creation mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

If the next part does not include that exact user-provided approval phrase, stop before any mutation or write-capable service import.

## 17. Commands Run

- `git status --short`.
- `git branch --show-current`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts` filtered for `dev08b|dev08c`.
- Targeted `Get-Content` reads for required docs:
  - `CODEX_HANDOFF.md`.
  - `docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md`.
  - `docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md`.
  - `docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md`.
  - `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
  - `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
  - `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`.
  - `BUG_AUDIT.md`.
  - `README.md`.
- Targeted source reads and searches for:
  - `apps/api/src/purchase-orders/purchase-order.controller.ts`.
  - `apps/api/src/purchase-orders/purchase-order.service.ts`.
  - `apps/api/src/purchase-orders/dto/*`.
  - `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`.
  - `apps/api/src/purchase-bills/purchase-bill.controller.ts`.
  - `apps/api/src/purchase-bills/purchase-bill.service.ts`.
  - `apps/api/src/purchase-bills/purchase-bill-accounting.ts`.
  - `apps/api/src/purchase-bills/purchase-bill-rules.spec.ts`.
  - `apps/api/src/purchase-receipts/purchase-receiving-status.controller.ts`.
  - `apps/api/src/purchase-receipts/purchase-receipt.service.ts`.
  - `apps/api/prisma/schema.prisma`.
  - `packages/shared/src/permissions.ts`.
  - `apps/web/src/lib/purchase-orders.ts`.
  - `apps/web/src/lib/purchase-orders.test.ts`.
  - `apps/web/src/components/forms/purchase-order-form.tsx`.
  - `apps/web/src/app/(app)/purchases/purchase-orders/*`.
  - `apps/web/src/app/(app)/purchases/bills/*`.
  - `apps/api/src/audit-log/audit-events.ts`.

## 18. Commands Skipped And Why

- Runtime mutation scripts: forbidden for Part 1.
- Local DB writes, fixture creation, approvals, mark-sent, close, void, convert, finalize, delete, cleanup: forbidden for Part 1.
- Login/browser flows: forbidden because they can write audit logs.
- E2E, smoke, full tests, full build, `verify:repo`, and actual `verify:ci:local`: explicitly out of scope.
- Migrations, seed/reset/delete, Prisma reset, deploys, Vercel/Supabase changes, environment changes, backup/restore: explicitly forbidden.
- PDF/export/download/generate-PDF/archive commands: output-producing and explicitly forbidden.
- ZATCA and email commands: explicitly forbidden.
- Production-hosting research: explicitly forbidden.

## 19. Blockers Or Discrepancies

- No blocker found for a small Part 2 draft purchase order fixture creation, provided the exact approval phrase is supplied and the Part 2 guarded script proves a local-only AP-ready target before importing write-capable services.
- The preselected account `111` is service-valid but semantically weak because prior evidence names it `Cash`. Prefer a dedicated posting expense account in Part 2 only if the local guard safely proves one exists in the selected AP-ready fake local organization.
- Conversion has good baseline unit coverage but lacks repeat-conversion, inactive-supplier, missing-account, fallback-account, and copied-field tests.
- Output/PDF/archive behavior exists in code but is explicitly deferred from this DEV-08C preflight and selected Part 2 mutation.

## 20. Part 2 Evidence Note

- DEV-08C Part 2 local-only purchase order fixture creation is completed in [DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md](DEV_08C_PURCHASE_ORDER_FIXTURE_MUTATION_EVIDENCE.md).
- Approved local mutation was performed under marker `DEV08C-AP-20260526T000000`.
- `PurchaseOrderService.create(...)` was called exactly once, creating draft purchase order `PO-000141` with safe id prefix `d6abea75`.
- Supplier safe id prefix: `5ef871cd`.
- Status: `DRAFT`; total: `1150.0000`; converted bill absent; journal absent; generated document/PDF/archive absent; email absent; purchase receipt and stock movement absent.
- Temporary Part 2 script was deleted before commit and `apps/api/scripts` had no `*dev08c*` script afterward.
- Exact next prompt title: `DEV-08C Part 3: purchase order fixture evidence verification`.

## 21. Exact Next Prompt Title

`DEV-08C Part 3: purchase order fixture evidence verification`
