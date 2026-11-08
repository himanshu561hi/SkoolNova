import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
} from './auth.schema.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const result = await AuthService.login(input);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // POST /api/v1/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const input = refreshTokenSchema.parse(request.body);
    const result = await AuthService.refreshToken(input.refreshToken);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // POST /api/v1/auth/logout
  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as { refreshToken?: string } | undefined;
    const result = await AuthService.logout(body?.refreshToken);
    return reply.status(200).send(result);
  });

  // POST /api/v1/auth/change-password
  fastify.post('/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const input = changePasswordSchema.parse(request.body);
    const result = await AuthService.changePassword(request.user.id, input.password);
    return reply.status(200).send(result);
  });

  // POST /api/v1/auth/forgot-password
  fastify.post('/forgot-password', async (request, reply) => {
    const input = forgotPasswordSchema.parse(request.body);
    const result = await AuthService.requestPasswordResetOtp(input.email);
    return reply.status(200).send(result);
  });

  // POST /api/v1/auth/reset-password
  fastify.post('/reset-password', async (request, reply) => {
    const input = resetPasswordWithOtpSchema.parse(request.body);
    const result = await AuthService.resetPasswordWithOtp(input);
    return reply.status(200).send(result);
  });
};

export const profileRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/profile/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const profile = await AuthService.getProfile(request.user.id);
    return reply.status(200).send({
      success: true,
      data: profile,
    });
  });

  // PUT /api/v1/profile/me
  fastify.put('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const input = updateProfileSchema.parse(request.body);
    const updated = await AuthService.updateProfile(request.user.id, input);
    return reply.status(200).send({
      success: true,
      data: updated,
    });
  });
};

