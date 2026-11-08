import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { hashPassword, hashToken } from '../../shared/utils/security.js';
import { CreateSchoolInput } from './schools.schema.js';
import {
  Tenant,
  User,
  StudentProfile,
  TeacherProfile,
  SchoolClass,
  SchoolDeletionOtp,
} from '../../models/index.js';
import crypto from 'crypto';

export class SchoolsService {
  static async listSchools(searchQuery?: string) {
    const filter: any = {};
    if (searchQuery && searchQuery.trim() !== '') {
      filter.name = new RegExp(searchQuery.trim(), 'i');
    }

    const schools = await Tenant.find(filter).sort({ createdAt: -1 });

    const results = await Promise.all(
      schools.map(async (s) => {
        const manager = await User.findOne({
          tenantId: s.id,
          role: 'SCHOOL_MANAGER',
        });

        const [studentsCount, teachersCount, classesCount] = await Promise.all([
          StudentProfile.countDocuments({ tenantId: s.id }),
          TeacherProfile.countDocuments({ tenantId: s.id }),
          SchoolClass.countDocuments({ tenantId: s.id }),
        ]);

        return {
          id: s.id,
          name: s.name,
          code: s.code,
          status: s.status,
          managerEmail: manager?.email || 'N/A',
          managerName: manager ? `${manager.firstName} ${manager.lastName}` : 'N/A',
          studentsCount,
          teachersCount,
          classesCount,
          createdAt: s.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async getSchool(id: string) {
    const school = await Tenant.findById(id);

    if (!school) {
      throw new AppError('School not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const manager = await User.findOne({
      tenantId: school.id,
      role: 'SCHOOL_MANAGER',
    });

    const [studentsCount, teachersCount, classesCount] = await Promise.all([
      StudentProfile.countDocuments({ tenantId: school.id }),
      TeacherProfile.countDocuments({ tenantId: school.id }),
      SchoolClass.countDocuments({ tenantId: school.id }),
    ]);

    return {
      id: school.id,
      name: school.name,
      code: school.code,
      status: school.status,
      address: school.address,
      phoneNumber: school.contactPhone,
      email: school.contactEmail,
      manager: manager
        ? {
            id: manager.id,
            email: manager.email,
            firstName: manager.firstName,
            lastName: manager.lastName,
          }
        : null,
      studentsCount,
      teachersCount,
      classesCount,
      createdAt: school.createdAt.toISOString(),
    };
  }

  static async createSchool(input: CreateSchoolInput) {
    const managerEmail = input.managerEmail.trim().toLowerCase();

    // Check if manager email already in use
    const existingUser = await User.findOne({ email: managerEmail });

    if (existingUser) {
      throw new AppError(
        'A user with this manager email already exists in the system',
        HTTP_STATUS.CONFLICT,
        'EMAIL_EXISTS'
      );
    }

    // Generate unique school code if not provided
    const schoolCode =
      input.code?.trim().toUpperCase() ||
      `SCH-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const existingTenant = await Tenant.findOne({ code: schoolCode });

    if (existingTenant) {
      throw new AppError('A school with this code already exists', HTTP_STATUS.CONFLICT, 'CODE_EXISTS');
    }

    const hashedPassword = await hashPassword(input.managerPassword);

    // Create Tenant
    const tenant = await Tenant.create({
      name: input.schoolName.trim(),
      code: schoolCode,
      contactEmail: managerEmail,
      status: 'ACTIVE',
    });

    // Create Manager User
    const manager = await User.create({
      tenantId: tenant.id,
      firstName: input.managerFirstName.trim(),
      lastName: input.managerLastName.trim(),
      email: managerEmail,
      passwordHash: hashedPassword,
      role: 'SCHOOL_MANAGER',
      mustChangePassword: true,
      isActive: true,
    });

    return {
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      status: tenant.status,
      managerEmail: manager.email,
      managerName: `${manager.firstName} ${manager.lastName}`,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  static async updateStatus(schoolId: string, status: 'ACTIVE' | 'INACTIVE') {
    const school = await Tenant.findById(schoolId);

    if (!school) {
      throw new AppError('School not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    school.status = status;
    await school.save();

    return {
      id: school.id,
      name: school.name,
      status: school.status,
      updatedAt: school.updatedAt.toISOString(),
    };
  }

  static async requestDeleteOtp(schoolId: string, requestedByUserId: string) {
    const school = await Tenant.findById(schoolId);

    if (!school) {
      throw new AppError('School not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const rawOtp =
      process.env.NODE_ENV === 'production'
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : '123456';

    const otpHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous unused OTPs for this tenant
    await SchoolDeletionOtp.deleteMany({ tenantId: schoolId });

    await SchoolDeletionOtp.create({
      tenantId: schoolId,
      userId: requestedByUserId,
      otp: otpHash,
      expiresAt,
    });

    return {
      success: true,
      message: `OTP sent successfully. (Code: ${rawOtp})`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  static async deleteSchool(schoolId: string, rawOtp: string) {
    const otpHash = hashToken(rawOtp);

    const otpRecord = await SchoolDeletionOtp.findOne({
      tenantId: schoolId,
      otp: otpHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired deletion OTP', HTTP_STATUS.BAD_REQUEST, 'INVALID_OTP');
    }

    otpRecord.used = true;
    await otpRecord.save();

    // Delete tenant and related records
    await Promise.all([
      Tenant.findByIdAndDelete(schoolId),
      User.deleteMany({ tenantId: schoolId }),
      StudentProfile.deleteMany({ tenantId: schoolId }),
      TeacherProfile.deleteMany({ tenantId: schoolId }),
      SchoolClass.deleteMany({ tenantId: schoolId }),
    ]);

    return {
      success: true,
      message: 'School and all associated accounts deleted successfully',
    };
  }
}
