import apiClient from "@/lib/axios";
import type { Assignment, AssignmentSubmission } from "../types/assignment.types";

let inMemoryAssignments: Assignment[] = [];
let inMemorySubmissions: AssignmentSubmission[] = [];

export const getAssignmentsAsync = async (schoolId?: string): Promise<Assignment[]> => {
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/assignments", {
      params: { schoolId },
    });
    const mapped: Assignment[] = res.data.data.map((a: any) => ({
      id: a.id,
      schoolId: a.schoolId,
      title: a.title,
      description: a.description,
      className: a.className,
      subject: a.subject,
      teacherId: a.teacherId,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      attachmentName: a.attachmentName,
      attachmentData: a.attachmentUrl,
    }));
    inMemoryAssignments = mapped;
    return mapped;
  } catch (err) {
    console.error("Failed to fetch assignments from DB", err);
    return schoolId ? inMemoryAssignments.filter(a => a.schoolId === schoolId) : inMemoryAssignments;
  }
};

export const getAssignments = (schoolId?: string): Assignment[] => {
  getAssignmentsAsync(schoolId);
  return schoolId ? inMemoryAssignments.filter(a => a.schoolId === schoolId) : inMemoryAssignments;
};

export const saveAssignment = async (assignment: Assignment): Promise<void> => {
  const res = await apiClient.post<{ success: boolean; data: any }>("/assignments", {
    title: assignment.title,
    description: assignment.description,
    className: assignment.className,
    subject: assignment.subject,
    dueDate: assignment.dueDate,
    attachmentName: assignment.attachmentName,
    attachmentUrl: assignment.attachmentData,
    schoolId: assignment.schoolId,
  });

  const created: Assignment = {
    ...assignment,
    id: res.data.data.id || assignment.id,
  };
  inMemoryAssignments.push(created);
};

export const deleteAssignment = async (id: string): Promise<void> => {
  await apiClient.delete(`/assignments/${id}`);
  inMemoryAssignments = inMemoryAssignments.filter(a => a.id !== id);
  inMemorySubmissions = inMemorySubmissions.filter(s => s.assignmentId !== id);
};

export const getSubmissionsAsync = async (assignmentId?: string): Promise<AssignmentSubmission[]> => {
  if (!assignmentId) return inMemorySubmissions;
  try {
    const res = await apiClient.get<{ success: boolean; data: { submissions: any[] } }>(`/assignments/${assignmentId}`);
    if (res.data.data?.submissions) {
      const mapped: AssignmentSubmission[] = res.data.data.submissions.map((s: any) => ({
        id: s.id,
        assignmentId,
        studentId: s.studentId,
        studentName: s.studentName,
        content: s.content || "",
        submittedAt: s.submittedAt,
        status: s.status,
        teacherRemarks: s.teacherRemarks,
        fileAttachmentName: s.attachmentName,
        fileAttachmentData: s.attachmentUrl,
      }));
      return mapped;
    }
  } catch (err) {
    console.error("Failed to load submissions from DB", err);
  }
  return inMemorySubmissions.filter(s => s.assignmentId === assignmentId);
};

export const getSubmissions = (): AssignmentSubmission[] => {
  return inMemorySubmissions;
};

export const saveSubmission = async (submission: AssignmentSubmission): Promise<void> => {
  if (submission.status === "GRADED") {
    await apiClient.patch(`/assignments/submissions/${submission.id}/grade`, {
      grade: (submission as any).grade || "A",
      teacherRemarks: submission.teacherRemarks,
      status: "GRADED",
    });
  } else {
    await apiClient.post(`/assignments/${submission.assignmentId}/submit`, {
      content: submission.content,
      attachmentName: submission.fileAttachmentName,
      attachmentUrl: submission.fileAttachmentData,
    });
  }

  const existingIndex = inMemorySubmissions.findIndex(s => s.id === submission.id);
  if (existingIndex >= 0) {
    inMemorySubmissions[existingIndex] = submission;
  } else {
    inMemorySubmissions.push(submission);
  }
};

export const initSubmissionsForAssignment = (
  assignmentId: string,
  students: { id: string; firstName: string; lastName: string }[]
) => {
  students.forEach(s => {
    inMemorySubmissions.push({
      id: `sub_${Date.now()}_${s.id}_${Math.random().toString(36).substr(2, 9)}`,
      assignmentId,
      studentId: s.id,
      studentName: `${s.firstName} ${s.lastName}`,
      content: "",
      submittedAt: null,
      status: "PENDING",
    });
  });
};
