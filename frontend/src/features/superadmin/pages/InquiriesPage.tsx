import { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Mail,
  Phone,
  Building2,
  Calendar,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  User,
  AlertCircle,
  X,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import {
  getInquiries,
  replyToInquiry,
  updateInquiryStatus,
  deleteInquiry,
  type Inquiry,
} from "../services/inquiry.service";
import { toast } from "sonner";

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [stats, setStats] = useState({ total: 0, new: 0, replied: 0 });

  // View / Reply Modal state
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const data = await getInquiries({
        status: statusFilter,
        search: search.trim() || undefined,
      });
      setInquiries(data.inquiries);
      setStats(data.stats);
    } catch {
      toast.error("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries();
  };

  const handleOpenReplyModal = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyText(inquiry.replyMessage || "");
  };

  const handleSendReply = async () => {
    if (!selectedInquiry) return;
    if (!replyText.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }

    setIsReplying(true);
    try {
      const updated = await replyToInquiry(selectedInquiry.id, replyText);
      toast.success("Reply recorded successfully!");
      setSelectedInquiry(updated);
      fetchInquiries();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to record reply."
      );
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Inquiry["status"]) => {
    try {
      await updateInquiryStatus(id, newStatus);
      toast.success("Status updated!");
      fetchInquiries();
      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this inquiry?")) return;
    try {
      await deleteInquiry(id);
      toast.success("Inquiry deleted.");
      if (selectedInquiry?.id === id) setSelectedInquiry(null);
      fetchInquiries();
    } catch {
      toast.error("Failed to delete inquiry.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <PageHeader
        title="Website Inquiries & Leads"
        subtitle="Review, reply, and manage school onboarding requests submitted through the public website."
      />

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Inquiries"
          value={stats.total}
          icon={<MessageSquare className="w-5 h-5 text-primary" />}
          description="Total integration requests received"
        />
        <StatCard
          title="New / Pending Leads"
          value={stats.new}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
          description="Awaiting administrator response"
        />
        <StatCard
          title="Replied & Addressed"
          value={stats.replied}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          description="Inquiries with recorded replies"
        />
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
            {(["ALL", "NEW", "REPLIED", "RESOLVED"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {status === "ALL" && "All Inquiries"}
                {status === "NEW" && `New (${stats.new})`}
                {status === "REPLIED" && `Replied (${stats.replied})`}
                {status === "RESOLVED" && "Resolved"}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by school, contact, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100"
            />
          </form>
        </div>
      </div>

      {/* INQUIRIES LIST / TABLE */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          Loading inquiries...
        </div>
      ) : inquiries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No inquiries found</h3>
          <p className="text-xs text-slate-500 mt-1">
            New contact submissions from the website will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const isNew = inq.status === "NEW";
            return (
              <div
                key={inq.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 transition shadow-sm hover:shadow-md ${
                  isNew
                    ? "border-blue-300 dark:border-blue-800/80 bg-blue-50/20"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* LEFT: Lead Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-primary" />
                        {inq.schoolName}
                      </span>

                      {isNew ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          NEW INQUIRY
                        </span>
                      ) : inq.status === "REPLIED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          REPLIED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {inq.status}
                        </span>
                      )}

                      {inq.studentCount && (
                        <span className="text-xs text-slate-500 font-medium">
                          • {inq.studentCount}
                        </span>
                      )}
                    </div>

                    {/* Contact Person & Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {inq.name}
                      </span>
                      <a
                        href={`mailto:${inq.email}`}
                        className="flex items-center gap-1 hover:text-primary transition"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {inq.email}
                      </a>
                      {inq.phone && (
                        <a
                          href={`tel:${inq.phone}`}
                          className="flex items-center gap-1 hover:text-primary transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {inq.phone}
                        </a>
                      )}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(inq.createdAt).toLocaleDateString()} at{" "}
                        {new Date(inq.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Inquiry Message Excerpt */}
                    {inq.message && (
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-2 font-normal">
                        "{inq.message}"
                      </p>
                    )}

                    {/* Recorded Reply if present */}
                    {inq.replyMessage && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>Admin Reply:</span>
                          <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                            {inq.repliedBy && `By ${inq.repliedBy} • `}
                            {inq.repliedAt && new Date(inq.repliedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-normal italic">"{inq.replyMessage}"</p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Actions */}
                  <div className="flex sm:flex-col lg:flex-row items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(inq)}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{inq.replyMessage ? "View / Edit Reply" : "Reply to Lead"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(inq.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/20 transition text-slate-400"
                      title="Delete inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW & REPLY MODAL */}
      {selectedInquiry && (
        <Modal
          isOpen={Boolean(selectedInquiry)}
          onClose={() => setSelectedInquiry(null)}
          title="Inquiry Details & Reply"
        >
          <div className="space-y-5">
            {/* Lead Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedInquiry.schoolName}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {selectedInquiry.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-500">Contact Person:</span> {selectedInquiry.name}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Student Strength:</span> {selectedInquiry.studentCount || "N/A"}
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Email:</span>{" "}
                  <a href={`mailto:${selectedInquiry.email}`} className="text-primary underline">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Phone:</span> {selectedInquiry.phone || "N/A"}
                </div>
              </div>

              {selectedInquiry.message && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Inquiry Message:</p>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {selectedInquiry.message}
                  </p>
                </div>
              )}
            </div>

            {/* Previous Reply if any */}
            {selectedInquiry.replyMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>Recorded Response:</span>
                  <span className="font-normal text-emerald-600 dark:text-emerald-400 text-[10px]">
                    {selectedInquiry.repliedAt && new Date(selectedInquiry.repliedAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-emerald-800 dark:text-emerald-200">
                  {selectedInquiry.replyMessage}
                </p>
              </div>
            )}

            {/* Reply Composer */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Compose Admin Response / Notes
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response to this school inquiry or record internal discussion notes..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Submitting records this reply in the database and updates status to <strong>REPLIED</strong>.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
              <a
                href={`mailto:${selectedInquiry.email}?subject=Regarding SkoolNova ERP Inquiry for ${encodeURIComponent(selectedInquiry.schoolName)}&body=${encodeURIComponent(replyText)}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>Open in Email App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInquiry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isReplying}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isReplying ? "Saving..." : "Record & Send Reply"}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
