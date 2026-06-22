"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { usePermissions } from "@/components/permissions/permission-provider";
import {
  LedgerAlert,
  LedgerButton,
  LedgerDataTable,
  LedgerEmptyState,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerInput,
  LedgerLoadingState,
  LedgerMetadataRow,
  LedgerPage,
  LedgerPageBody,
  LedgerPageHeader,
  LedgerPanel,
  LedgerSection,
  LedgerSelect,
  LedgerStatusBadge,
  LedgerSummaryBand,
  type LedgerStatusTone,
} from "@/components/ui/ledger-system";
import { Textarea } from "@/components/ui/textarea";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryBatchStatusLabel,
  inventoryBinLocationStatusLabel,
  inventoryBinLocationTypeLabel,
  inventorySerialNumberStatusLabel,
  inventoryTraceabilityUrl,
  inventoryTrackingSafeHelperText,
  itemTrackingModeLabel,
  stockMovementTypeLabel,
} from "@/lib/inventory";
import { PERMISSIONS } from "@/lib/permissions";
import type {
  InventoryBatch,
  InventoryBatchStatus,
  InventoryBinLocation,
  InventoryBinLocationStatus,
  InventoryBinLocationType,
  InventorySerialNumber,
  InventorySerialNumberStatus,
  InventoryTraceabilityResponse,
  Item,
  Warehouse,
} from "@/lib/types";

const binLocationTypes: InventoryBinLocationType[] = ["BIN", "SHELF", "ZONE", "STAGING", "RECEIVING", "SHIPPING", "IN_TRANSIT", "RETURNS", "QUARANTINE", "OTHER"];
const binLocationStatuses: InventoryBinLocationStatus[] = ["ACTIVE", "INACTIVE"];
const batchStatuses: InventoryBatchStatus[] = ["ACTIVE", "EXPIRED", "QUARANTINED", "CLOSED"];
const serialStatuses: InventorySerialNumberStatus[] = ["AVAILABLE", "RESERVED", "ISSUED", "RETURNED", "QUARANTINED", "LOST", "SCRAPPED"];

type FormBody = Record<string, string | null>;

