import { ForbiddenException } from "@nestjs/common";
import { hasPermission, PERMISSIONS } from "@ledgerbyte/shared";
import type { AuthenticatedRequest } from "../auth/auth.types";

export function assertGeneratedDocumentDownloadPermission(request: AuthenticatedRequest): void {
  if (hasPermission(request.membership?.role.permissions, PERMISSIONS.generatedDocuments.download)) {
    return;
  }

  throw new ForbiddenException("You do not have permission to generate or download PDF outputs.");
}
