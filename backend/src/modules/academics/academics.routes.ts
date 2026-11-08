import { FastifyPluginAsync } from 'fastify';
import { AcademicsService } from './academics.service.js';
import {
  createClassSchema,
  setClassSubjectsSchema,
  configurePeriodsSchema,
} from './academics.schema.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const academicsRoutes: FastifyPluginAsync = async (fastify) => {
  // Helper to extract tenantId
  const getTenantId = (request: any, bodyOrQuery?: any): string => {
    const tenantId = request.user.role === 'SUPER_ADMIN'
      ? (bodyOrQuery?.schoolId || request.user.tenantId)
      : request.user.tenantId;

    if (!tenantId) {
      throw new AppError('Tenant ID is required', HTTP_STATUS.BAD_REQUEST, 'MISSING_TENANT');
    }
    return tenantId;
  };

  // GET /api/v1/academics/classes
  fastify.get('/classes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const classes = await AcademicsService.listClasses(tenantId);
    return reply.status(200).send({
      success: true,
      data: classes,
    });
  });

  // POST /api/v1/academics/classes
  fastify.post(
    '/classes',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = createClassSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const created = await AcademicsService.createClass(tenantId, input.name, input.academicYear);
      return reply.status(201).send({
        success: true,
        data: created,
      });
    }
  );

  // DELETE /api/v1/academics/classes/:id
  fastify.delete(
    '/classes/:id',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = getTenantId(request, request.query);
      const result = await AcademicsService.deleteClass(tenantId, id);
      return reply.status(200).send(result);
    }
  );

  // GET /api/v1/academics/class-subjects
  fastify.get('/class-subjects', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const mapping = await AcademicsService.getClassSubjectsMapping(tenantId);
    return reply.status(200).send({
      success: true,
      data: mapping,
    });
  });

  // PUT /api/v1/academics/class-subjects/:className
  fastify.put(
    '/class-subjects/:className',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const { className } = request.params as { className: string };
      const input = setClassSubjectsSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const mapping = await AcademicsService.setClassSubjects(tenantId, decodeURIComponent(className), input.subjects);
      return reply.status(200).send({
        success: true,
        data: mapping,
      });
    }
  );

  // GET /api/v1/academics/periods
  fastify.get('/periods', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const tenantId = getTenantId(request, request.query);
    const periods = await AcademicsService.getPeriods(tenantId);
    return reply.status(200).send({
      success: true,
      data: periods,
    });
  });

  // PUT /api/v1/academics/periods
  fastify.put(
    '/periods',
    { preHandler: [fastify.authenticate, fastify.requireRoles('MANAGER', 'SUPER_ADMIN')] },
    async (request, reply) => {
      const input = configurePeriodsSchema.parse(request.body);
      const tenantId = getTenantId(request, input);
      const periods = await AcademicsService.configurePeriods(tenantId, input);
      return reply.status(200).send({
        success: true,
        data: periods,
      });
    }
  );
};

