import { z } from 'zod';

export const examSubjectItemSchema = z.object({
  subjectName: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  teacherId: z.string().nullable().optional(),
  dueDate: z.string().optional(),
});

export const createExamSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  className: z.string().optional(),
  classes: z.array(z.string()).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED']).optional().default('UPCOMING'),
  subjects: z.array(examSubjectItemSchema),
  schoolId: z.string().optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;

export const updatePaperStatusSchema = z.object({
  paperStatus: z.enum(['PENDING', 'UPLOADED', 'APPROVED', 'REJECTED']),
  paperPdfUrl: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
});

export type UpdatePaperStatusInput = z.infer<typeof updatePaperStatusSchema>;

export const enterMarksSchema = z.object({
  marks: z.array(
    z.object({
      studentId: z.string().min(1),
      marksObtained: z.number().min(0),
      maxMarks: z.number().min(1).default(100),
    })
  ),
});

export type EnterMarksInput = z.infer<typeof enterMarksSchema>;

export const toggleAdmitApprovalSchema = z.object({
  approved: z.boolean(),
  feeDue: z.boolean().optional(),
});

export type ToggleAdmitApprovalInput = z.infer<typeof toggleAdmitApprovalSchema>;

