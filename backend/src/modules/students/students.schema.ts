import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().or(z.literal('')),
  className: z.string().min(1, 'Class is required'),
  rollNumber: z.string().min(1, 'Roll number is required'),
  fatherName: z.string().optional().or(z.literal('')),
  motherName: z.string().optional().or(z.literal('')),
  fatherPhone: z.string().optional().or(z.literal('')),
  motherPhone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  password: z.string().min(6).optional().default('123456'),
  firstLogin: z.boolean().optional().default(true),
  schoolId: z.string().optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.partial();
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

