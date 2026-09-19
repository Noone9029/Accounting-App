import { BadRequestException, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}

export function inventoryCommandIdentity(organizationId: string, route: string, key: string | undefined, payload: unknown) {
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new BadRequestException("A stable Idempotency-Key of 8-128 safe characters is required for inventory creation; reuse it only when retrying the same request.");
  return { organizationId, route, keyHash: createHash("sha256").update(key).digest("hex"), requestHash: createHash("sha256").update(JSON.stringify(canonical(payload))).digest("hex") };
}

export async function readInventoryCommand(tx: Prisma.TransactionClient, command: ReturnType<typeof inventoryCommandIdentity>) {
  const existing = await tx.apiIdempotencyRecord.findUnique({ where: { organizationId_route_keyHash: { organizationId: command.organizationId, route: command.route, keyHash: command.keyHash } } });
  if (!existing) return null;
  if (existing.requestHash !== command.requestHash) throw new ConflictException("Idempotency-Key already belongs to a different inventory request.");
  const response = existing.responseJson as { id?: string };
  if (!response.id) throw new ConflictException("Inventory command result is unavailable; accountant review is required before retrying.");
  return response.id;
}

export async function completeInventoryCommand(tx: Prisma.TransactionClient, command: ReturnType<typeof inventoryCommandIdentity>, id: string) {
  await tx.apiIdempotencyRecord.create({ data: { ...command, responseJson: { id }, statusCode: 201 } });
}
