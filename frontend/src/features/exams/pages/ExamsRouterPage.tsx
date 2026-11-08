import { useAuthStore } from "@/features/auth/store/authStore";
import ManagerExamsPage from "./ManagerExamsPage";
import TeacherExamsPage from "./TeacherExamsPage";
import StudentExamsPage from "./StudentExamsPage";

export default function ExamsRouterPage() {
  const { user } = useAuthStore();
  
  if (user?.role === "MANAGER" || user?.role === "SCHOOL_MANAGER") {
    return <ManagerExamsPage />;
  }
  
  if (user?.role === "TEACHER") {
    return <TeacherExamsPage />;
  }
  
  if (user?.role === "STUDENT") {
    return <StudentExamsPage />;
  }

  return <div>Unauthorized role for Exams</div>;
}
