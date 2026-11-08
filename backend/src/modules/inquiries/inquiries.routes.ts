import { FastifyPluginAsync } from 'fastify';
import { inquiriesService } from './inquiries.service.js';
import {
  createInquirySchema,
  replyInquirySchema,
  updateInquiryStatusSchema,
  listInquiriesQuerySchema,
} from './inquiries.schema.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const inquiriesRoutes: FastifyPluginAsync = async (fastify) => {
  // Public: Submit inquiry from website (No authentication required)
  fastify.post('/', async (request, reply) => {
    const input = createInquirySchema.parse(request.body);
    const inquiry = await inquiriesService.createInquiry(input);

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: inquiry,
      message: 'Inquiry submitted successfully',
    });
  });

  // Protected: Super Admin inquiries management
  fastify.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', fastify.authenticate);
    adminRoutes.addHook('preHandler', fastify.requireRoles('SUPER_ADMIN'));

    // List inquiries with search & filter
    adminRoutes.get('/', async (request, reply) => {
      const query = listInquiriesQuerySchema.parse(request.query);
      const result = await inquiriesService.listInquiries(query);

      return reply.send({
        success: true,
        data: result,
      });
    });

    // Get single inquiry
    adminRoutes.get('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const inquiry = await inquiriesService.getInquiryById(id);

      return reply.send({
        success: true,
        data: inquiry,
      });
    });

    // Reply to inquiry
    adminRoutes.patch('/:id/reply', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = replyInquirySchema.parse(request.body);
      const repliedBy = request.user.email;

      const updated = await inquiriesService.replyToInquiry(id, input, repliedBy);

      return reply.send({
        success: true,
        data: updated,
        message: 'Reply recorded successfully',
      });
    });

    // Update status
    adminRoutes.patch('/:id/status', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = updateInquiryStatusSchema.parse(request.body);

      const updated = await inquiriesService.updateStatus(id, input);

      return reply.send({
        success: true,
        data: updated,
      });
    });

    // Delete inquiry
    adminRoutes.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await inquiriesService.deleteInquiry(id);

      return reply.send({
        success: true,
        data: result,
      });
    });
  });
};
