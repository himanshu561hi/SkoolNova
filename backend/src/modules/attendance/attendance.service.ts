import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { SaveStudentAttendanceInput, SaveTeacherAttendanceInput } from './attendance.schema.js';
import {
  StudentAttendance,
  TeacherAttendance,
  StudentProfile,
  TeacherProfile,
  SchoolClass,
  SchoolPeriod,
  User,
} from '../../models/index.js';

export class AttendanceService {
  private static validateAttendanceDate(dateStr: string) {
    const targetDate = new Date(dateStr + 'T00:00:00Z');
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Future date check
    if (targetDate.getTime() > today.getTime() + 24 * 60 * 60 * 1000) {
      throw new AppError('Cannot record attendance for a future date', HTTP_STATUS.BAD_REQUEST, 'FUTURE_DATE');
    }

    // 15-day restriction check
    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 15) {
      throw new AppError(
        'Attendance records older than 15 days cannot be modified',
        HTTP_STATUS.BAD_REQUEST,
        'EDIT_WINDOW_EXPIRED'
      );
    }

    return targetDate;
  }

  static async getStudentAttendance(
    tenantId: string,
    filters: { date?: string; className?: string; subject?: string; periodIndex?: number; studentId?: string }
  ) {
    const filter: any = { tenantId };

    if (filters.date) {
      const d = new Date(filters.date + 'T00:00:00Z');
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (filters.subject) {
      filter.subjectName = new RegExp(`^${filters.subject.trim()}$`, 'i');
    }

    if (filters.studentId) {
      filter.$or = [{ studentId: filters.studentId }];
    }

    const records = await StudentAttendance.find(filter).sort({ date: -1, markedAt: -1 });

    const results = await Promise.all(
      records.map(async (r) => {
        const student = await StudentProfile.findById(r.studentId);
        const user = student ? await User.findById(student.userId) : null;
        const cls = await SchoolClass.findById(r.classId);
        const period = r.periodId ? await SchoolPeriod.findById(r.periodId) : null;

        return {
          id: r.id,
          schoolId: r.tenantId,
          studentId: student ? student.id : r.studentId,
          studentUserId: student ? student.userId : '',
          studentName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Student',
          className: cls ? cls.name : '',
          classId: r.classId,
          subject: r.subjectName || '',
          teacherId: r.teacherId || '',
          date: r.date.toISOString().split('T')[0],
          periodIndex: period ? period.periodIndex : 0,
          periodTime: period ? `${period.startTime} - ${period.endTime}` : '',
          status: r.status,
          remarks: r.remarks || undefined,
          markedAt: r.markedAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async saveStudentAttendance(
    tenantId: string,
    input: SaveStudentAttendanceInput,
    markerUserId: string
  ) {
    const targetDate = this.validateAttendanceDate(input.date);

    // Resolve class
    let standard = '10';
    let section = 'A';
    const trimmed = input.className.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      standard = parts[0].trim();
      section = parts[1].trim().toUpperCase();
    } else {
      standard = trimmed;
    }

    let schoolClass = await SchoolClass.findOne({
      tenantId,
      name: new RegExp(`^${trimmed}$`, 'i'),
    });

    if (!schoolClass) {
      schoolClass = await SchoolClass.create({
        tenantId,
        name: trimmed,
        standard,
        section,
      });
    }

    // Resolve period
    let period = await SchoolPeriod.findOne({
      tenantId,
      periodIndex: input.periodIndex,
    });

    if (!period) {
      period = await SchoolPeriod.create({
        tenantId,
        periodIndex: input.periodIndex,
        startTime: `Period ${input.periodIndex + 1}`,
        endTime: `End`,
        isLunch: false,
      });
    }

    // Resolve teacher profile if marker is teacher
    const teacher = await TeacherProfile.findOne({
      tenantId,
      $or: [{ _id: markerUserId }, { userId: markerUserId }],
    });

    // Save attendance records
    for (const item of input.records) {
      let student = await StudentProfile.findOne({
        tenantId,
        $or: [{ _id: item.studentId }, { userId: item.studentId }],
      });

      if (!student) {
        student = await StudentProfile.findById(item.studentId);
      }

      if (!student) continue;

      let record = await StudentAttendance.findOne({
        studentId: student.id,
        date: targetDate,
        subjectName: input.subject.trim(),
        periodId: period.id,
      });

      if (record) {
        record.status = item.status;
        record.remarks = item.remarks || null;
        record.teacherId = teacher?.id || null;
        record.markedAt = new Date();
        await record.save();
      } else {
        await StudentAttendance.create({
          tenantId,
          studentId: student.id,
          classId: schoolClass.id,
          subjectName: input.subject.trim(),
          periodId: period.id,
          teacherId: teacher?.id || null,
          date: targetDate,
          status: item.status,
          remarks: item.remarks || null,
          markedById: markerUserId,
        });
      }
    }

    return this.getStudentAttendance(tenantId, {
      date: input.date,
      className: input.className,
      subject: input.subject,
      periodIndex: input.periodIndex,
    });
  }

  static async getTeacherAttendance(tenantId: string, dateStr?: string) {
    const filter: any = { tenantId };
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00Z');
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const records = await TeacherAttendance.find(filter).sort({ date: -1 });

    const results = await Promise.all(
      records.map(async (r) => {
        const teacher = await TeacherProfile.findById(r.teacherId);
        const user = teacher ? await User.findById(teacher.userId) : null;

        return {
          id: r.id,
          schoolId: r.tenantId,
          teacherId: teacher ? teacher.id : r.teacherId,
          teacherUserId: teacher ? teacher.userId : '',
          teacherName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Teacher',
          date: r.date.toISOString().split('T')[0],
          status: r.status,
          markedByUserId: r.markedByUserId || '',
          createdAt: r.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async saveTeacherAttendance(
    tenantId: string,
    input: SaveTeacherAttendanceInput,
    markerUserId: string
  ) {
    const targetDate = this.validateAttendanceDate(input.date);

    for (const item of input.records) {
      let teacher = await TeacherProfile.findOne({
        tenantId,
        $or: [{ _id: item.teacherId }, { userId: item.teacherId }],
      });

      if (!teacher) {
        teacher = await TeacherProfile.findById(item.teacherId);
      }

      if (!teacher) continue;

      let record = await TeacherAttendance.findOne({
        teacherId: teacher.id,
        date: targetDate,
      });

      if (record) {
        record.status = item.status;
        record.markedByUserId = markerUserId;
        await record.save();
      } else {
        await TeacherAttendance.create({
          tenantId,
          teacherId: teacher.id,
          date: targetDate,
          status: item.status,
          markedByUserId: markerUserId,
        });
      }
    }

    return this.getTeacherAttendance(tenantId, input.date);
  }

  static async getStudentAverageAttendance(tenantId: string, studentId: string) {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));

    let student = await StudentProfile.findOne({
      tenantId,
      $or: [{ _id: studentId }, { userId: studentId }],
    });

    if (!student) {
      student = await StudentProfile.findById(studentId);
    }

    const sId = student ? student.id : studentId;

    const records = await StudentAttendance.find({
      tenantId,
      studentId: sId,
      date: { $gte: startOfYear },
    });

    if (records.length === 0) return { attendancePercentage: 100, totalSessions: 0 };

    const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const percentage = Math.round((presentCount / records.length) * 100);

    return {
      attendancePercentage: percentage,
      totalSessions: records.length,
      presentSessions: presentCount,
    };
  }
}
