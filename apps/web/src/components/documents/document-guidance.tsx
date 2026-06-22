import Link from "next/link";
import type { ReactNode } from "react";
import { LedgerPanel, buttonClassName } from "@/components/ui/ledger-system";
import { getLedgerByteEdition } from "@/lib/edition";

interface GuidanceProps {
  className?: string;
}

export function SourceDocumentGuidance({ className = "" }: GuidanceProps) {
  return (
    <div className={`rounded-md border border-line bg-mist p-3 text-xs leading-5 text-steel ${className}`}>
      <p>
        <span className="font-medium text-ink">Document archive:</span> PDF downloads from source records are archived
        automatically so the same generated output can be reviewed later.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <GuidanceLink href="/documents">Open archive</GuidanceLink>
        <GuidanceLink href="/settings/documents">Document settings</GuidanceLink>
        <GuidanceLink href="/settings/number-sequences">Number sequences</GuidanceLink>
      </div>
      <ComplianceNote className="mt-3" />
    </div>
  );
}

export function ArchiveDocumentGuidance({ className = "" }: GuidanceProps) {
  return (
    <LedgerPanel className={className}>
      <h2 className="text-base font-semibold text-ink">How the archive works</h2>
      <p className="mt-2 text-sm leading-6 text-steel">
        This archive lists generated PDFs created from invoices, receipts, statements, reports, and similar source
        records. Downloading an archived row retrieves that stored document record; it does not post accounting entries,
        change balances, or send anything outside LedgerByte.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <GuidanceLink href="/settings/documents">Adjust PDF settings</GuidanceLink>
        <GuidanceLink href="/settings/number-sequences">Review numbering</GuidanceLink>
      </div>
      <ComplianceNote className="mt-3" />
    </LedgerPanel>
  );
}

export function SettingsImpactGuidance({ className = "" }: GuidanceProps) {
  return (
    <LedgerPanel className={className}>
      <h2 className="text-base font-semibold text-ink">What these settings affect</h2>
      <p className="mt-2 text-sm leading-6 text-steel">
        These defaults apply to PDFs generated after saving. Existing archived PDFs are kept as they were generated, and
        number sequence changes are managed separately so document numbering stays auditable.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <GuidanceLink href="/documents">View generated archive</GuidanceLink>
        <GuidanceLink href="/settings/number-sequences">Review number sequences</GuidanceLink>
      </div>
      <ComplianceNote className="mt-3" />
    </LedgerPanel>
  );
}

export function ComplianceNote({ className = "" }: GuidanceProps) {
  const edition = getLedgerByteEdition();

  return (
    <p className={`text-xs leading-5 text-amber-800 ${className}`}>
      {edition.showZatca
        ? "ZATCA status here is local/readiness only. Standard beta PDFs are available for review. PDF/A-3 embedding, ZATCA network submission, CSID execution, clearance/reporting, and production compliance are not enabled."
        : edition.showUaeEinvoicing
          ? "UAE eInvoicing status here is local/readiness only. Standard beta PDFs are available for review. ASP validation, FTA reporting, provider submission, and production compliance are not enabled."
          : "Compliance status here is local/readiness only. Standard beta PDFs are available for review. Tax-authority submission, provider reporting, and production compliance are not enabled."}
    </p>
  );
}

function GuidanceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClassName({ variant: "secondary", size: "sm" })}>
      {children}
    </Link>
  );
}
