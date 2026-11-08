import { useState, useEffect } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getAssignments, getSubmissions, saveSubmission } from "../services/assignment.service";
import type { Assignment, AssignmentSubmission } from "../types/assignment.types";
import { getStudents } from "@/features/student/services/student.service";
import { toast } from "sonner";
import { BookOpen, CheckCircle, Clock, UploadCloud, AlertCircle, Paperclip, Download, History, Loader2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { uploadFile } from "@/services/upload.service";

const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();
// expired = overdue + 5 days
const isExpired = (dueDate: string) => {
  const diff = (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24);
  return diff > 5;
};

export default function StudentAssignmentsPage() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mySubmissions, setMySubmissions] = useState<AssignmentSubmission[]>([]);
  const [myClass, setMyClass] = useState("");
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PREVIOUS">("ACTIVE");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<AssignmentSubmission | null>(null);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [answerContent, setAnswerContent] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentData, setAttachmentData] = useState("");

  useEffect(() => {
    if (!user) return;
    getStudents(user.schoolId).then(students => {
      const me = students.find(s => s.id === user.id);
      if (me) setMyClass(me.className);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !myClass) return;
    const allAssignments = getAssignments(user.schoolId);
    // Filter: only this class, and NOT expired (overdue+5days) for ACTIVE; expired for PREVIOUS
    const classAssn = allAssignments.filter(a => a.className === myClass);
    setAssignments(classAssn);
    const allSubs = getSubmissions();
    setMySubmissions(allSubs.filter(s => s.studentId === user.id));
  }, [user, myClass]);

  const refreshData = () => {
    if (!user) return;
    setMySubmissions(getSubmissions().filter(s => s.studentId === user.id));
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files allowed."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB allowed."); return; }

    setIsUploading(true);
    try {
      const res = await uploadFile(file);
      setAttachmentName(res.originalFilename || file.name);
      setAttachmentData(res.fileUrl);
      toast.success("File uploaded to cloud storage!");
    } catch {
      // Fallback to local data URL if server unreachable
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachmentName(file.name);
        setAttachmentData(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const openSubmitModal = (assignment: Assignment, sub: AssignmentSubmission) => {
    setActiveAssignment(assignment);
    setActiveSubmission(sub);
    setAnswerContent(sub.content || "");
    setAttachmentName(sub.fileAttachmentName || "");
    setAttachmentData(sub.fileAttachmentData || "");
    setIsSubmitModalOpen(true);
  };

  const handleSubmitAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;
    if (!answerContent.trim() && !attachmentData) {
      toast.error("Please write an answer or attach a PDF file.");
      return;
    }
    const updatedSub: AssignmentSubmission = {
      ...activeSubmission,
      content: answerContent,
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
      fileAttachmentName: attachmentName || undefined,
      fileAttachmentData: attachmentData || undefined,
    };
    saveSubmission(updatedSub);
    toast.success("Assignment submitted successfully!");
    setIsSubmitModalOpen(false);
    refreshData();
  };

  // Split: active = not expired, previous = expired
  const activeAssignments = assignments.filter(a => !isExpired(a.dueDate));
  const previousAssignments = assignments.filter(a => isExpired(a.dueDate));
  const displayList = activeTab === "ACTIVE" ? activeAssignments : previousAssignments;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-indigo-500" /></div>
            My Assignments
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-2">View and submit assignments for Class {myClass}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        {(["ACTIVE", "PREVIOUS"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {tab === "ACTIVE" ? `Active (${activeAssignments.length})` : <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Previous ({previousAssignments.length})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayList.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="text-4xl mb-3">{activeTab === "ACTIVE" ? "🎉" : "📁"}</div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              {activeTab === "ACTIVE" ? "No Active Assignments!" : "No Previous Assignments"}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "ACTIVE" ? "You're all caught up!" : "Assignments older than 5 days past due will appear here."}
            </p>
          </div>
        ) : displayList.map(assignment => {
          const mySub = mySubmissions.find(s => s.assignmentId === assignment.id);
          if (!mySub) return null;
          const isPending = mySub.status === "PENDING";
          const isSubmitted = mySub.status === "SUBMITTED";
          const isGraded = mySub.status === "GRADED";
          const late = isPending && isOverdue(assignment.dueDate);

          return (
            <div key={assignment.id} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden flex flex-col h-full ${late ? 'border-rose-200 dark:border-rose-800' : isGraded ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">{assignment.subject}</span>
                  {isGraded ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full uppercase">✓ Checked</span>
                  ) : isSubmitted ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full uppercase"><CheckCircle className="h-3 w-3" /> Submitted</span>
                  ) : late ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full uppercase"><AlertCircle className="h-3 w-3" /> Overdue</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase"><Clock className="h-3 w-3" /> Pending</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{assignment.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{assignment.description}</p>
                {/* Dates */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500">📅 Uploaded: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                  <span className={`text-xs font-semibold ${late ? 'text-rose-500' : 'text-slate-500'}`}>⏰ Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                </div>
                {/* Teacher attachment */}
                {assignment.attachmentName && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-700 truncate">{assignment.attachmentName}</span>
                    <a href={assignment.attachmentData} download={assignment.attachmentName} className="ml-auto shrink-0 text-xs text-blue-600 font-bold flex items-center gap-1">
                      <Download className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {/* Teacher remarks */}
                {isGraded && mySub.teacherRemarks && (
                  <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 italic">Teacher: "{mySub.teacherRemarks}"</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between">
                {mySub.fileAttachmentName && (
                  <div className="flex items-center gap-1 text-xs text-slate-500"><Paperclip className="h-3 w-3" />{mySub.fileAttachmentName}</div>
                )}
                {isPending ? (
                  <button onClick={() => openSubmitModal(assignment, mySub)}
                    className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5" /> Submit Work
                  </button>
                ) : (
                  <button onClick={() => openSubmitModal(assignment, mySub)}
                    className="ml-auto bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    View Submission
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title="Submit Assignment">
        {activeAssignment && activeSubmission && (
          <div className="space-y-5">
            <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-400 mb-1">{activeAssignment.title}</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">{activeAssignment.description}</p>
              <div className="mt-2 flex gap-4">
                <span className="text-xs text-indigo-600">📅 Uploaded: {new Date(activeAssignment.createdAt).toLocaleDateString()}</span>
                <span className="text-xs text-indigo-600">⏰ Due: {new Date(activeAssignment.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            {activeAssignment.attachmentName && (
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-xl">
                <span className="text-sm font-semibold text-blue-700">{activeAssignment.attachmentName}</span>
                <a href={activeAssignment.attachmentData} download={activeAssignment.attachmentName}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600"><Download className="h-3.5 w-3.5" /> Download</a>
              </div>
            )}
            <form onSubmit={handleSubmitAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Your Answer (optional if attaching file)</label>
                <textarea rows={4} value={answerContent} onChange={e => setAnswerContent(e.target.value)}
                  disabled={activeSubmission.status !== "PENDING"}
                  placeholder="Type your answer here..."
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white resize-none disabled:opacity-70" />
              </div>
              {/* File attachment */}
              {activeSubmission.status === "PENDING" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Attach PDF (optional)</label>
                  <label className={`flex items-center gap-3 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${attachmentName ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'}`}>
                    <Paperclip className={`h-5 w-5 ${attachmentName ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex-1">{attachmentName || "Upload your assignment PDF"}</span>
                    {attachmentName && <button type="button" onClick={() => { setAttachmentName(""); setAttachmentData(""); }} className="text-xs text-rose-500 font-bold">Remove</button>}
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
              {/* Show submitted file */}
              {activeSubmission.status !== "PENDING" && activeSubmission.fileAttachmentName && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-xl">
                  <span className="text-sm font-semibold text-blue-700">{activeSubmission.fileAttachmentName}</span>
                  <a href={activeSubmission.fileAttachmentData} download={activeSubmission.fileAttachmentName}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600"><Download className="h-3.5 w-3.5" /> Download</a>
                </div>
              )}
              {activeSubmission.status !== "PENDING" && (
                <div className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Submitted on {new Date(activeSubmission.submittedAt!).toLocaleString()}
                </div>
              )}
              {activeSubmission.status === "GRADED" && activeSubmission.teacherRemarks && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm font-bold text-emerald-700 mb-1">Teacher Remarks:</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 italic">"{activeSubmission.teacherRemarks}"</p>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsSubmitModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition">
                  {activeSubmission.status !== "PENDING" ? "Close" : "Cancel"}
                </button>
                {activeSubmission.status === "PENDING" && (
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-2">
                    <UploadCloud className="h-4 w-4" /> Submit Assignment
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
