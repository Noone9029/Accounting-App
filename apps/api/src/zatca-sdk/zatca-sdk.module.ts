import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ZatcaSdkController } from "./zatca-sdk.controller";
import { ZatcaSdkService } from "./zatca-sdk.service";

@Module({
  imports: [PrismaModule],
  controllers: [ZatcaSdkController],
  providers: [ZatcaSdkService],
})
export class ZatcaSdkModule {}
