import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  academicYear: z.string().optional().default('2025-2026'),
  schoolId: z.string().optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;

export const setClassSubjectsSchema = z.object({
  subjects: z.array(z.string().min(1)),
  schoolId: z.string().optional(),
});

export type SetClassSubjectsInput = z.infer<typeof setClassSubjectsSchema>;

export const configurePeriodsSchema = z.object({
  periods: z.array(
    z.object({
      index: z.number().int().min(0),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      isLunch: z.boolean().optional().default(false),
    })
  ),
  schoolId: z.string().optional(),
});

export type ConfigurePeriodsInput = z.infer<typeof configurePeriodsSchema>;

