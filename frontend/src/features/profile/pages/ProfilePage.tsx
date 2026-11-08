import { useState, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  getStudents,
  updateStudent,
} from "@/features/student/services/student.service";
import {
  getTeachers,
  updateTeacher,
} from "@/features/teacher/services/teacher.service";
import type { Student } from "@/features/student/types/student.types";
import type {
  Teacher,
  UpdateTeacherPayload,
} from "@/features/teacher/types/teacher.types";
import { useNotificationStore } from "@/features/notification/store/notificationStore";
import { toast } from "sonner";
import {
  User,
  Phone,
  MapPin,
  Mail,
  BookOpen,
  Save,
  Shield,
} from "lucide-react";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentData, setStudentData] = useState<Student | null>(null);
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);

  // Form states
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [qualification, setQualification] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        if (user.role === "STUDENT") {
          const students = await getStudents(user.schoolId);
          const me = students.find((s) => s.id === user.id);
          if (me) {
            setStudentData(me);
            setFirstName(me.firstName || "");
            setLastName(me.lastName || "");
            setPhone(me.phone || "");
            setAddress(me.address || "");
            setEmail(me.email || "");
            setFatherName(me.fatherName || "");
            setMotherName(me.motherName || "");
            setFatherPhone(me.fatherPhone || "");
            setMotherPhone(me.motherPhone || "");
            setProfilePic(me.profilePic || "");
          }
        } else if (user.role === "TEACHER") {
          const teachers = await getTeachers(user.schoolId);
          const me = teachers.find((t) => t.id === user.id);
          if (me) {
            setTeacherData(me);
            setFullName(me.fullName || "");
            setDepartment(me.department || "");
            setSubject(me.subject || "");
            setExperienceYears(me.experienceYears || 0);
            setPhone(me.phone || "");
            setEmail(me.email || "");
            setQualification(me.qualification || "");
            setProfilePic(me.profilePic || "");
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (user.role === "STUDENT" && studentData) {
        const updated: Student = {
          ...studentData,
          firstName,
          lastName,
          phone,
          address,
          email,
          fatherName,
          motherName,
          fatherPhone,
          motherPhone,
          profilePic,
        };
        await updateStudent(updated);
        updateUser({ firstName, lastName, email });

        // Notify Teacher
        addNotification({
          title: "Student Profile Updated",
          message: `Student ${updated.firstName} ${updated.lastName} has updated their profile details.`,
          details: `**Class:** ${updated.className}\n**Contact Info Updated:** Yes\n**Date:** ${new Date().toLocaleDateString()}\n\nThe student has modified their personal, contact, or parent details from their profile dashboard.`,
          targetRole: "TEACHER",
          classId: updated.className,
          type: "general",
        });

        toast.success("Profile updated successfully!");
      } else if (user.role === "TEACHER" && teacherData) {
        const payload: UpdateTeacherPayload = {
          ...teacherData,
          fullName,
          department,
          subject,
          experienceYears,
          phone,
          email,
          qualification,
          profilePic,
        };
        await updateTeacher(payload);
        const nameParts = fullName.trim().split(/\s+/);
        const fName = nameParts[0] || "";
        const lName = nameParts.slice(1).join(" ") || "";
        updateUser({ firstName: fName, lastName: lName, email });

        // Notify Manager
        addNotification({
          title: "Teacher Profile Updated",
          message: `Teacher ${teacherData.fullName} has updated their profile details.`,
          details: `**Teacher:** ${teacherData.fullName}\n**Department:** ${teacherData.department}\n**Subject:** ${teacherData.subject}\n**Experience:** ${experienceYears} years\n\nContact information or qualification details were recently updated.`,
          targetRole: "MANAGER",
          type: "general",
        });

        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group cursor-pointer h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-transparent hover:border-primary transition-colors">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-slate-400" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-[10px] font-bold text-center leading-tight">
                Change
                <br />
                Photo
              </span>
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () =>
                      setProfilePic(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              My Profile
            </h1>
            <p className="text-sm text-slate-500">
              Update your personal information and contact details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Common Fields */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Student Specific */}
            {user?.role === "STUDENT" && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Home Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" /> Father's Name
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" /> Father's Mobile
                  </label>
                  <input
                    type="text"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" /> Mother's Name
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" /> Mother's Mobile
                  </label>
                  <input
                    type="text"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
            )}

            {/* Teacher Specific */}
            {user?.role === "TEACHER" && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" /> Department
                    (Managed by Admin)
                  </label>
                  <input
                    type="text"
                    value={department}
                    disabled
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" /> Subject
                    (Managed by Admin)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    disabled
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-slate-400" /> Highest
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" /> Experience
                    (Years)
                  </label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-sm shadow-primary/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
