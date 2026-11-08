import apiClient from "@/lib/axios";
import { LeaveApplication, LeaveStatus } from "../types/leave.types";

/**
 * In-memory fallback cache (NO localStorage) to keep state snappy during active sessions
 */
let inMemoryLeavesCache: Record<string, LeaveApplication[]> = {};

export const getLeavesAsync = async (
  schoolId?: string,
  filters?: { scope?: string; status?: string }
): Promise<LeaveApplication[]> => {
  const cacheKey = `${schoolId || "default"}_${filters?.scope || "all"}_${filters?.status || "all"}`;
  try {
    const res = await apiClient.get<{ success: boolean; data: LeaveApplication[] }>("/leaves", {
      params: { schoolId, ...filters },
    });
    const data = res.data.data || [];
    inMemoryLeavesCache[cacheKey] = data;
    return data;
  } catch (err) {
    console.error("Failed to fetch leaves from backend:", err);
    return inMemoryLeavesCache[cacheKey] || [];
  }
};

export const getLeaves = (
  schoolId?: string,
  filters?: { scope?: string; status?: string }
): LeaveApplication[] => {
  const cacheKey = `${schoolId || "default"}_${filters?.scope || "all"}_${filters?.status || "all"}`;
  getLeavesAsync(schoolId, filters);
  return inMemoryLeavesCache[cacheKey] || [];
};

export const saveLeaves = (leaves: LeaveApplication[], schoolId?: string) => {
  const cacheKey = `${schoolId || "default"}_all_all`;
  inMemoryLeavesCache[cacheKey] = leaves;
};

export const applyLeave = async (
  leave: Omit<LeaveApplication, "id" | "status" | "appliedOn">,
  schoolId?: string
): Promise<LeaveApplication> => {
  const res = await apiClient.post<{ success: boolean; data: LeaveApplication }>("/leaves", {
    subject: leave.subject,
    description: leave.description,
    startDate: leave.startDate,
    endDate: leave.endDate,
    documentUrl: leave.documentUrl || null,
    schoolId,
  });

  const created = res.data.data;
  // Refresh cache
  await getLeavesAsync(schoolId);
  return created;
};

export const updateLeaveStatus = async (
  id: string, 
  status: LeaveStatus, 
  remark: string, 
  _reviewerName: string,
  _remarkField: "teacherRemark" | "managerRemark",
  schoolId?: string
): Promise<void> => {
  await apiClient.patch(`/leaves/${id}/review`, {
    status,
    remark,
  }, {
    params: schoolId ? { schoolId } : {},
  });

  // Refresh cache
  await getLeavesAsync(schoolId);
};
