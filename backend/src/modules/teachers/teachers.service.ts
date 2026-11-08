import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { hashPassword } from '../../shared/utils/security.js';
import { CreateTeacherInput, UpdateTeacherInput } from './teachers.schema.js';
import { TeacherProfile, User } from '../../models/index.js';

const safeDate = (d?: any): string => {
  if (!d) return new Date().toISOString();
  const dt = d instanceof Date ? d : new Date(d);
  return !isNaN(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
};

const safeDateStr = (d?: any): string => {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return !isNaN(dt.getTime()) ? dt.toISOString().split('T')[0] : '';
};

export class TeachersService {
  static async listTeachers(tenantId: string, filters: { query?: string; department?: string; status?: string }) {
    const filter: any = { tenantId };

    if (filters.department && filters.department !== 'ALL') {
      filter.department = new RegExp(filters.department, 'i');
    }

    if (filters.status && filters.status !== 'ALL') {
      filter.status = filters.status;
    }

    if (filters.query && filters.query.trim() !== '') {
      const q = new RegExp(filters.query.trim(), 'i');
      filter.$or = [
        { employeeId: q },
        { department: q },
        { primarySubject: q },
      ];
    }

    const teacherProfiles = await TeacherProfile.find(filter).sort({ createdAt: -1 });

    const results = await Promise.all(
      teacherProfiles.map(async (t) => {
        const user = t.userId ? await User.findById(t.userId) : null;
        return {
          id: t.id,
          userId: t.userId,
          schoolId: t.tenantId,
          fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Teacher',
          email: user?.email || '',
          phone: t.phone || '',
          employeeId: t.employeeId,
          department: t.department || 'General',
          subject: t.primarySubject || 'General',
          qualification: t.qualification || '',
          experienceYears: t.experienceYears || 0,
          joiningDate: safeDateStr(t.joiningDate),
          coordinatorFor: t.coordinatorForClasses || [],
          status: t.status || 'ACTIVE',
          firstLogin: user?.mustChangePassword ?? false,
          profilePic: user?.profilePictureUrl || undefined,
          createdAt: safeDate(t.createdAt),
          updatedAt: safeDate(t.updatedAt),
        };
      })
    );

    return results;
  }

  static async getTeacher(id: string, tenantId?: string) {
    const filter: any = { _id: id };
    if (tenantId) filter.tenantId = tenantId;

    const t = await TeacherProfile.findOne(filter);

    if (!t) {
      throw new AppError('Teacher profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const user = t.userId ? await User.findById(t.userId) : null;

    return {
      id: t.id,
      userId: t.userId,
      schoolId: t.tenantId,
      fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Teacher',
      email: user?.email || '',
      phone: t.phone || '',
      employeeId: t.employeeId,
      department: t.department || 'General',
      subject: t.primarySubject || 'General',
      qualification: t.qualification || '',
      experienceYears: t.experienceYears || 0,
      joiningDate: safeDateStr(t.joiningDate),
      coordinatorFor: t.coordinatorForClasses || [],
      status: t.status || 'ACTIVE',
      firstLogin: user?.mustChangePassword ?? false,
      profilePic: user?.profilePictureUrl || undefined,
      createdAt: safeDate(t.createdAt),
      updatedAt: safeDate(t.updatedAt),
    };
  }

  static async createTeacher(input: CreateTeacherInput, tenantId: string) {
    const email = input.email.trim().toLowerCase();

    // Check duplicate employee ID
    const duplicateEmpId = await TeacherProfile.findOne({
      tenantId,
      employeeId: input.employeeId.trim(),
    });

    if (duplicateEmpId) {
      throw new AppError(
        `Teacher with employee ID ${input.employeeId} already exists in this school`,
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_EMPLOYEE_ID'
      );
    }

    // Split name
    const parts = input.fullName.trim().split(' ');
    const firstName = parts[0] || 'Teacher';
    const lastName = parts.slice(1).join(' ') || '';

    const passwordHash = await hashPassword(input.password || '123456');

    let parsedJoiningDate = new Date();
    if (input.joiningDate) {
      const d = new Date(input.joiningDate);
      if (!isNaN(d.getTime())) parsedJoiningDate = d;
    }

    // Check existing email across entire system
    const existing = await User.findOne({ email });

    if (existing) {
      // Check if this is an orphaned teacher user without a profile (from a previously failed creation attempt)
      if (existing.role === 'TEACHER') {
        const profileExists = await TeacherProfile.findOne({ userId: existing.id });
        if (!profileExists) {
          // Re-use this orphaned user and complete profile creation!
          existing.tenantId = tenantId;
          existing.firstName = firstName;
          existing.lastName = lastName;
          existing.passwordHash = passwordHash;
          existing.mustChangePassword = input.firstLogin ?? true;
          existing.isActive = input.status !== 'INACTIVE';
          await existing.save();

          const profile = await TeacherProfile.create({
            userId: existing.id,
            tenantId,
            employeeId: input.employeeId.trim(),
            department: input.department.trim(),
            primarySubject: input.subject.trim(),
            qualification: input.qualification.trim(),
            experienceYears: input.experienceYears,
            phone: input.phone.trim(),
            joiningDate: parsedJoiningDate,
            coordinatorForClasses: input.coordinatorFor || [],
            status: input.status || 'ACTIVE',
          });

          return {
            id: profile.id,
            userId: profile.userId,
            schoolId: profile.tenantId,
            fullName: `${existing.firstName} ${existing.lastName}`.trim(),
            email: existing.email,
            phone: profile.phone || '',
            employeeId: profile.employeeId,
            department: profile.department,
            subject: profile.primarySubject,
            qualification: profile.qualification || '',
            experienceYears: profile.experienceYears,
            joiningDate: safeDateStr(profile.joiningDate),
            coordinatorFor: profile.coordinatorForClasses || [],
            status: profile.status,
            firstLogin: existing.mustChangePassword,
            createdAt: safeDate(profile.createdAt),
            updatedAt: safeDate(profile.updatedAt),
          };
        }
      }

      throw new AppError('A user with this email already exists in the system', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
    }

    const user = await User.create({
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role: 'TEACHER',
      mustChangePassword: input.firstLogin ?? true,
      isActive: input.status !== 'INACTIVE',
    });

    let profile;
    try {
      profile = await TeacherProfile.create({
        userId: user.id,
        tenantId,
        employeeId: input.employeeId.trim(),
        department: input.department.trim(),
        primarySubject: input.subject.trim(),
        qualification: input.qualification.trim(),
        experienceYears: input.experienceYears,
        phone: input.phone.trim(),
        joiningDate: parsedJoiningDate,
        coordinatorForClasses: input.coordinatorFor || [],
        status: input.status || 'ACTIVE',
      });
    } catch (err) {
      // Rollback user creation if profile creation fails
      await User.findByIdAndDelete(user.id);
      throw err;
    }

    return {
      id: profile.id,
      userId: profile.userId,
      schoolId: profile.tenantId,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: profile.phone || '',
      employeeId: profile.employeeId,
      department: profile.department,
      subject: profile.primarySubject,
      qualification: profile.qualification || '',
      experienceYears: profile.experienceYears,
      joiningDate: safeDateStr(profile.joiningDate),
      coordinatorFor: profile.coordinatorForClasses || [],
      status: profile.status,
      firstLogin: user.mustChangePassword,
      createdAt: safeDate(profile.createdAt),
      updatedAt: safeDate(profile.updatedAt),
    };
  }

  static async updateTeacher(id: string, input: UpdateTeacherInput, tenantId: string) {
    const profile = await TeacherProfile.findOne({ _id: id, tenantId });

    if (!profile) {
      throw new AppError('Teacher profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const user = await User.findById(profile.userId);
    if (user) {
      if (input.fullName) {
        const parts = input.fullName.trim().split(' ');
        user.firstName = parts[0] || 'Teacher';
        user.lastName = parts.slice(1).join(' ') || '';
      }
      if (input.email) user.email = input.email.trim().toLowerCase();
      if (input.status !== undefined) user.isActive = input.status === 'ACTIVE';
      await user.save();
    }

    if (input.employeeId) profile.employeeId = input.employeeId.trim();
    if (input.department) profile.department = input.department.trim();
    if (input.subject) profile.primarySubject = input.subject.trim();
    if (input.qualification) profile.qualification = input.qualification.trim();
    if (input.experienceYears !== undefined) profile.experienceYears = input.experienceYears;
    if (input.phone) profile.phone = input.phone.trim();
    if (input.joiningDate) profile.joiningDate = new Date(input.joiningDate);
    if (input.status) profile.status = input.status;
    if (input.coordinatorFor) profile.coordinatorForClasses = input.coordinatorFor;

    await profile.save();

    return this.getTeacher(id, tenantId);
  }

  static async deleteTeacher(id: string, tenantId: string) {
    const profile = await TeacherProfile.findOne({ _id: id, tenantId });

    if (!profile) {
      throw new AppError('Teacher not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await User.findByIdAndDelete(profile.userId);
    await TeacherProfile.findByIdAndDelete(id);

    return { success: true, message: 'Teacher deleted successfully' };
  }
}
