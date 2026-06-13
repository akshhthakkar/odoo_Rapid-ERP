import prisma from "../config/prisma.js";

/**
 * Creates an audit log entry for any significant action.
 *
 * @param {object} params
 * @param {number} params.tenantId
 * @param {number|null} params.userId
 * @param {string} params.action
 * @param {string} params.entityType
 * @param {number} params.entityId
 * @param {string} params.description
 * @param {object} [params.metadata]
 * @param {number} [params.salesOrderId]
 * @param {number} [params.purchaseOrderId]
 * @param {number} [params.manufacturingOrderId]
 * @param {object} [tx] - Prisma transaction client
 */
export const logAudit = async (
  {
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    description,
    metadata,
    salesOrderId,
    purchaseOrderId,
    manufacturingOrderId,
  },
  tx = prisma
) => {
  return tx.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      description,
      metadata: metadata ?? undefined,
      salesOrderId: salesOrderId ?? undefined,
      purchaseOrderId: purchaseOrderId ?? undefined,
      manufacturingOrderId: manufacturingOrderId ?? undefined,
    },
  });
};
