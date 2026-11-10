import { Router, Request, Response } from 'express';
import { inquiriesService } from './inquiries.service.js';
import {
  createInquirySchema,
  replyInquirySchema,
  updateInquiryStatusSchema,
  listInquiriesQuerySchema,
} from './inquiries.schema.js';
import { authenticate, requireRoles } from '../../core/middleware/auth.js';
import { validateRequest } from '../../core/middleware/validate.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const inquiriesRoutes = Router();

// Public: Submit inquiry from website (No authentication required)
inquiriesRoutes.post(
  '/',
  validateRequest(createInquirySchema),
  async (req: Request, res: Response) => {
    const input = req.body;
    const inquiry = await inquiriesService.createInquiry(input);

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: inquiry,
      message: 'Inquiry submitted successfully',
    });
  }
);

// Protected: Super Admin inquiries management
inquiriesRoutes.get(
  '/',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const query = listInquiriesQuerySchema.parse(req.query);
    const result = await inquiriesService.listInquiries(query);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
);

inquiriesRoutes.get(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const inquiry = await inquiriesService.getInquiryById(id);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: inquiry,
    });
  }
);

inquiriesRoutes.patch(
  '/:id/reply',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  validateRequest(replyInquirySchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const input = req.body;
    const repliedBy = req.user.email;

    const updated = await inquiriesService.replyToInquiry(id, input, repliedBy);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated,
      message: 'Reply recorded successfully',
    });
  }
);

inquiriesRoutes.patch(
  '/:id/status',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  validateRequest(updateInquiryStatusSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const input = req.body;

    const updated = await inquiriesService.updateStatus(id, input);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updated,
    });
  }
);

inquiriesRoutes.delete(
  '/:id',
  authenticate,
  requireRoles('SUPER_ADMIN'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await inquiriesService.deleteInquiry(id);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: result,
    });
  }
);
