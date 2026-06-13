import prisma from "../../config/prisma.js";
import { logAudit } from "../../utils/auditLogger.js";

export const getCustomers = async (tenantId) => {
  return prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
};

export const createCustomer = async (data, userId, tenantId) => {
  const { name, email, phone, address } = data;

  if (!name || !name.trim()) {
    throw { status: 400, message: "Customer name is required" };
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw { status: 400, message: "Invalid email format" };
    }
    // Check tenant-scoped email uniqueness
    const existing = await prisma.customer.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (existing) {
      throw { status: 409, message: `A customer with email "${email}" already exists` };
    }
  }

  const customer = await prisma.$transaction(async (tx) => {
    const created = await tx.customer.create({
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
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: created.id,
        description: `Customer "${created.name}" created`,
      },
      tx
    );

    return created;
  });

  return customer;
};
