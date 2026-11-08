import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { ConfigurePeriodsInput } from './academics.schema.js';
import { SchoolClass, ClassSubject, SchoolPeriod, StudentProfile } from '../../models/index.js';

const DEFAULT_PERIODS_DATA = [
  { periodIndex: 0, startTime: '09:00 AM', endTime: '09:45 AM', isLunch: false },
  { periodIndex: 1, startTime: '09:45 AM', endTime: '10:30 AM', isLunch: false },
  { periodIndex: 2, startTime: '10:30 AM', endTime: '11:15 AM', isLunch: false },
  { periodIndex: 3, startTime: '11:15 AM', endTime: '11:45 AM', isLunch: true },
  { periodIndex: 4, startTime: '11:45 AM', endTime: '12:30 PM', isLunch: false },
  { periodIndex: 5, startTime: '12:30 PM', endTime: '01:15 PM', isLunch: false },
];

export class AcademicsService {
  static async listClasses(tenantId: string) {
    const classes = await SchoolClass.find({ tenantId }).sort({ name: 1 });

    const results = await Promise.all(
      classes.map(async (c) => {
        const subjects = await ClassSubject.find({ classId: c.id });
        const studentsCount = await StudentProfile.countDocuments({ classId: c.id });

        return {
          id: c.id,
          name: c.name || `${c.standard || ''}-${c.section || ''}`,
          academicYear: '2025-2026',
          studentsCount,
          subjects: subjects.map((s) => s.subjectName || s.name || ''),
          createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
        };
      })
    );

    return results;
  }

  static async createClass(tenantId: string, name: string, academicYear = '2025-2026') {
    const trimmed = name.trim();
    const existing = await SchoolClass.findOne({
      tenantId,
      name: new RegExp(`^${trimmed}$`, 'i'),
    });

    if (existing) {
      throw new AppError(`Class ${trimmed} already exists`, HTTP_STATUS.CONFLICT, 'CLASS_EXISTS');
    }

    let standard = '10';
    let section = 'A';
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      standard = parts[0].trim();
      section = parts[1].trim().toUpperCase();
    } else {
      standard = trimmed;
    }

    const created = await SchoolClass.create({
      tenantId,
      name: trimmed,
      standard,
      section,
    });

    return {
      id: created.id,
      name: created.name,
      academicYear,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async deleteClass(tenantId: string, classId: string) {
    const cls = await SchoolClass.findOne({ _id: classId, tenantId });

    if (!cls) {
      throw new AppError('Class not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const studentsCount = await StudentProfile.countDocuments({ classId });
    if (studentsCount > 0) {
      throw new AppError(
        `Cannot delete class ${cls.name} because it has ${studentsCount} enrolled students`,
        HTTP_STATUS.CONFLICT,
        'CLASS_NOT_EMPTY'
      );
    }

    await SchoolClass.findByIdAndDelete(classId);
    await ClassSubject.deleteMany({ classId });

    return { success: true, message: `Class ${cls.name} deleted successfully` };
  }

  static async getClassSubjectsMapping(tenantId: string): Promise<Record<string, string[]>> {
    const classes = await SchoolClass.find({ tenantId }).sort({ name: 1 });

    const mapping: Record<string, string[]> = {};
    for (const c of classes) {
      const clsName = c.name || `${c.standard || ''}-${c.section || ''}`;
      if (!clsName) continue;
      const subjects = await ClassSubject.find({ classId: c.id });
      mapping[clsName] = subjects.map((s) => s.subjectName || s.name || '');
    }
    return mapping;
  }

  static async setClassSubjects(tenantId: string, className: string, subjects: string[]) {
    let standard = '10';
    let section = 'A';
    const trimmed = className.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      standard = parts[0].trim();
      section = parts[1].trim().toUpperCase();
    } else {
      standard = trimmed;
    }

    let cls = await SchoolClass.findOne({
      tenantId,
      name: new RegExp(`^${trimmed}$`, 'i'),
    });

    if (!cls) {
      cls = await SchoolClass.create({
        tenantId,
        name: trimmed,
        standard,
        section,
      });
    }

    // Clean existing subjects and insert new ones
    await ClassSubject.deleteMany({ classId: cls.id });

    if (subjects.length > 0) {
      await ClassSubject.insertMany(
        subjects.map((sub) => ({
          tenantId,
          classId: cls.id,
          subjectName: sub.trim(),
          name: sub.trim(),
          code: sub.trim().toUpperCase().replace(/\s+/g, '_'),
        }))
      );
    }

    return this.getClassSubjectsMapping(tenantId);
  }

  static async getPeriods(tenantId: string) {
    let periods = await SchoolPeriod.find({ tenantId }).sort({ periodIndex: 1 });

    // If no periods exist for this school yet, seed the default 6 periods
    if (periods.length === 0) {
      await SchoolPeriod.insertMany(
        DEFAULT_PERIODS_DATA.map((p) => ({
          tenantId,
          periodIndex: p.periodIndex,
          startTime: p.startTime,
          endTime: p.endTime,
          isLunch: p.isLunch,
        }))
      );

      periods = await SchoolPeriod.find({ tenantId }).sort({ periodIndex: 1 });
    }

    return periods.map((p) => ({
      id: p.id,
      index: p.periodIndex,
      startTime: p.startTime,
      endTime: p.endTime,
      time: `${p.startTime} - ${p.endTime}`,
      isLunch: p.isLunch,
    }));
  }

  static async configurePeriods(tenantId: string, input: ConfigurePeriodsInput) {
    // Invalidate existing periods and insert new
    await SchoolPeriod.deleteMany({ tenantId });

    await SchoolPeriod.insertMany(
      input.periods.map((p) => ({
        tenantId,
        periodIndex: p.index,
        startTime: p.startTime,
        endTime: p.endTime,
        isLunch: p.isLunch,
      }))
    );

    return this.getPeriods(tenantId);
  }
}
