import { Router, Request, Response, NextFunction } from 'express';
import { TeachersService } from './teachers.service.js';
import { createTeacherSchema, updateTeacherSchema } from './teachers.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const teachersRoutes = Router();

// GET /api/v1/teachers - List teachers
teachersRoutes.get(
  '/',
  authenticate,
  requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? ((req.query as any)?.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const query = req.query as { q?: string; department?: string; status?: string };
      const teachers = await TeachersService.listTeachers(tenantId, {
        query: query?.q,
        department: query?.department,
        status: query?.status,
      });

      res.status(200).json({
        success: true,
        data: teachers,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/teachers/:id - View single teacher
teachersRoutes.get(
  '/:id',
  authenticate,
  requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.tenantId || undefined;
      const teacher = await TeachersService.getTeacher(id, tenantId);
      res.status(200).json({
        success: true,
        data: teacher,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/teachers - Create teacher
teachersRoutes.post(
  '/',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createTeacherSchema.parse(req.body);
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? (input.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const teacher = await TeachersService.createTeacher(input, tenantId);
      res.status(201).json({
        success: true,
        data: teacher,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/teachers/:id - Update teacher
teachersRoutes.put(
  '/:id',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = updateTeacherSchema.parse(req.body);
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? (input.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const teacher = await TeachersService.updateTeacher(id, input, tenantId);
      res.status(200).json({
        success: true,
        data: teacher,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/teachers/:id - Delete teacher
teachersRoutes.delete(
  '/:id',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? ((req.query as any)?.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const result = await TeachersService.deleteTeacher(id, tenantId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