export function BinLocationsListPage() {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get("warehouseId");
  const endpoint = warehouseId ? `/inventory/bin-locations?warehouseId=${warehouseId}` : "/inventory/bin-locations";
  const { organizationId, canView, canManage, records, loading, error, reload } = useTraceabilityList<InventoryBinLocation>(endpoint, "Unable to load bin locations.");

  return (
    <TraceabilityPageFrame
      title="Bin Locations"
      helper="Optional bins, shelves, zones, staging, receiving, shipping, returns, quarantine, and in-transit locations for warehouse visibility."
      action={canManage ? <LedgerButton href="/inventory/bin-locations/new" variant="primary">New bin/location</LedgerButton> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <>
        <LedgerDataTable minWidth="860px">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((bin) => (
              <tr key={bin.id}>
                <td className="px-4 py-3 font-mono text-xs text-ink">{bin.code}</td>
                <td className="px-4 py-3 font-medium text-ink">{bin.name}</td>
                <td className="px-4 py-3 text-steel">{bin.warehouse ? `${bin.warehouse.code} ${bin.warehouse.name}` : bin.warehouseId}</td>
                <td className="px-4 py-3 text-steel">{inventoryBinLocationTypeLabel(bin.type)}</td>
                <td className="px-4 py-3"><StatusBadge status={bin.status} label={inventoryBinLocationStatusLabel(bin.status)} /></td>
                <td className="px-4 py-3"><LedgerButton href={`/inventory/bin-locations/${bin.id}`} size="sm">View</LedgerButton></td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>
        {records.length === 0 && !loading ? <LedgerEmptyState title="No bin/location setup records yet" /> : null}
      </>
    </TraceabilityPageFrame>
  );
}

export function BinLocationNewPage() {
  return (
    <BinLocationEditor
      title="New Bin Location"
      submitLabel="Create bin/location"
      endpoint="/inventory/bin-locations"
      method="POST"
    />
  );
}

export function BinLocationDetailPage({ id }: { id: string }) {
  return (
    <BinLocationEditor
      title="Bin Location Detail"
      submitLabel="Save bin/location"
      endpoint={`/inventory/bin-locations/${id}`}
      method="PATCH"
    />
  );
}

export function BatchesListPage() {
  const { organizationId, canView, canManage, records, loading, error, reload } = useTraceabilityList<InventoryBatch>("/inventory/batches", "Unable to load batches.");

  return (
    <TraceabilityPageFrame
      title="Batches and Lots"
      helper="Batch and lot setup supports operational expiry and lot traceability without changing valuation or posting behavior."
      action={canManage ? <LedgerButton href="/inventory/batches/new" variant="primary">New batch/lot</LedgerButton> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <>
        <LedgerDataTable minWidth="920px">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((batch) => (
              <tr key={batch.id}>
                <td className="px-4 py-3 font-medium text-ink">{batch.batchNumber}</td>
                <td className="px-4 py-3 text-steel">{batch.lotNumber ?? "-"}</td>
                <td className="px-4 py-3 text-steel">{batch.item ? `${batch.item.name}${batch.item.sku ? ` (${batch.item.sku})` : ""}` : batch.itemId}</td>
                <td className="px-4 py-3 text-steel">{formatOptionalDate(batch.expiryDate, "-")}</td>
                <td className="px-4 py-3"><StatusBadge status={batch.status} label={inventoryBatchStatusLabel(batch.status)} /></td>
                <td className="px-4 py-3"><LedgerButton href={`/inventory/batches/${batch.id}`} size="sm">View</LedgerButton></td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>
        {records.length === 0 && !loading ? <LedgerEmptyState title="No batch/lot setup records yet" /> : null}
      </>
    </TraceabilityPageFrame>
  );
}

export function BatchNewPage() {
  return <BatchEditor title="New Batch or Lot" submitLabel="Create batch/lot" endpoint="/inventory/batches" method="POST" />;
}

export function BatchDetailPage({ id }: { id: string }) {
  return <BatchEditor title="Batch or Lot Detail" submitLabel="Save batch/lot" endpoint={`/inventory/batches/${id}`} method="PATCH" />;
}

export function SerialNumbersListPage() {
  const { organizationId, canView, canManage, records, loading, error, reload } = useTraceabilityList<InventorySerialNumber>("/inventory/serial-numbers", "Unable to load serial numbers.");

  return (
    <TraceabilityPageFrame
      title="Serial Numbers"
      helper="Serial setup records provide operational traceability status and location visibility. Movement automation remains blocked until tracked movement workflows are added."
      action={canManage ? <LedgerButton href="/inventory/serial-numbers/new" variant="primary">New serial number</LedgerButton> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <>
        <LedgerDataTable minWidth="1040px">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
            <tr>
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Bin/location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((serial) => (
              <tr key={serial.id}>
                <td className="px-4 py-3 font-medium text-ink">{serial.serialNumber}</td>
                <td className="px-4 py-3 text-steel">{serial.item ? `${serial.item.name}${serial.item.sku ? ` (${serial.item.sku})` : ""}` : serial.itemId}</td>
                <td className="px-4 py-3 text-steel">{serial.batch?.batchNumber ?? "-"}</td>
                <td className="px-4 py-3 text-steel">{serial.currentWarehouse ? `${serial.currentWarehouse.code} ${serial.currentWarehouse.name}` : "-"}</td>
                <td className="px-4 py-3 text-steel">{serial.currentBinLocation ? `${serial.currentBinLocation.code} ${serial.currentBinLocation.name}` : "-"}</td>
                <td className="px-4 py-3"><StatusBadge status={serial.status} label={inventorySerialNumberStatusLabel(serial.status)} /></td>
                <td className="px-4 py-3"><LedgerButton href={`/inventory/serial-numbers/${serial.id}`} size="sm">View</LedgerButton></td>
              </tr>
            ))}
          </tbody>
        </LedgerDataTable>
        {records.length === 0 && !loading ? <LedgerEmptyState title="No serial number setup records yet" /> : null}
      </>
    </TraceabilityPageFrame>
  );
}

export function SerialNumberNewPage() {
  return <SerialNumberEditor title="New Serial Number" submitLabel="Create serial number" endpoint="/inventory/serial-numbers" method="POST" />;
}

export function SerialNumberDetailPage({ id }: { id: string }) {
  return (
    <SerialNumberEditor
      title="Serial Number Detail"
      submitLabel="Save serial number"
      endpoint={`/inventory/serial-numbers/${id}`}
      method="PATCH"
    />
  );
}

export function ItemTraceabilityPage({ itemId }: { itemId: string }) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.inventory.view);
  const [traceability, setTraceability] = useState<InventoryTraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organizationId || !canView) return;
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<InventoryTraceabilityResponse>(`/inventory/traceability/items/${itemId}`)
      .then((result) => {
        if (active) setTraceability(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load item traceability.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canView, itemId, organizationId]);

  return (
    <TraceabilityPageFrame
      title="Item Traceability"
      helper={inventoryTrackingSafeHelperText()}
      action={<LedgerButton href="/items">Items</LedgerButton>}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
    >
      {traceability ? (
        <div className="space-y-5">
          <LedgerPanel>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
              <Metric label="Item" value={`${traceability.item.name}${traceability.item.sku ? ` (${traceability.item.sku})` : ""}`} />
              <Metric label="Tracking mode" value={itemTrackingModeLabel(traceability.trackingMode)} />
              <Metric label="Batches" value={String(traceability.batches.length)} />
              <Metric label="Serial numbers" value={String(traceability.serialNumbers.length)} />
              <Metric label="Warehouses" value={String(traceability.warehouses.length)} />
              <Metric label="Bin locations" value={String(traceability.binLocations.length)} />
              <Metric label="Movements" value={String(traceability.movementCount)} />
              <Metric label="Flags" value={[traceability.expiryTrackingEnabled ? "Expiry" : null, traceability.binTrackingEnabled ? "Bin" : null].filter(Boolean).join(", ") || "No extra flags"} />
            </div>
          </LedgerPanel>

          <WarningsPanel warnings={traceability.warnings} />
          <BatchesTable batches={traceability.batches} />
          <SerialNumbersTable serials={traceability.serialNumbers} />
          <BinLocationsTable bins={traceability.binLocations} />

          <LedgerSection title="Movements grouped by available tracking metadata">
            {traceability.movements.length === 0 ? <LedgerEmptyState title="No stock movements exist for this item yet" /> : null}
            {traceability.movements.length > 0 ? (
              <LedgerDataTable minWidth="1040px">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2">Batch</th>
                      <th className="px-3 py-2">Serial</th>
                      <th className="px-3 py-2">Bin/location</th>
                      <th className="px-3 py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {traceability.movements.map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-3 py-3 text-steel">{formatOptionalDate(movement.movementDate, "-")}</td>
                        <td className="px-3 py-3 font-medium text-ink">{stockMovementTypeLabel(movement.type)}</td>
                        <td className="px-3 py-3 text-right font-mono text-xs">{formatInventoryQuantity(movement.quantity)}</td>
                        <td className="px-3 py-3 text-steel">{movement.warehouse ? `${movement.warehouse.code} ${movement.warehouse.name}` : movement.warehouseId}</td>
                        <td className="px-3 py-3 text-steel">{movement.batch?.batchNumber ?? "-"}</td>
                        <td className="px-3 py-3 text-steel">{movement.serialNumber?.serialNumber ?? "-"}</td>
                        <td className="px-3 py-3 text-steel">{movement.binLocation?.code ?? movement.fromBinLocation?.code ?? movement.toBinLocation?.code ?? "-"}</td>
                        <td className="px-3 py-3 text-steel">{movement.referenceType ? `${movement.referenceType} ${movement.referenceId ?? ""}` : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
              </LedgerDataTable>
            ) : null}
          </LedgerSection>

          <LedgerPanel>
            <h2 className="text-base font-semibold text-ink">Safe limitations</h2>
            <p className="mt-2">This view is read-only. It does not post journals, change FIFO preview behavior, update valuation, create COGS, change VAT/ZATCA, or mutate historical movements.</p>
          </LedgerPanel>
        </div>
      ) : null}
    </TraceabilityPageFrame>
  );
}

function BinLocationEditor({
  title,
  submitLabel,
  endpoint,
  method,
  record,
  onRecord,
}: {
  title: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  record?: InventoryBinLocation | null;
  onRecord?: (record: InventoryBinLocation) => void;
}) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.inventory.view);
  const canManage = can(PERMISSIONS.inventory.manage);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [current, setCurrent] = useState(record ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !canView) return;
    let active = true;
    setLoading(true);
    Promise.all([apiRequest<Warehouse[]>("/warehouses"), method === "PATCH" ? apiRequest<InventoryBinLocation>(endpoint) : Promise.resolve(record ?? null)])
      .then(([warehouseResult, recordResult]) => {
        if (!active) return;
        setWarehouses(warehouseResult);
        if (recordResult) {
          setCurrent(recordResult);
          onRecord?.(recordResult);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load bin/location setup.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canView, endpoint, method, onRecord, organizationId, record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const body: FormBody = {
      warehouseId: method === "POST" ? requiredFormValue(form, "warehouseId") : undefinedToNull(undefined),
      code: requiredFormValue(form, "code"),
      name: requiredFormValue(form, "name"),
      type: requiredFormValue(form, "type"),
      status: requiredFormValue(form, "status"),
      description: nullableFormValue(form, "description"),
    };
    if (method === "PATCH") delete body.warehouseId;
    await submitRecord(endpoint, method, body, setCurrent, setError, setSuccess, "Bin/location saved.");
  }

  return (
    <TraceabilityEditorFrame title={title} canView={canView} canManage={canManage} organizationId={organizationId} loading={loading} error={error} success={success}>
      <LedgerPanel>
        <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {method === "POST" ? (
            <SelectField name="warehouseId" label="Warehouse" required>
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.code} {warehouse.name}</option>
              ))}
            </SelectField>
          ) : null}
          <InputField name="code" label="Code" defaultValue={current?.code ?? ""} required />
          <InputField name="name" label="Name" defaultValue={current?.name ?? ""} required />
          <SelectField name="type" label="Type" defaultValue={current?.type ?? "BIN"} required>
            {binLocationTypes.map((type) => <option key={type} value={type}>{inventoryBinLocationTypeLabel(type)}</option>)}
          </SelectField>
          <SelectField name="status" label="Status" defaultValue={current?.status ?? "ACTIVE"} required>
            {binLocationStatuses.map((status) => <option key={status} value={status}>{inventoryBinLocationStatusLabel(status)}</option>)}
          </SelectField>
          <TextAreaField name="description" label="Description" defaultValue={current?.description ?? ""} />
          {canManage ? <LedgerButton type="submit" variant="primary">{submitLabel}</LedgerButton> : null}
        </form>
      </LedgerPanel>
      {current ? <RecordSummary rows={[["Warehouse", current.warehouse ? `${current.warehouse.code} ${current.warehouse.name}` : current.warehouseId], ["Type", inventoryBinLocationTypeLabel(current.type)], ["Status", inventoryBinLocationStatusLabel(current.status)]]} /> : null}
    </TraceabilityEditorFrame>
  );
}

function BatchEditor(props: {
  title: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  record?: InventoryBatch | null;
  onRecord?: (record: InventoryBatch) => void;
}) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.inventory.view);
  const canManage = can(PERMISSIONS.inventory.manage);
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState(props.record ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !canView) return;
    let active = true;
    setLoading(true);
    Promise.all([apiRequest<Item[]>("/items"), props.method === "PATCH" ? apiRequest<InventoryBatch>(props.endpoint) : Promise.resolve(props.record ?? null)])
      .then(([itemResult, recordResult]) => {
        if (!active) return;
        setItems(itemResult);
        if (recordResult) {
          setCurrent(recordResult);
          props.onRecord?.(recordResult);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load batch setup.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canView, organizationId, props.endpoint, props.method, props.onRecord, props.record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const body: FormBody = {
      itemId: props.method === "POST" ? requiredFormValue(form, "itemId") : undefinedToNull(undefined),
      batchNumber: requiredFormValue(form, "batchNumber"),
      lotNumber: nullableFormValue(form, "lotNumber"),
      manufactureDate: nullableFormValue(form, "manufactureDate"),
      expiryDate: nullableFormValue(form, "expiryDate"),
      status: requiredFormValue(form, "status"),
      notes: nullableFormValue(form, "notes"),
    };
    if (props.method === "PATCH") delete body.itemId;
    await submitRecord(props.endpoint, props.method, body, setCurrent, setError, setSuccess, "Batch/lot saved.");
  }

  return (
    <TraceabilityEditorFrame title={props.title} canView={canView} canManage={canManage} organizationId={organizationId} loading={loading} error={error} success={success}>
      <LedgerPanel>
        <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {props.method === "POST" ? (
            <SelectField name="itemId" label="Item" required>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}{item.sku ? ` (${item.sku})` : ""} - {itemTrackingModeLabel(item.trackingMode)}</option>
              ))}
            </SelectField>
          ) : null}
          <InputField name="batchNumber" label="Batch number" defaultValue={current?.batchNumber ?? ""} required />
          <InputField name="lotNumber" label="Lot number" defaultValue={current?.lotNumber ?? ""} />
          <InputField name="manufactureDate" label="Manufacture date" type="date" defaultValue={dateInputValue(current?.manufactureDate)} />
          <InputField name="expiryDate" label="Expiry date" type="date" defaultValue={dateInputValue(current?.expiryDate)} />
          <SelectField name="status" label="Status" defaultValue={current?.status ?? "ACTIVE"} required>
            {batchStatuses.map((status) => <option key={status} value={status}>{inventoryBatchStatusLabel(status)}</option>)}
          </SelectField>
          <TextAreaField name="notes" label="Notes" defaultValue={current?.notes ?? ""} />
          {canManage ? <LedgerButton type="submit" variant="primary">{props.submitLabel}</LedgerButton> : null}
        </form>
      </LedgerPanel>
      {current ? <RecordSummary rows={[["Item", current.item ? `${current.item.name}${current.item.sku ? ` (${current.item.sku})` : ""}` : current.itemId], ["Expiry", formatOptionalDate(current.expiryDate, "-")], ["Status", inventoryBatchStatusLabel(current.status)]]} /> : null}
    </TraceabilityEditorFrame>
  );
}

