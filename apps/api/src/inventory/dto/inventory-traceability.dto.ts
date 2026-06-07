import {
  InventoryBatchStatus,
  InventoryBinLocationStatus,
  InventoryBinLocationType,
  InventorySerialNumberStatus,
  ItemTrackingMode,
} from "@prisma/client";
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class InventoryBinLocationQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(InventoryBinLocationType)
  type?: InventoryBinLocationType;

  @IsOptional()
  @IsEnum(InventoryBinLocationStatus)
  status?: InventoryBinLocationStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateInventoryBinLocationDto {
  @IsUUID()
  warehouseId!: string;

  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(InventoryBinLocationType)
  type?: InventoryBinLocationType;

  @IsOptional()
  @IsEnum(InventoryBinLocationStatus)
  status?: InventoryBinLocationStatus;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class UpdateInventoryBinLocationDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(InventoryBinLocationType)
  type?: InventoryBinLocationType;

  @IsOptional()
  @IsEnum(InventoryBinLocationStatus)
  status?: InventoryBinLocationStatus;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class InventoryBatchQueryDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsEnum(InventoryBatchStatus)
  status?: InventoryBatchStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateInventoryBatchDto {
  @IsUUID()
  itemId!: string;

  @IsString()
  batchNumber!: string;

  @IsOptional()
  @IsString()
  lotNumber?: string | null;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsEnum(InventoryBatchStatus)
  status?: InventoryBatchStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateInventoryBatchDto {
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string | null;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsEnum(InventoryBatchStatus)
  status?: InventoryBatchStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class InventorySerialNumberQueryDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  binLocationId?: string;

  @IsOptional()
  @IsEnum(InventorySerialNumberStatus)
  status?: InventorySerialNumberStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateInventorySerialNumberDto {
  @IsUUID()
  itemId!: string;

  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsUUID()
  batchId?: string | null;

  @IsOptional()
  @IsEnum(InventorySerialNumberStatus)
  status?: InventorySerialNumberStatus;

  @IsOptional()
  @IsUUID()
  currentWarehouseId?: string | null;

  @IsOptional()
  @IsUUID()
  currentBinLocationId?: string | null;
}

export class UpdateInventorySerialNumberDto {
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsUUID()
  batchId?: string | null;

  @IsOptional()
  @IsEnum(InventorySerialNumberStatus)
  status?: InventorySerialNumberStatus;

  @IsOptional()
  @IsUUID()
  currentWarehouseId?: string | null;

  @IsOptional()
  @IsUUID()
  currentBinLocationId?: string | null;
}

export class UpdateItemTrackingSettingsDto {
  @IsOptional()
  @IsEnum(ItemTrackingMode)
  trackingMode?: ItemTrackingMode;

  @IsOptional()
  @IsBoolean()
  expiryTrackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  binTrackingEnabled?: boolean;
}
