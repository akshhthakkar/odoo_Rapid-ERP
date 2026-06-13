import prisma from "../../config/prisma.js";
import { logAudit } from "../../utils/auditLogger.js";

export const getVendors = async (tenantId) => {
  return prisma.vendor.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
};

export const createVendor = async (data, userId, tenantId) => {
  const { name, email, phone, address } = data;

  if (!name || !name.trim()) {
    throw { status: 400, message: "Vendor name is required" };
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw { status: 400, message: "Invalid email format" };
    }
    // Check tenant-scoped email uniqueness
    const existing = await prisma.vendor.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (existing) {
      throw { status: 409, message: `A vendor with email "${email}" already exists` };
    }
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        tenantId,
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "VENDOR_CREATED",
        entityType: "Vendor",
        entityId: created.id,
        description: `Vendor "${created.name}" created`,
      },
      tx
    );

    return created;
  });

  return vendor;
};