function SerialNumberEditor(props: {
  title: string;
  submitLabel: string;
  endpoint: string;
  method: "POST" | "PATCH";
  record?: InventorySerialNumber | null;
  onRecord?: (record: InventorySerialNumber) => void;
}) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.inventory.view);
  const canManage = can(PERMISSIONS.inventory.manage);
  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [bins, setBins] = useState<InventoryBinLocation[]>([]);
  const [current, setCurrent] = useState(props.record ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!organizationId || !canView) return;
    let active = true;
    setLoading(true);
    Promise.all([
      apiRequest<Item[]>("/items"),
      apiRequest<InventoryBatch[]>("/inventory/batches"),
      apiRequest<Warehouse[]>("/warehouses"),
      apiRequest<InventoryBinLocation[]>("/inventory/bin-locations"),
      props.method === "PATCH" ? apiRequest<InventorySerialNumber>(props.endpoint) : Promise.resolve(props.record ?? null),
    ])
      .then(([itemResult, batchResult, warehouseResult, binResult, recordResult]) => {
        if (!active) return;
        setItems(itemResult);
        setBatches(batchResult);
        setWarehouses(warehouseResult);
        setBins(binResult);
        if (recordResult) {
          setCurrent(recordResult);
          props.onRecord?.(recordResult);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load serial number setup.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canView, organizationId, props.endpoint, props.method, props.onRecord, props.record]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const body: FormBody = {
      itemId: props.method === "POST" ? requiredFormValue(form, "itemId") : undefinedToNull(undefined),
      serialNumber: requiredFormValue(form, "serialNumber"),
      batchId: nullableFormValue(form, "batchId"),
      status: requiredFormValue(form, "status"),
      currentWarehouseId: nullableFormValue(form, "currentWarehouseId"),
      currentBinLocationId: nullableFormValue(form, "currentBinLocationId"),
    };
    if (props.method === "PATCH") delete body.itemId;
    await submitRecord(props.endpoint, props.method, body, setCurrent, setError, setSuccess, "Serial number saved.");
  }

  return (
    <TraceabilityEditorFrame title={props.title} canView={canView} canManage={canManage} organizationId={organizationId} loading={loading} error={error} success={success}>
      <LedgerPanel>
        <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {props.method === "POST" ? (
            <SelectField name="itemId" label="Item" required>
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.name}{item.sku ? ` (${item.sku})` : ""} - {itemTrackingModeLabel(item.trackingMode)}</option>
              ))}
            </SelectField>
          ) : null}
          <InputField name="serialNumber" label="Serial number" defaultValue={current?.serialNumber ?? ""} required />
          <SelectField name="batchId" label="Batch" defaultValue={current?.batchId ?? ""}>
            <option value="">No batch</option>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber}</option>)}
          </SelectField>
          <SelectField name="status" label="Status" defaultValue={current?.status ?? "AVAILABLE"} required>
            {serialStatuses.map((status) => <option key={status} value={status}>{inventorySerialNumberStatusLabel(status)}</option>)}
          </SelectField>
          <SelectField name="currentWarehouseId" label="Current warehouse" defaultValue={current?.currentWarehouseId ?? ""}>
            <option value="">No warehouse</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} {warehouse.name}</option>)}
          </SelectField>
          <SelectField name="currentBinLocationId" label="Current bin/location" defaultValue={current?.currentBinLocationId ?? ""}>
            <option value="">No bin/location</option>
            {bins.map((bin) => <option key={bin.id} value={bin.id}>{bin.code} {bin.name}</option>)}
          </SelectField>
          {canManage ? <LedgerButton type="submit" variant="primary">{props.submitLabel}</LedgerButton> : null}
        </form>
      </LedgerPanel>
      {current ? <RecordSummary rows={[["Item", current.item ? `${current.item.name}${current.item.sku ? ` (${current.item.sku})` : ""}` : current.itemId], ["Batch", current.batch?.batchNumber ?? "-"], ["Status", inventorySerialNumberStatusLabel(current.status)]]} /> : null}
    </TraceabilityEditorFrame>
  );
}

