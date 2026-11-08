import { FastifyPluginAsync } from 'fastify';
import { TimetableService } from './timetable.service.js';
import { assignSlotSchema, timetableSettingsSchema } from './timetable.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const timetableRoutes: FastifyPluginAsync = async (fastify) => {
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/timetable/settings
  fastify.get('/settings', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const settings = await TimetableService.getSettings(tenantId);
    return reply.status(200).send({
      success: true,
      data: settings,
    });
  });

  // PUT /api/v1/timetable/settings
  fastify.put(
    '/settings',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = timetableSettingsSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const updated = await TimetableService.updateSettings(tenantId, input.allowTeachersEdit);
      return reply.status(200).send({
        success: true,
        data: updated,
      });
    }
  );

  // GET /api/v1/timetable/slots
  fastify.get('/slots', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const query = request.query as { className?: string; teacherId?: string };
    const slots = await TimetableService.listSlots(tenantId, query);
    return reply.status(200).send({
      success: true,
      data: slots,
    });
  });

  // POST /api/v1/timetable/slots
  fastify.post(
    '/slots',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = assignSlotSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const slot = await TimetableService.assignSlot(tenantId, input, request.user.role, request.user.id);
      return reply.status(200).send({
        success: true,
        data: slot,
      });
    }
  );

  // DELETE /api/v1/timetable/slots/:id
  fastify.delete(
    '/slots/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('TEACHER', 'MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = getTenantId(request, request.query);
      const result = await TimetableService.deleteSlot(tenantId, id);
      return reply.status(200).send(result);
    }
  );
};

