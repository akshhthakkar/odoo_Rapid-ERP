import prisma from '../config/prisma.js';

const MODEL_MAP = {
  SO: 'salesOrder',
  PO: 'purchaseOrder',
  MO: 'manufacturingOrder',
};

/**
 * Generates sequential references like SO-0001, PO-0001, MO-0001
 * Uses DB count to determine next number — safe to call inside a transaction.
 * @param {'SO'|'PO'|'MO'} prefix
 * @param {object} tx - Prisma transaction client (optional, defaults to global prisma)
 */
export const generateRef = async (prefix, tx = prisma) => {
  const modelName = MODEL_MAP[prefix];
  if (!modelName) throw new Error(`Unknown prefix: ${prefix}`);

  const count = await tx[modelName].count();
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
};
