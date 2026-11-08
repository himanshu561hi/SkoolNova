import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ChangePasswordPage from "@/features/auth/pages/ChangePasswordPage";
import InactiveSchoolGuard from "../guards/InactiveSchoolGuard";
import NotificationsPage from "@/features/notification/pages/NotificationsPage";
import StudentsPage from "@/features/student/pages/StudentsPage";
import { TeachersPage } from "@/features/teacher/pages/TeachersPage";
import SchoolsPage from "@/features/superadmin/pages/SchoolsPage";
import InquiriesPage from "@/features/superadmin/pages/InquiriesPage";
import TimetablePage from "@/features/timetable/pages/TimetablePage";
import AssignmentsPage from "@/features/assignments/pages/AssignmentsPage";
import TeacherAttendancePage from "@/features/attendance/pages/TeacherAttendancePage";
import StudentAttendancePage from "@/features/attendance/pages/StudentAttendancePage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import ExamsRouterPage from "@/features/exams/pages/ExamsRouterPage";
import ScheduleExamPage from "@/features/exams/pages/ScheduleExamPage";
import LeaveRouterPage from "@/features/leave/pages/LeaveRouterPage";

import NotFoundPage from "@/pages/NotFoundPage";
import HomePage from "@/pages/HomePage";

import ProtectedRoute from "./ProtectedRoute";

import RoleGuard from "./RoleGuard";

import { ROUTE_PATHS } from "./routePaths";
import { useAuthStore } from "@/features/auth/store/authStore";

function AttendanceRouterPage() {
  const { user } = useAuthStore();
  if (user?.role === "STUDENT") return <StudentAttendancePage />;
  return <TeacherAttendancePage />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================= */}
        {/* PUBLIC ROUTES */}
        {/* ========================= */}

        <Route path={ROUTE_PATHS.HOME} element={<HomePage />} />
        <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />
        <Route path={ROUTE_PATHS.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        
        {/* ========================= */}
        {/* REQUIRE CHANGE PASSWORD */}
        {/* ========================= */}

        <Route
          path={ROUTE_PATHS.CHANGE_PASSWORD}
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* ========================= */}
        {/* PROTECTED DASHBOARD */}
        {/* ========================= */}

        <Route
          element={
            <ProtectedRoute>
              <InactiveSchoolGuard>
                <DashboardLayout />
              </InactiveSchoolGuard>
            </ProtectedRoute>
          }
        >
          {/* DASHBOARD PAGE */}
          <Route path={ROUTE_PATHS.DASHBOARD} element={<DashboardPage />} />

          {/* STUDENTS */}

          <Route
            path={ROUTE_PATHS.STUDENTS}
            element={
              <RoleGuard allowedRoles={["MANAGER", "TEACHER"]}>
                <StudentsPage />
              </RoleGuard>
            }
          />

          {/* TEACHERS */}
          <Route
            path={ROUTE_PATHS.TEACHERS}
            element={
              <RoleGuard allowedRoles={["MANAGER"]}>
                <TeachersPage />
              </RoleGuard>
            }
          />

          {/* SCHOOLS (SUPER ADMIN ONLY) */}
          <Route
            path={ROUTE_PATHS.SCHOOLS}
            element={
              <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
                <SchoolsPage />
              </RoleGuard>
            }
          />

          {/* INQUIRIES (SUPER ADMIN ONLY) */}
          <Route
            path={ROUTE_PATHS.INQUIRIES}
            element={
              <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
                <InquiriesPage />
              </RoleGuard>
            }
          />

          {/* TIMETABLE */}
          <Route
            path={ROUTE_PATHS.TIMETABLE}
            element={
              <RoleGuard allowedRoles={["MANAGER", "TEACHER", "STUDENT"]}>
                <TimetablePage />
              </RoleGuard>
            }
          />
          
          {/* LEAVE */}
          <Route
            path={ROUTE_PATHS.LEAVE}
            element={
              <RoleGuard allowedRoles={["MANAGER", "TEACHER", "STUDENT"]}>
                <LeaveRouterPage />
              </RoleGuard>
            }
          />

          {/* ASSIGNMENTS */}
          <Route
            path={ROUTE_PATHS.ASSIGNMENTS}
            element={
              <RoleGuard allowedRoles={["TEACHER", "STUDENT"]}>
                <AssignmentsPage />
              </RoleGuard>
            }
          />

          {/* EXAMS */}
          <Route
            path={ROUTE_PATHS.EXAMS}
            element={
              <RoleGuard allowedRoles={["MANAGER", "TEACHER", "STUDENT"]}>
                <ExamsRouterPage />
              </RoleGuard>
            }
          />

          <Route
            path={ROUTE_PATHS.SCHEDULE_EXAM}
            element={
              <RoleGuard allowedRoles={["MANAGER"]}>
                <ScheduleExamPage />
              </RoleGuard>
            }
          />

          {/* ATTENDANCE */}
          <Route
            path={ROUTE_PATHS.ATTENDANCE}
            element={
              <RoleGuard allowedRoles={["TEACHER", "STUDENT"]}>
                <AttendanceRouterPage />
              </RoleGuard>
            }
          />

          {/* PROFILE */}
          <Route
            path={ROUTE_PATHS.PROFILE}
            element={
              <RoleGuard allowedRoles={["TEACHER", "STUDENT"]}>
                <ProfilePage />
              </RoleGuard>
            }
          />

          {/* NOTIFICATIONS */}
          <Route
            path={ROUTE_PATHS.NOTIFICATIONS}
            element={<NotificationsPage />}
          />

          {/* DASHBOARD 404 */}

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ========================= */}
        {/* ROOT FALLBACK */}
        {/* ========================= */}

        <Route
          path="*"
          element={<Navigate replace to={ROUTE_PATHS.DASHBOARD} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
