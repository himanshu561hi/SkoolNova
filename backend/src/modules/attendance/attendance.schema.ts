import { z } from 'zod';

export const studentAttendanceItemSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE']),
  remarks: z.string().optional(),
});

export const saveStudentAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  className: z.string().min(1),
  subject: z.string().min(1),
  periodIndex: z.number().int().min(0),
  records: z.array(studentAttendanceItemSchema),
  schoolId: z.string().optional(),
});

export type SaveStudentAttendanceInput = z.infer<typeof saveStudentAttendanceSchema>;

export const teacherAttendanceItemSchema = z.object({
  teacherId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY']),
});

export const saveTeacherAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  records: z.array(teacherAttendanceItemSchema),
  schoolId: z.string().optional(),
});

export type SaveTeacherAttendanceInput = z.infer<typeof saveTeacherAttendanceSchema>;

