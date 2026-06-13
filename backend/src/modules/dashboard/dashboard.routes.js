import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';
import { getDashboardCtrl } from './dashboard.controller.js';

const router = Router();

// Dashboard route requires authentication and ADMIN or BUSINESS_OWNER roles
router.get('/', verifyToken, requireRole('ADMIN', 'BUSINESS_OWNER'), getDashboardCtrl);

export default router;
