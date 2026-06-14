import { logAudit } from "../utils/auditLogger.js";

/**
 * Role-based access control middleware.
 * Usage: router.get('/', verifyToken, requireRole('ADMIN', 'BUSINESS_OWNER'), handler)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    logAudit({
      tenantId: req.user.tenantId,
      userId: req.user.id,
      action: "ACCESS_DENIED",
      entityType: "System",
      entityId: 0,
      description: `Blocked access to ${req.method} ${req.originalUrl || req.path}. Required one of: [${roles.join(', ')}], got ${req.user.role}`,
    }).catch(console.error);

    return res.status(403).json({
      message: `Forbidden: requires one of [${roles.join(', ')}], got ${req.user.role}`,
    });
  }
  next();
};
