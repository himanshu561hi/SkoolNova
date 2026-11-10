import { Router, Request, Response, NextFunction } from 'express';
import { TimetableService } from './timetable.service.js';
import { assignSlotSchema, timetableSettingsSchema } from './timetable.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const timetableRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user!.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user!.tenantId)
    : req.user!.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/timetable/settings
timetableRoutes.get('/settings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const settings = await TimetableService.getSettings(tenantId);
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/timetable/settings
timetableRoutes.put(
  '/settings',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = timetableSettingsSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const updated = await TimetableService.updateSettings(tenantId, input.allowTeachersEdit);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/timetable/slots
timetableRoutes.get('/slots', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const query = req.query as { className?: string; teacherId?: string };
    const slots = await TimetableService.listSlots(tenantId, query);
    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/timetable/slots
timetableRoutes.post(
  '/slots',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = assignSlotSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const slot = await TimetableService.assignSlot(tenantId, input, req.user!.role, req.user!.id);
      res.status(200).json({
        success: true,
        data: slot,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/timetable/slots/:id
timetableRoutes.delete(
  '/slots/:id',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = getTenantId(req, req.query);
      const result = await TimetableService.deleteSlot(tenantId, id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
