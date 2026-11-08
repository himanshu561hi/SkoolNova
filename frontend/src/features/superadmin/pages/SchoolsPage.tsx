import { useState, useEffect } from "react";
import { Building2, Plus, Users, School, Search, Trash2 } from "lucide-react";
import AddSchoolModal from "../components/AddSchoolModal";
import DeleteSchoolModal from "../components/DeleteSchoolModal";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import {
  getSchools,
  updateSchoolStatus,
  requestDeleteSchoolOtp,
  deleteSchool,
  type SchoolEntry,
} from "../services/school.service";
import { toast } from "sonner";

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<SchoolEntry | null>(null);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const data = await getSchools(searchQuery);
      setSchools(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load schools");
    }
  };

  const handleSchoolAdded = () => {
    loadSchools();
    setIsModalOpen(false);
    toast.success("School and Manager created successfully!");
  };

  const toggleStatus = async (schoolId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await updateSchoolStatus(schoolId, newStatus);
      await loadSchools();
      toast.success("School status updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update school status");
    }
  };

  const handleDeleteClick = async (school: SchoolEntry) => {
    setSchoolToDelete(school);
    try {
      await requestDeleteSchoolOtp(school.id);
      toast.success("OTP sent to superadmin email (Mock OTP: 123456)", { duration: 5000 });
    } catch (err: any) {
      toast.error(err.message || "Failed to request deletion OTP");
    }
  };

  const handleConfirmDelete = async (otp: string) => {
    if (!schoolToDelete) return;

    try {
      await deleteSchool(schoolToDelete.id, otp);
      await loadSchools();
      setSchoolToDelete(null);
      toast.success("School and its manager account deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete school");
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <DashboardHeader
          title="School Management"
          subtitle="Manage all registered schools, tenants, and their statuses."
        />
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-600 transition shadow-lg shadow-primary/20 shrink-0"
        >
          <Plus className="h-5 w-5" />
          Add New School
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <School className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Registered Schools</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {schools.filter(school => school.name.toLowerCase().includes(searchQuery.toLowerCase()) || school.id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">No Schools Found</h3>
            <p className="text-sm text-slate-500 mb-6">You haven't registered any schools yet. Add a school to generate manager credentials.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary-600 transition shadow-md"
            >
              <Plus className="h-4 w-4" />
              Add First School
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">School Details</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Manager Account</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created On</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schools.filter(school => school.name.toLowerCase().includes(searchQuery.toLowerCase()) || school.id.toLowerCase().includes(searchQuery.toLowerCase())).map((school) => (
                  <tr key={school.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${school.status === "INACTIVE" ? "opacity-75" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold ${school.status === "INACTIVE" ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"}`}>
                          {school.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{school.name}</p>
                          <p className="text-xs text-slate-500">ID: {school.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{school.managerEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(school.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(school.id, school.status || "ACTIVE")}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                          (school.status || "ACTIVE") === "ACTIVE"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200"
                            : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-200"
                        }`}
                      >
                        {(school.status || "ACTIVE")}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteClick(school)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition inline-flex"
                        title="Delete School"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSchoolModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSchoolAdded}
      />

      <DeleteSchoolModal
        isOpen={!!schoolToDelete}
        schoolName={schoolToDelete?.name || ""}
        onClose={() => setSchoolToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
