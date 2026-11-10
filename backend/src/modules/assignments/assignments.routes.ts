import { Router, Request, Response, NextFunction } from 'express';
import { AssignmentsService } from './assignments.service.js';
import {
  createAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from './assignments.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const assignmentsRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user!.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user!.tenantId)
    : req.user!.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/assignments - List assignments
assignmentsRoutes.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const query = req.query as { className?: string; subject?: string };
    const assignments = await AssignmentsService.listAssignments(
      tenantId,
      req.user!.role,
      req.user!.id,
      query
    );
    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/assignments/:id - Single assignment with submissions
assignmentsRoutes.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantId(req, req.query);
    const assignment = await AssignmentsService.getAssignment(id, tenantId);
    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/assignments - Create assignment
assignmentsRoutes.post(
  '/',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createAssignmentSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const assignment = await AssignmentsService.createAssignment(tenantId, req.user!.id, input);
      res.status(201).json({
        success: true,
        data: assignment,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/assignments/:id - Delete assignment
assignmentsRoutes.delete(
  '/:id',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = getTenantId(req, req.query);
      const result = await AssignmentsService.deleteAssignment(id, tenantId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/assignments/:id/submit - Submit assignment
assignmentsRoutes.post(
  '/:id/submit',
  authenticate,
  requireRoles('STUDENT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = submitAssignmentSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const submission = await AssignmentsService.submitAssignment(id, req.user!.id, tenantId, input);
      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/assignments/submissions/:submissionId/grade - Grade submission
assignmentsRoutes.patch(
  '/submissions/:submissionId/grade',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { submissionId } = req.params;
      const input = gradeSubmissionSchema.parse(req.body);
      const tenantId = getTenantId(req, req.query);
      const graded = await AssignmentsService.gradeSubmission(submissionId, tenantId, input);
      res.status(200).json({
        success: true,
        data: graded,
      });
    } catch (err) {
      next(err);
    }
  }
);
