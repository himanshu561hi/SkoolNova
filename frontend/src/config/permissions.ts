import { ROLES } from "@/constants/roles";

export const PERMISSIONS = {
 SUPER_ADMIN: [
    "*",
  ],

  MANAGER: [
    "students.create",
    "students.update",
    "students.delete",
    "teachers.create",
    "teachers.update",
    "teachers.delete",
    "fees.view",
    "fees.manage",
    "attendance.manage",
    "salary.manage",
    "reports.view",
    "timetable.manage",
    "leave.manage",
  ],

  SCHOOL_MANAGER: [
    "students.create",
    "students.update",
    "students.delete",
    "teachers.create",
    "teachers.update",
    "teachers.delete",
    "fees.view",
    "fees.manage",
    "attendance.manage",
    "salary.manage",
    "reports.view",
    "timetable.manage",
    "leave.manage",
  ],

  TEACHER: [
    "students.create",
    "attendance.mark",
    "attendance.view",
    "assignments.create",
    "assignments.update",
    "marks.create",
    "marks.update",
    "students.view",
    "timetable.view",
    "leave.apply",
  ],

  STUDENT: [
    "attendance.view",
    "assignments.view",
    "materials.view",
    "fees.view",
    "results.view",
    "timetable.view",
    "leave.apply",
  ],

  PARENT: [
    "attendance.view",
    "fees.view",
    "results.view",
    "assignments.view",
  ],
} as const;

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]:
    PERMISSIONS.SUPER_ADMIN,

  [ROLES.MANAGER]: PERMISSIONS.MANAGER,

  [ROLES.SCHOOL_MANAGER]: PERMISSIONS.SCHOOL_MANAGER,

  [ROLES.TEACHER]: PERMISSIONS.TEACHER,

  [ROLES.STUDENT]: PERMISSIONS.STUDENT,

  [ROLES.PARENT]: PERMISSIONS.PARENT,
} as const;