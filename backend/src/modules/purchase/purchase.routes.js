import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';
import * as ctrl from './purchase.controller.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Read — ADMIN, PURCHASE_USER, BUSINESS_OWNER, INVENTORY_MANAGER
router.get('/',    requireRole('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'), ctrl.listPurchaseOrders);
router.get('/:id', requireRole('ADMIN', 'PURCHASE_USER', 'BUSINESS_OWNER', 'INVENTORY_MANAGER'), ctrl.getPurchaseOrder);

// Write — ADMIN, PURCHASE_USER
router.post('/',          requireRole('ADMIN', 'PURCHASE_USER'), ctrl.createPurchaseOrder);
router.post('/:id/confirm', requireRole('ADMIN', 'PURCHASE_USER'), ctrl.confirmPurchaseOrder);
router.post('/:id/cancel',  requireRole('ADMIN', 'PURCHASE_USER'), ctrl.cancelPurchaseOrder);

// Receive — ADMIN, PURCHASE_USER, INVENTORY_MANAGER
router.post('/:id/receive', requireRole('ADMIN', 'PURCHASE_USER', 'INVENTORY_MANAGER'), ctrl.receiveGoods);

export default router;
