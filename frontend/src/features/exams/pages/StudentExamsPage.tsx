import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getExams, getAdmitCards, generateAdmitCard, isAdmitCardApproved } from "../services/exam.service";
import { ExamSchedule, AdmitCard } from "../types/exam.types";
import { toast } from "sonner";
import { Calendar, Clock, BookOpen, Download, ShieldX } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getStudents } from "@/features/student/services/student.service";

export default function StudentExamsPage() {
  const { user } = useAuthStore();
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [admitCards, setAdmitCards] = useState<AdmitCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<{className: string, rollNumber: string, name: string} | null>(null);

  const loadData = async () => {
    setLoading(true);
    
    // Get student info
    if (user?.id) {
      const students = await getStudents(user.schoolId);
      const me = students.find(s => s.id === user.id);
      if (me) {
        setStudentData({ 
          className: me.className, 
          rollNumber: me.rollNumber,
          name: `${me.firstName} ${me.lastName}`
        });
        
        // Load exams for this class
        const allExams = await getExams(user.schoolId);
        const myExams = allExams.filter(e => e.className === me.className);
        setExams(myExams);
        
        // Load admit cards
        const cards = await getAdmitCards(user?.schoolId);
        setAdmitCards(cards.filter(c => c.studentId === user.id));
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleDownloadAdmitCard = async (examId: string) => {
    if (!user?.id || !studentData) return;
    
    // Check if manager has approved
    const approved = isAdmitCardApproved(user.id, examId, user?.schoolId);
    if (!approved) {
      toast.error("Your admit card has not been approved yet. Please contact your class teacher or administration.");
      return;
    }
    
    toast.info("Generating Admit Card PDF...");
    
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    
    // Generate a simple text-based admit card and download it
    setTimeout(async () => {
      await generateAdmitCard(user.id, examId, studentData.rollNumber, user?.schoolId);
      
      // Build admit card HTML content
      const subjectRows = exam.subjects.map(s => 
        `<tr><td style="padding:8px;border:1px solid #ddd;">${s.date}</td><td style="padding:8px;border:1px solid #ddd;">${s.subjectName}</td><td style="padding:8px;border:1px solid #ddd;">${s.startTime} - ${s.endTime}</td></tr>`
      ).join("");
      
      const html = `
        <html><head><title>Admit Card - ${exam.title}</title></head>
        <body style="font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto;position:relative;">
          <div style="text-align:center;border-bottom:3px solid #1a56db;padding-bottom:20px;margin-bottom:20px;">
            <h1 style="margin:0;color:#1a56db;">${user.schoolName || "SkoolNova"}</h1>
            <h2 style="margin:8px 0 0;color:#333;">${exam.title}</h2>
            <p style="margin:5px 0 0;color:#666;">Admit Card</p>
          </div>
          
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
            <table style="width:70%;">
              <tr><td style="padding:5px 0;"><strong>Student Name:</strong></td><td>${studentData.name}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Class:</strong></td><td>${studentData.className}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Roll Number:</strong></td><td>${studentData.rollNumber}</td></tr>
              <tr><td style="padding:5px 0;"><strong>Exam Period:</strong></td><td>${exam.startDate} to ${exam.endDate}</td></tr>
            </table>
            
            <div style="width:120px;height:150px;border:1px solid #999;display:flex;align-items:center;justify-content:center;background:#f9f9f9;">
              <span style="color:#aaa;font-size:12px;text-align:center;padding:10px;">Paste<br/>Recent<br/>Photograph<br/>Here</span>
            </div>
          </div>
          
          <h3 style="color:#333;border-bottom:1px solid #ddd;padding-bottom:8px;">Exam Schedule</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead><tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Date</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Subject</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Time</th>
            </tr></thead>
            <tbody>${subjectRows}</tbody>
          </table>
          <div style="margin-top:40px;display:flex;justify-content:space-between;">
            <div style="text-align:center;"><div style="border-top:1px solid #333;padding-top:5px;width:150px;">Student Signature</div></div>
            <div style="text-align:center;"><div style="border-top:1px solid #333;padding-top:5px;width:150px;">Co-ordinator Signature</div></div>
          </div>
          <p style="text-align:center;margin-top:30px;color:#999;font-size:12px;">This is a computer-generated admit card from ${user.schoolName || "SkoolNova"}.</p>
        </body></html>
      `;
      
      // Create a downloadable HTML file (acts as printable admit card)
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AdmitCard_${studentData.rollNumber}_${exam.title.replace(/\s+/g, "_")}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Admit Card downloaded! Open the file and press Ctrl+P to print.");
      loadData();
    }, 1000);
  };

  const hasAdmitCard = (examId: string) => {
    return admitCards.some(c => c.examId === examId && c.isGenerated);
  };

  const isApproved = (examId: string) => {
    if (!user?.id) return false;
    return isAdmitCardApproved(user.id, examId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Exams"
        subtitle="View your exam schedules and download admit cards."
      />

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 shadow-sm">
          No exams scheduled for your class at this time.
        </div>
      ) : (
        <div className="space-y-6">
          {exams.map(exam => {
            const approved = isApproved(exam.id);
            
            return (
            <div key={exam.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/5 p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{exam.title}</h3>
                    <span className="px-3 py-1 bg-white/60 dark:bg-slate-800/60 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
                      {exam.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {exam.startDate} - {exam.endDate}</span>
                  </div>
                </div>
                
                {approved ? (
                  <button 
                    onClick={() => handleDownloadAdmitCard(exam.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition shadow-sm ${
                      hasAdmitCard(exam.id) 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-primary hover:bg-primary/90 text-white"
                    }`}
                  >
                    <Download className="w-4 h-4" /> 
                    {hasAdmitCard(exam.id) ? "Download Again" : "Download Admit Card"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
                    <ShieldX className="w-4 h-4" /> 
                    Admit Card Not Approved
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-slate-400" /> Exam Schedule
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Date</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Timing</th>
                        <th className="px-4 py-3 rounded-tr-lg">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {exam.subjects.map(subject => {
                        // Calculate duration
                        const [startH, startM] = subject.startTime.split(':').map(Number);
                        const [endH, endM] = subject.endTime.split(':').map(Number);
                        const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
                        const durationHours = Math.floor(durationMins / 60);
                        const durationRemainder = durationMins % 60;
                        const durationStr = `${durationHours}h ${durationRemainder > 0 ? durationRemainder + 'm' : ''}`;
                        
                        return (
                          <tr key={subject.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{subject.date}</td>
                            <td className="px-4 py-3 font-semibold text-primary">{subject.subjectName}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5" /> {subject.startTime} - {subject.endTime}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{durationStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
