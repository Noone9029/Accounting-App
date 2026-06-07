"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { StatusMessage } from "@/components/common/status-message";
import { usePermissions } from "@/components/permissions/permission-provider";
import { useActiveOrganizationId } from "@/hooks/use-active-organization";
import { apiRequest } from "@/lib/api";
import { formatOptionalDate } from "@/lib/invoice-display";
import {
  formatInventoryQuantity,
  inventoryBatchStatusLabel,
  inventoryBinLocationStatusLabel,
  inventoryBinLocationTypeLabel,
  inventorySerialNumberStatusLabel,
  inventoryTraceabilityStatusBadgeClass,
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
      action={canManage ? <Link className={secondaryButtonClass} href="/inventory/bin-locations/new">New bin/location</Link> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[860px] text-left text-sm">
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
                <td className="px-4 py-3"><Link className={tableButtonClass} href={`/inventory/bin-locations/${bin.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && !loading ? <div className="p-4"><StatusMessage type="empty">No bin/location setup records yet.</StatusMessage></div> : null}
      </div>
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
      action={canManage ? <Link className={secondaryButtonClass} href="/inventory/batches/new">New batch/lot</Link> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[920px] text-left text-sm">
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
                <td className="px-4 py-3"><Link className={tableButtonClass} href={`/inventory/batches/${batch.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && !loading ? <div className="p-4"><StatusMessage type="empty">No batch/lot setup records yet.</StatusMessage></div> : null}
      </div>
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
      action={canManage ? <Link className={secondaryButtonClass} href="/inventory/serial-numbers/new">New serial number</Link> : null}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
      reload={reload}
    >
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-panel">
        <table className="w-full min-w-[1040px] text-left text-sm">
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
                <td className="px-4 py-3"><Link className={tableButtonClass} href={`/inventory/serial-numbers/${serial.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && !loading ? <div className="p-4"><StatusMessage type="empty">No serial number setup records yet.</StatusMessage></div> : null}
      </div>
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
      action={<Link className={secondaryButtonClass} href="/items">Items</Link>}
      canView={canView}
      organizationId={organizationId}
      loading={loading}
      error={error}
    >
      {traceability ? (
        <div className="space-y-5">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
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
          </section>

          <WarningsPanel warnings={traceability.warnings} />
          <BatchesTable batches={traceability.batches} />
          <SerialNumbersTable serials={traceability.serialNumbers} />
          <BinLocationsTable bins={traceability.binLocations} />

          <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
            <h2 className="text-base font-semibold text-ink">Movements grouped by available tracking metadata</h2>
            {traceability.movements.length === 0 ? <StatusMessage type="empty">No stock movements exist for this item yet.</StatusMessage> : null}
            {traceability.movements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
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
                </table>
              </div>
            ) : null}
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 text-sm leading-6 text-steel shadow-panel">
            <h2 className="text-base font-semibold text-ink">Safe limitations</h2>
            <p className="mt-2">This view is read-only. It does not post journals, change FIFO preview behavior, update valuation, create COGS, change VAT/ZATCA, or mutate historical movements.</p>
          </section>
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
      <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-2">
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
        {canManage ? <button type="submit" className={primaryButtonClass}>{submitLabel}</button> : null}
      </form>
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
      <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-2">
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
        {canManage ? <button type="submit" className={primaryButtonClass}>{props.submitLabel}</button> : null}
      </form>
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
      <form key={current?.id ?? "new"} onSubmit={(event) => void submit(event)} className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-2">
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
        {canManage ? <button type="submit" className={primaryButtonClass}>{props.submitLabel}</button> : null}
      </form>
      {current ? <RecordSummary rows={[["Item", current.item ? `${current.item.name}${current.item.sku ? ` (${current.item.sku})` : ""}` : current.itemId], ["Batch", current.batch?.batchNumber ?? "-"], ["Status", inventorySerialNumberStatusLabel(current.status)]]} /> : null}
    </TraceabilityEditorFrame>
  );
}

function BatchesTable({ batches }: { batches: InventoryBatch[] }) {
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Batches and lots</h2>
      {batches.length === 0 ? <StatusMessage type="empty">No batches are linked to this item.</StatusMessage> : null}
      {batches.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Lot</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => <tr key={batch.id}><td className="px-3 py-3 font-medium text-ink">{batch.batchNumber}</td><td className="px-3 py-3 text-steel">{batch.lotNumber ?? "-"}</td><td className="px-3 py-3 text-steel">{formatOptionalDate(batch.expiryDate, "-")}</td><td className="px-3 py-3"><StatusBadge status={batch.status} label={inventoryBatchStatusLabel(batch.status)} /></td><td className="px-3 py-3"><Link className={tableButtonClass} href={`/inventory/batches/${batch.id}`}>View</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function SerialNumbersTable({ serials }: { serials: InventorySerialNumber[] }) {
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Serial numbers</h2>
      {serials.length === 0 ? <StatusMessage type="empty">No serial numbers are linked to this item.</StatusMessage> : null}
      {serials.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Serial</th><th className="px-3 py-2">Batch</th><th className="px-3 py-2">Warehouse</th><th className="px-3 py-2">Bin/location</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {serials.map((serial) => <tr key={serial.id}><td className="px-3 py-3 font-medium text-ink">{serial.serialNumber}</td><td className="px-3 py-3 text-steel">{serial.batch?.batchNumber ?? "-"}</td><td className="px-3 py-3 text-steel">{serial.currentWarehouse ? `${serial.currentWarehouse.code} ${serial.currentWarehouse.name}` : "-"}</td><td className="px-3 py-3 text-steel">{serial.currentBinLocation ? `${serial.currentBinLocation.code} ${serial.currentBinLocation.name}` : "-"}</td><td className="px-3 py-3"><StatusBadge status={serial.status} label={inventorySerialNumberStatusLabel(serial.status)} /></td><td className="px-3 py-3"><Link className={tableButtonClass} href={`/inventory/serial-numbers/${serial.id}`}>View</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function BinLocationsTable({ bins }: { bins: InventoryBinLocation[] }) {
  return (
    <section className="space-y-3 rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Bin locations</h2>
      {bins.length === 0 ? <StatusMessage type="empty">No bin/location metadata is linked to this item yet.</StatusMessage> : null}
      {bins.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-steel"><tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Warehouse</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Link</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {bins.map((bin) => <tr key={bin.id}><td className="px-3 py-3 font-mono text-xs text-ink">{bin.code}</td><td className="px-3 py-3 font-medium text-ink">{bin.name}</td><td className="px-3 py-3 text-steel">{bin.warehouse ? `${bin.warehouse.code} ${bin.warehouse.name}` : bin.warehouseId}</td><td className="px-3 py-3 text-steel">{inventoryBinLocationTypeLabel(bin.type)}</td><td className="px-3 py-3"><StatusBadge status={bin.status} label={inventoryBinLocationStatusLabel(bin.status)} /></td><td className="px-3 py-3"><Link className={tableButtonClass} href={`/inventory/bin-locations/${bin.id}`}>View</Link></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
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
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">{helper}</p>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-steel">{inventoryTrackingSafeHelperText()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {action}
          {reload ? <button type="button" onClick={reload} className={secondaryButtonClass}>Refresh</button> : null}
        </div>
      </header>
      {!organizationId ? <StatusMessage type="info">Log in and select an organization to load inventory traceability setup.</StatusMessage> : null}
      {organizationId && !canView ? <StatusMessage type="info">Inventory traceability setup requires inventory view permission.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading inventory traceability setup...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {organizationId && canView ? children : null}
    </section>
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
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">{inventoryTrackingSafeHelperText()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className={secondaryButtonClass} href="/inventory/bin-locations">Bin locations</Link>
          <Link className={secondaryButtonClass} href="/inventory/batches">Batches</Link>
          <Link className={secondaryButtonClass} href="/inventory/serial-numbers">Serial numbers</Link>
        </div>
      </header>
      {!organizationId ? <StatusMessage type="info">Log in and select an organization to manage traceability setup.</StatusMessage> : null}
      {organizationId && !canView ? <StatusMessage type="info">Inventory traceability setup requires inventory view permission.</StatusMessage> : null}
      {organizationId && canView && !canManage ? <StatusMessage type="info">You can view this setup. Create and update actions require inventory manage permission.</StatusMessage> : null}
      {loading ? <StatusMessage type="loading">Loading setup form...</StatusMessage> : null}
      {error ? <StatusMessage type="error">{error}</StatusMessage> : null}
      {success ? <StatusMessage type="success">{success}</StatusMessage> : null}
      {organizationId && canView ? children : null}
    </section>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${inventoryTraceabilityStatusBadgeClass(status)}`}>{label}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function WarningsPanel({ warnings }: { warnings: string[] }) {
  return (
    <section className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Warnings and blockers</h2>
      {warnings.map((warning) => <p key={warning}>{warning}</p>)}
    </section>
  );
}

function RecordSummary({ rows }: { rows: Array<[string, string]> }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="text-base font-semibold text-ink">Current setup</h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        {rows.map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-wide text-steel">{label}</dt><dd className="mt-1 font-medium text-ink">{value}</dd></div>)}
      </dl>
    </section>
  );
}

function InputField({ name, label, defaultValue = "", type = "text", required = false }: { name: string; label: string; defaultValue?: string; type?: string; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
    </label>
  );
}

function SelectField({ name, label, defaultValue, required = false, children }: { name: string; label: string; defaultValue?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="text-sm font-medium text-ink">
      {label}
      <select name={name} required={required} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm">
        {children}
      </select>
    </label>
  );
}

function TextAreaField({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="text-sm font-medium text-ink md:col-span-2">
      {label}
      <textarea name={name} defaultValue={defaultValue} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-palm" />
    </label>
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

const primaryButtonClass = "rounded-md bg-palm px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClass = "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
const tableButtonClass = "rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50";
