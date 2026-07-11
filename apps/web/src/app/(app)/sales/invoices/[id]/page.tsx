"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { StatusMessage } from "@/components/common/status-message";
import { UaeEinvoiceReadinessPanel } from "@/components/compliance/uae-einvoice-readiness-panel";
import { RelatedDeliveryNotesPanel } from "@/components/delivery-notes/related-delivery-notes-panel";
import { SourceDocumentGuidance } from "@/components/documents/document-guidance";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { collectionActivityTypeLabel, collectionStatusBadgeClass, collectionStatusLabel, collectionsSafeWording } from "@/lib/collections";
import { getSalesInvoiceComplianceReadiness, prepareSalesInvoiceCompliance, validateComplianceDocument } from "@/lib/compliance";
import { creditNoteAllocationStatusBadgeClass, creditNoteAllocationStatusLabel, creditNoteStatusBadgeClass, creditNoteStatusLabel } from "@/lib/credit-notes";
import { customerPaymentUnappliedAllocationStatusBadgeClass, customerPaymentUnappliedAllocationStatusLabel } from "@/lib/customer-payments";
import { FOREIGN_DOCUMENT_POSTING_BLOCKED_MESSAGE, foreignDocumentPostingIsBlocked, transactionDocumentDisplayTotals, transactionLineDisplayAmounts } from "@/lib/document-fx";
import { deriveInvoicePaymentState } from "@/lib/invoice-display";
import { getLedgerByteEdition } from "@/lib/edition";
import { formatInventoryQuantity, hasRemainingInventoryQuantity, inventoryProgressStatusBadgeClass, inventoryProgressStatusLabel } from "@/lib/inventory";
import { formatAppDate, formatAppDateTime, formatAppMoney } from "@/lib/app-i18n";
import { partyDetailHref, safeReturnToFromSearch } from "@/lib/parties";
import { downloadAuthenticatedFile, downloadPdf, invoicePdfPath } from "@/lib/pdf-download";
import { PERMISSIONS } from "@/lib/permissions";
import {
  shouldShowZatcaLocalOnlyWarning,
  shouldShowZatcaHashMismatchWarning,
  shouldShowZatcaSdkLocalOnlyWarning,
  truncateHash,
  zatcaHashComparisonLabel,
  zatcaHashModeLabel,
  zatcaInvoiceHashComparePath,
  zatcaInvoiceLocalSigningDryRunPath,
  zatcaInvoiceReadinessPath,
  zatcaInvoiceSigningPlanPath,
  zatcaInvoiceSignedArtifactDraftsPath,
  zatcaInvoiceSignedArtifactStoragePlanPath,
  zatcaInvoiceSdkValidatePath,
  zatcaInvoiceClearancePath,
  zatcaInvoiceComplianceCheckPath,
  zatcaInvoiceReportingPath,
  zatcaInvoiceXmlPath,
  zatcaInvoiceXmlValidationPath,
  zatcaSdkValidateXmlDryRunPath,
  zatcaSdkValidationResultLabel,
  zatcaReadinessStatusBadgeClass,
  zatcaReadinessStatusLabel,
  zatcaStatusLabel,
  zatcaXmlValidationLabel,
} from "@/lib/zatca";
import type {
  SalesInvoice,
  ComplianceSourceReadinessResponse,
  CollectionCase,
  DeliveryNote,
  SalesInvoiceStockIssueStatus,
  ZatcaInvoiceHashCompareResponse,
  ZatcaInvoiceLocalSigningDryRunResponse,
  ZatcaInvoiceMetadata,
  ZatcaInvoiceReadinessResponse,
  ZatcaInvoiceSignedArtifactStoragePlanResponse,
  ZatcaInvoiceSigningPlanResponse,
  ZatcaQrResponse,
  ZatcaReadinessSection,
  ZatcaSdkDryRunResponse,
  ZatcaSdkValidationResponse,
  ZatcaSignedArtifactDraft,
  ZatcaSignedArtifactDraftCreateResponse,
  ZatcaSignedArtifactDraftListResponse,
  ZatcaXmlValidationResult,
} from "@/lib/types";

