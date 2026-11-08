import { z } from 'zod';

export const createAssignmentSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().min(2, 'Description is required'),
  className: z.string().min(1, 'Class is required'),
  subject: z.string().min(1, 'Subject is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentData: z.string().optional(),
  schoolId: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const submitAssignmentSchema = z.object({
  content: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentData: z.string().optional(),
  fileAttachmentName: z.string().optional(),
  fileAttachmentData: z.string().optional(),
});

export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  grade: z.string().min(1, 'Grade is required'),
  teacherRemarks: z.string().optional(),
  status: z.enum(['GRADED', 'SUBMITTED', 'PENDING']).optional().default('GRADED'),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

