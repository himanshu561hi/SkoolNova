import { z } from 'zod';

export const createSchoolSchema = z.object({
  schoolName: z.string().min(2, 'School name must be at least 2 characters'),
  code: z.string().optional(),
  managerFirstName: z.string().min(1, 'Manager first name is required'),
  managerLastName: z.string().min(1, 'Manager last name is required'),
  managerEmail: z.string().email('Valid manager email is required'),
  managerPassword: z.string().min(6, 'Manager password must be at least 6 characters'),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

export const updateSchoolStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type UpdateSchoolStatusInput = z.infer<typeof updateSchoolStatusSchema>;

export const deleteSchoolSchema = z.object({
  otp: z.string().min(4, 'OTP is required'),
});

export type DeleteSchoolInput = z.infer<typeof deleteSchoolSchema>;

