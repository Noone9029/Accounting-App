import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemController } from "./item.controller";
import { ItemService } from "./item.service";

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ItemController],
  providers: [ItemService],
})
export class ItemModule {}
