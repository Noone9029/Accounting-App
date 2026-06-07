import { PartialType } from "@nestjs/mapped-types";
import { CreateSalesQuoteDto } from "./create-sales-quote.dto";

export class UpdateSalesQuoteDto extends PartialType(CreateSalesQuoteDto) {}
