import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getLeavesAsync, applyLeave, updateLeaveStatus } from "../services/leave.service";
import { LeaveApplication } from "../types/leave.types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getStudents } from "@/features/student/services/student.service";
import { toast } from "sonner";
import { CalendarHeart, Plus, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function TeacherLeavePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"MY_LEAVES" | "STUDENT_LEAVES">("MY_LEAVES");
  
  // My Leaves State
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: "", startDate: "", endDate: "", description: "", documentUrl: "" });
  const [loading, setLoading] = useState(false);

  // Student Leaves State
  const [studentLeaves, setStudentLeaves] = useState<LeaveApplication[]>([]);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [activeLeave, setActiveLeave] = useState<LeaveApplication | null>(null);
  const [remark, setRemark] = useState("");
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);

  const loadData = async () => {
    if (!user) return;
    const allLeaves = await getLeavesAsync(user.schoolId);
    
    // My Leaves
    setMyLeaves(allLeaves.filter(l => l.applicantId === user.id).sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()));
    
    // Student Leaves
    setStudentLeaves(allLeaves.filter(l => l.role === "STUDENT").sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime()));
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleApplyLeave = async (e: React.FormEvent) => {
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
        applicantName: `${user.firstName} ${user.lastName}`,
        role: "TEACHER",
        subject: formData.subject,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        documentUrl: formData.documentUrl
      }, user.schoolId);
      toast.success("Leave application submitted successfully to Manager");
      setIsApplyModalOpen(false);
      setFormData({ subject: "", startDate: "", endDate: "", description: "", documentUrl: "" });
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit leave application");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (leave: LeaveApplication, action: "APPROVED" | "REJECTED") => {
    setActiveLeave(leave);
    setActionType(action);
    setRemark("");
    setIsActionModalOpen(true);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeave || !actionType || !user) return;

    try {
      // When Teacher approves, it goes to PENDING_MANAGER
      const nextStatus = actionType === "APPROVED" ? "PENDING_MANAGER" : "REJECTED";
      await updateLeaveStatus(activeLeave.id, nextStatus, remark, `${user.firstName} ${user.lastName}`, "teacherRemark", user.schoolId);
      
      toast.success(`Leave ${actionType === 'APPROVED' ? 'forwarded to Manager' : 'rejected'} successfully`);
      setIsActionModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update leave status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Manage your leaves and student leave applications"
        actions={
          <button 
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        }
      />

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => setActiveTab("MY_LEAVES")}
          className={`px-6 py-3 text-sm font-bold transition ${activeTab === 'MY_LEAVES' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          My Leaves
        </button>
        <button 
          onClick={() => setActiveTab("STUDENT_LEAVES")}
          className={`px-6 py-3 text-sm font-bold transition ${activeTab === 'STUDENT_LEAVES' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
        >
          Student Leaves
        </button>
      </div>

      {activeTab === "MY_LEAVES" && (
        myLeaves.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-500 shadow-sm">
            You haven't applied for any leaves yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLeaves.map(leave => (
              <div key={leave.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <CalendarHeart className="w-5 h-5 text-primary" />
                    <span className="font-bold text-slate-800 dark:text-white">
                      {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                    </span>
                  </div>
                  {(leave.status === "PENDING_TEACHER" || leave.status === "PENDING_MANAGER") && <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><Clock className="w-3 h-3 shrink-0" /> PENDING</span>}
                  {leave.status === "APPROVED" && <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><CheckCircle className="w-3 h-3 shrink-0" /> APPROVED</span>}
                  {leave.status === "REJECTED" && <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"><XCircle className="w-3 h-3 shrink-0" /> REJECTED</span>}
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{leave.subject}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{leave.description}</p>
                {leave.documentUrl && (
                  <div className="mt-2"><a href="#" className="text-xs text-primary flex items-center gap-1 hover:underline"><FileText className="w-3 h-3"/> {leave.documentUrl}</a></div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400">Applied on: {new Date(leave.appliedOn).toLocaleDateString()}</p>
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
        )
      )}

      {activeTab === "STUDENT_LEAVES" && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {studentLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No student leave applications.</td>
                  </tr>
                ) : (
                  studentLeaves.map(leave => (
                    <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 dark:text-white">{leave.applicantName}</div>
                        <div className="text-xs text-slate-500">Class {leave.className}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarHeart className="w-4 h-4 text-primary" />
                          <span className="font-medium">{leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Applied: {new Date(leave.appliedOn).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">{leave.subject}</p>
                        <p className="line-clamp-2 text-xs" title={leave.description}>{leave.description}</p>
                        {leave.documentUrl && <a href="#" className="text-xs text-primary hover:underline mt-1 block">📎 Attachment</a>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold ${
                          leave.status === "APPROVED" ? "bg-green-100 text-green-700" :
                          leave.status === "REJECTED" ? "bg-red-100 text-red-700" :
                          leave.status === "PENDING_MANAGER" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {leave.status === "PENDING_TEACHER" ? "AWAITING YOU" : leave.status === "PENDING_MANAGER" ? "AWAITING MANAGER" : leave.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {leave.status === "PENDING_TEACHER" ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleActionClick(leave, "APPROVED")} className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-md font-medium transition">Approve</button>
                            <button onClick={() => handleActionClick(leave, "REJECTED")} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-medium transition">Reject</button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500">
                            {leave.status === "PENDING_MANAGER" ? "Sent to Manager" : `Reviewed by ${leave.reviewedBy}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {studentLeaves.length === 0 ? (
              <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 italic">
                No student leave applications.
              </div>
            ) : (
              studentLeaves.map(leave => (
                <div key={leave.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white text-base">{leave.applicantName}</div>
                      <div className="text-xs text-slate-500">Class {leave.className}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 text-center ${
                      leave.status === "APPROVED" ? "bg-green-100 text-green-700" :
                      leave.status === "REJECTED" ? "bg-red-100 text-red-700" :
                      leave.status === "PENDING_MANAGER" ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {leave.status === "PENDING_TEACHER" ? "AWAITING YOU" : leave.status === "PENDING_MANAGER" ? "AWAITING MGR" : leave.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-sm">
                    <CalendarHeart className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{leave.subject}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{leave.description}</p>
                    {leave.documentUrl && <a href="#" className="text-xs text-primary hover:underline mt-2 inline-block">📎 Attachment</a>}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3">
                    <div className="text-[10px] text-slate-400 font-medium">
                      Applied: {new Date(leave.appliedOn).toLocaleDateString()}
                    </div>
                    
                    {leave.status === "PENDING_TEACHER" ? (
                      <div className="flex justify-end gap-2 shrink-0">
                        <button 
                          onClick={() => handleActionClick(leave, "APPROVED")}
                          className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-md font-medium transition text-xs shadow-sm active:scale-95"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleActionClick(leave, "REJECTED")}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-medium transition text-xs shadow-sm active:scale-95"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 text-right leading-tight max-w-[120px]">
                        {leave.status === "PENDING_MANAGER" ? "Sent to Manager" : `Reviewed by ${leave.reviewedBy}`}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
            <input type="text" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="E.g., Sick Leave" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-slate-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input type="date" required value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Reason)</label>
            <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Explain reason..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none resize-none text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Attach File (Optional)</label>
            <input type="file" onChange={e => { if (e.target.files && e.target.files.length > 0) { setFormData({...formData, documentUrl: e.target.files[0].name}); } }} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-white text-sm" />
            {formData.documentUrl && <p className="text-xs text-primary mt-1">Attached: {formData.documentUrl}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">{loading ? "Submitting..." : "Submit Application"}</button>
          </div>
        </form>
      </Modal>

      {/* Action Modal */}
      <Modal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} title={`${actionType === 'APPROVED' ? 'Approve' : 'Reject'} Leave Application`}>
        {activeLeave && (
          <form onSubmit={handleConfirmAction} className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4">
              <p className="font-semibold text-slate-800 dark:text-white">{activeLeave.applicantName} (Class {activeLeave.className})</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Dates: {activeLeave.startDate} to {activeLeave.endDate}</p>
              <p className="text-sm font-bold mt-2 text-slate-800 dark:text-slate-200">{activeLeave.subject}</p>
              <p className="text-sm text-slate-500 mt-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">"{activeLeave.description}"</p>
              {activeLeave.documentUrl && <p className="text-xs text-primary mt-2">📎 Attachment: {activeLeave.documentUrl}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Remark (Optional)</label>
              <textarea rows={3} value={remark} onChange={e => setRemark(e.target.value)} placeholder={`Reason for ${actionType?.toLowerCase()}...`} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${actionType === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {actionType === 'APPROVED' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Confirm {actionType === 'APPROVED' ? 'Forward to Manager' : 'Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
