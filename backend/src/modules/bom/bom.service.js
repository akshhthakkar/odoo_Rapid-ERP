import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/auditLogger.js';
import { validateBomPayload, validateBomExistences, validateCircularGuards } from './bom.validation.js';

// Helper to format BoM responses and calculate summary metrics
const formatBom = (bom) => {
  if (!bom) return null;
  
  const componentCount = bom.components?.length || 0;
  const operationCount = bom.operations?.length || 0;
  const totalOperationTime = bom.operations?.reduce((sum, op) => sum + (op.durationMins || 0), 0) || 0;

  return {
    id: bom.id,
    uid: bom.uid,
    productId: bom.productId,
    product: bom.product ? {
      id: bom.product.id,
      name: bom.product.name,
      sku: bom.product.sku,
      description: bom.product.description
    } : null,
    version: bom.version,
    isActive: bom.isActive,
    notes: bom.notes,
    createdAt: bom.createdAt,
    updatedAt: bom.updatedAt,
    componentCount,
    operationCount,
    totalOperationTime,
    components: bom.components?.map(c => ({
      id: c.id,
      productId: c.productId,
      qty: Number(c.qty),
      name: c.product?.name,
      sku: c.product?.sku
    })) || [],
    operations: bom.operations?.map(op => ({
      id: op.id,
      workCenterId: op.workCenterId,
      workCenterName: op.workCenter?.name,
      name: op.name,
      durationMins: op.durationMins,
      sequence: op.sequence
    })) || []
  };
};

export const getBoms = async (query = {}) => {
  const includeInactive = query.includeInactive === 'true' || query.includeInactive === true;

  const boms = await prisma.boM.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      product: true,
      components: true,
      operations: true
    },
    orderBy: { updatedAt: 'desc' }
  });
  return boms.map(formatBom);
};

export const getBomById = async (id) => {
  const bom = await prisma.boM.findUnique({
    where: { id },
    include: {
      product: true,
      components: {
        include: {
          product: true
        }
      },
      operations: {
        include: {
          workCenter: true
        }
      }
    }
  });

  if (!bom) {
    throw { status: 404, message: 'Bill of Materials not found' };
  }

  return formatBom(bom);
};

export const getBomByProductId = async (productId) => {
  const bom = await prisma.boM.findFirst({
    where: { productId, isActive: true },
    include: {
      product: true,
      components: {
        include: {
          product: true
        }
      },
      operations: {
        include: {
          workCenter: true
        }
      }
    }
  });

  if (!bom) {
    throw { status: 404, message: `No active Bill of Materials found for Product ID ${productId}` };
  }

  return formatBom(bom);
};

export const createBom = async (data, userId) => {
  // 1. Structural checks
  validateBomPayload(data);

  // 2. Existences and circular guards checks
  await validateBomExistences(data);
  await validateCircularGuards(data.productId, data.components);

  const prodId = Number(data.productId);
  const isActive = data.isActive !== undefined ? !!data.isActive : true;

  const createdBom = await prisma.$transaction(async (tx) => {
    // Enforce 1 active BoM per product rule
    if (isActive) {
      await tx.boM.updateMany({
        where: { productId: prodId, isActive: true },
        data: { isActive: false }
      });
    }

    const bom = await tx.boM.create({
      data: {
        productId: prodId,
        version: data.version?.trim() || '1.0',
        isActive,
        notes: data.notes?.trim() || null,
        components: {
          create: data.components.map(c => ({
            productId: Number(c.productId),
            qty: Number(c.qty)
          }))
        },
        operations: {
          create: data.operations.map(o => ({
            workCenterId: Number(o.workCenterId),
            name: o.name.trim(),
            durationMins: Number(o.durationMins),
            sequence: Number(o.sequence)
          }))
        }
      },
      include: {
        product: true,
        components: {
          include: {
            product: true
          }
        },
        operations: {
          include: {
            workCenter: true
          }
        }
      }
    });

    await logAudit({
      userId,
      action: 'BOM_CREATED',
      entityType: 'BoM',
      entityId: bom.id,
      description: `Bill of Materials created for finished product "${bom.product.name}" (Version: ${bom.version})`,
      metadata: { productId: bom.productId, version: bom.version }
    }, tx);

    return bom;
  });

  return formatBom(createdBom);
};

