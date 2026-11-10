import { Router, Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service.js';
import { saveStudentAttendanceSchema, saveTeacherAttendanceSchema } from './attendance.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const attendanceRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user!.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user!.tenantId)
    : req.user!.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/attendance/students
attendanceRoutes.get('/students', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const query = req.query as {
      date?: string;
      className?: string;
      subject?: string;
      periodIndex?: string;
      studentId?: string;
    };

    let studentId = query.studentId;
    if (req.user!.role === 'STUDENT') {
      studentId = req.user!.id;
    }

    const records = await AttendanceService.getStudentAttendance(tenantId, {
      date: query.date,
      className: query.className,
      subject: query.subject,
      periodIndex: query.periodIndex !== undefined ? parseInt(query.periodIndex) : undefined,
      studentId,
    });

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance/students
attendanceRoutes.post(
  '/students',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = saveStudentAttendanceSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const result = await AttendanceService.saveStudentAttendance(tenantId, input, req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/attendance/students/summary
attendanceRoutes.get('/students/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req, req.query);
    const query = req.query as { studentId?: string };
    const studentId = req.user!.role === 'STUDENT' ? req.user!.id : (query.studentId || req.user!.id);

    const summary = await AttendanceService.getStudentAverageAttendance(tenantId, studentId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance/teachers
attendanceRoutes.get(
  '/teachers',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req, req.query);
      const query = req.query as { date?: string };
      const records = await AttendanceService.getTeacherAttendance(tenantId, query.date);
      res.status(200).json({
        success: true,
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/attendance/teachers
attendanceRoutes.post(
  '/teachers',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = saveTeacherAttendanceSchema.parse(req.body);
      const tenantId = getTenantId(req, input);
      const result = await AttendanceService.saveTeacherAttendance(tenantId, input, req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