export default function SalesInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const { locale, tc } = useAppLocale();
  const edition = getLedgerByteEdition();
  const showKsaZatca = edition.showsKsaZatca;
  const showUaeEinvoicing = edition.showsUaeEinvoicing;
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [relatedDeliveryNotes, setRelatedDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [relatedDeliveryNotesLoading, setRelatedDeliveryNotesLoading] = useState(false);
  const [collectionCases, setCollectionCases] = useState<CollectionCase[]>([]);
  const [collectionCasesLoading, setCollectionCasesLoading] = useState(false);
  const [stockIssueStatus, setStockIssueStatus] = useState<SalesInvoiceStockIssueStatus | null>(null);
  const [uaeReadiness, setUaeReadiness] = useState<ComplianceSourceReadinessResponse | null>(null);
  const [zatca, setZatca] = useState<ZatcaInvoiceMetadata | null>(null);
  const [zatcaReadiness, setZatcaReadiness] = useState<ZatcaInvoiceReadinessResponse | null>(null);
  const [signingPlan, setSigningPlan] = useState<ZatcaInvoiceSigningPlanResponse | null>(null);
  const [localSigningDryRun, setLocalSigningDryRun] = useState<ZatcaInvoiceLocalSigningDryRunResponse | null>(null);
  const [signedArtifactDrafts, setSignedArtifactDrafts] = useState<ZatcaSignedArtifactDraft[]>([]);
  const [signedArtifactStoragePlan, setSignedArtifactStoragePlan] = useState<ZatcaInvoiceSignedArtifactStoragePlanResponse | null>(null);
  const [xmlValidation, setXmlValidation] = useState<ZatcaXmlValidationResult | null>(null);
  const [sdkDryRun, setSdkDryRun] = useState<ZatcaSdkDryRunResponse | null>(null);
  const [sdkValidation, setSdkValidation] = useState<ZatcaSdkValidationResponse | null>(null);
  const [hashComparison, setHashComparison] = useState<ZatcaInvoiceHashCompareResponse | null>(null);
  const [qrPayload, setQrPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !params.id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<SalesInvoice>(`/sales-invoices/${params.id}`),
      apiRequest<SalesInvoiceStockIssueStatus>(`/sales-invoices/${params.id}/stock-issue-status`).catch(() => null),
      showKsaZatca ? apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${params.id}/zatca`).catch(() => null) : Promise.resolve(null),
      showKsaZatca ? apiRequest<ZatcaInvoiceReadinessResponse>(zatcaInvoiceReadinessPath(params.id)).catch(() => null) : Promise.resolve(null),
      showKsaZatca ? apiRequest<ZatcaInvoiceSigningPlanResponse>(zatcaInvoiceSigningPlanPath(params.id)).catch(() => null) : Promise.resolve(null),
      showKsaZatca ? apiRequest<ZatcaSignedArtifactDraftListResponse>(zatcaInvoiceSignedArtifactDraftsPath(params.id)).catch(() => null) : Promise.resolve(null),
      showKsaZatca ? apiRequest<ZatcaInvoiceSignedArtifactStoragePlanResponse>(zatcaInvoiceSignedArtifactStoragePlanPath(params.id)).catch(() => null) : Promise.resolve(null),
      showKsaZatca ? apiRequest<ZatcaXmlValidationResult>(zatcaInvoiceXmlValidationPath(params.id)).catch(() => null) : Promise.resolve(null),
      showUaeEinvoicing ? getSalesInvoiceComplianceReadiness(params.id).catch(() => null) : Promise.resolve(null),
    ])
      .then(([result, stockStatusResult, zatcaResult, readinessResult, signingPlanResult, draftListResult, storagePlanResult, validationResult, uaeReadinessResult]) => {
        if (!cancelled) {
          setInvoice(result);
          setStockIssueStatus(stockStatusResult);
          setUaeReadiness(uaeReadinessResult);
          setZatca(zatcaResult);
          setZatcaReadiness(readinessResult);
          setSigningPlan(signingPlanResult);
          setSignedArtifactDrafts(draftListResult?.drafts ?? []);
          setSignedArtifactStoragePlan(storagePlanResult);
          setXmlValidation(validationResult);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : tc("Unable to load sales invoice."));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, params.id, showKsaZatca, showUaeEinvoicing, tc]);

  useEffect(() => {
    if (!organizationId || !invoice?.id || !invoice.customerId) {
      setRelatedDeliveryNotes([]);
      setRelatedDeliveryNotesLoading(false);
      return;
    }

    let cancelled = false;
    setRelatedDeliveryNotesLoading(true);
    apiRequest<DeliveryNote[]>(`/delivery-notes?customerId=${encodeURIComponent(invoice.customerId)}`)
      .then((result) => {
        if (!cancelled) {
          setRelatedDeliveryNotes(result.filter((deliveryNote) => deliveryNote.relatedSalesInvoiceId === invoice.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRelatedDeliveryNotes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRelatedDeliveryNotesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invoice?.customerId, invoice?.id, organizationId]);

  useEffect(() => {
    if (!organizationId || !invoice?.id) {
      setCollectionCases([]);
      setCollectionCasesLoading(false);
      return;
    }

    let cancelled = false;
    setCollectionCasesLoading(true);
    apiRequest<CollectionCase[]>(`/collections/invoice/${invoice.id}`)
      .then((result) => {
        if (!cancelled) {
          setCollectionCases(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollectionCases([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCollectionCasesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invoice?.id, organizationId]);

  async function runAction(action: "finalize" | "void") {
    if (!invoice) {
      return;
    }

    if (action === "finalize" && foreignDocumentPostingIsBlocked(invoice)) {
      setError(tc(FOREIGN_DOCUMENT_POSTING_BLOCKED_MESSAGE));
      return;
    }

    if (action === "void" && !window.confirm(tc("Void invoice {number}?", { number: invoice.invoiceNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<SalesInvoice>(`/sales-invoices/${invoice.id}/${action}`, { method: "POST" });
      setInvoice(updated);
      if (action === "finalize") {
        if (showKsaZatca) {
          await refreshZatca(updated.id);
          await fetchZatcaReadiness(updated.id).catch(() => undefined);
          await fetchZatcaSigningPlan(updated.id).catch(() => undefined);
        }
        if (showUaeEinvoicing) {
          await fetchUaeReadiness(updated.id).catch(() => undefined);
        }
      }
      setSuccess(
        action === "finalize"
          ? tc("Invoice posted. Accounting entries were created for {number}; record payment when cash is received.", { number: updated.invoiceNumber })
          : tc("Invoice voided. Reversal details are shown below when available for {number}.", { number: updated.invoiceNumber }),
      );
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : tc("Unable to {action} invoice.", { action: tc(action) }));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteInvoice() {
    if (!invoice || !window.confirm(tc("Delete draft invoice {number}?", { number: invoice.invoiceNumber }))) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<{ deleted: boolean }>(`/sales-invoices/${invoice.id}`, { method: "DELETE" });
      router.push("/sales/invoices");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tc("Unable to delete invoice."));
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadInvoicePdf() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadPdf(invoicePdfPath(invoice.id), `invoice-${invoice.invoiceNumber}.pdf`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download invoice PDF."));
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshZatca(invoiceId: string) {
    const result = await apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${invoiceId}/zatca`);
    setZatca(result);
    return result;
  }

  async function fetchZatcaReadiness(invoiceId: string) {
    const result = await apiRequest<ZatcaInvoiceReadinessResponse>(zatcaInvoiceReadinessPath(invoiceId));
    setZatcaReadiness(result);
    return result;
  }

  async function fetchZatcaSigningPlan(invoiceId: string) {
    const result = await apiRequest<ZatcaInvoiceSigningPlanResponse>(zatcaInvoiceSigningPlanPath(invoiceId));
    setSigningPlan(result);
    return result;
  }

  async function fetchUaeReadiness(invoiceId: string) {
    const result = await getSalesInvoiceComplianceReadiness(invoiceId);
    setUaeReadiness(result);
    return result;
  }

  async function validateUaeReadiness() {
    if (!invoice) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const prepared = await prepareSalesInvoiceCompliance(invoice.id);
      await validateComplianceDocument(prepared.id);
      await fetchUaeReadiness(invoice.id);
      setSuccess(tc("Local UAE eInvoice readiness validation completed. No ASP submission, FTA reporting, or network call was performed."));
    } catch (validationError) {
      await fetchUaeReadiness(invoice.id).catch(() => undefined);
      setError(validationError instanceof Error ? validationError.message : tc("Unable to validate UAE eInvoice readiness."));
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchSignedArtifactDrafts(invoiceId: string) {
    const result = await apiRequest<ZatcaSignedArtifactDraftListResponse>(zatcaInvoiceSignedArtifactDraftsPath(invoiceId));
    setSignedArtifactDrafts(result.drafts);
    return result;
  }

  async function fetchSignedArtifactStoragePlan(invoiceId: string) {
    const result = await apiRequest<ZatcaInvoiceSignedArtifactStoragePlanResponse>(zatcaInvoiceSignedArtifactStoragePlanPath(invoiceId));
    setSignedArtifactStoragePlan(result);
    return result;
  }

  async function createSignedArtifactDraft() {
    if (!invoice) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<ZatcaSignedArtifactDraftCreateResponse>(zatcaInvoiceSignedArtifactDraftsPath(invoice.id), { method: "POST" });
      setSignedArtifactDrafts((current) => [result.draft, ...current.filter((draft) => draft.id !== result.draft.id)]);
      await fetchSignedArtifactDrafts(invoice.id).catch(() => undefined);
      await fetchSignedArtifactStoragePlan(invoice.id).catch(() => undefined);
      setSuccess(tc("Metadata-only signed artifact draft created. No signed XML body, QR payload, CSID request, network call, or submission was performed."));
    } catch (draftError: unknown) {
      setError(draftError instanceof Error ? draftError.message : tc("Unable to create signed artifact draft."));
    } finally {
      setActionLoading(false);
    }
  }

  async function runLocalSigningDryRun() {
    if (!invoice) {
      return;
    }
    setActionLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiRequest<ZatcaInvoiceLocalSigningDryRunResponse>(zatcaInvoiceLocalSigningDryRunPath(invoice.id), { method: "POST" });
      setLocalSigningDryRun(result);
      setSuccess(tc("Local signing dry-run refreshed. No CSID request, network call, submission, or persistence was performed."));
    } catch (signingError: unknown) {
      setError(signingError instanceof Error ? signingError.message : tc("Unable to run local signing dry-run."));
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchZatcaXmlValidation(invoiceId: string) {
    const result = await apiRequest<ZatcaXmlValidationResult>(zatcaInvoiceXmlValidationPath(invoiceId));
    setXmlValidation(result);
    return result;
  }

  async function generateZatca() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");
    setQrPayload("");
    setSdkDryRun(null);
    setSdkValidation(null);
    setHashComparison(null);

    try {
      const result = await apiRequest<ZatcaInvoiceMetadata>(`/sales-invoices/${invoice.id}/zatca/generate`, { method: "POST" });
      setZatca(result);
      await fetchZatcaReadiness(invoice.id);
      await fetchZatcaSigningPlan(invoice.id).catch(() => undefined);
      await fetchSignedArtifactStoragePlan(invoice.id).catch(() => undefined);
      await fetchZatcaXmlValidation(invoice.id);
      setSuccess(tc("Local ZATCA XML, QR payload, and hash metadata generated."));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : tc("Unable to generate ZATCA metadata."));
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadZatcaXml() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await downloadAuthenticatedFile(zatcaInvoiceXmlPath(invoice.id), `zatca-${invoice.invoiceNumber}.xml`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : tc("Unable to download ZATCA XML."));
    } finally {
      setActionLoading(false);
    }
  }

  async function loadQrPayload() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaQrResponse>(`/sales-invoices/${invoice.id}/zatca/qr`);
      setQrPayload(result.qrCodeBase64);
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : tc("Unable to load ZATCA QR payload."));
    } finally {
      setActionLoading(false);
    }
  }

  async function refreshXmlValidation() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await fetchZatcaXmlValidation(invoice.id);
      await fetchZatcaReadiness(invoice.id).catch(() => undefined);
      await fetchZatcaSigningPlan(invoice.id).catch(() => undefined);
      setSuccess(tc("Local XML validation refreshed."));
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : tc("Unable to validate local ZATCA XML."));
    } finally {
      setActionLoading(false);
    }
  }

  async function runSdkValidationDryRun() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaSdkDryRunResponse>(zatcaSdkValidateXmlDryRunPath(), {
        method: "POST",
        body: { invoiceId: invoice.id, mode: "dry-run" },
      });
      setSdkDryRun(result);
      setSuccess(tc("SDK validation dry-run plan created. The SDK was not executed."));
    } catch (dryRunError) {
      setError(dryRunError instanceof Error ? dryRunError.message : tc("Unable to build SDK validation dry-run plan."));
    } finally {
      setActionLoading(false);
    }
  }

  async function runLocalSdkValidation() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaSdkValidationResponse>(zatcaInvoiceSdkValidatePath(invoice.id), { method: "POST" });
      setSdkValidation(result);
      setSuccess(tc(result.officialValidationAttempted ? "Local SDK validation completed. No ZATCA network call was made." : "Local SDK validation is blocked or disabled. No ZATCA network call was made."));
    } catch (sdkError) {
      setError(sdkError instanceof Error ? sdkError.message : tc("Unable to run local SDK validation."));
    } finally {
      setActionLoading(false);
    }
  }

  async function runHashComparison() {
    if (!invoice) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaInvoiceHashCompareResponse>(zatcaInvoiceHashComparePath(invoice.id), { method: "POST" });
      setHashComparison(result);
      setSuccess(tc(result.officialHashAttempted ? "SDK hash comparison completed without mutating ZATCA metadata." : "SDK hash comparison is blocked or disabled. No metadata was changed."));
    } catch (hashError) {
      setError(hashError instanceof Error ? hashError.message : tc("Unable to compare SDK hash."));
    } finally {
      setActionLoading(false);
    }
  }

  async function runZatcaSubmission(action: "compliance-check" | "clearance" | "reporting") {
    if (!invoice) {
      return;
    }

    const pathByAction = {
      "compliance-check": zatcaInvoiceComplianceCheckPath(invoice.id),
      clearance: zatcaInvoiceClearancePath(invoice.id),
      reporting: zatcaInvoiceReportingPath(invoice.id),
    };

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await apiRequest<ZatcaInvoiceMetadata>(pathByAction[action], { method: "POST" });
      setZatca(result);
      setSuccess(tc(zatcaActionSuccessMessage(action)));
    } catch (submissionError) {
      await refreshZatca(invoice.id).catch(() => undefined);
      setError(submissionError instanceof Error ? submissionError.message : tc("Unable to run local ZATCA readiness action."));
    } finally {
      setActionLoading(false);
    }
  }

  const latestZatcaSubmission = zatca?.submissionLogs?.[0];
  const canUpdateInvoice = can(PERMISSIONS.salesInvoices.update);
  const canFinalizeInvoice = can(PERMISSIONS.salesInvoices.finalize);
  const foreignPostingBlocked = invoice ? foreignDocumentPostingIsBlocked(invoice) : false;
  const invoiceDisplayTotals = invoice ? transactionDocumentDisplayTotals(invoice) : null;
  const canVoidInvoice = can(PERMISSIONS.salesInvoices.void);
  const canCreateCollectionCase = can(PERMISSIONS.salesInvoices.create);
  const canCreateCustomerPayment = can(PERMISSIONS.customerPayments.create);
  const canCreateCreditNote = can(PERMISSIONS.creditNotes.create);
  const canCreateStockIssue = can(PERMISSIONS.salesStockIssue.create);
  const canViewZatca = showKsaZatca && can(PERMISSIONS.zatca.view);
  const canGenerateZatca = showKsaZatca && can(PERMISSIONS.zatca.generateXml);
  const canRunZatcaChecks = showKsaZatca && can(PERMISSIONS.zatca.runChecks);
  const canManageZatca = showKsaZatca && can(PERMISSIONS.zatca.manage);
  const canViewCompliance = showUaeEinvoicing && can(PERMISSIONS.compliance.view);
  const canValidateCompliance = showUaeEinvoicing && can(PERMISSIONS.compliance.manage) && can(PERMISSIONS.compliance.validate);
  const latestSignedArtifactDraft = signedArtifactDrafts[0] ?? signedArtifactStoragePlan?.latestDraft ?? null;
  const returnTo = safeReturnToFromSearch(searchParams.toString());
  const invoiceDetailHref = salesInvoiceDetailHref(params.id, returnTo);
  const yesNo = (value: boolean) => tc(value ? "Yes" : "No");
  const ltrValue = (value: string | null | undefined) => (value ? <bdi dir="ltr">{value}</bdi> : "-");
  const localizeStatus = (value: string | null | undefined) => (value ? tc(value) : "-");

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{invoice ? <bdi dir="ltr">{invoice.invoiceNumber}</bdi> : tc("Sales invoice")}</h1>
          <p className="mt-1 text-sm text-steel">{tc("Invoice detail, calculated totals, and linked journal entry.")}</p>
          {invoice ? <p className="mt-1 text-xs text-steel">{tc("Invoice PDF downloads create an archive record for later review.")}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href={returnTo || "/sales/invoices"} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Back")}
          </Link>
          {invoice?.status === "DRAFT" && canUpdateInvoice ? (
            <Link href={`/sales/invoices/${invoice.id}/edit`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Edit")}
            </Link>
          ) : null}
          {invoice?.customerId ? (
            <Link href={partyDetailHref("customer", invoice.customerId)} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Customer workspace")}
            </Link>
          ) : null}
          {invoice ? (
            <button type="button" onClick={() => void downloadInvoicePdf()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Download invoice PDF")}
            </button>
          ) : null}
          {invoice?.status === "FINALIZED" && invoice.customerId && canCreateCustomerPayment ? (
            <Link
              href={`/sales/customer-payments/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(invoiceDetailHref)}`}
              className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50"
            >
              {tc("Record payment")}
            </Link>
          ) : null}
          {invoice?.status === "FINALIZED" && invoice.customerId && canCreateCreditNote ? (
            <Link
              href={`/sales/credit-notes/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(invoiceDetailHref)}`}
              className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50"
            >
              {tc("Create credit note")}
            </Link>
          ) : null}
          {invoice?.status === "FINALIZED" && stockIssueStatus && canCreateStockIssue && hasStockIssueRemaining(stockIssueStatus) ? (
            <Link href={`/inventory/sales-stock-issues/new?salesInvoiceId=${invoice.id}`} className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50">
              {tc("Issue stock")}
            </Link>
          ) : null}
          {invoice?.status === "DRAFT" && canFinalizeInvoice ? (
            <button type="button" onClick={() => void runAction("finalize")} disabled={actionLoading || foreignPostingBlocked} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
              {tc("Finalize")}
            </button>
          ) : null}
          {invoice && invoice.status !== "VOIDED" && canVoidInvoice ? (
            <button type="button" onClick={() => void runAction("void")} disabled={actionLoading} className="rounded-md border border-rosewood px-3 py-2 text-sm font-medium text-rosewood hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Void")}
            </button>
          ) : null}
          {invoice?.status === "DRAFT" && canUpdateInvoice ? (
            <button type="button" onClick={() => void deleteInvoice()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
              {tc("Delete")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {!organizationId ? <StatusMessage type="info">{tc("Log in and select an organization to load invoices.")}</StatusMessage> : null}
        {loading ? <StatusMessage type="loading">{tc("Loading invoice...")}</StatusMessage> : null}
        {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
        {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      </div>

      {invoice ? (
        <div className="mt-5 space-y-5">
      <InvoiceWorkflowGuidance
        invoice={invoice}
        actionLoading={actionLoading}
        canFinalizeInvoice={canFinalizeInvoice}
        canCreateCustomerPayment={canCreateCustomerPayment}
        returnTo={returnTo}
        onFinalize={() => void runAction("finalize")}
        onDownloadPdf={() => void downloadInvoicePdf()}
      />

          <AttachmentPanel linkedEntityType="SALES_INVOICE" linkedEntityId={invoice.id} />

          <RelatedDeliveryNotesPanel sourceKind="invoice" deliveryNotes={relatedDeliveryNotes} loading={relatedDeliveryNotesLoading} />

          <RelatedCollectionCasesPanel
            invoice={invoice}
            collectionCases={collectionCases}
            loading={collectionCasesLoading}
            canCreateCollectionCase={canCreateCollectionCase}
            returnTo={returnTo}
          />

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Customer")} value={invoice.customer?.displayName ?? invoice.customer?.name ?? "-"} />
              <Summary label={tc("Status")} value={tc(salesInvoiceStatusLabel(invoice.status))} />
              <Summary label={tc("Issue date")} value={formatAppDate(invoice.issueDate, locale, "-")} />
              <Summary label={tc("Due date")} value={formatAppDate(invoice.dueDate, locale)} />
              <Summary label={tc("Currency")} value={<bdi dir="ltr">{invoice.currency}</bdi>} />
              <Summary label={tc("Branch")} value={invoice.branch?.displayName ?? invoice.branch?.name ?? "-"} />
              <Summary label={tc("Payment state")} value={tc(deriveInvoicePaymentState(invoice.total, invoice.balanceDue))} />
              <Summary label={tc("Total")} value={formatAppMoney(invoiceDisplayTotals?.total ?? invoice.total, invoice.currency, locale)} />
              <Summary label={tc("Balance due")} value={formatAppMoney(invoice.status === "DRAFT" ? (invoiceDisplayTotals?.total ?? invoice.total) : invoice.balanceDue, invoice.currency, locale)} />
              {foreignPostingBlocked ? <Summary label={tc("Base equivalent")} value={formatAppMoney(invoice.total, invoice.baseCurrency ?? invoice.currency, locale)} /> : null}
              <Summary label={tc("Journal entry")} value={invoice.journalEntry ? <><bdi dir="ltr">{invoice.journalEntry.entryNumber}</bdi> (<bdi dir="ltr">{invoice.journalEntry.id}</bdi>)</> : "-"} />
              <Summary label={tc("Reversal journal")} value={invoice.reversalJournalEntry ? <><bdi dir="ltr">{invoice.reversalJournalEntry.entryNumber}</bdi> (<bdi dir="ltr">{invoice.reversalJournalEntry.id}</bdi>)</> : "-"} />
              <Summary label={tc("Finalized")} value={formatAppDateTime(invoice.finalizedAt, locale, "-")} />
              <Summary label={tc("Notes")} value={invoice.notes ?? "-"} />
              <Summary label={tc("Terms")} value={invoice.terms ?? "-"} />
            </div>
          </div>

          {stockIssueStatus ? <StockIssueStatusPanel status={stockIssueStatus} /> : null}

          {showUaeEinvoicing ? (
            canViewCompliance ? (
              <UaeEinvoiceReadinessPanel
                title={tc("UAE eInvoicing/PINT-AE readiness")}
                response={uaeReadiness}
                actionLoading={actionLoading}
                canValidate={canValidateCompliance}
                onValidate={() => void validateUaeReadiness()}
              />
            ) : (
              <StatusMessage type="info">{tc("UAE eInvoicing readiness requires compliance view permission.")}</StatusMessage>
            )
          ) : null}

          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
            <table className="w-full min-w-[1040px] text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                <tr>
                  <th className="px-4 py-3">{tc("Description")}</th>
                  <th className="px-4 py-3">{tc("Account")}</th>
                  <th className="px-4 py-3">{tc("Qty")}</th>
                  <th className="px-4 py-3">{tc("Unit price")}</th>
                  <th className="px-4 py-3">{tc("Gross")}</th>
                  <th className="px-4 py-3">{tc("Discount")}</th>
                  <th className="px-4 py-3">{tc("Taxable")}</th>
                  <th className="px-4 py-3">{tc("Tax")}</th>
                  <th className="px-4 py-3">{tc("Line total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines?.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 font-medium text-ink">{line.description}</td>
                    <td className="px-4 py-3 text-steel">{line.account ? <><bdi dir="ltr">{line.account.code}</bdi> {line.account.name}</> : "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{line.quantity}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(line.unitPrice, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineGrossAmount, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).discountAmount, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxableAmount, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).taxAmount, invoice.currency, locale)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(transactionLineDisplayAmounts(line).lineTotal, invoice.currency, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm shadow-panel sm:ms-auto">
            <span className="text-steel">{tc("Subtotal")}</span>
            <span className="text-end font-mono">{formatAppMoney(invoiceDisplayTotals?.subtotal ?? invoice.subtotal, invoice.currency, locale)}</span>
            <span className="text-steel">{tc("Discount")}</span>
            <span className="text-end font-mono">{formatAppMoney(invoiceDisplayTotals?.discountTotal ?? invoice.discountTotal, invoice.currency, locale)}</span>
            <span className="text-steel">{tc("Taxable")}</span>
            <span className="text-end font-mono">{formatAppMoney(invoiceDisplayTotals?.taxableTotal ?? invoice.taxableTotal, invoice.currency, locale)}</span>
            <span className="text-steel">{tc("VAT")}</span>
            <span className="text-end font-mono">{formatAppMoney(invoiceDisplayTotals?.taxTotal ?? invoice.taxTotal, invoice.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Total")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(invoiceDisplayTotals?.total ?? invoice.total, invoice.currency, locale)}</span>
            <span className="font-semibold text-ink">{tc("Balance due")}</span>
            <span className="text-end font-mono font-semibold text-ink">{formatAppMoney(invoice.status === "DRAFT" ? (invoiceDisplayTotals?.total ?? invoice.total) : invoice.balanceDue, invoice.currency, locale)}</span>
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Payments")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("{state} with {amount} balance due.", { state: tc(deriveInvoicePaymentState(invoice.total, invoice.balanceDue)), amount: formatAppMoney(invoice.balanceDue, invoice.currency, locale) })}</p>
              </div>
              {invoice.status === "FINALIZED" && (canCreateCustomerPayment || canCreateCreditNote) ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {canCreateCustomerPayment ? (
                    <Link
                      href={`/sales/customer-payments/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(invoiceDetailHref)}`}
                      className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50"
                    >
                      {tc("Record payment")}
                    </Link>
                  ) : null}
                  {canCreateCreditNote ? (
                    <Link
                      href={`/sales/credit-notes/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(invoiceDetailHref)}`}
                      className="rounded-md border border-palm px-3 py-2 text-center text-sm font-medium text-palm hover:bg-teal-50"
                    >
                      {tc("Create credit note")}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            {invoice.paymentAllocations && invoice.paymentAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Payment")}</th>
                      <th className="px-4 py-3">{tc("Date")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.paymentAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.payment?.paymentNumber ?? allocation.paymentId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.payment?.paymentDate, locale, "-")}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment?.status ? tc(allocation.payment.status) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, invoice.currency, locale)}</td>
                        <td className="px-4 py-3">
                          {allocation.payment ? (
                            <Link href={`/sales/customer-payments/${allocation.payment.id}?returnTo=${encodeURIComponent(invoiceDetailHref)}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                              {tc("View payment")}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">
                  {tc("No payments have been applied yet. Finalized invoices can be paid from the Record payment action.")}
                </StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{tc("Unapplied payment applications")}</h2>
              <p className="mt-1 text-sm text-steel">{tc("Unapplied customer payment credits matched to this invoice. These rows are balance matching records, not accounting postings.")}</p>
            </div>
            {invoice.paymentUnappliedAllocations && invoice.paymentUnappliedAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Payment")}</th>
                      <th className="px-4 py-3">{tc("Payment date")}</th>
                      <th className="px-4 py-3">{tc("Payment status")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Allocation status")}</th>
                      <th className="px-4 py-3">{tc("Reversed")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.paymentUnappliedAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.payment?.paymentNumber ?? allocation.paymentId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.payment?.paymentDate, locale, "-")}</td>
                        <td className="px-4 py-3 text-steel">{allocation.payment?.status ? tc(allocation.payment.status) : "-"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, invoice.currency, locale)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${customerPaymentUnappliedAllocationStatusBadgeClass(allocation)}`}>
                            {tc(customerPaymentUnappliedAllocationStatusLabel(allocation))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-steel">{formatAppDateTime(allocation.reversedAt, locale, "-")}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/customer-payments/${allocation.paymentId}?returnTo=${encodeURIComponent(invoiceDetailHref)}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            {tc("View payment")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">{tc("No unapplied payment credit has been matched to this invoice.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Credit notes")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Linked credit notes reduce customer receivables when finalized. Applications reduce this invoice balance due without another journal entry.")}</p>
              </div>
              {invoice.status === "FINALIZED" && canCreateCreditNote ? (
                <Link href={`/sales/credit-notes/new?customerId=${invoice.customerId}&invoiceId=${invoice.id}`} className="self-start rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50">
                  {tc("Create credit note")}
                </Link>
              ) : null}
            </div>
            {invoice.creditNotes && invoice.creditNotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Credit note")}</th>
                      <th className="px-4 py-3">{tc("Issue date")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Total")}</th>
                      <th className="px-4 py-3">{tc("Unapplied")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.creditNotes.map((creditNote) => (
                      <tr key={creditNote.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{creditNote.creditNoteNumber}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(creditNote.issueDate, locale, "-")}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(creditNote.status)}`}>{tc(creditNoteStatusLabel(creditNote.status))}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(creditNote.total, creditNote.currency, locale)}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(creditNote.unappliedAmount, creditNote.currency, locale)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/credit-notes/${creditNote.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            {tc("View credit note")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">{tc("No credit notes are linked to this invoice.")}</StatusMessage>
              </div>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-ink">{tc("Credit applications")}</h2>
              <p className="mt-1 text-sm text-steel">{tc("Credit note allocations applied to this invoice. These rows are matching records, not accounting postings.")}</p>
            </div>
            {invoice.creditNoteAllocations && invoice.creditNoteAllocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-start text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-4 py-3">{tc("Credit note")}</th>
                      <th className="px-4 py-3">{tc("Issue date")}</th>
                      <th className="px-4 py-3">{tc("Status")}</th>
                      <th className="px-4 py-3">{tc("Amount applied")}</th>
                      <th className="px-4 py-3">{tc("Allocation")}</th>
                      <th className="px-4 py-3">{tc("Reversed")}</th>
                      <th className="px-4 py-3">{tc("Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.creditNoteAllocations.map((allocation) => (
                      <tr key={allocation.id}>
                        <td className="px-4 py-3 font-mono text-xs"><bdi dir="ltr">{allocation.creditNote?.creditNoteNumber ?? allocation.creditNoteId}</bdi></td>
                        <td className="px-4 py-3 text-steel">{formatAppDate(allocation.creditNote?.issueDate, locale, "-")}</td>
                        <td className="px-4 py-3">
                          {allocation.creditNote ? (
                            <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteStatusBadgeClass(allocation.creditNote.status)}`}>{tc(creditNoteStatusLabel(allocation.creditNote.status))}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{formatAppMoney(allocation.amountApplied, invoice.currency, locale)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${creditNoteAllocationStatusBadgeClass(allocation)}`}>{tc(creditNoteAllocationStatusLabel(allocation))}</span>
                        </td>
                        <td className="px-4 py-3 text-steel">{formatAppDateTime(allocation.reversedAt, locale, "-")}</td>
                        <td className="px-4 py-3">
                          <Link href={`/sales/credit-notes/${allocation.creditNoteId}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            {tc("View credit note")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-4">
                <StatusMessage type="empty">{tc("No credit note allocations have been applied to this invoice.")}</StatusMessage>
              </div>
            )}
          </div>

          {canViewZatca ? (
          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-ink">{tc("Local ZATCA readiness groundwork")}</h2>
                <p className="mt-1 text-sm text-steel">{tc("Local XML/QR metadata generation only. No production ZATCA submission, clearance, reporting, or compliance claim.")}</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tc(zatcaStatusLabel(zatca?.zatcaStatus))}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-4">
              <Summary label={tc("Invoice UUID")} value={ltrValue(zatca?.invoiceUuid)} />
              <Summary label={tc("ICV")} value={zatca?.icv === null || zatca?.icv === undefined ? "-" : String(zatca.icv)} />
              <Summary label={tc("Invoice hash")} value={ltrValue(truncateHash(zatca?.invoiceHash))} />
              <Summary label={tc("Previous hash")} value={ltrValue(truncateHash(zatca?.previousInvoiceHash))} />
              <Summary label={tc("EGS unit")} value={zatca?.egsUnit?.name ?? "-"} />
              <Summary label={tc("Generated")} value={formatAppDateTime(zatca?.generatedAt, locale, "-")} />
              <Summary label={tc("Latest ZATCA action")} value={latestZatcaSubmission ? tc(zatcaStatusLabel(latestZatcaSubmission.submissionType)) : "-"} />
              <Summary label={tc("Action status")} value={latestZatcaSubmission ? tc(zatcaStatusLabel(latestZatcaSubmission.status)) : "-"} />
              <Summary label={tc("Last error")} value={zatca?.lastErrorMessage ?? "-"} />
              <Summary label={tc("Action error")} value={latestZatcaSubmission?.errorMessage ?? "-"} />
            </div>

            {zatcaReadiness ? (
              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("ZATCA readiness")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Read-only seller, buyer, invoice, EGS, and XML checks. No ICV, metadata, or EGS hash mutation.")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${zatcaReadinessStatusBadgeClass(zatcaReadiness.status)}`}>
                    {tc(zatcaReadinessStatusLabel(zatcaReadiness.status))}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <InvoiceReadinessSectionCard title="Seller" section={zatcaReadiness.sellerProfile} />
                  <InvoiceReadinessSectionCard title="Buyer" section={zatcaReadiness.buyerContact} />
                  <InvoiceReadinessSectionCard title="Invoice" section={zatcaReadiness.invoice} />
                  <InvoiceReadinessSectionCard title="EGS" section={zatcaReadiness.egs} />
                  <InvoiceReadinessSectionCard title="XML" section={zatcaReadiness.xml} />
                  <InvoiceReadinessSectionCard title="Signing" section={zatcaReadiness.signing} />
                  <InvoiceReadinessSectionCard title="Signed artifact" section={zatcaReadiness.signedArtifactPromotion} />
                  <InvoiceReadinessSectionCard title="Artifact storage" section={zatcaReadiness.signedArtifactStorage} />
                  <InvoiceReadinessSectionCard title="Phase 2 QR" section={zatcaReadiness.phase2Qr} />
                  <InvoiceReadinessSectionCard title="PDF/A-3" section={zatcaReadiness.pdfA3} />
                </div>
                <p className="mt-3 text-xs text-amber-700">
                  {tc("Metadata-only storage planning is available through the API, but signed XML bodies and QR payloads are not persisted. Future object storage, retention, real CSID/certificate/key custody, and clearance/reporting remain blocked.")}
                </p>
              </div>
            ) : null}

            {signedArtifactStoragePlan ? (
              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("Signed artifact metadata drafts")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Metadata-only planning records. Signed XML bodies and QR payload bodies are not stored.")}</p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                    {localizeStatus(signedArtifactStoragePlan.storageCapabilityStatus)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-5">
                  <Summary label={tc("Draft count")} value={String(signedArtifactStoragePlan.draftCount)} />
                  <Summary label={tc("Latest draft")} value={localizeStatus(latestSignedArtifactDraft?.status)} />
                  <Summary label={tc("Object storage")} value={tc(signedArtifactStoragePlan.objectStorageCapability.objectStorageConfigured ? "Configured with warnings" : "Blocked")} />
                  <Summary label={tc("Probe")} value={tc(signedArtifactStoragePlan.storageProbePlan.executionFlagEnabled ? "Enabled by env" : "Disabled by default")} />
                  <Summary label={tc("Immutable policy")} value={tc(signedArtifactStoragePlan.immutablePolicyStatus.policyApproved ? "Approved" : "Not approved")} />
                  <Summary label={tc("Retention review")} value={tc(signedArtifactStoragePlan.immutablePolicyStatus.retentionDurationApproved ? "Approved" : "Required")} />
                  <Summary label={tc("Body persistence")} value={tc(signedArtifactStoragePlan.bodyPersistenceAllowed ? "Allowed" : "Blocked")} />
                </div>
                <div className="mt-3 rounded-md bg-white p-3 text-xs text-steel">
                  {tc("Storage keys remain null in this phase. Future body storage needs tenant-scoped object keys, approved immutable policy, legal retention review, object versioning, restore testing, real CSID/certificate/key custody, and a separate promotion workflow.")}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void createSignedArtifactDraft()}
                    disabled={actionLoading || !canManageZatca || !signedArtifactStoragePlan.metadataOnlyDraftAllowed}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tc("Create metadata-only draft")}
                  </button>
                  <span className="text-xs text-amber-700">{tc("No signed XML body, QR payload body, CSID request, ZATCA network call, or submission.")}</span>
                </div>
                {latestSignedArtifactDraft ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                    <Summary label={tc("Source")} value={localizeStatus(latestSignedArtifactDraft.source)} />
                    <Summary label={tc("Dummy material")} value={yesNo(latestSignedArtifactDraft.signedWithDummyMaterial)} />
                    <Summary label={tc("Production compliance")} value={yesNo(latestSignedArtifactDraft.productionCompliance)} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {signingPlan ? (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("Signing plan")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Dry-run SDK `-sign` command planning only. The command is not executed and no invoice metadata is changed.")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${signingPlan.executionEnabled ? "bg-amber-100 text-amber-800" : "bg-rose-50 text-rosewood"}`}>
                    {tc(signingPlan.executionEnabled ? "Execution flag enabled" : "Execution disabled")}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <Summary label={tc("Dry run")} value={yesNo(signingPlan.dryRun)} />
                  <Summary label={tc("No mutation")} value={yesNo(signingPlan.noMutation)} />
                  <Summary label={tc("Production compliance")} value={yesNo(signingPlan.productionCompliance)} />
                </div>
                {signingPlan.commandPlan.displayCommand ? (
                  <div className="mt-3 rounded-md bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Planned command")}</div>
                    <div className="mt-1 break-all font-mono text-xs text-ink"><bdi dir="ltr">{signingPlan.commandPlan.displayCommand}</bdi></div>
                  </div>
                ) : null}
                {signingPlan.blockers.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rosewood">
                    {signingPlan.blockers.slice(0, 5).map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={runLocalSigningDryRun}
                    disabled={actionLoading}
                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tc("View local signing dry-run")}
                  </button>
                  <span className="text-xs text-amber-700">{tc("Local-only. Default gate is disabled; no CSID, network, submission, or persistence.")}</span>
                </div>
                {localSigningDryRun ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-white p-3 text-xs">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-8">
                      <Summary label={tc("Execution status")} value={localizeStatus(localSigningDryRun.executionStatus)} />
                      <Summary label={tc("Execution enabled")} value={yesNo(localSigningDryRun.executionEnabled)} />
                      <Summary label={tc("Execution attempted")} value={yesNo(localSigningDryRun.executionAttempted)} />
                      <Summary label={tc("Temp SDK staged")} value={yesNo(localSigningDryRun.tempFilesWritten.sdkRuntime)} />
                      <Summary label={tc("SDK signing executed")} value={yesNo(localSigningDryRun.signingExecuted)} />
                      <Summary label={tc("SDK QR executed")} value={yesNo(localSigningDryRun.qrExecuted)} />
                      <Summary label={tc("Signed XML detected")} value={yesNo(localSigningDryRun.signedXmlDetected)} />
                      <Summary label={tc("Phase 2 QR detected")} value={yesNo(localSigningDryRun.qrDetected)} />
                    </div>
                    {localSigningDryRun.phase2Qr.dependencyChain.length ? (
                      <p className="mt-2 text-steel">
                        {tc("QR dependency chain: {chain}", { chain: localSigningDryRun.phase2Qr.dependencyChain.join(" -> ") })}
                      </p>
                    ) : null}
                    {localSigningDryRun.blockers.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-rosewood">
                        {localSigningDryRun.blockers.slice(0, 4).map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-amber-700">{tc("Certificate/private-key material, signed XML bodies, CSID tokens, OTPs, and QR payload bodies are not shown or stored.")}</p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {invoice.status === "FINALIZED" && canGenerateZatca ? (
                <button type="button" onClick={() => void generateZatca()} disabled={actionLoading} className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                  {tc("Generate ZATCA XML/QR")}
                </button>
              ) : null}
              {zatca?.xmlBase64 ? (
                <button type="button" onClick={() => void downloadZatcaXml()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Download XML")}
                </button>
              ) : null}
              {zatca?.qrCodeBase64 ? (
                <button type="button" onClick={() => void loadQrPayload()} disabled={actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("View QR payload")}
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runZatcaSubmission("compliance-check")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                  {tc("Run local/mock compliance check")}
                </button>
              ) : null}
              {canManageZatca ? (
                <button type="button" onClick={() => void runZatcaSubmission("clearance")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Check clearance blocker")}
                </button>
              ) : null}
              {canManageZatca ? (
                <button type="button" onClick={() => void runZatcaSubmission("reporting")} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Check reporting blocker")}
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runSdkValidationDryRun()} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("SDK validation dry run")}
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runLocalSdkValidation()} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-palm px-3 py-2 text-sm font-medium text-palm hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400">
                  {tc("Run local SDK validation")}
                </button>
              ) : null}
              {canRunZatcaChecks ? (
                <button type="button" onClick={() => void runHashComparison()} disabled={!zatca?.xmlBase64 || actionLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400">
                  {tc("Compare SDK hash")}
                </button>
              ) : null}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                  <h3 className="text-sm font-semibold text-ink">{tc("Local XML validation")}</h3>
                  <p className="mt-1 text-xs text-steel">{tc("Local structural checks only. This is not official ZATCA SDK validation.")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${xmlValidation?.valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {tc(zatcaXmlValidationLabel(xmlValidation?.valid))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshXmlValidation()}
                    disabled={actionLoading}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {tc("Refresh check")}
                  </button>
                </div>
              </div>
              {shouldShowZatcaLocalOnlyWarning(xmlValidation) ? (
                <p className="mt-3 text-xs text-amber-700">{tc("Official ZATCA/FATOORA validation, signing, and clearance/reporting are still pending.")}</p>
              ) : null}
              {xmlValidation?.errors.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rosewood">
                  {xmlValidation.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {xmlValidation?.warnings.length ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-steel">
                  {xmlValidation.warnings.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {sdkDryRun ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("SDK validation dry run")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Command planning only. The official SDK was not executed and no ZATCA network call was made.")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${sdkDryRun.readiness.canAttemptSdkValidation ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {tc(sdkDryRun.readiness.canAttemptSdkValidation ? "Plan ready" : "Plan blocked")}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <Summary label={tc("XML source")} value={localizeStatus(sdkDryRun.xmlSource)} />
                  <Summary label={tc("SDK JAR")} value={tc(sdkDryRun.readiness.sdkJarFound ? "Found" : "Missing")} />
                  <Summary label={tc("Java")} value={sdkDryRun.readiness.javaVersion ? ltrValue(sdkDryRun.readiness.javaVersion) : tc(sdkDryRun.readiness.javaFound ? "Detected" : "Missing")} />
                </div>
                {sdkDryRun.commandPlan.displayCommand ? (
                  <div className="mt-3 rounded-md bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Planned command")}</div>
                    <div className="mt-1 break-all font-mono text-xs text-ink"><bdi dir="ltr">{sdkDryRun.commandPlan.displayCommand}</bdi></div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-700">{tc("No executable SDK command could be planned with the current local setup.")}</p>
                )}
                {sdkDryRun.warnings.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-700">
                    {sdkDryRun.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {sdkValidation ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("Local SDK validation result")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Official SDK local execution only. This does not submit to ZATCA and does not prove production compliance.")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${sdkValidation.success ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {tc(zatcaSdkValidationResultLabel(sdkValidation))}
                  </span>
                </div>
                {shouldShowZatcaSdkLocalOnlyWarning(sdkValidation) ? (
                  <p className="mt-3 text-xs text-amber-700">{tc("This is local-only SDK validation. It does not sign, clear, report, or certify the invoice for production.")}</p>
                ) : null}
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <Summary label={tc("SDK exit code")} value={sdkValidation.sdkExitCode === null ? "-" : String(sdkValidation.sdkExitCode)} />
                  <Summary label={tc("XML source")} value={localizeStatus(sdkValidation.xmlSource)} />
                  <Summary label={tc("Official attempted")} value={sdkValidation.officialValidationAttempted ? tc("Yes, local SDK only") : tc("No")} />
                </div>
                {sdkValidation.blockingReasons.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rosewood">
                    {sdkValidation.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                {sdkValidation.validationMessages.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-steel">
                    {sdkValidation.validationMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {hashComparison ? (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{tc("SDK hash comparison")}</h3>
                    <p className="mt-1 text-xs text-steel">{tc("Read-only comparison against the official SDK generateHash command. Metadata, ICV, and EGS last hash are not updated.")}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${hashComparison.hashComparisonStatus === "MATCH" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                    {tc(zatcaHashComparisonLabel(hashComparison.hashComparisonStatus))}
                  </span>
                </div>
                <p className="mt-3 text-xs text-amber-700">{tc("Local-only, no mutation, no signing, no clearance/reporting, and no production compliance claim.")}</p>
                {shouldShowZatcaHashMismatchWarning(hashComparison) ? (
                  <p className="mt-2 text-xs text-rosewood">
                    {tc(hashComparison.egsHashMode === "SDK_GENERATED" || hashComparison.metadataHashModeSnapshot === "SDK_GENERATED"
                      ? "Stored hash does not match current SDK hash; XML may have changed or metadata is stale."
                      : "LedgerByte stores local deterministic hashes unless SDK hash mode is explicitly enabled on a fresh EGS unit.")}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                  <Summary label={tc("App hash")} value={ltrValue(truncateHash(hashComparison.appHash))} />
                  <Summary label={tc("SDK hash")} value={ltrValue(truncateHash(hashComparison.sdkHash))} />
                  <Summary label={tc("Stored hash")} value={ltrValue(truncateHash(zatca?.invoiceHash))} />
                  <Summary label={tc("No mutation")} value={yesNo(hashComparison.noMutation)} />
                  <Summary label={tc("SDK exit code")} value={hashComparison.sdkExitCode === null ? "-" : String(hashComparison.sdkExitCode)} />
                  <Summary label={tc("Hash mode")} value={tc(hashComparison.hashMode.mode.replaceAll("_", " "))} />
                  <Summary label={tc("EGS hash mode")} value={tc(zatcaHashModeLabel(hashComparison.egsHashMode))} />
                  <Summary label={tc("Metadata hash mode")} value={tc(zatcaHashModeLabel(hashComparison.metadataHashModeSnapshot))} />
                  <Summary label={tc("ICV")} value={hashComparison.icv === null ? "-" : String(hashComparison.icv)} />
                </div>
                {hashComparison.blockingReasons.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-rosewood">
                    {hashComparison.blockingReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                {hashComparison.warnings.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-steel">
                    {hashComparison.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {qrPayload ? (
              <div className="mt-4 rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-steel">{tc("Basic TLV QR payload")}</div>
                <div className="mt-1 break-all font-mono text-xs text-ink"><bdi dir="ltr">{qrPayload}</bdi></div>
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function InvoiceWorkflowGuidance({
  invoice,
  actionLoading,
  canFinalizeInvoice,
  canCreateCustomerPayment,
  returnTo = "",
  onFinalize,
  onDownloadPdf,
}: {
  invoice: SalesInvoice;
  actionLoading: boolean;
  canFinalizeInvoice: boolean;
  canCreateCustomerPayment: boolean;
  returnTo?: string;
  onFinalize: () => void;
  onDownloadPdf: () => void;
}) {
  const { locale, tc } = useAppLocale();
  const paymentState = deriveInvoicePaymentState(invoice.total, invoice.balanceDue);
  const customerName = invoice.customer?.displayName ?? invoice.customer?.name ?? tc("this customer");
  const hasBalanceDue = paymentState !== "Paid";
  const statusLabel = tc(salesInvoiceStatusLabel(invoice.status));
  const foreignPostingBlocked = foreignDocumentPostingIsBlocked(invoice);
  const displayTotals = transactionDocumentDisplayTotals(invoice);
  const invoiceDetailHref = salesInvoiceDetailHref(invoice.id, returnTo);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tc("What happened?")}</h2>
            <p className="mt-1 text-sm leading-6 text-steel">{tc(invoiceOutcomeDescription(invoice, paymentState))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-md px-2 py-1 text-xs font-semibold ${salesInvoiceStatusBadgeClass(invoice.status)}`}>
              {statusLabel}
            </span>
            {invoice.status === "FINALIZED" ? (
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${invoicePaymentStateBadgeClass(paymentState)}`}>
                {tc(paymentState)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Summary label={tc("Customer")} value={customerName} />
          <Summary label={tc("Balance due")} value={formatAppMoney(invoice.status === "DRAFT" ? displayTotals.total : invoice.balanceDue, invoice.currency, locale)} />
          <Summary label={tc("Journal")} value={invoice.journalEntry ? <><bdi dir="ltr">{invoice.journalEntry.entryNumber}</bdi> {tc("posted")}</> : tc("Not posted yet")} />
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">{tc("Next actions")}</h2>
        <p className="mt-1 text-sm leading-6 text-steel">{tc(invoiceNextActionDescription(invoice, paymentState, canCreateCustomerPayment))}</p>
        <div className="mt-4 flex flex-col gap-2">
          {invoice.status === "DRAFT" && canFinalizeInvoice ? (
            <button
              type="button"
              onClick={onFinalize}
              disabled={actionLoading || foreignPostingBlocked}
              className="rounded-md bg-palm px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {tc("Finalize invoice")}
            </button>
          ) : null}
          {invoice.status === "DRAFT" && foreignPostingBlocked ? (
            <p className="text-xs leading-5 text-amber-700">{tc(FOREIGN_DOCUMENT_POSTING_BLOCKED_MESSAGE)}</p>
          ) : null}
          {invoice.status === "FINALIZED" && hasBalanceDue && invoice.customerId && canCreateCustomerPayment ? (
            <Link
              href={`/sales/customer-payments/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(invoiceDetailHref)}`}
              className="rounded-md bg-palm px-3 py-2 text-center text-sm font-semibold text-white hover:bg-teal-800"
            >
              {tc("Record payment")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={actionLoading}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {tc("Download invoice PDF")}
          </button>
          {invoice.customerId ? (
            <Link href={`/customers/${invoice.customerId}`} className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("View customer ledger")}
            </Link>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/reports/profit-and-loss" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("View report")}
            </Link>
            <Link href="/dashboard" className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">
              {tc("Dashboard")}
            </Link>
          </div>
        </div>
        {invoice.status === "DRAFT" && !canFinalizeInvoice ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("You need invoice finalization permission before this draft can be posted.")}</p>
        ) : null}
        {invoice.status === "FINALIZED" && hasBalanceDue && !canCreateCustomerPayment ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("You need customer payment permission to record money against this invoice.")}</p>
        ) : null}
        {invoice.status === "VOIDED" ? (
          <p className="mt-3 text-xs leading-5 text-steel">{tc("Voided invoices are closed for payment. Review the reversal journal details below if present.")}</p>
        ) : null}
        <SourceDocumentGuidance className="mt-4" />
      </div>
    </div>
  );
}

function salesInvoiceDetailHref(invoiceId: string, returnTo = ""): string {
  const href = `/sales/invoices/${encodeURIComponent(invoiceId)}`;
  return returnTo ? `${href}?returnTo=${encodeURIComponent(returnTo)}` : href;
}

function salesInvoiceStatusLabel(status: SalesInvoice["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "FINALIZED":
      return "Finalized/posted";
    case "VOIDED":
      return "Voided";
  }
}

function salesInvoiceStatusBadgeClass(status: SalesInvoice["status"]): string {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "FINALIZED":
      return "bg-emerald-50 text-emerald-700";
    case "VOIDED":
      return "bg-rose-50 text-rosewood";
  }
}

function invoicePaymentStateBadgeClass(paymentState: ReturnType<typeof deriveInvoicePaymentState>): string {
  switch (paymentState) {
    case "Paid":
      return "bg-emerald-50 text-emerald-700";
    case "Partially paid":
      return "bg-amber-50 text-amber-700";
    case "Unpaid":
      return "bg-slate-100 text-slate-700";
  }
}

function invoiceOutcomeDescription(invoice: SalesInvoice, paymentState: ReturnType<typeof deriveInvoicePaymentState>): string {
  if (invoice.status === "DRAFT") {
    return "This draft is saved and editable. It has not posted accounting entries yet, so finalize it only after the customer, lines, tax, and totals are ready.";
  }

  if (invoice.status === "VOIDED") {
    return "This invoice is voided. It is closed for new payments and any reversal journal details remain visible for review.";
  }

  if (paymentState === "Paid") {
    return "This invoice is finalized, accounting entries are posted, and customer payments or credits have cleared the balance.";
  }

  if (paymentState === "Partially paid") {
    return "This invoice is finalized and posted, with part of the balance already paid. Record another payment or credit note when the remaining balance is settled.";
  }

  return "This invoice is finalized and posted. The receivable is open, so the next operating step is recording the customer payment when money is received.";
}

function invoiceNextActionDescription(invoice: SalesInvoice, paymentState: ReturnType<typeof deriveInvoicePaymentState>, canCreateCustomerPayment: boolean): string {
  if (invoice.status === "DRAFT") {
    return "Finalize the invoice to post the accounting entry, then record payment from the invoice or customer payment screen.";
  }

  if (invoice.status === "VOIDED") {
    return "Use the links below for review and reporting. Create a new invoice if the customer needs a replacement document.";
  }

  if (paymentState === "Paid") {
    return "The receivables loop is complete. Review the customer ledger, PDF, dashboard, or reports for the business result.";
  }

  return canCreateCustomerPayment
    ? "Record payment next, then review the customer ledger and reports to confirm the sale is reflected."
    : "Payment is still due, but your role cannot record customer payments.";
}

function zatcaActionSuccessMessage(action: "compliance-check" | "clearance" | "reporting"): string {
  switch (action) {
    case "compliance-check":
      return "Local/mock compliance check recorded. No ZATCA network submission was made.";
    case "clearance":
      return "Clearance readiness response recorded. No production clearance was requested.";
    case "reporting":
      return "Reporting readiness response recorded. No production reporting was requested.";
  }
}

function RelatedCollectionCasesPanel({
  invoice,
  collectionCases,
  loading,
  canCreateCollectionCase,
  returnTo = "",
}: {
  invoice: SalesInvoice;
  collectionCases: CollectionCase[];
  loading: boolean;
  canCreateCollectionCase: boolean;
  returnTo?: string;
}) {
  const { locale, tc } = useAppLocale();
  const hasOpenCase = collectionCases.some((collectionCase) => !["PAID", "CLOSED", "CANCELLED"].includes(collectionCase.status));
  const canCreateFromInvoice = invoice.status === "FINALIZED" && Number(invoice.balanceDue) > 0 && canCreateCollectionCase && !hasOpenCase;
  const createHref = `/sales/collections/new?customerId=${encodeURIComponent(invoice.customerId)}&invoiceId=${encodeURIComponent(invoice.id)}&returnTo=${encodeURIComponent(salesInvoiceDetailHref(invoice.id, returnTo))}`;

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Related collection cases")}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">{tc(collectionsSafeWording)}</p>
        </div>
        {canCreateFromInvoice ? (
          <Link href={createHref} className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {tc("Create collection case")}
          </Link>
        ) : null}
      </div>
      {loading ? <div className="mt-3"><StatusMessage type="loading">{tc("Loading collection cases...")}</StatusMessage></div> : null}
      {!loading && collectionCases.length === 0 ? <p className="mt-3 text-sm text-steel">{tc("No collection case is linked to this invoice.")}</p> : null}
      {collectionCases.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
              <tr>
                <th className="px-3 py-2">{tc("Case")}</th>
                <th className="px-3 py-2">{tc("Status")}</th>
                <th className="px-3 py-2">{tc("Priority")}</th>
                <th className="px-3 py-2">{tc("Next follow-up")}</th>
                <th className="px-3 py-2">{tc("Promise")}</th>
                <th className="px-3 py-2">{tc("Latest activity")}</th>
                <th className="px-3 py-2">{tc("Action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {collectionCases.map((collectionCase) => (
                <tr key={collectionCase.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link href={`/sales/collections/${collectionCase.id}`} className="text-palm hover:text-teal-800"><bdi dir="ltr">{collectionCase.caseNumber}</bdi></Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${collectionStatusBadgeClass(collectionCase.status)}`}>{tc(collectionStatusLabel(collectionCase.status))}</span>
                  </td>
                  <td className="px-3 py-2 text-steel">{tc(collectionCase.priority)}</td>
                  <td className="px-3 py-2 text-steel">{formatAppDate(collectionCase.nextActionAt ?? collectionCase.followUpDate, locale, "-")}</td>
                  <td className="px-3 py-2 text-steel">{formatAppDate(collectionCase.promisedPaymentDate, locale, "-")} {collectionCase.promisedAmount ? `/ ${formatAppMoney(collectionCase.promisedAmount, invoice.currency, locale)}` : ""}</td>
                  <td className="px-3 py-2 text-steel">{collectionCase.activities?.[0] ? tc(collectionActivityTypeLabel(collectionCase.activities[0].activityType)) : "-"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/sales/collections/${collectionCase.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {tc("Open")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 break-words font-medium text-ink">{value}</div>
    </div>
  );
}

function InvoiceReadinessSectionCard({ title, section }: { title: string; section: ZatcaReadinessSection }) {
  const { tc } = useAppLocale();
  const primaryCheck = section.checks.find((check) => check.severity === "ERROR") ?? section.checks.find((check) => check.severity === "WARNING") ?? section.checks[0];

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-steel">{tc(title)}</span>
        <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${zatcaReadinessStatusBadgeClass(section.status)}`}>
          {tc(zatcaReadinessStatusLabel(section.status))}
        </span>
      </div>
      {primaryCheck ? (
        <div className="mt-2 text-xs text-steel">
          <div className="font-medium text-ink">{primaryCheck.field}</div>
          <div>{primaryCheck.message}</div>
          {primaryCheck.sourceRule ? <div className="mt-1 text-slate-500">{primaryCheck.sourceRule}</div> : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-emerald-700">{tc("No readiness issues detected.")}</p>
      )}
    </div>
  );
}

function StockIssueStatusPanel({ status }: { status: SalesInvoiceStockIssueStatus }) {
  const { tc } = useAppLocale();

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{tc("Stock issue status")}</h2>
          <p className="mt-1 text-sm text-steel">{tc("Operational stock issue progress for inventory-tracked invoice lines.")}</p>
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryProgressStatusBadgeClass(status.status)}`}>
          {tc(inventoryProgressStatusLabel(status.status))}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-3 py-2">{tc("Item")}</th>
              <th className="px-3 py-2 text-end">{tc("Invoiced")}</th>
              <th className="px-3 py-2 text-end">{tc("Issued")}</th>
              <th className="px-3 py-2 text-end">{tc("Remaining")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status.lines.map((line) => (
              <tr key={line.lineId}>
                <td className="px-3 py-2">{line.item ? <>{line.item.name}{line.item.sku ? <> (<bdi dir="ltr">{line.item.sku}</bdi>)</> : ""}</> : <bdi dir="ltr">{line.lineId}</bdi>}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.invoicedQuantity)}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.issuedQuantity)}</td>
                <td className="px-3 py-2 text-end font-mono text-xs">{formatInventoryQuantity(line.remainingQuantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function hasStockIssueRemaining(status: SalesInvoiceStockIssueStatus): boolean {
  return status.lines.some((line) => line.inventoryTracking && hasRemainingInventoryQuantity(line.remainingQuantity));
}
