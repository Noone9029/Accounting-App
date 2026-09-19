import type { ConfigService } from "@nestjs/config";

/** Public enrollment must never create accounts with unenforced subscriptions. */
export function selfServiceEnrollmentEnabled(config: ConfigService): boolean {
  return config.get("LEDGERBYTE_SELF_SERVICE_ENABLED") === "true" && config.get<string>("BILLING_ENFORCEMENT_MODE")?.trim().toUpperCase() === "ENFORCE";
}