function BatchesTable({ batches }: { batches: InventoryBatch[] }) {
  return (
    <LedgerSection title="Batches and lots">
      {batches.length === 0 ? <LedgerEmptyState title="No batches are linked to this item" /> : null}
      {batches.length > 0 ? (
        <LedgerDataTable minWidth="760px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Lot</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => <tr key={batch.id}><td className="px-3 py-3 font-medium text-ink">{batch.batchNumber}</td><td className="px-3 py-3 text-steel">{batch.lotNumber ?? "-"}</td><td className="px-3 py-3 text-steel">{formatOptionalDate(batch.expiryDate, "-")}</td><td className="px-3 py-3"><StatusBadge status={batch.status} label={inventoryBatchStatusLabel(batch.status)} /></td><td className="px-3 py-3"><LedgerButton href={`/inventory/batches/${batch.id}`} size="sm">View</LedgerButton></td></tr>)}
            </tbody>
        </LedgerDataTable>
      ) : null}
    </LedgerSection>
  );
}

function SerialNumbersTable({ serials }: { serials: InventorySerialNumber[] }) {
  return (
    <LedgerSection title="Serial numbers">
      {serials.length === 0 ? <LedgerEmptyState title="No serial numbers are linked to this item" /> : null}
      {serials.length > 0 ? (
        <LedgerDataTable minWidth="840px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Serial</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Warehouse</th><th className="px-3 py-2">Bin/location</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {serials.map((serial) => <tr key={serial.id}><td className="px-3 py-3 font-medium text-ink">{serial.serialNumber}</td><td className="px-3 py-3 text-steel">{serial.batch?.batchNumber ?? "-"}</td><td className="px-3 py-3 text-steel">{serial.currentWarehouse ? `${serial.currentWarehouse.code} ${serial.currentWarehouse.name}` : "-"}</td><td className="px-3 py-3 text-steel">{serial.currentBinLocation ? `${serial.currentBinLocation.code} ${serial.currentBinLocation.name}` : "-"}</td><td className="px-3 py-3"><StatusBadge status={serial.status} label={inventorySerialNumberStatusLabel(serial.status)} /></td><td className="px-3 py-3"><LedgerButton href={`/inventory/serial-numbers/${serial.id}`} size="sm">View</LedgerButton></td></tr>)}
            </tbody>
        </LedgerDataTable>
      ) : null}
    </LedgerSection>
  );
}

