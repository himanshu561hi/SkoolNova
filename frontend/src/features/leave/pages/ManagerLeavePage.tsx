import { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { getLeavesAsync, updateLeaveStatus } from "../services/leave.service";
import { LeaveApplication } from "../types/leave.types";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getStudents } from "@/features/student/services/student.service";
import { toast } from "sonner";
import { CalendarHeart, CheckCircle, XCircle, Search } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function ManagerLeavePage() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveApplication[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLeave, setActiveLeave] = useState<LeaveApplication | null>(null);
  const [remark, setRemark] = useState("");
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);

  const loadData = async () => {
    const rawLeaves = await getLeavesAsync(user?.schoolId);
    const allLeaves = rawLeaves.sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());
    
    setLeaves(allLeaves);
    setFilteredLeaves(allLeaves);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    let result = leaves;
    if (statusFilter !== "ALL") {
      result = result.filter(l => l.status === statusFilter);
    }
    if (search.trim()) {
      result = result.filter(l => 
        l.applicantName.toLowerCase().includes(search.toLowerCase()) || 
        (l.className && l.className.toLowerCase().includes(search.toLowerCase()))
      );
    }
    setFilteredLeaves(result);
  }, [search, statusFilter, leaves]);

  const handleActionClick = (leave: LeaveApplication, action: "APPROVED" | "REJECTED") => {
    setActiveLeave(leave);
    setActionType(action);
    setRemark("");
    setIsModalOpen(true);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLeave || !actionType || !user) return;

    try {
      await updateLeaveStatus(activeLeave.id, actionType, remark, user.firstName + " " + user.lastName, "managerRemark", user.schoolId);
      toast.success(`Leave ${actionType.toLowerCase()} successfully`);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update leave status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle="Review and process student leave applications"
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by applicant name or class..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {["ALL", "PENDING_TEACHER", "PENDING_MANAGER", "APPROVED", "REJECTED"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex-1 md:flex-none ${
                statusFilter === status 
                  ? "bg-primary text-white" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {status === "PENDING_TEACHER" ? "AWAITING TEACHER" : status === "PENDING_MANAGER" ? "AWAITING MANAGER" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                    No leave applications found.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map(leave => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-white">{leave.applicantName}</div>
                      <div className="text-xs text-slate-500">{leave.role === "STUDENT" ? `Class ${leave.className}` : "Teacher"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarHeart className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`}
                        </span>
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
                        {leave.status === "PENDING_TEACHER" ? "AWAITING TEACHER" : leave.status === "PENDING_MANAGER" ? "AWAITING MANAGER" : leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === "PENDING_MANAGER" ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleActionClick(leave, "APPROVED")}
                            className="px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 rounded-md font-medium transition"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleActionClick(leave, "REJECTED")}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md font-medium transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : leave.status === "PENDING_TEACHER" ? (
                        <div className="text-xs text-yellow-600 font-medium">
                          Awaiting Teacher Approval
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 flex flex-col items-end">
                          <span>Reviewed by {leave.reviewedBy}</span>
                          {leave.managerRemark && <span className="text-slate-400 mt-1 line-clamp-1 max-w-[150px]">"{leave.managerRemark}"</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredLeaves.length === 0 ? (
          <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 italic">
            No leave applications found.
          </div>
        ) : (
          filteredLeaves.map(leave => (
            <div key={leave.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-base">{leave.applicantName}</div>
                  <div className="text-xs text-slate-500">{leave.role === "STUDENT" ? `Class ${leave.className}` : "Teacher"}</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 text-center ${
                  leave.status === "APPROVED" ? "bg-green-100 text-green-700" :
                  leave.status === "REJECTED" ? "bg-red-100 text-red-700" :
                  leave.status === "PENDING_MANAGER" ? "bg-blue-100 text-blue-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {leave.status === "PENDING_TEACHER" ? "AWAITING TEACHER" : leave.status === "PENDING_MANAGER" ? "AWAITING MGR" : leave.status}
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
                
                {leave.status === "PENDING_MANAGER" ? (
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
                ) : leave.status === "PENDING_TEACHER" ? (
                  <div className="text-[10px] text-yellow-600 font-bold text-right leading-tight">
                    Awaiting Teacher<br/>Approval
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 text-right leading-tight max-w-[120px]">
                    Reviewed by {leave.reviewedBy}
                    {leave.managerRemark && <div className="text-slate-400 mt-0.5 truncate font-medium">"{leave.managerRemark}"</div>}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`${actionType === 'APPROVED' ? 'Approve' : 'Reject'} Leave Application`}>
        {activeLeave && (
          <form onSubmit={handleConfirmAction} className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mb-4">
              <p className="font-semibold text-slate-800 dark:text-white">{activeLeave.applicantName} ({activeLeave.role === "STUDENT" ? `Class ${activeLeave.className}` : "Teacher"})</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Dates: {activeLeave.startDate} to {activeLeave.endDate}</p>
              <p className="text-sm font-bold mt-2 text-slate-800 dark:text-slate-200">{activeLeave.subject}</p>
              <p className="text-sm text-slate-500 mt-1 bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                "{activeLeave.description}"
              </p>
              {activeLeave.documentUrl && <p className="text-xs text-primary mt-2">📎 Attachment: {activeLeave.documentUrl}</p>}
              {activeLeave.teacherRemark && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded text-sm text-yellow-800 dark:text-yellow-200">
                  <span className="font-bold block">Class Teacher Remark:</span>
                  {activeLeave.teacherRemark}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Remark (Optional)
              </label>
              <textarea 
                rows={3}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder={`Reason for ${actionType?.toLowerCase()}...`}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
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
                className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 ${
                  actionType === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'APPROVED' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
