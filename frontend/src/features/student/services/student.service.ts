import apiClient from "@/lib/axios";
import type { Student } from "../types/student.types";

export async function getStudents(schoolId?: string): Promise<Student[]> {
  const res = await apiClient.get<{ success: boolean; data: Student[] }>("/students", {
    params: { schoolId },
  });
  return res.data.data;
}

export async function createStudent(student: Partial<Student>): Promise<Student> {
  const res = await apiClient.post<{ success: boolean; data: Student }>("/students", student);
  return res.data.data;
}

export async function updateStudent(student: Partial<Student> & { id: string }): Promise<Student> {
  const res = await apiClient.put<{ success: boolean; data: Student }>(`/students/${student.id}`, student);
  return res.data.data;
}

export async function deleteStudent(studentId: string): Promise<string> {
  await apiClient.delete(`/students/${studentId}`);
  return studentId;
}
