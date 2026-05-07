import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MockZatcaOnboardingAdapter } from "./adapters/mock-zatca-onboarding.adapter";
import { ZATCA_ONBOARDING_ADAPTER } from "./adapters/zatca-onboarding.adapter";
import { ZatcaController } from "./zatca.controller";
import { ZatcaService } from "./zatca.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ZatcaController],
  providers: [ZatcaService, { provide: ZATCA_ONBOARDING_ADAPTER, useClass: MockZatcaOnboardingAdapter }],
  exports: [ZatcaService],
})
export class ZatcaModule {}
