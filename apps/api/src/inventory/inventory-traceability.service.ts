import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  InventoryBatchStatus,
  InventoryBinLocationStatus,
  InventoryBinLocationType,
  InventorySerialNumberStatus,
  ItemStatus,
  ItemTrackingMode,
  Prisma,
  WarehouseStatus,
} from "@prisma/client";
import { AuditLogService } from "../audit-log/audit-log.service";
import { AUDIT_ENTITY_TYPES } from "../audit-log/audit-events";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateInventoryBatchDto,
  CreateInventoryBinLocationDto,
  CreateInventorySerialNumberDto,
  InventoryBatchQueryDto,
  InventoryBinLocationQueryDto,
  InventorySerialNumberQueryDto,
  UpdateInventoryBatchDto,
  UpdateInventoryBinLocationDto,
  UpdateInventorySerialNumberDto,
} from "./dto/inventory-traceability.dto";

const binLocationInclude = {
  warehouse: { select: { id: true, code: true, name: true, status: true } },
};

const batchInclude = {
  item: { select: { id: true, name: true, sku: true, inventoryTracking: true, trackingMode: true, expiryTrackingEnabled: true, binTrackingEnabled: true } },
};

const serialInclude = {
  item: { select: { id: true, name: true, sku: true, inventoryTracking: true, trackingMode: true, expiryTrackingEnabled: true, binTrackingEnabled: true } },
  batch: { select: { id: true, batchNumber: true, lotNumber: true, expiryDate: true, status: true } },
  currentWarehouse: { select: { id: true, code: true, name: true, status: true } },
  currentBinLocation: { select: { id: true, code: true, name: true, type: true, status: true, warehouseId: true } },
  lastMovement: { select: { id: true, type: true, movementDate: true, quantity: true, warehouseId: true } },
};

