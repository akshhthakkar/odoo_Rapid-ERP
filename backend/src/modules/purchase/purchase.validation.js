import prisma from '../../config/prisma.js';

/**
 * Validate the payload for creating a Purchase Order.
 */
export const validateCreatePO = async (data, tenantId) => {
  const { vendorId, lines } = data;

  if (!vendorId) throw { status: 400, message: 'Vendor is required.' };

  const vendor = await prisma.vendor.findFirst({ where: { id: Number(vendorId), tenantId } });
  if (!vendor) throw { status: 400, message: 'Vendor not found or does not belong to your organisation.' };

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    throw { status: 400, message: 'At least one line item is required.' };
  }

  const productIds = lines.map((l) => Number(l.productId));
  if (new Set(productIds).size !== productIds.length) {
    throw { status: 400, message: 'Duplicate products are not allowed in the same Purchase Order.' };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.productId) throw { status: 400, message: `Line ${i + 1}: product is required.` };

    const qty = Number(line.qty);
    if (isNaN(qty) || qty <= 0) throw { status: 400, message: `Line ${i + 1}: quantity must be a positive number.` };

    const cost = Number(line.unitCost);
    if (isNaN(cost) || cost < 0) throw { status: 400, message: `Line ${i + 1}: unit cost must be a non-negative number.` };

    const product = await prisma.product.findFirst({ where: { id: Number(line.productId), tenantId, isActive: true } });
    if (!product) throw { status: 400, message: `Line ${i + 1}: product not found or does not belong to your organisation.` };
  }
};

/**
 * Ensure a PO has not received any goods yet — used to enforce edit lock.
 */
export const assertNoReceiptsYet = async (poId, tenantId) => {
  const receiptCount = await prisma.purchaseReceipt.count({
    where: { purchaseOrderId: poId, tenantId },
  });
  if (receiptCount > 0) {
    throw { status: 400, message: 'Cannot modify a Purchase Order that has already received inventory.' };
  }
};
