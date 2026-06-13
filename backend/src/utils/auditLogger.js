import prisma from '../config/prisma.js';

/**
 * Creates an audit log entry for any significant action.
 * Call this inside every service method that changes state.
 *
 * @param {object} params
 * @param {number|null} params.userId
 * @param {string} params.action         - e.g. 'SALES_ORDER_CONFIRMED'
 * @param {string} params.entityType     - e.g. 'SalesOrder'
 * @param {number} params.entityId
 * @param {string} params.description    - Human-readable description
 * @param {object} [params.metadata]     - Any extra JSON context
 * @param {number} [params.salesOrderId]
 * @param {number} [params.purchaseOrderId]
 * @param {number} [params.manufacturingOrderId]
 * @param {object} [tx]                  - Prisma transaction client
 */
export const logAudit = async (
  {
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
