import { Router } from 'express';
import { listWorkCenters, createWorkCenter } from './workcenters.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

router.use(verifyToken);

router.get('/', listWorkCenters);
router.post('/', requireRole('ADMIN'), createWorkCenter);

export default router;
