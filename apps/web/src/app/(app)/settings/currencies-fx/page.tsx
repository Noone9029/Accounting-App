"use client";

import { useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerErrorState,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerSkeleton,
  LedgerStatusBadge,
} from "@/components/ui/ledger-system";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import {
  createCurrencyRate,
  getFxAccountConfiguration,
  getFxCurrencies,
  getFxReadiness,
  listCurrencyRates,
  saveFxAccountConfiguration,
  type CreateCurrencyRateInput,
  type CurrencyRateListResponse,
  type CurrencyRateQuery,
  type FxAccountConfiguration,
  type FxAccountConfigurationInput,
  type FxCurrencyCatalog,
  type FxReadiness,
} from "@/lib/foreign-exchange";
import { PERMISSIONS } from "@/lib/permissions";
import type { Account } from "@/lib/types";
import { FxAccountForm } from "./fx-account-form";
import { FxRatePermissionPanel, FxReadinessPanel, FxSummary } from "./fx-summary";
import { ManualRateForm } from "./manual-rate-form";
import { RateEvidenceTable } from "./rate-evidence-table";

const initialRateQuery: CurrencyRateQuery = { page: 1, limit: 25 };

export default function CurrenciesAndFxSettingsPage() {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canReadRates = can(PERMISSIONS.fxRates.read);
  const canCaptureRates = can(PERMISSIONS.fxRates.manage);
  const canManageConfiguration = can(PERMISSIONS.currencies.manage);
  const canViewAccounts = can(PERMISSIONS.accounts.view);
  const canSaveConfiguration = canManageConfiguration && canViewAccounts;
  const [catalog, setCatalog] = useState<FxCurrencyCatalog | null>(null);
  const [loadedOrganizationId, setLoadedOrganizationId] = useState<string | null>(null);
  const [rates, setRates] = useState<CurrencyRateListResponse | null>(null);
  const [configuration, setConfiguration] = useState<FxAccountConfiguration | null>(null);
  const [readiness, setReadiness] = useState<FxReadiness | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [savingConfiguration, setSavingConfiguration] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCatalog(null);
    setLoadedOrganizationId(null);
    setRates(null);
    setConfiguration(null);
    setReadiness(null);
    setAccounts([]);
    setMessage("");
    setError("");
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getFxCurrencies(),
      canReadRates ? listCurrencyRates(initialRateQuery) : Promise.resolve(null),
      getFxAccountConfiguration(),
      getFxReadiness(),
      canViewAccounts ? apiRequest<Account[]>("/accounts") : Promise.resolve([]),
    ])
      .then(([catalogResult, rateResult, configurationResult, readinessResult, accountResult]) => {
        if (cancelled) return;
        setCatalog(catalogResult);
        setLoadedOrganizationId(organizationId);
        setRates(rateResult);
        setConfiguration(configurationResult);
        setReadiness(readinessResult);
        setAccounts(accountResult);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load currency and FX settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canReadRates, canViewAccounts, organizationId]);

  async function loadRates(query: CurrencyRateQuery) {
    if (!canReadRates) return;
    setRateLoading(true);
    setError("");
    try {
      setRates(await listCurrencyRates(query));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load captured rates.");
    } finally {
      setRateLoading(false);
    }
  }

  async function captureRate(input: CreateCurrencyRateInput) {
    if (!canCaptureRates) return;
    setSavingRate(true);
    setError("");
    setMessage("");
    try {
      await createCurrencyRate(input);
      await loadRates(initialRateQuery);
      setMessage("Manual rate captured. Existing rates remain immutable.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to capture the manual rate.");
    } finally {
      setSavingRate(false);
    }
  }

  async function saveConfiguration(input: FxAccountConfigurationInput) {
    if (!canSaveConfiguration) return;
    setSavingConfiguration(true);
    setError("");
    setMessage("");
    try {
      const updated = await saveFxAccountConfiguration(input);
      setConfiguration(updated);
      setReadiness(await getFxReadiness());
      setMessage("FX posting accounts saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save FX posting accounts.");
    } finally {
      setSavingConfiguration(false);
    }
  }

  const ready = loadedOrganizationId === organizationId && catalog && readiness;

  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Accounting controls"
        title="Currencies and FX"
        description="Capture auditable manual exchange-rate snapshots and configure future FX posting accounts."
        badge={<LedgerStatusBadge tone="warning">Foundation only</LedgerStatusBadge>}
      />

      {!organizationId ? <StatusMessage type="info">Log in and select an organization to review currency and FX settings.</StatusMessage> : null}
      {organizationId && !canCaptureRates && !canSaveConfiguration ? <StatusMessage type="info">View-only access</StatusMessage> : null}
      {loading ? (
        <div role="status" aria-label="Loading currency and FX settings">
          <LedgerSkeleton label="Loading currency and FX settings" rows={4} />
        </div>
      ) : null}
      {error ? <LedgerErrorState title="Unable to load currency and FX settings" description={error} /> : null}
      {message ? <StatusMessage type="success">{message}</StatusMessage> : null}

      {ready ? (
        <>
          <FxSummary catalog={catalog} readiness={readiness} />
          <LedgerPageBody>
            <div className="grid gap-5 xl:grid-cols-2">
              <ManualRateForm catalog={catalog} canManage={canCaptureRates} saving={savingRate} onCapture={captureRate} />
              <FxReadinessPanel readiness={readiness} />
            </div>
            {canReadRates && rates ? (
              <RateEvidenceTable catalog={catalog} result={rates} loading={rateLoading} onQuery={(query) => void loadRates(query)} />
            ) : (
              <FxRatePermissionPanel />
            )}
            <FxAccountForm
              configuration={configuration}
              accounts={accounts}
              canManage={canSaveConfiguration}
              disabledReason={
                !canManageConfiguration
                  ? "Currency management permission is required to save FX accounts."
                  : "Chart of accounts view permission is required to select FX posting accounts."
              }
              saving={savingConfiguration}
              onSave={saveConfiguration}
            />
          </LedgerPageBody>
        </>
      ) : null}
    </LedgerPage>
  );
}
