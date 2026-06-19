import prisma from "../../config/prisma.js";
import { logAudit, getDiff } from "../../utils/auditLogger.js";
import { validateBomPayload, validateBomExistences, validateCircularGuards } from "./bom.validation.js";

const formatBom = (bom) => {
  if (!bom) return null;
  const componentCount = bom.components?.length || 0;
  const operationCount = bom.operations?.length || 0;
  const totalOperationTime = bom.operations?.reduce((sum, op) => sum + (op.durationMins || 0), 0) || 0;

  return {
    id: bom.id,
    uid: bom.uid,
    productId: bom.productId,
    tenantId: bom.tenantId,
    product: bom.product ? { id: bom.product.id, name: bom.product.name, sku: bom.product.sku, description: bom.product.description } : null,
    version: bom.version,
    isActive: bom.isActive,
    notes: bom.notes,
    createdAt: bom.createdAt,
    updatedAt: bom.updatedAt,
    componentCount,
    operationCount,
    totalOperationTime,
    components: bom.components?.map((c) => ({ id: c.id, productId: c.productId, qty: Number(c.qty), name: c.product?.name, sku: c.product?.sku })) || [],
    operations: bom.operations?.map((op) => ({ id: op.id, workCenterId: op.workCenterId, workCenterName: op.workCenter?.name, name: op.name, durationMins: op.durationMins, sequence: op.sequence })) || [],
  };
};

