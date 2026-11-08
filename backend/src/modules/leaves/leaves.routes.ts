import { FastifyPluginAsync } from 'fastify';
import { LeavesService } from './leaves.service.js';
import { applyLeaveSchema, reviewLeaveSchema } from './leaves.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const leavesRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/leaves - List leaves
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const query = request.query as { scope?: string; status?: string };
    const leaves = await LeavesService.listLeaves(tenantId, request.user.role, request.user.id, query);
    return reply.status(200).send({
      success: true,
      data: leaves,
    });
  });

  // POST /api/v1/leaves - Apply for leave
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('STUDENT', 'TEACHER')] },
    async (request, reply) => {
      const input = applyLeaveSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const leave = await LeavesService.applyLeave(tenantId, request.user.id, request.user.role, input);
      return reply.status(201).send({
        success: true,
        data: leave,
      });
    }
  );

  // PATCH /api/v1/leaves/:id/review - Review leave application
  fastify.patch(
    '/:id/review',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = reviewLeaveSchema.parse(request.body);
      const tenantId = getTenantId(request, request.query);
      const result = await LeavesService.reviewLeave(
        tenantId,
        id,
        request.user.id,
        request.user.role,
        input
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );
};

