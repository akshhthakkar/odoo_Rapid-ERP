import { Router } from 'express';
import { register, login, me } from './auth.controller.js';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';

const router = Router();

// Public routes
router.post('/login', login);

// Protected — any authenticated user
router.get('/me', verifyToken, me);

// Protected — ADMIN only: create new users
// First admin is bootstrapped via seed. No open registration.
router.post('/register', verifyToken, requireRole('ADMIN'), register);

export default router;
