import { Router } from 'express';
import { listVendors, createVendor, editVendor } from './vendors.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER'), listVendors);
router.post('/', requireRole('ADMIN', 'PURCHASE_USER'), createVendor);
router.get('/:id', requireRole('ADMIN', 'BUSINESS_OWNER', 'PURCHASE_USER'), (req, res) => res.status(404).json({ message: "Vendor not found" }));
router.put('/:id', requireRole('ADMIN', 'PURCHASE_USER'), editVendor);

export default router;
