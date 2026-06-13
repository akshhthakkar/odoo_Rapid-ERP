import prisma from "../../config/prisma.js";
import { logAudit } from "../../utils/auditLogger.js";

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
    vendors: product.vendors?.map((pv) => ({
      id: pv.id,
      vendorId: pv.vendorId,
      name: pv.vendor?.name,
      unitPrice: Number(pv.unitPrice),
    })) || [],
  };
};

export const getProducts = async (tenantId) => {
  const products = await prisma.product.findMany({
    where: { tenantId },
    include: { vendors: { include: { vendor: true } } },
    orderBy: { createdAt: "desc" },
  });
  return products.map(formatProduct);
};

export const getProductById = async (id, tenantId) => {
  const product = await prisma.product.findFirst({
    where: { id, tenantId },
    include: { vendors: { include: { vendor: true } } },
  });
  if (!product) throw { status: 404, message: "Product not found" };
  return formatProduct(product);
};

export const createProduct = async (data, userId, tenantId) => {
  const { name, sku, description, salesPrice, costPrice, procureOnDemand, procurementType, isActive, vendors } = data;

  if (!name || !sku) throw { status: 400, message: "Name and SKU are required" };
  if (salesPrice === undefined || costPrice === undefined) throw { status: 400, message: "Sales price and Cost price are required" };
  if (Number(salesPrice) < 0 || Number(costPrice) < 0) throw { status: 400, message: "Prices cannot be negative" };

  // Tenant-scoped SKU uniqueness check
  const existing = await prisma.product.findFirst({ where: { sku: sku.trim().toUpperCase(), tenantId } });
  if (existing) throw { status: 409, message: `Product with SKU "${sku}" already exists` };

  if (procurementType && !["PURCHASE", "MANUFACTURING"].includes(procurementType)) {
    throw { status: 400, message: "Invalid procurement type" };
  }

  if (vendors && vendors.length > 0) {
    const vendorIds = vendors.map((v) => Number(v.vendorId));
    const validVendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds }, tenantId },
    });
    if (validVendors.length !== vendorIds.length) {
      throw { status: 400, message: "One or more vendor IDs are invalid or belong to a different tenant" };
    }
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
        procurementType: procurementType || "PURCHASE",
        isActive: isActive !== undefined ? !!isActive : true,
        tenantId,
        vendors: vendors && vendors.length > 0 ? {
          create: vendors.map((v) => ({ vendorId: Number(v.vendorId), unitPrice: Number(v.unitPrice) })),
        } : undefined,
      },
      include: { vendors: { include: { vendor: true } } },
    });

    await logAudit({ tenantId, userId, action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id,
      description: `Product "${product.name}" (SKU: ${product.sku}) created`,
      metadata: { sku: product.sku, salesPrice: Number(product.salesPrice) } }, tx);

    return product;
  });

  return formatProduct(createdProduct);
};

