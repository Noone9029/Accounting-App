import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { NumberSequenceModule } from "../number-sequences/number-sequence.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CollectionController } from "./collection.controller";
import { CollectionService } from "./collection.service";

@Module({
  imports: [PrismaModule, AuditLogModule, NumberSequenceModule],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
