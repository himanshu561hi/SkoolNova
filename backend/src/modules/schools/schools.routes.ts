import { Router, Request, Response, NextFunction } from 'express';
import { SchoolsService } from './schools.service.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import {
  createSchoolSchema,
  updateSchoolStatusSchema,
  deleteSchoolSchema,
} from './schools.schema.js';

export const schoolsRoutes = Router();

// GET /api/v1/schools - List all schools (Super Admin only)
schoolsRoutes.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as { q?: string };
      const schools = await SchoolsService.listSchools(query?.q);
      res.status(200).json({
        success: true,
        data: schools,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/schools - Create new school & manager (Super Admin only)
schoolsRoutes.post(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createSchoolSchema.parse(req.body);
      const school = await SchoolsService.createSchool(input);
      res.status(201).json({
        success: true,
        data: school,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/schools/:id - View single school
schoolsRoutes.get(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (req.user!.role === 'MANAGER' && req.user!.tenantId !== id) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only view your own school' },
        });
        return;
      }
      const school = await SchoolsService.getSchool(id);
      res.status(200).json({
        success: true,
        data: school,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/schools/:id/status - Update school status (Super Admin only)
schoolsRoutes.patch(
  '/:id/status',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = updateSchoolStatusSchema.parse(req.body);
      const result = await SchoolsService.updateStatus(id, input.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/schools/:id/request-delete-otp - Request OTP to delete school
schoolsRoutes.post(
  '/:id/request-delete-otp',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await SchoolsService.requestDeleteOtp(id, req.user!.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/schools/:id - Delete school with OTP
schoolsRoutes.delete(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const input = deleteSchoolSchema.parse(req.body);
      const result = await SchoolsService.deleteSchool(id, input.otp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);
