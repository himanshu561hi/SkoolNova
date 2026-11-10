import { Router, Request, Response } from 'express';
import { NotificationsService } from './notifications.service.js';
import { createNotificationSchema } from './notifications.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { validateRequest } from '../../core/middleware/validate.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const notificationsRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string | null => {
  const tenantId = req.user.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user.tenantId || null)
    : (req.user.tenantId || bodyOrQuery?.schoolId || null);

  return tenantId || null;
};

// GET /api/v1/notifications
notificationsRoutes.get('/', authenticate, async (req: Request, res: Response) => {
  const tenantId = getTenantId(req, req.query);
  const list = await NotificationsService.listNotifications(tenantId, req.user.role, req.user.id);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: list,
  });
});

// GET /api/v1/notifications/unread-count
notificationsRoutes.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  const tenantId = getTenantId(req, req.query);
  const count = await NotificationsService.getUnreadCount(tenantId, req.user.role, req.user.id);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: count,
  });
});

// POST /api/v1/notifications
notificationsRoutes.post(
  '/',
  authenticate,
  requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN'),
  validateRequest(createNotificationSchema),
  async (req: Request, res: Response) => {
    const input = req.body;
    const tenantId = getTenantId(req, input);
    const notification = await NotificationsService.createNotification(
      tenantId,
      req.user.id,
      input
    );
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: notification,
    });
  }
);

// PATCH /api/v1/notifications/:id/read
notificationsRoutes.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = getTenantId(req, req.query);
  const result = await NotificationsService.markAsRead(tenantId, id);
  return res.status(HTTP_STATUS.OK).json(result);
});

// PATCH /api/v1/notifications/read-all
notificationsRoutes.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  const tenantId = getTenantId(req, req.query);
  const result = await NotificationsService.markAllAsRead(tenantId, req.user.role, req.user.id);
  return res.status(HTTP_STATUS.OK).json(result);
});

// DELETE /api/v1/notifications/:id
notificationsRoutes.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = getTenantId(req, req.query);
  const result = await NotificationsService.deleteNotification(tenantId, id);
  return res.status(HTTP_STATUS.OK).json(result);
});
