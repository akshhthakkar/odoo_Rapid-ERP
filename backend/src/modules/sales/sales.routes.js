import { Router } from 'express';
import { listSalesOrders, getSalesOrder, createSalesOrder, confirmSalesOrder, deliverSalesOrder, cancelSalesOrder } from './sales.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

// All routes require session verification
router.use(verifyToken);

// Read-only routes (accessible to ADMIN, SALES_USER, BUSINESS_OWNER, INVENTORY_MANAGER)
router.get('/', requireRole('ADMIN', 'SALES_USER', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'), listSalesOrders);
router.get('/:id', requireRole('ADMIN', 'SALES_USER', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'), getSalesOrder);

// Write/Update routes (restricted to ADMIN and SALES_USER)
router.post('/', requireRole('ADMIN', 'SALES_USER'), createSalesOrder);
router.post('/:id/confirm', requireRole('ADMIN', 'SALES_USER'), confirmSalesOrder);
router.post('/:id/deliver', requireRole('ADMIN', 'SALES_USER'), deliverSalesOrder);
router.post('/:id/cancel', requireRole('ADMIN', 'SALES_USER'), cancelSalesOrder);

export default router;
