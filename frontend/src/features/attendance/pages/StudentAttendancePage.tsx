import { useEffect, useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { fetchAttendanceRecordsAsync, getStudentAverageAttendance } from "../services/attendance.service";
import type { AttendanceRecord } from "../types/attendance.types";
import { ClipboardCheck, TrendingUp, Calendar, Clock, BookOpen, ExternalLink, Users, FileText, ChevronDown } from "lucide-react";
import { getStudents } from "@/features/student/services/student.service";
import { getTeachers } from "@/features/teacher/services/teacher.service";
import { getAssignmentsAsync } from "@/features/assignments/services/assignment.service";
import { getTeachingPeriods } from "@/features/timetable/utils/periods.utils";
import { getTimetableSlots } from "@/features/timetable/services/timetable.service";
import Modal from "@/components/ui/Modal";

type TimetableEntry = { id: string; className: string; day: string; periodIndex: number; teacherId: string; subject: string };
type SubjectDetail = { subject: string; teacherName: string; time: string; periodIndex: number };

export default function StudentAttendancePage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [avgPct, setAvgPct] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<(TimetableEntry & { time: string, teacherName: string })[]>([]);
  const [studentClassName, setStudentClassName] = useState("");
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);

  // UI states
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDetail | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDay = DAYS[new Date().getDay()];
  const todayDateStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // 1. Attendance Records from DB
      const attendanceList = await fetchAttendanceRecordsAsync({ schoolId: user.schoolId });
      const all = attendanceList.filter(r => r.studentId === user.id);
      setRecords(all.sort((a, b) => b.date.localeCompare(a.date)));
      setAvgPct(getStudentAverageAttendance(user.id, user.schoolId));

      // 2. Student Info (to get className)
      const students = await getStudents(user.schoolId);
      const me = students.find(s => s.id === user.id);
      const myClass = me?.className || "";
      setStudentClassName(myClass);

      // 3. Timetable & Teachers from DB
      if (myClass) {
        const teachers = await getTeachers(user.schoolId);
        const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t.fullName]));
        const periods = getTeachingPeriods(user.schoolId);

        const slots = await getTimetableSlots(user.schoolId, myClass);
        const todays = slots.filter(e => e.className === myClass && e.day === todayDay);

        const scheduleWithDetails = todays.map(e => ({
          ...e,
          time: periods.find(p => p.index === e.periodIndex)?.time || "Unknown",
          teacherName: teacherMap[e.teacherId] || e.teacherName || "Unknown Teacher"
        })).sort((a, b) => a.periodIndex - b.periodIndex);

        setTodaySchedule(scheduleWithDetails);
      }

      // 4. Assignments from DB
      const allAssignments = await getAssignmentsAsync(user.schoolId);
      const now = new Date();
      setActiveAssignments(allAssignments.filter(a => new Date(a.dueDate) >= now));
    };

    loadData();
  }, [user, todayDay]);

  // Group by subject
  const bySubject: Record<string, AttendanceRecord[]> = {};
  records.forEach(r => {
    if (!bySubject[r.subject]) bySubject[r.subject] = [];
    bySubject[r.subject].push(r);
  });

  const subjectStats = Object.entries(bySubject).map(([subject, recs]) => {
    const present = recs.filter(r => r.status !== "ABSENT").length;
    const pct = Math.round((present / recs.length) * 100);
    return { subject, total: recs.length, present, pct };
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><ClipboardCheck className="h-5 w-5 text-indigo-500" /></div>
          My Attendance
        </h1>
        <p className="text-sm text-slate-500 mt-1">Overall attendance across all subjects in current year.</p>
      </div>

      {/* Average Card */}
      <div className={`rounded-2xl p-6 border shadow-sm ${records.length === 0 ? 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800' :
          avgPct >= 75 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' :
            avgPct >= 50 ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' :
              'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800'
        }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Overall Average Attendance</p>
            <p className={`text-5xl font-black mt-2 ${records.length === 0 ? 'text-slate-400' :
                avgPct >= 75 ? 'text-emerald-600' :
                  avgPct >= 50 ? 'text-amber-600' :
                    'text-rose-600'
              }`}>{avgPct}%</p>
            <p className="text-sm text-slate-500 mt-1">
              {records.length === 0 ? 'No sessions recorded yet' : `${records.length} total sessions recorded`}
            </p>
          </div>
          <TrendingUp className={`h-16 w-16 opacity-20 ${records.length === 0 ? 'text-slate-400' :
              avgPct >= 75 ? 'text-emerald-600' :
                avgPct >= 50 ? 'text-amber-600' :
                  'text-rose-600'
            }`} />
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-3 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${records.length === 0 ? 'bg-slate-300 dark:bg-slate-700' :
              avgPct >= 75 ? 'bg-emerald-500' :
                avgPct >= 50 ? 'bg-amber-500' :
                  'bg-rose-500'
            }`} style={{ width: records.length === 0 ? '100%' : `${avgPct}%` }} />
        </div>
        {records.length > 0 && avgPct < 75 && (
          <p className="text-xs font-medium mt-2 text-rose-600 dark:text-rose-400">⚠️ Your attendance is below the required 75%. Please attend more classes.</p>
        )}
      </div>

      {/* TODAY'S TIMELINE / HISTORY */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" /> {showHistory ? "Previous Attendance" : "Today's Schedule & Attendance"}
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-xl transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            {showHistory ? "View Today's Timeline" : "View Previous Attendance"}
          </button>
        </div>

        {showHistory ? (
          /* PREVIOUS ATTENDANCE (HISTORY) */
          records.length === 0 ? (
            <div className="py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              No attendance records found yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {records.slice(0, 30).map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.subject} — Period {r.periodIndex + 1}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${r.status === "PRESENT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : r.status === "LATE" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          /* TODAY'S TIMELINE */
          todaySchedule.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              No classes scheduled for today.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
              {todaySchedule.map((entry, idx) => {
                const markedRec = records.find(r => r.date === todayDateStr && r.periodIndex === entry.periodIndex && r.subject === entry.subject);
                const status = markedRec ? markedRec.status : "NOT MARKED";

                return (
                  <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {idx + 1}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100">{entry.subject}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Users className="h-3 w-3" /> {entry.teacherName}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {entry.time.split("-")[0]}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${status === "PRESENT" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                            status === "LATE" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" :
                              status === "ABSENT" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" :
                                "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                          {status}
                        </span>
                        <button onClick={() => setSelectedSubject(entry)} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1">
                          View Details <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Per-Subject Breakdown */}
      {subjectStats.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Subject-wise Breakdown</h2>
          <div className="space-y-4">
            {subjectStats.map(s => {
              const isExpanded = expandedSubject === s.subject;
              const subjectRecords = records.filter(r => r.subject === s.subject);

              return (
                <div key={s.subject} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all">
                  <div 
                    className="cursor-pointer flex flex-col group"
                    onClick={() => setExpandedSubject(isExpanded ? null : s.subject)}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {s.subject}
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </span>
                      <span className={`text-sm font-black ${s.pct >= 75 ? 'text-emerald-600' : s.pct >= 50 ? 'text-amber-600' : 'text-rose-500'}`}>{s.pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                      <div className={`h-full rounded-full transition-all ${s.pct >= 75 ? 'bg-emerald-500' : s.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">{s.present}/{s.total} classes attended</p>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase">Recent History</h4>
                      {subjectRecords.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No attendance records found.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {subjectRecords.map(r => (
                            <div key={r.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} (Period {r.periodIndex + 1})
                              </span>
                              <span className={`font-bold px-2 py-0.5 rounded-full ${r.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : r.status === 'LATE' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20'}`}>
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* SUBJECT DETAILS MODAL */}
      <Modal isOpen={!!selectedSubject} onClose={() => setSelectedSubject(null)} title={`Subject Details: ${selectedSubject?.subject}`}>
        {selectedSubject && (() => {
          const subName = selectedSubject.subject;
          const subStats = subjectStats.find(s => s.subject === subName);
          const activeAssignmentsForSub = activeAssignments.filter(a => a.className === studentClassName && a.subject === subName);

          return (
            <div className="space-y-6 pb-2">
              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase">Instructor</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedSubject.teacherName}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 uppercase">Schedule</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{selectedSubject.time}</p>
                </div>
              </div>

              {/* Attendance specific to subject */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Attendance Score</h4>
                  <span className={`text-lg font-black ${subStats ? (subStats.pct >= 75 ? 'text-emerald-600' : subStats.pct >= 50 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-400'}`}>
                    {subStats ? `${subStats.pct}%` : 'N/A'}
                  </span>
                </div>
                {subStats ? (
                  <>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${subStats.pct >= 75 ? 'bg-emerald-500' : subStats.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${subStats.pct}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{subStats.present} out of {subStats.total} classes attended</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No attendance records for this subject yet.</p>
                )}
              </div>

              {/* Assignments for this subject */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-500" /> Active Assignments
                </h4>
                {activeAssignmentsForSub.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 text-xs">
                    No active assignments for this subject.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeAssignmentsForSub.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(a.dueDate).toLocaleDateString()}</p>
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 text-[10px] font-bold px-2 py-1 rounded">PENDING</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