export const getBoms = async (query = {}, tenantId) => {
  const page = query.page ? parseInt(query.page, 10) : null;
  const limit = query.limit ? parseInt(query.limit, 10) : null;
  const search = query.search || "";
  const includeInactive = query.includeInactive === "true" || query.includeInactive === true;

  const where = {
    tenantId,
    ...(!includeInactive && { isActive: true }),
    ...(search && {
      OR: [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { sku: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const totalItems = await prisma.boM.count({ where });

  let boms;
  if (page && limit) {
    const skip = (page - 1) * limit;
    boms = await prisma.boM.findMany({
      where,
      include: { product: true, components: true, operations: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    });
  } else {
    boms = await prisma.boM.findMany({
      where,
      include: { product: true, components: true, operations: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  const formatted = boms.map(formatBom);

  if (page && limit) {
    return {
      data: formatted,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };
  }

  return formatted;
};

export const getBomById = async (id, tenantId) => {
  const bom = await prisma.boM.findFirst({
    where: { id, tenantId },
    include: { product: true, components: { include: { product: true } }, operations: { include: { workCenter: true } } },
  });
  if (!bom) throw { status: 404, message: "Bill of Materials not found" };
  return formatBom(bom);
};

export const getBomByProductId = async (productId, tenantId) => {
  const bom = await prisma.boM.findFirst({
    where: { productId, tenantId, isActive: true },
    include: { product: true, components: { include: { product: true } }, operations: { include: { workCenter: true } } },
  });
  if (!bom) throw { status: 404, message: `No active Bill of Materials found for Product ID ${productId}` };
  return formatBom(bom);
};

export const createBom = async (data, userId, tenantId) => {
  validateBomPayload(data);
  await validateBomExistences(data, tenantId);
  await validateCircularGuards(data.productId, data.components, tenantId);

  const prodId = Number(data.productId);
  const isActive = data.isActive !== undefined ? !!data.isActive : true;

  const createdBom = await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.boM.updateMany({ where: { productId: prodId, tenantId, isActive: true }, data: { isActive: false } });
    }

    const bom = await tx.boM.create({
      data: {
        productId: prodId,
        tenantId,
        version: data.version?.trim() || "1.0",
        isActive,
        notes: data.notes?.trim() || null,
        components: { create: data.components.map((c) => ({ productId: Number(c.productId), qty: Number(c.qty) })) },
        operations: { create: data.operations.map((o) => ({ workCenterId: Number(o.workCenterId), name: o.name.trim(), durationMins: Number(o.durationMins), sequence: Number(o.sequence) })) },
      },
      include: { product: true, components: { include: { product: true } }, operations: { include: { workCenter: true } } },
    });

    await logAudit({ tenantId, userId, action: "BOM_CREATED", entityType: "BoM", entityId: bom.id,
      entityRef: `${bom.product.sku}-BOM`,
      description: `Bill of Materials created for finished product "${bom.product.name}" (Version: ${bom.version})`,
      metadata: { productId: bom.productId, version: bom.version } }, tx);

    return bom;
  });

  return formatBom(createdBom);
};

export const updateBom = async (id, data, userId, tenantId) => {
  const existingBom = await prisma.boM.findFirst({ where: { id, tenantId } });
  if (!existingBom) throw { status: 404, message: "Bill of Materials not found" };

  const productId = data.productId !== undefined ? Number(data.productId) : existingBom.productId;
  const components = data.components || [];
  const operations = data.operations || [];

  validateBomPayload({ ...data, productId, components, operations });
  await validateBomExistences({ productId, components, operations }, tenantId);
  await validateCircularGuards(productId, components, tenantId);

  const isActive = data.isActive !== undefined ? !!data.isActive : existingBom.isActive;

  const updatedBom = await prisma.$transaction(async (tx) => {
    if (isActive && !existingBom.isActive) {
      await tx.boM.updateMany({ where: { productId, tenantId, isActive: true, id: { not: id } }, data: { isActive: false } });
    }

    if (data.components !== undefined) {
      await tx.boMComponent.deleteMany({ where: { bomId: id } });
    }
    if (data.operations !== undefined) {
      await tx.boMOperation.deleteMany({ where: { bomId: id } });
    }

    const bom = await tx.boM.update({
      where: { id },
      data: {
        productId,
        version: data.version?.trim() || existingBom.version,
        isActive,
        notes: data.notes !== undefined ? (data.notes?.trim() || null) : existingBom.notes,
        ...(data.components !== undefined && {
          components: { create: components.map((c) => ({ productId: Number(c.productId), qty: Number(c.qty) })) },
        }),
        ...(data.operations !== undefined && {
          operations: { create: operations.map((o) => ({ workCenterId: Number(o.workCenterId), name: o.name.trim(), durationMins: Number(o.durationMins), sequence: Number(o.sequence) })) },
        }),
      },
      include: { product: true, components: { include: { product: true } }, operations: { include: { workCenter: true } } },
    });

    const { oldValues, newValues } = getDiff(existingBom, bom);
    await logAudit({ tenantId, userId, action: "BOM_UPDATED", entityType: "BoM", entityId: bom.id,
      entityRef: `${bom.product.sku}-BOM`,
      description: `Bill of Materials updated for product "${bom.product.name}" (Version: ${bom.version})`,
      oldValues, newValues,
      metadata: { productId: bom.productId, version: bom.version } }, tx);

    return bom;
  });

  return formatBom(updatedBom);
};

export const softDeleteBom = async (id, userId, tenantId) => {
  const bom = await prisma.boM.findFirst({ where: { id, tenantId }, include: { product: true } });
  if (!bom) throw { status: 404, message: "Bill of Materials not found" };

  const activeMoCount = await prisma.manufacturingOrder.count({ where: { bomId: id, tenantId, status: { in: ["CONFIRMED", "IN_PROGRESS"] } } });
  if (activeMoCount > 0) throw { status: 400, message: "Cannot disable this Bill of Materials because it is currently referenced by active/confirmed Manufacturing Orders." };

  const deactivated = await prisma.$transaction(async (tx) => {
    const updated = await tx.boM.update({ where: { id }, data: { isActive: false } });
    await logAudit({ tenantId, userId, action: "BOM_DEACTIVATED", entityType: "BoM", entityId: id,
      entityRef: `${bom.product.sku}-BOM`,
      description: `Bill of Materials deactivated for product "${bom.product.name}"` }, tx);
    return updated;
  });

  return { success: true, message: `Bill of Materials for "${bom.product.name}" soft disabled.`, bom: deactivated };
};
