import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { HttpZatcaSandboxAdapter } from "./adapters/http-zatca-sandbox.adapter";
import { MockZatcaOnboardingAdapter } from "./adapters/mock-zatca-onboarding.adapter";
import { SandboxDisabledZatcaOnboardingAdapter } from "./adapters/sandbox-disabled-zatca-onboarding.adapter";
import { ZATCA_ONBOARDING_ADAPTER } from "./adapters/zatca-onboarding.adapter";
import { readZatcaAdapterConfig, type ZatcaAdapterConfig, ZATCA_ADAPTER_CONFIG } from "./zatca.config";
import { ZatcaController } from "./zatca.controller";
import { ZatcaService } from "./zatca.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ZatcaController],
  providers: [
    ZatcaService,
    { provide: ZATCA_ADAPTER_CONFIG, useFactory: () => readZatcaAdapterConfig() },
    {
      provide: ZATCA_ONBOARDING_ADAPTER,
      inject: [ZATCA_ADAPTER_CONFIG],
      useFactory: (config: ZatcaAdapterConfig) => {
        if (config.mode === "sandbox") {
          return new HttpZatcaSandboxAdapter(config);
        }
        if (config.mode === "sandbox-disabled") {
          return new SandboxDisabledZatcaOnboardingAdapter();
        }
        return new MockZatcaOnboardingAdapter();
      },
    },
  ],
  exports: [ZatcaService],
})
export class ZatcaModule {}
