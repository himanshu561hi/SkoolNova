import { FastifyPluginAsync } from 'fastify';
import { DashboardService } from './dashboard.service.js';

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/dashboard/stats
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = request.user.tenantId;
    const stats = await DashboardService.getStats(tenantId, request.user.role, request.user.id);
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  });

  // GET /api/v1/dashboard/attendance-chart
  fastify.get('/attendance-chart', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = request.user.tenantId;
    const query = request.query as { days?: string };
    const daysCount = query.days ? parseInt(query.days) : 7;
    const chart = await DashboardService.getAttendanceChart(
      tenantId,
      request.user.role,
      request.user.id,
      daysCount
    );
    return reply.status(200).send({
      success: true,
      data: chart,
    });
  });

  // GET /api/v1/dashboard/activities
  fastify.get('/activities', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = request.user.tenantId;
    const activities = await DashboardService.getRecentActivities(tenantId);
    return reply.status(200).send({
      success: true,
      data: activities,
    });
  });
};

