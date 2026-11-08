import { z } from 'zod';

export const dayOfWeekEnum = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

export const assignSlotSchema = z.object({
  className: z.string().min(1, 'Class is required'),
  day: dayOfWeekEnum,
  periodIndex: z.number().int().min(0),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  subject: z.string().min(1, 'Subject is required'),
  schoolId: z.string().optional(),
});

export type AssignSlotInput = z.infer<typeof assignSlotSchema>;

export const timetableSettingsSchema = z.object({
  allowTeachersEdit: z.boolean(),
  schoolId: z.string().optional(),
});

export type TimetableSettingsInput = z.infer<typeof timetableSettingsSchema>;

