import { FastifyPluginAsync } from 'fastify';
import { NotificationsService } from './notifications.service.js';
import { createNotificationSchema } from './notifications.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string | null => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId || null)
      : (request.user.tenantId || bodyOrQuery?.schoolId || null);

    return tenantId || null;
  };

  // GET /api/v1/notifications
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const list = await NotificationsService.listNotifications(tenantId, request.user.role, request.user.id);
    return reply.status(200).send({
      success: true,
      data: list,
    });
  });

  // GET /api/v1/notifications/unread-count
  fastify.get('/unread-count', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const count = await NotificationsService.getUnreadCount(tenantId, request.user.role, request.user.id);
    return reply.status(200).send({
      success: true,
      data: count,
    });
  });

  // POST /api/v1/notifications
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createNotificationSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const notification = await NotificationsService.createNotification(
        tenantId,
        request.user.id,
        input
      );
      return reply.status(201).send({
        success: true,
        data: notification,
      });
    }
  );

  // PATCH /api/v1/notifications/:id/read
  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request, request.query);
    const result = await NotificationsService.markAsRead(tenantId, id);
    return reply.status(200).send(result);
  });

  // PATCH /api/v1/notifications/read-all
  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const result = await NotificationsService.markAllAsRead(tenantId, request.user.role, request.user.id);
    return reply.status(200).send(result);
  });

  // DELETE /api/v1/notifications/:id
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request, request.query);
    const result = await NotificationsService.deleteNotification(tenantId, id);
    return reply.status(200).send(result);
  });
};

