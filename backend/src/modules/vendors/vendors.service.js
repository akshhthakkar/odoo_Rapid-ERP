import prisma from "../../config/prisma.js";
import { logAudit, getDiff } from "../../utils/auditLogger.js";

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
        isActive: true,
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "VENDOR_CREATED",
        entityType: "Vendor",
        entityId: created.id,
        entityRef: created.email || `VEND-${created.id}`,
        description: `Vendor "${created.name}" created`,
      },
      tx
    );

    return created;
  });

  return vendor;
};

export const updateVendor = async (id, data, userId, tenantId) => {
  const { name, email, phone, address, isActive } = data;

  const existing = await prisma.vendor.findFirst({ where: { id, tenantId } });
  if (!existing) throw { status: 404, message: "Vendor not found" };

  if (name !== undefined && !name.trim()) {
    throw { status: 400, message: "Vendor name cannot be empty" };
  }

  if (email && email.trim() && email.trim().toLowerCase() !== existing.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw { status: 400, message: "Invalid email format" };
    }
    const conflict = await prisma.vendor.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (conflict) {
      throw { status: 409, message: `A vendor with email "${email}" already exists` };
    }
  }

  const vendor = await prisma.$transaction(async (tx) => {
    const updated = await tx.vendor.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        email: email !== undefined ? (email?.trim().toLowerCase() || null) : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
    });

    const { oldValues, newValues } = getDiff(existing, updated);

    await logAudit(
      {
        tenantId,
        userId,
        action: "VENDOR_UPDATED",
        entityType: "Vendor",
        entityId: updated.id,
        entityRef: updated.email || `VEND-${updated.id}`,
        description: `Vendor "${updated.name}" updated`,
        oldValues,
        newValues,
      },
      tx
    );

    if (existing.isActive && !updated.isActive) {
      await logAudit(
        {
          tenantId,
          userId,
          action: "VENDOR_ARCHIVED",
          entityType: "Vendor",
          entityId: updated.id,
          entityRef: updated.email || `VEND-${updated.id}`,
          description: `Vendor "${updated.name}" archived/deactivated`,
        },
        tx
      );
    }

    return updated;
  });

  return vendor;
};
