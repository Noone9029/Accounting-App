export interface TenantScoped {
  organizationId: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export * from "./currencies.js";
export * from "./permissions.js";
export * from "./zatca-readiness.js";
