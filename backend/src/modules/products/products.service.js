import prisma from '../../config/prisma.js';
import { logAudit } from '../../utils/auditLogger.js';

// Helper to map product fields and calculate freeToUseQty
const formatProduct = (product) => {
  if (!product) return null;
  const onHand = Number(product.onHandQty) || 0;
  const reserved = Number(product.reservedQty) || 0;
  return {
    ...product,
    salesPrice: Number(product.salesPrice),
    costPrice: Number(product.costPrice),
    onHandQty: onHand,
    reservedQty: reserved,
    freeToUseQty: onHand - reserved,
    vendors: product.vendors?.map(pv => ({
      id: pv.id,
      vendorId: pv.vendorId,
      name: pv.vendor?.name,
      unitPrice: Number(pv.unitPrice)
    })) || []
  };
};

export const getProducts = async () => {
  const products = await prisma.product.findMany({
    include: {
      vendors: {
        include: {
          vendor: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return products.map(formatProduct);
};

export const getProductById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      vendors: {
        include: {
          vendor: true
        }
      }
    }
  });

  if (!product) {
    throw { status: 404, message: 'Product not found' };
  }

  return formatProduct(product);
};

export const createProduct = async (data, userId) => {
  const { name, sku, description, salesPrice, costPrice, procureOnDemand, procurementType, vendors } = data;

  // Input validation
  if (!name || !sku) {
    throw { status: 400, message: 'Name and SKU are required' };
  }
  if (salesPrice === undefined || costPrice === undefined) {
    throw { status: 400, message: 'Sales price and Cost price are required' };
  }
  if (Number(salesPrice) < 0 || Number(costPrice) < 0) {
    throw { status: 400, message: 'Prices cannot be negative' };
  }

  // Check unique SKU
  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) {
    throw { status: 409, message: `Product with SKU "${sku}" already exists` };
  }

  // Validate procurementType enum
  if (procurementType && !['PURCHASE', 'MANUFACTURING'].includes(procurementType)) {
    throw { status: 400, message: 'Invalid procurement type' };
  }

  const createdProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        description: description?.trim() || null,
        salesPrice: Number(salesPrice),
        costPrice: Number(costPrice),
        procureOnDemand: !!procureOnDemand,
        procurementType: procurementType || 'PURCHASE',
        vendors: vendors && vendors.length > 0 ? {
          create: vendors.map(v => ({
            vendorId: Number(v.vendorId),
            unitPrice: Number(v.unitPrice)
          }))
        } : undefined
      },
      include: {
        vendors: {
          include: {
            vendor: true
          }
        }
      }
    });

    await logAudit({
      userId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
      description: `Product "${product.name}" (SKU: ${product.sku}) created`,
      metadata: { sku: product.sku, salesPrice: Number(product.salesPrice) }
    }, tx);

    return product;
  });

  return formatProduct(createdProduct);
};

export const updateProduct = async (id, data, userId) => {
  const { name, sku, description, salesPrice, costPrice, procureOnDemand, procurementType, vendors } = data;

  // Validate existence
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    throw { status: 404, message: 'Product not found' };
  }

  // Validate fields if provided
  if (name !== undefined && !name) {
    throw { status: 400, message: 'Name cannot be empty' };
  }
  if (sku !== undefined && !sku) {
    throw { status: 400, message: 'SKU cannot be empty' };
  }
  if (salesPrice !== undefined && (Number(salesPrice) < 0 || isNaN(Number(salesPrice)))) {
    throw { status: 400, message: 'Sales price must be a non-negative number' };
  }
  if (costPrice !== undefined && (Number(costPrice) < 0 || isNaN(Number(costPrice)))) {
    throw { status: 400, message: 'Cost price must be a non-negative number' };
  }

  // Check unique SKU if changing
  if (sku && sku.trim().toUpperCase() !== existingProduct.sku) {
    const skuConflict = await prisma.product.findUnique({ where: { sku: sku.trim().toUpperCase() } });
    if (skuConflict) {
      throw { status: 409, message: `Product with SKU "${sku}" already exists` };
    }
  }

  if (procurementType && !['PURCHASE', 'MANUFACTURING'].includes(procurementType)) {
    throw { status: 400, message: 'Invalid procurement type' };
  }

  const updatedProduct = await prisma.$transaction(async (tx) => {
    // If vendors are supplied, replace all vendor mappings for this product
    if (vendors !== undefined) {
      await tx.productVendor.deleteMany({ where: { productId: id } });
    }

    const product = await tx.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        sku: sku !== undefined ? sku.trim().toUpperCase() : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        salesPrice: salesPrice !== undefined ? Number(salesPrice) : undefined,
        costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
        procureOnDemand: procureOnDemand !== undefined ? !!procureOnDemand : undefined,
        procurementType: procurementType !== undefined ? procurementType : undefined,
        vendors: vendors && vendors.length > 0 ? {
          create: vendors.map(v => ({
            vendorId: Number(v.vendorId),
            unitPrice: Number(v.unitPrice)
          }))
        } : undefined
      },
      include: {
        vendors: {
          include: {
            vendor: true
          }
        }
      }
    });

    await logAudit({
      userId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product.id,
      description: `Product "${product.name}" (SKU: ${product.sku}) updated`,
      metadata: { sku: product.sku, salesPrice: Number(product.salesPrice) }
    }, tx);

    return product;
  });

  return formatProduct(updatedProduct);
};

export const deleteProduct = async (id, userId) => {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw { status: 404, message: 'Product not found' };
  }

  // Check dependencies
  const [salesLines, purchaseLines, boms, bomComponents, moOrders] = await Promise.all([
    prisma.salesOrderLine.count({ where: { productId: id } }),
    prisma.purchaseOrderLine.count({ where: { productId: id } }),
    prisma.boM.count({ where: { productId: id } }),
    prisma.boMComponent.count({ where: { productId: id } }),
    prisma.manufacturingOrder.count({ where: { productId: id } })
  ]);

  if (salesLines > 0 || purchaseLines > 0 || boms > 0 || bomComponents > 0 || moOrders > 0) {
    throw {
      status: 400,
      message: 'Product cannot be deleted because it is referenced in Sales Orders, Purchase Orders, BoMs, or Manufacturing Orders.'
    };
  }

  await prisma.$transaction(async (tx) => {
    // Delete product vendors first (cascading relation)
    await tx.productVendor.deleteMany({ where: { productId: id } });
    
    // Delete stock movements if any (optional, let's clean up)
    await tx.stockMovement.deleteMany({ where: { productId: id } });

    await tx.product.delete({ where: { id } });

    await logAudit({
      userId,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      description: `Product "${product.name}" (SKU: ${product.sku}) deleted`
    }, tx);
  });

  return { success: true, message: `Product "${product.name}" deleted successfully` };
};
