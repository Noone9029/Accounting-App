"use client";

import { useEffect, useState } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { usePermissions } from "@/components/permissions/permission-provider";
import { LedgerAlert, LedgerButton, LedgerDataTable, LedgerFieldLabel, LedgerFieldText, LedgerPage, LedgerPageBody, LedgerPageHeader, LedgerPanel, LedgerSelect } from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account } from "@/lib/types";

type Movement = { id: string; type: string; movementDate: string; quantity: string; totalCost: string; item: { name: string }; warehouse: { name: string } };
type Preview = { movementId: string; amount: string; currency: string; debitAccountId: string; creditAccountId: string; inventoryCarryingCost: string; originalSourceCost: string; purchaseReturnVariance: string; lines: Array<{ accountId: string; side: "DEBIT" | "CREDIT"; amount: string }> };
type Reconciliation = { subledgerValue: string; inventoryAssetBalance: string; difference: string; legacyMovements: number; pendingMovementReviews: number; pendingReceipts: number; pendingIssues: number; reconciled: boolean };

export default function InventoryAccountingReviewPage() {
  const organizationId = useActiveOrganizationId();
  const { locale } = useAppLocale();
  const { can } = usePermissions();
  const label = (en: string, ar: string) => locale === "ar" ? ar : en;
  const canView = can(PERMISSIONS.inventory.view) && can(PERMISSIONS.journals.view);
  const canPost = can(PERMISSIONS.inventory.manage) && can(PERMISSIONS.journals.post);
  const canViewAccounts = can(PERMISSIONS.accounts.view);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const [openingEquityAccountId, setOpeningEquityAccountId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setPreview(null);
    setError("");
    if (!organizationId || !canView) return;
    let cancelled = false;
    setBusy(true);
    Promise.all([
      apiRequest<Movement[]>("/inventory/movement-accounting/pending"),
      apiRequest<Reconciliation>("/inventory/movement-accounting/reconciliation"),
      canViewAccounts ? apiRequest<Account[]>("/accounts") : Promise.resolve([]),
    ]).then(([pending, result, accountList]) => {
      if (cancelled) return;
      setMovements(pending); setReconciliation(result); setAccounts(accountList);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load inventory accounting."); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [organizationId, canView, canViewAccounts, revision]);

  async function review(movement: Movement) {
    setBusy(true); setError(""); setPreview(null);
    try {
      const query = movement.type === "OPENING_BALANCE" && openingEquityAccountId ? `?openingEquityAccountId=${encodeURIComponent(openingEquityAccountId)}` : "";
      setPreview(await apiRequest<Preview>(`/inventory/movement-accounting/${movement.id}/preview${query}`));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to review this movement."); }
    finally { setBusy(false); }
  }

  async function postReviewedMovement() {
    if (!preview) return;
    setBusy(true); setError("");
    try {
      await apiRequest(`/inventory/movement-accounting/${preview.movementId}/post`, { method: "POST", body: { openingEquityAccountId: openingEquityAccountId || undefined } });
      setPreview(null); setRevision((value) => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to post this movement."); }
    finally { setBusy(false); }
  }

  const accountName = (id: string) => { const account = accounts.find((candidate) => candidate.id === id); return account ? `${account.code} · ${account.name}` : id; };
  const movementNames: Record<string, string> = {
    OPENING_BALANCE: label("Opening balance", "الرصيد الافتتاحي"),
    ADJUSTMENT_IN: label("Stock increase", "زيادة المخزون"),
    ADJUSTMENT_OUT: label("Stock decrease", "نقص المخزون"),
    SALES_RETURN_IN: label("Customer return", "مرتجع العميل"),
    PURCHASE_RETURN_OUT: label("Supplier return", "مرتجع المورد"),
  };
  const movementName = (type: string) => movementNames[type] ?? label("Inventory movement", "حركة مخزون");
  return <LedgerPage>
    <LedgerPageHeader eyebrow={label("Inventory", "المخزون")} title={label("Inventory accounting review", "مراجعة محاسبة المخزون")}
      description={label("Review opening inventory, adjustments and returns at their recorded cost before posting financial journals.", "راجع الأرصدة الافتتاحية والتسويات والمرتجعات بتكلفتها المسجلة قبل ترحيل القيود المحاسبية.")}
      actions={<LedgerButton href="/inventory/settings">{label("Inventory settings", "إعدادات المخزون")}</LedgerButton>} />
    <LedgerPageBody>
      {!canView ? <LedgerAlert tone="info">{label("Inventory and journal viewing permissions are required.", "يلزم إذن عرض المخزون والقيود المحاسبية.")}</LedgerAlert> : null}
      {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
      {reconciliation ? <LedgerPanel>
        <h2 className="font-semibold text-ink">{label("Inventory to general ledger", "مطابقة المخزون مع دفتر الأستاذ")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-sm text-steel">{label("Inventory value", "قيمة المخزون")}</dt><dd className="font-mono">{reconciliation.subledgerValue}</dd></div>
          <div><dt className="text-sm text-steel">{label("Inventory asset balance", "رصيد حساب المخزون")}</dt><dd className="font-mono">{reconciliation.inventoryAssetBalance}</dd></div>
          <div><dt className="text-sm text-steel">{label("Difference", "الفرق")}</dt><dd className="font-mono">{reconciliation.difference}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-steel">{label("Pending receipts / COGS / movement reviews:", "الاستلامات / تكلفة المبيعات / الحركات المعلقة:")} {reconciliation.pendingReceipts} / {reconciliation.pendingIssues} / {reconciliation.pendingMovementReviews}</p>
        <p className="mt-2 text-sm">{reconciliation.reconciled ? label("Reconciled.", "تمت المطابقة.") : label("Resolve pending postings and differences before closing the period.", "عالج القيود المعلقة والفروق قبل إقفال الفترة.")}</p>
        {reconciliation.legacyMovements > 0 ? <LedgerAlert tone="warning">{label("Historical inventory requires a reviewed valuation cutover.", "يتطلب المخزون السابق مراجعة محاسبية قبل الانتقال إلى التقييم الجديد.")}</LedgerAlert> : null}
        <div className="mt-4 flex flex-wrap gap-2"><LedgerButton href="/inventory/purchase-receipts">{label("Receipt postings", "قيود الاستلام")}</LedgerButton><LedgerButton href="/inventory/sales-stock-issues">{label("COGS postings", "قيود تكلفة المبيعات")}</LedgerButton></div>
      </LedgerPanel> : null}
      {movements.some((movement) => movement.type === "OPENING_BALANCE") ? <LedgerPanel><LedgerFieldLabel><LedgerFieldText>{label("Opening equity account", "حساب حقوق الملكية الافتتاحي")}</LedgerFieldText>
        <LedgerSelect value={openingEquityAccountId} onChange={(event) => { setOpeningEquityAccountId(event.target.value); setPreview(null); }}>
          <option value="">{label("Select reviewed account", "اختر الحساب المعتمد")}</option>
          {accounts.filter((account) => account.type === "EQUITY" && account.isActive && account.allowPosting).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
        </LedgerSelect></LedgerFieldLabel></LedgerPanel> : null}
      {preview ? <LedgerPanel>
        <h2 className="font-semibold text-ink">{label("Journal for review", "القيد للمراجعة")}</h2>
        {preview.lines.map((line, index) => <p className="mt-3" key={`${line.accountId}-${index}`}>{line.side === "DEBIT" ? label("Debit", "مدين") : label("Credit", "دائن")}: {accountName(line.accountId)} · {line.amount} {preview.currency}</p>)}
        {Number(preview.purchaseReturnVariance) !== 0 ? <LedgerAlert tone="warning">{label("Original receipt cost / inventory carrying cost / variance:", "تكلفة الاستلام الأصلية / القيمة الدفترية للمخزون / الفرق:")} {preview.originalSourceCost} / {preview.inventoryCarryingCost} / {preview.purchaseReturnVariance}. {label("The separately shown gain/loss line requires accountant review.", "يتطلب قيد الربح أو الخسارة المعروض بشكل منفصل مراجعة المحاسب.")}</LedgerAlert> : null}
        <p className="my-3 text-sm text-steel">{label("Posting changes financial reports. Credit notes, refunds and tax adjustments remain separate workflows.", "يؤثر الترحيل في التقارير المالية. تبقى الإشعارات الدائنة والمبالغ المستردة والتعديلات الضريبية ضمن إجراءات منفصلة.")}</p>
        <LedgerButton variant="primary" disabled={busy || !canPost} onClick={postReviewedMovement}>{label("Post reviewed journal", "ترحيل القيد المعتمد")}</LedgerButton>
      </LedgerPanel> : null}
      {canView ? <LedgerDataTable><thead><tr><th>{label("Item", "الصنف")}</th><th>{label("Warehouse", "المستودع")}</th><th>{label("Movement", "الحركة")}</th><th>{label("Quantity", "الكمية")}</th><th>{label("Recorded cost", "التكلفة المسجلة")}</th><th>{label("Review", "المراجعة")}</th></tr></thead>
        <tbody>{movements.map((movement) => <tr key={movement.id}><td>{movement.item.name}</td><td>{movement.warehouse.name}</td><td>{movementName(movement.type)}</td><td>{movement.quantity}</td><td>{movement.totalCost}</td><td><LedgerButton size="sm" disabled={busy} onClick={() => review(movement)}>{label("Review", "مراجعة")}</LedgerButton></td></tr>)}</tbody>
      </LedgerDataTable> : null}
      {canView && !busy && movements.length === 0 ? <LedgerAlert tone="info">{label("No inventory movements awaiting accounting review.", "لا توجد حركات مخزون بانتظار المراجعة المحاسبية.")}</LedgerAlert> : null}
    </LedgerPageBody>
  </LedgerPage>;
}
