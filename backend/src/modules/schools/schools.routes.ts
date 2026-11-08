import { FastifyPluginAsync } from 'fastify';
import { SchoolsService } from './schools.service.js';
import {
  createSchoolSchema,
  updateSchoolStatusSchema,
  deleteSchoolSchema,
} from './schools.schema.js';

export const schoolsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/schools - List all schools (Super Admin only)
  fastify.get(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN')] },
    async (request, reply) => {
      const query = request.query as { q?: string };
      const schools = await SchoolsService.listSchools(query?.q);
      return reply.status(200).send({
        success: true,
        data: schools,
      });
    }
  );

  // POST /api/v1/schools - Create new school & manager (Super Admin only)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createSchoolSchema.parse(request.body);
      const school = await SchoolsService.createSchool(input);
      return reply.status(201).send({
        success: true,
        data: school,
      });
    }
  );

  // GET /api/v1/schools/:id - View single school
  fastify.get(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN', 'MANAGER')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      // If Manager, ensure they belong to this school
      if (request.user.role === 'MANAGER' && request.user.tenantId !== id) {
        return reply.status(403).send({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only view your own school' },
        });
      }
      const school = await SchoolsService.getSchool(id);
      return reply.status(200).send({
        success: true,
        data: school,
      });
    }
  );

  // PATCH /api/v1/schools/:id/status - Update school status (Super Admin only)
  fastify.patch(
    '/:id/status',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateSchoolStatusSchema.parse(request.body);
      const result = await SchoolsService.updateStatus(id, input.status);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );

  // POST /api/v1/schools/:id/request-delete-otp - Request OTP to delete school
  fastify.post(
    '/:id/request-delete-otp',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await SchoolsService.requestDeleteOtp(id, request.user.id);
      return reply.status(200).send(result);
    }
  );

  // DELETE /api/v1/schools/:id - Delete school with OTP
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = deleteSchoolSchema.parse(request.body);
      const result = await SchoolsService.deleteSchool(id, input.otp);
      return reply.status(200).send(result);
    }
  );
};

