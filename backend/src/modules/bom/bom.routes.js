import { Router } from 'express';
import { listBoms, getBomByProduct, getBom, createBom, updateBom, deleteBom } from './bom.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

// All BoM routes require authentication
router.use(verifyToken);

// Read-only routes (accessible to any logged-in user)
router.get('/', listBoms);
router.get('/product/:productId', getBomByProduct);
router.get('/:id', getBom);

// Write/Update/Delete routes (restricted to ADMIN and MANUFACTURING_USER)
router.post('/', requireRole('ADMIN', 'MANUFACTURING_USER'), createBom);
router.put('/:id', requireRole('ADMIN', 'MANUFACTURING_USER'), updateBom);
router.delete('/:id', requireRole('ADMIN', 'MANUFACTURING_USER'), deleteBom);

export default router;
