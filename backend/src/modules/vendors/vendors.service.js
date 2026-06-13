import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getVendors = async () => {
  return prisma.vendor.findMany({
    orderBy: { name: 'asc' }
  });
};

export const createVendor = async (data, userId) => {
  const { name, email, phone, address } = data;

  if (!name || !name.trim()) {
    throw { status: 400, message: 'Vendor name is required' };
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw { status: 400, message: 'Invalid email format' };
    }
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null
      }
    });

    await logAudit({
      userId,
      action: 'VENDOR_CREATED',
      entityType: 'Vendor',
      entityId: created.id,
      description: `Vendor "${created.name}" created`
    }, tx);

    return created;
  });

  return vendor;
};
