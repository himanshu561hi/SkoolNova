import apiClient from "@/lib/axios";
import type { AttendanceRecord } from "../types/attendance.types";

/**
 * In-memory fallback cache (NOT localStorage) to prevent unnecessary re-fetching while in-session
 */
let inMemoryStudentAttendance: AttendanceRecord[] = [];
let inMemoryTeacherAttendance: any[] = [];

export const getAttendanceRecords = (_schoolId?: string): AttendanceRecord[] => {
  return inMemoryStudentAttendance;
};

export const fetchAttendanceRecordsAsync = async (
  filters?: { date?: string; className?: string; subject?: string; periodIndex?: number; schoolId?: string }
): Promise<AttendanceRecord[]> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: AttendanceRecord[] }>(
      "/attendance/students",
      { params: filters }
    );
    inMemoryStudentAttendance = res.data.data;
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch student attendance from DB", err);
    return inMemoryStudentAttendance;
  }
};

export const getTeacherAttendanceRecords = (_schoolId?: string): any[] => {
  return inMemoryTeacherAttendance;
};

export const fetchTeacherAttendanceAsync = async (date?: string, schoolId?: string): Promise<any[]> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/attendance/teachers", {
      params: { date, schoolId },
    });
    inMemoryTeacherAttendance = res.data.data;
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch teacher attendance from DB", err);
    return inMemoryTeacherAttendance;
  }
};

export const saveTeacherAttendanceRecords = async (newRecords: any[], schoolId?: string) => {
  // Update in-memory state
  newRecords.forEach(nr => {
    const idx = inMemoryTeacherAttendance.findIndex(r => r.teacherId === nr.teacherId && r.date === nr.date);
    if (idx >= 0) inMemoryTeacherAttendance[idx] = nr;
    else inMemoryTeacherAttendance.push(nr);
  });

  // Save directly to MongoDB database
  if (newRecords.length > 0) {
    const date = newRecords[0].date;
    await apiClient.post("/attendance/teachers", {
      date,
      records: newRecords.map(r => ({ teacherId: r.teacherId, status: r.status })),
      schoolId,
    });
  }
};

export const saveAttendanceRecords = async (newRecords: AttendanceRecord[], schoolId?: string) => {
  // Update in-memory state
  newRecords.forEach(nr => {
    const idx = inMemoryStudentAttendance.findIndex(r =>
      r.studentId === nr.studentId &&
      r.date === nr.date &&
      r.subject === nr.subject &&
      r.periodIndex === nr.periodIndex
    );
    if (idx >= 0) inMemoryStudentAttendance[idx] = nr;
    else inMemoryStudentAttendance.push(nr);
  });

  // Save directly to MongoDB database
  if (newRecords.length > 0) {
    const first = newRecords[0];
    await apiClient.post("/attendance/students", {
      date: first.date,
      className: first.className,
      subject: first.subject,
      periodIndex: first.periodIndex,
      records: newRecords.map(r => ({
        studentId: r.studentId,
        status: r.status,
        remarks: r.remarks,
      })),
      schoolId,
    });
  }
};

export const updateAttendanceRecord = async (updated: AttendanceRecord, schoolId?: string) => {
  await saveAttendanceRecords([updated], schoolId);
};

export const getAttendanceForSession = (
  date: string,
  className: string,
  subject: string,
  periodIndex: number,
  schoolId?: string
): AttendanceRecord[] => {
  return inMemoryStudentAttendance.filter(
    r => r.date === date && r.className === className && r.subject === subject && r.periodIndex === periodIndex
  );
};

export const getStudentAverageAttendance = (studentId: string, _schoolId?: string): number => {
  const currentYear = new Date().getFullYear();
  const records = inMemoryStudentAttendance.filter(r => {
    return r.studentId === studentId && new Date(r.date).getFullYear() === currentYear;
  });
  if (records.length === 0) return 100;
  const presentCount = records.filter(r => r.status === "PRESENT" || r.status === "LATE").length;
  return Math.round((presentCount / records.length) * 100);
};

export const exportAttendanceCSV = (
  className: string,
  subject?: string,
  _teacherName?: string,
  _schoolId?: string
): void => {
  let records = inMemoryStudentAttendance.filter(r => r.className === className);
  if (subject) records = records.filter(r => r.subject === subject);
  if (records.length === 0) {
    alert("No attendance records to export.");
    return;
  }

  const header = ["Date", "Student Name", "Student ID", "Subject", "Period", "Status", "Marked At"];
  const rows = records
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(r => [
      r.date,
      r.studentName,
      r.studentId,
      r.subject,
      String(r.periodIndex + 1),
      r.status,
      new Date(r.markedAt).toLocaleString()
    ]);

  const csv = [header, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance_class${className}${subject ? `_${subject}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
