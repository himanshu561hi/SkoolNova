import { FastifyPluginAsync } from 'fastify';
import { AttendanceService } from './attendance.service.js';
import { saveStudentAttendanceSchema, saveTeacherAttendanceSchema } from './attendance.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const attendanceRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/attendance/students
  fastify.get('/students', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const query = request.query as {
      date?: string;
      className?: string;
      subject?: string;
      periodIndex?: string;
      studentId?: string;
    };

    // If STUDENT, ensure they only query their own attendance
    let studentId = query.studentId;
    if (request.user.role === 'STUDENT') {
      studentId = request.user.id;
    }

    const records = await AttendanceService.getStudentAttendance(tenantId, {
      date: query.date,
      className: query.className,
      subject: query.subject,
      periodIndex: query.periodIndex !== undefined ? parseInt(query.periodIndex) : undefined,
      studentId,
    });

    return reply.status(200).send({
      success: true,
      data: records,
    });
  });

  // POST /api/v1/attendance/students
  fastify.post(
    '/students',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = saveStudentAttendanceSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const result = await AttendanceService.saveStudentAttendance(tenantId, input, request.user.id);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );

  // GET /api/v1/attendance/students/summary
  fastify.get('/students/summary', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const query = request.query as { studentId?: string };
    const studentId = request.user.role === 'STUDENT' ? request.user.id : (query.studentId || request.user.id);

    const summary = await AttendanceService.getStudentAverageAttendance(tenantId, studentId);
    return reply.status(200).send({
      success: true,
      data: summary,
    });
  });

  // GET /api/v1/attendance/teachers
  fastify.get(
    '/teachers',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const tenantId = getTenantId(request, request.query);
      const query = request.query as { date?: string };
      const records = await AttendanceService.getTeacherAttendance(tenantId, query.date);
      return reply.status(200).send({
        success: true,
        data: records,
      });
    }
  );

  // POST /api/v1/attendance/teachers
  fastify.post(
    '/teachers',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = saveTeacherAttendanceSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const result = await AttendanceService.saveTeacherAttendance(tenantId, input, request.user.id);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );
};

