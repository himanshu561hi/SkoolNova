import apiClient from "@/lib/axios";

/**
 * In-memory fallback caches (NO localStorage)
 */
let inMemoryClasses: Record<string, string[]> = {};
let inMemoryClassSubjects: Record<string, Record<string, string[]>> = {};

export const getClassesAsync = async (schoolId?: string): Promise<string[]> => {
  const key = schoolId || "default";
  try {
    const res = await apiClient.get<{ success: boolean; data: any[] }>("/academics/classes", {
      params: schoolId ? { schoolId } : {},
    });
    const names = res.data.data.map((c: any) => c.name);
    inMemoryClasses[key] = names;
    return names;
  } catch (err) {
    console.error("Failed to fetch classes from backend:", err);
    return inMemoryClasses[key] || [];
  }
};

export const getClasses = (schoolId?: string): string[] => {
  const key = schoolId || "default";
  if (inMemoryClasses[key] && inMemoryClasses[key].length > 0) {
    return inMemoryClasses[key];
  }
  getClassesAsync(schoolId);
  return inMemoryClasses[key] || [];
};

export const saveClasses = async (classes: string[], schoolId?: string) => {
  const key = schoolId || "default";
  inMemoryClasses[key] = classes;
  for (const cls of classes) {
    try {
      await apiClient.post("/academics/classes", { name: cls, schoolId });
    } catch {}
  }
};

export const getClassSubjectsAsync = async (schoolId?: string): Promise<Record<string, string[]>> => {
  const key = schoolId || "default";
  try {
    const res = await apiClient.get<{ success: boolean; data: Record<string, string[]> }>(
      "/academics/class-subjects",
      { params: schoolId ? { schoolId } : {} }
    );
    const data = res.data.data || {};
    inMemoryClassSubjects[key] = data;
    return data;
  } catch (err) {
    console.error("Failed to fetch class subjects from backend:", err);
    return inMemoryClassSubjects[key] || {};
  }
};

export const getClassSubjects = (schoolId?: string): Record<string, string[]> => {
  const key = schoolId || "default";
  if (inMemoryClassSubjects[key] && Object.keys(inMemoryClassSubjects[key]).length > 0) {
    return inMemoryClassSubjects[key];
  }
  getClassSubjectsAsync(schoolId);
  return inMemoryClassSubjects[key] || {};
};

export const saveClassSubjects = async (mapping: Record<string, string[]>, schoolId?: string) => {
  const key = schoolId || "default";
  inMemoryClassSubjects[key] = mapping;
  for (const [className, subjects] of Object.entries(mapping)) {
    try {
      await apiClient.put(`/academics/class-subjects/${encodeURIComponent(className)}`, {
        subjects,
        schoolId,
      });
    } catch {}
  }
};
