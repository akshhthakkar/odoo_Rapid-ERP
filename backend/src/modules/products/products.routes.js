import { Router } from 'express';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from './products.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

// All products routes require authentication
router.use(verifyToken);

// Read-only routes (accessible to any logged in user)
router.get('/', listProducts);
router.get('/:id', getProduct);

// Write/Update routes (restricted to ADMIN and BUSINESS_OWNER)
router.post('/', requireRole('ADMIN', 'BUSINESS_OWNER'), createProduct);
router.put('/:id', requireRole('ADMIN', 'BUSINESS_OWNER'), updateProduct);

// Delete route (restricted to ADMIN only)
router.delete('/:id', requireRole('ADMIN'), deleteProduct);

export default router;
