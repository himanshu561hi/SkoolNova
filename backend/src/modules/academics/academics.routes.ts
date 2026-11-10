import { Router, Request, Response, NextFunction } from 'express';
import { AcademicsService } from './academics.service.js';
import {
  createClassSchema,
  setClassSubjectsSchema,
  configurePeriodsSchema,
} from './academics.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const academicsRoutes = Router();

// Helper to extract tenantId
const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user!.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user!.tenantId)
    : req.user!.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/academics/classes
academicsRoutes.get('/classes', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const classes = await AcademicsService.listClasses(tenantId);
    res.status(200).json({
      success: true,
      data: classes,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/academics/classes
academicsRoutes.post(
  '/classes',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createClassSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const created = await AcademicsService.createClass(tenantId, input.name, input.academicYear);
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/academics/classes/:id
academicsRoutes.delete(
  '/classes/:id',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = getTenantId(req, req.query);
      const result = await AcademicsService.deleteClass(tenantId, id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/academics/class-subjects
academicsRoutes.get('/class-subjects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const mapping = await AcademicsService.getClassSubjectsMapping(tenantId);
    res.status(200).json({
      success: true,
      data: mapping,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/academics/class-subjects/:className
academicsRoutes.put(
  '/class-subjects/:className',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { className } = req.params;
      const input = setClassSubjectsSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const mapping = await AcademicsService.setClassSubjects(tenantId, decodeURIComponent(className), input.subjects);
      res.status(200).json({
        success: true,
        data: mapping,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/academics/periods
academicsRoutes.get('/periods', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const periods = await AcademicsService.getPeriods(tenantId);
    res.status(200).json({
      success: true,
      data: periods,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/academics/periods
academicsRoutes.put(
  '/periods',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = configurePeriodsSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const periods = await AcademicsService.configurePeriods(tenantId, input);
      res.status(200).json({
        success: true,
        data: periods,
      });
    } catch (err) {
      next(err);
    }
  }
);
