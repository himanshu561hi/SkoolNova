import { FastifyPluginAsync } from 'fastify';
import { TeachersService } from './teachers.service.js';
import { createTeacherSchema, updateTeacherSchema } from './teachers.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const teachersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/teachers - List teachers
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? ((request.query as any)?.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const query = request.query as { q?: string; department?: string; status?: string };
      const teachers = await TeachersService.listTeachers(tenantId, {
        query: query?.q,
        department: query?.department,
        status: query?.status,
      });

      return reply.status(200).send({
        success: true,
        data: teachers,
      });
    }
  );

  // GET /api/v1/teachers/:id - View single teacher
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'TEACHER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.role === 'SUPER_ADMIN' ? undefined : request.user.tenantId || undefined;
      const teacher = await TeachersService.getTeacher(id, tenantId);
      return reply.status(200).send({
        success: true,
        data: teacher,
      });
    }
  );

  // POST /api/v1/teachers - Create teacher
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createTeacherSchema.parse(request.body);
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? (input.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const teacher = await TeachersService.createTeacher(input, tenantId);
      return reply.status(201).send({
        success: true,
        data: teacher,
      });
    }
  );

  // PUT /api/v1/teachers/:id - Update teacher
  fastify.put(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateTeacherSchema.parse(request.body);
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? (input.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const teacher = await TeachersService.updateTeacher(id, input, tenantId);
      return reply.status(200).send({
        success: true,
        data: teacher,
      });
    }
  );

  // DELETE /api/v1/teachers/:id - Delete teacher
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? ((request.query as any)?.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const result = await TeachersService.deleteTeacher(id, tenantId);
      return reply.status(200).send(result);
    }
  );
};

