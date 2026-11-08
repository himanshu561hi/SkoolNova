import apiClient from "@/lib/axios";
import type { Teacher, CreateTeacherPayload, UpdateTeacherPayload } from "../types/teacher.types";

export const getTeachers = async (schoolId?: string): Promise<Teacher[]> => {
  const res = await apiClient.get<{ success: boolean; data: Teacher[] }>("/teachers", {
    params: { schoolId },
  });
  return res.data.data;
};

export const createTeacher = async (
  teacher: CreateTeacherPayload | Teacher
): Promise<Teacher> => {
  const res = await apiClient.post<{ success: boolean; data: Teacher }>("/teachers", teacher);
  return res.data.data;
};

export const updateTeacher = async (
  teacher: Teacher | UpdateTeacherPayload
): Promise<Teacher> => {
  const res = await apiClient.put<{ success: boolean; data: Teacher }>(
    `/teachers/${teacher.id}`,
    teacher
  );
  return res.data.data;
};

export const deleteTeacher = async (teacherId: string): Promise<void> => {
  await apiClient.delete(`/teachers/${teacherId}`);
};
