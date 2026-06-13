import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/roles.js';
import { 
  inviteUser, 
  getCompanyUsers, 
  changePassword,
  updateUserStatus,
  updateUserRole
} from './users.controller.js';

const router = Router();

// ADMIN only — invite a new user to this tenant
router.post('/invite', verifyToken, requireRole('ADMIN'), inviteUser);

// ADMIN only — list all users in this tenant
router.get('/', verifyToken, requireRole('ADMIN'), getCompanyUsers);

// Any authenticated user — change own password
router.post('/change-password', verifyToken, changePassword);

// ADMIN only — status and role updates
router.put('/:id/status', verifyToken, requireRole('ADMIN'), updateUserStatus);
router.put('/:id/role', verifyToken, requireRole('ADMIN'), updateUserRole);

export default router;
