import prisma from '../../config/prisma.js';

// Recursive check for circular dependencies
export const checkCircularDependency = async (finishedProductId, componentProductIds, visited = new Set()) => {
  if (componentProductIds.includes(finishedProductId)) {
    return true;
  }
  
  for (const compId of componentProductIds) {
    if (visited.has(compId)) continue;
    visited.add(compId);

    // Fetch the active BoM for this component
    const subBom = await prisma.boM.findFirst({
      where: { productId: compId, isActive: true },
      include: { components: true }
    });

    if (subBom) {
      const subComponentIds = subBom.components.map(c => c.productId);
      if (await checkCircularDependency(finishedProductId, subComponentIds, visited)) {
        return true;
      }
    }
  }
  return false;
};

export const validateBomPayload = (data) => {
  const { productId, version, components, operations } = data;

  if (!productId || isNaN(Number(productId))) {
    throw { status: 400, message: 'Valid finished product ID is required' };
  }

  if (version !== undefined && !version.trim()) {
    throw { status: 400, message: 'Version cannot be empty' };
  }

  // Validate components
  if (!components || !Array.isArray(components) || components.length === 0) {
    throw { status: 400, message: 'At least one component is required for a Bill of Materials' };
  }

  components.forEach((c, index) => {
    if (!c.productId || isNaN(Number(c.productId))) {
      throw { status: 400, message: `Component at index ${index} must have a valid productId` };
    }
    if (c.qty === undefined || isNaN(Number(c.qty)) || Number(c.qty) <= 0) {
      throw { status: 400, message: `Component at index ${index} must have a positive quantity` };
    }
  });

  // Validate operations
  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    throw { status: 400, message: 'At least one manufacturing operation is required for a Bill of Materials' };
  }

  operations.forEach((op, index) => {
    if (!op.workCenterId || isNaN(Number(op.workCenterId))) {
      throw { status: 400, message: `Operation at index ${index} must have a valid workCenterId` };
    }
    if (!op.name || !op.name.trim()) {
      throw { status: 400, message: `Operation at index ${index} must have a valid name` };
    }
    if (op.durationMins === undefined || isNaN(Number(op.durationMins)) || Number(op.durationMins) <= 0) {
      throw { status: 400, message: `Operation at index ${index} must have a positive duration in minutes` };
    }
    if (op.sequence === undefined || isNaN(Number(op.sequence)) || Number(op.sequence) <= 0) {
      throw { status: 400, message: `Operation at index ${index} must have a positive sequence number` };
    }
  });

  const sequences = operations.map(o => Number(o.sequence));
  const uniqueSequences = new Set(sequences);
  if (uniqueSequences.size !== sequences.length) {
    throw { status: 400, message: 'Duplicate operation sequences are not allowed' };
  }
};

export const validateBomExistences = async (data) => {
  const { productId, components, operations } = data;

  // 1. Finished product exists
  const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
  if (!product) {
    throw { status: 400, message: `Finished product with ID ${productId} does not exist` };
  }

  // 2. All component products exist
  const componentIds = components.map(c => Number(c.productId));
  const uniqueComponentIds = [...new Set(componentIds)];
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: uniqueComponentIds } }
  });

  if (existingProducts.length !== uniqueComponentIds.length) {
    const existingIds = existingProducts.map(p => p.id);
    const missingIds = uniqueComponentIds.filter(id => !existingIds.includes(id));
    throw { status: 400, message: `Component product(s) with ID(s) [${missingIds.join(', ')}] do not exist` };
  }

  // 3. All work centers exist
  const workCenterIds = operations.map(o => Number(o.workCenterId));
  const uniqueWcIds = [...new Set(workCenterIds)];
  const existingWcs = await prisma.workCenter.findMany({
    where: { id: { in: uniqueWcIds } }
  });

  if (existingWcs.length !== uniqueWcIds.length) {
    const existingIds = existingWcs.map(w => w.id);
    const missingIds = uniqueWcIds.filter(id => !existingIds.includes(id));
    throw { status: 400, message: `Work Center(s) with ID(s) [${missingIds.join(', ')}] do not exist` };
  }
};

export const validateCircularGuards = async (productId, components) => {
  const prodId = Number(productId);
  const compIds = components.map(c => Number(c.productId));

  // Self-reference check
  if (compIds.includes(prodId)) {
    throw { status: 400, message: 'A finished product cannot be a component of itself.' };
  }

  // Circular reference check
  const isCircular = await checkCircularDependency(prodId, compIds);
  if (isCircular) {
    throw { status: 400, message: 'Circular component dependency detected. This configuration is not allowed.' };
  }
};
