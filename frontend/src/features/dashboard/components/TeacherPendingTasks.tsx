import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { getAssignmentsAsync, getSubmissionsAsync } from "../../assignments/services/assignment.service";
import { fetchAttendanceRecordsAsync } from "@/features/attendance/services/attendance.service";
import { getTimetableSlots } from "@/features/timetable/services/timetable.service";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useNavigate } from "react-router-dom";

type Task = {
  id: string;
  title: string;
  subtitle: string;
  type: "URGENT" | "NEEDS REVIEW" | "UPCOMING";
  iconType: "ATTENDANCE" | "ASSIGNMENT" | "EXAM";
  path: string;
};

export default function TeacherPendingTasks() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      const newTasks: Task[] = [];
      
      try {
        const [allAssignments, allSubmissions, slots, records] = await Promise.all([
          getAssignmentsAsync(user.schoolId),
          getSubmissionsAsync(),
          getTimetableSlots(user.schoolId, undefined, user.id),
          fetchAttendanceRecordsAsync({
            date: new Date().toISOString().split("T")[0],
            schoolId: user.schoolId,
          }),
        ]);

        // 1. Check for ungraded assignments (Submitted by students)
        const myAssignments = allAssignments.filter(a => a.teacherId === user.id);
        myAssignments.forEach(assignment => {
          const subs = allSubmissions.filter(s => s.assignmentId === assignment.id && s.status === "SUBMITTED");
          if (subs.length > 0) {
            newTasks.push({
              id: `assn_${assignment.id}`,
              title: `Review: ${assignment.title}`,
              subtitle: `${subs.length} new submissions for Class ${assignment.className}`,
              type: "NEEDS REVIEW",
              iconType: "ASSIGNMENT",
              path: "/assignments"
            });
          }
        });

        // 2. Check for unmarked attendance today
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = days[new Date().getDay()];
        const myClassesToday = slots.filter(e => e.day === currentDay);

        if (myClassesToday.length > 0) {
          const todayStr = new Date().toISOString().split("T")[0];
          const markedToday = records.filter(r => (r.teacherId === user.id || (r as any).markedByTeacherId === user.id) && r.date === todayStr);
          
          const markedPeriods = new Set(markedToday.map(r => r.periodIndex)).size;
          const totalPeriods = myClassesToday.length;

          if (markedPeriods < totalPeriods) {
            const remaining = totalPeriods - markedPeriods;
            newTasks.push({
              id: "attendance_pending",
              title: "Mark Today's Attendance",
              subtitle: `You have ${remaining} class${remaining > 1 ? 'es' : ''} left to mark today`,
              type: "URGENT",
              iconType: "ATTENDANCE",
              path: "/attendance"
            });
          }
        }
      } catch (err) {
        console.error("Failed to load teacher pending tasks:", err);
      }

      setTasks(newTasks.slice(0, 4)); // max 4 tasks
    };

    loadTasks();
  }, [user]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Pending Tasks & To-Do
          </h2>
          <p className="text-sm text-slate-500 mt-1">Actions you need to complete soon.</p>
        </div>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {tasks.length} Tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-50" />
          <p className="text-slate-500 font-medium">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => {
            const isUrgent = task.type === 'URGENT';
            const isPending = task.type === 'NEEDS REVIEW';
            
            return (
              <div 
                key={task.id} 
                onClick={() => navigate(task.path)}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                  isUrgent ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-900/50' :
                  isPending ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-900/50' :
                  'bg-blue-50 border-blue-200 dark:bg-blue-500/5 dark:border-blue-900/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    {task.iconType === 'ATTENDANCE' && <Clock className="h-5 w-5 text-rose-500" />}
                    {task.iconType === 'ASSIGNMENT' && <ClipboardList className="h-5 w-5 text-amber-500" />}
                    {task.iconType === 'EXAM' && <CheckCircle2 className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.title}</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{task.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded hidden sm:block ${
                    isUrgent ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                    isPending ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}>
                    {task.type}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
