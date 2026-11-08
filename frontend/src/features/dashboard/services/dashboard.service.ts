import apiClient from "@/lib/axios";
import type {
  AttendanceData,
  DashboardStat,
  RecentActivity,
} from "../types/dashboard.types";
import {
  managerStats,
  recentActivities,
} from "../constants/dashboardData";

/* ========================= */
/* GET STATS */
/* ========================= */

export async function getManagerStats(schoolId?: string): Promise<DashboardStat[]> {
  try {
    const res = await apiClient.get<{ success: boolean; data: DashboardStat[] }>("/dashboard/stats", {
      params: { schoolId },
    });
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch dashboard stats from API, fallback to default", err);
    return managerStats;
  }
}

/* ========================= */
/* GET ATTENDANCE DATA */
/* ========================= */

export async function getAttendanceData(
  role?: string,
  userId?: string,
  daysCount: number = 7,
  schoolId?: string
): Promise<AttendanceData[]> {
  try {
    const res = await apiClient.get<{ success: boolean; data: AttendanceData[] }>(
      "/dashboard/attendance-chart",
      {
        params: { days: daysCount, schoolId },
      }
    );
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch attendance chart from API", err);
    const days: AttendanceData[] = [];
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({ label, attendance: 0, teachers: 0 });
    }
    return days;
  }
}

/* ========================= */
/* GET RECENT ACTIVITIES */
/* ========================= */

export async function getRecentActivities(schoolId?: string): Promise<RecentActivity[]> {
  try {
    const res = await apiClient.get<{ success: boolean; data: RecentActivity[] }>("/dashboard/activities", {
      params: { schoolId },
    });
    return res.data.data;
  } catch (err) {
    console.error("Failed to fetch recent activities from API", err);
    return recentActivities;
  }
}