@Injectable()
export class InventoryTraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  listBinLocations(organizationId: string, query: InventoryBinLocationQueryDto = {}) {
    return this.prisma.inventoryBinLocation.findMany({
      where: {
        organizationId,
        warehouseId: query.warehouseId,
        type: query.type,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: "insensitive" } },
                { name: { contains: query.search, mode: "insensitive" } },
                { description: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: binLocationInclude,
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }],
    });
  }

  async getBinLocation(organizationId: string, id: string) {
    const binLocation = await this.prisma.inventoryBinLocation.findFirst({
      where: { id, organizationId },
      include: binLocationInclude,
    });
    if (!binLocation) throw new NotFoundException("Bin/location not found.");
    return binLocation;
  }

  async createBinLocation(organizationId: string, actorUserId: string, dto: CreateInventoryBinLocationDto) {
    const warehouse = await this.activeWarehouse(organizationId, dto.warehouseId);
    const code = this.requiredCode(dto.code, "Bin/location code");

    const binLocation = await this.prisma.inventoryBinLocation
      .create({
        data: {
          organizationId,
          warehouseId: warehouse.id,
          code,
          name: this.requiredText(dto.name, "Name"),
          type: dto.type ?? InventoryBinLocationType.BIN,
          status: dto.status ?? InventoryBinLocationStatus.ACTIVE,
          description: this.cleanOptional(dto.description),
        },
        include: binLocationInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Bin/location code must be unique per warehouse."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_BIN_LOCATION,
      entityId: binLocation.id,
      after: this.binAudit(binLocation),
    });
    return binLocation;
  }

  async updateBinLocation(organizationId: string, actorUserId: string, id: string, dto: UpdateInventoryBinLocationDto) {
    const existing = await this.getBinLocation(organizationId, id);
    const binLocation = await this.prisma.inventoryBinLocation
      .update({
        where: { id },
        data: {
          code: dto.code === undefined ? undefined : this.requiredCode(dto.code, "Bin/location code"),
          name: dto.name === undefined ? undefined : this.requiredText(dto.name, "Name"),
          type: dto.type,
          status: dto.status,
          description: this.cleanNullable(dto.description),
        },
        include: binLocationInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Bin/location code must be unique per warehouse."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_BIN_LOCATION,
      entityId: id,
      before: this.binAudit(existing),
      after: this.binAudit(binLocation),
    });
    return binLocation;
  }

  listBatches(organizationId: string, query: InventoryBatchQueryDto = {}) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        organizationId,
        itemId: query.itemId,
        status: query.status,
        ...(query.search
          ? {
              OR: [
                { batchNumber: { contains: query.search, mode: "insensitive" } },
                { lotNumber: { contains: query.search, mode: "insensitive" } },
                { notes: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: batchInclude,
      orderBy: [{ createdAt: "desc" }, { batchNumber: "asc" }],
    });
  }

  async getBatch(organizationId: string, id: string) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id, organizationId },
      include: batchInclude,
    });
    if (!batch) throw new NotFoundException("Batch/lot not found.");
    return batch;
  }

  async createBatch(organizationId: string, actorUserId: string, dto: CreateInventoryBatchDto) {
    const item = await this.batchTrackedItem(organizationId, dto.itemId);
    const expiryDate = this.optionalDate(dto.expiryDate, "Expiry date");
    if (item.expiryTrackingEnabled && !expiryDate) {
      throw new BadRequestException("Expiry date is required because this item has expiry tracking enabled.");
    }

    const batch = await this.prisma.inventoryBatch
      .create({
        data: {
          organizationId,
          itemId: item.id,
          batchNumber: this.requiredText(dto.batchNumber, "Batch number"),
          lotNumber: this.cleanOptional(dto.lotNumber),
          manufactureDate: this.optionalDate(dto.manufactureDate, "Manufacture date"),
          expiryDate,
          status: dto.status ?? InventoryBatchStatus.ACTIVE,
          notes: this.cleanOptional(dto.notes),
        },
        include: batchInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Batch number must be unique per item."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_BATCH,
      entityId: batch.id,
      after: this.batchAudit(batch),
    });
    return batch;
  }

  async updateBatch(organizationId: string, actorUserId: string, id: string, dto: UpdateInventoryBatchDto) {
    const existing = await this.getBatch(organizationId, id);
    const item = await this.itemForTracking(organizationId, existing.itemId);
    const expiryDate = dto.expiryDate === undefined ? undefined : this.optionalDate(dto.expiryDate, "Expiry date");
    if (item.expiryTrackingEnabled && expiryDate === null) {
      throw new BadRequestException("Expiry date is required because this item has expiry tracking enabled.");
    }

    const batch = await this.prisma.inventoryBatch
      .update({
        where: { id },
        data: {
          batchNumber: dto.batchNumber === undefined ? undefined : this.requiredText(dto.batchNumber, "Batch number"),
          lotNumber: this.cleanNullable(dto.lotNumber),
          manufactureDate: dto.manufactureDate === undefined ? undefined : this.optionalDate(dto.manufactureDate, "Manufacture date"),
          expiryDate,
          status: dto.status,
          notes: this.cleanNullable(dto.notes),
        },
        include: batchInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Batch number must be unique per item."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_BATCH,
      entityId: id,
      before: this.batchAudit(existing),
      after: this.batchAudit(batch),
    });
    return batch;
  }

  listSerialNumbers(organizationId: string, query: InventorySerialNumberQueryDto = {}) {
    return this.prisma.inventorySerialNumber.findMany({
      where: {
        organizationId,
        itemId: query.itemId,
        batchId: query.batchId,
        currentWarehouseId: query.warehouseId,
        currentBinLocationId: query.binLocationId,
        status: query.status,
        ...(query.search ? { serialNumber: { contains: query.search, mode: "insensitive" } } : {}),
      },
      include: serialInclude,
      orderBy: [{ createdAt: "desc" }, { serialNumber: "asc" }],
    });
  }

  async getSerialNumber(organizationId: string, id: string) {
    const serialNumber = await this.prisma.inventorySerialNumber.findFirst({
      where: { id, organizationId },
      include: serialInclude,
    });
    if (!serialNumber) throw new NotFoundException("Serial number not found.");
    return serialNumber;
  }

  async createSerialNumber(organizationId: string, actorUserId: string, dto: CreateInventorySerialNumberDto) {
    const item = await this.serialTrackedItem(organizationId, dto.itemId);
    const references = await this.serialReferences(organizationId, item.id, dto.batchId, dto.currentWarehouseId, dto.currentBinLocationId);

    const serialNumber = await this.prisma.inventorySerialNumber
      .create({
        data: {
          organizationId,
          itemId: item.id,
          serialNumber: this.requiredText(dto.serialNumber, "Serial number"),
          batchId: references.batchId,
          status: dto.status ?? InventorySerialNumberStatus.AVAILABLE,
          currentWarehouseId: references.currentWarehouseId,
          currentBinLocationId: references.currentBinLocationId,
        },
        include: serialInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Serial number must be unique per item."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "CREATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_SERIAL_NUMBER,
      entityId: serialNumber.id,
      after: this.serialAudit(serialNumber),
    });
    return serialNumber;
  }

  async updateSerialNumber(organizationId: string, actorUserId: string, id: string, dto: UpdateInventorySerialNumberDto) {
    const existing = await this.getSerialNumber(organizationId, id);
    const references = await this.serialReferences(
      organizationId,
      existing.itemId,
      dto.batchId,
      dto.currentWarehouseId,
      dto.currentBinLocationId,
      existing.currentWarehouseId,
    );

    const serialNumber = await this.prisma.inventorySerialNumber
      .update({
        where: { id },
        data: {
          serialNumber: dto.serialNumber === undefined ? undefined : this.requiredText(dto.serialNumber, "Serial number"),
          batchId: references.batchId,
          status: dto.status,
          currentWarehouseId: references.currentWarehouseId,
          currentBinLocationId: references.currentBinLocationId,
        },
        include: serialInclude,
      })
      .catch((error: unknown) => this.handleUnique(error, "Serial number must be unique per item."));

    await this.auditLogService.log({
      organizationId,
      actorUserId,
      action: "UPDATE",
      entityType: AUDIT_ENTITY_TYPES.INVENTORY_SERIAL_NUMBER,
      entityId: id,
      before: this.serialAudit(existing),
      after: this.serialAudit(serialNumber),
    });
    return serialNumber;
  }

  async itemTraceability(organizationId: string, itemId: string) {
    const item = await this.itemForTracking(organizationId, itemId);
    const [batches, serialNumbers, movements] = await Promise.all([
      this.prisma.inventoryBatch.findMany({ where: { organizationId, itemId }, include: batchInclude, orderBy: [{ createdAt: "desc" }] }),
      this.prisma.inventorySerialNumber.findMany({ where: { organizationId, itemId }, include: serialInclude, orderBy: [{ serialNumber: "asc" }] }),
      this.prisma.stockMovement.findMany({
        where: { organizationId, itemId },
        select: {
          id: true,
          movementDate: true,
          type: true,
          quantity: true,
          warehouseId: true,
          batchId: true,
          serialNumberId: true,
          binLocationId: true,
          fromBinLocationId: true,
          toBinLocationId: true,
          referenceType: true,
          referenceId: true,
          warehouse: { select: { id: true, code: true, name: true } },
          batch: { select: { id: true, batchNumber: true, lotNumber: true, expiryDate: true, status: true } },
          serialNumber: { select: { id: true, serialNumber: true, status: true } },
          binLocation: { select: { id: true, code: true, name: true, type: true } },
          fromBinLocation: { select: { id: true, code: true, name: true, type: true } },
          toBinLocation: { select: { id: true, code: true, name: true, type: true } },
        },
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    const movementWarehouseIds = new Set(movements.map((movement) => movement.warehouseId));
    const serialWarehouseIds = new Set(serialNumbers.map((serial) => serial.currentWarehouseId).filter(Boolean) as string[]);
    const binLocationIds = new Set(
      [
        ...movements.flatMap((movement) => [movement.binLocationId, movement.fromBinLocationId, movement.toBinLocationId]),
        ...serialNumbers.map((serial) => serial.currentBinLocationId),
      ].filter(Boolean) as string[],
    );
    const warehouses = await this.prisma.warehouse.findMany({
      where: { organizationId, id: { in: [...new Set([...movementWarehouseIds, ...serialWarehouseIds])] } },
      select: { id: true, code: true, name: true, status: true },
      orderBy: { code: "asc" },
    });
    const binLocations = await this.prisma.inventoryBinLocation.findMany({
      where: { organizationId, id: { in: [...binLocationIds] } },
      include: binLocationInclude,
      orderBy: [{ warehouse: { code: "asc" } }, { code: "asc" }],
    });

    const warnings = this.traceabilityWarnings(item, movements.length, movements);

    return {
      item,
      trackingMode: item.trackingMode,
      expiryTrackingEnabled: item.expiryTrackingEnabled,
      binTrackingEnabled: item.binTrackingEnabled,
      hasStockMovements: movements.length > 0,
      movementCount: movements.length,
      batches,
      serialNumbers,
      warehouses,
      binLocations,
      movements,
      warnings,
      readOnly: true,
      noMutation: true,
      noPostingEffect: true,
      noInventoryValuationEffect: true,
      noFifoActivation: true,
      noCogsEffect: true,
      noApEffect: true,
      noArEffect: true,
      noVatEffect: true,
      noZatcaEffect: true,
      noFinancialStatementEffect: true,
    };
  }

  private traceabilityWarnings(
    item: { trackingMode: ItemTrackingMode; expiryTrackingEnabled: boolean; binTrackingEnabled: boolean },
    movementCount: number,
    movements: Array<{ batchId: string | null; serialNumberId: string | null; binLocationId: string | null; fromBinLocationId: string | null; toBinLocationId: string | null }>,
  ): string[] {
    const warnings = [
      "Tracking settings add operational traceability. They do not change historical inventory valuation, FIFO preview, COGS, journals, VAT, or financial statements.",
    ];
    if (item.trackingMode === ItemTrackingMode.NONE && !item.binTrackingEnabled && !item.expiryTrackingEnabled) {
      warnings.push("This item is not configured for serial, batch, expiry, or bin tracking.");
    }
    if (movementCount === 0) {
      warnings.push("No stock movements exist for this item yet.");
    }
    if (
      movementCount > 0 &&
      ((item.trackingMode === ItemTrackingMode.BATCH && movements.some((movement) => !movement.batchId)) ||
        (item.trackingMode === ItemTrackingMode.SERIAL && movements.some((movement) => !movement.serialNumberId)) ||
        (item.trackingMode === ItemTrackingMode.SERIAL_AND_BATCH && movements.some((movement) => !movement.serialNumberId || !movement.batchId)) ||
        (item.binTrackingEnabled && movements.some((movement) => !movement.binLocationId && !movement.fromBinLocationId && !movement.toBinLocationId)))
    ) {
      warnings.push("Some existing movements do not carry the selected tracking metadata. Treat this as groundwork until a migration/backfill policy exists.");
    }
    return warnings;
  }

  private async itemForTracking(organizationId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, organizationId },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        status: true,
        inventoryTracking: true,
        trackingMode: true,
        expiryTrackingEnabled: true,
        binTrackingEnabled: true,
      },
    });
    if (!item) throw new BadRequestException("Item must belong to this organization.");
    return item;
  }

  private async batchTrackedItem(organizationId: string, itemId: string) {
    const item = await this.itemForTracking(organizationId, itemId);
    if (!item.inventoryTracking || item.status !== ItemStatus.ACTIVE) {
      throw new BadRequestException("Batch setup requires an active inventory-tracked item.");
    }
    if (item.trackingMode !== ItemTrackingMode.BATCH && item.trackingMode !== ItemTrackingMode.SERIAL_AND_BATCH) {
      throw new BadRequestException("Batch setup requires item tracking mode Batch or Serial and batch.");
    }
    return item;
  }

  private async serialTrackedItem(organizationId: string, itemId: string) {
    const item = await this.itemForTracking(organizationId, itemId);
    if (!item.inventoryTracking || item.status !== ItemStatus.ACTIVE) {
      throw new BadRequestException("Serial setup requires an active inventory-tracked item.");
    }
    if (item.trackingMode !== ItemTrackingMode.SERIAL && item.trackingMode !== ItemTrackingMode.SERIAL_AND_BATCH) {
      throw new BadRequestException("Serial setup requires item tracking mode Serial or Serial and batch.");
    }
    return item;
  }

  private async activeWarehouse(organizationId: string, warehouseId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId },
      select: { id: true, status: true },
    });
    if (!warehouse) throw new BadRequestException("Warehouse must belong to this organization.");
    if (warehouse.status !== WarehouseStatus.ACTIVE) throw new BadRequestException("Bin/location setup requires an active warehouse.");
    return warehouse;
  }

  private async serialReferences(
    organizationId: string,
    itemId: string,
    batchId?: string | null,
    warehouseId?: string | null,
    binLocationId?: string | null,
    currentWarehouseId?: string | null,
  ) {
    const next: { batchId?: string | null; currentWarehouseId?: string | null; currentBinLocationId?: string | null } = {};
    if (batchId !== undefined) {
      if (batchId === null) {
        next.batchId = null;
      } else {
        const batch = await this.prisma.inventoryBatch.findFirst({ where: { id: batchId, organizationId, itemId }, select: { id: true } });
        if (!batch) throw new BadRequestException("Batch must belong to this item and organization.");
        next.batchId = batch.id;
      }
    }

    if (warehouseId !== undefined) {
      if (warehouseId === null) {
        next.currentWarehouseId = null;
      } else {
        const warehouse = await this.activeWarehouse(organizationId, warehouseId);
        next.currentWarehouseId = warehouse.id;
      }
    }

    if (binLocationId !== undefined) {
      if (binLocationId === null) {
        next.currentBinLocationId = null;
      } else {
        const binLocation = await this.prisma.inventoryBinLocation.findFirst({
          where: { id: binLocationId, organizationId, status: InventoryBinLocationStatus.ACTIVE },
          select: { id: true, warehouseId: true },
        });
        if (!binLocation) throw new BadRequestException("Bin/location must be active and belong to this organization.");
        const resolvedWarehouseId = next.currentWarehouseId ?? currentWarehouseId;
        if (resolvedWarehouseId && resolvedWarehouseId !== binLocation.warehouseId) {
          throw new BadRequestException("Serial current bin/location must belong to the current warehouse.");
        }
        next.currentWarehouseId = resolvedWarehouseId ?? binLocation.warehouseId;
        next.currentBinLocationId = binLocation.id;
      }
    }
    return next;
  }

  private binAudit(binLocation: { id: string; warehouseId: string; code: string; name: string; type: InventoryBinLocationType; status: InventoryBinLocationStatus }) {
    return {
      binLocationId: binLocation.id,
      warehouseId: binLocation.warehouseId,
      code: binLocation.code,
      name: binLocation.name,
      type: binLocation.type,
      status: binLocation.status,
      noInventoryQuantityEffect: true,
      noAccountingEffect: true,
    };
  }

  private batchAudit(batch: { id: string; itemId: string; batchNumber: string; lotNumber: string | null; expiryDate: Date | null; status: InventoryBatchStatus }) {
    return {
      batchId: batch.id,
      itemId: batch.itemId,
      batchNumber: batch.batchNumber,
      lotNumber: batch.lotNumber,
      expiryDate: batch.expiryDate?.toISOString() ?? null,
      status: batch.status,
      noInventoryQuantityEffect: true,
      noAccountingEffect: true,
    };
  }

  private serialAudit(serial: {
    id: string;
    itemId: string;
    batchId: string | null;
    serialNumber: string;
    status: InventorySerialNumberStatus;
    currentWarehouseId: string | null;
    currentBinLocationId: string | null;
  }) {
    return {
      serialId: serial.id,
      itemId: serial.itemId,
      batchId: serial.batchId,
      serialNumber: serial.serialNumber,
      status: serial.status,
      warehouseId: serial.currentWarehouseId,
      binLocationId: serial.currentBinLocationId,
      noInventoryQuantityEffect: true,
      noAccountingEffect: true,
    };
  }

  private handleUnique(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BadRequestException(message);
    }
    throw error;
  }

  private requiredCode(value: string, label: string): string {
    return this.requiredText(value, label).toUpperCase();
  }

  private requiredText(value: string, label: string): string {
    const cleaned = value.trim();
    if (!cleaned) throw new BadRequestException(`${label} is required.`);
    return cleaned;
  }

  private cleanOptional(value?: string | null): string | null {
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }

  private cleanNullable(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    return this.cleanOptional(value);
  }

  private optionalDate(value: string | null | undefined, label: string): Date | null {
    if (value === null || value === undefined || value === "") return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} must be a valid date.`);
    return date;
  }
}
