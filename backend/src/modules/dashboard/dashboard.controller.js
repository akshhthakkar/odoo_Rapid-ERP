import * as dashboardService from './dashboard.service.js';
import { validateDateRange } from '../analytics/analytics.validation.js';
import { logAudit } from '../../utils/auditLogger.js';

export const getDashboardCtrl = async (req, res, next) => {
  try {
    // Validate request query dates if present
    validateDateRange(req.query);

    const tenantId = req.user.tenantId;

    // Fetch unified dashboard payload
    const data = await dashboardService.getExecutiveDashboard(tenantId, req.query, req.user);

    // Record DASHBOARD_VIEWED audit trail action
    await logAudit({
      tenantId,
      userId: req.user.id,
      action: 'DASHBOARD_VIEWED',
      entityType: 'System',
      entityId: 0,
      description: `Executive Dashboard was viewed by ${req.user.name || 'User'}`
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
};
