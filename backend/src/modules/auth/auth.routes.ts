import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { authenticate } from '../../core/middleware/auth.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordWithOtpSchema,
} from './auth.schema.js';

export const authRoutes = Router();

// POST /api/v1/auth/login
authRoutes.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await AuthService.login(input);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
authRoutes.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = refreshTokenSchema.parse(req.body);
    const result = await AuthService.refreshToken(input.refreshToken);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
authRoutes.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.logout(req.body?.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/change-password
authRoutes.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    const result = await AuthService.changePassword(req.user!.id, input.password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/forgot-password
authRoutes.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await AuthService.requestPasswordResetOtp(input.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/reset-password
authRoutes.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = resetPasswordWithOtpSchema.parse(req.body);
    const result = await AuthService.resetPasswordWithOtp(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export const profileRoutes = Router();

// GET /api/v1/profile/me
profileRoutes.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await AuthService.getProfile(req.user!.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/profile/me
profileRoutes.put('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const updated = await AuthService.updateProfile(req.user!.id, input);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
