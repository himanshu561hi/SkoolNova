import { z } from 'zod';

export const createInquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  studentCount: z.string().optional(),
  message: z.string().optional(),
});

export const replyInquirySchema = z.object({
  replyMessage: z.string().optional(),
  message: z.string().optional(),
  notes: z.string().optional(),
  reply: z.string().optional(),
  status: z.string().optional().default('REPLIED'),
}).transform((val) => {
  const msg = (val.replyMessage || val.message || val.notes || val.reply || '').trim();
  if (!msg) {
    throw new Error('Reply message cannot be empty');
  }
  return {
    replyMessage: msg,
    status: (val.status || 'REPLIED').toUpperCase(),
  };
});

export const updateInquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'REPLIED', 'RESOLVED']),
});

export const listInquiriesQuerySchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'REPLIED', 'RESOLVED', 'ALL']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type ReplyInquiryInput = z.infer<typeof replyInquirySchema>;
export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;
export type ListInquiriesQuery = z.infer<typeof listInquiriesQuerySchema>;

