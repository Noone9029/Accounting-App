import {
  REPORT_PACK_EXECUTION_BOUNDARY,
  REPORT_PACK_SUPPORTED_REPORTS,
  buildReportPackManifest,
} from "./report-pack-manifest";

describe("report pack manifest contract", () => {
  it("lists only existing LedgerByte report routes as pack sources", () => {
    expect(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.kind)).toEqual([
      "general-ledger",
      "trial-balance",
      "profit-and-loss",
      "balance-sheet",
      "vat-summary",
      "aged-receivables",
      "aged-payables",
      "cash-flow",
      "revenue-trend",
      "top-customers",
      "top-products-services",
    ]);
    expect(REPORT_PACK_SUPPORTED_REPORTS.map((report) => report.href)).toEqual([
      "/reports/general-ledger",
      "/reports/trial-balance",
      "/reports/profit-and-loss",
      "/reports/balance-sheet",
      "/reports/vat-summary",
      "/reports/aged-receivables",
      "/reports/aged-payables",
      "/reports/cash-flow",
      "/reports/revenue-trend",
      "/reports/top-customers",
      "/reports/top-products-services",
    ]);
  });

  it("builds a planning-only manifest with execution boundaries disabled and safe export references", () => {
    const manifest = buildReportPackManifest({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      generatedAt: "2026-06-21T10:00:01.000Z",
      requestedByUserId: "user-1",
      requestedBy: { id: "user-1", name: "Owner" },
      organization: { id: "org-1", name: "LedgerByte Demo" },
      period: { from: "2026-06-01", to: "2026-06-30" },
      requestId: "req-123",
      items: [
        { id: "item-1", reportKind: "profit-and-loss", query: { from: "2026-06-01", to: "2026-06-30" } },
        { id: "item-2", reportKind: "balance-sheet", query: { asOf: "2026-06-30" }, reviewStatus: "READY_FOR_REVIEW" },
      ],
    });

    expect(manifest).toMatchObject({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      status: "PLANNING_ONLY",
      generatedAt: "2026-06-21T10:00:01.000Z",
      requestedBy: { id: "user-1", name: "Owner" },
      organization: { id: "org-1", name: "LedgerByte Demo" },
      period: { from: "2026-06-01", to: "2026-06-30", asOf: null },
      requestId: "req-123",
      executionBoundary: REPORT_PACK_EXECUTION_BOUNDARY,
      items: [
        {
          id: "item-1",
          reportKind: "profit-and-loss",
          title: "Profit & Loss",
          source: { type: "ledgerbyte-report-route", href: "/reports/profit-and-loss" },
          exports: {
            csv: { supported: true, href: "/reports/profit-and-loss?from=2026-06-01&to=2026-06-30&format=csv" },
            pdf: { supported: true, href: "/reports/profit-and-loss/pdf?from=2026-06-01&to=2026-06-30", reason: null },
          },
          reviewStatus: "NEEDS_REVIEW",
        },
        {
          id: "item-2",
          reportKind: "balance-sheet",
          title: "Balance Sheet",
          source: { type: "ledgerbyte-report-route", href: "/reports/balance-sheet" },
          exports: {
            csv: { supported: true, href: "/reports/balance-sheet?asOf=2026-06-30&format=csv" },
            pdf: { supported: true, href: "/reports/balance-sheet/pdf?asOf=2026-06-30", reason: null },
          },
          reviewStatus: "READY_FOR_REVIEW",
        },
      ],
    });
    expect(manifest.executionBoundary).toEqual({
      generationEnabled: false,
      downloadEnabled: false,
      emailSendingEnabled: false,
      scheduledRunEnabled: false,
      archiveWriteEnabled: false,
      generatedDocumentMutationEnabled: false,
      storageMutationEnabled: false,
      providerCallEnabled: false,
      complianceSubmissionEnabled: false,
    });
    expect(manifest.downloadReadiness).toEqual({
      packDownloadEnabled: false,
      storageProvider: "disabled",
      signedUrlEnabled: false,
      reason: "Pack-level download is blocked until local storage/archive and signed URL proof are approved.",
    });
  });

  it("supports current read-only report API endpoints in manifest previews", () => {
    const manifest = buildReportPackManifest({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      requestedByUserId: "user-1",
      items: [
        { id: "item-1", reportKind: "cash-flow", query: { from: "2026-06-01", to: "2026-06-30" } },
        { id: "item-2", reportKind: "revenue-trend", query: { from: "2026-06-01", to: "2026-06-30" } },
      ],
    });

    expect(manifest.items).toMatchObject([
      {
        reportKind: "cash-flow",
        title: "Cash Flow",
        source: { href: "/reports/cash-flow" },
        exports: {
          csv: { supported: true, href: "/reports/cash-flow?from=2026-06-01&to=2026-06-30&format=csv" },
          pdf: { supported: false, href: null, reason: "PDF export is not implemented for this report." },
        },
      },
      {
        reportKind: "revenue-trend",
        title: "Revenue Trend",
        source: { href: "/reports/revenue-trend" },
        exports: {
          csv: { supported: true, href: "/reports/revenue-trend?from=2026-06-01&to=2026-06-30&format=csv" },
          pdf: { supported: false, href: null, reason: "PDF export is not implemented for this report." },
        },
      },
    ]);
  });

  it("preserves canonical supported FX and dimension scope and rejects misleading pack filters", () => {
    const manifest = buildReportPackManifest({
      id: "pack-fx", organizationId: "org-1", title: "FX review", createdAt: "2026-07-31T00:00:00.000Z", requestedByUserId: "user-1",
      organization: { id: "org-1", name: "UAE Org", baseCurrency: "AED" },
      items: [{ id: "gl", reportKind: "general-ledger", query: { projectId: " project-1 ", transactionCurrency: " usd ", from: "2026-07-01", costCenterId: "cost-center-1" } }],
    });

    expect(manifest.accountingContext).toEqual({ baseCurrency: "AED", amountBasis: "BASE_CURRENCY" });
    expect(manifest.items[0]).toMatchObject({
      query: { from: "2026-07-01", costCenterId: "cost-center-1", projectId: "project-1", transactionCurrency: "USD" },
      scope: { baseCurrency: "AED", transactionCurrency: "USD", costCenterId: "cost-center-1", projectId: "project-1" },
      exports: {
        csv: { href: "/reports/general-ledger?from=2026-07-01&costCenterId=cost-center-1&projectId=project-1&transactionCurrency=USD&format=csv" },
        pdf: { href: "/reports/general-ledger/pdf?from=2026-07-01&costCenterId=cost-center-1&projectId=project-1&transactionCurrency=USD" },
      },
    });
    expect(() => buildReportPackManifest({
      id: "bad", organizationId: "org-1", title: "Bad", createdAt: "2026-07-31T00:00:00.000Z", requestedByUserId: "user-1",
      items: [{ id: "pnl", reportKind: "profit-and-loss", query: { transactionCurrency: "USD" } }],
    })).toThrow("Transaction-currency filtering is not supported for profit-and-loss report-pack items.");
  });

  it.each([
    ["aged-receivables", { from: "2026-07-01" }, "from"],
    ["general-ledger", { asOf: "2026-07-31" }, "asOf"],
    ["profit-and-loss", { accountId: "account-1" }, "accountId"],
    ["balance-sheet", { from: "2026-07-01" }, "from"],
    ["top-customers", { includeZero: "true" }, "includeZero"],
    ["cash-flow", { unknownFilter: "value" }, "unknownFilter"],
  ] as const)("rejects %s report-pack filters that the target report does not consume", (reportKind, query, key) => {
    expect(() => buildReportPackManifest({
      id: `bad-${reportKind}`, organizationId: "org-1", title: "Bad filters", createdAt: "2026-07-31T00:00:00.000Z", requestedByUserId: "user-1",
      items: [{ id: "item", reportKind, query }],
    })).toThrow(`Filter ${key} is not supported for ${reportKind} report-pack items.`);
  });

  it("keeps manifest metadata redacted and free of document/provider bodies", () => {
    const manifest = buildReportPackManifest({
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      requestedByUserId: "user-1",
      requestId: "req-123",
      status: "READY_LOCAL",
      items: [{ id: "item-1", reportKind: "cash-flow", query: { from: "2026-06-01", to: "2026-06-30" } }],
    });

    const serialized = JSON.stringify(manifest);

    expect(serialized).toContain("req-123");
    expect(serialized).not.toMatch(/contentBase64|providerPayload|redactedRawJson|storageKey|databaseUrl|authorization|cookie/i);
  });

  it("rejects empty, unsupported, or duplicate manifest items", () => {
    const base = {
      id: "pack-1",
      organizationId: "org-1",
      title: "Monthly owner review",
      createdAt: "2026-06-21T10:00:00.000Z",
      requestedByUserId: "user-1",
    };

    expect(() => buildReportPackManifest({ ...base, items: [] })).toThrow("Report pack manifest requires at least one report item.");
    expect(() =>
      buildReportPackManifest({
        ...base,
        items: [{ id: "item-1", reportKind: "vat-return" as never, query: {} }],
      }),
    ).toThrow("Unsupported report pack item kind: vat-return.");
    expect(() =>
      buildReportPackManifest({
        ...base,
        items: [
          { id: "item-1", reportKind: "trial-balance", query: {} },
          { id: "item-1", reportKind: "balance-sheet", query: {} },
        ],
      }),
    ).toThrow("Report pack item IDs must be unique.");
  });
});
