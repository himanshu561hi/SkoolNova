import { useState, useEffect } from "react";
import { getTeachers, updateTeacher } from "@/features/teacher/services/teacher.service";
import { getStudents } from "@/features/student/services/student.service";
import type { Teacher } from "@/features/teacher/types/teacher.types";
import { toast } from "sonner";
import { BookOpen, CalendarDays, Settings2, Plus, Trash2, GripVertical, Clock, ChevronUp, ChevronDown, ExternalLink, Minimize2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getClassSubjects } from "@/features/student/services/class-subjects.service";
import {
  getTimetableSlots,
  assignTimetableSlot,
  deleteTimetableSlot,
  getTimetableSettings,
  updateTimetableSettings,
} from "../services/timetable.service";
import { fetchPeriodsAsync, savePeriodsAsync, DEFAULT_PERIODS, Period } from "../utils/periods.utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Time conversion helpers
const formatTo24 = (t12: string) => {
  if (!t12) return "";
  const parts = t12.trim().split(" ");
  if (parts.length !== 2) return "";
  let [hours, minutes] = parts[0].split(":");
  if (!hours || !minutes) return "";
  let h = parseInt(hours, 10);
  if (parts[1].toUpperCase() === 'PM' && h < 12) h += 12;
  if (parts[1].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${minutes}`;
};

const formatTo12 = (t24: string) => {
  if (!t24) return "";
  let [hours, minutes] = t24.split(":");
  if (!hours || !minutes) return "";
  let h = parseInt(hours, 10);
  const modifier = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, '0')}:${minutes} ${modifier}`;
};

const parseTimeString = (timeStr: string) => {
  if (!timeStr) return { start: "", end: "" };
  const parts = timeStr.split(" - ");
  if (parts.length !== 2) return { start: "", end: "" };
  return { start: formatTo24(parts[0]), end: formatTo24(parts[1]) };
};

export type TimetableEntry = {
  id: string;
  className: string;
  day: string;
  periodIndex: number;
  teacherId: string;
  subject?: string;
};

export default function TimetablePage() {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER" || user?.role === "SCHOOL_MANAGER";
  

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [draggedTeacherData, setDraggedTeacherData] = useState<{id: string, subject: string} | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showTeachers, setShowTeachers] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [autoAssignCoordinator, setAutoAssignCoordinator] = useState(false);
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 50, y: 50 });
  const [globalAllowTeachersEdit, setGlobalAllowTeachersEdit] = useState(false);

  const isCurrentClassTeacher = Boolean(teachers.find(t => t.id === user?.id)?.coordinatorFor?.includes(selectedClass));
  const canEdit = isManager || (globalAllowTeachersEdit && isCurrentClassTeacher);

  // Mobile UI State
  const [selectedMobileDay, setSelectedMobileDay] = useState(DAYS[0]);
  const [mobileAssignModal, setMobileAssignModal] = useState<{ isOpen: boolean; periodIndex: number | null }>({ isOpen: false, periodIndex: null });

  // Periods State
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isEditingPeriods, setIsEditingPeriods] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [tempPeriods, setTempPeriods] = useState<Period[]>([]);
  const [draggedPeriodIndex, setDraggedPeriodIndex] = useState<number | null>(null);

  useEffect(() => {
    setPopupPos({ x: window.innerWidth - 360, y: window.innerHeight - 440 });
  }, []);

  useEffect(() => {
    // Fetch Teachers
    getTeachers(user?.schoolId).then(t => setTeachers(t.filter(x => x.status !== "INACTIVE")));
    
    // Fetch Students to get active classes
    getStudents(user?.schoolId).then(students => {
      const classes = Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort();
      setAvailableClasses(classes);
      
      const role = useAuthStore.getState().user?.role;
      const meId = useAuthStore.getState().user?.id;
      
      if (role === "STUDENT" && meId) {
        const me = students.find(s => s.id === meId);
        if (me) {
          setSelectedClass(me.className);
        } else if (classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      } else if (classes.length > 0) {
        setSelectedClass(classes[0]);
      }
    });

    const schoolId = useAuthStore.getState().user?.schoolId;

    // Load Timetable Settings from DB
    getTimetableSettings(schoolId)
      .then(settings => {
        if (settings?.allowTeachersEdit !== undefined) {
          setGlobalAllowTeachersEdit(settings.allowTeachersEdit);
        }
      })
      .catch(() => {});

    // Load Timetable Slots from DB
    getTimetableSlots(schoolId)
      .then(slots => {
        if (slots && Array.isArray(slots)) {
          setEntries(slots.map(s => ({
            id: s.id,
            className: s.className,
            day: s.day,
            periodIndex: s.periodIndex,
            teacherId: s.teacherId,
            subject: s.subject,
          })));
          if (slots.length > 0) {
            setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      })
      .catch(() => {});

    // Load Periods from DB
    fetchPeriodsAsync(schoolId)
      .then(p => {
        if (p && p.length > 0) {
          setPeriods(p);
        } else {
          setPeriods(DEFAULT_PERIODS);
        }
      })
      .catch(() => {
        setPeriods(DEFAULT_PERIODS);
      });
  }, []);

  const handleAssignCoordinator = async (teacherId: string) => {
    if (!selectedClass) return;
    
    // Remove selectedClass from any existing coordinator
    const currentCoordinator = teachers.find(t => t.coordinatorFor?.includes(selectedClass));
    if (currentCoordinator && currentCoordinator.id !== teacherId) {
      const updatedCoords = (currentCoordinator.coordinatorFor || []).filter(c => c !== selectedClass);
      await updateTeacher({ ...currentCoordinator, coordinatorFor: updatedCoords });
    }
    
    if (teacherId) {
      // Assign to new teacher
      const newCoordinator = teachers.find(t => t.id === teacherId);
      if (newCoordinator) {
        const updatedCoords = [...(newCoordinator.coordinatorFor || []), selectedClass];
        await updateTeacher({ ...newCoordinator, coordinatorFor: updatedCoords });
      }
    }
    
    toast.success(`Class Teacher updated for Class ${selectedClass}`);
    
    // Refresh teachers
    const t = await getTeachers(user?.schoolId);
    setTeachers(t.filter(x => x.status !== "INACTIVE"));
  };

  const teacherSubjects = teachers.flatMap(teacher => {
    let subjects: string[] = [];
    if (Array.isArray(teacher.subject)) {
      subjects = teacher.subject;
    } else if (typeof teacher.subject === 'string') {
      subjects = teacher.subject.split(",").map(s => s.trim()).filter(Boolean);
    }
    
    return subjects.map(sub => ({
      teacher,
      subject: sub,
      id: `${teacher.id}-${sub}`
    }));
  }).filter(ts => {
    if (!selectedClass) return true;
    const allowed = (getClassSubjects(user?.schoolId)[selectedClass] || []).map(s => s.toLowerCase());
    return allowed.includes(ts.subject.toLowerCase());
  });

  const handleDragStart = (teacherId: string, subject: string) => {
    setDraggedTeacherData({ id: teacherId, subject });
  };


  const handleDrop = async (day: string, periodIndex: number) => {
    if (!canEdit || !draggedTeacherData) return;
    
    // CONFLICT CHECK: Is this teacher already assigned to another class at the exact same time?
    const conflict = entries.find(e => 
      e.teacherId === draggedTeacherData.id && 
      e.day === day && 
      e.periodIndex === periodIndex && 
      e.className !== selectedClass
    );

    if (conflict) {
      toast.error(`Conflict! Teacher is already assigned to Class ${conflict.className} at this time.`);
      setDraggedTeacherData(null);
      return;
    }

    const schoolId = useAuthStore.getState().user?.schoolId;
    try {
      const savedSlot = await assignTimetableSlot({
        className: selectedClass,
        day,
        periodIndex,
        teacherId: draggedTeacherData.id,
        subject: draggedTeacherData.subject || "",
        schoolId,
      });

      const newEntry: TimetableEntry = {
        id: savedSlot.id,
        className: selectedClass,
        day,
        periodIndex,
        teacherId: draggedTeacherData.id,
        subject: draggedTeacherData.subject,
      };
      
      const newEntries = entries.filter(e => !(e.className === selectedClass && e.day === day && e.periodIndex === periodIndex));
      newEntries.push(newEntry);
      setEntries(newEntries);
      
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(now);
      toast.success("Teacher assigned to slot!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign teacher to slot");
    } finally {
      setDraggedTeacherData(null);
    }
  };

  const handleMobileAssignTeacher = async (teacherId: string, subject: string) => {
    if (!canEdit || mobileAssignModal.periodIndex === null) return;
    
    const day = selectedMobileDay;
    const periodIndex = mobileAssignModal.periodIndex;

    const conflict = entries.find(e => 
      e.teacherId === teacherId && 
      e.day === day && 
      e.periodIndex === periodIndex && 
      e.className !== selectedClass
    );

    if (conflict) {
      toast.error(`Conflict! Teacher is already assigned to Class ${conflict.className} at this time.`);
      return;
    }

    const schoolId2 = useAuthStore.getState().user?.schoolId;
    try {
      const savedSlot = await assignTimetableSlot({
        className: selectedClass,
        day,
        periodIndex,
        teacherId,
        subject,
        schoolId: schoolId2,
      });

      const newEntry: TimetableEntry = {
        id: savedSlot.id,
        className: selectedClass,
        day,
        periodIndex,
        teacherId,
        subject,
      };
      
      const newEntries = entries.filter(e => !(e.className === selectedClass && e.day === day && e.periodIndex === periodIndex));
      newEntries.push(newEntry);
      setEntries(newEntries);
      
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastUpdated(now);
      toast.success("Teacher assigned to slot!");
      setMobileAssignModal({ isOpen: false, periodIndex: null });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign teacher to slot");
    }
  };

  const removeEntry = async (id: string) => {
    try {
      await deleteTimetableSlot(id);
    } catch (err) {
      console.warn("Could not delete slot from DB", err);
    }
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUpdated(now);
    toast.info("Slot cleared");
  };

  const openPeriodsEditor = () => {
    setTempPeriods([...periods]);
    setIsEditingPeriods(true);
  };

  const savePeriods = async () => {
    setPeriods(tempPeriods);
    await savePeriodsAsync(tempPeriods, user?.schoolId);
    setIsEditingPeriods(false);
    toast.success("Timings updated successfully!");
  };

  const addTempPeriod = () => {
    const newIndex = tempPeriods.length > 0 ? Math.max(...tempPeriods.map(p => p.index)) + 1 : 0;
    setTempPeriods([...tempPeriods, { index: newIndex, time: "12:00 PM - 01:00 PM" }]);
  };

  const removeTempPeriod = (index: number) => {
    setTempPeriods(tempPeriods.filter(p => p.index !== index));
  };

  const updateTempPeriodTime = (index: number, newTime: string) => {
    setTempPeriods(tempPeriods.map(p => p.index === index ? { ...p, time: newTime } : p));
  };

  // Period Drag & Drop Handlers
  const handlePeriodDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPeriodIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handlePeriodDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedPeriodIndex === null || draggedPeriodIndex === dropIndex) return;

    const newTemp = [...tempPeriods];
    const draggedItem = newTemp.find(p => p.index === draggedPeriodIndex);
    if (!draggedItem) return;

    const filtered = newTemp.filter(p => p.index !== draggedPeriodIndex);
    const visualDropIndex = filtered.findIndex(p => p.index === dropIndex);
    
    filtered.splice(visualDropIndex >= 0 ? visualDropIndex : filtered.length, 0, draggedItem);
    
    setTempPeriods(filtered);
    setDraggedPeriodIndex(null);
  };

  const handlePopupPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Ignore button clicks
    
    e.preventDefault(); // Prevent text selection while dragging
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = popupPos.x;
    const startPosY = popupPos.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setPopupPos({
        x: startPosX + (moveEvent.clientX - startX),
        y: startPosY + (moveEvent.clientY - startY),
      });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <span>{canEdit ? "Class Timetable Builder" : "Class Timetable"}</span>
          </h1>
          <div className="flex flex-col gap-3 mt-3">
            <p className="text-sm font-medium text-slate-500">
              {canEdit 
                ? "Drag and drop teachers to build the class schedule." 
                : "View the weekly timetable and schedule for all classes."}
            </p>
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                <Clock className="h-4 w-4" />
                Last Saved: {lastUpdated}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-start lg:items-end gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {isManager && (
            <div className="flex flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={openPeriodsEditor}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 sm:px-5 py-3 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-sm active:scale-[0.98]"
              >
                <Settings2 className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">Edit Timings</span>
              </button>
              
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 sm:gap-2 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 px-3 sm:px-5 py-3 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm hover:bg-rose-100 dark:hover:bg-rose-900/20 transition shadow-sm active:scale-[0.98]"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span className="truncate">Reset All</span>
              </button>
            </div>
          )}

          <div className="relative w-full sm:w-auto sm:min-w-[140px]">
            <select 
              className="w-full appearance-none bg-primary text-white border-none rounded-xl px-5 py-3 sm:py-2.5 pr-10 font-bold text-sm outline-none focus:ring-4 focus:ring-primary/20 shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition"
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              disabled={availableClasses.length === 0 || user?.role === "STUDENT"}
            >
              {availableClasses.length > 0 ? (
                availableClasses.map(c => <option key={c} value={c} className="bg-slate-800">Class {c}</option>)
              ) : (
                <option value="" className="bg-slate-800">No Classes</option>
              )}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary-50">
              ▼
            </div>
          </div>
        </div>
          

          
        {isManager && selectedClass && (
          <div className="mt-4 xl:mt-0 w-full xl:w-auto">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 xl:p-3 space-y-3 xl:space-y-0 xl:flex xl:items-center xl:gap-4">
              {/* Checkbox Row */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`relative w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${globalAllowTeachersEdit ? 'bg-primary border-primary shadow-sm shadow-primary/30' : 'border-slate-300 dark:border-slate-600 group-hover:border-primary/50'}`}>
                  {globalAllowTeachersEdit && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={globalAllowTeachersEdit}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setGlobalAllowTeachersEdit(checked);
                    try {
                      await updateTimetableSettings(checked, user?.schoolId);
                      toast.success(checked ? "Class teachers can now manage their timetables" : "Class teacher management disabled");
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || "Failed to update settings");
                    }
                  }}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 select-none">Managed by class teacher</span>
              </label>

              {/* Separator */}
              <div className="hidden xl:block w-px h-6 bg-slate-300 dark:bg-slate-600" />
              <div className="xl:hidden border-t border-slate-200 dark:border-slate-700" />

              {/* Class Teacher Dropdown */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Class Teacher</span>
                <select
                  className="flex-1 xl:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}
                  value={teachers.find(t => t.coordinatorFor?.includes(selectedClass))?.id || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedTeacherId(id);
                    if (id) {
                      handleAssignCoordinator(id);
                    }
                  }}
                >
                  <option value="">-- Select Teacher --</option>
                  {Array.from(new Map(teacherSubjects.map(ts => [ts.teacher.id, ts.teacher])).values()).map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* TEACHER HORIZONTAL LIST (ONLY FOR MANAGER) */}
        {canEdit && (
          <div className="flex flex-col gap-4">
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ${isPoppedOut ? 'hidden xl:block opacity-50' : ''}`}>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center cursor-pointer" onClick={() => !isPoppedOut && setShowTeachers(!showTeachers)}>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                {isPoppedOut ? 'Teachers (Popped Out)' : 'Available Teachers (Drag to timetable)'}
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full text-xs">{teachers.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                {!isPoppedOut && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsPoppedOut(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-primary transition-colors"
                    title="Pop out as floating window"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                )}
                {!isPoppedOut && (
                  <button 
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    title={showTeachers ? "Minimize Teachers Panel" : "Expand Teachers Panel"}
                  >
                    {showTeachers ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                )}
              </div>
            </div>
            {!isPoppedOut && showTeachers && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[320px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
              {teacherSubjects.map(ts => (
                <div 
                  key={ts.id}
                  draggable
                  onDragStart={() => handleDragStart(ts.teacher.id, ts.subject)}
                  onDragEnd={() => setDraggedTeacherData(null)}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-grab active:cursor-grabbing hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-all"
                >
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                    {ts.teacher.fullName.charAt(0)}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{ts.teacher.fullName}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate uppercase tracking-wider mt-0.5">{ts.subject}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
                </div>
              ))}
              {teacherSubjects.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 w-full text-center opacity-50">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Teachers Found</p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
        )}

        {/* DESKTOP TIMETABLE GRID */}
        <div className="hidden lg:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="bg-slate-100 dark:bg-slate-800/50 p-4 border-b border-r border-slate-300 dark:border-slate-800 w-[140px] sticky left-0 z-10 backdrop-blur-md">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Time Slot</span>
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="bg-slate-100 dark:bg-slate-800/50 p-4 border-b border-slate-300 dark:border-slate-800 text-center w-[16%]">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, idx) => {
                  const isLastRow = idx === periods.length - 1;
                  return (
                  <tr key={period.index}>
                    {/* Time Column */}
                    <td className={`p-4 border-r border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky left-0 z-10 ${!isLastRow ? 'border-b border-slate-300 dark:border-slate-800' : ''}`}>
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Period {idx + 1}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 whitespace-nowrap">{period.time}</span>
                      </div>
                    </td>

                    {period.isLunch ? (
                      /* Lunch Row */
                      <td colSpan={DAYS.length} className={`p-0 ${!isLastRow ? 'border-b border-slate-300 dark:border-slate-800' : ''} bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.06)_10px,rgba(245,158,11,0.06)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.05)_10px,rgba(245,158,11,0.05)_20px)]`}>
                        <div className="flex items-center justify-center py-4">
                          <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm border border-amber-200 dark:border-amber-500/20">
                            <span>🍽️</span> LUNCH BREAK
                          </div>
                        </div>
                      </td>
                    ) : !selectedClass ? (
                       /* No Class Selected */
                       <td colSpan={DAYS.length} className={`p-8 text-center text-sm font-medium text-slate-500 ${!isLastRow ? 'border-b border-slate-300 dark:border-slate-800' : ''}`}>
                         Select a class above to manage its timetable.
                       </td>
                    ) : (
                      /* Droppable Days */
                      DAYS.map(day => {
                        const entry = entries.find(e => e.className === selectedClass && e.day === day && e.periodIndex === period.index);
                        const teacher = entry ? teachers.find(t => t.id === entry.teacherId) : null;
                        
                        // Constraint Logic
                        const isDraggedTeacherBusyHere = draggedTeacherData 
                          ? entries.some(e => e.teacherId === draggedTeacherData.id && e.day === day && e.periodIndex === period.index && e.className !== selectedClass)
                          : false;
                        
                        return (
                          <td 
                            key={`${day}-${period.index}`} 
                            className={`p-3 relative group align-top ${!isLastRow ? 'border-b border-slate-300 dark:border-slate-800' : ''} border-r border-slate-300 dark:border-slate-800 last:border-r-0 ${isDraggedTeacherBusyHere ? 'bg-rose-50/60 dark:bg-rose-900/10 cursor-not-allowed' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors'}`}
                            onDragOver={(e) => {
                              if (!isDraggedTeacherBusyHere) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "copy";
                              }
                            }}
                            onDrop={() => {
                              if (!isDraggedTeacherBusyHere) handleDrop(day, period.index);
                            }}
                          >
                            <div className={`h-[72px] w-full rounded-xl transition-all flex flex-col items-center justify-center relative p-1.5 ${
                              draggedTeacherData && !isDraggedTeacherBusyHere ? 'border-2 border-primary border-dashed bg-primary/5 shadow-inner' : 
                              isDraggedTeacherBusyHere ? 'border-2 border-rose-300 border-dashed dark:border-rose-800/50' : 
                              teacher ? 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-primary/50' : 
                              'border border-slate-300 border-dashed dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30'
                            }`}>
                              
                              {isDraggedTeacherBusyHere ? (
                                <div className="flex flex-col items-center gap-1 opacity-70">
                                  <div className="h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                                    <span className="text-[10px]">🚫</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest text-center leading-tight">Teacher<br/>Busy</span>
                                </div>
                              ) : teacher ? (
                                <>
                                  {canEdit && (
                                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1.5 -translate-y-1.5">
                                      <button 
                                        onClick={() => removeEntry(entry!.id)}
                                        className="bg-white dark:bg-slate-800 text-rose-500 hover:bg-rose-500 hover:text-white rounded-full p-1 shadow-md border border-slate-200 dark:border-slate-700 transition-all"
                                        title="Remove from slot"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  )}
                                  
                                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] mb-1">
                                    {teacher.fullName.charAt(0)}
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center px-1 leading-tight">{teacher.fullName}</div>
                                  <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5 w-full text-center truncate px-1 flex items-center justify-center gap-1">
                                    <BookOpen className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{entry!.subject || teacher.subject}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="text-xs font-medium text-slate-400 dark:text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity">
                                  Drop Teacher
                                </div>
                              )}
                              
                            </div>
                          </td>
                        );
                      })
                    )}
                  </tr>
                )})}
                {periods.length === 0 && (
                  <tr>
                    <td colSpan={DAYS.length + 1} className="text-center p-12">
                      <div className="inline-flex flex-col items-center justify-center text-slate-400">
                        <Settings2 className="h-8 w-8 mb-3 opacity-50" />
                        <span className="text-sm font-medium">No time slots configured. Click "Edit Timings" to set up the day.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE TIMETABLE */}
        <div className="block lg:hidden flex-col gap-4">
          {/* Mobile Day Selector */}
          <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedMobileDay(day)}
                className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                  selectedMobileDay === day
                    ? "bg-primary text-white ring-2 ring-primary/30"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Mobile Period List */}
          <div className="flex flex-col gap-3 mt-4">
            {!selectedClass ? (
              <div className="bg-white dark:bg-slate-800 p-8 text-center text-sm font-medium text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                Select a class above to manage its timetable.
              </div>
            ) : periods.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 p-8 text-center text-sm font-medium text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                No time slots configured.
              </div>
            ) : (
              periods.map((period, idx) => {
                const entry = entries.find(e => e.className === selectedClass && e.day === selectedMobileDay && e.periodIndex === period.index);
                const teacher = entry ? teachers.find(t => t.id === entry.teacherId) : null;

                if (period.isLunch) {
                  return (
                    <div key={period.index} className="flex items-center gap-3 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.06)_10px,rgba(245,158,11,0.06)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(245,158,11,0.05)_10px,rgba(245,158,11,0.05)_20px)] border border-amber-200/50 dark:border-amber-500/20 rounded-xl p-4 shadow-sm">
                      <div className="flex-1 text-center">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest flex items-center justify-center gap-2">
                          <span>🍽️</span> LUNCH BREAK
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">{period.time}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={period.index} className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    {/* Period Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Period {idx + 1}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{period.time}</span>
                    </div>
                    {/* Period Body */}
                    <div className="p-4 flex items-center justify-between min-h-[80px]">
                      {teacher ? (
                        <>
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-sm">
                              {teacher.fullName.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{teacher.fullName}</p>
                              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 uppercase mt-0.5">
                                <BookOpen className="h-3 w-3 shrink-0" />
                                <span className="truncate">{entry!.subject || teacher.subject}</span>
                              </div>
                            </div>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => removeEntry(entry!.id)}
                              className="shrink-0 ml-3 p-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/30"
                              title="Remove Assignment"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          {canEdit ? (
                            <button
                              onClick={() => setMobileAssignModal({ isOpen: true, periodIndex: period.index })}
                              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="h-4 w-4" /> Assign Teacher
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-slate-400 italic">Unassigned</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* EDIT PERIODS MODAL */}
      <Modal 
        isOpen={isEditingPeriods} 
        onClose={() => setIsEditingPeriods(false)} 
        title="Manage Class Timings"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
          <p className="text-sm font-medium text-slate-500 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
            💡 Add, remove, or edit time slots. Drag rows to reorder them globally.
          </p>
          
          <div className="space-y-3">
            {tempPeriods.map((p, i) => {
              const { start, end } = parseTimeString(p.time);
              return (
              <div 
                key={p.index} 
                draggable
                onDragStart={(e) => handlePeriodDragStart(e, p.index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handlePeriodDrop(e, p.index)}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 sm:p-2.5 border ${draggedPeriodIndex === p.index ? 'border-primary opacity-50 scale-[0.98]' : 'border-slate-200 dark:border-slate-700'} rounded-xl bg-white dark:bg-slate-800 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all`}
              >
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-slate-300 hover:text-slate-500 transition cursor-grab sm:pl-1">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-lg shrink-0 w-[52px] text-center">
                      P-{i + 1}
                    </div>
                  </div>
                  {/* Mobile delete button */}
                  <button 
                    onClick={() => removeTempPeriod(p.index)}
                    className="sm:hidden p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition shrink-0 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                    title="Remove Slot"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-1 w-full">
                    <input 
                      type="time" 
                      value={start}
                      onChange={(e) => updateTempPeriodTime(p.index, `${formatTo12(e.target.value)} - ${formatTo12(end)}`)}
                      className="w-full flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                    />
                    <span className="text-slate-400 font-medium text-xs">to</span>
                    <input 
                      type="time" 
                      value={end}
                      onChange={(e) => updateTempPeriodTime(p.index, `${formatTo12(start)} - ${formatTo12(e.target.value)}`)}
                      className="w-full flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg px-2 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                    />
                  </div>
                  <select 
                    value={p.isLunch ? "yes" : "no"}
                    onChange={(e) => setTempPeriods(tempPeriods.map(x => x.index === p.index ? { ...x, isLunch: e.target.value === "yes" } : x))}
                    className="w-full sm:w-[130px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none shrink-0 transition-all cursor-pointer"
                  >
                    <option value="no">Class Slot</option>
                    <option value="yes">Lunch Break</option>
                  </select>
                </div>

                {/* Desktop delete button */}
                <button 
                  onClick={() => removeTempPeriod(p.index)}
                  className="hidden sm:flex p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition shrink-0 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
                  title="Remove Slot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )})}
          </div>

          <button 
            onClick={addTempPeriod}
            className="w-full mt-4 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 rounded-xl py-4 text-sm font-bold transition-all"
          >
            <Plus className="h-5 w-5" />
            Add New Time Slot
          </button>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button 
            type="button" 
            className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition" 
            onClick={() => setIsEditingPeriods(false)}
          >
            Cancel
          </button>
          <button 
            className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:opacity-90 transition shadow-sm shadow-primary/20"
            onClick={savePeriods}
          >
            Save Timings
          </button>
        </div>
      </Modal>

      {/* CONFIRM RESET MODAL */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={async () => {
          for (const entry of entries) {
            try {
              await deleteTimetableSlot(entry.id);
            } catch {}
          }
          setEntries([]);
          setLastUpdated(null);
          setIsResetModalOpen(false);
          toast.success("Timetable cleared successfully!");
        }}
        title="Reset Timetable"
        message="Are you sure you want to completely clear the global timetable for all classes? This action cannot be undone."
        confirmText="Yes, Reset All"
      />

      {/* FLOATING TEACHER WINDOW */}
      {canEdit && isPoppedOut && (
        <div 
          className="fixed w-80 bg-white dark:bg-slate-900 rounded-2xl border border-primary/30 dark:border-primary/50 shadow-2xl z-50 flex flex-col h-[400px] overflow-hidden animate-in fade-in"
          style={{ top: `${popupPos.y}px`, left: `${popupPos.x}px` }}
        >
          <div 
            className="bg-primary/5 dark:bg-slate-800/80 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm cursor-move select-none"
            onPointerDown={handlePopupPointerDown}
          >
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Teachers (Drag)
            </h2>
            <button 
              onClick={() => setIsPoppedOut(false)}
              className="p-1.5 rounded-md hover:bg-primary/20 hover:text-primary dark:hover:bg-slate-700 text-slate-600 transition-colors bg-white dark:bg-slate-800 shadow-sm cursor-pointer"
              title="Return to top"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
            {teacherSubjects.map(ts => (
              <div 
                key={ts.id}
                draggable
                onDragStart={() => handleDragStart(ts.teacher.id, ts.subject)}
                onDragEnd={() => setDraggedTeacherData(null)}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-primary/50 dark:border-slate-700 dark:hover:border-primary/50 bg-white dark:bg-slate-800 cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
              >
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {ts.teacher.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{ts.teacher.fullName}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate uppercase tracking-wider mt-0.5">{ts.subject}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            ))}
            {teachers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 w-full text-center opacity-50">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Teachers Found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MOBILE ASSIGN TEACHER MODAL */}
      <Modal
        isOpen={mobileAssignModal.isOpen}
        onClose={() => setMobileAssignModal({ isOpen: false, periodIndex: null })}
        title={`Assign Teacher (${selectedMobileDay})`}
      >
        <div className="p-1 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {teacherSubjects.length === 0 ? (
            <div className="text-center py-10 text-slate-500">No Teachers Available</div>
          ) : (
            teacherSubjects.map(ts => (
              <button
                key={ts.id}
                onClick={() => handleMobileAssignTeacher(ts.teacher.id, ts.subject)}
                className="w-full flex items-center text-left gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-all"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
                  {ts.teacher.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{ts.teacher.fullName}</p>
                  <p className="text-xs font-medium text-slate-500 truncate uppercase tracking-wider mt-0.5">{ts.subject}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>

    </div>
  );
}
