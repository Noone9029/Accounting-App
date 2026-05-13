import { IsUUID } from "class-validator";

export class UpdateOrganizationMemberRoleDto {
  @IsUUID()
  roleId!: string;
}
