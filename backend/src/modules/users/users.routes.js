import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';
import { inviteUser, getCompanyUsers, changePassword } from './users.controller.js';

const router = Router();

// ADMIN only — invite a new user to this tenant
router.post('/invite', verifyToken, requireRole('ADMIN'), inviteUser);

// ADMIN only — list all users in this tenant
router.get('/', verifyToken, requireRole('ADMIN'), getCompanyUsers);

// Any authenticated user — change own password
router.post('/change-password', verifyToken, changePassword);

export default router;
