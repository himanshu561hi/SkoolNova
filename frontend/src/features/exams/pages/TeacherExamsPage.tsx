import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getExams, updateExamPaperStatus, updateMarksStatus, saveExamMarks } from "../services/exam.service";
import { getTeachers } from "../../teacher/services/teacher.service";
import { Teacher } from "../../teacher/types/teacher.types";
import { getStudents } from "@/features/student/services/student.service";
import { Student } from "@/features/student/types/student.types";
import { ExamSchedule, ExamSubject } from "../types/exam.types";
import { toast } from "sonner";
import { FileText, UploadCloud, CheckCircle, Clock, Check, BellRing, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";

export default function TeacherExamsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"MY_ASSIGNMENTS" | "FULL_SCHEDULE" | "UPLOAD_MARKS" | "COORDINATOR_VIEW">("MY_ASSIGNMENTS");
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [mySubjectNames, setMySubjectNames] = useState<string[]>([]);
  const [isCoordinatorFor, setIsCoordinatorFor] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  
  // examId_subjectId_studentId -> marks
  const [marksData, setMarksData] = useState<Record<string, string>>({});
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  
  // State for mock upload
  const [uploadingSubject, setUploadingSubject] = useState<{examId: string, subject: ExamSubject, type: "PAPER"} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadExams = async () => {
    setLoading(true);
    const data = await getExams(user?.schoolId);
    setExams(data);
    
    if (user?.id) {
      const allTeachers = await getTeachers(user?.schoolId);
      setTeachers(allTeachers);
      const me = allTeachers.find(t => t.id === user.id);
      if (me) {
        const subs = Array.isArray(me.subject) ? me.subject : 
                     (typeof me.subject === 'string' ? me.subject.split(',').map(s=>s.trim()) : []);
        setMySubjectNames(subs.map(s => s.toLowerCase()));
        setIsCoordinatorFor(me.coordinatorFor || []);
      }
      const allStudents = await getStudents(user?.schoolId);
      setStudents(allStudents);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleUploadSimulate = async () => {
    if (!uploadingSubject) return;
    setIsUploading(true);
    
    setTimeout(async () => {
      if (uploadingSubject.type === "PAPER") {
        const mockPdfUrl = `/downloads/mock-exam-paper-${uploadingSubject.subject.id}.pdf`;
        await updateExamPaperStatus(
          uploadingSubject.examId,
          uploadingSubject.subject.id,
          "UPLOADED",
          mockPdfUrl,
          undefined,
          user?.schoolId
        );
        toast.success(`${uploadingSubject.subject.subjectName} paper uploaded successfully for review.`);
      }
      
      setIsUploading(false);
      setUploadingSubject(null);
      setSelectedFile(null);
      loadExams();
    }, 1500);
  };

  const handleSaveMarks = async (examId: string, subjects: ExamSubject[]) => {
    try {
      for (const subject of subjects) {
        const records = Object.entries(marksData)
          .filter(([key]) => key.startsWith(`${examId}_${subject.id}_`))
          .map(([key, val]) => {
            const parts = key.split("_");
            const studentId = parts.slice(2).join("_");
            return {
              studentId,
              marksObtained: Number(val) || 0,
              maxMarks: 100,
            };
          });
        if (records.length > 0) {
          await saveExamMarks(examId, subject.id, records, user?.schoolId);
        } else {
          await updateMarksStatus(examId, subject.id, true, user?.schoolId);
        }
      }
      toast.success("Marks saved successfully to database!");
      loadExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save marks to database.");
    }
  };

  const handleRemind = (teacherName: string | undefined, subjectName: string) => {
    toast.success(`Reminder sent to ${teacherName || 'Teacher'} for ${subjectName} marks.`);
  };

  const displayedExams = activeTab === "COORDINATOR_VIEW"
    ? exams.filter(e => isCoordinatorFor.includes(e.className))
    : exams.filter(exam => {
        if (activeTab === "FULL_SCHEDULE") return true;
        return exam.subjects.some(s => s.teacherId === user?.id || mySubjectNames.includes(s.subjectName.toLowerCase()));
      });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Exam Assignments"
        subtitle="Upload and manage question papers and marks for your assigned subjects."
      />

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading assignments...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 shadow-sm">
          No exams scheduled yet.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("MY_ASSIGNMENTS")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "MY_ASSIGNMENTS" ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My Assignments
            </button>
            <button
              onClick={() => setActiveTab("FULL_SCHEDULE")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "FULL_SCHEDULE" ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Full Schedule
            </button>
            <button
              onClick={() => setActiveTab("UPLOAD_MARKS")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "UPLOAD_MARKS" ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upload Marks
            </button>
            {isCoordinatorFor.length > 0 && (
              <button
                onClick={() => setActiveTab("COORDINATOR_VIEW")}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "COORDINATOR_VIEW" ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Coordinator View
              </button>
            )}
          </div>

          {activeTab === "COORDINATOR_VIEW" && isCoordinatorFor.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">Class Coordinator / Class Teacher</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  You are viewing the status for Class: <span className="font-bold text-primary">{isCoordinatorFor.join(", ")}</span>
                </p>
              </div>
            </div>
          )}

          {displayedExams.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 shadow-sm mt-6">
              {activeTab === "MY_ASSIGNMENTS" ? "No assignments assigned to you yet." : "No exams match this view."}
            </div>
          ) : (
            displayedExams.map(exam => {
              const mySubjects = (activeTab === "MY_ASSIGNMENTS" || activeTab === "UPLOAD_MARKS")
                ? exam.subjects.filter(s => s.teacherId === user?.id || mySubjectNames.includes(s.subjectName.toLowerCase()))
                : exam.subjects;
              
              if (mySubjects.length === 0) return null;
              
              const isExpanded = expandedExamId === exam.id;
              
              return (
                <div key={exam.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-6 transition-all">
                  <div 
                    onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                    className="bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">{exam.title}</h3>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Class {exam.className} | {exam.startDate} to {exam.endDate}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {activeTab === "UPLOAD_MARKS" && isExpanded && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveMarks(exam.id, mySubjects);
                          }}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" /> Save Marks
                        </button>
                      )}
                      <div className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-500">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                
                {isExpanded && (
                  <div className="p-5">
                  <div className="overflow-x-auto">
                    {activeTab === "UPLOAD_MARKS" || activeTab === "COORDINATOR_VIEW" ? (
                      // MARKS ENTRY TABLE
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300 w-16">Roll No</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Student Name</th>
                            {mySubjects.map(subject => {
                              const assignedTeacher = teachers.find(t => String(t.id) === String(subject.teacherId));
                              const displayTeacherName = assignedTeacher?.fullName || subject.teacherName || 'Unassigned';
                              return (
                              <th key={subject.id} className="px-4 py-3 text-center font-bold text-slate-600 dark:text-slate-300">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <span>{subject.subjectName}</span>
                                  {activeTab === "COORDINATOR_VIEW" && (
                                    <span className="text-[10px] text-slate-500 font-medium">({displayTeacherName})</span>
                                  )}
                                  <div className="text-[10px] font-normal flex items-center justify-center">
                                    {subject.marksUploaded ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3"/> Submitted
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-400">Pending</span>
                                        {activeTab === "COORDINATOR_VIEW" && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handleRemind(displayTeacherName, subject.subjectName); }}
                                            className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded hover:bg-rose-100 flex items-center gap-1 border border-rose-100"
                                          >
                                            <BellRing className="w-3 h-3" /> Remind
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </th>
                            )})}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {students.filter(s => s.className === exam.className).map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400 font-medium">{student.rollNumber}</td>
                              <td className="px-4 py-4 font-bold text-slate-800 dark:text-white">
                                {student.firstName} {student.lastName}
                              </td>
                              {mySubjects.map(subject => {
                                const key = `${exam.id}_${subject.id}_${student.id}`;
                                return (
                                  <td key={subject.id} className="px-4 py-3 text-center">
                                    {activeTab === "COORDINATOR_VIEW" ? (
                                      <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {marksData[key] ? marksData[key] : (subject.marksUploaded ? "N/A" : "-")}
                                      </span>
                                    ) : (
                                      <input 
                                        type="number" 
                                        min="0"
                                        max="100"
                                        value={marksData[key] || ""}
                                        onChange={(e) => setMarksData(prev => ({...prev, [key]: e.target.value}))}
                                        placeholder="0"
                                        className="w-16 px-2 py-1.5 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium text-slate-800 dark:text-white"
                                      />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          {students.filter(s => s.className === exam.className).length === 0 && (
                            <tr>
                              <td colSpan={mySubjects.length + 2} className="px-4 py-6 text-center text-slate-500">
                                No students found in this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    ) : (
                      // STANDARD SUBJECT STATUS TABLE (MY_ASSIGNMENTS & FULL_SCHEDULE)
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Subject</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Date & Time</th>
                            <th className="px-4 py-3 text-left font-bold text-slate-600 dark:text-slate-300">Status</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-600 dark:text-slate-300">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {mySubjects.map(subject => {
                            const assignedTeacher = teachers.find(t => String(t.id) === String(subject.teacherId));
                            const displayTeacherName = assignedTeacher?.fullName || subject.teacherName || 'Unassigned';
                            
                            return (
                            <tr key={subject.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-slate-800 dark:text-white">{subject.subjectName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                                <div>{subject.date}</div>
                                <div className="text-xs">{subject.startTime} - {subject.endTime}</div>
                              </td>
                              
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                    subject.paperStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    subject.paperStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                    subject.paperStatus === 'UPLOADED' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {subject.paperStatus}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-right">
                                {(() => {
                                  const isMySubject = subject.teacherId === user?.id || mySubjectNames.includes(subject.subjectName.toLowerCase());
                                  if (!isMySubject) {
                                    return <span className="text-xs text-slate-400">Assigned to {displayTeacherName}</span>;
                                  }

                                  if (subject.paperStatus === 'PENDING' || subject.paperStatus === 'REJECTED') {
                                    return (
                                      <button 
                                        onClick={() => setUploadingSubject({ examId: exam.id, subject, type: "PAPER" })}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-xs font-medium"
                                      >
                                        <UploadCloud className="w-3.5 h-3.5" /> 
                                        {subject.paperStatus === 'REJECTED' ? 'Re-upload' : 'Upload Paper'}
                                      </button>
                                    );
                                  }
                                  
                                  if (subject.paperStatus === 'UPLOADED') {
                                    return <span className="text-xs text-yellow-600 font-medium px-2">Under Review</span>;
                                  }
                                  
                                  return <span className="text-xs text-green-600 font-medium px-2">✓ Approved</span>;
                                })()}
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    )}
                  </div>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Upload Modal (For Paper) */}
      {uploadingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Upload Question Paper</h3>
            <p className="text-sm text-slate-500 mb-6">For {uploadingSubject.subject.subjectName}</p>
            
            <div 
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 mb-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              onClick={() => document.getElementById("exam-file-upload")?.click()}
            >
              <div className="p-4 bg-primary/10 text-primary rounded-full mb-3">
                <UploadCloud className="w-8 h-8" />
              </div>
              
              {selectedFile ? (
                <div className="text-center">
                  <p className="font-bold text-primary truncate max-w-[250px]">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <>
                  <p className="font-medium text-slate-700 dark:text-slate-300">Click to browse or drag file here</p>
                  <p className="text-xs text-slate-500 mt-1">Maximum file size 10MB (.pdf only)</p>
                </>
              )}
              
              <input 
                id="exam-file-upload"
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setUploadingSubject(null);
                  setSelectedFile(null);
                }}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleUploadSimulate}
                disabled={isUploading || !selectedFile}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-70 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
