import apiClient from "@/lib/axios";

export type TimetableSlotResponse = {
  id: string;
  className: string;
  classId: string;
  day: string;
  periodIndex: number;
  periodId: string;
  periodTime: string;
  teacherId: string;
  teacherUserId?: string;
  teacherName: string;
  subject: string;
};

export const getTimetableSlots = async (
  schoolId?: string,
  className?: string,
  teacherId?: string
): Promise<TimetableSlotResponse[]> => {
  const res = await apiClient.get<{ success: boolean; data: TimetableSlotResponse[] }>(
    "/timetable/slots",
    { params: { schoolId, className, teacherId } }
  );
  return res.data.data;
};

export const assignTimetableSlot = async (payload: {
  className: string;
  day: string;
  periodIndex: number;
  teacherId: string;
  subject: string;
  schoolId?: string;
}): Promise<TimetableSlotResponse> => {
  const res = await apiClient.post<{ success: boolean; data: TimetableSlotResponse }>(
    "/timetable/slots",
    payload
  );
  return res.data.data;
};

export const deleteTimetableSlot = async (slotId: string): Promise<void> => {
  await apiClient.delete(`/timetable/slots/${slotId}`);
};

export const getTimetableSettings = async (schoolId?: string): Promise<{ allowTeachersEdit: boolean }> => {
  const res = await apiClient.get<{ success: boolean; data: { allowTeachersEdit: boolean } }>(
    "/timetable/settings",
    { params: { schoolId } }
  );
  return res.data.data;
};

export const updateTimetableSettings = async (
  allowTeachersEdit: boolean,
  schoolId?: string
): Promise<{ allowTeachersEdit: boolean }> => {
  const res = await apiClient.put<{ success: boolean; data: { allowTeachersEdit: boolean } }>(
    "/timetable/settings",
    { allowTeachersEdit, schoolId }
  );
  return res.data.data;
};

