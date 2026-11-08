export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "SCHOOL_MANAGER"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

export type User = {
  id: string;

  firstName: string;

  lastName: string;

  email: string;

  role: UserRole;

  mustChangePassword: boolean;

  profileImage?: string;

  createdAt: string;

  schoolId?: string;

  schoolName?: string;

  schoolStatus?: "ACTIVE" | "INACTIVE";
};

export type LoginPayload = {
  email: string;

  password: string;
};

export type AuthResponse = {
  accessToken: string;

  refreshToken: string;

  user: User;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  newPassword: string;
};
