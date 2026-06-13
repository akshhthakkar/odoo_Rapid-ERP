import { Router } from 'express';
import { listCustomers, createCustomer, editCustomer } from './customers.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

router.use(verifyToken);

router.get('/', listCustomers);
router.post('/', requireRole('ADMIN', 'SALES_USER'), createCustomer);
router.put('/:id', requireRole('ADMIN', 'SALES_USER'), editCustomer);

export default router;
