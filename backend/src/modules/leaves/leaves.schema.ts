import { z } from 'zod';

export const applyLeaveSchema = z.object({
  subject: z.string().min(2, 'Subject is required'),
  description: z.string().min(2, 'Description is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  documentUrl: z.string().nullable().optional(),
  schoolId: z.string().optional(),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const reviewLeaveSchema = z.object({
  status: z.enum(['PENDING_MANAGER', 'APPROVED', 'REJECTED']),
  remark: z.string().min(1, 'Remark is required'),
});

export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>;

