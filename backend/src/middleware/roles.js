/**
 * Role-based access control middleware.
 * Usage: router.get('/', verifyToken, requireRole('ADMIN', 'BUSINESS_OWNER'), handler)
 */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Forbidden: requires one of [${roles.join(', ')}], got ${req.user.role}`,
    });
  }
  next();
};
