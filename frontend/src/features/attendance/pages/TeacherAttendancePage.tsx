import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useLocation } from "react-router-dom";
import { getStudents } from "@/features/student/services/student.service";
import { getTimetableSlots } from "@/features/timetable/services/timetable.service";
import {
  fetchAttendanceRecordsAsync,
  getAttendanceRecords,
  saveAttendanceRecords,
  updateAttendanceRecord,
  exportAttendanceCSV,
} from "../services/attendance.service";
import type {
  AttendanceRecord,
  AttendanceStatus,
} from "../types/attendance.types";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Download,
  Edit2,
  History,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import {
  getCurrentPeriodIndex,
  isPeriodAvailableForAttendance,
  getTeachingPeriods,
} from "@/features/timetable/utils/periods.utils";
import { useNotificationStore } from "@/features/notification/store/notificationStore";

type TimetableEntry = {
  id: string;
  className: string;
  day: string;
  periodIndex: number;
  teacherId: string;
  subject: string;
};

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// 15 days lock rule
const canEdit = (dateStr: string) => {
  const diff =
    (new Date().getTime() - new Date(dateStr).getTime()) /
    (1000 * 60 * 60 * 24);
  return diff <= 15;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
};

export default function TeacherAttendancePage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [myEntries, setMyEntries] = useState<TimetableEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);

  // Mark attendance state
  const [selClass, setSelClass] = useState("");
  const [selSubject, setSelSubject] = useState("");
  const [selPeriod, setSelPeriod] = useState(0);
  const [markMap, setMarkMap] = useState<Record<string, AttendanceStatus>>({});
  const [submitted, setSubmitted] = useState(false);

  // History
  const [historyTab, setHistoryTab] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    date: string;
    className: string;
    subject: string;
    periodIndex: number;
  } | null>(null);
  const [editMap, setEditMap] = useState<Record<string, AttendanceStatus>>({});

  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );

  const today = new Date().toISOString().split("T")[0];
  const todayDay = DAYS[new Date().getDay()];

  // Parse query params from dashboard navigation
  const qp = new URLSearchParams(location.search);
  const qpClass = qp.get("class") || "";
  const qpSubject = decodeURIComponent(qp.get("subject") || "");
  const qpPeriod = qp.get("period") !== null ? Number(qp.get("period")) : -1;

  const refreshRecords = useCallback(() => {
    fetchAttendanceRecordsAsync({ schoolId: user?.schoolId }).then((records) => {
      setAllRecords(records);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Load timetable from MongoDB database
    getTimetableSlots(user.schoolId, undefined, user.id).then((slots) => {
      const entries: TimetableEntry[] = slots.map((s) => ({
        id: s.id,
        className: s.className,
        day: s.day,
        periodIndex: s.periodIndex,
        teacherId: s.teacherId,
        subject: s.subject,
      }));
      setMyEntries(entries);
      // Priority 1: query params from dashboard button
      if (qpClass) {
        setSelClass(qpClass);
        if (qpSubject) setSelSubject(qpSubject);
        if (qpPeriod >= 0) setSelPeriod(qpPeriod);
        else setSelPeriod(getCurrentPeriodIndex(user?.schoolId));
      } else {
        // Priority 2: today's first entry or auto-detect period
        const todayEntries = entries.filter((e) => e.day === todayDay);
        if (todayEntries.length > 0) {
          setSelClass(todayEntries[0].className);
          setSelSubject(todayEntries[0].subject || "");
          setSelPeriod(getCurrentPeriodIndex(user?.schoolId));
        } else if (entries.length > 0) {
          setSelClass(entries[0].className);
          setSelSubject(entries[0].subject || "");
          setSelPeriod(getCurrentPeriodIndex(user?.schoolId));
        }
      }
    });
    getStudents(user.schoolId).then((s) => setStudents(s));
    refreshRecords();
  }, [user, todayDay, refreshRecords, qpClass, qpSubject, qpPeriod]);

  // Get students for selected class
  const classStudents = students.filter((s) => s.className === selClass);

  // Check if today's session already marked
  const todaySessionRecords = allRecords.filter(
    (r) =>
      r.date === today &&
      r.className === selClass &&
      r.subject === selSubject &&
      r.periodIndex === selPeriod,
  );
  const alreadyMarked = todaySessionRecords.length > 0 && !submitted;

  // Unique classes for this teacher today
  const todayClasses = myEntries.filter((e) => e.day === todayDay);

  const handleClassChange = (newClass: string) => {
    setSelClass(newClass);
    setSubmitted(false);

    // Auto-select first available subject for this class
    const availableSubjects = [
      ...new Set(
        myEntries
          .filter((e) => e.className === newClass)
          .map((e) => e.subject)
          .filter(Boolean),
      ),
    ] as string[];
    const newSubject = availableSubjects.length > 0 ? availableSubjects[0] : "";
    setSelSubject(newSubject);

    // Auto-detect period based on today's schedule
    const scheduledEntry = myEntries.find(
      (e) =>
        e.day === todayDay &&
        e.className === newClass &&
        (e.subject === newSubject || !newSubject),
    );
    if (scheduledEntry) {
      setSelPeriod(scheduledEntry.periodIndex);
    }
  };

  const handleSubjectChange = (newSubject: string) => {
    setSelSubject(newSubject);
    setSubmitted(false);

    // Auto-detect period based on today's schedule
    const scheduledEntry = myEntries.find(
      (e) =>
        e.day === todayDay &&
        e.className === selClass &&
        e.subject === newSubject,
    );
    if (scheduledEntry) {
      setSelPeriod(scheduledEntry.periodIndex);
    }
  };

  const handleMark = (studentId: string, status: AttendanceStatus) => {
    setMarkMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = () => {
    if (!isPeriodAvailableForAttendance(selPeriod, user?.schoolId)) {
      toast.error(
        "Attendance can only be marked 5 minutes after the period starts.",
      );
      return;
    }
    if (classStudents.length === 0) {
      toast.error("No students found for this class.");
      return;
    }
    const records: AttendanceRecord[] = classStudents.map((s) => ({
      id: `att_${Date.now()}_${s.id}_${Math.random().toString(36).substr(2, 5)}`,
      schoolId: user?.schoolId,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      className: selClass,
      subject: selSubject,
      teacherId: user!.id,
      date: today,
      periodIndex: selPeriod,
      status: markMap[s.id] || "ABSENT",
      markedAt: new Date().toISOString(),
    }));
    saveAttendanceRecords(records, user?.schoolId);
    addNotification({
      title: "Attendance Marked",
      message: `Your attendance has been marked for ${selSubject} by Teacher ${user?.lastName}`,
      details: `**Subject:** ${selSubject}\n**Class:** ${selClass}\n**Date:** ${new Date().toLocaleDateString()}\n\nAttendance has been successfully recorded for this period.`,
      targetRole: "STUDENT",
      classId: selClass,
      type: "attendance",
    });
    addNotification({
      title: "Attendance Marked",
      message: `Teacher ${user?.firstName} ${user?.lastName} marked attendance for Class ${selClass} (${selSubject})`,
      details: `**Teacher:** ${user?.firstName} ${user?.lastName}\n**Class:** ${selClass}\n**Subject:** ${selSubject}\n**Date:** ${new Date().toLocaleDateString()}\n**Total Students:** ${classStudents.length}\n\nDaily attendance log updated.`,
      targetRole: "MANAGER",
      type: "attendance",
    });
    toast.success(`Attendance saved for Class ${selClass} - ${selSubject}`);
    setSubmitted(true);
    refreshRecords();
  };

  // --- History grouped by date → class → subject
  const myRecords = allRecords.filter((r) => r.teacherId === user?.id);
  const groupedByDate: Record<string, AttendanceRecord[]> = {};
  myRecords.forEach((r) => {
    if (!groupedByDate[r.date]) groupedByDate[r.date] = [];
    groupedByDate[r.date].push(r);
  });
  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    b.localeCompare(a),
  );

  // Open edit modal
  const openEdit = (
    date: string,
    className: string,
    subject: string,
    periodIndex: number,
  ) => {
    const sessionRecords = allRecords.filter(
      (r) =>
        r.date === date &&
        r.className === className &&
        r.subject === subject &&
        r.periodIndex === periodIndex,
    );
    const map: Record<string, AttendanceStatus> = {};
    sessionRecords.forEach((r) => {
      map[r.studentId] = r.status;
    });
    setEditMap(map);
    setEditModal({ date, className, subject, periodIndex });
  };

  const saveEdit = () => {
    if (!editModal) return;
    const sessionRecords = allRecords.filter(
      (r) =>
        r.date === editModal.date &&
        r.className === editModal.className &&
        r.subject === editModal.subject &&
        r.periodIndex === editModal.periodIndex,
    );
    sessionRecords.forEach((r) => {
      updateAttendanceRecord(
        { ...r, status: editMap[r.studentId] || r.status },
        user?.schoolId,
      );
    });
    toast.success("Attendance updated!");
    setEditModal(null);
    refreshRecords();
  };

  const StatusBtn = ({
    sid,
    status,
    current,
    onSet,
  }: {
    sid: string;
    status: AttendanceStatus;
    current: AttendanceStatus;
    onSet: (id: string, s: AttendanceStatus) => void;
  }) => (
    <button
      onClick={() => onSet(sid, status)}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
        current === status
          ? status === "PRESENT"
            ? "bg-white shadow text-emerald-600"
            : status === "LATE"
              ? "bg-white shadow text-amber-600"
              : "bg-white shadow text-rose-600"
          : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </button>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            </div>
            Student Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mark attendance for your assigned classes & subjects.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryTab(!historyTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${historyTab ? "bg-primary text-white border-primary" : "border-slate-300 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"}`}
          >
            <History className="h-4 w-4" /> History
          </button>
          <button
            onClick={() =>
              exportAttendanceCSV(
                selClass,
                selSubject,
                user?.firstName,
                user?.schoolId,
              )
            }
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 transition"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {myEntries.length === 0 ? (
        <div className="p-6 text-center bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-2xl text-amber-700 text-sm font-medium">
          You are not assigned to any classes in the Timetable yet.
        </div>
      ) : !historyTab ? (
        /* ========== MARK ATTENDANCE ========== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          {/* Session Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Class
              </label>
              <select
                value={selClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[...new Set(myEntries.map((e) => e.className))].map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <select
                value={selSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {[
                  ...new Set(
                    myEntries
                      .filter((e) => e.className === selClass)
                      .map((e) => e.subject)
                      .filter(Boolean),
                  ),
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Period
              </label>
              <select
                value={selPeriod}
                onChange={(e) => {
                  setSelPeriod(Number(e.target.value));
                  setSubmitted(false);
                }}
                className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {getTeachingPeriods(user?.schoolId).map((p) => (
                  <option key={p.index} value={p.index}>
                    Period {p.index + 1} ({p.time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5-min warning */}
          {!isPeriodAvailableForAttendance(selPeriod, user?.schoolId) && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-amber-700 text-sm font-medium flex items-center gap-2">
              ⏱️ Attendance can only be marked 5 minutes after the period
              starts.
            </div>
          )}

          {alreadyMarked && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl flex flex-col items-center justify-center text-center gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-blue-700 dark:text-blue-400 text-sm font-bold">
                Attendance already marked for this session.
              </p>
              <p className="text-blue-600/80 dark:text-blue-400/80 text-xs">
                If you need to make changes, please go to the History tab and
                use the Edit option.
              </p>
            </div>
          )}

          {/* Student List */}
          {!alreadyMarked && (
            <>
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {classStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No students found for Class {selClass}.
                  </div>
                ) : (
                  classStudents.map((s, i) => {
                    const current = markMap[s.id] || "ABSENT";
                    return (
                      <div
                        key={s.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 ${current === "PRESENT" ? "bg-emerald-50/30 dark:bg-emerald-900/10" : current === "LATE" ? "bg-amber-50/30 dark:bg-amber-900/10" : "bg-white dark:bg-slate-900"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm ${current === "PRESENT" ? "bg-emerald-100 text-emerald-700" : current === "LATE" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}
                          >
                            {s.firstName.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {s.firstName} {s.lastName}
                          </span>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 shrink-0 w-full sm:w-auto">
                          {(
                            ["ABSENT", "LATE", "PRESENT"] as AttendanceStatus[]
                          ).map((st) => (
                            <StatusBtn
                              key={st}
                              sid={s.id}
                              status={st}
                              current={current}
                              onSet={handleMark}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {classStudents.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={
                      !isPeriodAvailableForAttendance(selPeriod, user?.schoolId)
                    }
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    <ClipboardCheck className="h-4 w-4" /> Submit Attendance
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ========== HISTORY ========== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
            Attendance History
          </h2>
          {sortedDates.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No records yet. Mark attendance to see history.
            </div>
          ) : (
            sortedDates.map((date) => {
              const dateRecords = groupedByDate[date];
              const sessions = [
                ...new Map(
                  dateRecords.map((r) => [
                    `${r.className}|${r.subject}|${r.periodIndex}`,
                    {
                      className: r.className,
                      subject: r.subject,
                      periodIndex: r.periodIndex,
                    },
                  ]),
                ).values(),
              ];
              const isExpanded = expandedDate === date;
              const editable = canEdit(date);

              return (
                <div
                  key={date}
                  className="mb-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedDate(isExpanded ? null : date)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {new Date(date).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                        {sessions.length} session
                        {sessions.length > 1 ? "s" : ""}
                      </span>
                      {!editable && (
                        <span className="flex items-center gap-1 text-xs text-rose-500 font-medium">
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded &&
                    sessions.map((sess) => {
                      const sessRecs = dateRecords.filter(
                        (r) =>
                          r.className === sess.className &&
                          r.subject === sess.subject &&
                          r.periodIndex === sess.periodIndex,
                      );
                      const presentCount = sessRecs.filter(
                        (r) => r.status !== "ABSENT",
                      ).length;
                      return (
                        <div
                          key={`${sess.className}|${sess.subject}|${sess.periodIndex}`}
                          className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Class {sess.className} — {sess.subject}
                              </span>
                              <span className="text-xs text-slate-500">
                                Period {sess.periodIndex + 1}
                              </span>
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${presentCount === sessRecs.length ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                              >
                                {presentCount}/{sessRecs.length} Present
                              </span>
                            </div>
                            {editable && (
                              <button
                                onClick={() =>
                                  openEdit(
                                    date,
                                    sess.className,
                                    sess.subject,
                                    sess.periodIndex,
                                  )
                                }
                                className="flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg px-3 py-1.5 transition"
                              >
                                <Edit2 className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {sessRecs.map((r) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {r.studentName}
                                </span>
                                <span
                                  className={`text-[10px] font-bold ml-1 shrink-0 ${r.status === "PRESENT" ? "text-emerald-600" : r.status === "LATE" ? "text-amber-600" : "text-rose-500"}`}
                                >
                                  {r.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title={`Edit Attendance — ${editModal?.date} | ${editModal?.subject}`}
      >
        {editModal &&
          (() => {
            const sessRecs = allRecords.filter(
              (r) =>
                r.date === editModal.date &&
                r.className === editModal.className &&
                r.subject === editModal.subject &&
                r.periodIndex === editModal.periodIndex,
            );
            return (
              <div className="space-y-4">
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                  {sessRecs.map((r) => {
                    const current = editMap[r.studentId] || r.status;
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 bg-white dark:bg-slate-900"
                      >
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {r.studentName}
                        </span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 shrink-0 w-full sm:w-auto">
                          {(
                            ["ABSENT", "LATE", "PRESENT"] as AttendanceStatus[]
                          ).map((st) => (
                            <StatusBtn
                              key={st}
                              sid={r.studentId}
                              status={st}
                              current={current}
                              onSet={(id, s) =>
                                setEditMap((prev) => ({ ...prev, [id]: s }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setEditModal(null)}
                    className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
