import prisma from "../../config/prisma.js";
import { logAudit, getDiff } from "../../utils/auditLogger.js";

export const getCustomers = async (tenantId, query = {}) => {
  const page = query.page ? parseInt(query.page, 10) : null;
  const limit = query.limit ? parseInt(query.limit, 10) : null;
  const search = query.search || "";

  const where = {
    tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalItems = await prisma.customer.count({ where });

  let customers;
  if (page && limit) {
    const skip = (page - 1) * limit;
    customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    });

    return {
      data: customers,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };
  }

  return prisma.customer.findMany({
    where,
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
        isActive: true,
      },
    });

    await logAudit(
      {
        tenantId,
        userId,
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: created.id,
        entityRef: created.email || `CUST-${created.id}`,
        description: `Customer "${created.name}" created`,
      },
      tx
    );

    return created;
  });

  return customer;
};

export const updateCustomer = async (id, data, userId, tenantId) => {
  const { name, email, phone, address, isActive } = data;

  const existing = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!existing) throw { status: 404, message: "Customer not found" };

  if (name !== undefined && !name.trim()) {
    throw { status: 400, message: "Customer name cannot be empty" };
  }

  if (email && email.trim() && email.trim().toLowerCase() !== existing.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw { status: 400, message: "Invalid email format" };
    }
    const conflict = await prisma.customer.findFirst({
      where: { tenantId, email: email.trim().toLowerCase() },
    });
    if (conflict) {
      throw { status: 409, message: `A customer with email "${email}" already exists` };
    }
  }

  const customer = await prisma.$transaction(async (tx) => {
    const updated = await tx.customer.update({
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
        action: "CUSTOMER_UPDATED",
        entityType: "Customer",
        entityId: updated.id,
        entityRef: updated.email || `CUST-${updated.id}`,
        description: `Customer "${updated.name}" updated`,
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
          action: "CUSTOMER_ARCHIVED",
          entityType: "Customer",
          entityId: updated.id,
          entityRef: updated.email || `CUST-${updated.id}`,
          description: `Customer "${updated.name}" archived/deactivated`,
        },
        tx
      );
    }

    return updated;
  });

  return customer;
};
