import { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  GraduationCap,
  Calendar,
  Phone,
  Lock,
} from "lucide-react";

import type {
  UseFormHandleSubmit,
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { toast } from "sonner";

import Input from "@/components/ui/Input";
import FormError from "@/components/ui/FormError";
import ModalActions from "@/components/ui/ModalAction";

import type { TeacherFormValues } from "../schemas/teacherSchema";
import { getClassSubjectsAsync } from "@/features/student/services/class-subjects.service";
import { useAuthStore } from "@/features/auth/store/authStore";

const DEFAULT_SUBJECTS = [
  "English", "Hindi", "Mathematics", "Science", "Social Science",
  "Physics", "Chemistry", "Biology", "Computer Science",
  "Accountancy", "Business Studies", "Economics", "History", "Geography",
  "Physical Education", "Art & Craft", "EVS", "Moral Science", "Music", "Sanskrit"
];

type TeacherFormProps = {
  register: UseFormRegister<TeacherFormValues>;
  errors: FieldErrors<TeacherFormValues>;
  handleSubmit: UseFormHandleSubmit<TeacherFormValues, any>;
  watch: UseFormWatch<TeacherFormValues>;
  setValue: UseFormSetValue<TeacherFormValues>;
  onSubmit: (values: TeacherFormValues) => void;
  onCancel: () => void;
  isEditing: boolean;
};

/* ─── section divider ─── */
function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="col-span-1 sm:col-span-2 flex items-center gap-2 pt-2 pb-1">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </h3>
      <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
    </div>
  );
}

