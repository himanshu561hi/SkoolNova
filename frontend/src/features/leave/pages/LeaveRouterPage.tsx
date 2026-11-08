import { useAuthStore } from "@/features/auth/store/authStore";
import StudentLeavePage from "./StudentLeavePage";
import ManagerLeavePage from "./ManagerLeavePage";
import TeacherLeavePage from "./TeacherLeavePage";
import { Navigate } from "react-router-dom";

export default function LeaveRouterPage() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "STUDENT") {
    return <StudentLeavePage />;
  }
  if (user.role === "TEACHER") {
    return <TeacherLeavePage />;
  }
  
  if (user.role === "MANAGER" || user.role === "SCHOOL_MANAGER" || user.role === "SUPER_ADMIN") {
    return <ManagerLeavePage />;
  }

  return <Navigate to="/dashboard" replace />;
}
