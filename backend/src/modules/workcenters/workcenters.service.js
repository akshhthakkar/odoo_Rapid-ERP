import prisma from "../../config/prisma.js";
import { logAudit } from "../../utils/auditLogger.js";

export const getWorkCenters = async (tenantId) => {
  return prisma.workCenter.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
};

export const createWorkCenter = async (data, userId, tenantId) => {
  const { name, description } = data;

  if (!name || !name.trim()) {
    throw { status: 400, message: "Work Center name is required" };
  }

  // Tenant-scoped unique name check (replaces old global @unique)
  const existing = await prisma.workCenter.findFirst({
    where: { name: name.trim(), tenantId },
  });
  if (existing) {
    throw { status: 409, message: `Work Center with name "${name}" already exists` };
  }

  const workCenter = await prisma.$transaction(async (tx) => {
    const created = await tx.workCenter.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        tenantId,
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "WORKCENTER_CREATED",
        entityType: "WorkCenter",
        entityId: created.id,
        description: `Work Center "${created.name}" created`,
      },
      tx
    );

    return created;
  });

  return workCenter;
};
