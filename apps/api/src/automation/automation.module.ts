import { Module } from "@nestjs/common";
import { AutomationProposalBoundaryController } from "./automation-proposal-boundary.controller";
import { AutomationProposalBoundaryService } from "./automation-proposal-boundary.service";

@Module({
  controllers: [AutomationProposalBoundaryController],
  providers: [AutomationProposalBoundaryService],
})
export class AutomationModule {}
