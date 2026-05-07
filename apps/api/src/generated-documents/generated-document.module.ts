import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GeneratedDocumentController } from "./generated-document.controller";
import { GeneratedDocumentService } from "./generated-document.service";

@Module({
  imports: [PrismaModule],
  controllers: [GeneratedDocumentController],
  providers: [GeneratedDocumentService],
  exports: [GeneratedDocumentService],
})
export class GeneratedDocumentModule {}
