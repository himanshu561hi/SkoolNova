import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import { User, Tenant } from '../../models/index.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string | null;
  mustChangePassword: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRoles: (...roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const signAccessToken = (user: AuthUser): string => {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      mustChangePassword: user.mustChangePassword,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
};

export const verifyAccessToken = (token: string): AuthUser => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId || null,
      mustChangePassword: payload.mustChangePassword ?? false,
    };
  } catch (err) {
    throw new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED, 'TOKEN_INVALID');
  }
};

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Authentication hook
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or malformed Authorization header', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    // Verify user exists and is active in database
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      throw new AppError('User account is deactivated or not found', HTTP_STATUS.UNAUTHORIZED, 'USER_INACTIVE');
    }

    if (user.tenantId && user.role !== 'SUPER_ADMIN') {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant && tenant.status === 'INACTIVE') {
        throw new AppError('School account has been deactivated', HTTP_STATUS.FORBIDDEN, 'SCHOOL_INACTIVE');
      }
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
      mustChangePassword: user.mustChangePassword,
    };
  });

  // Role authorization hook
  fastify.decorate('requireRoles', (...roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user) {
        throw new AppError('Unauthenticated request', HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED');
      }

      const userRole = request.user.role;
      const isRoleAllowed =
        roles.includes(userRole) ||
        (roles.includes('MANAGER') && userRole === 'SCHOOL_MANAGER') ||
        (roles.includes('SCHOOL_MANAGER') && userRole === 'MANAGER');

      if (!isRoleAllowed) {
        throw new AppError(
          `Access forbidden: required role ${roles.join(' or ')}`,
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN'
        );
      }
    };
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['mongoose'],
});

