import { IsBoolean } from "class-validator";

export class UpdateAccountingCloseSignoffPolicyDto {
  @IsBoolean()
  accountingCloseSingleUserDemoSignoffEnabled!: boolean;
}
