import { expect, test } from "@playwright/test";
import { installVisualApiMocks, primeVisualSession } from "./visual-fixtures";

const viewports = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "tablet", width: 820, height: 960 },
  { name: "mobile", width: 390, height: 900 },
] as const;

const routes = [
  { path: "/dashboard", heading: "لوحة التحكم" },
  { path: "/reports", heading: "التقارير" },
  { path: "/documents", heading: "المستندات" },
  { path: "/settings/compliance", heading: "جاهزية الامتثال" },
  { path: "/bank-accounts", heading: "الحسابات البنكية" },
  { path: "/bank-accounts/bank-1", heading: "Main Bank" },
  { path: "/bank-accounts/bank-1/statement-imports", heading: "استيرادات الكشوف" },
  { path: "/bank-accounts/bank-1/reconciliation", heading: "ملخص التسوية" },
  { path: "/bank-accounts/bank-1/reconciliations", heading: "التسويات البنكية" },
  { path: "/bank-accounts/bank-1/reconciliations/new", heading: "تسوية جديدة" },
  { path: "/bank-reconciliations/rec-1", heading: "REC-VIS-001" },
  { path: "/customers/customer-1/statement", heading: "نشاط كشف العميل" },
  { path: "/suppliers/supplier-1/statement", heading: "نشاط كشف المورد" },
  { path: "/sales/customer-payments", heading: "دفعات العملاء" },
  { path: "/sales/customer-payments/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1", heading: "تسجيل دفعة عميل" },
  { path: "/sales/customer-payments/payment-1", heading: "PAY-VIS-001" },
  { path: "/sales/customer-refunds", heading: "ردود العملاء" },
  { path: "/sales/customer-refunds/new?customerId=customer-1&sourceType=CUSTOMER_PAYMENT&sourcePaymentId=payment-1&returnTo=/customers/customer-1", heading: "تسجيل رد عميل" },
  { path: "/sales/customer-refunds/customer-refund-1", heading: "CREF-VIS-001" },
  { path: "/sales/collections", heading: "التحصيل" },
  { path: "/sales/collections/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1", heading: "حالة تحصيل جديدة" },
  { path: "/sales/collections/collection-case-1", heading: "COL-VIS-001" },
  { path: "/sales/collections/collection-case-1/edit", heading: "تعديل حالة التحصيل" },
  { path: "/sales/invoices", heading: "فواتير المبيعات" },
  { path: "/sales/invoices/new?customerId=customer-1&returnTo=/customers/customer-1", heading: "إنشاء فاتورة مبيعات" },
  { path: "/sales/invoices/invoice-1", heading: "INV-VIS-001" },
  { path: "/sales/invoices/invoice-1/edit", heading: "تعديل فاتورة المبيعات" },
  { path: "/sales/quotes", heading: "عروض الأسعار" },
  { path: "/sales/quotes/new?customerId=customer-1&returnTo=/customers/customer-1", heading: "عرض سعر جديد" },
  { path: "/sales/quotes/quote-1", heading: "QUO-VIS-001" },
  { path: "/sales/quotes/quote-1/edit", heading: "تعديل عرض السعر" },
  { path: "/sales/recurring-invoices", heading: "فواتير متكررة" },
  { path: "/sales/recurring-invoices/new?customerId=customer-1&returnTo=/customers/customer-1", heading: "قالب فاتورة متكررة جديد" },
  { path: "/sales/recurring-invoices/recurring-template-1", heading: "RINV-VIS-001" },
  { path: "/sales/recurring-invoices/recurring-template-1/edit", heading: "تعديل قالب الفاتورة المتكررة" },
  { path: "/sales/delivery-notes", heading: "إشعارات التسليم" },
  { path: "/sales/delivery-notes/new?customerId=customer-1&returnTo=/customers/customer-1", heading: "إشعار تسليم جديد" },
  { path: "/sales/delivery-notes/delivery-note-1", heading: "DN-VIS-001" },
  { path: "/sales/delivery-notes/delivery-note-1/edit", heading: "تعديل إشعار التسليم" },
  { path: "/sales/inventory-returns", heading: "مرتجعات مخزون المبيعات" },
  { path: "/sales/inventory-returns/new?customerId=customer-1&returnTo=/customers/customer-1", heading: "مرتجع مخزون مبيعات جديد" },
  { path: "/sales/inventory-returns/inventory-return-1", heading: "SRN-VIS-001" },
  { path: "/sales/inventory-returns/inventory-return-1/edit", heading: "تعديل مرتجع مخزون المبيعات" },
  { path: "/sales/credit-notes", heading: "إشعارات دائنة للمبيعات" },
  { path: "/sales/credit-notes/new?customerId=customer-1&invoiceId=invoice-1&returnTo=/customers/customer-1", heading: "إنشاء إشعار دائن" },
  { path: "/sales/credit-notes/credit-note-1", heading: "CN-VIS-001" },
  { path: "/sales/credit-notes/credit-note-1/edit", heading: "تعديل الإشعار الدائن" },
  { path: "/purchases/bills", heading: "فواتير الشراء" },
  { path: "/purchases/bills/bill-1", heading: "BILL-VIS-001" },
  { path: "/purchases/debit-notes", heading: "إشعارات مدينة" },
  { path: "/purchases/debit-notes/new", heading: "إنشاء إشعار مدين" },
  { path: "/purchases/debit-notes/debit-note-1", heading: "DN-VIS-001" },
  { path: "/purchases/debit-notes/debit-note-1/edit", heading: "تعديل الإشعار المدين" },
  { path: "/purchases/supplier-refunds", heading: "ردود الموردين" },
  { path: "/purchases/supplier-refunds/new?supplierId=supplier-1&sourceType=PURCHASE_DEBIT_NOTE&sourceDebitNoteId=debit-note-1", heading: "تسجيل رد مورد" },
  { path: "/purchases/supplier-refunds/supplier-refund-1", heading: "SREF-VIS-001" },
  { path: "/purchases/supplier-payments", heading: "دفعات الموردين" },
  { path: "/purchases/supplier-payments/new?supplierId=supplier-1&billId=bill-1&returnTo=/suppliers/supplier-1", heading: "تسجيل دفعة مورد" },
  { path: "/purchases/supplier-payments/supplier-payment-1", heading: "SPAY-VIS-001" },
] as const;

