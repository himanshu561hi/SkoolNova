import apiClient from "@/lib/axios";

export type Period = { index: number; time: string; isLunch?: boolean };

export const DEFAULT_PERIODS: Period[] = [
  { index: 0, time: "09:00 AM - 09:45 AM" },
  { index: 1, time: "09:45 AM - 10:30 AM" },
  { index: 2, time: "10:30 AM - 11:15 AM" },
  { index: 3, time: "11:15 AM - 11:45 AM", isLunch: true },
  { index: 4, time: "11:45 AM - 12:30 PM" },
  { index: 5, time: "12:30 PM - 01:15 PM" },
];

/**
 * In-memory fallback cache (NO localStorage)
 */
let inMemoryPeriods: Record<string, Period[]> = {};

export const fetchPeriodsAsync = async (schoolId?: string): Promise<Period[]> => {
  const key = schoolId || "default";
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/academics/periods", {
      params: schoolId ? { schoolId } : {},
    });
    if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
      const mapped: Period[] = res.data.data.map((p: any) => ({
        index: p.index !== undefined ? p.index : p.periodIndex,
        time: p.time || `${p.startTime || ""} - ${p.endTime || ""}`,
        isLunch: Boolean(p.isLunch),
      }));
      inMemoryPeriods[key] = mapped;
      return mapped;
    }
    return inMemoryPeriods[key] || DEFAULT_PERIODS;
  } catch (err) {
    console.error("Failed to fetch periods from backend:", err);
    return inMemoryPeriods[key] || DEFAULT_PERIODS;
  }
};

/** Load periods from in-memory cache, fallback to defaults */
export const getStoredPeriods = (schoolId?: string): Period[] => {
  const key = schoolId || "default";
  if (inMemoryPeriods[key] && inMemoryPeriods[key].length > 0) {
    return inMemoryPeriods[key];
  }
  fetchPeriodsAsync(schoolId);
  return inMemoryPeriods[key] || DEFAULT_PERIODS;
};

export const savePeriodsAsync = async (periods: Period[], schoolId?: string): Promise<void> => {
  const key = schoolId || "default";
  inMemoryPeriods[key] = periods;
  try {
    await apiClient.put("/academics/periods", {
      periods: periods.map((p) => {
        const parts = p.time.split("-").map((s) => s.trim());
        return {
          index: p.index,
          startTime: parts[0] || "",
          endTime: parts[1] || "",
          isLunch: Boolean(p.isLunch),
        };
      }),
      schoolId,
    });
  } catch (err) {
    console.error("Failed to save periods to backend:", err);
  }
};

/** Parse a time string like "09:00 AM - 09:45 AM" → { startMin, endMin } */
const parseTimeRange = (timeStr: string): { startMin: number; endMin: number } | null => {
  const parts = timeStr.split("-").map(s => s.trim());
  if (parts.length < 2) return null;

  const toMin = (t: string): number => {
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  return { startMin: toMin(parts[0]), endMin: toMin(parts[1]) };
};

/** Get the period index that is currently active (within its time window) */
export const getCurrentPeriodIndex = (schoolId?: string): number => {
  const periods = getStoredPeriods(schoolId).filter(p => !p.isLunch);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const p of periods) {
    const range = parseTimeRange(p.time);
    if (range && nowMin >= range.startMin && nowMin <= range.endMin) {
      return p.index;
    }
  }
  return periods[0]?.index ?? 0;
};

/** Check if current time is at least 5 minutes into the given period */
export const isPeriodAvailableForAttendance = (periodIndex: number, schoolId?: string): boolean => {
  const periods = getStoredPeriods(schoolId);
  const period = periods.find(p => p.index === periodIndex);
  if (!period || period.isLunch) return false;

  const range = parseTimeRange(period.time);
  if (!range) return true;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= range.startMin + 5;
};

/** Get period display list for dropdowns (excludes lunch) */
export const getTeachingPeriods = (schoolId?: string): Period[] => {
  return getStoredPeriods(schoolId).filter(p => !p.isLunch);
};
