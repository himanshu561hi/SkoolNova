import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS, Role } from '../../config/constants.js';
import { AssignSlotInput } from './timetable.schema.js';
import {
  Tenant,
  TimetableSlot,
  SchoolClass,
  SchoolPeriod,
  TeacherProfile,
  User,
} from '../../models/index.js';

export class TimetableService {
  static async getSettings(tenantId: string) {
    const tenant = await Tenant.findById(tenantId);
    return {
      allowTeachersEdit: Boolean(tenant?.allowTeachersEditTimetable),
    };
  }

  static async updateSettings(tenantId: string, allowTeachersEdit: boolean) {
    const tenant = await Tenant.findById(tenantId);
    if (tenant) {
      tenant.allowTeachersEditTimetable = allowTeachersEdit;
      await tenant.save();
    }

    return {
      allowTeachersEdit,
    };
  }

  static async listSlots(tenantId: string, filters: { className?: string; teacherId?: string }) {
    const filter: any = { tenantId };

    if (filters.className && filters.className !== 'ALL') {
      filter.className = new RegExp(`^${filters.className.trim()}$`, 'i');
    }

    if (filters.teacherId) {
      filter.$or = [{ teacherId: filters.teacherId }];
    }

    const slots = await TimetableSlot.find(filter).sort({ dayOfWeek: 1, periodIndex: 1 });

    const results = await Promise.all(
      slots.map(async (s) => {
        const period = await SchoolPeriod.findById(s.periodId);
        const teacher = await TeacherProfile.findById(s.teacherId);
        const user = teacher ? await User.findById(teacher.userId) : null;

        return {
          id: s.id,
          className: s.className || '',
          classId: s.classId,
          day: s.dayOfWeek,
          periodIndex: s.periodIndex,
          periodId: s.periodId,
          periodTime: period ? `${period.startTime} - ${period.endTime}` : '',
          teacherId: teacher ? teacher.id : s.teacherId,
          teacherUserId: teacher ? teacher.userId : '',
          teacherName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Teacher',
          subject: s.subjectName,
          updatedAt: s.updatedAt.toISOString(),
        };
      })
    );

    return results;
  }

  static async assignSlot(tenantId: string, input: AssignSlotInput, userRole: Role, userId: string) {
    // 1. Resolve Class
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

    // 2. Resolve Period
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

    // 3. Resolve Teacher
    let teacher = await TeacherProfile.findOne({
      tenantId,
      $or: [{ _id: input.teacherId }, { userId: input.teacherId }],
    });

    if (!teacher) {
      teacher = await TeacherProfile.findById(input.teacherId);
    }

    if (!teacher) {
      throw new AppError('Teacher not found in this school', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const teacherUser = await User.findById(teacher.userId);

    // 4. Role Authorization Check for TEACHER
    if (userRole === 'TEACHER') {
      const settings = await this.getSettings(tenantId);
      if (!settings.allowTeachersEdit) {
        throw new AppError(
          'Teachers are not permitted to edit the timetable. Contact the school manager.',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN'
        );
      }

      const isCoordinator = (teacher.coordinatorForClasses || []).includes(schoolClass.name);
      if (!isCoordinator && teacher.userId !== userId) {
        throw new AppError(
          `You can only manage timetable for classes you coordinate`,
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN'
        );
      }
    }

    // 5. Collision Check: Is this teacher booked in another class on this day & period?
    const conflict = await TimetableSlot.findOne({
      tenantId,
      teacherId: teacher.id,
      dayOfWeek: input.day,
      periodId: period.id,
      classId: { $ne: schoolClass.id },
    });

    if (conflict) {
      throw new AppError(
        `Conflict! Teacher is already assigned to Class ${conflict.className || 'another class'} at this time.`,
        HTTP_STATUS.CONFLICT,
        'TEACHER_COLLISION'
      );
    }

    // 6. Upsert Slot (one slot per class/day/period)
    let slot = await TimetableSlot.findOne({
      classId: schoolClass.id,
      dayOfWeek: input.day,
      periodId: period.id,
    });

    if (slot) {
      slot.teacherId = teacher.id;
      slot.subjectName = input.subject.trim();
      slot.className = schoolClass.name;
      slot.periodIndex = input.periodIndex;
      await slot.save();
    } else {
      slot = await TimetableSlot.create({
        tenantId,
        classId: schoolClass.id,
        className: schoolClass.name,
        dayOfWeek: input.day,
        periodId: period.id,
        periodIndex: input.periodIndex,
        teacherId: teacher.id,
        subjectName: input.subject.trim(),
      });
    }

    return {
      id: slot.id,
      className: slot.className,
      day: slot.dayOfWeek,
      periodIndex: slot.periodIndex,
      teacherId: teacher.id,
      teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}`.trim() : 'Teacher',
      subject: slot.subjectName,
      updatedAt: slot.updatedAt.toISOString(),
    };
  }

  static async deleteSlot(tenantId: string, slotId: string) {
    const slot = await TimetableSlot.findOne({ _id: slotId, tenantId });

    if (!slot) {
      throw new AppError('Timetable slot not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    await TimetableSlot.findByIdAndDelete(slotId);

    return { success: true, message: 'Slot removed successfully' };
  }
}
