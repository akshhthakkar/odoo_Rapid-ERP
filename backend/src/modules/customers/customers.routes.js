import { Router } from 'express';
import { listCustomers, createCustomer, editCustomer } from './customers.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

router.use(verifyToken);

router.get('/', requireRole('ADMIN', 'BUSINESS_OWNER', 'SALES_USER'), listCustomers);
router.post('/', requireRole('ADMIN', 'SALES_USER'), createCustomer);
router.get('/:id', requireRole('ADMIN', 'BUSINESS_OWNER', 'SALES_USER'), (req, res) => res.status(404).json({ message: "Customer not found" }));
router.put('/:id', requireRole('ADMIN', 'SALES_USER'), editCustomer);
router.delete('/:id', requireRole('ADMIN'), (req, res) => res.status(404).json({ message: "Customer not found" }));

export default router;
