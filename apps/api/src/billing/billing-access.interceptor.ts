import { CallHandler, ExecutionContext, ForbiddenException, Injectable, NestInterceptor } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { BillingEntitlementService } from "./billing-entitlement.service";

/** Runs after authentication/tenant guards; UI visibility never grants write access. */
@Injectable()
export class BillingAccessInterceptor implements NestInterceptor {
  constructor(private readonly billing: BillingEntitlementService) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || this.billing.enforcementMode() !== "ENFORCE") return next.handle();
    const path = request.path ?? request.url?.split("?")[0] ?? "";
    if (/^\/(billing|auth)(\/|$)/.test(path)) return next.handle();
    const organizationId = request.organizationId ?? (context.getClass().name === "OrganizationController" && request.method === "PATCH" ? request.params.id as string : undefined);
    if (!organizationId) return next.handle();
    const { accessMode } = await this.billing.organizationAccessMode(organizationId);
    if (accessMode === "FULL") return next.handle();
    if (accessMode === "READ_ONLY" && (["GET", "HEAD", "OPTIONS"].includes(request.method) || isReadOnlyExport(request.method, path))) return next.handle();
    throw new ForbiddenException(accessMode === "BILLING_ONLY" ? "Choose a plan and start your trial to use this organization." : "This organization is read-only. Restore your subscription to make changes.");
  }
}

/** These handlers only generate/read export artifacts; their permission guards still apply. */
export function isReadOnlyExport(method: string, path: string): boolean {
  if (method !== "POST") return false;
  if (/^\/reports\/report-pack(?:\/[^/]+\/download-readiness)?\/?$/.test(path)) return true;
  if (/^\/(sales-invoices|purchase-bills|credit-notes|purchase-debit-notes|sales-quotes|purchase-orders|delivery-notes|cash-expenses|customer-refunds|supplier-refunds)\/[^/]+\/generate-pdf\/?$/.test(path)) return true;
  return /^\/(contacts\/[^/]+\/generate-statement-pdf|(customer-payments|supplier-payments)\/[^/]+\/generate-receipt-pdf)\/?$/.test(path);
}
