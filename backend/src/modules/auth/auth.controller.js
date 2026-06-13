import { registerUser, loginUser, getCurrentUser } from './auth.service.js';
import { logAudit } from '../../utils/auditLogger.js';

export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { token, user } = await loginUser(req.body);
    res.status(200).json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        action: "LOGOUT",
        entityType: "User",
        entityId: req.user.id,
        description: `User "${req.user.name}" logged out`,
      });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
