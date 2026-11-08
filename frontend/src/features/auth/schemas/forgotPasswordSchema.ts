import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;

export const resetPasswordWithOtpSchema = z
  .object({
    email: z.string().email(),
    otp: z
      .string()
      .min(6, "OTP must be 6 digits")
      .max(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only numbers"),
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordWithOtpFormValues = z.infer<typeof resetPasswordWithOtpSchema>;

