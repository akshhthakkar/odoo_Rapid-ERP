import { Router } from 'express';
import { register, login, me } from './auth.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

// Public routes
router.post('/login', login);

// Protected — any authenticated user
router.get('/me', verifyToken, me);

// Deprecated — returns 410 Gone. Use POST /api/company/register to create a new company account.
router.post('/register', (req, res) => {
  res.status(410).json({
    message: 'This endpoint is deprecated. Use POST /api/company/register to create a new company account.',
  });
});

export default router;
