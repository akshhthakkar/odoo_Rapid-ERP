import { Router } from 'express';
import { registerTenant } from './company.controller.js';

const router = Router();

// Public — no auth required. Creates a new Tenant + Admin user.
router.post('/register', registerTenant);

export default router;
