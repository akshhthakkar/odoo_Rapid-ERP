import { Router } from 'express';
import { listVendors, createVendor, editVendor } from './vendors.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

router.use(verifyToken);

router.get('/', listVendors);
router.post('/', requireRole('ADMIN', 'PURCHASE_USER'), createVendor);
router.put('/:id', requireRole('ADMIN', 'PURCHASE_USER'), editVendor);

export default router;
