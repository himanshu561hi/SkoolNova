import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getLeavesAsync, applyLeave } from "../services/leave.service";
import { LeaveApplication } from "../types/leave.types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getStudents } from "@/features/student/services/student.service";
import { toast } from "sonner";
import { CalendarHeart, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function StudentLeavePage() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: "", startDate: "", endDate: "", description: "", documentUrl: "" });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const students = await getStudents(user.schoolId);
    const me = students.find(s => s.id === user.id);
    if (me) {
      setStudentName(`${me.firstName} ${me.lastName}`);
      setClassName(me.className);
    }
    const allLeaves = await getLeavesAsync(user.schoolId);
    setLeaves(allLeaves.filter(l => l.applicantId === user.id).sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error("End date cannot be before start date");
      return;
    }
    
    setLoading(true);
    try {
      await applyLeave({
        applicantId: user.id,
        applicantName: studentName,
        role: "STUDENT",
        className,
        subject: formData.subject,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        documentUrl: formData.documentUrl
      }, user.schoolId);
      toast.success("Leave application submitted successfully");
      setIsModalOpen(false);
      setFormData({ subject: "", startDate: "", endDate: "", description: "", documentUrl: "" });
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit leave application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Applications"
        subtitle="View and apply for leaves"
        actions={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        }
      />

      {leaves.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 shadow-sm">
          You haven't applied for any leaves yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leaves.map(leave => (
            <div key={leave.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <CalendarHeart className="w-5 h-5 text-primary" />
                  <span className="font-bold text-slate-800 dark:text-white">
                    {leave.startDate === leave.endDate 
                      ? leave.startDate 
                      : `${leave.startDate} to ${leave.endDate}`}
                  </span>
                </div>
                {(leave.status === "PENDING_TEACHER" || leave.status === "PENDING_MANAGER") && <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><Clock className="w-3 h-3 shrink-0" /> PENDING</span>}
                {leave.status === "APPROVED" && <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><CheckCircle className="w-3 h-3 shrink-0" /> APPROVED</span>}
                {leave.status === "REJECTED" && <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><XCircle className="w-3 h-3 shrink-0" /> REJECTED</span>}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{leave.subject}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-3">
                {leave.description}
              </p>
              
              {leave.documentUrl && (
                <div className="mt-3">
                  <a href="#" onClick={(e) => { e.preventDefault(); toast.success("File downloading..."); }} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                    📎 View Attached File
                  </a>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400">Applied on: {new Date(leave.appliedOn).toLocaleDateString()}</p>
                {leave.teacherRemark && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Class Teacher Remark:</p>
                    <p className="text-slate-700 dark:text-slate-300">{leave.teacherRemark}</p>
                  </div>
                )}
                {leave.managerRemark && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm border border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Manager Remark:</p>
                    <p className="text-slate-700 dark:text-slate-300">{leave.managerRemark}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
            <input 
              type="text" 
              required
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              placeholder="E.g., Sick Leave, Family Event"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input 
                type="date" 
                required
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input 
                type="date" 
                required
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Reason for Leave)</label>
            <textarea 
              required
              rows={4}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Please explain why you need leave..."
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Attach File (Optional)</label>
            <input 
              type="file" 
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  setFormData({...formData, documentUrl: e.target.files[0].name});
                }
              }}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 dark:text-white text-sm"
            />
            {formData.documentUrl && <p className="text-xs text-primary mt-1">Attached: {formData.documentUrl}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
            >
              {loading ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
