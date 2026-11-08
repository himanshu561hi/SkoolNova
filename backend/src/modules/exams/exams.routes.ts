import { FastifyPluginAsync } from 'fastify';
import { ExamsService } from './exams.service.js';
import {
  createExamSchema,
  updatePaperStatusSchema,
  enterMarksSchema,
  toggleAdmitApprovalSchema,
} from './exams.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const examsRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/exams - List exams
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const exams = await ExamsService.listExams(tenantId, request.user.role, request.user.id);
    return reply.status(200).send({
      success: true,
      data: exams,
    });
  });

  // GET /api/v1/exams/:id - View exam
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request, request.query);
    const exam = await ExamsService.getExam(tenantId, id);
    return reply.status(200).send({
      success: true,
      data: exam,
    });
  });

  // POST /api/v1/exams - Create exam
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createExamSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const exam = await ExamsService.createExam(tenantId, input);
      return reply.status(201).send({
        success: true,
        data: exam,
      });
    }
  );

  // DELETE /api/v1/exams/:id - Delete exam
  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = getTenantId(request, request.query);
      const result = await ExamsService.deleteExam(tenantId, id);
      return reply.status(200).send(result);
    }
  );

  // PATCH /api/v1/exams/:examId/subjects/:subjectId/paper - Update paper status
  fastify.patch(
    '/:examId/subjects/:subjectId/paper',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { examId, subjectId } = request.params as { examId: string; subjectId: string };
      const input = updatePaperStatusSchema.parse(request.body);
      const tenantId = getTenantId(request, request.query);
      const result = await ExamsService.updatePaperStatus(tenantId, examId, subjectId, input);
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );

  // POST /api/v1/exams/:examId/subjects/:subjectId/marks - Enter marks
  fastify.post(
    '/:examId/subjects/:subjectId/marks',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { examId, subjectId } = request.params as { examId: string; subjectId: string };
      const input = enterMarksSchema.parse(request.body);
      const tenantId = getTenantId(request, request.query);
      const marks = await ExamsService.enterMarks(tenantId, examId, subjectId, input, request.user.id);
      return reply.status(200).send({
        success: true,
        data: marks,
      });
    }
  );

  // GET /api/v1/exams/:examId/subjects/:subjectId/marks - Get marks
  fastify.get(
    '/:examId/subjects/:subjectId/marks',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { examId, subjectId } = request.params as { examId: string; subjectId: string };
      const tenantId = getTenantId(request, request.query);
      const marks = await ExamsService.getMarks(tenantId, examId, subjectId);
      return reply.status(200).send({
        success: true,
        data: marks,
      });
    }
  );

  // GET /api/v1/exams/:examId/admit-card-approvals - Get approvals
  fastify.get(
    '/:examId/admit-card-approvals',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { examId } = request.params as { examId: string };
      const tenantId = getTenantId(request, request.query);
      const approvals = await ExamsService.getAdmitCardApprovals(tenantId, examId);
      return reply.status(200).send({
        success: true,
        data: approvals,
      });
    }
  );

  // PATCH /api/v1/exams/:examId/admit-card-approvals/:studentId - Toggle approval
  fastify.patch(
    '/:examId/admit-card-approvals/:studentId',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { examId, studentId } = request.params as { examId: string; studentId: string };
      const input = toggleAdmitApprovalSchema.parse(request.body);
      const tenantId = getTenantId(request, request.query);
      const result = await ExamsService.toggleAdmitApproval(
        tenantId,
        examId,
        studentId,
        input,
        request.user.id
      );
      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );

  // GET /api/v1/exams/:examId/admit-card - Student admit card
  fastify.get(
    '/:examId/admit-card',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { examId } = request.params as { examId: string };
      const tenantId = getTenantId(request, request.query);
      const query = request.query as { studentUserId?: string };
      const studentUserId = request.user.role === 'STUDENT'
        ? request.user.id
        : (query.studentUserId || request.user.id);

      const admitCard = await ExamsService.getStudentAdmitCard(tenantId, examId, studentUserId);
      return reply.status(200).send({
        success: true,
        data: admitCard,
      });
    }
  );
};

