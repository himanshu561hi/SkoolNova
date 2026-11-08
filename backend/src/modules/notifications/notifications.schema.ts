import { z } from 'zod';

export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z
    .enum(['leave', 'homework', 'notice', 'complaint', 'message', 'attendance', 'result', 'fee', 'general'])
    .optional()
    .default('general'),
  targetRole: z.enum(['MANAGER', 'TEACHER', 'STUDENT', 'ALL']).optional().default('ALL'),
  targetClassId: z.string().nullable().optional(),
  targetUserId: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  schoolId: z.string().optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

