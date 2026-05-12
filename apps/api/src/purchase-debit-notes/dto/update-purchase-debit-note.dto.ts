import { PartialType } from "@nestjs/mapped-types";
import { CreatePurchaseDebitNoteDto } from "./create-purchase-debit-note.dto";

export class UpdatePurchaseDebitNoteDto extends PartialType(CreatePurchaseDebitNoteDto) {}
