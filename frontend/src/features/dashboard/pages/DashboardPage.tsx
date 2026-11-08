import EmptyDashboardState from "../components/EmptyDashboardState";
import DashboardSkeleton from "../components/DashboardSkeleton";
import ManagerDashboard from "../sections/ManagerDashboard";
import StudentDashboard from "../sections/StudentDashboard";
import TeacherDashboard from "../sections/TeacherDashboard";
import SuperAdminDashboard from "../sections/SuperAdminDashboard";
import { useAuthStore } from "@/features/auth/store/authStore";
import useDashboard from "../hooks/useDashboard";

function DashboardPage() {
  /*
   =========================
   AUTH USER
   =========================
  */
  const { user } = useAuthStore();

  /*
   =========================
   ROLE NORMALIZATION
   =========================
  */
  const role = user?.role?.trim().toUpperCase();

  /*
   =========================
   DASHBOARD DATA HOOK
   =========================
  */
  const {
    loading: dashboardLoading,
    stats,
    attendance,
    activities,
    fetchAttendance,
  } = useDashboard();

  /*
   =========================
   LOADING STATE
   =========================
  */
  if (dashboardLoading) {
    return <DashboardSkeleton />;
  }

  /*
   =========================
   ROLE RENDERING
   =========================
  */

  if (role === "SUPER_ADMIN") {
    return <SuperAdminDashboard />;
  }

  if (
    role === "MANAGER" ||
    role === "SCHOOL_MANAGER" ||
    role === "PRINCIPAL" ||
    role === "DIRECTOR"
  ) {
    return (
      <ManagerDashboard
        stats={stats || []}
        attendance={attendance || []}
        activities={activities || []}
        onTimeframeChange={fetchAttendance}
      />
    );
  }

  if (role === "TEACHER") {
    return <TeacherDashboard attendance={attendance || []} />;
  }

  if (role === "STUDENT") {
    return <StudentDashboard attendance={attendance || []} />;
  }

  return (
    <EmptyDashboardState
      title="No Dashboard Available"
      description="Your account role could not be identified. Please contact administrator."
    />
  );
}

export default DashboardPage;
