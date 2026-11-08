import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import {
  hashPassword,
  verifyPassword,
  generateRefreshToken,
  hashToken,
} from '../../shared/utils/security.js';
import { signAccessToken } from '../../core/plugins/auth.js';
import {
  LoginInput,
  UpdateProfileInput,
  ForgotPasswordInput,
  ResetPasswordWithOtpInput,
} from './auth.schema.js';
import {
  User,
  Tenant,
  TeacherProfile,
  StudentProfile,
  RefreshToken,
  SchoolClass,
  PasswordResetOtp,
} from '../../models/index.js';
import { sendPasswordResetEmail } from '../../shared/utils/email.js';

export class AuthService {
  static async login(input: LoginInput) {
    const email = input.email.trim().toLowerCase();

    // Query user by email
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    // Verify password with Argon2
    const passwordValid = await verifyPassword(user.passwordHash, input.password);
    if (!passwordValid) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }

    // Verify user is active
    if (!user.isActive) {
      throw new AppError(
        'Your account has been deactivated. Please contact your administrator.',
        HTTP_STATUS.FORBIDDEN,
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Check school status if user belongs to a tenant
    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
      if (tenant && tenant.status === 'INACTIVE' && user.role !== 'SUPER_ADMIN') {
        throw new AppError(
          'Your school account is currently inactive. Please contact the administrator.',
          HTTP_STATUS.FORBIDDEN,
          'SCHOOL_INACTIVE'
        );
      }
    }

    // Generate tokens
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
      mustChangePassword: user.mustChangePassword,
    });

    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await RefreshToken.create({
      userId: user.id,
      token: tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profileImage: user.profilePictureUrl || undefined,
        createdAt: user.createdAt.toISOString(),
        schoolId: user.tenantId || undefined,
        schoolName: tenant?.name || undefined,
        schoolStatus: tenant?.status || 'ACTIVE',
      },
    };
  }

  static async refreshToken(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const tokenRecord = await RefreshToken.findOne({
      token: tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenRecord) {
      throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new AppError('User account is deactivated or not found', HTTP_STATUS.UNAUTHORIZED, 'USER_INACTIVE');
    }

    // Revoke old token
    await RefreshToken.deleteOne({ _id: tokenRecord._id });

    // Check tenant status
    if (user.tenantId && user.role !== 'SUPER_ADMIN') {
      const tenant = await Tenant.findById(user.tenantId);
      if (tenant && tenant.status === 'INACTIVE') {
        throw new AppError('School account has been deactivated', HTTP_STATUS.FORBIDDEN, 'SCHOOL_INACTIVE');
      }
    }

    // Issue new pair
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
      mustChangePassword: user.mustChangePassword,
    });

    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await RefreshToken.create({
      userId: user.id,
      token: newTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  static async logout(rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await RefreshToken.deleteMany({ token: tokenHash });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  static async changePassword(userId: string, newPassword: string) {
    const newHash = await hashPassword(newPassword);

    await User.findByIdAndUpdate(userId, {
      passwordHash: newHash,
      mustChangePassword: false,
    });

    // Revoke all existing refresh tokens for security
    await RefreshToken.deleteMany({ userId });

    return { success: true, message: 'Password changed successfully' };
  }

  static async getProfile(userId: string) {
    const user = await User.findById(userId);

    if (!user) {
      throw new AppError('User profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    let tenant = null;
    if (user.tenantId) {
      tenant = await Tenant.findById(user.tenantId);
    }

    const teacherProfile = await TeacherProfile.findOne({ userId });
    const studentProfile = await StudentProfile.findOne({ userId });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      profileImage: user.profilePictureUrl || undefined,
      createdAt: user.createdAt.toISOString(),
      schoolId: user.tenantId || undefined,
      schoolName: tenant?.name || undefined,
      schoolStatus: tenant?.status || 'ACTIVE',
      teacherProfile: teacherProfile ? teacherProfile.toJSON() : undefined,
      studentProfile: studentProfile ? studentProfile.toJSON() : undefined,
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    await User.findByIdAndUpdate(userId, {
      firstName: input.firstName,
      lastName: input.lastName,
    });

    // Update teacher or student phone/address if supplied
    if (input.phone || input.address) {
      await StudentProfile.updateMany(
        { userId },
        { guardianPhone: input.phone }
      );
    }

    return this.getProfile(userId);
  }

  static async requestPasswordResetOtp(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new AppError('No registered account found with this email address', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('This account is currently deactivated. Please contact your administrator.', HTTP_STATUS.FORBIDDEN, 'ACCOUNT_DEACTIVATED');
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing unused OTPs for this email
    await PasswordResetOtp.deleteMany({ email: normalizedEmail });

    await PasswordResetOtp.create({
      email: normalizedEmail,
      otp,
      expiresAt,
      used: false,
    });

    // Send email via nodemailer or console fallback
    await sendPasswordResetEmail(normalizedEmail, otp);

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email address.',
    };
  }

  static async resetPasswordWithOtp(input: ResetPasswordWithOtpInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const otpRecord = await PasswordResetOtp.findOne({
      email: normalizedEmail,
      otp: input.otp.trim(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired verification OTP. Please request a new code.', HTTP_STATUS.BAD_REQUEST, 'INVALID_OTP');
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new AppError('User account not found', HTTP_STATUS.NOT_FOUND, 'USER_NOT_FOUND');
    }

    // Hash new password using Argon2id
    const newHash = await hashPassword(input.newPassword);

    await User.findByIdAndUpdate(user.id, {
      passwordHash: newHash,
      mustChangePassword: false,
    });

    // Invalidate used OTP
    await PasswordResetOtp.deleteMany({ email: normalizedEmail });

    // Revoke all existing refresh tokens for security
    await RefreshToken.deleteMany({ userId: user.id });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new credentials.',
    };
  }
}
