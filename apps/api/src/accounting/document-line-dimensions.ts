import { BadRequestException } from "@nestjs/common";
import { DimensionStatus, Prisma } from "@prisma/client";

export interface DocumentLineDimensionInput {
  costCenterId?: string | null;
  projectId?: string | null;
}

type DimensionLockExecutor = Pick<Prisma.TransactionClient, "$queryRaw">;

export async function lockActiveDocumentLineDimensions(
  tx: DimensionLockExecutor,
  organizationId: string,
  lines: DocumentLineDimensionInput[],
): Promise<void> {
  const costCenterIds = uniqueIds(lines.map((line) => line.costCenterId));
  if (costCenterIds.length > 0) {
    const costCenters = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "CostCenter"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "id" IN (${Prisma.join(costCenterIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND "status" = ${DimensionStatus.ACTIVE}::"DimensionStatus"
      ORDER BY "id"
      FOR UPDATE
    `);
    if (costCenters.length !== costCenterIds.length) {
      throw new BadRequestException("One or more cost centers do not exist or are archived.");
    }
  }

  const projectIds = uniqueIds(lines.map((line) => line.projectId));
  if (projectIds.length > 0) {
    const projects = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "Project"
      WHERE "organizationId" = ${organizationId}::uuid
        AND "id" IN (${Prisma.join(projectIds.map((id) => Prisma.sql`${id}::uuid`))})
        AND "status" = ${DimensionStatus.ACTIVE}::"DimensionStatus"
      ORDER BY "id"
      FOR UPDATE
    `);
    if (projects.length !== projectIds.length) {
      throw new BadRequestException("One or more projects do not exist or are archived.");
    }
  }
}

export function normalizedDocumentLineDimensions(line: DocumentLineDimensionInput): {
  costCenterId: string | null;
  projectId: string | null;
} {
  return {
    costCenterId: cleanId(line.costCenterId),
    projectId: cleanId(line.projectId),
  };
}

function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map(cleanId).filter((value): value is string => Boolean(value)))];
}

function cleanId(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned || null;
}
