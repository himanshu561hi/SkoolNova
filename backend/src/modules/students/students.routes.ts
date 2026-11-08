import { FastifyPluginAsync } from 'fastify';
import { StudentsService } from './students.service.js';
import { createStudentSchema, updateStudentSchema } from './students.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const studentsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/students - List students
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

      const query = request.query as { q?: string; className?: string; page?: string; limit?: string };
      const result = await StudentsService.listStudents(tenantId, {
        query: query?.q,
        className: query?.className,
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 100,
      });

      return reply.status(200).send({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    }
  );

  // GET /api/v1/students/:id - View single student
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.role === 'SUPER_ADMIN' ? undefined : request.user.tenantId || undefined;
      const student = await StudentsService.getStudent(id, tenantId);
      return reply.status(200).send({
        success: true,
        data: student,
      });
    }
  );

  // POST /api/v1/students - Create student
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createStudentSchema.parse(request.body);
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? (input.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const student = await StudentsService.createStudent(input, tenantId);
      return reply.status(201).send({
        success: true,
        data: student,
      });
    }
  );

  // PUT /api/v1/students/:id - Update student
  fastify.put(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateStudentSchema.parse(request.body);
      const tenantId = request.user.role === 'SUPER_ADMIN'
        ? (input.schoolId || request.user.tenantId)
        : request.user.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
      }

      const student = await StudentsService.updateStudent(id, input, tenantId);
      return reply.status(200).send({
        success: true,
        data: student,
      });
    }
  );

  // DELETE /api/v1/students/:id - Delete student
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

      const result = await StudentsService.deleteStudent(id, tenantId);
      return reply.status(200).send(result);
    }
  );
};

