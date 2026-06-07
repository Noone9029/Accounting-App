import { BadRequestException } from "@nestjs/common";
import { InventoryBatchStatus, ItemTrackingMode } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type TrackingSettings = {
  id?: string;
  name?: string;
  trackingMode?: ItemTrackingMode | null;
  expiryTrackingEnabled?: boolean | null;
  binTrackingEnabled?: boolean | null;
};

export type BatchForTrackingValidation = {
  id: string;
  itemId: string;
  expiryDate: Date | null;
  status: InventoryBatchStatus;
};

export function hasAdvancedTracking(item: TrackingSettings): boolean {
  return (item.trackingMode ?? ItemTrackingMode.NONE) !== ItemTrackingMode.NONE || Boolean(item.expiryTrackingEnabled) || Boolean(item.binTrackingEnabled);
}

export function validateBatchRequired(item: TrackingSettings, batchId?: string | null): string | null {
  if ((item.trackingMode === ItemTrackingMode.BATCH || item.trackingMode === ItemTrackingMode.SERIAL_AND_BATCH) && !batchId) {
    return "Batch-tracked items require a batch for this movement.";
  }
  return null;
}

export function validateSerialsRequired(item: TrackingSettings, serialIds: string[] | null | undefined, quantity: Prisma.Decimal.Value): string | null {
  if (item.trackingMode !== ItemTrackingMode.SERIAL && item.trackingMode !== ItemTrackingMode.SERIAL_AND_BATCH) {
    return null;
  }

  const decimal = new Prisma.Decimal(quantity);
  if (!decimal.isInteger()) {
    return "Serial-tracked quantities must be whole numbers.";
  }

  if ((serialIds?.length ?? 0) !== decimal.toNumber()) {
    return "Serial-tracked movements require one serial number per unit.";
  }

  return null;
}

export function validateBinRequired(item: TrackingSettings, binLocationId?: string | null): string | null {
  if (item.binTrackingEnabled && !binLocationId) {
    return "Bin-tracked items require a bin/location for this movement.";
  }
  return null;
}

export function validateExpiryRequired(item: TrackingSettings, batch?: BatchForTrackingValidation | null): string | null {
  if (!item.expiryTrackingEnabled) {
    return null;
  }
  if (!batch) {
    return "Expiry-tracked items require a batch with an expiry date.";
  }
  if (!batch.expiryDate) {
    return "Expiry-tracked items require an expiry date on the selected batch.";
  }
  return null;
}

export function assertCurrentFlowSupportsTracking(item: TrackingSettings, flowName: string): void {
  if (hasAdvancedTracking(item)) {
    throw new BadRequestException(
      `${flowName} does not capture serial, batch, expiry, or bin metadata yet. Use a non-tracked item in this flow or use the future tracked movement workflow.`,
    );
  }
}
