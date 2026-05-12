import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@ledgerbyte/shared";

export const REQUIRED_PERMISSIONS_KEY = "ledgerbyte:required-permissions";

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
