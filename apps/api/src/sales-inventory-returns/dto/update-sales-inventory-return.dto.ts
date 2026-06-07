import { PartialType } from "@nestjs/mapped-types";
import { CreateSalesInventoryReturnDto } from "./create-sales-inventory-return.dto";

export class UpdateSalesInventoryReturnDto extends PartialType(CreateSalesInventoryReturnDto) {}