function BinLocationsTable({ bins }: { bins: InventoryBinLocation[] }) {
  return (
    <LedgerSection title="Bin locations">
      {bins.length === 0 ? <LedgerEmptyState title="No bin/location metadata is linked to this item yet" /> : null}
      {bins.length > 0 ? (
        <LedgerDataTable minWidth="760px">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Warehouse</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bins.map((bin) => <tr key={bin.id}><td className="px-3 py-3 font-mono text-xs text-ink">{bin.code}</td><td className="px-3 py-3 font-medium text-ink">{bin.name}</td><td className="px-3 py-3 text-steel">{bin.warehouse ? `${bin.warehouse.code} ${bin.warehouse.name}` : bin.warehouseId}</td><td className="px-3 py-3 text-steel">{inventoryBinLocationTypeLabel(bin.type)}</td><td className="px-3 py-3"><StatusBadge status={bin.status} label={inventoryBinLocationStatusLabel(bin.status)} /></td><td className="px-3 py-3"><LedgerButton href={`/inventory/bin-locations/${bin.id}`} size="sm">View</LedgerButton></td></tr>)}
            </tbody>
        </LedgerDataTable>
      ) : null}
    </LedgerSection>
  );
}

function useTraceabilityList<T>(endpoint: string, errorMessage: string) {
  const organizationId = useActiveOrganizationId();
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.inventory.view);
  const canManage = can(PERMISSIONS.inventory.manage);
  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    if (!organizationId || !canView) return;
    setLoading(true);
    setError("");
    apiRequest<T[]>(endpoint)
      .then(setRecords)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : errorMessage))
      .finally(() => setLoading(false));
  }, [canView, endpoint, errorMessage, organizationId]);
  useEffect(() => load(), [load]);
  return { organizationId, canView, canManage, records, loading, error, reload: load };
}

