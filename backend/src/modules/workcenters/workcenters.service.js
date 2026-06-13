import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getWorkCenters = async () => {
  return prisma.workCenter.findMany({
    orderBy: { name: 'asc' }
  });
};

export const createWorkCenter = async (data, userId) => {
  const { name, description } = data;

  if (!name || !name.trim()) {
    throw { status: 400, message: 'Work Center name is required' };
  }

  // Unique name check
  const existing = await prisma.workCenter.findUnique({
    where: { name: name.trim() }
  });
  if (existing) {
    throw { status: 409, message: `Work Center with name "${name}" already exists` };
  }

  const workCenter = await prisma.$transaction(async (tx) => {
    const created = await tx.workCenter.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    await logAudit({
      userId,
      action: 'WORKCENTER_CREATED',
      entityType: 'WorkCenter',
      entityId: created.id,
      description: `Work Center "${created.name}" created`
    }, tx);

    return created;
  });

  return workCenter;
};
