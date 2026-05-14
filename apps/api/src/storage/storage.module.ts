import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageConfigurationService } from "./storage-configuration.service";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [StorageController],
  providers: [StorageConfigurationService, StorageService],
  exports: [StorageConfigurationService, StorageService],
})
export class StorageModule {}
