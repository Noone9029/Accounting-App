import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        organizationId: true,
        name: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async get(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!role) {
      throw new NotFoundException("Role not found.");
    }

    return role;
  }
}
