import { Module } from "@nestjs/common";
import { ObservabilityModule } from "../observability/observability.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PublicApiController } from "./public-api.controller";
import { PublicApiService } from "./public-api.service";

@Module({
  imports: [PrismaModule, ObservabilityModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
  exports: [PublicApiService],
})
export class PublicApiModule {}
