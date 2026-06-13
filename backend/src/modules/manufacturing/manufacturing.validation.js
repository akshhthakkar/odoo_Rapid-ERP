import prisma from "../../config/prisma.js";

/**
 * Validate manufacturing order creation payload.
 */
export const validateMoCreatePayload = (data) => {
  const { productId, bomId, qty, scheduledDate } = data;

  if (!productId) {
    throw { status: 400, message: "Finished product selection is required." };
  }

  if (!bomId) {
    throw { status: 400, message: "Bill of Materials (BoM) selection is required." };
  }

  const parsedQty = Number(qty);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw { status: 400, message: "Manufacturing quantity must be a positive number." };
  }

  if (scheduledDate) {
    const d = new Date(scheduledDate);
    if (isNaN(d.getTime())) {
      throw { status: 400, message: "Invalid scheduled date format." };
    }
  }
};

/**
 * Perform explicit tenant validation checks on the product, BoM, and its operations.
 */
export const validateMoTenantScopes = async (productId, bomId, tenantId) => {
  // 1. Verify product belongs to active tenant
  const product = await prisma.product.findFirst({
    where: { id: Number(productId), tenantId },
  });
  if (!product) {
    throw { status: 400, message: "The selected finished product does not exist under your company." };
  }

  // 2. Verify BoM exists, belongs to active tenant, and matches the product
  const bom = await prisma.boM.findFirst({
    where: { id: Number(bomId), tenantId },
    include: { operations: true, components: true },
  });
  if (!bom) {
    throw { status: 400, message: "The selected Bill of Materials does not exist under your company." };
  }
  if (bom.productId !== Number(productId)) {
    throw { status: 400, message: "The selected Bill of Materials does not match the chosen finished product." };
  }
  if (!bom.isActive) {
    throw { status: 400, message: "The selected Bill of Materials is inactive." };
  }

  // 3. Verify all work centers in BoM operations belong to the same tenant
  const workCenterIds = bom.operations.map((op) => op.workCenterId);
  if (workCenterIds.length > 0) {
    const dbWorkCentersCount = await prisma.workCenter.count({
      where: {
        id: { in: workCenterIds },
        tenantId,
      },
    });
    if (dbWorkCentersCount !== new Set(workCenterIds).size) {
      throw {
        status: 400,
        message: "One or more Work Centers defined in the BoM do not belong to your company.",
      };
    }
  }

  return { product, bom };
};