export const updateBom = async (id, data, userId) => {
  const existingBom = await prisma.boM.findUnique({ where: { id } });
  if (!existingBom) {
    throw { status: 404, message: 'Bill of Materials not found' };
  }

  // 1. Manufacturing Order Lock: check if BoM is in use
  const activeMoCount = await prisma.manufacturingOrder.count({
    where: { bomId: id, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }
  });
  if (activeMoCount > 0) {
    throw {
      status: 400,
      message: 'Cannot edit this Bill of Materials because it is currently referenced by active/confirmed Manufacturing Orders.'
    };
  }

  // Use values from payload, fallback to existing values
  const productId = data.productId !== undefined ? Number(data.productId) : existingBom.productId;
  const components = data.components || [];
  const operations = data.operations || [];

  // 2. Run validations
  validateBomPayload({ ...data, productId, components, operations });
  await validateBomExistences({ productId, components, operations });
  await validateCircularGuards(productId, components);

  const isActive = data.isActive !== undefined ? !!data.isActive : existingBom.isActive;

  const updatedBom = await prisma.$transaction(async (tx) => {
    // Deactivate other active BoMs if this one is set to active
    if (isActive && !existingBom.isActive) {
      await tx.boM.updateMany({
        where: { productId, isActive: true, id: { not: id } },
        data: { isActive: false }
      });
    }

    // Clear old lines
    await tx.boMComponent.deleteMany({ where: { bomId: id } });
    await tx.boMOperation.deleteMany({ where: { bomId: id } });

    // Update main BoM and write new lines
    const bom = await tx.boM.update({
      where: { id },
      data: {
        productId,
        version: data.version?.trim() || existingBom.version,
        isActive,
        notes: data.notes !== undefined ? (data.notes?.trim() || null) : existingBom.notes,
        components: {
          create: components.map(c => ({
            productId: Number(c.productId),
            qty: Number(c.qty)
          }))
        },
        operations: {
          create: operations.map(o => ({
            workCenterId: Number(o.workCenterId),
            name: o.name.trim(),
            durationMins: Number(o.durationMins),
            sequence: Number(o.sequence)
          }))
        }
      },
      include: {
        product: true,
        components: {
          include: {
            product: true
          }
        },
        operations: {
          include: {
            workCenter: true
          }
        }
      }
    });

    await logAudit({
      userId,
      action: 'BOM_UPDATED',
      entityType: 'BoM',
      entityId: bom.id,
      description: `Bill of Materials updated for product "${bom.product.name}" (Version: ${bom.version})`,
      metadata: { productId: bom.productId, version: bom.version }
    }, tx);

    return bom;
  });

  return formatBom(updatedBom);
};

export const softDeleteBom = async (id, userId) => {
  const bom = await prisma.boM.findUnique({
    where: { id },
    include: { product: true }
  });
  if (!bom) {
    throw { status: 404, message: 'Bill of Materials not found' };
  }

  // Check Manufacturing Orders lock
  const activeMoCount = await prisma.manufacturingOrder.count({
    where: { bomId: id, status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }
  });
  if (activeMoCount > 0) {
    throw {
      status: 400,
      message: 'Cannot disable this Bill of Materials because it is currently referenced by active/confirmed Manufacturing Orders.'
    };
  }

  const deactivated = await prisma.$transaction(async (tx) => {
    const updated = await tx.boM.update({
      where: { id },
      data: { isActive: false }
    });

    await logAudit({
      userId,
      action: 'BOM_DEACTIVATED',
      entityType: 'BoM',
      entityId: id,
      description: `Bill of Materials deactivated for product "${bom.product.name}"`
    }, tx);

    return updated;
  });

  return { success: true, message: `Bill of Materials for "${bom.product.name}" soft disabled.`, bom: deactivated };
};
