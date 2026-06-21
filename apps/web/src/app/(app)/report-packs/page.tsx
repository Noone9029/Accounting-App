"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerErrorState,
  LedgerLoadingState,
  LedgerMetricGrid,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerStatCard,
  LedgerStatusBadge,
  LedgerSummaryBand,
  LedgerWorkflowCard,
} from "@/components/ui/ledger-system";
import {
  disabledReportPackBoundaryItems,
  fetchReportPackManifestPreview,
  isReportPackSourceNavigable,
  reportPackReviewStatusLabel,
  type ReportPackManifestPreview,
  type ReportPackReviewStatus,
} from "@/lib/report-packs";

type PreviewState =
  | { status: "loading" }
  | { status: "loaded"; manifest: ReportPackManifestPreview }
  | { status: "error"; message: string };

export default function ReportPacksPage() {
  const [previewState, setPreviewState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    fetchReportPackManifestPreview()
      .then((manifest) => {
        if (active) {
          setPreviewState({ status: "loaded", manifest });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPreviewState({
            status: "error",
            message: error instanceof Error ? error.message : "Report-pack preview could not be loaded.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Read-only preview"
        title="Report packs"
        badge={<LedgerStatusBadge tone="warning">Execution disabled</LedgerStatusBadge>}
        description="View the report-pack manifest preview that LedgerByte can currently describe. This page does not generate, download, export, email, schedule, archive, store, submit, or send anything."
        actions={<LedgerButton href="/reports">Open reports</LedgerButton>}
      />

      <LedgerSummaryBand tone="warning">
        Report-pack preview is metadata only. Generation, exports, downloads, email sending, scheduling, archive writes, generated-document mutation, object storage, signed URLs, provider calls, and compliance submission remain disabled.
      </LedgerSummaryBand>

      {previewState.status === "loading" ? <ReportPackLoadingState /> : null}
      {previewState.status === "error" ? <ReportPackErrorState message={previewState.message} /> : null}
      {previewState.status === "loaded" ? <ReportPackManifestView manifest={previewState.manifest} /> : null}
    </LedgerPage>
  );
}

function ReportPackManifestView({ manifest }: { manifest: ReportPackManifestPreview }) {
  const disabledBoundaries = disabledReportPackBoundaryItems(manifest.executionBoundary);
  const items = manifest.items;

  return (
    <LedgerPageBody>
      <LedgerMetricGrid className="md:grid-cols-3 xl:grid-cols-3">
        <LedgerStatCard label="Preview status" value={manifest.status.replaceAll("_", " ")} detail="Planning preview only; no bundle execution is designed here." />
        <LedgerStatCard label="Supported report kinds" value={items.length} detail="Items are listed from the API manifest. Missing web pages remain preview-only." />
        <LedgerStatCard label="Disabled boundaries" value={disabledBoundaries.length} detail="All execution boundaries remain disabled in this UI slice." />
      </LedgerMetricGrid>

      <section>
        <h2 className="text-base font-semibold text-ink">Supported report items</h2>
        {items.length === 0 ? (
          <div className="mt-3">
            <LedgerEmptyState title="No report-pack items returned" description="Nothing can be generated or exported from this state." />
          </div>
        ) : (
          <LedgerDataTable className="mt-3" minWidth="960px">
            <thead className="ledger-table-header">
              <tr>
                <th className="px-4 py-3">Report</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-ink">{item.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-steel">{item.reportKind}</td>
                  <td className="px-4 py-3 text-steel">{item.source.type === "ledgerbyte-report-route" ? "LedgerByte report route" : item.source.type}</td>
                  <td className="px-4 py-3"><LedgerStatusBadge tone={reviewStatusTone(item.reviewStatus)}>{reportPackReviewStatusLabel(item.reviewStatus)}</LedgerStatusBadge></td>
                  <td className="px-4 py-3">
                    {isReportPackSourceNavigable(item) ? (
                      <Link href={item.source.href} className="font-semibold text-palm hover:underline">View source report</Link>
                    ) : (
                      <span className="text-xs text-steel">Preview-only; no route linked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </LedgerDataTable>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink">Disabled capabilities</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {disabledBoundaries.map((boundary) => (
            <LedgerWorkflowCard
              key={boundary.key}
              title={boundary.label}
              description={boundary.explanation}
              status={<LedgerStatusBadge tone="draft">Disabled</LedgerStatusBadge>}
            />
          ))}
        </div>
      </section>
    </LedgerPageBody>
  );
}

function ReportPackLoadingState() {
  return <LedgerLoadingState title="Loading report-pack preview" description="Reading manifest metadata only." />;
}

function ReportPackErrorState({ message }: { message: string }) {
  return <LedgerErrorState title="Report-pack preview is unavailable" description={<>{message} No report-pack action is available while the preview cannot be loaded.</>} />;
}

function reviewStatusTone(status: ReportPackReviewStatus): "success" | "warning" | "danger" {
  switch (status) {
    case "READY_FOR_REVIEW":
      return "success";
    case "BLOCKED":
      return "danger";
    case "NEEDS_REVIEW":
      return "warning";
  }
}
