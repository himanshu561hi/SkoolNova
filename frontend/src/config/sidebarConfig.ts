import type { UserRole } from "@/constants/roles";

import type { LucideIcon } from "lucide-react";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  IndianRupee,
  FileText,
  ClipboardCheck,
  BookOpen,
  PenSquare,
  ShieldCheck,
  Building2,
  BarChart3,
  CalendarDays,
  User,
  CalendarHeart,
  MessageSquare,
} from "lucide-react";

type SidebarItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  permission?: string;
};

const managerSidebarItems: SidebarItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users, permission: "students.create" },
  { label: "Teachers", path: "/teachers", icon: GraduationCap, permission: "teachers.create" },
  { label: "Timetable", path: "/timetable", icon: CalendarDays },
  { label: "Leave", path: "/leave", icon: CalendarHeart },
  { label: "Exams", path: "/exams", icon: PenSquare },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Fees", path: "/fees", icon: IndianRupee },
];

export const SIDEBAR_CONFIG: Record<UserRole, SidebarItem[]> = {
  /* ========================= */
  /* MANAGER / PRINCIPAL / DIRECTOR */
  /* ========================= */
  MANAGER: managerSidebarItems,
  SCHOOL_MANAGER: managerSidebarItems,
  /* ========================= */
  /* TEACHER */
  /* ========================= */
  TEACHER: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Students", path: "/students", icon: Users, permission: "students.view" },
    { label: "Timetable", path: "/timetable", icon: CalendarDays },
    { label: "Attendance", path: "/attendance", icon: ClipboardCheck },
    { label: "Leave", path: "/leave", icon: CalendarHeart },
    { label: "Assignments", path: "/assignments", icon: BookOpen },
    { label: "Exams", path: "/exams", icon: PenSquare },
    { label: "Profile", path: "/profile", icon: User },
  ],
  /* ========================= */
  /* STUDENT */
  /* ========================= */
  STUDENT: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Timetable", path: "/timetable", icon: CalendarDays },
    { label: "Assignments", path: "/assignments", icon: BookOpen },
    { label: "Attendance", path: "/attendance", icon: ClipboardCheck },
    { label: "Leave", path: "/leave", icon: CalendarHeart },
    { label: "Exams", path: "/exams", icon: PenSquare },
    { label: "Profile", path: "/profile", icon: User },
    { label: "Fees", path: "/fees", icon: IndianRupee },
  ],
  /* ========================= */
  /* PARENT */
  /* ========================= */
  PARENT: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Child Progress", path: "/child-progress", icon: ShieldCheck },
  ],
  /* ========================= */
  /* SUPER ADMIN */
  /* ========================= */
  SUPER_ADMIN: [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Schools", path: "/schools", icon: Building2 },
    { label: "Inquiries", path: "/inquiries", icon: MessageSquare },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
  ],
};