import prisma from "../config/prisma.js";

const MODEL_MAP = {
  SO: "salesOrder",
  PO: "purchaseOrder",
  MO: "manufacturingOrder",
  ADJ: "inventoryAdjustment",
  TRA: "stockTransfer",
};

/**
 * Generates tenant-scoped sequential references like SO-0001, PO-0001, MO-0001.
 * Each tenant gets its own independent sequence for each prefix.
 * Safe to call inside a transaction.
 *
 * NOTE: This uses COUNT + 1 which can produce duplicate refs under concurrent
 * requests for the same tenant+prefix. Callers that require strict uniqueness
 * under high concurrency should implement retry logic on P2002 errors, or
 * migrate to a dedicated SequenceCounter table with atomic increments.
 *
 * @param {"SO"|"PO"|"MO"|"ADJ"|"TRA"} prefix
 * @param {number} tenantId - Scope the sequence to this tenant
 * @param {object} tx - Prisma transaction client (optional)
 */
export const generateRef = async (prefix, tenantId, tx = prisma) => {
  const modelName = MODEL_MAP[prefix];
  if (!modelName) throw new Error(`generateRef: unknown prefix "${prefix}". Valid prefixes: ${Object.keys(MODEL_MAP).join(", ")}`);

  const count = await tx[modelName].count({ where: { tenantId } });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};
