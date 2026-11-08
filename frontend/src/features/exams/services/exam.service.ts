import apiClient from "@/lib/axios";
import { ExamSchedule, PaperStatus, AdmitCard, AdmitCardApproval } from "../types/exam.types";

let inMemoryExams: ExamSchedule[] = [];
let inMemoryApprovals: AdmitCardApproval[] = [];

export const getExams = async (schoolId?: string): Promise<ExamSchedule[]> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/exams", {
      params: { schoolId },
    });
    const mapped: ExamSchedule[] = res.data.data.map((e) => ({
      id: e.id,
      schoolId: e.schoolId,
      title: e.title,
      className: e.className,
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      subjects: e.subjects,
      createdAt: e.createdAt,
    }));
    inMemoryExams = mapped;
    return mapped;
  } catch (err) {
    console.error("Failed to fetch exams from DB", err);
    return schoolId ? inMemoryExams.filter(e => e.schoolId === schoolId) : inMemoryExams;
  }
};

export const saveExams = (exams: ExamSchedule[], _schoolId?: string) => {
  inMemoryExams = exams;
};

export const deleteExam = async (examId: string, _schoolId?: string): Promise<void> => {
  await apiClient.delete(`/exams/${examId}`);
  inMemoryExams = inMemoryExams.filter(e => e.id !== examId);
};

export const createExam = async (exam: Omit<ExamSchedule, "id" | "createdAt">): Promise<ExamSchedule> => {
  const res = await apiClient.post<{ success: boolean; data: ExamSchedule }>("/exams", {
    title: exam.title,
    className: exam.className,
    startDate: exam.startDate,
    endDate: exam.endDate,
    status: exam.status,
    subjects: exam.subjects,
    schoolId: exam.schoolId,
  });
  const created = res.data.data;
  inMemoryExams.push(created);
  return created;
};

export const createExamForClasses = async (
  baseExam: Omit<ExamSchedule, "id" | "createdAt" | "className">, 
  classes: string[]
): Promise<void> => {
  await apiClient.post("/exams", {
    title: baseExam.title,
    classes,
    startDate: baseExam.startDate,
    endDate: baseExam.endDate,
    status: baseExam.status,
    subjects: baseExam.subjects,
    schoolId: baseExam.schoolId,
  });
  await getExams(baseExam.schoolId);
};

export const updateExamPaperStatus = async (
  examId: string, 
  subjectId: string, 
  status: PaperStatus, 
  pdfUrl?: string | null,
  rejectionReason?: string,
  _schoolId?: string
): Promise<void> => {
  await apiClient.patch(`/exams/${examId}/subjects/${subjectId}/paper`, {
    paperStatus: status,
    paperPdfUrl: pdfUrl,
    rejectionReason,
  });

  const exam = inMemoryExams.find(e => e.id === examId);
  if (exam) {
    const subject = exam.subjects.find(s => s.id === subjectId);
    if (subject) {
      subject.paperStatus = status;
      if (pdfUrl !== undefined) subject.paperPdfUrl = pdfUrl;
      if (rejectionReason !== undefined) subject.rejectionReason = rejectionReason;
    }
  }
};

export const updateMarksStatus = async (
  examId: string,
  subjectId: string,
  marksUploaded: boolean,
  _schoolId?: string
): Promise<void> => {
  const exam = inMemoryExams.find(e => e.id === examId);
  if (exam) {
    const subject = exam.subjects.find(s => s.id === subjectId);
    if (subject) {
      subject.marksUploaded = marksUploaded;
    }
  }
};

export const saveExamMarks = async (
  examId: string,
  subjectId: string,
  marks: { studentId: string; marksObtained: number; maxMarks?: number; remarks?: string }[],
  schoolId?: string
): Promise<void> => {
  await apiClient.post(`/exams/${examId}/subjects/${subjectId}/marks`, {
    marks,
    schoolId,
  });
  await updateMarksStatus(examId, subjectId, true, schoolId);
};

export const getExamMarks = async (
  examId: string,
  subjectId: string,
  schoolId?: string
): Promise<any[]> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(
      `/exams/${examId}/subjects/${subjectId}/marks`,
      { params: { schoolId } }
    );
    return res.data.data;
  } catch (err) {
    console.error("Failed to load marks from DB", err);
    return [];
  }
};

export const getAdmitCards = async (_schoolId?: string): Promise<AdmitCard[]> => {
  return [];
};

export const generateAdmitCard = async (
  studentId: string,
  examId: string,
  rollNumber: string,
  _schoolId?: string
): Promise<AdmitCard> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: any }>(`/exams/${examId}/admit-card`);
    return {
      id: res.data.data.id || `ac_${Date.now()}`,
      studentId,
      examId,
      rollNumber,
      isGenerated: true,
    };
  } catch {
    return {
      id: `ac_${Date.now()}`,
      studentId,
      examId,
      rollNumber,
      isGenerated: true,
    };
  }
};

// ========= ADMIT CARD APPROVALS =========

export const getAdmitApprovals = async (examId?: string, schoolId?: string): Promise<AdmitCardApproval[]> => {
  if (examId) {
    try {
      const res = await apiClient.get<{ success: boolean; data: AdmitCardApproval[] }>(
        `/exams/${examId}/admit-card-approvals`,
        { params: { schoolId } }
      );
      inMemoryApprovals = res.data.data;
      return res.data.data;
    } catch (err) {
      console.error("Failed to load admit card approvals from DB", err);
    }
  }
  return inMemoryApprovals;
};

export const saveAdmitApprovals = (approvals: AdmitCardApproval[], _schoolId?: string) => {
  inMemoryApprovals = approvals;
};

export const toggleAdmitApproval = async (
  studentId: string,
  examId: string,
  approved: boolean,
  schoolId?: string
): Promise<void> => {
  await apiClient.patch(`/exams/${examId}/admit-card-approvals/${studentId}`, {
    approved,
    schoolId,
  });

  const existing = inMemoryApprovals.find(a => a.studentId === studentId && a.examId === examId);
  if (existing) {
    existing.approved = approved;
  } else {
    inMemoryApprovals.push({
      studentId,
      studentName: "",
      className: "",
      rollNumber: "",
      attendance: 0,
      feeDue: false,
      examId,
      approved,
    });
  }
};

export const isAdmitCardApproved = (studentId: string, examId: string, _schoolId?: string): boolean => {
  const record = inMemoryApprovals.find(a => a.studentId === studentId && a.examId === examId);
  return record?.approved ?? true;
};
