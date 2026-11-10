import { Router, Request, Response } from 'express';
import { ExamsService } from './exams.service.js';
import {
  createExamSchema,
  updatePaperStatusSchema,
  enterMarksSchema,
  toggleAdmitApprovalSchema,
} from './exams.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { validateRequest } from '../../core/middleware/validate.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const examsRoutes = Router();

const getTenantId = (req: Request, bodyOrQuery?: any): string => {
  const tenantId = req.user.role === 'SUPER_ADMIN'
    ? (bodyOrQuery?.schoolId || req.user.tenantId)
    : req.user.tenantId;

  if (!tenantId) {
    throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
  }
  return tenantId;
};

// GET /api/v1/exams - List exams
examsRoutes.get('/', authenticate, async (req: Request, res: Response) => {
  const tenantId = getTenantId(req, req.query);
  const exams = await ExamsService.listExams(tenantId, req.user.role, req.user.id);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: exams,
  });
});

// GET /api/v1/exams/:id - View exam
examsRoutes.get('/:id', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = getTenantId(req, req.query);
  const exam = await ExamsService.getExam(tenantId, id);
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: exam,
  });
});

// POST /api/v1/exams - Create exam
examsRoutes.post(
  '/',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  validateRequest(createExamSchema),
  async (req: Request, res: Response) => {
    const input = req.body;
    const tenantId = getTenantId(req, input);
    const exam = await ExamsService.createExam(tenantId, input);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: exam,
    });
  }
);

// DELETE /api/v1/exams/:id - Delete exam
examsRoutes.delete(
  '/:id',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = getTenantId(req, req.query);
    const result = await ExamsService.deleteExam(tenantId, id);
    return res.status(HTTP_STATUS.OK).json(result);
  }
);

// PATCH /api/v1/exams/:examId/subjects/:subjectId/paper - Update paper status
examsRoutes.patch(
  '/:examId/subjects/:subjectId/paper',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  validateRequest(updatePaperStatusSchema),
  async (req: Request, res: Response) => {
    const { examId, subjectId } = req.params;
    const input = req.body;
    const tenantId = getTenantId(req, req.query);
    const result = await ExamsService.updatePaperStatus(tenantId, examId, subjectId, input);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
);

// POST /api/v1/exams/:examId/subjects/:subjectId/marks - Enter marks
examsRoutes.post(
  '/:examId/subjects/:subjectId/marks',
  authenticate,
  requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN'),
  validateRequest(enterMarksSchema),
  async (req: Request, res: Response) => {
    const { examId, subjectId } = req.params;
    const input = req.body;
    const tenantId = getTenantId(req, req.query);
    const marks = await ExamsService.enterMarks(tenantId, examId, subjectId, input, req.user.id);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: marks,
    });
  }
);

// GET /api/v1/exams/:examId/subjects/:subjectId/marks - Get marks
examsRoutes.get(
  '/:examId/subjects/:subjectId/marks',
  authenticate,
  async (req: Request, res: Response) => {
    const { examId, subjectId } = req.params;
    const tenantId = getTenantId(req, req.query);
    const marks = await ExamsService.getMarks(tenantId, examId, subjectId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: marks,
    });
  }
);

// GET /api/v1/exams/:examId/admit-card-approvals - Get approvals
examsRoutes.get(
  '/:examId/admit-card-approvals',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { examId } = req.params;
    const tenantId = getTenantId(req, req.query);
    const approvals = await ExamsService.getAdmitCardApprovals(tenantId, examId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: approvals,
    });
  }
);

// PATCH /api/v1/exams/:examId/admit-card-approvals/:studentId - Toggle approval
examsRoutes.patch(
  '/:examId/admit-card-approvals/:studentId',
  authenticate,
  requireRoles('MANAGER', 'SUPER_ADMIN'),
  validateRequest(toggleAdmitApprovalSchema),
  async (req: Request, res: Response) => {
    const { examId, studentId } = req.params;
    const input = req.body;
    const tenantId = getTenantId(req, req.query);
    const result = await ExamsService.toggleAdmitApproval(
      tenantId,
      examId,
      studentId,
      input,
      req.user.id
    );
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
);

// GET /api/v1/exams/:examId/admit-card - Student admit card
examsRoutes.get(
  '/:examId/admit-card',
  authenticate,
  async (req: Request, res: Response) => {
    const { examId } = req.params;
    const tenantId = getTenantId(req, req.query);
    const studentUserId = req.user.role === 'STUDENT'
      ? req.user.id
      : ((req.query.studentUserId as string) || req.user.id);

    const admitCard = await ExamsService.getStudentAdmitCard(tenantId, examId, studentUserId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: admitCard,
    });
  }
);
