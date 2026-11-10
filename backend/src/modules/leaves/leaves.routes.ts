import { Router, Request, Response } from 'express';
import { LeavesService } from './leaves.service.js';
import { applyLeaveSchema, reviewLeaveSchema } from './leaves.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { validateRequest } from '../../core/middleware/validate.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const leavesRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user.tenantId)
    : req.user.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/leaves - List leaves
leavesRoutes.get('/', authenticate, async (req: Request, res: Response) => {
  const tenantId = getTenantId(req, req.query);
  const query = req.query as { scope?: string; status?: string };
  const leaves = await LeavesService.listLeaves(tenantId, req.user.role, req.user.id, query);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: leaves,
  });
});

// POST /api/v1/leaves - Apply for leave
leavesRoutes.post(
  '/',
  authenticate,
  requireRoles('STUDENT', 'TEACHER'),
  validateRequest(applyLeaveSchema),
  async (req: Request, res: Response) => {
    const input = req.body;
    const tenantId = getTenantId(req, input);
    const leave = await LeavesService.applyLeave(tenantId, req.user.id, req.user.role, input);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: leave,
    });
  }
);

// PATCH /api/v1/leaves/:id/review - Review leave application
leavesRoutes.patch(
  '/:id/review',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  validateRequest(reviewLeaveSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const input = req.body;
    const tenantId = getTenantId(req, req.query);
    const result = await LeavesService.reviewLeave(
      tenantId,
      id,
      req.user.id,
      req.user.role,
      input
    );
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
);
