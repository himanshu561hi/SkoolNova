import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getExams, updateExamPaperStatus, deleteExam, getAdmitApprovals, saveAdmitApprovals, toggleAdmitApproval } from "../services/exam.service";
import { ExamSchedule, AdmitCardApproval } from "../types/exam.types";
import { toast } from "sonner";
import { FileText, Download, CheckCircle, XCircle, Trash2, List, Table as TableIcon, ShieldCheck, ShieldX, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStudents } from "@/features/student/services/student.service";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function ManagerExamsPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const [expandedExamTitle, setExpandedExamTitle] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingSubject, setRejectingSubject] = useState<{examId: string, subjectId: string} | null>(null);
  const [approvals, setApprovals] = useState<AdmitCardApproval[]>([]);
  const [selectedExamTitleForApproval, setSelectedExamTitleForApproval] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  // Compute unique classes and dates for Table View
  const uniqueDates = Array.from(new Set(exams.flatMap(e => e.subjects.map(s => s.date)))).sort();
  const uniqueClasses = Array.from(new Set(exams.map(e => e.className))).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

  const loadExams = async () => {
    setLoading(true);
    const data = await getExams(user?.schoolId);
    setExams(data);
    setLoading(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleApprove = async (examId: string, subjectId: string) => {
    await updateExamPaperStatus(examId, subjectId, "APPROVED", undefined, undefined, user?.schoolId);
    toast.success("Exam paper approved successfully");
    loadExams();
  };

  const handleReject = async () => {
    if (!rejectingSubject || !rejectReason.trim()) return;
    await updateExamPaperStatus(rejectingSubject.examId, rejectingSubject.subjectId, "REJECTED", undefined, rejectReason, user?.schoolId);
    toast.success("Exam paper rejected. Teacher will be notified to re-upload.");
    setRejectingSubject(null);
    setRejectReason("");
    loadExams();
  };

  const handleDownload = (url: string | null) => {
    if (!url) {
      toast.error("No file available to download");
      return;
    }
    
    toast.info("Downloading exam paper PDF...");
    
    // Generate a dummy file since we are using local storage mock
    const htmlContent = `
      <html>
        <head><title>Exam Paper PDF Mock</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Mock Exam Paper</h1>
          <p>This is a simulated PDF download for: <strong>${url.split('/').pop()}</strong></p>
          <p>In a real backend, this would serve the actual uploaded PDF file.</p>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = blobUrl;
    // Download as HTML so it opens nicely in browser, simulating a file download
    a.download = url.split('/').pop()?.replace('.pdf', '.html') || 'exam-paper.html';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  };

  const handleDeleteExam = async (examId: string) => {
    if (window.confirm("Are you sure you want to delete this exam schedule? This action cannot be undone.")) {
      await deleteExam(examId, user?.schoolId);
      toast.success("Exam schedule deleted successfully");
      loadExams();
    }
  };

  // ========= ADMIT CARD APPROVAL LOGIC =========
  const loadApprovals = async () => {
    const stored = await getAdmitApprovals(user?.schoolId);
    setApprovals(stored);
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const uniqueExamTitles = Array.from(new Set(exams.map(e => e.title)));

  const buildApprovalsForExamTitle = async (title: string) => {
    const titleExams = exams.filter(e => e.title === title);
    if (titleExams.length === 0) return;
    
    const students = await getStudents(user?.schoolId);
    const existingApprovals = await getAdmitApprovals(user?.schoolId);
    let newApprovals: AdmitCardApproval[] = [];
    
    for (const exam of titleExams) {
      const classStudents = students.filter(s => s.className === exam.className);
      
      const examApprovals = classStudents.map(s => {
        const existing = existingApprovals.find(a => a.studentId === s.id && a.examId === exam.id);
        if (existing) return existing;
        
        return {
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          className: s.className,
          rollNumber: s.rollNumber,
          attendance: s.attendance,
          feeDue: false,
          examId: exam.id,
          approved: false,
        };
      });
      newApprovals = [...newApprovals, ...examApprovals];
    }
    
    // Merge: keep other exam approvals + replace this exam title's approvals
    const otherApprovals = existingApprovals.filter(a => !titleExams.find(e => e.id === a.examId));
    saveAdmitApprovals([...otherApprovals, ...newApprovals], user?.schoolId);
    setApprovals([...otherApprovals, ...newApprovals]);
    setSelectedExamTitleForApproval(title);
  };

  const handleToggleApproval = async (studentId: string, examId: string, approved: boolean) => {
    await toggleAdmitApproval(studentId, examId, approved, user?.schoolId);
    setApprovals(prev => prev.map(a => 
      a.studentId === studentId && a.examId === examId ? { ...a, approved } : a
    ));
    toast.success(approved ? "Admit card approved" : "Admit card revoked");
  };

  const handleBulkApprove = (minAttendance: number | null) => {
    if (!selectedExamTitleForApproval) return;
    const titleExams = exams.filter(e => e.title === selectedExamTitleForApproval);
    const examIds = titleExams.map(e => e.id);
    
    const updated = approvals.map(a => {
      if (examIds.includes(a.examId)) {
        if (minAttendance === null || a.attendance >= minAttendance) {
          return { ...a, approved: true };
        }
      }
      return a;
    });
    saveAdmitApprovals(updated);
    setApprovals(updated);
    const count = updated.filter(a => examIds.includes(a.examId) && a.approved).length;
    toast.success(`${count} students approved!`);
    setShowApproveModal(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Exams"
        subtitle="Schedule exams and review question papers submitted by teachers."
        actions={
          <button 
            onClick={() => navigate("/exams/schedule")}
            className="bg-primary px-4 py-2 text-white rounded-lg hover:bg-primary/90 transition font-medium shadow-sm"
          >
            + Schedule Exam
          </button>
        }
      />

      {/* ========================= */}
      {/* ADMIT CARD APPROVAL SECTION */}
      {/* ========================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Admit Card Approvals
          </h3>
          <p className="text-sm text-slate-500 mt-1">Approve admit cards for students based on attendance criteria.</p>
        </div>
        <div className="p-5">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Exam</label>
            <div className="flex flex-wrap gap-2">
              {uniqueExamTitles.map(title => (
                <button
                  key={title}
                  onClick={() => buildApprovalsForExamTitle(title)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                    selectedExamTitleForApproval === title
                      ? "bg-primary text-white border-primary shadow-md"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50"
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          {selectedExamTitleForApproval && (() => {
            const titleExams = exams.filter(e => e.title === selectedExamTitleForApproval);
            const examIds = titleExams.map(e => e.id);
            const examApprovals = approvals.filter(a => examIds.includes(a.examId));
            if (examApprovals.length === 0) return <p className="text-sm text-slate-400 italic">No students found for this class.</p>;
            
            return (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-500 font-medium">
                    {examApprovals.filter(a => a.approved).length}/{examApprovals.length} approved
                  </span>
                  <button
                    onClick={() => setShowApproveModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Approve Students
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Student</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Class</th>
                        <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Roll No.</th>
                        <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Attendance</th>
                        <th className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {examApprovals.map(a => (
                        <tr key={a.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{a.studentName}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-medium">Class {a.className}</td>
                          <td className="px-4 py-3 text-slate-500">{a.rollNumber}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              a.attendance >= 75 ? 'bg-green-100 text-green-700' : 
                              a.attendance >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {a.attendance}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {a.approved ? (
                              <button
                                onClick={() => handleToggleApproval(a.studentId, a.examId, false)}
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-700 transition flex items-center gap-1.5 mx-auto"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Approved
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleApproval(a.studentId, a.examId, true)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-green-100 hover:text-green-700 transition flex items-center gap-1.5 mx-auto"
                              >
                                <ShieldX className="w-3.5 h-3.5" /> Not Approved
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex justify-end">
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
          <button 
            onClick={() => setViewMode("list")}
            className={`px-4 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <List className="w-4 h-4" /> List View
          </button>
          <button 
            onClick={() => setViewMode("table")}
            className={`px-4 py-1.5 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${viewMode === "table" ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <TableIcon className="w-4 h-4" /> Table View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading exams...</div>
      ) : (
        viewMode === "table" ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b-2 border-slate-200 dark:border-slate-700 text-left font-bold text-slate-700 dark:text-slate-300 sticky left-0 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
                    Date
                  </th>
                  {uniqueClasses.map(cls => (
                    <th key={cls} className="p-4 border-b-2 border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-300 min-w-[160px]">
                      Class {cls}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueDates.length === 0 ? (
                  <tr>
                    <td colSpan={uniqueClasses.length + 1} className="p-8 text-center text-slate-400 italic font-medium">
                      No exams scheduled yet.
                    </td>
                  </tr>
                ) : (
                  uniqueDates.map(date => {
                    const dateObj = new Date(date);
                    const isToday = date === new Date().toISOString().split('T')[0];
                    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    
                    return (
                      <tr key={date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className={`p-4 border-b border-slate-200 dark:border-slate-700 sticky left-0 z-10 ${isToday ? 'bg-primary/5' : 'bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm'}`}>
                          <span className={`font-bold ${isToday ? 'text-primary' : 'text-slate-800 dark:text-white'}`}>
                            {formattedDate}
                          </span>
                        </td>
                        {uniqueClasses.map(cls => {
                          const subject = exams
                            .filter(e => e.className === cls)
                            .flatMap(e => e.subjects)
                            .find(s => s.date === date);
                            
                          return (
                            <td key={cls} className="p-3 border-b border-slate-200 dark:border-slate-700 text-center">
                              {subject ? (
                                <div className="px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl text-sm font-bold text-primary shadow-sm hover:shadow-md transition-shadow">
                                  {subject.subjectName}
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                                    {subject.startTime} – {subject.endTime}
                                  </div>
                                  <div className={`text-[10px] mt-0.5 font-bold uppercase tracking-wider ${
                                    subject.paperStatus === 'APPROVED' ? 'text-green-600' :
                                    subject.paperStatus === 'REJECTED' ? 'text-red-600' :
                                    subject.paperStatus === 'UPLOADED' ? 'text-yellow-600' :
                                    'text-slate-400'
                                  }`}>
                                    {subject.paperStatus}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300 font-medium italic">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="space-y-4">
          {uniqueExamTitles.map(title => {
            const isExpanded = expandedExamTitle === title;
            const titleExams = exams.filter(e => e.title === title);
            const totalClasses = titleExams.length;
            
            return (
              <div key={title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all duration-200">
                <div 
                  className="bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  onClick={() => setExpandedExamTitle(isExpanded ? null : title)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
                      <p className="text-sm text-slate-500 mt-1">Scheduled for {totalClasses} Class(es)</p>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-5 bg-white dark:bg-slate-900 animate-in slide-in-from-top-2 duration-200 space-y-6">
                    {titleExams.map(exam => (
                      <div key={exam.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/30 dark:bg-slate-900/30">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              Class {exam.className}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">{exam.startDate} to {exam.endDate}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
                              {exam.status}
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExam(exam.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Exam Schedule for this class"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {exam.subjects.map(subject => (
                            <div key={subject.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-slate-100 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                              <div>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-400" />
                                  <span className="font-medium text-slate-800 dark:text-slate-200">{subject.subjectName}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    subject.paperStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    subject.paperStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                    subject.paperStatus === 'UPLOADED' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {subject.paperStatus}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Assigned to: {subject.teacherName || 'Unassigned'} | Date: {subject.date}</p>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-3 sm:mt-0">
                                {subject.paperPdfUrl && (
                                  <button 
                                    onClick={() => handleDownload(subject.paperPdfUrl)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" /> Download
                                  </button>
                                )}
                                
                                {subject.paperStatus === 'UPLOADED' && (
                                  <>
                                    <button 
                                      onClick={() => handleApprove(exam.id, subject.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors shadow-sm"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button 
                                      onClick={() => setRejectingSubject({ examId: exam.id, subjectId: subject.id })}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors shadow-sm"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )
      )}

      {/* Approve Students Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Approve Admit Cards</h3>
            <p className="text-sm text-slate-500 mb-5">Select which students to approve based on attendance criteria.</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleBulkApprove(75)}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 flex items-center justify-center font-bold text-sm">75%</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Attendance 75%+</p>
                  <p className="text-xs text-slate-500">Approve students with 75% or more attendance</p>
                </div>
              </button>

              <button
                onClick={() => handleBulkApprove(60)}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:border-yellow-300 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 flex items-center justify-center font-bold text-sm">60%</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Attendance 60%+</p>
                  <p className="text-xs text-slate-500">Approve students with 60% or more attendance</p>
                </div>
              </button>

              <button
                onClick={() => handleBulkApprove(50)}
                className="w-full flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 flex items-center justify-center font-bold text-sm">50%</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Attendance 50%+</p>
                  <p className="text-xs text-slate-500">Approve students with 50% or more attendance</p>
                </div>
              </button>

              <button
                onClick={() => handleBulkApprove(null)}
                className="w-full flex items-center gap-3 p-3 border-2 border-primary/30 rounded-xl hover:bg-primary/5 transition text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">All</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">Select All Students</p>
                  <p className="text-xs text-slate-500">Approve every student regardless of attendance</p>
                </div>
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setShowApproveModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Reject Exam Paper</h3>
            <p className="text-sm text-slate-500 mb-4">Please provide a reason for rejecting this paper. The teacher will be notified to make changes and re-upload.</p>
            <textarea
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none dark:bg-slate-800 dark:text-white mb-4"
              rows={4}
              placeholder="E.g., Out of syllabus questions found in Section B..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setRejectingSubject(null); setRejectReason(""); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