function TraceabilityPageFrame({
  title,
  helper,
  action,
  canView,
  organizationId,
  loading,
  error,
  reload,
  children,
}: {
  title: string;
  helper: string;
  action?: ReactNode;
  canView: boolean;
  organizationId: string | null;
  loading: boolean;
  error: string;
  reload?: () => void;
  children: ReactNode;
}) {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory traceability"
        title={title}
        description={helper}
        actions={
          <>
            {action}
            {reload ? <LedgerButton type="button" onClick={reload}>Refresh</LedgerButton> : null}
          </>
        }
      />
      <LedgerPageBody>
        <LedgerSummaryBand tone="warning">{inventoryTrackingSafeHelperText()}</LedgerSummaryBand>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to load inventory traceability setup.</LedgerAlert> : null}
        {organizationId && !canView ? <LedgerAlert tone="info">Inventory traceability setup requires inventory view permission.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading inventory traceability setup" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {organizationId && canView ? children : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function TraceabilityEditorFrame({
  title,
  canView,
  canManage,
  organizationId,
  loading,
  error,
  success,
  children,
}: {
  title: string;
  canView: boolean;
  canManage: boolean;
  organizationId: string | null;
  loading: boolean;
  error: string;
  success: string;
  children: ReactNode;
}) {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Inventory traceability"
        title={title}
        description={inventoryTrackingSafeHelperText()}
        actions={
          <>
            <LedgerButton href="/inventory/bin-locations">Bin locations</LedgerButton>
            <LedgerButton href="/inventory/batches">Batches</LedgerButton>
            <LedgerButton href="/inventory/serial-numbers">Serial numbers</LedgerButton>
          </>
        }
      />
      <LedgerPageBody>
        {!organizationId ? <LedgerAlert tone="info">Log in and select an organization to manage traceability setup.</LedgerAlert> : null}
        {organizationId && !canView ? <LedgerAlert tone="info">Inventory traceability setup requires inventory view permission.</LedgerAlert> : null}
        {organizationId && canView && !canManage ? <LedgerAlert tone="info">You can view this setup. Create and update actions require inventory manage permission.</LedgerAlert> : null}
        {loading ? <LedgerLoadingState title="Loading setup form" /> : null}
        {error ? <LedgerAlert tone="danger">{error}</LedgerAlert> : null}
        {success ? <LedgerAlert tone="success">{success}</LedgerAlert> : null}
        {organizationId && canView ? children : null}
      </LedgerPageBody>
    </LedgerPage>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <LedgerStatusBadge tone={traceabilityStatusTone(status)}>{label}</LedgerStatusBadge>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <LedgerPanel><p className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</p><p className="mt-1 font-medium text-ink">{value}</p></LedgerPanel>;
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
  return (
    <LedgerAlert tone="warning" title="Warnings and blockers">
      {warnings.map((warning) => <p key={warning}>{warning}</p>)}
    </LedgerAlert>
  );
}