test.describe("Arabic locale authenticated app checks", () => {
  test.beforeEach(async ({ context, page, baseURL }) => {
    const cookieUrl = baseURL ?? process.env.LEDGERBYTE_VISUAL_WEB_URL ?? "http://127.0.0.1:3030";
    await context.addCookies([
      {
        name: "ledgerbyte_locale",
        value: "ar",
        url: cookieUrl,
      },
      {
        name: "ledgerbyte_locale",
        value: "ar",
        url: cookieUrl.replace("127.0.0.1", "localhost"),
      },
    ]);
    await installVisualApiMocks(page);
    await primeVisualSession(page);
    const localeResponse = await page.request.post("/api/locale", { data: { locale: "ar" } });
    expect(localeResponse.ok(), "Arabic locale preference endpoint should accept the visual test locale.").toBe(true);
  });

  for (const viewport of viewports) {
    for (const route of routes) {
      test(`${route.path} renders RTL without document overflow at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(route.path);
        await page.waitForLoadState("domcontentloaded");
        await page.locator("main").waitFor({ state: "visible" });

        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
        await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();

        const hasDocumentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        expect(hasDocumentOverflow, "Arabic app route should not create document-level horizontal overflow.").toBe(false);

        const bodyText = await page.locator("body").innerText();
        expect(bodyText).not.toMatch(/production submission is connected/i);
        expect(bodyText).not.toMatch(/production compliance is enabled/i);
      });
    }
  }
});
