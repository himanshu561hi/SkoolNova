import { Router, Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';
import { authenticate } from '../../core/middleware/auth.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const dashboardRoutes = Router();

// GET /api/v1/dashboard/stats
dashboardRoutes.get('/stats', authenticate, async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const stats = await DashboardService.getStats(tenantId, req.user.role, req.user.id);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: stats,
  });
});

// GET /api/v1/dashboard/attendance-chart
dashboardRoutes.get('/attendance-chart', authenticate, async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const daysCount = req.query.days ? parseInt(req.query.days as string, 10) : 7;
  const chart = await DashboardService.getAttendanceChart(
    tenantId,
    req.user.role,
    req.user.id,
    daysCount
  );
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: chart,
  });
});

// GET /api/v1/dashboard/activities
dashboardRoutes.get('/activities', authenticate, async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const activities = await DashboardService.getRecentActivities(tenantId);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: activities,
  });
});
