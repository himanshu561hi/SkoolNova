import apiClient from "@/lib/axios";

export type SchoolEntry = {
  id: string;
  name: string;
  code?: string;
  managerEmail: string;
  managerName?: string;
  status: "ACTIVE" | "INACTIVE";
  studentsCount?: number;
  teachersCount?: number;
  classesCount?: number;
  createdAt: string;
};

export type CreateSchoolPayload = {
  schoolName: string;
  managerFirstName: string;
  managerLastName: string;
  managerEmail: string;
  managerPassword: string;
};

export const getSchools = async (searchQuery?: string): Promise<SchoolEntry[]> => {
  const res = await apiClient.get<{ success: boolean; data: SchoolEntry[] }>("/schools", {
    params: { q: searchQuery },
  });
  return res.data.data;
};

export const createSchool = async (payload: CreateSchoolPayload): Promise<SchoolEntry> => {
  const res = await apiClient.post<{ success: boolean; data: SchoolEntry }>("/schools", payload);
  return res.data.data;
};

export const updateSchoolStatus = async (
  schoolId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<void> => {
  await apiClient.patch(`/schools/${schoolId}/status`, { status });
};

export const requestDeleteSchoolOtp = async (schoolId: string): Promise<{ message: string }> => {
  const res = await apiClient.post<{ success: boolean; message: string }>(
    `/schools/${schoolId}/request-delete-otp`
  );
  return res.data;
};

export const deleteSchool = async (schoolId: string, otp: string): Promise<void> => {
  await apiClient.delete(`/schools/${schoolId}`, { data: { otp } });
};

