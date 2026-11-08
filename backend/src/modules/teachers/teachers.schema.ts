import { z } from 'zod';

export const createTeacherSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
  employeeId: z.string().min(2, 'Employee ID is required'),
  department: z.string().min(2, 'Department is required'),
  subject: z.string().min(2, 'Subject is required'),
  qualification: z.string().min(2, 'Qualification is required'),
  experienceYears: z.number().min(0, 'Experience years cannot be negative'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  password: z.string().min(6).optional().default('123456'),
  firstLogin: z.boolean().optional().default(true),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  coordinatorFor: z.array(z.string()).optional(),
  schoolId: z.string().optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export const updateTeacherSchema = createTeacherSchema.partial();
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;

