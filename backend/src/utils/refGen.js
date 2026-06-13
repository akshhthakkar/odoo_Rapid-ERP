import prisma from "../config/prisma.js";

const MODEL_MAP = {
  SO: "salesOrder",
  PO: "purchaseOrder",
  MO: "manufacturingOrder",
};

/**
 * Generates tenant-scoped sequential references like SO-0001, PO-0001, MO-0001.
 * Each tenant gets its own independent sequence for each prefix.
 * Safe to call inside a transaction.
 *
 * @param {"SO"|"PO"|"MO"} prefix
 * @param {number} tenantId - Scope the sequence to this tenant
 * @param {object} tx - Prisma transaction client (optional)
 */
export const generateRef = async (prefix, tenantId, tx = prisma) => {
  const modelName = MODEL_MAP[prefix];
  if (!modelName) throw new Error(`Unknown prefix: ${prefix}`);

  const count = await tx[modelName].count({ where: { tenantId } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};
