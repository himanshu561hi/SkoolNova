import { useState, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getAssignments, saveAssignment, deleteAssignment, getSubmissions, saveSubmission, initSubmissionsForAssignment } from "../services/assignment.service";
import type { Assignment, AssignmentSubmission } from "../types/assignment.types";
import { getStudents } from "@/features/student/services/student.service";
import { getTeachers } from "@/features/teacher/services/teacher.service";
import { getTimetableSlots } from "@/features/timetable/services/timetable.service";
import { toast } from "sonner";
import { BookOpen, Plus, FileText, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock, Paperclip, Download, Eye, History } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useNotificationStore } from "@/features/notification/store/notificationStore";
import { uploadFile } from "@/services/upload.service";

// Helper: is assignment overdue?
const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

export default function TeacherAssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [teacherSubject, setTeacherSubject] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [baseSubjects, setBaseSubjects] = useState<string[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [classSubjectsMap, setClassSubjectsMap] = useState<Record<string, string[]>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PREVIOUS">("ACTIVE");
  const [reviewSub, setReviewSub] = useState<AssignmentSubmission | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const addNotification = useNotificationStore(state => state.addNotification);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newClass, setNewClass] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentData, setAttachmentData] = useState("");

  useEffect(() => {
    if (!user) return;
    getTeachers(user.schoolId).then(teachers => {
      const me = teachers.find(t => t.id === user.id);
      if (me) {
        setTeacherSubject(Array.isArray(me.subject) ? me.subject.join(", ") : me.subject);
        let subjects: string[] = [];
        if (Array.isArray(me.subject)) subjects = me.subject;
        else if (typeof me.subject === 'string') subjects = me.subject.split(",").map(s => s.trim()).filter(Boolean);
        setBaseSubjects(subjects);
      }
    });
    // Load timetable from MongoDB database
    getTimetableSlots(user.schoolId, undefined, user.id).then((slots) => {
      const myEntries = slots.filter((e) => e.teacherId === user.id);
      const uniqueClasses = Array.from(new Set(myEntries.map((e) => e.className))) as string[];
      setTeacherClasses(uniqueClasses.sort());
      const map: Record<string, string[]> = {};
      myEntries.forEach((e) => {
        if (!map[e.className]) map[e.className] = [];
        if (e.subject && !map[e.className].includes(e.subject)) map[e.className].push(e.subject);
      });
      setClassSubjectsMap(map);
      if (uniqueClasses.length > 0) setNewClass(uniqueClasses[0]);
    });
    refreshData();
  }, [user]);

  useEffect(() => {
    if (newClass && classSubjectsMap[newClass]?.length > 0) {
      setAvailableSubjects(classSubjectsMap[newClass]);
      setSelectedSubject(classSubjectsMap[newClass][0]);
    } else {
      setAvailableSubjects(baseSubjects);
      if (baseSubjects.length > 0) setSelectedSubject(baseSubjects[0]);
    }
  }, [newClass, classSubjectsMap, baseSubjects]);

  const refreshData = () => {
    if (!user) return;
    setAssignments(getAssignments(user.schoolId).filter(a => a.teacherId === user.id));
    setSubmissions(getSubmissions());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File size must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachmentName(file.name);
      setAttachmentData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const assignmentId = `assn_${Date.now()}`;
    const newAssignment: Assignment = {
      id: assignmentId, title: newTitle, description: newDesc,
      className: newClass, subject: selectedSubject || teacherSubject,
      teacherId: user.id, dueDate: newDueDate, createdAt: new Date().toISOString(),
      attachmentName: attachmentName || undefined,
      attachmentData: attachmentData || undefined,
    };
    saveAssignment({ ...newAssignment, schoolId: user.schoolId });
    const allStudents = await getStudents(user.schoolId);
    const classStudents = allStudents.filter(s => s.className === newClass);
    initSubmissionsForAssignment(assignmentId, classStudents);
    toast.success("Assignment created & sent to students!");
    addNotification({
      title: "New Assignment",
      message: `New assignment uploaded: "${newTitle}" for Class ${newClass}`,
      details: `**Subject:** ${selectedSubject || teacherSubject}\n**Class:** ${newClass}\n**Title:** ${newTitle}\n**Due Date:** ${new Date(newDueDate).toLocaleDateString()}\n\nA teacher has published a new assignment.`,
      targetRole: 'MANAGER',
      type: 'homework'
    });
    addNotification({
      title: "New Assignment",
      message: `New Assignment for your class: "${newTitle}"`,
      details: `**Subject:** ${selectedSubject || teacherSubject}\n**Title:** ${newTitle}\n**Due Date:** ${new Date(newDueDate).toLocaleDateString()}\n\nPlease check your Assignments tab to view and submit the work before the deadline.`,
      targetRole: 'STUDENT',
      classId: newClass,
      type: 'homework'
    });
    setIsCreateModalOpen(false);
    setNewTitle(""); setNewDesc(""); setNewDueDate("");
    setAttachmentName(""); setAttachmentData("");
    refreshData();
  };

  const handleMarkChecked = () => {
    if (!reviewSub) return;
    const updated: AssignmentSubmission = {
      ...reviewSub, status: "GRADED",
      checkedAt: new Date().toISOString(), teacherRemarks: reviewRemarks
    };
    saveSubmission(updated);
    toast.success("Submission marked as checked!");
    setReviewSub(null); setReviewRemarks("");
    refreshData();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this assignment?")) {
      deleteAssignment(id);
      toast.success("Assignment deleted");
      refreshData();
    }
  };

  const toggleExpand = (id: string) => setExpandedAssignmentId(prev => prev === id ? null : id);

  // Split active vs previous (overdue)
  const activeAssignments = assignments.filter(a => !isOverdue(a.dueDate));
  const previousAssignments = assignments.filter(a => isOverdue(a.dueDate));
  const displayList = activeTab === "ACTIVE" ? activeAssignments : previousAssignments;

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const assignmentSubs = submissions.filter(s => s.assignmentId === assignment.id);
    const submittedCount = assignmentSubs.filter(s => s.status === "SUBMITTED" || s.status === "GRADED").length;
    const checkedCount = assignmentSubs.filter(s => s.status === "GRADED").length;
    const totalStudents = assignmentSubs.length;
    const isExpanded = expandedAssignmentId === assignment.id;
    const overdue = isOverdue(assignment.dueDate);

    return (
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${overdue ? 'border-slate-300 dark:border-slate-700 opacity-80' : 'border-slate-200 dark:border-slate-800'}`}>
        <div className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" onClick={() => toggleExpand(assignment.id)}>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Class {assignment.className}</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">{assignment.subject}</span>
              {assignment.attachmentName && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full"><Paperclip className="h-2.5 w-2.5" /> PDF</span>}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{assignment.title}</h3>
            <div className="flex flex-wrap gap-4 mt-1.5">
              <span className="text-xs text-slate-500">📅 Uploaded: {new Date(assignment.createdAt).toLocaleDateString()}</span>
              <span className={`text-xs font-semibold ${overdue ? 'text-rose-500' : 'text-slate-500'}`}>⏰ Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col items-end">
              <div className="text-xs font-semibold text-slate-500 mb-1">Submissions</div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalStudents === 0 ? 0 : (submittedCount / totalStudents) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{submittedCount}/{totalStudents}</span>
              </div>
              {checkedCount > 0 && <span className="text-[10px] text-emerald-600 font-medium mt-0.5">{checkedCount} checked ✓</span>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(assignment.id); }} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition">
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="text-slate-400">{isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-5">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <strong>Instructions:</strong><br />{assignment.description}
            </p>
            {assignment.attachmentName && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">{assignment.attachmentName}</span>
                </div>
                <a href={assignment.attachmentData} download={assignment.attachmentName} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
            )}
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">Student Submissions</h4>
            {assignmentSubs.length === 0 ? (
              <p className="text-sm text-slate-500">No students found in this class.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignmentSubs.map(sub => {
                  const isSubmitted = sub.status === "SUBMITTED";
                  const isGraded = sub.status === "GRADED";
                  return (
                    <div key={sub.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sub.studentName}</span>
                        {isGraded ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Checked</span>
                        ) : isSubmitted ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><CheckCircle className="h-2.5 w-2.5" /> Submitted</span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="h-2.5 w-2.5" /> Pending</span>
                        )}
                      </div>
                      {sub.fileAttachmentName && (
                        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-2">
                          <span className="text-xs text-slate-600 truncate">{sub.fileAttachmentName}</span>
                          <a href={sub.fileAttachmentData} download={sub.fileAttachmentName} className="text-xs text-blue-600 font-bold ml-2 flex items-center gap-1">
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {(isSubmitted) && (
                        <button onClick={() => { setReviewSub(sub); setReviewRemarks(sub.teacherRemarks || ""); }}
                          className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg py-1.5 transition">
                          <Eye className="h-3.5 w-3.5" /> Review & Mark Checked
                        </button>
                      )}
                      {isGraded && sub.teacherRemarks && (
                        <p className="text-xs text-slate-500 mt-1 italic">"{sub.teacherRemarks}"</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-primary" /></div>
            Manage Assignments
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Create and track assignments for your classes.</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} disabled={teacherClasses.length === 0}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition shadow-sm disabled:opacity-50">
          <Plus className="h-4 w-4" /> Create Assignment
        </button>
      </div>

      {teacherClasses.length === 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-500 text-sm font-medium">
          You are not assigned to any classes yet. Ask the Manager to assign you classes in the Timetable.
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(["ACTIVE", "PREVIOUS"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {tab === "ACTIVE" ? `Active (${activeAssignments.length})` : <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Previous ({previousAssignments.length})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">{activeTab === "ACTIVE" ? "No Active Assignments" : "No Previous Assignments"}</h3>
          </div>
        ) : displayList.map(a => <AssignmentCard key={a.id} assignment={a} />)}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Assignment">
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Class</label>
              <select required value={newClass} onChange={e => setNewClass(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white">
                {teacherClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            {availableSubjects.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <select required value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={availableSubjects.length === 1}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white disabled:opacity-70">
                  {availableSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Chapter 1 Exercises"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
            <input required type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description / Instructions</label>
            <textarea required rows={3} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Provide instructions..."
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white resize-none" />
          </div>
          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Attach PDF (Optional)</label>
            <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${attachmentName ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-primary'}`}>
              <Paperclip className={`h-5 w-5 ${attachmentName ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{attachmentName || "Click to upload PDF (max 5MB)"}</span>
              </div>
              {attachmentName && <button type="button" onClick={() => { setAttachmentName(""); setAttachmentData(""); }} className="text-xs text-rose-500 font-bold">Remove</button>}
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsCreateModalOpen(false)}
              className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:opacity-90 transition shadow-sm">Assign to Class</button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal isOpen={!!reviewSub} onClose={() => { setReviewSub(null); setReviewRemarks(""); }} title="Review Submission">
        {reviewSub && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{reviewSub.studentName}</p>
              {reviewSub.content && <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">{reviewSub.content}</p>}
            </div>
            {reviewSub.fileAttachmentName && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-xl">
                <span className="text-sm font-semibold text-blue-700">{reviewSub.fileAttachmentName}</span>
                <a href={reviewSub.fileAttachmentData} download={reviewSub.fileAttachmentName}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"><Download className="h-3.5 w-3.5" /> Download</a>
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Remarks (optional)</label>
              <textarea rows={3} value={reviewRemarks} onChange={e => setReviewRemarks(e.target.value)} placeholder="Write feedback for the student..."
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-white resize-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => { setReviewSub(null); setReviewRemarks(""); }}
                className="px-5 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition">Cancel</button>
              <button onClick={handleMarkChecked}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Mark as Checked
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
