import { Module } from "@nestjs/common";
import { AuditLogModule } from "../audit-log/audit-log.module";
import { ContactController } from "./contact.controller";
import { ContactService } from "./contact.service";

@Module({
  imports: [AuditLogModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
