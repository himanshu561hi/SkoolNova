import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { hashPassword } from '../../shared/utils/security.js';
import { CreateStudentInput, UpdateStudentInput } from './students.schema.js';
import { StudentProfile, User, SchoolClass, StudentAttendance } from '../../models/index.js';

const safeDate = (d?: any): string => {
  if (!d) return new Date().toISOString();
  const dt = d instanceof Date ? d : new Date(d);
  return !isNaN(dt.getTime()) ? dt.toISOString() : new Date().toISOString();
};

export class StudentsService {
  static async listStudents(tenantId: string, filters: { query?: string; className?: string; page?: number; limit?: number }) {
    const filter: any = { tenantId };

    if (filters.className && filters.className !== 'ALL') {
      filter.className = new RegExp(filters.className, 'i');
    }

    if (filters.query && filters.query.trim() !== '') {
      const q = new RegExp(filters.query.trim(), 'i');
      filter.$or = [
        { rollNumber: q },
        { standard: q },
        { section: q },
      ];
    }

    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.max(Number(filters.limit) || 100, 1);
    const skip = (page - 1) * limit;

    const [total, students] = await Promise.all([
      StudentProfile.countDocuments(filter),
      StudentProfile.find(filter).sort({ rollNumber: 1 }).skip(skip).limit(limit),
    ]);

    const items = await Promise.all(
      students.map(async (s) => {
        const user = await User.findById(s.userId);
        const totalAtt = await StudentAttendance.countDocuments({ studentId: s.id });
        const presentCount = await StudentAttendance.countDocuments({ studentId: s.id, status: 'PRESENT' });
        const attendancePercentage = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

        return {
          id: s.id,
          userId: s.userId,
          schoolId: s.tenantId,
          firstName: user ? user.firstName : 'Student',
          lastName: user ? user.lastName : '',
          fullName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
          email: user?.email || '',
          phone: s.phone || '',
          className: s.className || `${s.standard}-${s.section}`,
          classId: s.classId,
          rollNumber: s.rollNumber,
          attendance: attendancePercentage,
          firstLogin: user?.mustChangePassword ?? false,
          fatherName: s.fatherName || undefined,
          motherName: s.motherName || undefined,
          fatherPhone: s.fatherPhone || undefined,
          motherPhone: s.motherPhone || undefined,
          address: s.address || undefined,
          profilePic: user?.profilePictureUrl || undefined,
          createdAt: safeDate(s.createdAt),
        };
      })
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  static async getStudent(id: string, tenantId?: string) {
    const filter: any = { _id: id };
    if (tenantId) filter.tenantId = tenantId;

    const s = await StudentProfile.findOne(filter);

    if (!s) {
      throw new AppError('Student profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const user = await User.findById(s.userId);
    const totalAtt = await StudentAttendance.countDocuments({ studentId: s.id });
    const presentCount = await StudentAttendance.countDocuments({ studentId: s.id, status: 'PRESENT' });
    const attendancePercentage = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

    return {
      id: s.id,
      userId: s.userId,
      schoolId: s.tenantId,
      firstName: user ? user.firstName : 'Student',
      lastName: user ? user.lastName : '',
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
      email: user?.email || '',
      phone: s.phone || '',
      className: s.className || `${s.standard}-${s.section}`,
      classId: s.classId,
      rollNumber: s.rollNumber,
      attendance: attendancePercentage,
      firstLogin: user?.mustChangePassword ?? false,
      fatherName: s.fatherName || undefined,
      motherName: s.motherName || undefined,
      fatherPhone: s.fatherPhone || undefined,
      motherPhone: s.motherPhone || undefined,
      address: s.address || undefined,
      profilePic: user?.profilePictureUrl || undefined,
      createdAt: safeDate(s.createdAt),
    };
  }

  static async createStudent(input: CreateStudentInput, tenantId: string) {
    const email = input.email.trim().toLowerCase();

    // Split class string (e.g. "10-A" -> standard="10", section="A")
    let standard = '10';
    let section = 'A';
    if (input.className.includes('-')) {
      const parts = input.className.split('-');
      standard = parts[0].trim();
      section = parts[1].trim().toUpperCase();
    } else {
      standard = input.className.trim();
    }

    // Find or create class
    let schoolClass = await SchoolClass.findOne({ tenantId, standard, section });
    if (!schoolClass) {
      schoolClass = await SchoolClass.create({
        tenantId,
        standard,
        section,
        name: `${standard}-${section}`,
      });
    }

    // Check duplicate roll number in class
    const duplicateRoll = await StudentProfile.findOne({
      tenantId,
      classId: schoolClass.id,
      rollNumber: input.rollNumber.trim(),
    });

    if (duplicateRoll) {
      throw new AppError(
        `Roll number ${input.rollNumber} is already taken in class ${input.className}`,
        HTTP_STATUS.CONFLICT,
        'DUPLICATE_ROLL_NUMBER'
      );
    }

    const passwordHash = await hashPassword(input.password || '123456');

    // Check if user already exists
    const existing = await User.findOne({ email });

    if (existing) {
      if (existing.role === 'STUDENT') {
        const profileExists = await StudentProfile.findOne({ userId: existing.id });
        if (!profileExists) {
          // Re-use orphaned user
          existing.tenantId = tenantId;
          existing.firstName = input.firstName.trim();
          existing.lastName = input.lastName.trim();
          existing.passwordHash = passwordHash;
          existing.mustChangePassword = input.firstLogin ?? true;
          existing.isActive = true;
          await existing.save();

          const student = await StudentProfile.create({
            userId: existing.id,
            tenantId,
            classId: schoolClass.id,
            className: `${standard}-${section}`,
            rollNumber: input.rollNumber.trim(),
            standard,
            section,
            phone: input.phone?.trim() || null,
            fatherName: input.fatherName?.trim() || null,
            motherName: input.motherName?.trim() || null,
            fatherPhone: input.fatherPhone?.trim() || null,
            motherPhone: input.motherPhone?.trim() || null,
            address: input.address?.trim() || null,
            feesCleared: true,
          });

          return {
            id: student.id,
            userId: student.userId,
            schoolId: student.tenantId,
            firstName: existing.firstName,
            lastName: existing.lastName,
            fullName: `${existing.firstName} ${existing.lastName}`.trim(),
            email: existing.email,
            phone: student.phone || '',
            className: student.className,
            classId: student.classId,
            rollNumber: student.rollNumber,
            attendance: 100,
            firstLogin: existing.mustChangePassword,
            fatherName: student.fatherName || undefined,
            motherName: student.motherName || undefined,
            fatherPhone: student.fatherPhone || undefined,
            motherPhone: student.motherPhone || undefined,
            address: student.address || undefined,
            createdAt: safeDate(student.createdAt),
          };
        }
      }
      throw new AppError('A user with this email already exists in the system', HTTP_STATUS.CONFLICT, 'EMAIL_EXISTS');
    }

    const user = await User.create({
      tenantId,
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: 'STUDENT',
      mustChangePassword: input.firstLogin ?? true,
      isActive: true,
    });

    let student;
    try {
      student = await StudentProfile.create({
        userId: user.id,
        tenantId,
        classId: schoolClass.id,
        className: `${standard}-${section}`,
        rollNumber: input.rollNumber.trim(),
        standard,
        section,
        phone: input.phone?.trim() || null,
        fatherName: input.fatherName?.trim() || null,
        motherName: input.motherName?.trim() || null,
        fatherPhone: input.fatherPhone?.trim() || null,
        motherPhone: input.motherPhone?.trim() || null,
        address: input.address?.trim() || null,
        feesCleared: true,
      });
    } catch (err) {
      await User.findByIdAndDelete(user.id);
      throw err;
    }

    return {
      id: student.id,
      userId: student.userId,
      schoolId: student.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      phone: student.phone || '',
      className: student.className,
      classId: student.classId,
      rollNumber: student.rollNumber,
      attendance: 100,
      firstLogin: user.mustChangePassword,
      fatherName: student.fatherName || undefined,
      motherName: student.motherName || undefined,
      fatherPhone: student.fatherPhone || undefined,
      motherPhone: student.motherPhone || undefined,
      address: student.address || undefined,
      createdAt: student.createdAt.toISOString(),
    };
  }

  static async updateStudent(id: string, input: UpdateStudentInput, tenantId: string) {
    const student = await StudentProfile.findOne({ _id: id, tenantId });

    if (!student) {
      throw new AppError('Student profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const user = await User.findById(student.userId);
    if (user) {
      if (input.firstName) user.firstName = input.firstName.trim();
      if (input.lastName) user.lastName = input.lastName.trim();
      if (input.email) user.email = input.email.trim().toLowerCase();
      await user.save();
    }

    if (input.className) {
      let standard = '10';
      let section = 'A';
      if (input.className.includes('-')) {
        const parts = input.className.split('-');
        standard = parts[0].trim();
        section = parts[1].trim().toUpperCase();
      } else {
        standard = input.className.trim();
      }

      let schoolClass = await SchoolClass.findOne({ tenantId, standard, section });
      if (!schoolClass) {
        schoolClass = await SchoolClass.create({
          tenantId,
          standard,
          section,
          name: `${standard}-${section}`,
        });
      }
      student.classId = schoolClass.id;
      student.className = `${standard}-${section}`;
      student.standard = standard;
      student.section = section;
    }

    if (input.rollNumber) student.rollNumber = input.rollNumber.trim();
    if (input.phone) student.phone = input.phone.trim();
    if (input.fatherName) student.fatherName = input.fatherName.trim();
    if (input.motherName) student.motherName = input.motherName.trim();
    if (input.fatherPhone) student.fatherPhone = input.fatherPhone.trim();
    if (input.motherPhone) student.motherPhone = input.motherPhone.trim();
    if (input.address) student.address = input.address.trim();

    await student.save();

    return this.getStudent(id, tenantId);
  }

  static async deleteStudent(id: string, tenantId: string) {
    const student = await StudentProfile.findOne({ _id: id, tenantId });

    if (!student) {
      throw new AppError('Student profile not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await User.findByIdAndDelete(student.userId);
    await StudentProfile.findByIdAndDelete(id);

    return { success: true, message: 'Student deleted successfully' };
  }
}