export const updateProduct = async (id, data, userId, tenantId) => {
  const { name, sku, description, salesPrice, costPrice, procureOnDemand, procurementType, isActive, vendors } = data;

  const existingProduct = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!existingProduct) throw { status: 404, message: "Product not found" };

  if (name !== undefined && !name) throw { status: 400, message: "Name cannot be empty" };
  if (sku !== undefined && !sku) throw { status: 400, message: "SKU cannot be empty" };
  if (salesPrice !== undefined && (Number(salesPrice) < 0 || isNaN(Number(salesPrice)))) throw { status: 400, message: "Sales price must be a non-negative number" };
  if (costPrice !== undefined && (Number(costPrice) < 0 || isNaN(Number(costPrice)))) throw { status: 400, message: "Cost price must be a non-negative number" };

  // Tenant-scoped SKU conflict check
  if (sku && sku.trim().toUpperCase() !== existingProduct.sku) {
    const skuConflict = await prisma.product.findFirst({ where: { sku: sku.trim().toUpperCase(), tenantId } });
    if (skuConflict) throw { status: 409, message: `Product with SKU "${sku}" already exists` };
  }

  if (procurementType && !["PURCHASE", "MANUFACTURING"].includes(procurementType)) {
    throw { status: 400, message: "Invalid procurement type" };
  }

  if (vendors && vendors.length > 0) {
    const vendorIds = vendors.map((v) => Number(v.vendorId));
    const validVendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds }, tenantId },
    });
    if (validVendors.length !== vendorIds.length) {
      throw { status: 400, message: "One or more vendor IDs are invalid or belong to a different tenant" };
    }
  }

  if (isActive === false) {
    if (Number(existingProduct.reservedQty) > 0) throw { status: 400, message: "Cannot deactivate product while there is reserved stock (reservedQty > 0)." };
    const activeBomCount = await prisma.boM.count({ where: { productId: id, tenantId, isActive: true } });
    if (activeBomCount > 0) throw { status: 400, message: "Cannot deactivate product because it is the finished product of an active Bill of Materials." };
    const activeComponentCount = await prisma.boMComponent.count({ where: { productId: id, bom: { isActive: true, tenantId } } });
    if (activeComponentCount > 0) throw { status: 400, message: "Cannot deactivate product because it is a component in an active Bill of Materials." };
  }

  const updatedProduct = await prisma.$transaction(async (tx) => {
    if (vendors !== undefined) await tx.productVendor.deleteMany({ where: { productId: id } });

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
        isActive: isActive !== undefined ? !!isActive : undefined,
        vendors: vendors && vendors.length > 0 ? {
          create: vendors.map((v) => ({ vendorId: Number(v.vendorId), unitPrice: Number(v.unitPrice) })),
        } : undefined,
      },
      include: { vendors: { include: { vendor: true } } },
    });

    await logAudit({ tenantId, userId, action: "PRODUCT_UPDATED", entityType: "Product", entityId: product.id,
      description: `Product "${product.name}" (SKU: ${product.sku}) updated`,
      metadata: { sku: product.sku, salesPrice: Number(product.salesPrice) } }, tx);

    return product;
  });

  return formatProduct(updatedProduct);
};

export const deleteProduct = async (id, userId, tenantId) => {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw { status: 404, message: "Product not found" };
  if (Number(product.reservedQty) > 0) throw { status: 400, message: "Cannot delete product while there is reserved stock (reservedQty > 0)." };

  const activeBomCount = await prisma.boM.count({ where: { productId: id, tenantId, isActive: true } });
  if (activeBomCount > 0) throw { status: 400, message: "Cannot delete product because it is the finished product of an active Bill of Materials." };

  const activeComponentCount = await prisma.boMComponent.count({ where: { productId: id, bom: { isActive: true, tenantId } } });
  if (activeComponentCount > 0) throw { status: 400, message: "Cannot delete product because it is a component in an active Bill of Materials." };

  const [salesLines, purchaseLines, boms, bomComponents, moOrders] = await Promise.all([
    prisma.salesOrderLine.count({ where: { productId: id } }),
    prisma.purchaseOrderLine.count({ where: { productId: id } }),
    prisma.boM.count({ where: { productId: id, tenantId } }),
    prisma.boMComponent.count({ where: { productId: id } }),
    prisma.manufacturingOrder.count({ where: { productId: id, tenantId } }),
  ]);

  if (salesLines > 0 || purchaseLines > 0 || boms > 0 || bomComponents > 0 || moOrders > 0) {
    throw { status: 400, message: "Product cannot be deleted because it is referenced in Sales Orders, Purchase Orders, BoMs, or Manufacturing Orders." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.productVendor.deleteMany({ where: { productId: id } });
    await tx.stockMovement.deleteMany({ where: { productId: id, tenantId } });
    await tx.product.delete({ where: { id } });
    await logAudit({ tenantId, userId, action: "PRODUCT_DELETED", entityType: "Product", entityId: id,
      description: `Product "${product.name}" (SKU: ${product.sku}) deleted` }, tx);
  });

  return { success: true, message: `Product "${product.name}" deleted successfully` };
};
