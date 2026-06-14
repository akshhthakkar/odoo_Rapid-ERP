import prisma from "../../config/prisma.js";
import { logAudit } from "../../utils/auditLogger.js";

export const getWorkCenters = async (tenantId, query = {}) => {
  const page = query.page ? parseInt(query.page, 10) : null;
  const limit = query.limit ? parseInt(query.limit, 10) : null;
  const search = query.search || "";

  const where = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalItems = await prisma.workCenter.count({ where });

  let workCenters;
  if (page && limit) {
    const skip = (page - 1) * limit;
    workCenters = await prisma.workCenter.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });

    return {
      data: workCenters,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };
  }

  return prisma.workCenter.findMany({
    where,
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
