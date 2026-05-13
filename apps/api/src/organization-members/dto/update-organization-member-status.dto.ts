import { MembershipStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateOrganizationMemberStatusDto {
  @IsEnum(MembershipStatus)
  status!: MembershipStatus;
}
