import { FastifyPluginAsync } from 'fastify';
import { AssignmentsService } from './assignments.service.js';
import {
  createAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from './assignments.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const assignmentsRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/assignments - List assignments
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const query = request.query as { className?: string; subject?: string };
    const assignments = await AssignmentsService.listAssignments(
      tenantId,
      request.user.role,
      request.user.id,
      query
    );
    return reply.status(200).send({
      success: true,
      data: assignments,
    });
  });

  // GET /api/v1/assignments/:id - Single assignment with submissions
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request, request.query);
    const assignment = await AssignmentsService.getAssignment(id, tenantId);
    return reply.status(200).send({
      success: true,
      data: assignment,
    });
  });

  // POST /api/v1/assignments - Create assignment
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createAssignmentSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const assignment = await AssignmentsService.createAssignment(tenantId, request.user.id, input);
      return reply.status(201).send({
        success: true,
        data: assignment,
      });
    }
  );

  // DELETE /api/v1/assignments/:id - Delete assignment
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = getTenantId(request, request.query);
      const result = await AssignmentsService.deleteAssignment(id, tenantId);
      return reply.status(200).send(result);
    }
  );

  // POST /api/v1/assignments/:id/submit - Submit assignment
  fastify.post(
    '/:id/submit',
    { preHandler: [fastify.authenticate, fastify.requireRoles('STUDENT')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = submitAssignmentSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const submission = await AssignmentsService.submitAssignment(id, request.user.id, tenantId, input);
      return reply.status(200).send({
        success: true,
        data: submission,
      });
    }
  );

  // PATCH /api/v1/assignments/submissions/:submissionId/grade - Grade submission
  fastify.patch(
    '/submissions/:submissionId/grade',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { submissionId } = request.params as { submissionId: string };
      const input = gradeSubmissionSchema.parse(request.body);
      const tenantId = getTenantId(request, request.query);
      const graded = await AssignmentsService.gradeSubmission(submissionId, tenantId, input);
      return reply.status(200).send({
        success: true,
        data: graded,
      });
    }
  );
};