function RecordSummary({ rows }: { rows: Array<[string, string]> }) {
  return (
    <LedgerSection title="Current setup">
      <LedgerMetadataRow items={rows.map(([label, value]) => ({ label, value }))} />
    </LedgerSection>
  );
}

function InputField({ name, label, defaultValue = "", type = "text", required = false }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerInput name={name} type={type} required={required} defaultValue={defaultValue} />
    </LedgerFieldLabel>
  );
}

function SelectField({ name, label, defaultValue, required = false, children }: { name: string; label: string; defaultValue?: string; required?: boolean; children: ReactNode }) {
  return (
    <LedgerFieldLabel>
      <LedgerFieldText>{label}</LedgerFieldText>
      <LedgerSelect name={name} required={required} defaultValue={defaultValue}>
        {children}
      </LedgerSelect>
    </LedgerFieldLabel>
  );
}

function TextAreaField({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return (
    <LedgerFieldLabel className="md:col-span-2">
      <LedgerFieldText>{label}</LedgerFieldText>
      <Textarea name={name} defaultValue={defaultValue} className="mt-1 min-h-24" />
    </LedgerFieldLabel>
  );
}

async function submitRecord<T>(
  endpoint: string,
  method: "POST" | "PATCH",
  body: FormBody,
  setCurrent: (record: T) => void,
  setError: (value: string) => void,
  setSuccess: (value: string) => void,
  successMessage: string,
) {
  setError("");
  setSuccess("");
  try {
    const saved = await apiRequest<T>(endpoint, { method, body });
    setCurrent(saved);
    setSuccess(successMessage);
  } catch (saveError) {
    setError(saveError instanceof Error ? saveError.message : "Unable to save traceability setup.");
  }
}

function requiredFormValue(form: FormData, name: string): string {
  return String(form.get(name) ?? "");
}

function nullableFormValue(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? "").trim();
  return value ? value : null;
}

function undefinedToNull(_: undefined): null {
  return null;
}

function dateInputValue(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function traceabilityStatusTone(status: string): LedgerStatusTone {
  if (["ACTIVE", "AVAILABLE", "RETURNED"].includes(status)) return "success";
  if (["EXPIRED", "QUARANTINED", "LOST", "SCRAPPED"].includes(status)) return "warning";
  if (["CLOSED", "ISSUED", "INACTIVE"].includes(status)) return "neutral";
  return "draft";
}
