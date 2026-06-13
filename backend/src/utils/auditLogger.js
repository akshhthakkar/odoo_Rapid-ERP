import prisma from "../config/prisma.js";
import { getContext } from "../middleware/requestContext.js";

const SENSITIVE_FIELDS = ['passwordHash', 'password', 'token', 'resetToken', 'password_hash'];

/**
 * Calculates the difference between two objects, comparing keys
 * and storing only properties that changed in a structured before/after diff.
 * Returns null values if no difference is found.
 */
export const getDiff = (oldObj, newObj) => {
  if (!oldObj || !newObj) return { oldValues: null, newValues: null };
  
  const oldValues = {};
  const newValues = {};

  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  
  for (const key of keys) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    if (['updatedAt', 'createdAt', 'uid'].includes(key)) continue;

    const val1 = oldObj[key];
    const val2 = newObj[key];

    // Determine differences handling numeric and string representations
    let isDiff = false;
    if (val1 !== undefined && val1 !== null && typeof val1.toFixed === 'function' && 
        val2 !== undefined && val2 !== null && typeof val2.toFixed === 'function') {
      isDiff = Number(val1) !== Number(val2);
    } else {
      isDiff = String(val1) !== String(val2);
    }

    if (isDiff) {
      oldValues[key] = val1 === undefined ? null : val1;
      newValues[key] = val2 === undefined ? null : val2;
    }
  }

  return {
    oldValues: Object.keys(oldValues).length > 0 ? oldValues : null,
    newValues: Object.keys(newValues).length > 0 ? newValues : null
  };
};

/**
 * Creates an audit log entry for any significant action.
 * Pulls IP address and User Agent headers dynamically from requestContext storage.
 */
export const logAudit = async (
  {
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    entityRef,
    description,
    metadata,
    oldValues,
    newValues,
    salesOrderId,
    purchaseOrderId,
    manufacturingOrderId,
  },
  tx = prisma
) => {
  const context = getContext();
  const ipAddress = context.ipAddress || null;
  const userAgent = context.userAgent || null;

  return tx.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      entityRef: entityRef || null,
      description,
      metadata: metadata ?? undefined,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
      ipAddress,
      userAgent,
      salesOrderId: salesOrderId ?? undefined,
      purchaseOrderId: purchaseOrderId ?? undefined,
      manufacturingOrderId: manufacturingOrderId ?? undefined,
    },
  });
};