function TeacherForm({
  register,
  errors,
  handleSubmit,
  watch,
  setValue,
  onSubmit,
  onCancel,
  isEditing,
}: TeacherFormProps) {
  const { user } = useAuthStore();
  const [availableSubjects, setAvailableSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
  const [customSubjectInput, setCustomSubjectInput] = useState("");

  useEffect(() => {
    const loadSubjects = async () => {
      const allSubjects = new Set<string>(DEFAULT_SUBJECTS);
      try {
        const subjectsMap = await getClassSubjectsAsync(user?.schoolId);
        Object.values(subjectsMap).forEach((subs) => {
          if (Array.isArray(subs)) {
            subs.forEach((s) => allSubjects.add(s.trim()));
          }
        });
      } catch (err) {
        console.warn("Could not load class subjects from DB, using defaults", err);
      }
      setAvailableSubjects(Array.from(allSubjects).filter(Boolean).sort());
    };

    loadSubjects();
  }, [user?.schoolId]);

  const rawSubject = watch("subject") || "";
  let selectedSubjects: string[] = [];
  if (Array.isArray(rawSubject)) {
    selectedSubjects = rawSubject;
  } else if (typeof rawSubject === "string") {
    selectedSubjects = rawSubject
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setValue(
        "subject",
        selectedSubjects.filter((s) => s !== sub).join(", "),
        { shouldValidate: true },
      );
    } else {
      if (selectedSubjects.length >= 5) {
        toast.error("You can select up to 5 subjects only.");
        return;
      }
      setValue("subject", [...selectedSubjects, sub].join(", "), {
        shouldValidate: true,
      });
    }
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (!trimmed) return;
    if (!availableSubjects.includes(trimmed)) {
      setAvailableSubjects(prev => [trimmed, ...prev].sort());
    }
    toggleSubject(trimmed);
    setCustomSubjectInput("");
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
        {/* ═══════ PERSONAL INFO ═══════ */}
        <SectionLabel icon={User} label="Personal Information" />

        <div>
          <Input
            label="Full Name"
            placeholder="e.g. Aditi Sharma"
            {...register("fullName")}
          />
          <FormError message={errors.fullName?.message} />
        </div>

        <div>
          <Input
            label="Email"
            type="email"
            placeholder="teacher@example.com"
            {...register("email")}
          />
          <FormError message={errors.email?.message} />
        </div>

        <div>
          <Input
            label="Phone"
            type="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
          <FormError message={errors.phone?.message} />
        </div>

        {/* ═══════ WORK & DEPARTMENT ═══════ */}
        <SectionLabel icon={Briefcase} label="Work & Department" />

        <div>
          <Input
            label="Employee ID"
            placeholder="e.g. EMP-101"
            {...register("employeeId")}
          />
          <FormError message={errors.employeeId?.message} />
        </div>

        <div>
          <Input
            label="Department"
            placeholder="e.g. Science"
            {...register("department")}
          />
          <FormError message={errors.department?.message} />
        </div>

        <div className="sm:col-span-2 relative">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
            Subjects (Select up to 5)
          </label>
          <div className="relative">
            <div
              className={`w-full min-h-[42px] rounded-xl border flex flex-wrap gap-1.5 items-center px-3 py-2 cursor-pointer bg-white dark:bg-slate-800 transition-colors ${errors.subject ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"}`}
              onClick={() => setIsSubjectDropdownOpen(!isSubjectDropdownOpen)}
            >
              {selectedSubjects.length === 0 && (
                <span className="text-sm text-slate-400">
                  Select subjects...
                </span>
              )}
              {selectedSubjects.map((sub) => (
                <span
                  key={sub}
                  className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-semibold flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubject(sub);
                  }}
                >
                  {sub}{" "}
                  <span className="hover:text-red-500 cursor-pointer ml-0.5">
                    ×
                  </span>
                </span>
              ))}
            </div>

            {isSubjectDropdownOpen && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                {/* Search / Add Custom Subject Input */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex gap-2 bg-slate-50/50 dark:bg-slate-900/50">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder="Search or type custom subject..."
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSubject();
                      }
                    }}
                  />
                  {customSubjectInput.trim() && (
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition shadow-sm"
                    >
                      + Add
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto p-1">
                  {availableSubjects
                    .filter((s) => !customSubjectInput.trim() || s.toLowerCase().includes(customSubjectInput.toLowerCase()))
                    .map((sub) => {
                      const isSelected = selectedSubjects.includes(sub);
                      return (
                        <div
                          key={sub}
                          onClick={() => toggleSubject(sub)}
                          className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2.5 ${isSelected ? "text-primary font-medium bg-primary/5 dark:bg-primary/10" : "text-slate-700 dark:text-slate-300"}`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"}`}
                          >
                            {isSelected && (
                              <span className="text-[10px] font-bold">✓</span>
                            )}
                          </div>
                          <span>{sub}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Overlay to close dropdown */}
            {isSubjectDropdownOpen && (
              <div
                className="fixed inset-0 z-0"
                onClick={() => setIsSubjectDropdownOpen(false)}
              />
            )}
          </div>
          <input type="hidden" {...register("subject")} />
          <FormError message={errors.subject?.message} />
        </div>

        <div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">
              Status
            </label>
            <select
              className={`
                w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none transition
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${errors.status ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""}
              `}
              {...register("status")}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <FormError message={errors.status?.message} />
          </div>
        </div>

        {/* ═══════ QUALIFICATION & EXPERIENCE ═══════ */}
        <SectionLabel icon={GraduationCap} label="Qualification & Experience" />

        <div>
          <Input
            label="Qualification"
            placeholder="e.g. M.Sc, B.Ed"
            {...register("qualification")}
          />
          <FormError message={errors.qualification?.message} />
        </div>

        <div>
          <Input
            label="Experience Years"
            type="number"
            {...register("experienceYears", { valueAsNumber: true })}
          />
          <FormError message={errors.experienceYears?.message} />
        </div>

        {/* ═══════ JOINING DETAILS ═══════ */}
        <SectionLabel icon={Calendar} label="Joining Details" />

        <div className="sm:col-span-2">
          <Input
            label="Joining Date"
            type="date"
            {...register("joiningDate")}
          />
          <FormError message={errors.joiningDate?.message} />
        </div>

        {/* ═══════ SECURITY ═══════ */}
        <SectionLabel icon={Lock} label="Security" />

        <div className="sm:col-span-2">
          <Input
            label="Password"
            type="password"
            placeholder={
              isEditing ? "Leave blank to keep current" : "Min 6 characters"
            }
            {...register("password")}
          />
          <FormError message={errors.password?.message} />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-6">
        <ModalActions
          submitLabel={isEditing ? "Save Changes" : "Add Teacher"}
          onCancel={onCancel}
        />
      </div>
    </form>
  );
}

export default TeacherForm;
