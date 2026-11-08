export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",

  MANAGER: "MANAGER",

  SCHOOL_MANAGER: "SCHOOL_MANAGER",

  TEACHER: "TEACHER",

  STUDENT: "STUDENT",

  PARENT: "PARENT",
} as const;

export type UserRole =
  (typeof ROLES)[keyof typeof ROLES];

export type Role = UserRole;
