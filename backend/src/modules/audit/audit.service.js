import prisma from "../../config/prisma.js";

export const getAuditLogs = async ({
  tenantId,
  page = 1,
  limit = 20,
  startDate,
  endDate,
  userId,
  action,
  entityType,
  searchText,
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  const where = { tenantId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  if (userId) {
    where.userId = Number(userId);
  }

  if (action) {
    where.action = action;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  if (searchText) {
    where.OR = [
      { description: { contains: searchText, mode: "insensitive" } },
      { entityRef: { contains: searchText, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip: offset,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    logs,
  };
};

export const getAuditLogById = async (id, tenantId) => {
  const log = await prisma.auditLog.findFirst({
    where: { id: Number(id), tenantId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!log) {
    throw { status: 404, message: "Audit log entry not found" };
  }
  return log;
};
