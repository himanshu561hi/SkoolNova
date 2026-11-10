import { Router, Request, Response, NextFunction } from 'express';
import { StudentsService } from './students.service.js';
import { createStudentSchema, updateStudentSchema } from './students.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const studentsRoutes = Router();

// GET /api/v1/students - List students
studentsRoutes.get(
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

      const query = req.query as { q?: string; className?: string; page?: string; limit?: string };
      const result = await StudentsService.listStudents(tenantId, {
        query: query?.q,
        className: query?.className,
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 100,
      });

      res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/students/:id - View single student
studentsRoutes.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.user!.role === 'SUPER_ADMIN' ? undefined : req.user!.tenantId || undefined;
      const student = await StudentsService.getStudent(id, tenantId);
      res.status(200).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/students - Create student
studentsRoutes.post(
  '/',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createStudentSchema.parse(req.body);
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? (input.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const student = await StudentsService.createStudent(input, tenantId);
      res.status(201).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/v1/students/:id - Update student
studentsRoutes.put(
  '/:id',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = updateStudentSchema.parse(req.body);
      const tenantId = req.user!.role === 'SUPER_ADMIN'
        ? (input.schoolId || req.user!.tenantId)
        : req.user!.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const student = await StudentsService.updateStudent(id, input, tenantId);
      res.status(200).json({
        success: true,
        data: student,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/students/:id - Delete student
studentsRoutes.delete(
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

      const result = await StudentsService.deleteStudent(id, tenantId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
