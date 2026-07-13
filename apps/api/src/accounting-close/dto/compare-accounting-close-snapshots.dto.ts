import { IsUUID } from "class-validator";

export class CompareAccountingCloseSnapshotsDto {
  @IsUUID()
  baselineSnapshotId!: string;
}
